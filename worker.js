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



// ============================================================
// FETCH PRINCIPAL
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }


    // --------------------------------------------------------
    // HEALTH CHECKS
    // --------------------------------------------------------

    if (request.method === "GET" && url.pathname === "/crear-pedido") {
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


    if (request.method === "GET" && url.pathname === "/registrar-lead") {
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

if (request.method === "GET" && url.pathname === "/ia") {
  return jsonResponse(
    {
      ok: true,
      message: "Servicio IA activo",
      service: "VR Turbolub + Cloudflare Workers AI",
      model: "@cf/meta/llama-3.2-1b-instruct"
    },
    200,
    corsHeaders
  );
}


    // --------------------------------------------------------
    // POST /crear-pedido
    // --------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/crear-pedido"
    ) {
      return crearPedido(request, env, corsHeaders);
    }


    // --------------------------------------------------------
    // POST /registrar-lead
    // --------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/registrar-lead"
    ) {
      return registrarLead(request, env, corsHeaders);
    }


    // --------------------------------------------------------
    // POST /ia
    // --------------------------------------------------------

    if (
      request.method === "POST" &&
      url.pathname === "/ia"
    ) {
      return responderIA(request, env, corsHeaders);
    }


    // --------------------------------------------------------
    // ARCHIVOS ESTÁTICOS
    // --------------------------------------------------------

    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }


    // --------------------------------------------------------
    // MÉTODO NO PERMITIDO
    // --------------------------------------------------------

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


// ============================================================
// CREAR PEDIDO
// ============================================================

