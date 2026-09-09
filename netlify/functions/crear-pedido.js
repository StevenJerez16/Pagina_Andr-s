/* =====================================================
   VR TURBOLUB
   NETLIFY FUNCTION
   CREAR PEDIDO → HUBSPOT

   CREA:
   - Contacto
   - Deal
   - Asociación Deal ↔ Contacto
   - Comprobante → HubSpot Files
   - Nota → Deal + Contacto

   IMPORTANTE:
   Si Files falla por falta de scope,
   el pedido NO se pierde.
===================================================== */

exports.handler = async function (event) {

  /* =====================================================
     CONFIGURACIÓN
  ===================================================== */

  const HUBSPOT_TOKEN =
    process.env.HUBSPOT_ACCESS_TOKEN;


  const HUBSPOT_API =
    "https://api.hubapi.com";


  /* =====================================================
     PIPELINE VR TURBOLUB
  ===================================================== */

  const HUBSPOT_PIPELINE =
    "default";


  /*
   * IMPORTANTE:
   * Mantengo el stage que ya estabas usando.
   */

  const HUBSPOT_DEAL_STAGE =
    "1423653802";


  /* =====================================================
     COMPROBANTES
  ===================================================== */

  const MAX_RECEIPT_SIZE =
    4 * 1024 * 1024;


  const ALLOWED_RECEIPT_TYPES = [

    "image/jpeg",

    "image/png",

    "image/webp",

    "application/pdf"

  ];


  /* =====================================================
     SOLO POST
  ===================================================== */

  if (
    event.httpMethod !== "POST"
  ) {

    return jsonResponse(
      405,
      {

        success: false,

        message:
          "Método no permitido."

      }
    );

  }


  /* =====================================================
     TOKEN
  ===================================================== */

  if (!HUBSPOT_TOKEN) {

    console.error(
      "Falta HUBSPOT_ACCESS_TOKEN en Netlify."
    );


    return jsonResponse(
      500,
      {

        success: false,

        message:
          "Configuración de HubSpot incompleta."

      }
    );

  }


  try {

    /* ===================================================
       LEER BODY
    =================================================== */

    let payload = {};


    try {

      payload =
        JSON.parse(
          event.body || "{}"
        );

    } catch (error) {

      return jsonResponse(
        400,
        {

          success: false,

          message:
            "El cuerpo de la solicitud no contiene JSON válido."

        }
      );

    }


    /* ===================================================
       PEDIDO
    =================================================== */

    const order =
      payload.order || payload;


    const receipt =
      payload.receipt || null;


    /* ===================================================
       VALIDAR PEDIDO
    =================================================== */

    if (
      !order ||
      !order.id ||
      !order.customer
    ) {

      return jsonResponse(
        400,
        {

          success: false,

          message:
            "Pedido inválido."

        }
      );

    }


    const customer =
      order.customer;


    /* ===================================================
       VALIDAR CLIENTE
    =================================================== */

    if (
      !customer.name ||
      !customer.lastName ||
      !customer.email ||
      !customer.phone
    ) {

      return jsonResponse(
        400,
        {

          success: false,

          message:
            "Faltan datos obligatorios del cliente."

        }
      );

    }


    /* ===================================================
       PRODUCTOS
    =================================================== */

    const products =
      Array.isArray(
        order.products
      )
        ? order.products
        : [];


    if (
      products.length === 0
    ) {

      return jsonResponse(
        400,
        {

          success: false,

          message:
            "El pedido no contiene productos."

        }
      );

    }


    const productText =
      products
        .map(item => {

          return (
            `${item.name} x${item.quantity} - ${formatPrice(item.subtotal)}`
          );

        })
        .join("\n");


    /* ===================================================
       MÉTODO DE PAGO
    =================================================== */

    const paymentNames = {

      nequi:
        "Nequi",

      transferencia:
        "PSE / Transferencia bancaria",

      tarjeta:
        "Tarjeta",

      contra_entrega:
        "Contra entrega"

    };


    const paymentMethod =
      paymentNames[
        order.paymentMethod
      ] ||
      order.paymentMethod ||
      "No especificado";


    /* ===================================================
       VALIDAR COMPROBANTE
    =================================================== */

    if (
      order.paymentMethod ===
        "nequi" ||

      order.paymentMethod ===
        "transferencia"
    ) {

      if (!receipt) {

        return jsonResponse(
          400,
          {

            success: false,

            message:
              "El comprobante de pago es obligatorio."

          }
        );

      }

    }


    if (receipt) {

      if (
        !receipt.name ||
        !receipt.type ||
        !receipt.data
      ) {

        return jsonResponse(
          400,
          {

            success: false,

            message:
              "El comprobante recibido es inválido."

          }
        );

      }


      if (
        !ALLOWED_RECEIPT_TYPES.includes(
          receipt.type
        )
      ) {

        return jsonResponse(
          400,
          {

            success: false,

            message:
              "Tipo de comprobante no permitido."

          }
        );

      }


      if (
        Number(receipt.size) >
        MAX_RECEIPT_SIZE
      ) {

        return jsonResponse(
          400,
          {

            success: false,

            message:
              "El comprobante supera el límite permitido de 4 MB."

          }
        );

      }

    }


    /* ===================================================
       HEADERS
    =================================================== */

    const headers = {

      "Authorization":
        `Bearer ${HUBSPOT_TOKEN}`,

      "Content-Type":
        "application/json"

    };


    /* ===================================================
       1. BUSCAR CONTACTO
    =================================================== */

    const searchContactResponse =
      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/search`,
        {

          method: "POST",

          headers,

          body: JSON.stringify({

            filterGroups: [

              {

                filters: [

                  {

                    propertyName:
                      "email",

                    operator:
                      "EQ",

                    value:
                      customer.email

                  }

                ]

              }

            ],

            properties: [

              "email",

              "firstname",

              "lastname",

              "phone",

              "address",

              "city"

            ],

            limit: 1

          })

        }
      );


    const contactSearch =
      await safeJson(
        searchContactResponse
      );


    if (
      !searchContactResponse.ok
    ) {

      console.error(
        "Error buscando contacto:",
        contactSearch
      );


      throw new Error(
        contactSearch.message ||
        "No se pudo buscar el contacto en HubSpot."
      );

    }


    /* ===================================================
       2. CREAR / ACTUALIZAR CONTACTO
    =================================================== */

    let contactId;


    const contactProperties = {

      firstname:
        customer.name,

      lastname:
        customer.lastName,

      email:
        customer.email,

      phone:
        customer.phone,

      address:
        customer.address || "",

      city:
        customer.city || ""

    };


    if (
      contactSearch.results &&
      contactSearch.results.length > 0
    ) {

      /* ================================================
         CONTACTO EXISTENTE
      ================================================ */

      contactId =
        contactSearch.results[0].id;


      const updateContactResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
          {

            method: "PATCH",

            headers,

            body: JSON.stringify({

              properties:
                contactProperties

            })

          }
        );


      const updateContact =
        await safeJson(
          updateContactResponse
        );


      if (
        !updateContactResponse.ok
      ) {

        console.error(
          "Error actualizando contacto:",
          updateContact
        );


        throw new Error(
          updateContact.message ||
          "No se pudo actualizar el contacto."
        );

      }

    } else {

      /* ================================================
         CREAR CONTACTO
      ================================================ */

      const createContactResponse =
        await fetch(
          `${HUBSPOT_API}/crm/v3/objects/contacts`,
          {

            method: "POST",

            headers,

            body: JSON.stringify({

              properties:
                contactProperties

            })

          }
        );


      const newContact =
        await safeJson(
          createContactResponse
        );


      if (
        !createContactResponse.ok
      ) {

        console.error(
          "Error creando contacto:",
          newContact
        );


        throw new Error(
          newContact.message ||
          "No se pudo crear el contacto."
        );

      }


      contactId =
        newContact.id;

    }


    /* ===================================================
       3. CREAR DEAL
    =================================================== */

    const dealName =
      `Pedido ${order.id} - ${customer.name} ${customer.lastName}`;


    const dealDescription = [

      `Pedido: ${order.id}`,

      `Cliente: ${customer.name} ${customer.lastName}`,

      `Teléfono: ${customer.phone}`,

      `Correo: ${customer.email}`,

      `Dirección: ${customer.address || ""}`,

      `Ciudad: ${customer.city || ""}`,

      `Departamento: ${customer.department || ""}`,

      `Método de pago: ${paymentMethod}`,

      `Estado del pedido: ${order.status || "pendiente"}`,

      "",

      "PRODUCTOS:",

      productText,

      "",

      `TOTAL: ${formatPrice(order.total)}`,

      "",

      `Observaciones: ${customer.notes || "Ninguna"}`

    ].join("\n");


    const dealProperties = {

      dealname:
        dealName,

      pipeline:
        HUBSPOT_PIPELINE,

      dealstage:
        HUBSPOT_DEAL_STAGE,

      amount:
        String(
          Number(order.total) || 0
        ),

      closedate:
        new Date().toISOString(),

      description:
        dealDescription

    };


    const createDealResponse =
      await fetch(
        `${HUBSPOT_API}/crm/v3/objects/deals`,
        {

          method: "POST",

          headers,

          body: JSON.stringify({

            properties:
              dealProperties

          })

        }
      );


    const deal =
      await safeJson(
        createDealResponse
      );


    if (
      !createDealResponse.ok
    ) {

      console.error(
        "Error creando negocio:",
        deal
      );


      throw new Error(
        deal.message ||
        "No se pudo crear el negocio en HubSpot."
      );

    }


    const dealId =
      deal.id;


    /* ===================================================
       4. ASOCIAR DEAL → CONTACTO
    =================================================== */

    /*
     * IMPORTANTE:
     *
     * La llamada anterior estaba enviando:
     *
     * {
     *   associationCategory: "...",
     *   associationTypeId: 3
     * }
     *
     * en el BODY de un PUT.
     *
     * HubSpot no espera ese objeto en ese endpoint.
     *
     * El associationTypeId va en la URL.
     */

    const associationUrl =
      `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`;


    const associationResponse =
      await fetch(
        associationUrl,
        {

          method: "PUT",

          headers

        }
      );


    const associationResult =
      await safeJson(
        associationResponse
      );


    if (
      !associationResponse.ok
    ) {

      console.error(
        "Error asociando contacto:",
        associationResult
      );


      /*
       * El Deal ya existe.
       *
       * No destruimos el pedido
       * por una asociación secundaria.
       */

    } else {

      console.log(
        "Deal asociado correctamente al contacto:",
        contactId
      );

    }


    /* ===================================================
       5. SUBIR COMPROBANTE
    =================================================== */

    let fileId =
      null;


    let fileWarning =
      null;


    if (receipt) {

      try {

        const fileData =
          await uploadReceiptToHubSpot(
            receipt,
            order.id,
            HUBSPOT_TOKEN
          );


        fileId =
          fileData.id;


        console.log(
          "Comprobante subido a HubSpot:",
          fileId
        );

      } catch (fileError) {

        /*
         * MUY IMPORTANTE:
         *
         * Si Files falla por scopes,
         * NO hacemos fallar el pedido.
         */

        console.error(
          "Error subiendo archivo a HubSpot:",
          fileError
        );


        fileWarning =
          fileError.message ||
          "No se pudo subir el comprobante a HubSpot.";

      }

    }


    /* ===================================================
       6. CREAR NOTA
    =================================================== */

    let noteId =
      null;


    try {

      noteId =
        await createDealNote(
          dealId,
          contactId,
          fileId,
          order,
          paymentMethod,
          HUBSPOT_TOKEN
        );


      console.log(
        "Nota creada en HubSpot:",
        noteId
      );

    } catch (noteError) {

      /*
       * El pedido y Deal ya existen.
       */

      console.error(
        "Error creando nota:",
        noteError
      );

    }


    /* ===================================================
       7. LOG
    =================================================== */

    console.log(
      "===================================="
    );


    console.log(
      "PEDIDO VR TURBOLUB REGISTRADO"
    );


    console.log(
      "Pedido:",
      order.id
    );


    console.log(
      "Contacto:",
      contactId
    );


    console.log(
      "Deal:",
      dealId
    );


    console.log(
      "Archivo:",
      fileId || "No disponible"
    );


    console.log(
      "Nota:",
      noteId || "No disponible"
    );


    console.log(
      "Advertencia archivo:",
      fileWarning || "Ninguna"
    );


    console.log(
      "===================================="
    );


    /* ===================================================
       8. RESPUESTA EXITOSA
    =================================================== */

    return jsonResponse(
      200,
      {

        success: true,

        message:
          "Pedido registrado correctamente en HubSpot.",

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

        fileWarning:
          fileWarning

      }
    );


  } catch (error) {

    /* ===================================================
       ERROR GENERAL
    =================================================== */

    console.error(
      "ERROR CREANDO PEDIDO:",
      error
    );


    return jsonResponse(
      500,
      {

        success: false,

        message:
          error.message ||
          "Error interno del servidor."

      }
    );

  }

};


/* =====================================================
   SUBIR COMPROBANTE A HUBSPOT FILES
===================================================== */

async function uploadReceiptToHubSpot(
  receipt,
  orderId,
  token
) {

  /* ===================================================
     BASE64 → BUFFER
  =================================================== */

  const fileBuffer =
    Buffer.from(
      receipt.data,
      "base64"
    );


  if (
    fileBuffer.length >
    4 * 1024 * 1024
  ) {

    throw new Error(
      "El comprobante supera el límite de 4 MB."
    );

  }


  if (
    fileBuffer.length === 0
  ) {

    throw new Error(
      "El comprobante está vacío."
    );

  }


  /* ===================================================
     NOMBRE SEGURO
  =================================================== */

  const originalName =
    String(
      receipt.name ||
      "comprobante"
    );


  const safeName =
    originalName
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


  const fileName =
    `pedido_${orderId}_${safeName}`;


  /* ===================================================
     FORM DATA
  =================================================== */

  const form =
    new FormData();


  const blob =
    new Blob(
      [fileBuffer],
      {

        type:
          receipt.type ||
          "application/octet-stream"

      }
    );


  form.append(
    "file",
    blob,
    fileName
  );


  /*
   * No dependemos de que la carpeta
   * exista previamente.
   */

  form.append(
    "folderPath",
    "/VR Turbolub/Comprobantes"
  );


  /*
   * HubSpot Files necesita las opciones
   * de acceso.
   */

  form.append(
    "options",
    JSON.stringify({

      access:
        "PRIVATE",

      overwrite:
        false

    })
  );


  /* ===================================================
     SUBIR
  =================================================== */

  const response =
    await fetch(
      "https://api.hubapi.com/files/v3/files",
      {

        method: "POST",

        headers: {

          "Authorization":
            `Bearer ${token}`

        },

        body:
          form

      }
    );


  const result =
    await safeJson(
      response
    );


  if (
    !response.ok
  ) {

    console.error(
      "HubSpot Files API:",
      result
    );


    if (
      result.category ===
      "MISSING_SCOPES"
    ) {

      throw new Error(
        "HubSpot no tiene habilitado el scope necesario para subir archivos."
      );

    }


    throw new Error(
      result.message ||
      "No se pudo subir el comprobante a HubSpot."
    );

  }


  return result;

}


/* =====================================================
   CREAR NOTA
===================================================== */

async function createDealNote(
  dealId,
  contactId,
  fileId,
  order,
  paymentMethod,
  token
) {

  const noteBody = [

    `Pedido VR Turbolub: ${order.id}`,

    `Cliente: ${order.customer.name} ${order.customer.lastName}`,

    `Teléfono: ${order.customer.phone}`,

    `Correo: ${order.customer.email}`,

    `Método de pago: ${paymentMethod}`,

    `Total: ${formatPrice(order.total)}`,

    `Estado: ${order.status || "pendiente"}`,

    "",

    fileId
      ? "Comprobante de pago adjunto."
      : "Comprobante pendiente de carga en HubSpot."

  ].join("\n");


  /* ===================================================
     ASOCIACIONES DE LA NOTA
  =================================================== */

  const associations = [

    {

      to: {

        id:
          String(dealId)

      },

      types: [

        {

          associationCategory:
            "HUBSPOT_DEFINED",

          /*
           * Note → Deal
           */

          associationTypeId:
            214

        }

      ]

    }

  ];


  if (contactId) {

    associations.push({

      to: {

        id:
          String(contactId)

      },

      types: [

        {

          associationCategory:
            "HUBSPOT_DEFINED",

          /*
           * Note → Contact
           */

          associationTypeId:
            202

        }

      ]

    });

  }


  /* ===================================================
     PROPIEDADES
  =================================================== */

  const properties = {

    hs_timestamp:
      new Date().toISOString(),

    hs_note_body:
      noteBody

  };


  if (fileId) {

    properties.hs_attachment_ids =
      String(fileId);

  }


  /* ===================================================
     CREAR NOTA
  =================================================== */

  const response =
    await fetch(
      "https://api.hubapi.com/crm/v3/objects/notes",
      {

        method: "POST",

        headers: {

          "Authorization":
            `Bearer ${token}`,

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          properties,

          associations

        })

      }
    );


  const result =
    await safeJson(
      response
    );


  if (
    !response.ok
  ) {

    console.error(
      "Error creando nota:",
      result
    );


    throw new Error(
      result.message ||
      "No se pudo crear la nota en HubSpot."
    );

  }


  return result.id;

}


/* =====================================================
   JSON RESPONSE
===================================================== */

function jsonResponse(
  statusCode,
  data
) {

  return {

    statusCode,

    headers: {

      "Content-Type":
        "application/json",

      "Cache-Control":
        "no-store"

    },

    body:
      JSON.stringify(data)

  };

}


/* =====================================================
   JSON SEGURO
===================================================== */

async function safeJson(
  response
) {

  try {

    return await response.json();

  } catch (error) {

    return {};

  }

}


/* =====================================================
   FORMATO PRECIO
===================================================== */

function formatPrice(price) {

  return new Intl.NumberFormat(
    "es-CO",
    {

      style:
        "currency",

      currency:
        "COP",

      maximumFractionDigits:
        0

    }
  ).format(
    Number(price) || 0
  );

}