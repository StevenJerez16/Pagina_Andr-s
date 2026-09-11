/* =====================================================
   MENÚ MOBILE
===================================================== */

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}


/* =====================================================
   VR TURBOLUB IA
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     ELEMENTOS IA GRANDE
  ===================================================== */

  const input = document.getElementById("vrIaInput");
  const sendButton = document.getElementById("vrIaSend");
  const messages = document.getElementById("vrIaMessages");

  const quickButtons = document.querySelectorAll(
    ".vr-ia-options button"
  );


  /* =====================================================
     ELEMENTOS MINI IA
  ===================================================== */

  const floatingButton =
    document.getElementById("vrIaFloating");

  const miniChat =
    document.getElementById("vrIaMini");

  const miniClose =
    document.getElementById("vrIaMiniClose");

  const miniInput =
    document.getElementById("vrIaMiniInput");

  const miniSend =
    document.getElementById("vrIaMiniSend");

  const miniMessages =
    miniChat?.querySelector(".vr-ia-mini-messages");

  const miniQuickButtons =
    miniChat?.querySelectorAll(
      ".vr-ia-mini-options button"
    ) || [];


  /* =====================================================
     HISTORIAL DE CONVERSACIÓN
  ===================================================== */

  let conversationHistory = [];


  /* =====================================================
     ABRIR / CERRAR MINI IA
  ===================================================== */

  if (floatingButton && miniChat) {

    floatingButton.addEventListener("click", () => {

      miniChat.classList.toggle("active");

      if (miniChat.classList.contains("active")) {

        setTimeout(() => {

          if (miniInput) {
            miniInput.focus();
          }

        }, 250);

      }

    });

  }


  if (miniClose && miniChat) {

    miniClose.addEventListener("click", () => {

      miniChat.classList.remove("active");

    });

  }


  /* =====================================================
     AGREGAR MENSAJE IA GRANDE
  ===================================================== */

  function addMessage(text, type = "ai") {

    if (!messages) return;

    const message = document.createElement("div");

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
     AGREGAR MENSAJE MINI IA
  ===================================================== */

  function addMiniMessage(text, type = "ai") {

    if (!miniMessages) return;

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


    miniMessages.appendChild(message);

    miniMessages.scrollTop =
      miniMessages.scrollHeight;
  }


  /* =====================================================
     FORMATEAR RESPUESTA IA
  ===================================================== */

  function formatAIResponse(text) {

    if (!text) return "";

    return escapeHTML(String(text))

      .replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      )

      .replace(
        /\n\n/g,
        "<br><br>"
      )

      .replace(
        /\n/g,
        "<br>"
      );
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
     INDICADOR ESCRIBIENDO - IA GRANDE
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


    if (messages) {

      messages.appendChild(typing);

      messages.scrollTop =
        messages.scrollHeight;
    }
  }


  /* =====================================================
     INDICADOR ESCRIBIENDO - MINI IA
  ===================================================== */

  function showMiniTyping() {

    if (
      document.getElementById("vrMiniTyping")
    ) {
      return;
    }


    const typing =
      document.createElement("div");

    typing.classList.add(
      "vr-message",
      "vr-message-ai"
    );

    typing.id = "vrMiniTyping";


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


    if (miniMessages) {

      miniMessages.appendChild(typing);

      miniMessages.scrollTop =
        miniMessages.scrollHeight;
    }
  }


  /* =====================================================
     ELIMINAR TYPING
  ===================================================== */

  function removeTyping() {

    const typing =
      document.getElementById("vrTyping");

    if (typing) {
      typing.remove();
    }


    const miniTyping =
      document.getElementById(
        "vrMiniTyping"
      );

    if (miniTyping) {
      miniTyping.remove();
    }
  }


  /* =====================================================
     CONEXIÓN CON LA IA
  ===================================================== */

  async function askAI(userQuestion) {

    const response = await fetch(
      "https://vrturbolub.vrturbolubmiappworkersdev.workers.dev/ia",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          message: userQuestion,

          history:
            conversationHistory

        })
      }
    );


    const data =
      await response.json();


    if (
      !response.ok ||
      data.ok === false
    ) {

      console.error(
        "Error de VR Turbolub IA:",
        data
      );

      throw new Error(
        "La IA respondió con error."
      );
    }


    const answer =
      data.response ||
      data.respuesta;


    if (!answer) {

      throw new Error(
        "Gemini no devolvió respuesta."
      );
    }


    return answer;
  }


  /* =====================================================
     ENVIAR PREGUNTA - IA GRANDE
  ===================================================== */

  async function sendQuestion(question = null) {

    if (!input) return;


    const userQuestion =
      question ||
      input.value.trim();


    if (!userQuestion) {
      return;
    }


    /* Mostrar usuario */

    addMessage(
      userQuestion,
      "user"
    );


    /* Historial */

    conversationHistory.push({

      role: "user",

      content: userQuestion

    });


    /* Limpiar */

    input.value = "";


    /* Typing */

    showTyping();


    try {

      const answer =
        await askAI(userQuestion);


      removeTyping();


      addMessage(
        answer,
        "ai"
      );


      conversationHistory.push({

        role: "assistant",

        content: answer

      });


    } catch (error) {

      removeTyping();


      console.error(
        "Error conectando con VR Turbolub IA:",
        error
      );


      conversationHistory.pop();


      addMessage(

        "No pude conectarme con el asistente 🤖. Inténtalo nuevamente en unos segundos.",

        "ai"

      );
    }
  }


  /* =====================================================
     ENVIAR PREGUNTA - MINI IA
  ===================================================== */

  async function sendMiniQuestion(question = null) {

    if (!miniInput) return;


    const userQuestion =
      question ||
      miniInput.value.trim();


    if (!userQuestion) {
      return;
    }


    /* Mostrar pregunta */

    addMiniMessage(
      userQuestion,
      "user"
    );


    /* Guardar historial */

    conversationHistory.push({

      role: "user",

      content: userQuestion

    });


    /* Limpiar input */

    miniInput.value = "";


    /* Mostrar escribiendo */

    showMiniTyping();


    try {

      const answer =
        await askAI(userQuestion);


      removeTyping();


      addMiniMessage(
        answer,
        "ai"
      );


      conversationHistory.push({

        role: "assistant",

        content: answer

      });


    } catch (error) {

      removeTyping();


      console.error(
        "Error conectando con VR Turbolub IA:",
        error
      );


      conversationHistory.pop();


      addMiniMessage(

        "No pude conectarme con el asistente 🤖. Inténtalo nuevamente en unos segundos.",

        "ai"

      );
    }
  }


  /* =====================================================
     BOTÓN ENVIAR - IA GRANDE
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
     ENTER - IA GRANDE
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
     BOTONES RÁPIDOS - IA GRANDE
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


  /* =====================================================
     BOTÓN ENVIAR - MINI IA
  ===================================================== */

  if (miniSend) {

    miniSend.addEventListener(
      "click",
      () => {

        sendMiniQuestion();

      }
    );
  }


  /* =====================================================
     ENTER - MINI IA
  ===================================================== */

  if (miniInput) {

    miniInput.addEventListener(
      "keydown",
      (event) => {

        if (event.key === "Enter") {

          event.preventDefault();

          sendMiniQuestion();

        }

      }
    );
  }


  /* =====================================================
     BOTONES RÁPIDOS - MINI IA
  ===================================================== */

  miniQuickButtons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const question =
            button.dataset.question;


          if (question) {

            sendMiniQuestion(
              question
            );

          }

        }
      );

    }
  );

});