async function crearPedido(request, env, corsHeaders) {
  try {
    // --------------------------------------------------------
    // TOKEN HUBSPOT
    // --------------------------------------------------------

    if (!env.HUBSPOT_TOKEN) {
      return jsonResponse(
        {
          ok: false,
          error: "HUBSPOT_TOKEN no está configurado"
        },
        500,
        corsHeaders
      );
    }


    // --------------------------------------------------------
    // LEER BODY
    // --------------------------------------------------------

    const payload = await request.json();

    const order = payload.order || payload;
    const receipt = payload.receipt || null;


    // --------------------------------------------------------
    // VALIDACIONES BÁSICAS
    // --------------------------------------------------------

    if (!order || typeof order !== "object") {
      return jsonResponse(
        {
          ok: false,
          error: "Pedido inválido"
        },
        400,
        corsHeaders
      );
    }


    if (!order.id) {
      return jsonResponse(
        {
          ok: false,
          error: "El pedido no tiene ID"
        },
        400,
        corsHeaders
      );
    }


    const customer = order.customer || {};


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
            "Faltan datos obligatorios del cliente: nombre, apellido, correo o teléfono"
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


    // --------------------------------------------------------
    // MÉTODO DE PAGO
    // --------------------------------------------------------

    const paymentMethod =
      order.paymentMethod || "contra_entrega";


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


    const paymentName =
      order.paymentMethodName ||
      paymentNames[paymentMethod];


    // --------------------------------------------------------
    // COMPROBANTE OBLIGATORIO
    // --------------------------------------------------------

    if (
      paymentMethod === "nequi" ||
      paymentMethod === "transferencia"
    ) {
      if (!receipt) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Debes adjuntar el comprobante de pago"
          },
          400,
          corsHeaders
        );
      }
    }


    // --------------------------------------------------------
    // VALIDAR COMPROBANTE
    // --------------------------------------------------------

    let validatedReceipt = null;

    if (receipt) {
      try {
        validatedReceipt = validateReceipt(receipt);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: error.message
          },
          400,
          corsHeaders
        );
      }
    }


    // --------------------------------------------------------
    // PRODUCTOS
    // --------------------------------------------------------

    const productsText = order.products
      .map((product) => {
        const name = product.name || "Producto";
        const quantity =
          Number(product.quantity) || 0;
        const price =
          Number(product.price) || 0;

        const subtotal =
          price * quantity;

        return (
          `${name} x${quantity} ` +
          `($${formatPrice(subtotal)})`
        );
      })
      .join("\n");


    // --------------------------------------------------------
    // RECALCULAR SUBTOTAL EN SERVIDOR
    // --------------------------------------------------------

    const subtotal = order.products.reduce(
      (total, product) => {
        const price =
          Number(product.price) || 0;

        const quantity =
          Number(product.quantity) || 0;

        return total + price * quantity;
      },
      0
    );


    // --------------------------------------------------------
    // ENVÍO
    //
    // Contra entrega = gratis
    // Más de $100.000 = gratis
    // $100.000 exactos = $10.000
    // Menos de $100.000 = $10.000
    // --------------------------------------------------------

    const shipping =
      paymentMethod === "contra_entrega" ||
      subtotal > 100000
        ? 0
        : 10000;


    const total =
      subtotal + shipping;


    // --------------------------------------------------------
    // HEADERS HUBSPOT
    // --------------------------------------------------------

    const hubspotHeaders = {
      "Authorization":
        `Bearer ${env.HUBSPOT_TOKEN}`,
      "Content-Type":
        "application/json"
    };


    // ========================================================
    // 1. BUSCAR CONTACTO EN HUBSPOT
    // ========================================================

    let contactId = null;

    const contactSearchResponse =
      await fetch(
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


    // --------------------------------------------------------
    // CONTACTO EXISTENTE
    // --------------------------------------------------------

    if (
      contactSearchResponse.ok &&
      contactSearchData.results &&
      contactSearchData.results.length > 0
    ) {
      contactId =
        contactSearchData.results[0].id;


      // ------------------------------------------------------
      // ACTUALIZAR CONTACTO
      // ------------------------------------------------------

      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
        {
          method: "PATCH",
          headers: hubspotHeaders,
          body: JSON.stringify({
            properties: {
              firstname: customer.name,
              lastname: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              address: customer.address || "",
              city: customer.city || ""
            }
          })
        }
      );
    }


    // ========================================================
    // 2. CREAR CONTACTO SI NO EXISTE
    // ========================================================

    if (!contactId) {
      const createContactResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/contacts`,
          {
            method: "POST",
            headers: hubspotHeaders,
            body: JSON.stringify({
              properties: {
                firstname: customer.name,
                lastname: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                address: customer.address || "",
                city: customer.city || ""
              }
            })
          }
        );


      const createContactData =
        await safeJson(createContactResponse);


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
          500,
          corsHeaders
        );
      }


      contactId =
        createContactData.id;
    }


    // ========================================================
    // 3. CREAR DEAL
    // ========================================================

    const dealDescription = `
PEDIDO VR TURBOLUB

Pedido: ${order.id}

CLIENTE
Nombre: ${customer.name} ${customer.lastName}
Correo: ${customer.email}
Teléfono: ${customer.phone}
Dirección: ${customer.address || "No especificada"}
Ciudad: ${customer.city || "No especificada"}
Departamento: ${customer.department || "No especificado"}

MÉTODO DE PAGO
${paymentName}

PRODUCTOS
${productsText}

SUBTOTAL
$${formatPrice(subtotal)}

ENVÍO
$${formatPrice(shipping)}

TOTAL
$${formatPrice(total)}

OBSERVACIONES
${customer.notes || "Sin observaciones"}

ESTADO
Pendiente
    `.trim();


    const dealResponse =
      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/deals`,
        {
          method: "POST",
          headers: hubspotHeaders,
          body: JSON.stringify({
            properties: {
              dealname:
                `Pedido VR Turbolub #${order.id}`,

              pipeline:
                PIPELINE,

              dealstage:
                DEAL_STAGE,

              amount:
                String(total),

              closedate:
                new Date().toISOString(),

              description:
                dealDescription
            }
          })
        }
      );


    const dealData =
      await safeJson(dealResponse);


    if (!dealResponse.ok) {
      console.error(
        "Error creando Deal HubSpot:",
        dealData
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "No se pudo crear el pedido en HubSpot",
          details: dealData
        },
        500,
        corsHeaders
      );
    }


    const dealId =
      dealData.id;


    // ========================================================
    // 4. ASOCIAR DEAL CON CONTACTO
    // ========================================================

    let associationWarning = null;


    try {
      const associationResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`,
          {
            method: "PUT",
            headers: hubspotHeaders
          }
        );


      if (!associationResponse.ok) {
        const associationData =
          await safeJson(associationResponse);

        console.error(
          "Error asociando Deal y Contacto:",
          associationData
        );

        associationWarning =
          "El Deal fue creado, pero no se pudo asociar automáticamente con el contacto.";
      }
    } catch (error) {
      console.error(
        "Error en asociación Deal-Contacto:",
        error
      );

      associationWarning =
        "El Deal fue creado, pero falló la asociación con el contacto.";
    }


    // ========================================================
    // 5. SUBIR COMPROBANTE A HUBSPOT
    // ========================================================

    let fileId = null;
    let fileWarning = null;


    if (validatedReceipt) {
      try {
        const uploadResult =
          await uploadReceiptToHubSpot(
            validatedReceipt,
            env.HUBSPOT_TOKEN,
            order.id
          );


        if (uploadResult.ok) {
          fileId =
            uploadResult.fileId;
        } else {
          fileWarning =
            uploadResult.error ||
            "No se pudo subir el comprobante.";
        }
      } catch (error) {
        console.error(
          "Error subiendo comprobante:",
          error
        );

        fileWarning =
          "No se pudo subir el comprobante a HubSpot.";
      }
    }


    // ========================================================
    // 6. CREAR NOTA EN HUBSPOT
    // ========================================================

    let noteId = null;


    try {
      const noteBody = `
Pedido VR Turbolub #${order.id}

Cliente: ${customer.name} ${customer.lastName}
Correo: ${customer.email}
Teléfono: ${customer.phone}

Método de pago: ${paymentName}

Productos:
${productsText}

Subtotal: $${formatPrice(subtotal)}
Envío: $${formatPrice(shipping)}
Total: $${formatPrice(total)}

Dirección:
${customer.address || "No especificada"}

Ciudad:
${customer.city || "No especificada"}

Departamento:
${customer.department || "No especificado"}

Observaciones:
${customer.notes || "Sin observaciones"}

Estado:
Pendiente
      `.trim();


      const noteProperties = {
        hs_timestamp:
          new Date().toISOString(),

        hs_note_body:
          noteBody
      };


      if (fileId) {
        noteProperties.hs_attachment_ids =
          String(fileId);
      }


      const noteResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/notes`,
          {
            method: "POST",
            headers: hubspotHeaders,
            body: JSON.stringify({
              properties:
                noteProperties,

              associations: [
                {
                  to: {
                    id: dealId
                  },
                  types: [
                    {
                      associationCategory:
                        "HUBSPOT_DEFINED",
                      associationTypeId:
                        214
                    }
                  ]
                }
              ]
            })
          }
        );


      const noteData =
        await safeJson(noteResponse);


      if (noteResponse.ok) {
        noteId =
          noteData.id;
      } else {
        console.error(
          "Error creando nota HubSpot:",
          noteData
        );
      }
    } catch (error) {
      console.error(
        "Error creando nota:",
        error
      );
    }


    // ========================================================
    // 7. NOTIFICACIONES POR CORREO
    //
    // IMPORTANTE:
    // Este bloque pertenece a crearPedido().
    // NO está dentro de registrarLead().
    // ========================================================

    let emailResult = {
      attempted: false,
      internal: false,
      customer: false,
      warning: null
    };


    if (env.RESEND_API_KEY) {
      emailResult.attempted = true;


      try {
        const internalRecipients =
          String(
            env.ORDER_NOTIFICATION_EMAILS || ""
          )
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);


        const customerEmail =
          String(
            customer.email || ""
          ).trim();


        // ----------------------------------------------------
        // PRODUCTOS HTML
        // ----------------------------------------------------

        const productsHtml =
          order.products
            .map((product) => {
              const name =
                escapeHtml(
                  product.name || "Producto"
                );

              const quantity =
                Number(product.quantity) || 0;

              const price =
                Number(product.price) || 0;

              const productSubtotal =
                price * quantity;

              return `
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #ddd;">
                    ${name}
                  </td>

                  <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
                    ${quantity}
                  </td>

                  <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
                    $${formatPrice(price)}
                  </td>

                  <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
                    $${formatPrice(productSubtotal)}
                  </td>
                </tr>
              `;
            })
            .join("");


        // ----------------------------------------------------
        // NOMBRE CLIENTE
        // ----------------------------------------------------

        const fullCustomerName =
          `${customer.name} ${customer.lastName}`.trim();


        // ----------------------------------------------------
        // EMAIL INTERNO
        // ----------------------------------------------------

        if (internalRecipients.length > 0) {
          const internalHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
</head>

<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">

<div style="max-width:700px;margin:auto;background:white;padding:30px;border-radius:10px;">

<h1 style="margin-top:0;">
Nuevo pedido VR Turbolub
</h1>

<p>
Se ha recibido un nuevo pedido desde la tienda.
</p>

<hr>

<h2>Pedido #${escapeHtml(order.id)}</h2>

<p>
<strong>Cliente:</strong>
${escapeHtml(fullCustomerName)}
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
${escapeHtml(customer.address || "No especificada")}
</p>

<p>
<strong>Ciudad:</strong>
${escapeHtml(customer.city || "No especificada")}
</p>

<p>
<strong>Departamento:</strong>
${escapeHtml(customer.department || "No especificado")}
</p>

<p>
<strong>Método de pago:</strong>
${escapeHtml(paymentName)}
</p>

<h3>Productos</h3>

<table style="width:100%;border-collapse:collapse;">

<thead>
<tr>
<th style="padding:8px;text-align:left;">Producto</th>
<th style="padding:8px;text-align:center;">Cantidad</th>
<th style="padding:8px;text-align:right;">Precio</th>
<th style="padding:8px;text-align:right;">Subtotal</th>
</tr>
</thead>

<tbody>
${productsHtml}
</tbody>

</table>

<hr>

<p>
<strong>Subtotal:</strong>
$${formatPrice(subtotal)}
</p>

<p>
<strong>Envío:</strong>
$${formatPrice(shipping)}
</p>

<p style="font-size:20px;">
<strong>Total:</strong>
$${formatPrice(total)}
</p>

<h3>Observaciones</h3>

<p>
${escapeHtml(
  customer.notes || "Sin observaciones"
)}
</p>

<hr>

<p>
<strong>Deal HubSpot:</strong>
${escapeHtml(dealId)}
</p>

<p>
<strong>Contacto HubSpot:</strong>
${escapeHtml(contactId)}
</p>

${
  fileId
    ? `
<p>
<strong>Comprobante:</strong>
Adjunto en HubSpot.
</p>
`
    : ""
}

</div>

</body>
</html>
          `;


          const internalResponse =
            await fetch(
              "https://api.resend.com/emails",
              {
                method: "POST",

                headers: {
                  "Authorization":
                    `Bearer ${env.RESEND_API_KEY}`,

                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  from:
                    "VR Turbolub <onboarding@resend.dev>",

                  to:
                    internalRecipients,

                  subject:
                    `Nuevo pedido - VR Turbolub #${order.id}`,

                  html:
                    internalHtml
                })
              }
            );


          const internalData =
            await safeJson(internalResponse);


          if (internalResponse.ok) {
            emailResult.internal = true;
          } else {
            console.error(
              "Error enviando correo interno:",
              internalData
            );

            emailResult.warning =
              "No se pudo enviar el correo interno.";
          }
        } else {
          emailResult.warning =
            "ORDER_NOTIFICATION_EMAILS no está configurado.";
        }


        // ----------------------------------------------------
        // EMAIL DE CONFIRMACIÓN AL CLIENTE
        // ----------------------------------------------------

        if (customerEmail) {
          const customerHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
</head>

<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">

<div style="max-width:700px;margin:auto;background:white;padding:30px;border-radius:10px;">

<h1 style="margin-top:0;">
¡Gracias por tu pedido!
</h1>

<p>
Hola <strong>${escapeHtml(fullCustomerName)}</strong>,
</p>

<p>
Hemos recibido correctamente tu pedido en VR Turbolub.
Nuestro equipo revisará la información y continuará con el proceso.
</p>

<hr>

<h2>
Pedido #${escapeHtml(order.id)}
</h2>

<h3>Resumen del pedido</h3>

<table style="width:100%;border-collapse:collapse;">

<thead>
<tr>
<th style="padding:8px;text-align:left;">Producto</th>
<th style="padding:8px;text-align:center;">Cantidad</th>
<th style="padding:8px;text-align:right;">Precio</th>
<th style="padding:8px;text-align:right;">Subtotal</th>
</tr>
</thead>

<tbody>
${productsHtml}
</tbody>

</table>

<hr>

<p>
<strong>Subtotal:</strong>
$${formatPrice(subtotal)}
</p>

<p>
<strong>Envío:</strong>
$${formatPrice(shipping)}
</p>

<p style="font-size:20px;">
<strong>Total:</strong>
$${formatPrice(total)}
</p>

<p>
<strong>Método de pago:</strong>
${escapeHtml(paymentName)}
</p>

<hr>

<p>
Si tienes alguna pregunta sobre tu pedido, puedes comunicarte con VR Turbolub.
</p>

<p>
<strong>VR Turbolub</strong><br>
Aceites y lubricantes
</p>

</div>

</body>
</html>
          `;


          const customerResponse =
            await fetch(
              "https://api.resend.com/emails",
              {
                method: "POST",

                headers: {
                  "Authorization":
                    `Bearer ${env.RESEND_API_KEY}`,

                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  from:
                    "VR Turbolub <onboarding@resend.dev>",

                  to:
                    [customerEmail],

                  subject:
                    `Confirmación de pedido VR Turbolub #${order.id}`,

                  html:
                    customerHtml
                })
              }
            );


          const customerData =
            await safeJson(customerResponse);


