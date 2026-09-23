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


    /*
      Cloudflare Workers AI actualmente responde:

      data.result.choices[0].message.content

      Se mantienen response/respuesta como
      compatibilidad con respuestas anteriores.
    */

    const answer =
      data?.result?.choices?.[0]?.message?.content ||
      data?.response ||
      data?.respuesta;


    if (!answer) {

      console.error(
        "Respuesta inesperada de la IA:",
        data
      );

      throw new Error(
        "La IA no devolvió respuesta."
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


/* =====================================================
   PROCESO — CARRUSEL INFINITO
===================================================== */

(() => {

  "use strict";


  function initProcessCarousel() {

    const grid =
      document.querySelector(
        ".process-grid"
      );


    if (!grid) {

      console.log(
        "VR TURBOLUB: process-grid no encontrado"
      );

      return;

    }


    if (
      grid.dataset.carouselReady ===
      "true"
    ) {

      return;

    }


    const originalSteps =
      Array.from(
        grid.querySelectorAll(
          ":scope > .process-step"
        )
      );


    if (
      originalSteps.length !== 4
    ) {

      console.log(
        "VR TURBOLUB: se esperaban 4 pasos y se encontraron",
        originalSteps.length
      );

      return;

    }


    /* =========================================
       CREAR PISTA
    ========================================= */

    const track =
      document.createElement("div");

    track.className =
      "process-track";


    /*
      Guardamos los pasos originales.
    */

    originalSteps.forEach(
      step => {

        step.classList.remove(
          "vr-reveal"
        );

        step.classList.remove(
          "vr-visible"
        );

        step.style.transitionDelay =
          "0ms";

        track.appendChild(step);

      }
    );


    /*
      DUPLICAMOS LOS 4 PASOS

      01 02 03 04
      01 02 03 04
    */

    originalSteps.forEach(
      step => {

        const clone =
          step.cloneNode(true);


        clone.classList.remove(
          "vr-reveal"
        );

        clone.classList.remove(
          "vr-visible"
        );

        clone.style.transitionDelay =
          "0ms";


        track.appendChild(clone);

      }
    );


    /*
      Limpiar grid.
    */

    grid.innerHTML = "";

    grid.appendChild(track);

    grid.dataset.carouselReady =
      "true";


    /* =========================================
       VARIABLES
    ========================================= */

    let position = 0;
    let groupWidth = 0;
    let lastTime =
      performance.now();

    let paused = false;


    /*
      Velocidad.

      45 = rápida
      35 = media
      25 = lenta
    */

    const SPEED = 45;


    /* =========================================
       CALCULAR EL ANCHO EXACTO
    ========================================= */

    function calculateWidth() {

      groupWidth = 0;


      const firstFour =
        Array.from(
          track.children
        ).slice(0, 4);


      firstFour.forEach(
        step => {

          groupWidth +=
            step.getBoundingClientRect().width;

        }
      );


      console.log(
        "VR TURBOLUB: ancho del grupo:",
        groupWidth
      );

    }


    calculateWidth();


    window.addEventListener(
      "resize",
      calculateWidth
    );


    /* =========================================
       PAUSA AL PASAR EL MOUSE
    ========================================= */

    grid.addEventListener(
      "mouseenter",
      () => {

        paused = true;

      }
    );


    grid.addEventListener(
      "mouseleave",
      () => {

        paused = false;

        lastTime =
          performance.now();

      }
    );


    /* =========================================
       ANIMACIÓN CONTINUA
    ========================================= */

    function animate(currentTime) {

      const delta =
        Math.min(
          currentTime - lastTime,
          50
        );


      lastTime =
        currentTime;


      if (
        !paused &&
        groupWidth > 0
      ) {

        /*
          Movimiento continuo.
        */

        position -=
          SPEED *
          (delta / 1000);


        /*
          Cuando terminamos los 4 pasos,
          volvemos exactamente al comienzo.
        */

        if (
          Math.abs(position) >=
          groupWidth
        ) {

          position +=
            groupWidth;

        }


        track.style.transform =
          `translate3d(${position}px, 0, 0)`;

      }


      requestAnimationFrame(
        animate
      );

    }


    /*
      ARRANCAR
    */

    requestAnimationFrame(
      animate
    );


    console.log(
      "VR TURBOLUB: 🚀 carrusel continuo funcionando"
    );

  }


  /*
    Como este script está al final del body,
    podemos iniciarlo directamente.
  */

  initProcessCarousel();

})();


/* =====================================================
   BENEFICIOS — CARRUSEL INFINITO
===================================================== */

(function () {

  const container =
    document.querySelector(
      ".benefits-container"
    );


  const cards =
    [
      ...document.querySelectorAll(
        ".benefits-container > .benefit"
      )
    ];


  if (
    !container ||
    cards.length === 0
  ) {

    console.warn(
      "VR TURBOLUB: no se encontraron beneficios"
    );

    return;

  }


  /* Crear track */

  const track =
    document.createElement("div");

  track.className =
    "benefits-track";


  /* Mover las tarjetas originales al track */

  cards.forEach(
    card => {

      card.classList.remove(
        "vr-reveal"
      );

      card.classList.remove(
        "vr-visible"
      );

      track.appendChild(card);

    }
  );


  container.appendChild(track);


  /* Clonar el grupo completo */

  cards.forEach(
    card => {

      const clone =
        card.cloneNode(true);


      clone.classList.remove(
        "vr-reveal"
      );

      clone.classList.remove(
        "vr-visible"
      );


      track.appendChild(clone);

    }
  );


  /* =========================
     CALCULAR ANCHO EXACTO
  ========================= */

  const firstGroup =
    cards;


  let groupWidth = 0;


  firstGroup.forEach(
    card => {

      groupWidth +=
        card.getBoundingClientRect().width;

    }
  );


  console.log(
    "VR TURBOLUB: beneficios encontrados:",
    cards.length
  );


  console.log(
    "VR TURBOLUB: ancho del grupo:",
    groupWidth
  );


  /* =========================
     MOVIMIENTO
  ========================= */

  let position = 0;

  const speed = 35;

  let lastTime =
    performance.now();


  function animate(currentTime) {

    const delta =
      (currentTime - lastTime) /
      1000;


    lastTime =
      currentTime;


    position -=
      speed *
      delta;


    /*
      Cuando el primer grupo desaparece,
      volvemos exactamente al inicio del
      segundo grupo.
    */

    if (
      Math.abs(position) >=
      groupWidth
    ) {

      position +=
        groupWidth;

    }


    track.style.transform =
      `translate3d(${position}px, 0, 0)`;


    requestAnimationFrame(
      animate
    );

  }


  requestAnimationFrame(
    animate
  );


  console.log(
    "VR TURBOLUB: 🚀 carrusel de beneficios funcionando"
  );

})();


 /* =====================================================
    HERO — CARRUSEL DE VIDEOS + PROGRESO
 ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const video1 = document.getElementById("heroVideo1");
  const video2 = document.getElementById("heroVideo2");
  const progressBar = document.getElementById("heroProgressBar");

  if (!video1 || !video2 || !progressBar) {
    console.error("VR TURBOLUB: faltan elementos del Hero");
    return;
  }


  /* =========================================
     VIDEOS
  ========================================= */

  const videos = [
    "img/inicio.mp4",
    "img/reparandocarro.mp4",
    "img/cambioaceite.mp4",
  ];


  /* =========================================
     CONFIGURACIÓN
  ========================================= */

  const DISPLAY_TIME = 7000;
  const FADE_TIME = 1200;


  let currentIndex = 0;

  let visibleVideo = video1;
  let hiddenVideo = video2;

  let timer = null;
  let progressTimer = null;
  let changing = false;


function startProgress() {

  clearTimeout(progressTimer);

  /* Reiniciar completamente */
  progressBar.style.setProperty(
    "width",
    "0%",
    "important"
  );

  progressBar.style.setProperty(
    "transition",
    "none",
    "important"
  );

  /* Forzar render */
  void progressBar.offsetWidth;

  /* Animar */
  progressBar.style.setProperty(
    "transition",
    `width ${DISPLAY_TIME}ms linear`,
    "important"
  );

  progressBar.style.setProperty(
    "width",
    "100%",
    "important"
  );
}
 



  /* =========================================
     CARGAR VIDEO
  ========================================= */

  function loadVideo(video, index) {

    video.pause();

    video.src = videos[index];

    video.load();

  }


  /* =========================================
     REPRODUCIR
  ========================================= */

  function play(video) {

    video.currentTime = 0;

    const promise = video.play();

    if (promise) {
      promise.catch(error => {
        console.warn(
          "VR TURBOLUB: no se pudo reproducir video",
          error
        );
      });
    }

  }


  /* =========================================
     CAMBIO DE VIDEO
  ========================================= */

  function changeVideo() {

    if (changing) return;

    changing = true;


    const nextIndex =
      (currentIndex + 1) % videos.length;


    /*
      Preparar siguiente video
    */

    loadVideo(
      hiddenVideo,
      nextIndex
    );


    const showNext = () => {

      /*
        Evitar ejecutar dos veces
      */

      if (!changing) return;


      play(hiddenVideo);


      /*
        Mostrar siguiente
      */

      hiddenVideo.style.opacity = "1";
      visibleVideo.style.opacity = "0";


      /*
        Reiniciar barra EXACTAMENTE
        cuando comienza el nuevo video.
      */

      startProgress();


      setTimeout(() => {

        visibleVideo.pause();

        /*
          Intercambiar referencias
        */

        const oldVideo =
          visibleVideo;

        visibleVideo =
          hiddenVideo;

        hiddenVideo =
          oldVideo;


        currentIndex =
          nextIndex;


        hiddenVideo.style.opacity =
          "0";


        changing = false;


        /*
          Programar siguiente
        */

        scheduleNext();

      }, FADE_TIME);

    };


    /*
      Si ya está listo
    */

    if (hiddenVideo.readyState >= 3) {

      showNext();

    } else {

      hiddenVideo.addEventListener(
        "canplay",
        showNext,
        {
          once: true
        }
      );

    }

  }


  /* =========================================
     TEMPORIZADOR
  ========================================= */

  function scheduleNext() {

    clearTimeout(timer);

    timer = setTimeout(
      changeVideo,
      DISPLAY_TIME
    );

  }


  /* =========================================
     INICIALIZAR
  ========================================= */

  video1.style.opacity = "1";
  video2.style.opacity = "0";


  loadVideo(
    video1,
    0
  );


  play(video1);


  /*
    Arrancar barra
  */

  startProgress();


  /*
    Programar primer cambio
  */

  scheduleNext();


  console.log(
    "VR TURBOLUB: 🎬 Hero + barra funcionando"
  );

});



/* =====================================================
   ANIMACIÓN SOLUCIONES AL HACER SCROLL
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const solutionCards =
    document.querySelectorAll(".solution-card");

  if (!solutionCards.length) return;

  const observer =
    new IntersectionObserver((entries) => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {

          entry.target.classList.add("visible");

        } else {

          /*
           * Se quita para que la animación
           * vuelva a ejecutarse al subir.
           */

          entry.target.classList.remove("visible");

        }

      });

    }, {
      threshold: 0.18
    });


  solutionCards.forEach(card => {
    observer.observe(card);
  });

});

