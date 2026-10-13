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
// POST /admin/login
// --------------------------------------------------------

if (
  request.method === "POST" &&
  url.pathname === "/admin/login"
) {
  return adminLogin(
    request,
    env,
    corsHeaders
  );
}
// --------------------------------------------------------
// GET /admin/productos
// --------------------------------------------------------

if (
  request.method === "GET" &&
  url.pathname === "/admin/productos"
) {
  return obtenerProductosAdmin(
    request,
    env,
    corsHeaders
  );
}

// --------------------------------------------------------
// GET /admin/pedidos
// Obtener pedidos con sus productos
// --------------------------------------------------------

if (
  request.method === "GET" &&
  url.pathname === "/admin/pedidos"
) {

  return obtenerPedidosAdmin(
    request,
    env,
    corsHeaders
  );

}
// --------------------------------------------------------
// GET /admin/pedidos/:id/comprobante
// Obtener URL temporal del comprobante
// --------------------------------------------------------

if (
  request.method === "GET" &&
  /^\/admin\/pedidos\/[^/]+\/comprobante$/.test(url.pathname)
) {

  const parts =
    url.pathname.split("/");

  const orderId =
    decodeURIComponent(parts[3]);

  return obtenerComprobantePedido(
    request,
    env,
    corsHeaders,
    orderId
  );
}
// --------------------------------------------------------
// PUT /admin/productos/:id
// --------------------------------------------------------

if (
  request.method === "PUT" &&
  url.pathname.startsWith("/admin/productos/")
) {
  const id = url.pathname.split("/").pop();

  return editarProducto(
    request,
    env,
    corsHeaders,
    id
  );
}
// =========================================================
// ACTUALIZAR ESTADO DE PEDIDO
// =========================================================

if (
  request.method === "PUT" &&
  url.pathname.startsWith("/admin/pedidos/")
) {
  const orderId =
    decodeURIComponent(
      url.pathname.replace(
        "/admin/pedidos/",
        ""
      )
    );

  return actualizarEstadoPedido(
    request,
    env,
    corsHeaders,
    orderId
  );
}
// --------------------------------------------------------
// DELETE /admin/productos/:id
// --------------------------------------------------------

if (
  request.method === "DELETE" &&
  url.pathname.startsWith("/admin/productos/")
) {
  const id = url.pathname.split("/").pop();

  return eliminarProducto(
    request,
    env,
    corsHeaders,
    id
  );
}
// --------------------------------------------------------
// POST /admin/productos
// Crear producto
// --------------------------------------------------------