if (customerResponse.ok) {
  emailResult.customer = true;

  emailResult.customerResponse = {
    status: customerResponse.status,
    data: customerData
  };

  console.log(
    "Confirmación enviada al cliente:",
    customerData
  );

} else {
  console.error(
    "Error enviando confirmación al cliente:",
    customerData
  );

  emailResult.customerResponse = {
    status: customerResponse.status,
    data: customerData
  };

  emailResult.warning =
    `No se pudo enviar la confirmación al cliente. ` +
    `Resend respondió HTTP ${customerResponse.status}.`;
}
        }
      } catch (error) {
        console.error(
          "Error general enviando notificaciones:",
          error
        );

        emailResult.warning =
          "Ocurrió un error al enviar las notificaciones por correo.";
      }
    } else {
      emailResult.warning =
        "RESEND_API_KEY no está configurado.";
    }


    // ========================================================
    // 8. RESPUESTA FINAL
    // ========================================================

    return jsonResponse(
      {
        ok: true,

        message:
          "Pedido registrado correctamente",

        orderId:
          order.id,

        contactId:
          contactId,

        dealId:
          dealId,

        fileId:
          fileId,

        noteId:
          noteId,

        subtotal:
          subtotal,

        shipping:
          shipping,

        total:
          total,

        associationWarning:
          associationWarning,

        fileWarning:
          fileWarning,

        email:
          emailResult
      },
      200,
      corsHeaders
    );


  } catch (error) {
    console.error(
      "ERROR CREAR PEDIDO:",
      error
    );


    return jsonResponse(
      {
        ok: false,

        error:
          error.message ||
          "Error interno al procesar el pedido"
      },
      500,
      corsHeaders
    );
  }
}


