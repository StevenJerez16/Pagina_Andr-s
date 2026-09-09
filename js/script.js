const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('nav');
  toggle.addEventListener('click', () => {
    nav.classList.toggle('active');
  });



/* =====================================================
   VR TURBOLUB IA
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const input =
        document.getElementById("vrIaInput");

    const sendButton =
        document.getElementById("vrIaSend");

    const messages =
        document.getElementById("vrIaMessages");

    const quickButtons =
        document.querySelectorAll(
            ".vr-ia-options button"
        );


    /* =====================================================
       HISTORIAL DE CONVERSACIÓN
       ===================================================== */

    let conversationHistory = [];


    /* =====================================================
       AGREGAR MENSAJE VISUAL
       ===================================================== */

    function addMessage(text, type = "ai") {

        if (!messages) return;

        const message =
            document.createElement("div");

        message.classList.add(
            "vr-message",
            type === "user"
                ? "vr-message-user"
                : "vr-message-ai"
        );


        if (type === "ai") {

            message.innerHTML = `
                <div class="vr-message-icon">
                    VR
                </div>

                <div class="vr-message-content">
                    <p>
                        ${formatAIResponse(text)}
                    </p>
                </div>
            `;

        } else {

            message.innerHTML = `
                <div class="vr-message-content">
                    <p>
                        ${escapeHTML(text)}
                    </p>
                </div>
            `;

        }


        messages.appendChild(message);

        messages.scrollTop =
            messages.scrollHeight;

    }


    /* =====================================================
       FORMATEAR RESPUESTA
       ===================================================== */

    function formatAIResponse(text) {

        if (!text) return "";

        return escapeHTML(String(text))
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n\n/g, "<br><br>")
            .replace(/\n/g, "<br>");

    }


    /* =====================================================
       SEGURIDAD HTML
       ===================================================== */

    function escapeHTML(text) {

        const div =
            document.createElement("div");

        div.textContent = text;

        return div.innerHTML;

    }


    /* =====================================================
       INDICADOR DE ESCRITURA
       ===================================================== */

    function showTyping() {

        if (
            document.getElementById("vrTyping")
        ) {
            return;
        }


        const typing =
            document.createElement("div");

        typing.classList.add(
            "vr-message",
            "vr-message-ai"
        );

        typing.id = "vrTyping";


        typing.innerHTML = `

            <div class="vr-message-icon">
                VR
            </div>

            <div class="vr-message-content">

                <div class="vr-typing">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>
        `;


        messages.appendChild(typing);

        messages.scrollTop =
            messages.scrollHeight;

    }


    /* =====================================================
       ELIMINAR INDICADOR
       ===================================================== */

    function removeTyping() {

        const typing =
            document.getElementById("vrTyping");

        if (typing) {
            typing.remove();
        }

    }


    /* =====================================================
       ENVIAR PREGUNTA
       ===================================================== */

    async function sendQuestion(question = null) {

        if (!input) return;


        const userQuestion =
            question || input.value.trim();


        if (!userQuestion) {
            return;
        }


        /* ==========================================
           MOSTRAR MENSAJE DEL CLIENTE
           ========================================== */

        addMessage(
            userQuestion,
            "user"
        );


        /* ==========================================
           GUARDAR EN HISTORIAL
           ========================================== */

        conversationHistory.push({

            role: "user",

            content: userQuestion

        });


        /* ==========================================
           LIMPIAR INPUT
           ========================================== */

        input.value = "";


        /* ==========================================
           MOSTRAR ESCRIBIENDO
           ========================================== */

        showTyping();


        try {

            /* ======================================
               ENVIAR A NETLIFY
               ====================================== */

            const response =
                await fetch(
                    "/.netlify/functions/chat",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            message:
                                userQuestion,

                            history:
                                conversationHistory

                        })

                    }
                );


            /* ======================================
               LEER RESPUESTA
               ====================================== */

            const data =
                await response.json();


            removeTyping();


            /* ======================================
               ERROR DEL SERVIDOR
               ====================================== */

            if (!response.ok) {

                console.error(
                    "Error de Gemini:",
                    data
                );


                /*
                 * Si Gemini falla, eliminamos el último
                 * mensaje del historial porque todavía
                 * no hubo respuesta.
                 */

                conversationHistory.pop();


                addMessage(
                    "Lo siento 😔, en este momento no puedo conectarme con VR Turbolub IA.<br><br>Inténtalo nuevamente en unos segundos.",
                    "ai"
                );

                return;

            }


            /* ======================================
               RESPUESTA DE GEMINI
               ====================================== */

            if (data.response) {

                addMessage(
                    data.response,
                    "ai"
                );


                /* ==================================
                   GUARDAR RESPUESTA EN HISTORIAL
                   ================================== */

                conversationHistory.push({

                    role: "assistant",

                    content:
                        data.response

                });


            } else {

                console.error(
                    "Gemini no devolvió response:",
                    data
                );


                conversationHistory.pop();


                addMessage(
                    "No recibí una respuesta de la IA. Inténtalo nuevamente.",
                    "ai"
                );

            }


        } catch (error) {

            removeTyping();


            console.error(
                "Error conectando con VR Turbolub IA:",
                error
            );


            /*
             * Eliminar la pregunta del historial
             * si la solicitud falló.
             */

            conversationHistory.pop();


            addMessage(
                "No pude conectarme con el asistente 🤖.<br><br>Verifica tu conexión e inténtalo nuevamente.",
                "ai"
            );

        }

    }


    /* =====================================================
       BOTÓN ENVIAR
       ===================================================== */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            () => {
                sendQuestion();
            }
        );

    }


    /* =====================================================
       ENTER
       ===================================================== */

    if (input) {

        input.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    sendQuestion();

                }

            }
        );

    }


    /* =====================================================
       BOTONES DE PREGUNTAS RÁPIDAS
       ===================================================== */

    quickButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const question =
                        button.dataset.question;

                    if (question) {

                        sendQuestion(
                            question
                        );

                    }

                }
            );

        }
    );


});