if (
  request.method === "POST" &&
  url.pathname === "/admin/productos"
) {
  return crearProducto(
    request,
    env,
    corsHeaders
  );
}

    // --------------------------------------------------------
    // GET /productos
    // Catálogo público desde D1
    // --------------------------------------------------------

    if (
      request.method === "GET" &&
      url.pathname === "/productos"
    ) {
      try {
        const result = await env.DB
          .prepare(`
            SELECT
              id,
              name,
              description,
              category,
              vehicle,
              brand,
              viscosity,
              engine_type,
              api,
              jaso,
              presentation,
              price,
              price_min,
              price_max,
              image,
              slug,
              technical_data
            FROM products
            WHERE active = 1
            ORDER BY id ASC
          `)
          .all();

        return jsonResponse(
          {
            ok: true,
            products: result.results || []
          },
          200,
          corsHeaders
        );

      } catch (error) {
        console.error("Error obteniendo productos:", error);

        return jsonResponse(
          {
            ok: false,
            error: "No se pudieron obtener los productos"
          },
          500,
          corsHeaders
        );
      }
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
// OBTENER PEDIDOS ADMIN
// ============================================================

async function obtenerPedidosAdmin(
  request,
  env,
  corsHeaders
) {

  try {

    // --------------------------------------------------------
    // VERIFICAR TOKEN DE ADMIN
    // --------------------------------------------------------

    const autorizado =
      await verifyAdminToken(
        request,
        env
      );

    if (!autorizado) {

      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // OBTENER PEDIDOS
    // --------------------------------------------------------

    const pedidosResult =
      await env.DB
        .prepare(`
          SELECT
            id,
            customer_name,
            customer_last_name,
            customer_phone,
            customer_email,
            address,
            city,
            department,
            notes,
            payment_method,
            payment_method_name,
            subtotal,
            shipping,
            total,
            status,
            receipt_name,
            receipt_type,
            receipt_size,
            receipt_file_id,
            created_at,
            updated_at
          FROM orders
          ORDER BY datetime(created_at) DESC
        `)
        .all();

    const pedidos =
      pedidosResult.results || [];

    // --------------------------------------------------------
    // OBTENER PRODUCTOS DE LOS PEDIDOS
    // --------------------------------------------------------

    const itemsResult =
      await env.DB
        .prepare(`
          SELECT
            id,
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal
          FROM order_items
          ORDER BY id ASC
        `)
        .all();

    const items =
      itemsResult.results || [];

    // --------------------------------------------------------
    // AGRUPAR PRODUCTOS POR PEDIDO
    // --------------------------------------------------------

    const itemsPorPedido = {};

    for (const item of items) {

      if (!itemsPorPedido[item.order_id]) {

        itemsPorPedido[item.order_id] = [];

      }

      itemsPorPedido[item.order_id].push(item);

    }

    // --------------------------------------------------------
    // UNIR PEDIDOS + PRODUCTOS
    // --------------------------------------------------------

    const pedidosCompletos =
      pedidos.map((pedido) => {

        return {

          ...pedido,

          products:
            itemsPorPedido[pedido.id] || []

        };

      });

    // --------------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------------

    return jsonResponse(
      {
        ok: true,
        orders: pedidosCompletos
      },
      200,
      corsHeaders
    );

  } catch (error) {

    console.error(
      "Error obteniendo pedidos admin:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "No se pudieron obtener los pedidos"
      },
      500,
      corsHeaders
    );

  }

}

// ============================================================
// OBTENER COMPROBANTE DE PEDIDO
// ============================================================

async function obtenerComprobantePedido(
  request,
  env,
  corsHeaders,
  orderId
) {

  try {

    // --------------------------------------------------------
    // VERIFICAR TOKEN DE ADMIN
    // --------------------------------------------------------

    const autorizado =
      await verifyAdminToken(
        request,
        env
      );

    if (!autorizado) {

      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // BUSCAR COMPROBANTE EN D1
    // --------------------------------------------------------

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            receipt_file_id,
            receipt_type
          FROM orders
          WHERE id = ?
          LIMIT 1
        `)
        .bind(orderId)
        .first();

    if (!result) {

      return jsonResponse(
        {
          ok: false,
          error: "Pedido no encontrado."
        },
        404,
        corsHeaders
      );

    }

    if (!result.receipt_file_id) {

      return jsonResponse(
        {
          ok: false,
          error: "Este pedido no tiene comprobante."
        },
        404,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // PEDIR URL FIRMADA A HUBSPOT
    // --------------------------------------------------------

    const response =
      await fetch(
        `${HUBSPOT_API}/files/v3/files/${encodeURIComponent(
          result.receipt_file_id
        )}/signed-url`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${env.HUBSPOT_TOKEN}`
          }
        }
      );

    const data =
      await safeJson(response);

    if (!response.ok) {

      console.error(
        "Error obteniendo URL firmada de HubSpot:",
        data
      );

      return jsonResponse(
        {
          ok: false,
          error:
            data?.message ||
            "HubSpot no pudo generar el enlace del comprobante."
        },
        502,
        corsHeaders
      );

    }

    if (!data?.url) {

      console.error(
        "HubSpot no devolvió URL firmada:",
        data
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "HubSpot no devolvió un enlace válido."
        },
        502,
        corsHeaders
      );

    }

    // --------------------------------------------------------
    // DEVOLVER URL TEMPORAL
    // --------------------------------------------------------

    return jsonResponse(
      {
        ok: true,
        url: data.url,
        type:
          result.receipt_type || null
      },
      200,
      corsHeaders
    );

  } catch (error) {

    console.error(
      "Error obteniendo comprobante:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "No se pudo obtener el comprobante."
      },
      500,
      corsHeaders
    );

  }
}
// =========================================================
// ACTUALIZAR ESTADO DE PEDIDO
// =========================================================