// ============================================================
// REGISTRAR LEAD
// ============================================================

async function registrarLead(
  request,
  env,
  corsHeaders
) {
  try {
    // --------------------------------------------------------
    // VARIABLES NECESARIAS
    // --------------------------------------------------------

    if (!env.HUBSPOT_TOKEN) {
      return jsonResponse(
        {
          ok: false,
          error:
            "HUBSPOT_TOKEN no está configurado"
        },
        500,
        corsHeaders
      );
    }


    if (!env.GOOGLE_SHEETS_URL) {
      return jsonResponse(
        {
          ok: false,
          error:
            "GOOGLE_SHEETS_URL no está configurado"
        },
        500,
        corsHeaders
      );
    }


    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    const payload =
      await request.json();


    const nombre =
      payload.nombre ||
      payload.name ||
      "";

    const apellidos =
      payload.apellidos ||
      payload.lastName ||
      "";

    const telefono =
      payload.telefono ||
      payload.phone ||
      "";

    const correo =
      payload.correo ||
      payload.email ||
      "";

    const producto =
      payload.producto ||
      payload.product ||
      "";

    const mensaje =
      payload.mensaje ||
      payload.message ||
      "";

    const estado =
      payload.estado ||
      "Nuevo";


    // --------------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------------

    if (
      !nombre ||
      !correo ||
      !telefono
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


    const hubspotHeaders = {
      "Authorization":
        `Bearer ${env.HUBSPOT_TOKEN}`,

      "Content-Type":
        "application/json"
    };


    // ========================================================
    // BUSCAR CONTACTO
    // ========================================================

    let contactId = null;


    const searchResponse =
      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/search`,
        {
          method: "POST",

          headers:
            hubspotHeaders,

          body:
            JSON.stringify({
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "email",
                      operator: "EQ",
                      value: correo
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


    const searchData =
      await safeJson(searchResponse);


    // ========================================================
    // ACTUALIZAR CONTACTO EXISTENTE
    // ========================================================

    if (
      searchResponse.ok &&
      searchData.results &&
      searchData.results.length > 0
    ) {
      contactId =
        searchData.results[0].id;


      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
        {
          method: "PATCH",

          headers:
            hubspotHeaders,

          body:
            JSON.stringify({
              properties: {
                firstname:
                  nombre,

                lastname:
                  apellidos,

                email:
                  correo,

                phone:
                  telefono,

                producto_o_servicio_de_interes:
                  producto
              }
            })
        }
      );
    }


    // ========================================================
    // CREAR CONTACTO
    // ========================================================

    if (!contactId) {
      const createResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/contacts`,
          {
            method: "POST",

            headers:
              hubspotHeaders,

            body:
              JSON.stringify({
                properties: {
                  firstname:
                    nombre,

                  lastname:
                    apellidos,

                  email:
                    correo,

                  phone:
                    telefono,

                  producto_o_servicio_de_interes:
                    producto
                }
              })
          }
        );


      const createData =
        await safeJson(createResponse);


      if (!createResponse.ok) {
        console.error(
          "Error creando lead en HubSpot:",
          createData
        );


        return jsonResponse(
          {
            ok: false,

            error:
              "No se pudo crear el contacto en HubSpot",

            details:
              createData
          },
          500,
          corsHeaders
        );
      }


      contactId =
        createData.id;
    }


    // ========================================================
    // GOOGLE SHEETS
    // ========================================================

    let googleSheetsOk = false;
    let googleSheetsWarning = null;


    try {
      const sheetsResponse =
        await fetch(
          env.GOOGLE_SHEETS_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                nombre,
                apellidos,
                telefono,
                correo,
                producto,
                mensaje,
                estado,
                fecha:
                  new Date().toISOString()
              })
          }
        );


      const sheetsData =
        await safeJson(sheetsResponse);


      if (sheetsResponse.ok) {
        googleSheetsOk = true;
      } else {
        console.error(
          "Error Google Sheets:",
          sheetsData
        );

        googleSheetsWarning =
          "El lead fue registrado en HubSpot, pero Google Sheets respondió con error.";
      }
    } catch (error) {
      console.error(
        "Error conectando con Google Sheets:",
        error
      );

      googleSheetsWarning =
        "El lead fue registrado en HubSpot, pero no se pudo conectar con Google Sheets.";
    }


    // ========================================================
    // RESPUESTA LEAD
    // ========================================================

    return jsonResponse(
      {
        ok: true,

        message:
          "Lead registrado correctamente",

        contactId:
          contactId,

        googleSheets:
          googleSheetsOk,

        googleSheetsWarning:
          googleSheetsWarning
      },
      200,
      corsHeaders
    );


  } catch (error) {
    console.error(
      "ERROR REGISTRAR LEAD:",
      error
    );


    return jsonResponse(
      {
        ok: false,

        error:
          error.message ||
          "Error interno al registrar el lead"
      },
      500,
      corsHeaders
    );
  }
}


