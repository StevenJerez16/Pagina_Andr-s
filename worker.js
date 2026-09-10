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
// REGISTRAR LEAD EN GOOGLE SHEETS
// ======================================================

async function registrarLead(
  request,
  env,
  corsHeaders
) {
  try {
    // --------------------------------------------------
    // URL GOOGLE SHEETS
    // --------------------------------------------------

    if (!env.GOOGLE_SHEETS_URL) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Falta configurar GOOGLE_SHEETS_URL"
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
      nombre: String(
        data.nombre || ""
      ).trim(),

      apellidos: String(
        data.apellidos || ""
      ).trim(),

      telefono: String(
        data.telefono || ""
      ).trim(),

      correo: String(
        data.correo || ""
      ).trim(),

      producto: String(
        data.producto || ""
      ).trim(),

      mensaje: String(
        data.mensaje || ""
      ).trim(),

      estado: String(
        data.estado || "Nuevo"
      ).trim()
    };

    // --------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------

    if (
      !lead.nombre &&
      !lead.apellidos &&
      !lead.correo &&
      !lead.telefono
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "No se recibieron datos suficientes del lead"
        },
        400,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // ENVIAR A GOOGLE APPS SCRIPT
    // --------------------------------------------------

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

    let googleData = null;

    try {
      googleData =
        JSON.parse(googleText);
    } catch {
      googleData = {
        raw: googleText
      };
    }

    // --------------------------------------------------
    // ERROR GOOGLE SHEETS
    // --------------------------------------------------

    if (!googleResponse.ok) {
      console.error(
        "Google Sheets respondió con error:",
        googleData
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "Google Sheets no aceptó el lead",
          details: googleData
        },
        502,
        corsHeaders
      );
    }

    // --------------------------------------------------
    // RESPUESTA EXITOSA
    // --------------------------------------------------

    console.log(
      "Lead registrado correctamente:",
      lead
    );

    return jsonResponse(
      {
        ok: true,
        message:
          "Lead registrado correctamente",
        google: googleData
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