/* =====================================================
   TOP BAR - CARRUSEL DE MENSAJES
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const marqueeContent =
      document.getElementById(
        "marquee-content"
      );

    const prevButton =
      document.querySelector(
        ".top-bar .prev"
      );

    const nextButton =
      document.querySelector(
        ".top-bar .next"
      );

    const topBar =
      document.getElementById(
        "top-bar"
      );

    const mainHeader =
      document.querySelector(
        ".main-header"
      );


    if (
      !marqueeContent ||
      !prevButton ||
      !nextButton
    ) {
      return;
    }


    const items =
      marqueeContent.querySelectorAll(
        ".marquee-item"
      );


    let currentIndex = 0;

    let autoScrollInterval;


    function changeMarquee(direction) {

      currentIndex += direction;


      if (currentIndex < 0) {

        currentIndex =
          items.length - 1;

      }


      if (
        currentIndex >=
        items.length
      ) {

        currentIndex = 0;

      }


      marqueeContent.style.transform =
        `translateX(-${currentIndex * 100}%)`;
    }


    function startAutoScroll() {

      clearInterval(
        autoScrollInterval
      );


      autoScrollInterval =
        setInterval(
          () => {

            changeMarquee(1);

          },
          5000
        );
    }


    prevButton.addEventListener(
      "click",
      () => {

        changeMarquee(-1);

        startAutoScroll();

      }
    );


    nextButton.addEventListener(
      "click",
      () => {

        changeMarquee(1);

        startAutoScroll();

      }
    );


    /* Iniciar carrusel */

    startAutoScroll();


    /* =================================================
       OCULTAR TOP BAR AL HACER SCROLL
    ================================================= */

    let lastScrollTop = 0;


    window.addEventListener(
      "scroll",
      () => {

        const scrollTop =
          window.pageYOffset ||
          document.documentElement.scrollTop;


        if (
          scrollTop > lastScrollTop &&
          scrollTop > 40
        ) {

          /* Bajando */

          if (topBar) {
            topBar.style.top =
              "-40px";
          }


          if (mainHeader) {

            mainHeader.style.top =
              "0";

          }

        } else {

          /* Subiendo */

          if (topBar) {

            topBar.style.top =
              "0";

          }


          if (mainHeader) {

            mainHeader.style.top =
              "40px";

          }

        }


        lastScrollTop =
          Math.max(
            scrollTop,
            0
          );

      }
    );

  }
);