// ============================================================
// IA 
// ============================================================
// ============================================================
// IA - CLOUDFLARE WORKERS AI
// ============================================================

async function responderIA(
  request,
  env,
  corsHeaders
) {
  try {
    // --------------------------------------------------------
    // VERIFICAR WORKERS AI
    // --------------------------------------------------------

    if (!env.AI) {
      return jsonResponse(
        {
          ok: false,
          error: "Cloudflare Workers AI no está configurado"
        },
        500,
        corsHeaders
      );
    }

    // --------------------------------------------------------
    // LEER BODY
    // --------------------------------------------------------

    const payload =
      await request.json();

    const message =
      payload.message ||
      payload.mensaje ||
      "";

    const history =
      Array.isArray(payload.history)
        ? payload.history
        : [];

    if (!message.trim()) {
      return jsonResponse(
        {
          ok: false,
          error: "El mensaje está vacío"
        },
        400,
        corsHeaders
      );
    }

    // --------------------------------------------------------
    // INSTRUCCIONES DE VR TURBOLUB
    // --------------------------------------------------------

    const systemPrompt = `
Eres el asistente virtual oficial de VR Turbolub.

VR Turbolub vende aceites y lubricantes.

RESPONDE SIEMPRE EN ESPAÑOL.

Sé amable, claro y breve.

IMPORTANTE:
Solo puedes utilizar la información del catálogo
proporcionado a continuación.

No inventes productos.
No inventes precios.
No inventes especificaciones técnicas.
No inventes disponibilidad.
No inventes promociones.

CATÁLOGO ACTUAL:

1. Aceite Moto 2T Terpel Celerity
Precio: $68.000

2. Aceite Moto 4T Terpel Celerity 20W-50 Titanio
Precio: $68.000

3. Valvulina GoldMax Gear para Cajas
Precio: $120.000

4. Lubricante Diésel
Precio: $180.000

5. Aditivo Premium
Precio: $45.000

MÉTODOS DE PAGO:

- Nequi
- PSE / Transferencia bancaria
- Tarjeta
- Contra entrega

ENVÍO:

- Contra entrega: envío gratis.
- Pedidos con subtotal MAYOR a $100.000: envío gratis.
- Pedidos de $100.000 exactos: envío de $10.000.
- Pedidos inferiores a $100.000: envío de $10.000.

Si el usuario quiere comprar,
indícale que puede utilizar el catálogo
y el carrito de compras de la página.

Si el usuario pregunta por un producto
que no está en el catálogo,
indica honestamente que actualmente
no tienes información sobre ese producto.

No inventes información.

Responde normalmente en pocas frases.
`;

    // --------------------------------------------------------
    // CONSTRUIR MENSAJES
    // --------------------------------------------------------

    const messages = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    for (const item of history) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        continue;
      }

      const role =
        item.role === "model" ||
        item.role === "assistant"
          ? "assistant"
          : "user";

      const text =
        String(
          item.text ||
          item.message ||
          item.content ||
          ""
        );

      if (!text.trim()) {
        continue;
      }

      messages.push({
        role,
        content: text
      });
    }

    // --------------------------------------------------------
    // MENSAJE ACTUAL
    // --------------------------------------------------------

    messages.push({
      role: "user",
      content: message.trim()
    });

    // --------------------------------------------------------
    // CLOUDFLARE WORKERS AI
    // --------------------------------------------------------

    const aiResponse =
      await env.AI.run(
        "@cf/meta/llama-3.2-1b-instruct",
        {
          messages,
          max_tokens: 300,
          temperature: 0.3
        }
      );

    // --------------------------------------------------------
    // EXTRAER RESPUESTA
    // --------------------------------------------------------

    const respuesta =
      aiResponse?.response ||
      aiResponse?.choices?.[0]?.message?.content ||
      "";

    if (!respuesta.trim()) {
      console.error(
        "Workers AI devolvió una respuesta vacía:",
        aiResponse
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "La IA no devolvió una respuesta válida"
        },
        502,
        corsHeaders
      );
    }

    // --------------------------------------------------------
    // RESPUESTA FINAL
    // --------------------------------------------------------

    return jsonResponse(
      {
        ok: true,
        respuesta: respuesta.trim(),
        response: respuesta.trim()
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error(
      "ERROR WORKERS AI:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          error?.message ||
          "Error interno del asistente IA"
      },
      500,
      corsHeaders
    );
  }
}



