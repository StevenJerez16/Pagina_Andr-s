const HUBSPOT_API = "https://api.hubapi.com";

const PIPELINE = "default";
const DEAL_STAGE = "1423653802";

const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // CORS
    // =========================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================
    // SITIO WEB
    // =========================

    if (request.method === "GET" && url.pathname !== "/crear-pedido") {
      return env.ASSETS.fetch(request);
    }

    // =========================
    // HEALTH CHECK
    // =========================

    if (request.method === "GET" && url.pathname === "/crear-pedido") {
      return jsonResponse(
        {
          ok: true,
          message: "Endpoint crear-pedido activo",
          service: "VR Turbolub + HubSpot + Resend"
        },
        200,
        corsHeaders
      );
    }

    // =========================
    // CREAR PEDIDO
    // =========================

    if (
      request.method === "POST" &&
      url.pathname === "/crear-pedido"
    ) {
      try {
        return await crearPedido(request, env, corsHeaders);
      } catch (error) {
        console.error("Error general crear-pedido:", error);

        return jsonResponse(
          {
            ok: false,
            error: "Error interno al procesar el pedido.",
            detail: error?.message || "Error desconocido"
          },
          500,
          corsHeaders
        );
      }
    }

    return new Response("Método no permitido", {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
};


// ======================================================
// CREAR PEDIDO
// ======================================================

async function crearPedido(request, env, corsHeaders) {
  if (!env.HUBSPOT_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta configurar el secreto HUBSPOT_TOKEN."
      },
      500,
      corsHeaders
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "El cuerpo de la petición no contiene JSON válido."
      },
      400,
      corsHeaders
    );
  }

  const order = payload?.order || payload;
  const receipt = payload?.receipt || null;

  // ==================================================
  // VALIDACIONES
  // ==================================================

  if (!order?.id) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta el ID del pedido."
      },
      400,
      corsHeaders
    );
  }

  const customer = order.customer || {};

  if (!customer.name) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta el nombre del cliente."
      },
      400,
      corsHeaders
    );
  }

  if (!customer.lastName) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta el apellido del cliente."
      },
      400,
      corsHeaders
    );
  }

  if (!customer.email) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta el correo electrónico."
      },
      400,
      corsHeaders
    );
  }

  if (!customer.phone) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta el teléfono."
      },
      400,
      corsHeaders
    );
  }

  if (
    !Array.isArray(order.products) ||
    order.products.length === 0
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "El pedido no contiene productos."
      },
      400,
      corsHeaders
    );
  }

  // ==================================================
  // MÉTODO DE PAGO
  // ==================================================

  const paymentMethod = order.paymentMethod || "";

  const paymentLabels = {
    nequi: "Nequi",
    transferencia: "PSE / Transferencia bancaria",
    tarjeta: "Tarjeta",
    contra_entrega: "Contra entrega"
  };

  const paymentLabel =
    paymentLabels[paymentMethod] || paymentMethod || "No especificado";

  // ==================================================
  // COMPROBANTE
  // ==================================================

  const requiresReceipt =
    paymentMethod === "nequi" ||
    paymentMethod === "transferencia";

  if (requiresReceipt && !receipt) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Debes adjuntar el comprobante de pago para este método."
      },
      400,
      corsHeaders
    );
  }

  if (receipt) {
    if (!receipt.data) {
      return jsonResponse(
        {
          ok: false,
          error: "El comprobante no contiene datos."
        },
        400,
        corsHeaders
      );
    }

    if (
      receipt.type &&
      !ALLOWED_RECEIPT_TYPES.includes(receipt.type)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "Tipo de comprobante no permitido."
        },
        400,
        corsHeaders
      );
    }

    if (
      typeof receipt.size === "number" &&
      receipt.size > MAX_RECEIPT_BYTES
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "El comprobante supera el límite de 4 MB."
        },
        400,
        corsHeaders
      );
    }
  }

  // ==================================================
  // HEADERS HUBSPOT
  // ==================================================

  const hubspotHeaders = {
    Authorization: `Bearer ${env.HUBSPOT_TOKEN}`,
    "Content-Type": "application/json"
  };

  // ==================================================
  // PRODUCTOS
  // ==================================================

  const productsText = order.products
    .map((product) => {
      const name = product.name || "Producto";
      const quantity = Number(product.quantity || 1);
      const price = Number(product.price || 0);

      return `${name} x${quantity} — ${formatPrice(price)}`;
    })
    .join("\n");

  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping || 0);

  const total = Number(
    order.total ?? subtotal + shipping
  );

  const customerFullName =
    `${customer.name} ${customer.lastName}`.trim();

  // ==================================================
  // BUSCAR CONTACTO POR EMAIL
  // ==================================================

  let contactId = null;

  const contactSearchResponse = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/contacts/search`,
    {
      method: "POST",
      headers: hubspotHeaders,
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: customer.email
              }
            ]
          }
        ],
        properties: [
          "firstname",
          "lastname",
          "email",
          "phone",
          "address",
          "city"
        ],
        limit: 1
      })
    }
  );

  const contactSearchData =
    await safeJson(contactSearchResponse);

  if (!contactSearchResponse.ok) {
    console.error(
      "Error buscando contacto:",
      contactSearchData
    );

    return jsonResponse(
      {
        ok: false,
        error: "No fue posible buscar el contacto en HubSpot.",
        detail: contactSearchData
      },
      500,
      corsHeaders
    );
  }

  if (
    contactSearchData?.results &&
    contactSearchData.results.length > 0
  ) {
    contactId = contactSearchData.results[0].id;
  }

  // ==================================================
  // CREAR / ACTUALIZAR CONTACTO
  // ==================================================

  const contactProperties = {
    firstname: customer.name,
    lastname: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address || "",
    city: customer.city || ""
  };

  if (contactId) {
    const updateContactResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
      {
        method: "PATCH",
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: contactProperties
        })
      }
    );

    const updateContactData =
      await safeJson(updateContactResponse);

    if (!updateContactResponse.ok) {
      console.error(
        "Error actualizando contacto:",
        updateContactData
      );

      return jsonResponse(
        {
          ok: false,
          error: "No fue posible actualizar el contacto.",
          detail: updateContactData
        },
        500,
        corsHeaders
      );
    }
  } else {
    const createContactResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts`,
      {
        method: "POST",
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: contactProperties
        })
      }
    );

    const createContactData =
      await safeJson(createContactResponse);

    if (!createContactResponse.ok) {
      console.error(
        "Error creando contacto:",
        createContactData
      );

      return jsonResponse(
        {
          ok: false,
          error: "No fue posible crear el contacto.",
          detail: createContactData
        },
        500,
        corsHeaders
      );
    }

    contactId = createContactData.id;
  }

  // ==================================================
  // CREAR DEAL
  // ==================================================

  const description = [
    `Pedido VR Turbolub: ${order.id}`,
    ``,
    `Cliente: ${customerFullName}`,
    `Teléfono: ${customer.phone}`,
    `Correo: ${customer.email}`,
    `Dirección: ${customer.address || "No especificada"}`,
    `Ciudad: ${customer.city || "No especificada"}`,
    `Departamento: ${
      customer.department || "No especificado"
    }`,
    ``,
    `Método de pago: ${paymentLabel}`,
    ``,
    `PRODUCTOS`,
    productsText,
    ``,
    `Subtotal: ${formatPrice(subtotal)}`,
    `Envío: ${formatPrice(shipping)}`,
    `TOTAL: ${formatPrice(total)}`,
    ``,
    `Observaciones: ${customer.notes || "Ninguna"}`
  ].join("\n");

  const dealResponse = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/deals`,
    {
      method: "POST",
      headers: hubspotHeaders,
      body: JSON.stringify({
        properties: {
          dealname: `Pedido VR Turbolub #${order.id}`,
          pipeline: PIPELINE,
          dealstage: DEAL_STAGE,
          amount: String(total),
          closedate: new Date().toISOString(),
          description
        }
      })
    }
  );

  const dealData = await safeJson(dealResponse);

  if (!dealResponse.ok) {
    console.error(
      "Error creando deal:",
      dealData
    );

    return jsonResponse(
      {
        ok: false,
        error: "No fue posible crear el negocio en HubSpot.",
        detail: dealData
      },
      500,
      corsHeaders
    );
  }

  const dealId = dealData.id;

  // ==================================================
  // ASOCIAR DEAL → CONTACTO
  // ==================================================

  const associationResponse = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.HUBSPOT_TOKEN}`
      }
    }
  );

  const associationData =
    await safeJson(associationResponse);

  if (!associationResponse.ok) {
    console.error(
      "Error asociando deal con contacto:",
      associationData
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "El negocio se creó, pero no fue posible asociarlo al contacto.",
        dealId,
        contactId,
        detail: associationData
      },
      500,
      corsHeaders
    );
  }

  // ==================================================
  // SUBIR COMPROBANTE
  // ==================================================

  let fileId = null;
  let fileWarning = null;

  if (receipt) {
    try {
      const receiptBytes =
        base64ToUint8Array(receipt.data);

      const formData = new FormData();

      const fileName =
        receipt.name ||
        `comprobante-${order.id}.${extensionFromMime(receipt.type)}`;

      const blob = new Blob(
        [receiptBytes],
        {
          type:
            receipt.type ||
            "application/octet-stream"
        }
      );

      formData.append(
        "file",
        blob,
        fileName
      );

      formData.append(
        "folderPath",
        "/VR Turbolub/Comprobantes"
      );

      formData.append(
        "options",
        JSON.stringify({
          access: "PRIVATE",
          overwrite: false
        })
      );

      const fileResponse = await fetch(
        `${HUBSPOT_API}/files/v3/files`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${env.HUBSPOT_TOKEN}`
          },
          body: formData
        }
      );

      const fileData =
        await safeJson(fileResponse);

      console.log(
        "Respuesta HubSpot Files:",
        {
          status: fileResponse.status,
          ok: fileResponse.ok,
          data: fileData
        }
      );

      if (!fileResponse.ok) {
        fileWarning =
          "El pedido se creó correctamente, pero el comprobante no pudo subirse a HubSpot.";

        console.error(
          "ERROR REAL DE HUBSPOT FILES:",
          JSON.stringify(fileData)
        );
      } else {
        fileId = fileData.id;

        console.log(
          "Comprobante subido correctamente:",
          fileId
        );
      }

    } catch (error) {
      console.error(
        "Error procesando comprobante:",
        error
      );

      fileWarning =
        "El pedido se creó correctamente, pero hubo un problema procesando el comprobante.";
    }
  }

  // ==================================================
  // CREAR NOTA
  // ==================================================

  let noteId = null;

  try {
    const noteBody = [
      `PEDIDO VR TURBOLUB`,
      ``,
      `Pedido: ${order.id}`,
      `Cliente: ${customerFullName}`,
      `Método de pago: ${paymentLabel}`,
      `Total: ${formatPrice(total)}`,
      ``,
      `PRODUCTOS`,
      productsText,
      ``,
      `Dirección: ${customer.address || "No especificada"}`,
      `Ciudad: ${customer.city || "No especificada"}`,
      `Departamento: ${
        customer.department || "No especificado"
      }`,
      ``,
      `Observaciones: ${
        customer.notes || "Ninguna"
      }`,
      ``,
      fileWarning
        ? `ADVERTENCIA: ${fileWarning}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

    const noteProperties = {
      hs_timestamp: new Date().toISOString(),
      hs_note_body: noteBody
    };

    if (fileId) {
      noteProperties.hs_attachment_ids =
        String(fileId);
    }

    const noteResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/notes`,
      {
        method: "POST",
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: noteProperties,
          associations: [
            {
              to: {
                id: dealId
              },
              types: [
                {
                  associationCategory:
                    "HUBSPOT_DEFINED",
                  associationTypeId: 214
                }
              ]
            },
            {
              to: {
                id: contactId
              },
              types: [
                {
                  associationCategory:
                    "HUBSPOT_DEFINED",
                  associationTypeId: 202
                }
              ]
            }
          ]
        })
      }
    );

    const noteData =
      await safeJson(noteResponse);

    if (!noteResponse.ok) {
      console.error(
        "Error creando nota:",
        noteData
      );
    } else {
      noteId = noteData.id;
    }
  } catch (error) {
    console.error(
      "Error creando nota:",
      error
    );
  }

  // ==================================================
  // NOTIFICACIÓN POR CORREO - RESEND
  // ==================================================

  let emailId = null;
  let emailWarning = null;

  try {
    if (!env.RESEND_API_KEY) {
      throw new Error(
        "Falta configurar el secreto RESEND_API_KEY."
      );
    }

    const notificationEmails =
      String(env.ORDER_NOTIFICATION_EMAILS || "")
        .split(",")
        .map(email => email.trim())
        .filter(Boolean);

    if (notificationEmails.length === 0) {
      throw new Error(
        "No hay correos configurados en ORDER_NOTIFICATION_EMAILS."
      );
    }

    const emailHtml =
      buildOrderEmailHtml({
        order,
        customer,
        customerFullName,
        paymentLabel,
        subtotal,
        shipping,
        total,
        dealId,
        contactId,
        fileId
      });

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          from:
            "VR Turbolub <onboarding@resend.dev>",
          to: notificationEmails,
          subject:
            `🛒 Nuevo pedido VR Turbolub #${order.id}`,
          html: emailHtml
        })
      }
    );

    const emailData =
      await safeJson(emailResponse);

    if (!emailResponse.ok) {
      emailWarning =
        "El pedido se creó correctamente, pero no se pudo enviar la notificación por correo.";

      console.error(
        "Error enviando correo con Resend:",
        emailData
      );
    } else {
      emailId =
        emailData?.id || null;

      console.log(
        "Notificación enviada correctamente:",
        emailId
      );
    }

  } catch (error) {
    emailWarning =
      "El pedido se creó correctamente, pero hubo un problema enviando la notificación por correo.";

    console.error(
      "Error procesando notificación:",
      error
    );
  }

  // ==================================================
  // RESPUESTA FINAL
  // ==================================================

  console.log(
    "Pedido creado correctamente:",
    {
      orderId: order.id,
      contactId,
      dealId,
      fileId,
      noteId,
      fileWarning,
      emailId,
      emailWarning
    }
  );

  return jsonResponse(
    {
      ok: true,
      message: "Pedido creado correctamente.",
      orderId: order.id,
      contactId,
      dealId,
      fileId,
      noteId,
      fileWarning,
      emailId,
      emailWarning
    },
    200,
    corsHeaders
  );
}


