const HUBSPOT_API = "https://api.hubapi.com";

const PIPELINE = "default";
const DEAL_STAGE = "1423653802";

const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // ================================
    // CORS
    // ================================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    // ================================
    // HEALTH CHECK - PEDIDOS
    // ================================
    if (
      request.method === "GET" &&
      url.pathname === "/crear-pedido"
    ) {
      return jsonResponse(
        {
          ok: true,
          message: "Endpoint crear-pedido activo",
          service: "VR Turbolub + HubSpot"
        },
        200,
        corsHeaders
      );
    }

    // ================================
    // HEALTH CHECK - LEADS
    // ================================
    if (
      request.method === "GET" &&
      url.pathname === "/registrar-lead"
    ) {
      return jsonResponse(
        {
          ok: true,
          message: "Endpoint registrar-lead activo",
          service: "VR Turbolub + Google Sheets"
        },
        200,
        corsHeaders
      );
    }

    // ================================
    // CREAR PEDIDO
    // ================================
    if (
      request.method === "POST" &&
      url.pathname === "/crear-pedido"
    ) {
      return crearPedido(request, env, corsHeaders);
    }

    // ================================
    // REGISTRAR LEAD
    // ================================
    if (
      request.method === "POST" &&
      url.pathname === "/registrar-lead"
    ) {
      return registrarLead(request, env, corsHeaders);
    }

    // ================================
    // ARCHIVOS ESTÁTICOS
    // ================================
    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }

    // ================================
    // MÉTODO NO PERMITIDO
    // ================================
    return jsonResponse(
      {
        ok: false,
        error: "Método no permitido"
      },
      405,
      corsHeaders
    );
  }
};


// ======================================================
// CREAR PEDIDO
// ======================================================

