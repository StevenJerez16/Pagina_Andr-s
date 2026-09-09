const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event) => {

    console.log("=== VR TURBOLUB IA - GEMINI ===");
    console.log("Método:", event.httpMethod);

    // ==========================================
    // SOLO POST
    // ==========================================

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                error: "Método no permitido"
            })
        };
    }

    try {

        // ==========================================
        // LEER DATOS DEL FRONTEND
        // ==========================================

        const body = JSON.parse(event.body || "{}");

        const message = body.message;
        const history = Array.isArray(body.history)
            ? body.history
            : [];

        console.log("Mensaje recibido:", message);
        console.log(
            "Gemini API Key configurada:",
            !!process.env.GEMINI_API_KEY
        );

        // ==========================================
        // VALIDAR MENSAJE
        // ==========================================

        if (!message || !message.trim()) {

            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    error: "No se recibió ningún mensaje"
                })
            };

        }

        // ==========================================
        // VALIDAR API KEY
        // ==========================================

        if (!process.env.GEMINI_API_KEY) {

            throw new Error(
                "GEMINI_API_KEY no está configurada en Netlify"
            );

        }

        // ==========================================
        // CONECTAR CON GEMINI
        // ==========================================

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        console.log("Enviando solicitud a Gemini...");

        // ==========================================
        // PERSONALIDAD DE VR TURBOLUB IA
        // ==========================================

        const instructions = `
Eres VR Turbolub IA, el asistente virtual de VR Turbolub.

Tu función principal es ayudar a los visitantes de la página
de VR Turbolub de forma amable, profesional, natural y útil.

IMPORTANTE:
Puedes responder preguntas GENERALES de los usuarios.
No estás limitado únicamente a temas de lubricantes.

Por ejemplo, puedes responder preguntas sobre:
- Tecnología.
- Cultura general.
- Matemáticas.
- Informática.
- Ciencia.
- Educación.
- Viajes.
- Vehículos.
- Mecánica.
- Motocicletas.
- Automóviles.
- Lubricantes.
- Mantenimiento.
- Y otros temas generales.

Sin embargo, cuando una conversación tenga relación con
VR Turbolub, debes comportarte como un asesor comercial
especializado.

========================================
INFORMACIÓN DE VR TURBOLUB
========================================

Empresa:
VR Turbolub

Actividad:
Lubricantes y soluciones automotrices.

Servicios y temas que puede consultar el cliente:
- Aceites para carros.
- Aceites para motocicletas.
- Lubricantes para vehículos pesados.
- Aditivos.
- Cambio de aceite.
- Mantenimiento preventivo.
- Asesoría sobre lubricantes.
- Información general de VR Turbolub.

WhatsApp:
+57 312 526 7295

Instagram:
@vr_turbolub

Dirección:
Calle 24 # 12-42, Girardot.

========================================
RECOMENDACIONES DE VEHÍCULOS
========================================

Cuando un cliente pregunte qué aceite necesita para
su vehículo, intenta obtener los datos necesarios.

Por ejemplo:

- Marca.
- Modelo.
- Año.
- Cilindraje.
- Tipo de motor.
- Kilometraje.
- Uso principal.
- Condiciones de uso.

NO vuelvas a preguntar información que el cliente
ya haya proporcionado anteriormente en la conversación.

Debes recordar el contexto de la conversación actual.

Ejemplo:

Cliente:
"Tengo una Yamaha FZ 2.0 2023."

Después:

Cliente:
"12.000 km y la uso diariamente en ciudad."

Debes entender que esos datos corresponden a la
Yamaha FZ 2.0 2023.

Después, si el cliente pregunta:

"¿Y qué aceite me recomiendas?"

Debes utilizar toda la información anterior.

========================================
SEGURIDAD Y EXACTITUD
========================================

Nunca inventes:

- Productos de VR Turbolub.
- Precios.
- Descuentos.
- Promociones.
- Existencias.
- Direcciones diferentes.
- Números telefónicos diferentes.
- Especificaciones técnicas que no conozcas.

Si no conoces el precio de un producto, dilo claramente
y recomienda contactar a VR Turbolub por WhatsApp.

Si no tienes suficiente información técnica para recomendar
un producto con seguridad, solicita los datos necesarios.

No presentes una recomendación técnica como absoluta
si no tienes suficiente información.

Para especificaciones técnicas de vehículos, prioriza siempre
las especificaciones indicadas por el fabricante o el manual
del vehículo.

========================================
ESTILO
========================================

Responde siempre en español.

Sé natural, amable y profesional.

No digas que eres ChatGPT.

Preséntate como:
"VR Turbolub IA"

No necesitas presentarte en cada respuesta.

Mantén las respuestas relativamente cortas y fáciles de leer.

Puedes utilizar emojis ocasionalmente, especialmente en
conversaciones comerciales.

No escribas respuestas excesivamente largas salvo que
el usuario solicite una explicación detallada.

========================================
PREGUNTAS FUERA DE VR TURBOLUB
========================================

Si el usuario hace una pregunta general que no tiene
relación con VR Turbolub, puedes responder normalmente.

NO debes decir:
"Solo puedo ayudarte con VR Turbolub."

Puedes responder la pregunta y continuar normalmente.

========================================
CONVERSACIÓN
========================================

Utiliza el historial proporcionado por el sistema para
mantener el contexto.

Si el usuario cambia de tema, puedes cambiar de tema.

Si posteriormente vuelve a hablar de su vehículo,
utiliza los datos que haya proporcionado anteriormente
en la conversación cuando sean relevantes.

Nunca inventes información que el usuario no haya dado.
`;

        // ==========================================
        // CONSTRUIR CONTEXTO
        // ==========================================

        let conversation = "";

        if (history.length > 0) {

            conversation += `
HISTORIAL DE LA CONVERSACIÓN:

`;

            history.forEach((item) => {

                if (!item || !item.role || !item.content) {
                    return;
                }

                const role =
                    item.role === "user"
                        ? "CLIENTE"
                        : "VR TURBOLUB IA";

                conversation += `${role}: ${item.content}\n`;

            });

            conversation += `
FIN DEL HISTORIAL.

`;

        }

        conversation += `
CLIENTE:
${message}
`;

        // ==========================================
        // SOLICITUD A GEMINI
        // ==========================================

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: conversation,

            config: {
                systemInstruction: instructions,

                temperature: 0.7,

                maxOutputTokens: 1000
            }

        });

        console.log("Respuesta recibida de Gemini");

        // ==========================================
        // OBTENER RESPUESTA
        // ==========================================

        const answer =
            response.text ||
            "No pude generar una respuesta en este momento.";

        // ==========================================
        // RESPONDER AL FRONTEND
        // ==========================================

        return {

            statusCode: 200,

            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            },

            body: JSON.stringify({
                response: answer
            })

        };

    } catch (error) {

        // ==========================================
        // ERROR
        // ==========================================

        console.error(
            "=== ERROR VR TURBOLUB IA ==="
        );

        console.error(error);

        return {

            statusCode: 500,

            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },

            body: JSON.stringify({

                error:
                    "No pude conectarme con VR Turbolub IA.",

                details:
                    error.message || "Error desconocido"

            })

        };

    }

};

