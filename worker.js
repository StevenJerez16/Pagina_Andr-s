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
// IA VR TURBOLUB
// ============================================================

async function responderIA(request, env, corsHeaders) {

  try {

    const body = await request.json();

    const message = String(body?.message || "").trim();

    if (!message) {

      return jsonResponse(
        {
          ok: false,
          error: "No se recibió ningún mensaje."
        },
        400,
        corsHeaders
      );

    }

    // ============================================================
    // CARGAR BASES DE DATOS
    // ============================================================

    async function cargarJSON(ruta) {

      const url = new URL(ruta, request.url);

      const response = await env.ASSETS.fetch(
        new Request(url.toString())
      );

      if (!response.ok) {

        throw new Error(
          `No se pudo cargar ${ruta}. HTTP ${response.status}`
        );

      }

      return await response.json();

    }

    const [
      productosData,
      vehiculosData,
      compatibilidadesData
    ] = await Promise.all([

      cargarJSON("/data/productos.json"),

      cargarJSON("/data/vehiculos.json"),

      cargarJSON("/data/compatibilidades.json")

    ]);

    const productos =
      Array.isArray(productosData?.productos)
        ? productosData.productos
        : [];

    const vehiculos =
      Array.isArray(vehiculosData?.vehiculos)
        ? vehiculosData.vehiculos
        : [];

    const compatibilidades =
      Array.isArray(
        compatibilidadesData?.compatibilidades
      )
        ? compatibilidadesData.compatibilidades
        : [];

    // ============================================================
    // NORMALIZACIÓN
    // ============================================================

    function normalizar(texto) {

      return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    }

    function escaparRegex(texto) {

      return String(texto || "").replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    }

    function contienePalabra(texto, termino) {

      const t = normalizar(texto);

      const term = normalizar(termino);

      if (!t || !term) {
        return false;
      }

      const regex = new RegExp(
        `(^|\\s)${escaparRegex(term)}(?=\\s|$)`,
        "i"
      );

      return regex.test(t);

    }

    // ============================================================
    // NUEVO:
    // DETECTAR FRASES COMPLETAS POR TOKENS
    //
    // Evita que:
    //
    // "ns" coincida accidentalmente con otra cosa
    //
    // y permite reconocer:
    //
    // "gixxer 150 fi"
    // "pulsar ns 200"
    // "gixxer sf 250"
    // ============================================================

    function textoIncluyeFrase(textoBase, frase) {

      const base = normalizar(textoBase);

      const objetivo = normalizar(frase);

      if (!base || !objetivo) {
        return false;
      }

      const baseTokens =
        base.split(/\s+/).filter(Boolean);

      const objetivoTokens =
        objetivo.split(/\s+/).filter(Boolean);

      if (objetivoTokens.length === 0) {
        return false;
      }

      for (
        let i = 0;
        i <= baseTokens.length - objetivoTokens.length;
        i++
      ) {

        let coincide = true;

        for (
          let j = 0;
          j < objetivoTokens.length;
          j++
        ) {

          if (
            baseTokens[i + j] !==
            objetivoTokens[j]
          ) {

            coincide = false;
            break;

          }

        }

        if (coincide) {
          return true;
        }

      }

      return false;

    }

    function contiene(texto, lista) {

      return lista.some((item) =>
        contienePalabra(texto, item)
      );

    }

    function arraysCoinciden(
      requeridos,
      disponibles
    ) {

      if (
        !Array.isArray(requeridos) ||
        requeridos.length === 0
      ) {

        return true;

      }

      if (
        !Array.isArray(disponibles) ||
        disponibles.length === 0
      ) {

        return false;

      }

      return requeridos.some((requerido) =>
        disponibles.some(
          (disponible) =>
            normalizar(disponible) ===
            normalizar(requerido)
        )
      );

    }

    const texto = normalizar(message);

    // ============================================================
    // INTENCIONES
    // ============================================================

    const preguntaProducto =
      contiene(texto, [

        "producto",
        "productos",
        "aceite",
        "aceites",
        "lubricante",
        "lubricantes",
        "filtro",
        "filtros",
        "aditivo",
        "aditivos",
        "refrigerante",
        "refrigerantes",
        "grasa",
        "grasas",
        "liquido de frenos",
        "precio",
        "precios",
        "cuanto cuesta",
        "cuanto cuestan",
        "cuanto vale",
        "cuanto valen",
        "tienen",
        "disponibles",
        "disponible",
        "catalogo",
        "que venden",
        "que tienen",
        "venden"

      ]);

    const preguntaCompatibilidad =
      contiene(texto, [

        "sirve",
        "sirven",
        "compatible",
        "compatibilidad",
        "puedo usar",
        "puedo echar",
        "recomiend",
        "recomend",
        "aceite para mi",
        "aceite de mi"

      ]);

    // ============================================================
    // DETECTAR VEHÍCULOS DESDE vehiculos.json
    //
    // NO hay una lista fija de modelos.
    // Todo sale de vehiculos.json
    // ============================================================

    function obtenerTerminosVehiculo(vehiculo) {

      const terminos = [];

      if (vehiculo.marca) {
        terminos.push(vehiculo.marca);
      }

      if (vehiculo.modelo) {
        terminos.push(vehiculo.modelo);
      }

      if (vehiculo.familia) {
        terminos.push(vehiculo.familia);
      }

      if (
        Array.isArray(vehiculo.alias)
      ) {

        terminos.push(
          ...vehiculo.alias
        );

      }

      return [
        ...new Set(
          terminos
            .map(normalizar)
            .filter(Boolean)
        )
      ];

    }

    // ============================================================
    // PUNTUACIÓN DE VEHÍCULO
    //
    // Las coincidencias específicas pesan mucho más que
    // una marca o familia.
    // ============================================================

    function puntuacionVehiculo(vehiculo) {

      const marca =
        normalizar(
          vehiculo.marca
        );

      const modelo =
        normalizar(
          vehiculo.modelo
        );

      const familia =
        normalizar(
          vehiculo.familia
        );

      const aliases =
        Array.isArray(
          vehiculo.alias
        )
          ? vehiculo.alias
              .map(normalizar)
              .filter(Boolean)
          : [];

      let score = 0;

      const coincidencias = [];

      // ----------------------------------------------------------
      // MODELO EXACTO
      // ----------------------------------------------------------

      if (
        modelo &&
        textoIncluyeFrase(
          texto,
          modelo
        )
      ) {

        score += 1000;

        coincidencias.push({
          tipo: "modelo_exacto",
          valor: modelo,
          peso: 1000
        });

      }

      // ----------------------------------------------------------
      // MARCA + MODELO
      // ----------------------------------------------------------

      if (
        marca &&
        modelo &&
        textoIncluyeFrase(
          texto,
          `${marca} ${modelo}`
        )
      ) {

        score += 500;

        coincidencias.push({
          tipo: "marca_modelo",
          valor: `${marca} ${modelo}`,
          peso: 500
        });

      }

      // ----------------------------------------------------------
      // ALIAS
      // ----------------------------------------------------------

      for (
        const alias of aliases
      ) {

        if (!alias) {
          continue;
        }

        if (
          textoIncluyeFrase(
            texto,
            alias
          )
        ) {

          const cantidadPalabras =
            alias
              .split(/\s+/)
              .filter(Boolean)
              .length;

          let peso = 0;

          if (
            cantidadPalabras >= 3
          ) {

            peso = 800;

          } else if (
            cantidadPalabras === 2
          ) {

            peso = 600;

          } else {

            peso = 150;

          }

          score += peso;

          coincidencias.push({
            tipo: "alias",
            valor: alias,
            peso
          });

        }

      }

      // ----------------------------------------------------------
      // FAMILIA
      // ----------------------------------------------------------

      if (
        familia &&
        textoIncluyeFrase(
          texto,
          familia
        )
      ) {

        score += 100;

        coincidencias.push({
          tipo: "familia",
          valor: familia,
          peso: 100
        });

      }

      // ----------------------------------------------------------
      // MARCA SOLA
      //
      // Una marca sola NO debe escoger arbitrariamente
      // un modelo.
      // ----------------------------------------------------------

      if (
        marca &&
        contienePalabra(
          texto,
          marca
        )
      ) {

        score += 20;

        coincidencias.push({
          tipo: "marca",
          valor: marca,
          peso: 20
        });

      }

      return {
        score,
        coincidencias
      };

    }

    // ============================================================
    // GENERAR CANDIDATOS
    // ============================================================

    const candidatos = [];

    for (
      const vehiculo of vehiculos
    ) {

      const resultado =
        puntuacionVehiculo(
          vehiculo
        );

      if (
        resultado.score > 0
      ) {

        candidatos.push({
          vehiculo,
          score:
            resultado.score,
          coincidencias:
            resultado.coincidencias
        });

      }

    }

    candidatos.sort(
      (a, b) =>
        b.score - a.score
    );

    // ============================================================
    // VEHÍCULO GENÉRICO
    // ============================================================

    const mencionaTipoVehiculo =
      contiene(texto, [

        "carro",
        "carros",
        "auto",
        "autos",
        "automovil",
        "automoviles",
        "moto",
        "motos",
        "motocicleta",
        "motocicletas",
        "camion",
        "camiones",
        "camioneta",
        "camionetas",
        "vehiculo",
        "vehiculos"

      ]);

    // ============================================================
    // RESOLVER VEHÍCULO
    //
    // IMPORTANTE:
    //
    // Si una palabra corta como "ns" o "gixxer" aparece
    // en varias variantes, NO elegimos arbitrariamente.
    // ============================================================

    let vehiculosEncontrados = [];

    if (
      candidatos.length > 0
    ) {

      const mejor =
        candidatos[0];

      // ----------------------------------------------------------
      // DETECTAR CANDIDATOS CON COINCIDENCIA FUERTE
      // ----------------------------------------------------------

      const coincidenciasFuertes =
        candidatos.filter(
          (candidato) => {

            return candidato.coincidencias.some(
              (coincidencia) =>

                coincidencia.tipo ===
                  "modelo_exacto" ||

                coincidencia.tipo ===
                  "marca_modelo" ||

                coincidencia.tipo ===
                  "alias"

            );

          }
        );

      // ----------------------------------------------------------
      // SI HAY VARIOS VEHÍCULOS CON UNA COINCIDENCIA FUERTE
      // Y LAS PUNTUACIONES ESTÁN CERCANAS,
      // SE CONSIDERA AMBIGUO.
      // ----------------------------------------------------------

      if (
        coincidenciasFuertes.length > 1
      ) {

        const mejorFuerte =
          coincidenciasFuertes[0];

        const ambiguos =
          coincidenciasFuertes.filter(
            (candidato) => {

              const diferencia =
                mejorFuerte.score -
                candidato.score;

              return (
                candidato.score >= 100 &&
                diferencia < 250
              );

            }
          );

        if (
          ambiguos.length > 1
        ) {

          vehiculosEncontrados =
            ambiguos
              .slice(0, 8)
              .map(
                (candidato) =>
                  candidato.vehiculo
              );

        } else {

          vehiculosEncontrados = [
            mejorFuerte.vehiculo
          ];

        }

      } else {

        vehiculosEncontrados = [
          mejor.vehiculo
        ];

      }

    }

    // ============================================================
    // IMPORTANTE:
    //
    // SI SOLO SE MENCIONA UNA MARCA
    //
    // Honda → no escoger una Honda arbitrariamente.
    // Suzuki → no escoger una Suzuki arbitrariamente.
    // Toyota → no escoger una Toyota arbitrariamente.
    // ============================================================

    if (
      candidatos.length > 0
    ) {

      const mejores =
        candidatos.filter(
          (candidato) =>
            candidato.score >=
            candidatos[0].score - 10
        );

      const todosSonMarca =
        mejores.every(
          (candidato) =>
            candidato.coincidencias.length === 1 &&
            candidato.coincidencias[0].tipo ===
              "marca"
        );

      if (
        todosSonMarca &&
        mejores.length > 1
      ) {

        vehiculosEncontrados =
          mejores.map(
            (candidato) =>
              candidato.vehiculo
          );

      }

    }

    // ============================================================
    // SI SOLO SE MENCIONA UNA FAMILIA AMBIGUA
    //
    // Ejemplos:
    //
    // ns
    // gixxer
    // pulsar
    // ============================================================

    if (
      candidatos.length > 1 &&
      vehiculosEncontrados.length === 1
    ) {

      const unico =
        vehiculosEncontrados[0];

      const familiaUnico =
        normalizar(
          unico.familia
        );

      if (
        familiaUnico &&
        textoIncluyeFrase(
          texto,
          familiaUnico
        )
      ) {

        const candidatosFamilia =
          candidatos.filter(
            (candidato) => {

              const familia =
                normalizar(
                  candidato.vehiculo.familia
                );

              return (
                familia &&
                familia ===
                  familiaUnico
              );

            }
          );

        if (
          candidatosFamilia.length > 1
        ) {

          const mejorFamilia =
            candidatosFamilia[0];

          const diferenciaMaxima =
            250;

          const ambiguosFamilia =
            candidatosFamilia.filter(
              (candidato) => {

                return (
                  candidato.score >= 100 &&
                  (
                    mejorFamilia.score -
                    candidato.score
                  ) < diferenciaMaxima
                );

              }
            );

          if (
            ambiguosFamilia.length > 1
          ) {

            vehiculosEncontrados =
              ambiguosFamilia
                .slice(0, 8)
                .map(
                  (candidato) =>
                    candidato.vehiculo
                );

          }

        }

      }

    }

    // ============================================================
    // AMBIGÜEDAD
    // ============================================================

    if (
      vehiculosEncontrados.length > 1
    ) {

      const opciones =
        vehiculosEncontrados
          .slice(0, 10)
          .map(
            (vehiculo) =>
              `• ${vehiculo.marca} ${vehiculo.modelo}`
          )
          .join("\n");

      return jsonResponse(
        {
          ok: true,
          result: {
            choices: [
              {
                message: {
                  role: "assistant",
                  content:
                    `Encontré varias opciones y no quiero asumir cuál tienes.\n\n${opciones}\n\n¿Cuál es exactamente tu vehículo? Si puedes, indícame también el año.`
                }
              }
            ]
          }
        },
        200,
        corsHeaders
      );

    }

    // ============================================================
    // TIPO DE VEHÍCULO
    // ============================================================

    let tipoVehiculo = null;

    if (
      vehiculosEncontrados.length === 1
    ) {

      tipoVehiculo =
        vehiculosEncontrados[0].tipo ||
        null;

    }

    if (
      !tipoVehiculo &&
      contiene(texto, [
        "moto",
        "motos",
        "motocicleta",
        "motocicletas"
      ])
    ) {

      tipoVehiculo = "moto";

    }

    if (
      !tipoVehiculo &&
      contiene(texto, [
        "carro",
        "carros",
        "auto",
        "autos",
        "automovil",
        "automoviles"
      ])
    ) {

      tipoVehiculo = "carro";

    }

    if (
      !tipoVehiculo &&
      contiene(texto, [
        "camion",
        "camiones",
        "camioneta",
        "camionetas"
      ])
    ) {

      tipoVehiculo = "camion";

    }

    // ============================================================
    // PRODUCTOS MENCIONADOS
    // ============================================================

    const productosEncontrados =
      productos.filter(
        (producto) => {

          const nombre =
            normalizar(
              producto.nombre
            );

          const marca =
            normalizar(
              producto.marca
            );

          return (

            (
              nombre &&
              textoIncluyeFrase(
                texto,
                nombre
              )
            ) ||

            (
              marca &&
              contienePalabra(
                texto,
                marca
              )
            )

          );

        }
      );

    // ============================================================
    // CATÁLOGO GENERAL
    // ============================================================

    const consultaCatalogoGeneral =
      preguntaProducto &&
      vehiculosEncontrados.length === 0 &&
      !preguntaCompatibilidad &&
      !mencionaTipoVehiculo;

    if (
      consultaCatalogoGeneral
    ) {

      let listaProductos =
        productos.filter(
          (producto) =>
            producto.verificacion?.estado ===
            "verificado"
        );

      // ----------------------------------------------------------
      // TIPO DE VEHÍCULO
      // ----------------------------------------------------------

      if (
        tipoVehiculo
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>

              Array.isArray(
                producto.aplicaciones
              ) &&

              producto.aplicaciones.includes(
                tipoVehiculo
              )
          );

      }

      // ----------------------------------------------------------
      // MARCA DEL PRODUCTO
      // ----------------------------------------------------------

      const marcasMencionadas =
        [
          ...new Set(

            productos
              .map(
                (producto) =>
                  producto.marca
              )
              .filter(Boolean)
              .filter(
                (marca) =>
                  contienePalabra(
                    texto,
                    marca
                  )
              )

          )
        ];

      if (
        marcasMencionadas.length > 0
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              marcasMencionadas.some(
                (marca) =>
                  normalizar(
                    producto.marca
                  ) ===
                  normalizar(
                    marca
                  )
              )
          );

      }

      // ----------------------------------------------------------
      // CATEGORÍAS
      // ----------------------------------------------------------

      if (
        contiene(texto, [
          "aceite",
          "aceites"
        ])
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              String(
                producto.categoria || ""
              ).startsWith(
                "aceite"
              )
          );

      }

      if (
        contiene(texto, [
          "aditivo",
          "aditivos"
        ])
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              producto.categoria ===
              "aditivo"
          );

      }

      if (
        contiene(texto, [
          "refrigerante",
          "refrigerantes"
        ])
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              producto.categoria ===
              "refrigerante"
          );

      }

      if (
        contiene(texto, [
          "filtro",
          "filtros"
        ])
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              producto.categoria ===
              "filtro"
          );

      }

      if (
        contiene(texto, [
          "grasa",
          "grasas"
        ])
      ) {

        listaProductos =
          listaProductos.filter(
            (producto) =>
              producto.categoria ===
              "grasa"
          );

      }

      // ----------------------------------------------------------
      // SIN RESULTADOS
      // ----------------------------------------------------------

      if (
        listaProductos.length === 0
      ) {

        return jsonResponse(
          {
            ok: true,
            result: {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      "Actualmente no tengo productos verificados que coincidan con esa consulta."
                  }
                }
              ]
            }
          },
          200,
          corsHeaders
        );

      }

      // ----------------------------------------------------------
      // DATOS PARA IA
      // ----------------------------------------------------------

      const lista =
        listaProductos
          .slice(0, 20)
          .map(
            (producto) => ({

              id:
                producto.id,

              nombre:
                producto.nombre,

              marca:
                producto.marca,

              categoria:
                producto.categoria,

              aplicaciones:
                producto.aplicaciones,

              viscosidad:
                producto.viscosidad,

              tipo_motor:
                producto.tipo_motor,

              especificaciones:
                producto.especificaciones,

              precio:
                producto.precio,

              precio_mostrar:
                producto.precio_mostrar,

              presentacion:
                producto.presentacion

            })
          );

      const prompt = `

Eres el asistente oficial de VR Turbolub.

CATÁLOGO REAL:

${JSON.stringify(lista)}

PREGUNTA:

${message}

REGLAS:

- Utiliza únicamente productos presentes en CATÁLOGO REAL.
- Nunca inventes productos.
- Nunca inventes marcas.
- Nunca inventes precios.
- Nunca inventes especificaciones.
- Si precio_mostrar dice "Cotizar", indica "Cotizar".
- Si precio es numérico, utiliza exactamente ese precio.
- Si el cliente pregunta por una marca, muestra únicamente esa marca.
- Si pregunta por un tipo de vehículo, respeta las aplicaciones del catálogo.
- No afirmes compatibilidad específica con un vehículo.
- No menciones JSON ni programación.

Responde en español de forma natural y clara.

`;

      const result =
        await env.AI.run(
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [

              {
                role: "system",
                content:
                  "Eres el asistente comercial de VR Turbolub. Solo puedes utilizar la información proporcionada por el sistema."
              },

              {
                role: "user",
                content: prompt
              }

            ],

            max_tokens: 700

          }
        );

      return jsonResponse(
        {
          ok: true,
          result
        },
        200,
        corsHeaders
      );

    }

    // ============================================================
    // VEHÍCULO ESPECÍFICO
    // ============================================================

    if (
      vehiculosEncontrados.length === 1
    ) {

      const vehiculo =
        vehiculosEncontrados[0];

      const variantes =
        Array.isArray(
          vehiculo.variantes
        )
          ? vehiculo.variantes
          : [];

      if (
        variantes.length === 0
      ) {

        return jsonResponse(
          {
            ok: true,
            result: {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      `Tengo identificado ${vehiculo.marca} ${vehiculo.modelo}, pero todavía no hay información técnica verificada suficiente para este vehículo.`
                  }
                }
              ]
            }
          },
          200,
          corsHeaders
        );

      }

      // ==========================================================
      // AÑO
      // ==========================================================

      const aniosMencionados =
        [
          ...texto.matchAll(
            /\b(19\d{2}|20\d{2})\b/g
          )
        ].map(
          (match) =>
            Number(match[1])
        );

      let variante = null;

      // ----------------------------------------------------------
      // AÑO INDICADO
      // ----------------------------------------------------------

      if (
        aniosMencionados.length > 0
      ) {

        const anioSolicitado =
          aniosMencionados[0];

        variante =
          variantes.find(
            (v) =>

              Array.isArray(
                v.anios
              ) &&

              v.anios.includes(
                anioSolicitado
              )
          );

        if (
          !variante
        ) {

          return jsonResponse(
            {
              ok: true,
              result: {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content:
                        `No tengo una variante verificada de ${vehiculo.marca} ${vehiculo.modelo} para el año ${anioSolicitado}.`
                    }
                  }
                ]
              }
            },
            200,
            corsHeaders
          );

        }

      }

      // ----------------------------------------------------------
      // SIN AÑO
      // ----------------------------------------------------------

      else {

        if (
          variantes.length === 1
        ) {

          const unica =
            variantes[0];

          if (
            Array.isArray(
              unica.anios
            ) &&
            unica.anios.length === 0
          ) {

            variante =
              unica;

          } else {

            return jsonResponse(
              {
                ok: true,
                result: {
                  choices: [
                    {
                      message: {
                        role: "assistant",
                        content:
                          `Para verificar correctamente ${vehiculo.marca} ${vehiculo.modelo}, necesito el año exacto del vehículo.`
                      }
                    }
                  ]
                }
              },
              200,
              corsHeaders
            );

          }

        }

        if (
          variantes.length > 1
        ) {

          return jsonResponse(
            {
              ok: true,
              result: {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content:
                        `Para verificar correctamente ${vehiculo.marca} ${vehiculo.modelo}, necesito el año exacto del vehículo.`
                    }
                  }
                ]
              }
            },
            200,
            corsHeaders
          );

        }

      }

      // ==========================================================
      // NO HAY VARIANTE
      // ==========================================================

      if (
        !variante
      ) {

        return jsonResponse(
          {
            ok: true,
            result: {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      `Para verificar correctamente ${vehiculo.marca} ${vehiculo.modelo}, necesito más información sobre el año o versión.`
                  }
                }
              ]
            }
          },
          200,
          corsHeaders
        );

      }

      // ==========================================================
      // VERIFICACIÓN TÉCNICA
      // ==========================================================

      if (
        variante.estado_verificacion !==
        "verificado"
      ) {

        return jsonResponse(
          {
            ok: true,
            result: {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      `Tengo identificado ${vehiculo.marca} ${vehiculo.modelo}, pero la información técnica disponible todavía no está completamente verificada. Prefiero no recomendarte un producto sin poder confirmarlo.`
                  }
                }
              ]
            }
          },
          200,
          corsHeaders
        );

      }

      const motor =
        variante.motor || {};

      const aceiteMotor =
        variante.aceite_motor || {};

      const tipoMotor =
        motor.tipo || null;

      const viscosidades =
        Array.isArray(
          aceiteMotor.viscosidades
        )
          ? aceiteMotor.viscosidades
          : [];

      const apiRequerida =
        Array.isArray(
          aceiteMotor.api
        )
          ? aceiteMotor.api
          : [];

      const jasoRequerida =
        Array.isArray(
          aceiteMotor.jaso
        )
          ? aceiteMotor.jaso
          : [];

      // ==========================================================
      // COMPATIBILIDAD DETERMINÍSTICA
      // ==========================================================

      const compatibles = [];

      for (
        const producto of productos
      ) {

        if (
          producto.verificacion?.estado !==
          "verificado"
        ) {

          continue;

        }

        const aplicaciones =
          Array.isArray(
            producto.aplicaciones
          )
            ? producto.aplicaciones
            : [];

        // --------------------------------------------------------
        // TIPO DE VEHÍCULO
        // --------------------------------------------------------

        if (
          vehiculo.tipo &&
          !aplicaciones.includes(
            vehiculo.tipo
          )
        ) {

          continue;

        }

        // --------------------------------------------------------
        // TIPO DE MOTOR
        // --------------------------------------------------------

        if (
          tipoMotor &&
          producto.tipo_motor &&
          normalizar(
            tipoMotor
          ) !==
          normalizar(
            producto.tipo_motor
          )
        ) {

          continue;

        }

        if (
          tipoMotor &&
          !producto.tipo_motor &&
          (
            producto.categoria ===
              "aceite_motor" ||

            producto.categoria ===
              "aceite_2t"
          )
        ) {

          continue;

        }

        // --------------------------------------------------------
        // VISCOSIDAD
        // --------------------------------------------------------

        if (
          viscosidades.length > 0
        ) {

          if (
            !producto.viscosidad
          ) {

            continue;

          }

          const viscosidadValida =
            viscosidades.some(
              (viscosidad) =>

                normalizar(
                  viscosidad
                ) ===

                normalizar(
                  producto.viscosidad
                )
            );

          if (
            !viscosidadValida
          ) {

            continue;

          }

        }

        // --------------------------------------------------------
        // API
        // --------------------------------------------------------

        if (
          apiRequerida.length > 0
        ) {

          const specs =
            producto.especificaciones ||
            {};

          if (
            !arraysCoinciden(
              apiRequerida,
              specs.api
            )
          ) {

            continue;

          }

        }

        // --------------------------------------------------------
        // JASO
        // --------------------------------------------------------

        if (
          jasoRequerida.length > 0
        ) {

          const specs =
            producto.especificaciones ||
            {};

          if (
            !arraysCoinciden(
              jasoRequerida,
              specs.jaso
            )
          ) {

            continue;

          }

        }

        compatibles.push(
          producto
        );

      }

      // ==========================================================
      // COMPATIBILIDADES EXPLÍCITAS
      // ==========================================================

      const compatibilidadesVehiculo =
        compatibilidades.filter(
          (item) =>

            item.vehiculo_id ===
            vehiculo.id &&

            item.estado ===
            "verificado"
        );

      for (
        const compatibilidad
        of compatibilidadesVehiculo
      ) {

        const producto =
          productos.find(
            (p) =>
              p.id ===
              compatibilidad.producto_id
          );

        if (
          producto &&

          producto.verificacion?.estado ===
            "verificado" &&

          !compatibles.some(
            (p) =>
              p.id ===
              producto.id
          )
        ) {

          compatibles.push(
            producto
          );

        }

      }

      // ==========================================================
      // PREPARAR DATOS
      // ==========================================================

      const datosVehiculo = {

        id:
          vehiculo.id,

        marca:
          vehiculo.marca,

        modelo:
          vehiculo.modelo,

        tipo:
          vehiculo.tipo,

        variante_id:
          variante.id,

        anios:
          variante.anios,

        motor,

        aceite_motor:
          aceiteMotor

      };

      const datosProductos =
        compatibles
          .slice(0, 10)
          .map(
            (producto) => ({

              id:
                producto.id,

              nombre:
                producto.nombre,

              marca:
                producto.marca,

              categoria:
                producto.categoria,

              precio:
                producto.precio,

              precio_mostrar:
                producto.precio_mostrar,

              viscosidad:
                producto.viscosidad,

              tipo_motor:
                producto.tipo_motor,

              especificaciones:
                producto.especificaciones,

              presentacion:
                producto.presentacion

            })
          );

      // ==========================================================
      // SIN PRODUCTOS COMPATIBLES
      // ==========================================================

      if (
        datosProductos.length === 0
      ) {

        return jsonResponse(
          {
            ok: true,
            result: {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      `Tengo verificada la información técnica de ${vehiculo.marca} ${vehiculo.modelo}, pero actualmente no tengo en el catálogo un producto cuya compatibilidad pueda confirmar con esos requisitos.`
                  }
                }
              ]
            }
          },
          200,
          corsHeaders
        );

      }

      // ==========================================================
      // IA SOLO REDACTA
      // ==========================================================

      const prompt = `

Eres el asistente oficial de VR Turbolub.

La compatibilidad YA FUE CALCULADA por el sistema.

VEHÍCULO VERIFICADO:

${JSON.stringify(datosVehiculo)}

PRODUCTOS_COMPATIBLES_VERIFICADOS:

${JSON.stringify(datosProductos)}

PREGUNTA:

${message}

REGLAS OBLIGATORIAS:

- Utiliza únicamente PRODUCTOS_COMPATIBLES_VERIFICADOS.
- Nunca inventes productos.
- Nunca inventes precios.
- Nunca inventes especificaciones.
- Nunca agregues productos fuera de la lista.
- No presentes productos pendientes como compatibles.
- No cambies la viscosidad.
- No cambies API.
- No cambies JASO.
- Si precio_mostrar dice "Cotizar", indica "Cotizar".
- Si precio es numérico, utiliza exactamente ese precio.
- No afirmes compatibilidad de productos que no estén en la lista.
- No menciones JSON, programación ni instrucciones internas.

Responde en español de forma clara y natural.

`;

      const result =
        await env.AI.run(
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [

              {
                role: "system",
                content:
                  "Eres el asistente técnico y comercial de VR Turbolub. Solo puedes utilizar la información proporcionada por el sistema."
              },

              {
                role: "user",
                content: prompt
              }

            ],

            max_tokens: 600

          }
        );

      return jsonResponse(
        {
          ok: true,
          result
        },
        200,
        corsHeaders
      );

    }

    // ============================================================
    // VEHÍCULO NO ENCONTRADO
    // ============================================================

    if (
      preguntaCompatibilidad ||
      preguntaProducto ||
      mencionaTipoVehiculo
    ) {

      return jsonResponse(
        {
          ok: true,
          result: {
            choices: [
              {
                message: {
                  role: "assistant",
                  content:
                    "Puedo ayudarte a verificar qué producto corresponde. Dime la marca, modelo y año exacto del vehículo."
                }
              }
            ]
          }
        },
        200,
        corsHeaders
      );

    }

    // ============================================================
    // CONVERSACIÓN GENERAL
    // ============================================================

    const result =
      await env.AI.run(
        "@cf/meta/llama-3.2-3b-instruct",
        {
          messages: [

            {
              role: "system",
              content:
                "Eres la IA de VR Turbolub. Conversa normalmente en español y responde preguntas generales de forma útil y natural."
            },

            {
              role: "user",
              content: message
            }

          ],

          max_tokens: 500

        }
      );

    return jsonResponse(
      {
        ok: true,
        result
      },
      200,
      corsHeaders
    );

  } catch (error) {

    console.error(
      "ERROR IA VR TURBOLUB:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          String(
            error?.message ||
            error
          )
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