async function actualizarEstadoPedido(
  request,
  env,
  corsHeaders,
  orderId
) {

  try {

    // -----------------------------------------
    // AUTENTICACIÓN
    // -----------------------------------------

    const autorizado =
      await verifyAdminToken(
        request,
        env
      );

    if (!autorizado) {

      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );

    }


    // -----------------------------------------
    // VALIDAR ID
    // -----------------------------------------

    if (!orderId) {

      return jsonResponse(
        {
          ok: false,
          error: "ID de pedido requerido"
        },
        400,
        corsHeaders
      );

    }


    // -----------------------------------------
    // LEER BODY
    // -----------------------------------------

    const body =
      await request.json();


    const status =
      String(
        body.status || ""
      )
        .trim()
        .toLowerCase();


    // -----------------------------------------
    // ESTADOS PERMITIDOS
    // -----------------------------------------

    const validStatuses = [
      "pendiente",
      "confirmado",
      "enviado",
      "entregado",
      "cancelado"
    ];


    if (
      !validStatuses.includes(
        status
      )
    ) {

      return jsonResponse(
        {
          ok: false,
          error:
            "Estado de pedido inválido"
        },
        400,
        corsHeaders
      );

    }


    // -----------------------------------------
    // ACTUALIZAR D1
    // -----------------------------------------

    const result =
      await env.DB
        .prepare(`
          UPDATE orders
          SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          status,
          orderId
        )
        .run();


    // -----------------------------------------
    // VERIFICAR QUE EXISTE
    // -----------------------------------------

    if (
      !result.meta ||
      result.meta.changes === 0
    ) {

      return jsonResponse(
        {
          ok: false,
          error:
            "No se encontró el pedido"
        },
        404,
        corsHeaders
      );

    }


    // -----------------------------------------
    // RESPUESTA
    // -----------------------------------------

    return jsonResponse(
      {
        ok: true,
        message:
          "Estado del pedido actualizado",
        orderId,
        status
      },
      200,
      corsHeaders
    );


  } catch (error) {

    console.error(
      "Error actualizando estado del pedido:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error:
          "No se pudo actualizar el estado del pedido"
      },
      500,
      corsHeaders
    );

  }

}
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
    // ========================================================
    // 0. GUARDAR PEDIDO EN D1
    // ========================================================

    try {

      // ------------------------------------------------------
      // Insertar pedido
      // ------------------------------------------------------

      await env.DB
        .prepare(`
          INSERT INTO orders (
            id,
            customer_name,
            customer_last_name,
            customer_phone,
            customer_email,
            address,
            city,
            department,
            notes,
            payment_method,
            payment_method_name,
            subtotal,
            shipping,
            total,
            status,
            receipt_name,
            receipt_type,
            receipt_size
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          order.id,
          customer.name,
          customer.lastName || null,
          customer.phone,
          customer.email || null,
          customer.address || null,
          customer.city || null,
          customer.department || null,
          customer.notes || null,
          paymentMethod,
          paymentName,
          subtotal,
          shipping,
          total,
          "pendiente",
          validatedReceipt?.name || null,
          validatedReceipt?.type || null,
          validatedReceipt?.size || null
        )
        .run();


      // ------------------------------------------------------
      // Insertar productos del pedido
      // ------------------------------------------------------

      for (const product of order.products) {

        const productId =
          product.productId ||
          product.id ||
          null;

        const productName =
          String(
            product.name || "Producto"
          );

        const quantity =
          Number(product.quantity) || 0;

        const unitPrice =
          Number(product.price) || 0;

        const productSubtotal =
          unitPrice * quantity;


        await env.DB
          .prepare(`
            INSERT INTO order_items (
              order_id,
              product_id,
              product_name,
              quantity,
              unit_price,
              subtotal
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            order.id,
            productId,
            productName,
            quantity,
            unitPrice,
            productSubtotal
          )
          .run();
      }


      console.log(
        `Pedido ${order.id} guardado correctamente en D1`
      );

    } catch (d1Error) {

      console.error(
        "Error guardando pedido en D1:",
        d1Error
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "No se pudo guardar el pedido en la base de datos."
        },
        500,
        corsHeaders
      );
    }

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

          // Guardar el ID del archivo de HubSpot en D1
          try {
            await env.DB
              .prepare(`
                UPDATE orders
                SET
                  receipt_file_id = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `)
              .bind(
                String(fileId),
                order.id
              )
              .run();

          } catch (dbError) {
            console.error(
              "Error guardando receipt_file_id en D1:",
              dbError
            );
          }

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
    data: customerData,
    recipient: customerEmail,
    from: "VR Turbolub <onboarding@resend.dev>",
    subject: `Confirmación de pedido VR Turbolub #${order.id}`
  };

  console.log(
    "=========================================="
  );

  console.log(
    "VR TURBOLUB - EMAIL CLIENTE"
  );

  console.log(
    "Destinatario:",
    customerEmail
  );

  console.log(
    "Resend HTTP:",
    customerResponse.status
  );

  console.log(
    "Resend respuesta:",
    customerData
  );

  console.log(
    "=========================================="
  );

} else {
  console.error(
    "Error enviando confirmación al cliente:",
    customerData
  );

  emailResult.customerResponse = {
    status: customerResponse.status,
    data: customerData,
    recipient: customerEmail,
    from: "VR Turbolub <onboarding@resend.dev>",
    subject: `Confirmación de pedido VR Turbolub #${order.id}`
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

async function responderIA(request, env, corsHeaders) {
  try {
    const body = await request.json();

    const message = String(
      body?.message || ""
    ).trim();

    const history = Array.isArray(body?.history)
      ? body.history
      : [];

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
      const url = new URL(
        ruta,
        request.url
      );

      const response =
        await env.ASSETS.fetch(
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
      const base = normalizar(texto);
      const objetivo = normalizar(termino);

      if (!base || !objetivo) {
        return false;
      }

      const regex = new RegExp(
        `(^|\\s)${escaparRegex(objetivo)}(?=\\s|$)`,
        "i"
      );

      return regex.test(base);
    }

    function textoIncluyeFrase(
      textoBase,
      frase
    ) {
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
        i <=
        baseTokens.length -
          objetivoTokens.length;
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
      return lista.some(
        (item) =>
          contienePalabra(
            texto,
            item
          )
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

      return requeridos.some(
        (requerido) =>
          disponibles.some(
            (disponible) =>
              normalizar(disponible) ===
              normalizar(requerido)
          )
      );
    }

    // ============================================================
    // HISTORIAL
    // ============================================================

    const historialValido =
      history
        .filter(
          (item) =>
            item &&
            (
              item.role === "user" ||
              item.role === "assistant"
            ) &&
            typeof item.content === "string"
        )
        .slice(-20);

    const mensajesUsuario =
      historialValido
        .filter(
          (item) =>
            item.role === "user"
        )
        .map(
          (item) =>
            String(item.content || "").trim()
        )
        .filter(Boolean);

    /*
      El frontend ya agrega el mensaje actual
      al historial antes de llamar al Worker.

      Por seguridad, si no estuviera presente,
      lo agregamos.
    */

    const ultimoMensajeHistorial =
      mensajesUsuario[
        mensajesUsuario.length - 1
      ] || "";

    if (
      normalizar(
        ultimoMensajeHistorial
      ) !== normalizar(message)
    ) {
      mensajesUsuario.push(message);
    }

    /*
      Solo usamos las últimas conversaciones
      para recuperar contexto estructurado.

      No utilizamos respuestas anteriores de la IA
      para inventar datos técnicos.
    */

    const contextoUsuario =
      mensajesUsuario
        .slice(-8)
        .join(" ");

    const texto =
      normalizar(message);

    const textoContexto =
      normalizar(contextoUsuario);

    // ============================================================
    // AÑO
    // ============================================================

    function extraerAnios(textoBase) {
      return [
        ...normalizar(textoBase).matchAll(
          /\b(19\d{2}|20\d{2})\b/g
        )
      ].map(
        (match) =>
          Number(match[1])
      );
    }

    const aniosMensaje =
      extraerAnios(message);

    const aniosContexto =
      extraerAnios(contextoUsuario);

    /*
      Primero tiene prioridad el año del mensaje actual.
      Si el usuario escribe solamente "2026" después
      de preguntar por un vehículo, usamos ese año.
    */

    const anioActual =
      aniosMensaje.length > 0
        ? aniosMensaje[0]
        : null;

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
        "aceite de mi",
        "que aceite",
        "qué aceite"
      ]);

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
    // DETECTAR VEHÍCULOS
    // ============================================================

    function compactar(texto) {
      return normalizar(texto)
        .replace(/\s+/g, "");
    }

    function contieneFraseFlexible(
      textoBase,
      frase
    ) {
      const base =
        normalizar(textoBase);

      const objetivo =
        normalizar(frase);

      if (!base || !objetivo) {
        return false;
      }

      // Coincidencia normal
      if (
        textoIncluyeFrase(
          base,
          objetivo
        )
      ) {
        return true;
      }

      /*
        Permite reconocer:

        ns 125 → ns125
        ns 200 → ns200
        gixxer 150 → gixxer150

        pero únicamente para frases
        específicas de 2 o más tokens.
      */

      const tokens =
        objetivo
          .split(/\s+/)
          .filter(Boolean);

      if (tokens.length < 2) {
        return false;
      }

      const baseCompacta =
        compactar(base);

      const objetivoCompacto =
        compactar(objetivo);

      return (
        objetivoCompacto.length >= 4 &&
        baseCompacta.includes(
          objetivoCompacto
        )
      );
    }

    function obtenerAliases(
      vehiculo
    ) {
      const aliases =
        Array.isArray(
          vehiculo.alias
        )
          ? vehiculo.alias
          : [];

      return [
        ...new Set(
          aliases
            .map(normalizar)
            .filter(Boolean)
        )
      ];
    }

    function puntuacionVehiculo(
      vehiculo,
      textoBusqueda
    ) {
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
        obtenerAliases(
          vehiculo
        );

      let score = 0;

      const coincidencias = [];

      // ----------------------------------------------------------
      // MODELO
      // ----------------------------------------------------------

      if (
        modelo &&
        contieneFraseFlexible(
          textoBusqueda,
          modelo
        )
      ) {
        score += 1200;

        coincidencias.push({
          tipo: "modelo_exacto",
          valor: modelo,
          peso: 1200,
          especifica: true
        });
      }

      // ----------------------------------------------------------
      // MARCA + MODELO
      // ----------------------------------------------------------

      if (
        marca &&
        modelo &&
        contieneFraseFlexible(
          textoBusqueda,
          `${marca} ${modelo}`
        )
      ) {
        score += 1000;

        coincidencias.push({
          tipo: "marca_modelo",
          valor:
            `${marca} ${modelo}`,
          peso: 1000,
          especifica: true
        });
      }

      // ----------------------------------------------------------
      // ALIASES
      // ----------------------------------------------------------

      for (
        const alias of aliases
      ) {
        if (!alias) {
          continue;
        }

        const tokens =
          alias
            .split(/\s+/)
            .filter(Boolean);

        const cantidad =
          tokens.length;

        if (
          !contieneFraseFlexible(
            textoBusqueda,
            alias
          )
        ) {
          continue;
        }

        /*
          Un alias de una sola palabra puede ser
          genérico:

          ns
          gixxer
          boxer
          pulsar

          Por eso pesa mucho menos.

          Los alias específicos:

          ns125
          ns 125
          pulsar ns125

          tienen prioridad.
        */

        let peso = 0;

        if (
          cantidad >= 3
        ) {
          peso = 900;
        } else if (
          cantidad === 2
        ) {
          peso = 700;
        } else {
          peso = 100;
        }

        score += peso;

        coincidencias.push({
          tipo: "alias",
          valor: alias,
          peso,
          especifica:
            cantidad >= 2
        });
      }

      // ----------------------------------------------------------
      // FAMILIA
      // ----------------------------------------------------------

      if (
        familia &&
        contieneFraseFlexible(
          textoBusqueda,
          familia
        )
      ) {
        score += 100;

        coincidencias.push({
          tipo: "familia",
          valor: familia,
          peso: 100,
          especifica: false
        });
      }

      // ----------------------------------------------------------
      // MARCA SOLA
      // ----------------------------------------------------------

      if (
        marca &&
        contienePalabra(
          textoBusqueda,
          marca
        )
      ) {
        score += 20;

        coincidencias.push({
          tipo: "marca",
          valor: marca,
          peso: 20,
          especifica: false
        });
      }

      return {
        score,
        coincidencias
      };
    }

    // ============================================================
    // PRIMERO BUSCAMOS EN EL MENSAJE ACTUAL
    // ============================================================

    function encontrarCandidatos(
      textoBusqueda
    ) {
      const candidatos = [];

      for (
        const vehiculo of vehiculos
      ) {
        const resultado =
          puntuacionVehiculo(
            vehiculo,
            textoBusqueda
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

      return candidatos;
    }

    let candidatos =
      encontrarCandidatos(
        texto
      );

    // ============================================================
    // CONTEXTO DE VEHÍCULO
    // ============================================================

    /*
      Si el mensaje actual no identifica vehículo,
      buscamos un vehículo reciente en la conversación.

      Esto permite:

      "NS200"
      "¿de qué año?"

      y:

      "Yamaha FZ150"
      "2022"
    */

    let candidatosContexto = [];

    if (
      candidatos.length === 0
    ) {
      candidatosContexto =
        encontrarCandidatos(
          textoContexto
        );
    }

    /*
      Si el mensaje actual es corto o es solamente
      un año, el contexto anterior tiene prioridad.
    */

    const mensajeEsSoloAnio =
      /^\s*(19\d{2}|20\d{2})\s*$/.test(
        message
      );

    const mensajeEsSeguimiento =
      mensajeEsSoloAnio ||
      contiene(texto, [
        "ese",
        "esa",
        "ese mismo",
        "el mismo",
        "la misma",
        "mi moto",
        "mi carro",
        "mi camion",
        "mi vehiculo",
        "ese vehiculo",
        "y ese",
        "y esa"
      ]);

    if (
      candidatos.length === 0 &&
      candidatosContexto.length > 0
    ) {
      candidatos =
        candidatosContexto;
    }

    // ============================================================
    // ELIMINAR COINCIDENCIAS GENÉRICAS CUANDO EXISTE UNA ESPECÍFICA
    // ============================================================

    if (
      candidatos.length > 1
    ) {
      const tieneEspecifica =
        candidatos.some(
          (candidato) =>
            candidato.coincidencias.some(
              (coincidencia) =>
                coincidencia.especifica === true
            )
        );

      if (tieneEspecifica) {
        candidatos =
          candidatos.filter(
            (candidato) =>
              candidato.coincidencias.some(
                (coincidencia) =>
                  coincidencia.especifica === true
              )
          );
      }
    }

    // ============================================================
    // RESOLVER VEHÍCULO
    // ============================================================

    let vehiculosEncontrados = [];

    if (
      candidatos.length > 0
    ) {
      const mejor =
        candidatos[0];

      const especificos =
        candidatos.filter(
          (candidato) =>
            candidato.coincidencias.some(
              (coincidencia) =>
                coincidencia.especifica === true
            )
        );

      /*
        Si hay coincidencias específicas,
        solamente comparamos esas.
      */

      const grupo =
        especificos.length > 0
          ? especificos
          : candidatos;

      const mejorGrupo =
        grupo[0];

      const ambiguos =
        grupo.filter(
          (candidato) =>
            (
              mejorGrupo.score -
              candidato.score
            ) < 250
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
          mejorGrupo.vehiculo
        ];
      }
    }

    // ============================================================
    // SI EL MENSAJE ES SOLO UN AÑO,
    // DEBE HABER CONTEXTO PREVIO
    // ============================================================

    if (
      mensajeEsSoloAnio &&
      candidatosContexto.length > 0
    ) {
      const especificos =
        candidatosContexto.filter(
          (candidato) =>
            candidato.coincidencias.some(
              (coincidencia) =>
                coincidencia.especifica === true
            )
        );

      const grupo =
        especificos.length > 0
          ? especificos
          : candidatosContexto;

      if (
        grupo.length === 1
      ) {
        vehiculosEncontrados = [
          grupo[0].vehiculo
        ];
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
          .slice(0, 8)
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
        "camiones"
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
      // TIPO VEHÍCULO
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
      // MARCA
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
Eres el asistente comercial oficial de VR Turbolub.

CATÁLOGO REAL Y VERIFICADO:

${JSON.stringify(lista)}

PREGUNTA DEL CLIENTE:

${message}

REGLAS OBLIGATORIAS:

- Utiliza únicamente productos presentes en CATÁLOGO REAL.
- Nunca inventes productos.
- Nunca inventes marcas.
- Nunca inventes precios.
- Nunca inventes especificaciones.
- Nunca inventes disponibilidad.
- Si precio_mostrar dice "Cotizar", indica "Cotizar".
- Si precio es numérico, utiliza exactamente ese precio.
- Si el cliente pregunta por una marca, muestra únicamente productos de esa marca.
- Si pregunta por un tipo de vehículo, respeta exclusivamente las aplicaciones del catálogo.
- No afirmes compatibilidad específica con un vehículo en esta sección.
- No presentes productos pendientes de verificación como verificados.
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

      let variante = null;

      /*
        Año del mensaje actual primero.
        Si no existe, utilizamos el año del contexto
        cuando el mensaje es un seguimiento.
      */

      let anioSolicitado =
        anioActual;

      if (
        !anioSolicitado &&
        mensajeEsSeguimiento &&
        aniosContexto.length > 0
      ) {
        anioSolicitado =
          aniosContexto[
            aniosContexto.length - 1
          ];
      }

      if (
        anioSolicitado
      ) {
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
      } else {
        // --------------------------------------------------------
        // SIN AÑO
        // --------------------------------------------------------

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
        // TIPO MOTOR
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
        const compatibilidad of
          compatibilidadesVehiculo
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
Eres el asistente técnico y comercial oficial de VR Turbolub.

La compatibilidad YA FUE CALCULADA por el sistema.

VEHÍCULO VERIFICADO:

${JSON.stringify(datosVehiculo)}

PRODUCTOS COMPATIBLES VERIFICADOS:

${JSON.stringify(datosProductos)}

PREGUNTA DEL CLIENTE:

${message}

REGLAS OBLIGATORIAS:

- Utiliza únicamente PRODUCTOS COMPATIBLES VERIFICADOS.
- Nunca inventes productos.
- Nunca inventes precios.
- Nunca inventes especificaciones.
- Nunca agregues productos fuera de la lista.
- Nunca presentes productos pendientes como compatibles.
- No cambies la viscosidad.
- No cambies API.
- No cambies JASO.
- Si precio_mostrar dice "Cotizar", indica "Cotizar".
- Si precio es numérico, utiliza exactamente ese precio.
- No afirmes compatibilidad de productos que no estén en la lista.
- No inventes equivalencias técnicas.
- No supongas que una especificación superior o diferente es compatible.
- No menciones JSON, programación ni instrucciones internas.

Responde en español de forma clara, natural y útil.
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
    // CONVERSACIÓN GENERAL CON MEMORIA
    // ============================================================

    const mensajesIA = [
      {
        role: "system",
        content:
          `Eres VR, el asistente virtual de VR Turbolub.

Conversas normalmente en español.

Debes mantener el contexto de la conversación y utilizar los mensajes anteriores para entender referencias como:
- "ese"
- "esa"
- "el mismo"
- "la misma"
- "quien lo gano"
- "¿y en 2022?"
- "¿y el siguiente?"
- "¿cuál fue?"
- "¿qué pasó después?"

Si una pregunta depende de información mencionada anteriormente, utiliza ese contexto.

No inventes que el usuario dijo algo que no aparece en la conversación.

Si la conversación cambia de tema, sigue el nuevo tema.

Para preguntas generales puedes responder normalmente.

Para preguntas técnicas de VR Turbolub sobre vehículos, productos o compatibilidad, el sistema estructurado se encarga de verificar los datos.
`
      }
    ];

    /*
      Enviamos el historial real de la conversación.

      El mensaje actual ya suele estar dentro del historial
      porque script.js lo agrega antes de llamar al Worker.

      Si no está, lo añadimos.
    */

    for (
      const item of historialValido
    ) {
      mensajesIA.push({
        role:
          item.role,
        content:
          item.content
      });
    }

    if (
      mensajesIA[
        mensajesIA.length - 1
      ]?.role !== "user" ||
      normalizar(
        mensajesIA[
          mensajesIA.length - 1
        ]?.content
      ) !==
      normalizar(message)
    ) {
      mensajesIA.push({
        role: "user",
        content: message
      });
    }

    const result =
      await env.AI.run(
        "@cf/meta/llama-3.2-3b-instruct",
        {
          messages:
            mensajesIA,
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

// ============================================================
// AUTENTICACIÓN ADMIN
// ============================================================

async function adminLogin(request, env, corsHeaders) {
  try {
    const body = await request.json();

    const password = String(body.password || "");

    if (!password) {
      return jsonResponse(
        {
          ok: false,
          error: "Contraseña requerida"
        },
        400,
        corsHeaders
      );
    }

    if (!env.ADMIN_PASSWORD) {
      return jsonResponse(
        {
          ok: false,
          error: "ADMIN_PASSWORD no está configurada"
        },
        500,
        corsHeaders
      );
    }

    if (password !== env.ADMIN_PASSWORD) {
      return jsonResponse(
        {
          ok: false,
          error: "Contraseña incorrecta"
        },
        401,
        corsHeaders
      );
    }

    const token = await createAdminToken(env);

    return jsonResponse(
      {
        ok: true,
        token
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error("Error login admin:", error);

    return jsonResponse(
      {
        ok: false,
        error: "No se pudo iniciar sesión"
      },
      500,
      corsHeaders
    );
  }
}


// ============================================================
// CREAR TOKEN ADMIN
// ============================================================

async function createAdminToken(env) {
  const payload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
  };

  const encodedPayload = base64UrlEncode(
    JSON.stringify(payload)
  );

  const signature = await signAdminToken(
    encodedPayload,
    env.ADMIN_PASSWORD
  );

  return `${encodedPayload}.${signature}`;
}


// ============================================================
// VALIDAR TOKEN ADMIN
// ============================================================

async function verifyAdminToken(request, env) {
  const authorization = request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice(7).trim();

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [payloadEncoded, signature] = parts;

  const expectedSignature = await signAdminToken(
    payloadEncoded,
    env.ADMIN_PASSWORD
  );

  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(payloadEncoded)
    );

    if (payload.role !== "admin") {
      return false;
    }

    if (
      !payload.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return true;

  } catch {
    return false;
  }
}


// ============================================================
// FIRMAR TOKEN
// ============================================================

async function signAdminToken(value, secret) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return arrayBufferToBase64Url(signature);
}


// ============================================================
// COMPARACIÓN SEGURA
// ============================================================

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}


// ============================================================
// BASE64 URL SAFE
// ============================================================

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


function base64UrlDecode(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(normalized + padding);

  const bytes = Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}


function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ============================================================
// CREAR PRODUCTO
// ============================================================

async function crearProducto(request, env, corsHeaders) {
  try {

    // --------------------------------------------------------
    // Verificar autenticación
    // --------------------------------------------------------

    const autorizado = await verifyAdminToken(
      request,
      env
    );

    if (!autorizado) {
      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );
    }


    // --------------------------------------------------------
    // Leer datos
    // --------------------------------------------------------

    const body = await request.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const vehicle = String(body.vehicle || "").trim();

    const brand = String(body.brand || "").trim();
    const viscosity = String(body.viscosity || "").trim();
    const engine_type = String(body.engine_type || "").trim();
    const api = String(body.api || "").trim();
    const jaso = String(body.jaso || "").trim();
    const presentation = String(body.presentation || "").trim();

    const price =
      body.price === null ||
      body.price === undefined ||
      body.price === ""
        ? null
        : Number(body.price);

    const price_min =
      body.price_min === null ||
      body.price_min === undefined ||
      body.price_min === ""
        ? null
        : Number(body.price_min);

    const price_max =
      body.price_max === null ||
      body.price_max === undefined ||
      body.price_max === ""
        ? null
        : Number(body.price_max);

    const image = String(body.image || "").trim();
    const slug = String(body.slug || "").trim();
    const technical_data =
      String(body.technical_data || "").trim();


    // --------------------------------------------------------
    // Validaciones básicas
    // --------------------------------------------------------

    if (!name) {
      return jsonResponse(
        {
          ok: false,
          error: "El nombre del producto es obligatorio"
        },
        400,
        corsHeaders
      );
    }

    if (!category) {
      return jsonResponse(
        {
          ok: false,
          error: "La categoría es obligatoria"
        },
        400,
        corsHeaders
      );
    }

    if (!vehicle) {
      return jsonResponse(
        {
          ok: false,
          error: "El tipo de vehículo es obligatorio"
        },
        400,
        corsHeaders
      );
    }


    // --------------------------------------------------------
    // Validar precios
    // --------------------------------------------------------

    if (
      price !== null &&
      (!Number.isFinite(price) || price < 0)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "El precio no es válido"
        },
        400,
        corsHeaders
      );
    }

    if (
      price_min !== null &&
      (!Number.isFinite(price_min) || price_min < 0)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "El precio mínimo no es válido"
        },
        400,
        corsHeaders
      );
    }

    if (
      price_max !== null &&
      (!Number.isFinite(price_max) || price_max < 0)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "El precio máximo no es válido"
        },
        400,
        corsHeaders
      );
    }


    // --------------------------------------------------------
    // Slug automático
    // --------------------------------------------------------

    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");


    // --------------------------------------------------------
    // Insertar producto
    // --------------------------------------------------------

    const result = await env.DB
      .prepare(`
        INSERT INTO products (
          name,
          description,
          category,
          vehicle,
          brand,
          viscosity,
          engine_type,
          api,
          jaso,
          presentation,
          price,
          price_min,
          price_max,
          image,
          slug,
          technical_data,
          active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
      .bind(
        name,
        description || null,
        category,
        vehicle,
        brand || null,
        viscosity || null,
        engine_type || null,
        api || null,
        jaso || null,
        presentation || null,
        price,
        price_min,
        price_max,
        image || null,
        finalSlug || null,
        technical_data || null
      )
      .run();


    return jsonResponse(
      {
        ok: true,
        message: "Producto creado correctamente",
        id: result.meta.last_row_id
      },
      201,
      corsHeaders
    );

  } catch (error) {

    console.error(
      "Error creando producto:",
      error
    );

    return jsonResponse(
      {
        ok: false,
        error: "No se pudo crear el producto"
      },
      500,
      corsHeaders
    );
  }
}


// ============================================================
// OBTENER PRODUCTOS ADMIN
// ============================================================

async function obtenerProductosAdmin(request, env, corsHeaders) {
  try {
    const autorizado = await verifyAdminToken(request, env);

    if (!autorizado) {
      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );
    }

    const result = await env.DB
      .prepare(`
        SELECT *
        FROM products
        ORDER BY id DESC
      `)
      .all();

    return jsonResponse(
      {
        ok: true,
        products: result.results || []
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error("Error obteniendo productos admin:", error);

    return jsonResponse(
      {
        ok: false,
        error: "No se pudieron obtener los productos"
      },
      500,
      corsHeaders
    );
  }
}

// ============================================================
// EDITAR PRODUCTO
// ============================================================

async function editarProducto(request, env, corsHeaders, id) {
  try {
    const autorizado = await verifyAdminToken(request, env);

    if (!autorizado) {
      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );
    }

    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return jsonResponse(
        {
          ok: false,
          error: "ID de producto inválido"
        },
        400,
        corsHeaders
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const vehicle = String(body.vehicle || "").trim();
    const brand = String(body.brand || "").trim();
    const viscosity = String(body.viscosity || "").trim();
    const engine_type = String(body.engine_type || "").trim();
    const api = String(body.api || "").trim();
    const jaso = String(body.jaso || "").trim();
    const presentation = String(body.presentation || "").trim();

    const price =
      body.price === null ||
      body.price === undefined ||
      body.price === ""
        ? null
        : Number(body.price);

    const price_min =
      body.price_min === null ||
      body.price_min === undefined ||
      body.price_min === ""
        ? null
        : Number(body.price_min);

    const price_max =
      body.price_max === null ||
      body.price_max === undefined ||
      body.price_max === ""
        ? null
        : Number(body.price_max);

    const image = String(body.image || "").trim();

    const slug =
      String(body.slug || "").trim() ||
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const technical_data =
      String(body.technical_data || "").trim();

    const active =
      body.active === false ||
      body.active === 0
        ? 0
        : 1;

    if (!name || !category || !vehicle) {
      return jsonResponse(
        {
          ok: false,
          error: "Nombre, categoría y vehículo son obligatorios"
        },
        400,
        corsHeaders
      );
    }

    const result = await env.DB
      .prepare(`
        UPDATE products
        SET
          name = ?,
          description = ?,
          category = ?,
          vehicle = ?,
          brand = ?,
          viscosity = ?,
          engine_type = ?,
          api = ?,
          jaso = ?,
          presentation = ?,
          price = ?,
          price_min = ?,
          price_max = ?,
          image = ?,
          slug = ?,
          technical_data = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        name,
        description || null,
        category,
        vehicle,
        brand || null,
        viscosity || null,
        engine_type || null,
        api || null,
        jaso || null,
        presentation || null,
        price,
        price_min,
        price_max,
        image || null,
        slug || null,
        technical_data || null,
        active,
        productId
      )
      .run();

    if (!result.meta.changes) {
      return jsonResponse(
        {
          ok: false,
          error: "Producto no encontrado"
        },
        404,
        corsHeaders
      );
    }

    return jsonResponse(
      {
        ok: true,
        message: "Producto actualizado correctamente"
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error("Error editando producto:", error);

    return jsonResponse(
      {
        ok: false,
        error: "No se pudo actualizar el producto"
      },
      500,
      corsHeaders
    );
  }
}

// ============================================================
// DESACTIVAR PRODUCTO
// ============================================================

async function eliminarProducto(request, env, corsHeaders, id) {
  try {
    const autorizado = await verifyAdminToken(request, env);

    if (!autorizado) {
      return jsonResponse(
        {
          ok: false,
          error: "No autorizado"
        },
        401,
        corsHeaders
      );
    }

    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return jsonResponse(
        {
          ok: false,
          error: "ID de producto inválido"
        },
        400,
        corsHeaders
      );
    }

    const result = await env.DB
      .prepare(`
        UPDATE products
        SET
          active = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(productId)
      .run();

    if (!result.meta.changes) {
      return jsonResponse(
        {
          ok: false,
          error: "Producto no encontrado"
        },
        404,
        corsHeaders
      );
    }

    return jsonResponse(
      {
        ok: true,
        message: "Producto desactivado correctamente"
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error("Error desactivando producto:", error);

    return jsonResponse(
      {
        ok: false,
        error: "No se pudo desactivar el producto"
      },
      500,
      corsHeaders
    );
  }
}