// ============================================================
// SUBIR COMPROBANTE A HUBSPOT
// ============================================================

async function uploadReceiptToHubSpot(
  receipt,
  token,
  orderId
) {
  try {
    const bytes =
      base64ToUint8Array(
        receipt.data
      );


    const extension =
      extensionFromMime(
        receipt.type
      );


    const filename =
      `comprobante-${orderId}${extension}`;


    const formData =
      new FormData();


    formData.append(
      "file",
      new Blob(
        [bytes],
        {
          type:
            receipt.type
        }
      ),
      filename
    );


    formData.append(
      "folderPath",
      "/VR Turbolub/Comprobantes"
    );


    formData.append(
      "options",
      JSON.stringify({
        access:
          "PRIVATE"
      })
    );


    const response =
      await fetch(
        `${HUBSPOT_API}/files/v3/files`,
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${token}`
          },

          body:
            formData
        }
      );


    const data =
      await safeJson(response);


    if (!response.ok) {
      console.error(
        "HubSpot Files error:",
        data
      );


      return {
        ok: false,

        error:
          data?.message ||
          "HubSpot rechazó el comprobante"
      };
    }


    return {
      ok: true,

      fileId:
        data.id
    };


  } catch (error) {
    console.error(
      "uploadReceiptToHubSpot:",
      error
    );


    return {
      ok: false,

      error:
        error.message ||
        "Error subiendo archivo"
    };
  }
}


// ============================================================
// VALIDAR COMPROBANTE
// ============================================================

function validateReceipt(receipt) {
  if (
    !receipt ||
    typeof receipt !== "object"
  ) {
    throw new Error(
      "Comprobante inválido"
    );
  }


  const type =
    String(
      receipt.type || ""
    ).toLowerCase();


  const data =
    String(
      receipt.data || ""
    );


  if (!type) {
    throw new Error(
      "El comprobante no tiene tipo de archivo"
    );
  }


  if (
    !ALLOWED_RECEIPT_TYPES.includes(type)
  ) {
    throw new Error(
      "Tipo de comprobante no permitido. Usa JPG, PNG, WEBP o PDF."
    );
  }


  if (!data) {
    throw new Error(
      "El comprobante no contiene datos"
    );
  }


  const cleanBase64 =
    data.includes(",")
      ? data.split(",").pop()
      : data;


  let bytes;


  try {
    bytes =
      base64ToUint8Array(
        cleanBase64
      );
  } catch {
    throw new Error(
      "El comprobante no tiene un formato válido"
    );
  }


  if (
    bytes.byteLength >
    RECEIPT_MAX_BYTES
  ) {
    throw new Error(
      "El comprobante supera el límite de 4 MB"
    );
  }


  return {
    type,

    data:
      cleanBase64,

    size:
      bytes.byteLength
  };
}


// ============================================================
// BASE64 → BYTES
// ============================================================

function base64ToUint8Array(base64) {
  const binary =
    atob(base64);


  const bytes =
    new Uint8Array(
      binary.length
    );


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


// ============================================================
// EXTENSIÓN MIME
// ============================================================

function extensionFromMime(mime) {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";

    case "image/png":
      return ".png";

    case "image/webp":
      return ".webp";

    case "application/pdf":
      return ".pdf";

    default:
      return "";
  }
}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// FORMATEAR PRECIO
// ============================================================

function formatPrice(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "es-CO"
  );
}


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(
  data,
  status = 200,
  headers = {}
) {
  return new Response(
    JSON.stringify(data),

    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...headers
      }
    }
  );
}


// ============================================================
// SAFE JSON
// ============================================================

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {
      ok: false,

      status:
        response.status,

      statusText:
        response.statusText
    };
  }
}