// ======================================================
// HELPERS
// ======================================================

function jsonResponse(
  data,
  status = 200,
  extraHeaders = {}
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        ...extraHeaders
      }
    }
  );
}


async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {
      status: response.status,
      statusText: response.statusText
    };
  }
}


function formatPrice(value) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }
  ).format(Number(value) || 0);
}


function base64ToUint8Array(base64) {
  const binary = atob(base64);

  const bytes =
    new Uint8Array(binary.length);

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


function extensionFromMime(type) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
  };

  return extensions[type] || "bin";
}


// ======================================================
// EMAIL HTML
// ======================================================

function buildOrderEmailHtml({
  order,
  customer,
  customerFullName,
  paymentLabel,
  subtotal,
  shipping,
  total,
  dealId,
  contactId,
  fileId
}) {
  const productsHtml = order.products
    .map(product => {
      const name = escapeHtml(
        product.name || "Producto"
      );

      const quantity = Number(
        product.quantity || 1
      );

      const price = formatPrice(
        Number(product.price || 0)
      );

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #ddd;">
            ${name}
          </td>

          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:center;">
            ${quantity}
          </td>

          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">
            ${price}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#222;">

      <div style="background:#0D253F;padding:22px;color:white;">
        <h1 style="margin:0;">
          🛒 Nuevo pedido VR Turbolub
        </h1>

        <p style="margin:8px 0 0;">
          Pedido #${escapeHtml(String(order.id))}
        </p>
      </div>

      <div style="padding:25px;">

        <h2>Cliente</h2>

        <p>
          <strong>Nombre:</strong>
          ${escapeHtml(customerFullName)}
        </p>

        <p>
          <strong>Correo:</strong>
          ${escapeHtml(customer.email)}
        </p>

        <p>
          <strong>Teléfono:</strong>
          ${escapeHtml(customer.phone)}
        </p>

        <p>
          <strong>Dirección:</strong>
          ${escapeHtml(
            customer.address ||
            "No especificada"
          )}
        </p>

        <p>
          <strong>Ciudad:</strong>
          ${escapeHtml(
            customer.city ||
            "No especificada"
          )}
        </p>

        <p>
          <strong>Departamento:</strong>
          ${escapeHtml(
            customer.department ||
            "No especificado"
          )}
        </p>

        <h2>Pago</h2>

        <p>
          <strong>Método:</strong>
          ${escapeHtml(paymentLabel)}
        </p>

        <h2>Productos</h2>

        <table style="width:100%;border-collapse:collapse;">

          <thead>
            <tr style="background:#f2f2f2;">

              <th style="padding:10px;text-align:left;">
                Producto
              </th>

              <th style="padding:10px;text-align:center;">
                Cant.
              </th>

              <th style="padding:10px;text-align:right;">
                Precio
              </th>

            </tr>
          </thead>

          <tbody>
            ${productsHtml}
          </tbody>

        </table>

        <div style="margin-top:20px;text-align:right;">

          <p>
            <strong>Subtotal:</strong>
            ${formatPrice(subtotal)}
          </p>

          <p>
            <strong>Envío:</strong>
            ${formatPrice(shipping)}
          </p>

          <h2>
            TOTAL:
            ${formatPrice(total)}
          </h2>

        </div>

        <h2>Observaciones</h2>

        <p>
          ${escapeHtml(
            customer.notes ||
            "Ninguna"
          )}
        </p>

        <hr>

        <p>
          <strong>HubSpot Contact ID:</strong>
          ${escapeHtml(
            String(contactId || "No disponible")
          )}
        </p>

        <p>
          <strong>HubSpot Deal ID:</strong>
          ${escapeHtml(
            String(dealId || "No disponible")
          )}
        </p>

        <p>
          <strong>Comprobante:</strong>
          ${
            fileId
              ? "Guardado en HubSpot"
              : "No adjuntado"
          }
        </p>

      </div>

      <div style="background:#f5f5f5;padding:18px;text-align:center;">
        <strong>VR Turbolub</strong><br>
        Lubricantes y soluciones automotrices
      </div>

    </div>
  `;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
