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
// IA - CLOUDFLARE WORKERS AI
// ASISTENTE NATURAL + CATÁLOGO REAL
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
    const payload = await request.json();

    const message = String(
      payload.message ||
      payload.mensaje ||
      ""
    ).trim();

    const history = Array.isArray(payload.history)
      ? payload.history
      : [];

    if (!message) {
      return jsonResponse(
        {
          ok: false,
          error: "El mensaje está vacío"
        },
        400,
        corsHeaders
      );
    }

    // ========================================================
    // FUNCIONES AUXILIARES
    // ========================================================

    function normalizeText(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanText(value) {
      return String(value || "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#039;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
    }

    function getAttribute(tag, attribute) {
      const regex = new RegExp(
        attribute + "\\s*=\\s*[\"']([^\"']*)[\"']",
        "i"
      );

      const match = tag.match(regex);

      return match
        ? match[1].trim()
        : "";
    }

    function extractVisiblePrice(card) {
      const strongMatches =
        card.match(
          /<strong\b[^>]*>[\s\S]*?<\/strong>/gi
        ) || [];

      for (const strong of strongMatches) {
        const text = cleanText(strong);

        if (
          text.includes("$") ||
          normalizeText(text).includes("cotizar")
        ) {
          return text;
        }
      }

      const priceMatch = card.match(
        /\$\s*[\d.,]+(?:\s*-\s*\$\s*[\d.,]+)?/i
      );

      if (priceMatch) {
        return priceMatch[0].trim();
      }

      return "Precio no especificado; consultar";
    }

    // ========================================================
    // OBTENER CATÁLOGO REAL
    // ========================================================

    let products = [];

    try {
      if (!env.ASSETS) {
        throw new Error(
          "La vinculación ASSETS no está disponible"
        );
      }

      const catalogUrl = new URL(request.url);
      catalogUrl.pathname = "/productos2.html";
      catalogUrl.search = "";

      const catalogResponse = await env.ASSETS.fetch(
        new Request(
          catalogUrl.toString(),
          {
            method: "GET"
          }
        )
      );

      if (!catalogResponse.ok) {
        throw new Error(
          `No se pudo obtener productos2.html (${catalogResponse.status})`
        );
      }

      const html = await catalogResponse.text();

      // ------------------------------------------------------
      // LOCALIZAR CADA PRODUCT-CARD
      //
      // En lugar de intentar cerrar el div con una expresión
      // regular complicada, usamos las posiciones de cada
      // tarjeta. Esto evita romperse por los div internos.
      // ------------------------------------------------------

      const cardStartRegex =
        /<(article|div)\b[^>]*class=["'][^"']*\bproduct-card\b[^"']*["'][^>]*>/gi;

      const cardStarts = [];
      let cardMatch;

      while ((cardMatch = cardStartRegex.exec(html)) !== null) {
        cardStarts.push({
          index: cardMatch.index,
          end: cardStartRegex.lastIndex,
          tag: cardMatch[1].toLowerCase(),
          openingTag: cardMatch[0]
        });
      }

      for (let i = 0; i < cardStarts.length; i++) {
        const current = cardStarts[i];

        const nextIndex =
          i + 1 < cardStarts.length
            ? cardStarts[i + 1].index
            : html.length;

        const card = html.slice(
          current.index,
          nextIndex
        );

        const openingTag =
          current.openingTag;

        const dataProduct =
          getAttribute(
            openingTag,
            "data-product"
          );

        const dataPrice =
          getAttribute(
            openingTag,
            "data-price"
          );

        const vehicle =
          getAttribute(
            openingTag,
            "data-vehicle"
          );

        const category =
          getAttribute(
            openingTag,
            "data-category"
          );

        const headingMatch =
          card.match(
            /<h3\b[^>]*>([\s\S]*?)<\/h3>/i
          );

        const visibleName =
          headingMatch
            ? cleanText(
                headingMatch[1]
              )
            : "";

        const productName =
          cleanText(
            dataProduct ||
            visibleName
          );

        if (!productName) {
          continue;
        }

        let price = "";

        if (dataPrice) {
          const numericPrice =
            Number(dataPrice);

          if (
            Number.isFinite(numericPrice) &&
            numericPrice > 0
          ) {
            price =
              `$${numericPrice.toLocaleString("es-CO")}`;
          }
        }

        if (!price) {
          price =
            extractVisiblePrice(card);
        }

        const paragraphMatch =
          card.match(
            /<p\b[^>]*>([\s\S]*?)<\/p>/i
          );

        const description =
          paragraphMatch
            ? cleanText(
                paragraphMatch[1]
              )
            : "";

        products.push({
          name: productName,
          price,
          vehicle:
            vehicle ||
            "no especificado",
          category:
            category ||
            "no especificada",
          description
        });
      }

      console.log(
        `Catálogo leído por IA: ${products.length} productos`
      );

    } catch (catalogError) {
      console.error(
        "Error leyendo catálogo:",
        catalogError
      );
    }

    // ========================================================
    // TEXTO + HISTORIAL PARA ENTENDER CONTEXTO
    // ========================================================

    const normalizedMessage =
      normalizeText(message);

    const previousUserMessages =
      history
        .filter(
          item =>
            item &&
            typeof item === "object" &&
            (
              item.role === "user" ||
              !item.role
            )
        )
        .map(
          item =>
            String(
              item.text ||
              item.message ||
              item.content ||
              ""
            )
        )
        .filter(Boolean)
        .slice(-5);

    const conversationText =
      normalizeText(
        [
          ...previousUserMessages,
          message
        ].join(" ")
      );

    // ========================================================
    // DETECTAR TIPO DE VEHÍCULO
    // ========================================================

    const motorcycleBrands = [
      "victory",
      "suzuki",
      "yamaha",
      "honda",
      "kawasaki",
      "bajaj",
      "akt",
      "tvs",
      "hero",
      "ktm",
      "bmw",
      "ducati",
      "harley",
      "harley davidson",
      "royal enfield",
      "cfmoto",
      "benelli",
      "keeway",
      "sym",
      "kymco",
      "vespa",
      "aprilia"
    ];

    const motorcycleModels = [
      "gixxer",
      "gixxer sf",
      "one st",
      "one st 110",
      "nkd",
      "pulsar",
      "boxer",
      "discover",
      "dominar",
      "apache",
      "fz",
      "mt-",
      "mt ",
      "xtz",
      "crypton",
      "bws",
      "nmax",
      "aerox",
      "pcx",
      "cb ",
      "xr ",
      "cbr ",
      "wave",
      "dio",
      "scooter",
      "scooty",
      "enduro"
    ];

    const carBrands = [
      "mazda",
      "toyota",
      "chevrolet",
      "renault",
      "kia",
      "hyundai",
      "nissan",
      "ford",
      "volkswagen",
      "volvo",
      "mercedes",
      "mercedes benz",
      "bmw",
      "audi",
      "honda",
      "suzuki",
      "mitsubishi",
      "subaru",
      "peugeot",
      "citroen",
      "fiat",
      "jeep",
      "dodge",
      "chrysler",
      "seat",
      "skoda",
      "volkswagen",
      "porsche",
      "ferrari",
      "lamborghini",
      "tesla"
    ];

    const truckWords = [
      "camion",
      "camioneta",
      "tractocamion",
      "furgon",
      "furgoneta",
      "bus",
      "volqueta",
      "tractomula"
    ];

    const explicitMoto =
      /\bmoto\b|\bmotocicleta\b|\bmotorcycle\b/i
        .test(conversationText);

    const explicitCar =
      /\bcarro\b|\bcoche\b|\bauto\b|\bautomovil\b|\bvehiculo\b/i
        .test(conversationText);

    const explicitTruck =
      truckWords.some(
        word =>
          conversationText.includes(
            normalizeText(word)
          )
      );

    const hasMotoBrand =
      motorcycleBrands.some(
        brand =>
          conversationText.includes(
            normalizeText(brand)
          )
      );

    const hasMotoModel =
      motorcycleModels.some(
        model =>
          conversationText.includes(
            normalizeText(model)
          )
      );

    const hasCarBrand =
      carBrands.some(
        brand =>
          conversationText.includes(
            normalizeText(brand)
          )
      );

    let vehicleType = "";

    if (
      explicitTruck
    ) {
      vehicleType = "camion";

    } else if (
      explicitMoto ||
      hasMotoBrand ||
      hasMotoModel
    ) {
      vehicleType = "moto";

    } else if (
      explicitCar ||
      hasCarBrand
    ) {
      vehicleType = "carro";
    }

    // ========================================================
    // DETECTAR PRODUCTO / INTENCIÓN
    // ========================================================

    const asksProducts =
      /\bproducto\b|\bproductos\b|\bcatalogo\b|\bque tienen\b|\bque venden\b|\bdisponible\b|\bdisponibles\b|\bmostrar\b|\bmuestreme\b/i
        .test(normalizedMessage);

    const asksOil =
      /\baceite\b|\baceites\b|\blubricante\b|\blubricantes\b/i
        .test(conversationText);

    const asksFilter =
      /\bfiltro\b|\bfiltros\b/i
        .test(conversationText);

    const asksCoolant =
      /\brefrigerante\b|\brefrigerantes\b|\bcoolant\b/i
        .test(conversationText);

    const asksAdditive =
      /\baditivo\b|\baditivos\b/i
        .test(conversationText);

    const asksPrice =
      /\bprecio\b|\bprecios\b|\bcuanto cuesta\b|\bcuanto vale\b|\bvale\b|\bcosto\b/i
        .test(normalizedMessage);

    const asksRecommendation =
      /\brecomienda\b|\brecomendar\b|\brecomendacion\b|\brecomendación\b|\bque me recomiendas\b|\bcual me recomiendas\b|\bque aceite le pongo\b|\bque aceite puedo usar\b|\bque aceite necesita\b/i
        .test(normalizedMessage);

    const asksCompatibility =
      /\bsirve para\b|\bfunciona para\b|\bes compatible\b|\bcompatible con\b|\ble sirve\b|\bpara mi\b/i
        .test(normalizedMessage);

    const asksStock =
      /\bstock\b|\binventario\b|\bexistencia\b|\bdisponibilidad\b|\bqueda\b/i
        .test(normalizedMessage);

    const mentionsViscosity =
      /\b\d{1,2}w-\d{2}\b/i
        .test(conversationText);

    const mentions2T =
      /\b2t\b|\bdos tiempos\b/i
        .test(conversationText);

    const mentions4T =
      /\b4t\b|\bcuatro tiempos\b/i
        .test(conversationText);

    const isStoreQuestion =
      asksProducts ||
      asksOil ||
      asksFilter ||
      asksCoolant ||
      asksAdditive ||
      asksPrice ||
      asksRecommendation ||
      asksCompatibility ||
      asksStock ||
      mentionsViscosity ||
      mentions2T ||
      mentions4T ||
      vehicleType !== "";

    // ========================================================
    // INTENCIÓN DE RECOMENDACIÓN
    //
    // Si dice:
    // "Necesito un aceite para mi carro"
    // todavía no debemos adivinar.
    // ========================================================

    if (
      asksRecommendation &&
      (
        vehicleType === "carro" ||
        vehicleType === "moto" ||
        vehicleType === "camion"
      )
    ) {
      const hasYear =
        /\b(19|20)\d{2}\b/.test(
          conversationText
        );

      const hasBrand =
        motorcycleBrands.some(
          brand =>
            conversationText.includes(
              normalizeText(brand)
            )
        ) ||
        carBrands.some(
          brand =>
            conversationText.includes(
              normalizeText(brand)
            )
        );

      const hasModel =
        hasMotoModel ||
        /\b(cx-?\d+|corolla|hilux|rav4|spark|onix|aveo|duster|logan|sandero|captur|tucson|sportage|sentra|versa|civic|cr-v|gixxer|pulsar|nkd|boxer)\b/i
          .test(conversationText);

      // Si solo dijo "aceite para mi carro/moto",
      // pedimos datos mínimos.
      if (
        !hasBrand ||
        !hasModel ||
        !hasYear
      ) {
        const vehicleLabel =
          vehicleType === "moto"
            ? "moto"
            : vehicleType === "camion"
              ? "camión"
              : "carro";

        const answer =
          `Claro 👍 Para recomendarte una opción adecuada para tu ${vehicleLabel}, dime la marca, el modelo y el año. Así reviso las opciones disponibles en el catálogo de VR Turbolub.`;

        return jsonResponse(
          {
            ok: true,
            respuesta: answer,
            response: answer
          },
          200,
          corsHeaders
        );
      }
    }

    // ========================================================
    // BUSCAR PRODUCTOS
    // ========================================================

    let matchingProducts = [];

    if (
      isStoreQuestion &&
      products.length > 0
    ) {

      // ------------------------------------------------------
      // PALABRAS IMPORTANTES
      // ------------------------------------------------------

      const stopWords = new Set([
        "para",
        "que",
        "tienen",
        "tiene",
        "con",
        "del",
        "los",
        "las",
        "una",
        "uno",
        "por",
        "como",
        "quiero",
        "necesito",
        "busco",
        "hay",
        "este",
        "esta",
        "ese",
        "esa",
        "me",
        "un",
        "el",
        "la",
        "de",
        "en",
        "mi",
        "mis",
        "me",
        "puedo",
        "puede",
        "tengo",
        "tiene",
        "seria",
        "sería",
        "cual",
        "cuál",
        "recomiendas",
        "recomendar",
        "recomienda"
      ]);

      const queryTokens =
        normalizedMessage
          .split(/\s+/)
          .filter(
            token =>
              token.length >= 2 &&
              !stopWords.has(token)
          );

      // ------------------------------------------------------
      // SCORE
      // ------------------------------------------------------

      const scoredProducts =
        products.map(
          product => {

            const productName =
              normalizeText(
                product.name
              );

            const productVehicle =
              normalizeText(
                product.vehicle
              );

            const productCategory =
              normalizeText(
                product.category
              );

            const productDescription =
              normalizeText(
                product.description
              );

            const searchable =
              `${productName} ${productVehicle} ${productCategory} ${productDescription}`;

            let score = 0;

            // Coincidencias de palabras
            for (
              const token of queryTokens
            ) {
              if (
                productName.includes(token)
              ) {
                score += 5;
              } else if (
                searchable.includes(token)
              ) {
                score += 2;
              }
            }

            // ------------------------------------------------
            // VEHÍCULO
            // ------------------------------------------------

            if (
              vehicleType === "moto"
            ) {
              if (
                productVehicle.includes("moto")
              ) {
                score += 12;
              } else if (
                productVehicle === "all"
              ) {
                score += 2;
              } else if (
                productVehicle &&
                !productVehicle.includes("moto")
              ) {
                score -= 5;
              }
            }

            if (
              vehicleType === "carro"
            ) {
              if (
                productVehicle.includes("carro")
              ) {
                score += 12;
              } else if (
                productVehicle === "all"
              ) {
                score += 2;
              } else if (
                productVehicle &&
                !productVehicle.includes("carro")
              ) {
                score -= 5;
              }
            }

            if (
              vehicleType === "camion"
            ) {
              if (
                productVehicle.includes("camion")
              ) {
                score += 12;
              } else if (
                productVehicle === "all"
              ) {
                score += 2;
              } else if (
                productVehicle &&
                !productVehicle.includes("camion")
              ) {
                score -= 5;
              }
            }

            // ------------------------------------------------
            // CATEGORÍA ACEITE
            // ------------------------------------------------

            if (
              asksOil &&
              productCategory.includes("aceite")
            ) {
              score += 10;
            }

            // ------------------------------------------------
            // FILTROS
            // ------------------------------------------------

            if (
              asksFilter &&
              productCategory.includes("filtro")
            ) {
              score += 10;
            }

            // ------------------------------------------------
            // REFRIGERANTES
            // ------------------------------------------------

            if (
              asksCoolant &&
              productCategory.includes("refrigerante")
            ) {
              score += 10;
            }

            // ------------------------------------------------
            // ADITIVOS
            // ------------------------------------------------

            if (
              asksAdditive &&
              productCategory.includes("aditivo")
            ) {
              score += 10;
            }

            // ------------------------------------------------
            // 2T / 4T
            // ------------------------------------------------

            if (mentions2T) {
              if (
                productName.includes("2t") ||
                productDescription.includes("2t")
              ) {
                score += 15;
              } else {
                score -= 3;
              }
            }

            if (mentions4T) {
              if (
                productName.includes("4t") ||
                productDescription.includes("4t")
              ) {
                score += 15;
              } else if (
                productVehicle.includes("moto") &&
                productCategory.includes("aceite")
              ) {
                score += 5;
              }
            }

            // ------------------------------------------------
            // VISCOSIDAD
            // ------------------------------------------------

            const viscosities =
              normalizedMessage.match(
                /\b\d{1,2}w-\d{2}\b/gi
              ) || [];

            for (
              const viscosity of viscosities
            ) {
              if (
                searchable.includes(
                  normalizeText(viscosity)
                )
              ) {
                score += 20;
              }
            }

            return {
              product,
              score
            };
          }
        );

      matchingProducts =
        scoredProducts
          .filter(
            item =>
              item.score > 0
          )
          .sort(
            (a, b) =>
              b.score - a.score
          )
          .slice(0, 15)
          .map(
            item =>
              item.product
          );
    }

    // ========================================================
    // PRODUCTOS GENERALES
    // ========================================================

    if (
      asksProducts &&
      !asksOil &&
      !asksFilter &&
      !asksCoolant &&
      !asksAdditive &&
      !vehicleType
    ) {
      matchingProducts =
        products.slice(0, 30);
    }

    // ========================================================
    // SI PREGUNTA POR VEHÍCULO PERO NO HAY COINCIDENCIA
    //
    // No significa que el producto no exista.
    // Significa que no podemos confirmar compatibilidad.
    // ========================================================

    let catalogContext = "";

    if (
      isStoreQuestion
    ) {

      if (
        matchingProducts.length > 0
      ) {
        catalogContext =
          matchingProducts
            .map(
              (product, index) =>
                `${index + 1}. ${product.name} | Precio: ${product.price} | Vehículo: ${product.vehicle} | Categoría: ${product.category}${product.description ? ` | ${product.description}` : ""}`
            )
            .join("\n");

      } else {
        catalogContext =
          "NO SE ENCONTRARON COINCIDENCIAS SUFICIENTES EN EL CATÁLOGO PARA ESTA CONSULTA.";
      }
    }

    // ========================================================
    // SISTEMA
    // ========================================================

    let systemPrompt = `
Eres el asistente virtual oficial de VR Turbolub, una tienda de aceites, lubricantes, filtros, refrigerantes, aditivos y productos automotrices.

Responde siempre en español.

Tu objetivo es atender al cliente de forma natural, como un asesor de ventas.

El cliente puede escribir de cualquier manera.

NO debes exigir que use palabras exactas del catálogo.

Por ejemplo:

"tengo una Victory One ST 110, ¿qué aceite me recomiendas?"

"aceite para gixxer 150 fi"

"tengo un Mazda CX-30"

"mi moto necesita cambio de aceite"

"¿qué tienen para mi carro?"

Todas son preguntas naturales y debes entender su intención.

REGLAS ABSOLUTAS:

1. Nunca inventes productos de VR Turbolub.
2. Nunca inventes precios.
3. Nunca inventes stock.
4. Nunca inventes promociones.
5. Nunca inventes especificaciones técnicas.
6. Nunca afirmes compatibilidad con un vehículo si no está confirmada.
7. Si no puedes confirmar algo, dilo claramente.
8. No conviertas una suposición en un hecho.
9. Si el cliente menciona una moto o carro que no aparece literalmente en el catálogo, NO significa que no podamos ofrecer productos para ese tipo de vehículo.
10. Puedes reconocer que un nombre corresponde a una moto o carro y consultar las opciones generales de esa categoría.
11. Los datos comerciales deben salir únicamente del catálogo proporcionado.
12. Si no puedes confirmar el producto solicitado, invita al cliente a contactar con un asesor de VR Turbolub.
13. Nunca inventes información sobre VR Turbolub.
14. No digas que VR Turbolub es una empresa de realidad virtual. VR Turbolub comercializa aceites, lubricantes y productos automotrices.
15. Si el cliente pregunta por un producto específico que no aparece en el catálogo, dilo claramente.
16. Si pregunta por stock, indica que el catálogo no muestra inventario físico en tiempo real.
17. Si aparece "Cotizar", indica que debe consultar el precio con un asesor.
18. Sé breve, natural y útil.
19. No hagas listas interminables de preguntas. Pregunta únicamente lo necesario.
20. Si el cliente ya proporcionó información anteriormente en la conversación, úsala y no vuelvas a pedirla.
`;

    // ========================================================
    // CONTEXTO CATÁLOGO
    // ========================================================

    if (
      isStoreQuestion
    ) {

      systemPrompt += `

ESTA ES UNA CONSULTA RELACIONADA CON VR TURBOLUB.

Los siguientes datos provienen del catálogo REAL.

SOLO puedes utilizar estos productos y sus datos comerciales.

CATÁLOGO RELEVANTE:

${catalogContext}

REGLAS DEL CATÁLOGO:

- Utiliza exactamente los nombres mostrados.
- Utiliza exactamente los precios mostrados.
- No inventes productos adicionales.
- No inventes precios.
- No inventes stock.
- No inventes compatibilidad.
- Si el catálogo no confirma la compatibilidad con el vehículo mencionado, dilo.
- Si no hay coincidencias suficientes, explica que no encontraste una opción confirmable en el catálogo y ofrece contactar con un asesor.
`;

    } else {

      systemPrompt += `

Esta es una consulta general.

Puedes responder con conocimiento general.

No atribuyas información inventada a VR Turbolub.

Si no estás seguro de un dato factual, no lo presentes como un hecho.
`;
    }

    // ========================================================
    // HISTORIAL
    // ========================================================

    const messages = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    for (
      const item of history
    ) {
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

      if (
        !text.trim()
      ) {
        continue;
      }

      messages.push({
        role,
        content:
          text.trim()
      });
    }

    // ========================================================
    // MENSAJE ACTUAL
    // ========================================================

    messages.push({
      role: "user",
      content: message
    });

    // ========================================================
    // WORKERS AI
    // ========================================================

    const aiResponse =
      await env.AI.run(
        "@cf/meta/llama-3.2-3b-instruct",
        {
          messages,
          max_tokens: 350,
          temperature: 0.1,
          top_p: 0.8
        }
      );

    // ========================================================
    // RESPUESTA
    // ========================================================

    const respuesta =
      aiResponse?.response ||
      aiResponse?.choices?.[0]?.message?.content ||
      "";

    if (
      !respuesta.trim()
    ) {
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

    return jsonResponse(
      {
        ok: true,
        respuesta:
          respuesta.trim(),
        response:
          respuesta.trim()
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