async function crearPedido(request, env, corsHeaders) {
  try {
    // --------------------------------------------------
    // TOKEN HUBSPOT
    // --------------------------------------------------
    if (!env.HUBSPOT_TOKEN) {
      return jsonResponse(
        {
          ok: false,
          error: "Falta configurar HUBSPOT_TOKEN"
        },
        500,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // LEER BODY
    // --------------------------------------------------
    const payload = await safeJson(request);

    if (!payload) {
      return jsonResponse(
        {
          ok: false,
          error: "JSON inválido"
        },
        400,
        corsHeaders
      );
    }

    const order = payload?.order || payload;
    const receipt = payload?.receipt || null;

    // --------------------------------------------------
    // VALIDACIONES BÁSICAS
    // --------------------------------------------------

    if (!order?.id) {
      return jsonResponse(
        {
          ok: false,
          error: "Falta el ID del pedido"
        },
        400,
        corsHeaders
      );
    }

    if (!order?.customer) {
      return jsonResponse(
        {
          ok: false,
          error: "Faltan los datos del cliente"
        },
        400,
        corsHeaders
      );
    }

    const customer = order.customer;

    if (
      !customer.name ||
      !customer.lastName ||
      !customer.email ||
      !customer.phone
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "El cliente debe tener nombre, apellidos, correo y teléfono"
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
          error: "El pedido no contiene productos"
        },
        400,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // MÉTODO DE PAGO
    // --------------------------------------------------

    const paymentMethod = String(
      order.paymentMethod || ""
    ).toLowerCase();

    const paymentNames = {
      nequi: "Nequi",
      transferencia: "PSE / Transferencia bancaria",
      tarjeta: "Tarjeta",
      contra_entrega: "Contra entrega"
    };

    if (!paymentNames[paymentMethod]) {
      return jsonResponse(
        {
          ok: false,
          error: "Método de pago no válido"
        },
        400,
        corsHeaders
      );
    }

    const paymentName = paymentNames[paymentMethod];

    // --------------------------------------------------
    // COMPROBANTE
    // --------------------------------------------------

    if (
      paymentMethod === "nequi" ||
      paymentMethod === "transferencia"
    ) {
      if (!receipt) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Se requiere comprobante para este método de pago"
          },
          400,
          corsHeaders
        );
      }
    }

    if (receipt) {
      if (!receipt.data) {
        return jsonResponse(
          {
            ok: false,
            error: "El comprobante no contiene datos"
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
            error:
              "Tipo de archivo de comprobante no permitido"
          },
          400,
          corsHeaders
        );
      }

      const receiptBytes = base64ToUint8Array(
        receipt.data
      );

      if (!receiptBytes) {
        return jsonResponse(
          {
            ok: false,
            error: "Comprobante inválido"
          },
          400,
          corsHeaders
        );
      }

      if (receiptBytes.byteLength > RECEIPT_MAX_BYTES) {
        return jsonResponse(
          {
            ok: false,
            error:
              "El comprobante supera el límite de 4 MB"
          },
          400,
          corsHeaders
        );
      }
    }

    // --------------------------------------------------
    // PRODUCTOS
    // --------------------------------------------------

    const productsText = order.products
      .map((product) => {
        const name = product.name || "Producto";
        const quantity = Number(product.quantity || 1);
        const price = Number(product.price || 0);

        return `${name} x${quantity} - ${formatPrice(price)}`;
      })
      .join("\n");

    // --------------------------------------------------
    // CALCULAR PRECIOS EN EL SERVIDOR
    // --------------------------------------------------

    const subtotal = order.products.reduce(
      (sum, product) => {
        const price = Number(product.price || 0);
        const quantity = Number(product.quantity || 1);

        return sum + price * quantity;
      },
      0
    );

    /*
      Envío:
      - Gratis si es contra entrega
      - Gratis si subtotal > $100.000
      - $10.000 en los demás casos
    */

    const shipping =
      paymentMethod === "contra_entrega" ||
      subtotal > 100000
        ? 0
        : 10000;

    const total = subtotal + shipping;

    // --------------------------------------------------
    // HEADERS HUBSPOT
    // --------------------------------------------------

    const hubspotHeaders = {
      Authorization: `Bearer ${env.HUBSPOT_TOKEN}`,
      "Content-Type": "application/json"
    };

    // ==================================================
    // BUSCAR CONTACTO POR EMAIL
    // ==================================================

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
      await contactSearchResponse.json();

    let contactId = null;

    // ==================================================
    // CREAR O ACTUALIZAR CONTACTO
    // ==================================================

    const contactProperties = {
      firstname: customer.name,
      lastname: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || "",
      city: customer.city || ""
    };

    if (
      contactSearchResponse.ok &&
      contactSearchData.results?.length
    ) {
      contactId =
        contactSearchData.results[0].id;

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

      if (!updateContactResponse.ok) {
        console.warn(
          "No se pudo actualizar el contacto:",
          await updateContactResponse.text()
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
        await createContactResponse.json();

      if (!createContactResponse.ok) {
        return jsonResponse(
          {
            ok: false,
            error:
              "No se pudo crear el contacto en HubSpot",
            details: createContactData
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
      `Pedido: ${order.id}`,
      `Cliente: ${customer.name} ${customer.lastName}`,
      `Correo: ${customer.email}`,
      `Teléfono: ${customer.phone}`,
      `Dirección: ${customer.address || ""}`,
      `Ciudad: ${customer.city || ""}`,
      `Departamento: ${customer.department || ""}`,
      `Método de pago: ${paymentName}`,
      ``,
      `Productos:`,
      productsText,
      ``,
      `Subtotal: ${formatPrice(subtotal)}`,
      `Envío: ${formatPrice(shipping)}`,
      `Total: ${formatPrice(total)}`,
      ``,
      `Notas: ${customer.notes || "Sin notas"}`
    ].join("\n");

    const dealResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/deals`,
      {
        method: "POST",
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: {
            dealname:
              `Pedido VR Turbolub #${order.id}`,

            pipeline: PIPELINE,

            dealstage: DEAL_STAGE,

            amount: String(total),

            closedate:
              new Date().toISOString(),

            description
          }
        })
      }
    );

    const dealData =
      await dealResponse.json();

    if (!dealResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No se pudo crear el negocio en HubSpot",
          details: dealData
        },
        500,
        corsHeaders
      );
    }

    const dealId = dealData.id;

    // ==================================================
    // ASOCIAR DEAL ↔ CONTACTO
    // ==================================================

    let associationWarning = null;

    if (contactId && dealId) {
      const associationResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`,
          {
            method: "PUT",
            headers: hubspotHeaders
          }
        );

      if (!associationResponse.ok) {
        associationWarning =
          await associationResponse.text();

        console.warn(
          "No se pudo asociar Deal ↔ Contacto:",
          associationWarning
        );
      }
    }

    // ==================================================
    // SUBIR COMPROBANTE A HUBSPOT
    // ==================================================

    let fileId = null;
    let fileWarning = null;

    if (receipt) {
      try {
        const receiptBytes =
          base64ToUint8Array(receipt.data);

        const extension =
          extensionFromMime(receipt.type);

        const fileName =
          `comprobante-${order.id}.${extension}`;

        const formData = new FormData();

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
          "options",
          JSON.stringify({
            access: "PRIVATE",
            overwrite: false
          })
        );

        formData.append(
          "folderPath",
          "/VR Turbolub/Comprobantes"
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
          await fileResponse.json();

        if (!fileResponse.ok) {
          fileWarning =
            fileData?.message ||
            "No se pudo subir el comprobante";

          console.warn(
            "Error subiendo comprobante:",
            fileData
          );
        } else {
          fileId = fileData.id;
        }
      } catch (error) {
        fileWarning =
          error?.message ||
          "Error al subir comprobante";

        console.warn(
          "Error de comprobante:",
          error
        );
      }
    }

    // ==================================================
    // CREAR NOTA EN HUBSPOT
    // ==================================================

    let noteId = null;

    const noteBody = [
      `Pedido VR Turbolub #${order.id}`,
      ``,
      `Cliente: ${customer.name} ${customer.lastName}`,
      `Correo: ${customer.email}`,
      `Teléfono: ${customer.phone}`,
      `Método de pago: ${paymentName}`,
      ``,
      `Subtotal: ${formatPrice(subtotal)}`,
      `Envío: ${formatPrice(shipping)}`,
      `Total: ${formatPrice(total)}`,
      ``,
      `Productos:`,
      productsText,
      ``,
      `Notas del cliente:`,
      customer.notes || "Sin notas",
      ``,
      fileId
        ? `Comprobante adjunto: archivo ${fileId}`
        : "No se adjuntó comprobante."
    ].join("\n");

    const noteResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/notes`,
      {
        method: "POST",
        headers: hubspotHeaders,
        body: JSON.stringify({
          properties: {
            hs_timestamp:
              new Date().toISOString(),

            hs_note_body: noteBody
          },

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
            }
          ]
        })
      }
    );

    const noteData =
      await noteResponse.json();

    if (noteResponse.ok) {
      noteId = noteData.id;
    } else {
      console.warn(
        "No se pudo crear la nota:",
        noteData
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
        subtotal,
        shipping,
        total
      }
    );

    return jsonResponse(
      {
        ok: true,
        message:
          "Pedido creado correctamente.",

        orderId: order.id,

        contactId,

        dealId,

        fileId,

        noteId,

        subtotal,

        shipping,

        total,

        associationWarning,

        fileWarning
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error(
      "Error crearPedido:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno al crear el pedido"
      },
      500,
      corsHeaders
    );
  }
}


// ======================================================
// REGISTRAR LEAD
// HUBSPOT + GOOGLE SHEETS + RESEND
// ======================================================

async function registrarLead(
  request,
  env,
  corsHeaders
) {
  try {
    // --------------------------------------------------
    // VALIDAR CONFIGURACIÓN
    // --------------------------------------------------

    if (!env.HUBSPOT_TOKEN) {
      return jsonResponse(
        {
          ok: false,
          error: "Falta configurar HUBSPOT_TOKEN"
        },
        500,
        corsHeaders
      );
    }

    if (!env.GOOGLE_SHEETS_URL) {
      return jsonResponse(
        {
          ok: false,
          error: "Falta configurar GOOGLE_SHEETS_URL"
        },
        500,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // LEER BODY
    // --------------------------------------------------

    const data = await safeJson(request);

    if (!data) {
      return jsonResponse(
        {
          ok: false,
          error: "JSON inválido"
        },
        400,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // NORMALIZAR DATOS
    // --------------------------------------------------

    const lead = {
      nombre: String(data.nombre || "").trim(),
      apellidos: String(data.apellidos || "").trim(),
      telefono: String(data.telefono || "").trim(),
      correo: String(data.correo || "").trim().toLowerCase(),
      producto: String(data.producto || "").trim(),
      mensaje: String(data.mensaje || "").trim(),
      estado: String(data.estado || "Nuevo").trim()
    };

    // --------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------

    if (
      !lead.nombre ||
      !lead.correo ||
      !lead.telefono
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Nombre, correo y teléfono son obligatorios"
        },
        400,
        corsHeaders
      );
    }

    // ==================================================
    // 1. HUBSPOT
    // ==================================================

    const hubspotHeaders = {
      Authorization: `Bearer ${env.HUBSPOT_TOKEN}`,
      "Content-Type": "application/json"
    };

    let contactId = null;
    let hubspotAction = null;

    // --------------------------------------------------
    // BUSCAR CONTACTO POR CORREO
    // --------------------------------------------------

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
                  value: lead.correo
                }
              ]
            }
          ],
          properties: [
            "firstname",
            "lastname",
            "email",
            "phone",
            "producto_o_servicio_de_interes"
          ],
          limit: 1
        })
      }
    );

    const contactSearchText =
      await contactSearchResponse.text();

    let contactSearchData = null;

    try {
      contactSearchData =
        JSON.parse(contactSearchText);
    } catch {
      contactSearchData = {
        raw: contactSearchText
      };
    }

    // --------------------------------------------------
    // PROPIEDADES DEL CONTACTO
    // --------------------------------------------------

    const contactProperties = {
      firstname: lead.nombre,
      lastname: lead.apellidos,
      email: lead.correo,
      phone: lead.telefono,
      producto_o_servicio_de_interes:
        lead.producto
    };

    // --------------------------------------------------
    // ACTUALIZAR CONTACTO EXISTENTE
    // --------------------------------------------------

    if (
      contactSearchResponse.ok &&
      contactSearchData.results?.length
    ) {
      contactId =
        contactSearchData.results[0].id;

      hubspotAction = "actualizado";

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

      if (!updateContactResponse.ok) {
        const updateError =
          await updateContactResponse.text();

        console.error(
          "Error actualizando contacto HubSpot:",
          updateError
        );

        return jsonResponse(
          {
            ok: false,
            error:
              "No se pudo actualizar el contacto en HubSpot",
            details: updateError
          },
          502,
          corsHeaders
        );
      }
    }

    // --------------------------------------------------
    // CREAR CONTACTO NUEVO
    // --------------------------------------------------

    else {
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

      const createContactText =
        await createContactResponse.text();

      let createContactData = null;

      try {
        createContactData =
          JSON.parse(createContactText);
      } catch {
        createContactData = {
          raw: createContactText
        };
      }

      if (!createContactResponse.ok) {
        console.error(
          "Error creando contacto HubSpot:",
          createContactData
        );

        return jsonResponse(
          {
            ok: false,
            error:
              "No se pudo crear el contacto en HubSpot",
            details: createContactData
          },
          502,
          corsHeaders
        );
      }

      contactId = createContactData.id;
      hubspotAction = "creado";
    }

    // ==================================================
    // 2. GOOGLE SHEETS
    // ==================================================

    let googleData = null;

    const googleResponse = await fetch(
      env.GOOGLE_SHEETS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(lead)
      }
    );

    const googleText =
      await googleResponse.text();

    try {
      googleData =
        JSON.parse(googleText);
    } catch {
      googleData = {
        raw: googleText
      };
    }

    if (!googleResponse.ok) {
      console.error(
        "Google Sheets respondió con error:",
        googleData
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "El contacto se guardó en HubSpot, pero Google Sheets no aceptó el lead",
          contactId,
          hubspot: {
            ok: true,
            action: hubspotAction
          },
          googleSheets: {
            ok: false,
            details: googleData
          }
        },
        502,
        corsHeaders
      );
    }

    // ==================================================
    // 3. NOTIFICACIÓN POR RESEND
    // ==================================================

    let emailResult = {
      ok: false,
      skipped: true
    };

    if (
      env.RESEND_API_KEY &&
      env.ORDER_NOTIFICATION_EMAILS
    ) {
      try {
        const recipients =
          String(env.ORDER_NOTIFICATION_EMAILS)
            .split(",")
            .map(email => email.trim())
            .filter(Boolean);

        if (recipients.length) {
          const resendResponse = await fetch(
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

                to: recipients,

                subject:
                  `Nuevo lead - VR Turbolub - ${lead.nombre}`,

                html: `
                  <div style="font-family:Arial,sans-serif;line-height:1.6;">
                    <h2>Nuevo lead recibido - VR Turbolub</h2>

                    <p>
                      Se recibió una nueva solicitud desde la página web.
                    </p>

                    <hr>

                    <h3>Datos del cliente</h3>

                    <p>
                      <strong>Nombre:</strong>
                      ${escapeHtml(lead.nombre)}
                      ${escapeHtml(lead.apellidos)}
                    </p>

                    <p>
                      <strong>Correo:</strong>
                      ${escapeHtml(lead.correo)}
                    </p>

                    <p>
                      <strong>Teléfono:</strong>
                      ${escapeHtml(lead.telefono)}
                    </p>

                    <p>
                      <strong>Producto o servicio:</strong>
                      ${escapeHtml(
                        lead.producto || "No especificado"
                      )}
                    </p>

                    <p>
                      <strong>Mensaje:</strong><br>
                      ${escapeHtml(
                        lead.mensaje || "Sin mensaje"
                      )}
                    </p>

                    <hr>

                    <p>
                      <strong>Estado:</strong>
                      ${escapeHtml(lead.estado)}
                    </p>

                    <p>
                      <strong>HubSpot Contact ID:</strong>
                      ${escapeHtml(contactId)}
                    </p>
                  </div>
                `
              })
            }
          );

          const resendText =
            await resendResponse.text();

          let resendData = null;

          try {
            resendData =
              JSON.parse(resendText);
          } catch {
            resendData = {
              raw: resendText
            };
          }

          if (resendResponse.ok) {
            emailResult = {
              ok: true,
              data: resendData
            };
          } else {
            emailResult = {
              ok: false,
              error: resendData
            };

            console.error(
              "Resend respondió con error:",
              resendData
            );
          }
        }
      } catch (error) {
        emailResult = {
          ok: false,
          error:
            error?.message ||
            "Error enviando notificación"
        };

        console.error(
          "Error Resend:",
          error
        );
      }
    } else {
      console.warn(
        "No se enviará correo porque falta RESEND_API_KEY u ORDER_NOTIFICATION_EMAILS"
      );
    }

    // ==================================================
    // RESPUESTA FINAL
    // ==================================================

    console.log(
      "Lead procesado correctamente:",
      {
        contactId,
        hubspotAction,
        googleSheets: googleData,
        email: emailResult
      }
    );

    return jsonResponse(
      {
        ok: true,

        message:
          "Lead registrado correctamente",

        contactId,

        hubspot: {
          ok: true,
          action: hubspotAction
        },

        googleSheets: {
          ok: true,
          data: googleData
        },

        email: emailResult
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error(
      "Error registrarLead:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno al registrar el lead"
      },
      500,
      corsHeaders
    );
  }
}


// ======================================================
// ESCAPAR HTML
// ======================================================

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ======================================================
// RESPUESTA JSON
// ======================================================

function jsonResponse(
  data,
  status = 200,
  corsHeaders = {}
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",

        ...corsHeaders
      }
    }
  );
}


// ======================================================
// JSON SEGURO
// ======================================================

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}


// ======================================================
// FORMATEAR PRECIO
// ======================================================

function formatPrice(value) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }
  ).format(Number(value || 0));
}


// ======================================================
// BASE64 → UINT8ARRAY
// ======================================================

function base64ToUint8Array(base64) {
  try {
    let cleanBase64 = base64;

    // Si viene como:
    // data:image/png;base64,XXXX
    if (
      cleanBase64.includes(",")
    ) {
      cleanBase64 =
        cleanBase64.split(",")[1];
    }

    const binaryString =
      atob(cleanBase64);

    const bytes =
      new Uint8Array(
        binaryString.length
      );

    for (
      let i = 0;
      i < binaryString.length;
      i++
    ) {
      bytes[i] =
        binaryString.charCodeAt(i);
    }

    return bytes;

  } catch (error) {
    console.error(
      "Error convirtiendo base64:",
      error
    );

    return null;
  }
}


// ======================================================
// EXTENSIÓN SEGÚN MIME
// ======================================================

function extensionFromMime(mime) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
  };

  return (
    extensions[mime] ||
    "bin"
  );
}
