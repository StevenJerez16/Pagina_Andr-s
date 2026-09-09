/* =====================================================
   VR TURBOLUB
   PRODUCTOS + CARRITO + CHECKOUT
   VERSIÓN CORREGIDA
   + COMPROBANTES
   + NETLIFY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     FILTROS
  ===================================================== */

  const vehicleFilter =
    document.getElementById("vehicleFilter");

  const categoryFilter =
    document.getElementById("categoryFilter");

  const products =
    document.querySelectorAll(".product-card");


  function filterProducts() {

    if (!vehicleFilter || !categoryFilter) {
      return;
    }

    const vehicle =
      vehicleFilter.value;

    const category =
      categoryFilter.value;


    products.forEach(product => {

      const productVehicle =
        product.dataset.vehicle;

      const productCategory =
        product.dataset.category;


      const matchVehicle =
        vehicle === "all" ||
        vehicle === productVehicle;


      const matchCategory =
        category === "all" ||
        category === productCategory;


      product.style.display =
        matchVehicle && matchCategory
          ? ""
          : "none";

    });

  }


  if (vehicleFilter) {

    vehicleFilter.addEventListener(
      "change",
      filterProducts
    );

  }


  if (categoryFilter) {

    categoryFilter.addEventListener(
      "change",
      filterProducts
    );

  }


  /* =====================================================
     MENÚ MÓVIL
  ===================================================== */

  const menuToggle =
    document.querySelector(".menu-toggle");

  const mainNav =
    document.querySelector(".main-nav");


  if (menuToggle && mainNav) {

    menuToggle.addEventListener(
      "click",
      () => {

        mainNav.classList.toggle(
          "active"
        );

      }
    );

  }


  /* =====================================================
     CARRITO
  ===================================================== */

  const cartButton =
    document.getElementById("cartButton");

  const cartSidebar =
    document.getElementById("cartSidebar");

  const cartOverlay =
    document.getElementById("cartOverlay");

  const closeCart =
    document.getElementById("closeCart");

  const cartItems =
    document.getElementById("cartItems");

  const cartCount =
    document.getElementById("cartCount");

  const cartTotal =
    document.getElementById("cartTotal");

  const clearCart =
    document.getElementById("clearCart");

  const checkoutButton =
    document.getElementById("checkoutButton");


  /* =====================================================
     CHECKOUT
  ===================================================== */

  const checkoutOverlay =
    document.getElementById("checkoutOverlay");

  const closeCheckout =
    document.getElementById("closeCheckout");

  const cancelCheckout =
    document.getElementById("cancelCheckout");

  const customerForm =
    document.getElementById("customerForm");

  const backToCustomer =
    document.getElementById("backToCustomer");

  const continueToSummary =
    document.getElementById("continueToSummary");

  const backToPayment =
    document.getElementById("backToPayment");

  const editCustomer =
    document.getElementById("editCustomer");

  const editPayment =
    document.getElementById("editPayment");

  const confirmOrder =
    document.getElementById("confirmOrder");

  const finishCheckout =
    document.getElementById("finishCheckout");

  const customerSummary =
    document.getElementById("customerSummary");

  const paymentSummary =
    document.getElementById("paymentSummary");

  const orderSummaryItems =
    document.getElementById("orderSummaryItems");

  const checkoutTotal =
    document.getElementById("checkoutTotal");

  const paymentMessage =
    document.getElementById("paymentMessage");

  const successMessage =
    document.getElementById("successMessage");

  const orderNumber =
    document.getElementById("orderNumber");


  /* =====================================================
     MÉTODOS DE PAGO
  ===================================================== */

  const paymentOptions =
    document.querySelectorAll(
      'input[name="paymentMethod"]'
    );


  const nequiInstructions =
    document.getElementById(
      "nequiInstructions"
    );

  const transferInstructions =
    document.getElementById(
      "transferInstructions"
    );

  const cardInstructions =
    document.getElementById(
      "cardInstructions"
    );

  const cashInstructions =
    document.getElementById(
      "cashInstructions"
    );


  const nequiReceipt =
    document.getElementById(
      "nequiReceipt"
    );

  const transferReceipt =
    document.getElementById(
      "transferReceipt"
    );


  /* =====================================================
     CARRITO LOCAL
  ===================================================== */

  let cart = [];


  try {

    cart =
      JSON.parse(
        localStorage.getItem(
          "vrTurbolubCart"
        )
      ) || [];


    if (!Array.isArray(cart)) {

      cart = [];

    }

  } catch (error) {

    console.error(
      "Error cargando carrito:",
      error
    );

    cart = [];

  }


  /* =====================================================
     DATOS CHECKOUT
  ===================================================== */

  let checkoutData = {

    customer: {},

    paymentMethod: ""

  };


  /* =====================================================
     FORMATO PRECIO
  ===================================================== */

  function formatPrice(price) {

    return new Intl.NumberFormat(
      "es-CO",
      {

        style: "currency",

        currency: "COP",

        maximumFractionDigits: 0

      }
    ).format(
      Number(price) || 0
    );

  }


  /* =====================================================
     ESCAPAR HTML
  ===================================================== */

  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    return String(value)

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* =====================================================
     GUARDAR CARRITO
  ===================================================== */

  function saveCart() {

    localStorage.setItem(
      "vrTurbolubCart",
      JSON.stringify(cart)
    );

  }


  /* =====================================================
     TOTAL
  ===================================================== */

  function getCartTotal() {

    return cart.reduce(
      (total, item) => {

        return (
          total +
          (
            Number(item.price) *
            Number(item.quantity)
          )
        );

      },
      0
    );

  }


  /* =====================================================
     ABRIR CARRITO
  ===================================================== */

  function openCart() {

    if (
      !cartSidebar ||
      !cartOverlay
    ) {

      return;

    }


    cartSidebar.classList.add(
      "active"
    );

    cartOverlay.classList.add(
      "active"
    );

    document.body.style.overflow =
      "hidden";

  }


  /* =====================================================
     CERRAR CARRITO
  ===================================================== */

  function closeCartSidebar() {

    if (
      !cartSidebar ||
      !cartOverlay
    ) {

      return;

    }


    cartSidebar.classList.remove(
      "active"
    );

    cartOverlay.classList.remove(
      "active"
    );

    document.body.style.overflow =
      "";

  }


  if (cartButton) {

    cartButton.addEventListener(
      "click",
      openCart
    );

  }


  if (closeCart) {

    closeCart.addEventListener(
      "click",
      closeCartSidebar
    );

  }


  if (cartOverlay) {

    cartOverlay.addEventListener(
      "click",
      closeCartSidebar
    );

  }


  /* =====================================================
     AGREGAR PRODUCTO
  ===================================================== */

  function addToCart(productCard) {

    const name =
      productCard.dataset.product;

    const price =
      Number(
        productCard.dataset.price
      );


    const image =
      productCard.querySelector(
        ".product-image img"
      )?.src || "";


    if (
      !name ||
      !Number.isFinite(price) ||
      price <= 0
    ) {

      console.error(
        "Producto inválido:",
        productCard
      );

      return;

    }


    const existingProduct =
      cart.find(
        item =>
          item.name === name
      );


    if (existingProduct) {

      existingProduct.quantity += 1;

    } else {

      cart.push({

        name,

        price,

        image,

        quantity: 1

      });

    }


    saveCart();

    renderCart();

    openCart();

  }


  /* =====================================================
     BOTONES AGREGAR
  ===================================================== */

  document
    .querySelectorAll(
      ".add-cart-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const productCard =
            button.closest(
              ".product-card"
            );


          if (productCard) {

            addToCart(
              productCard
            );

          }

        }
      );

    });


  /* =====================================================
     CAMBIAR CANTIDAD
  ===================================================== */

  function changeQuantity(
    index,
    change
  ) {

    if (!cart[index]) {

      return;

    }


    cart[index].quantity =
      Number(
        cart[index].quantity
      ) + change;


    if (
      cart[index].quantity <= 0
    ) {

      cart.splice(
        index,
        1
      );

    }


    saveCart();

    renderCart();

  }


  /* =====================================================
     ELIMINAR
  ===================================================== */

  function removeItem(index) {

    if (!cart[index]) {

      return;

    }


    cart.splice(
      index,
      1
    );


    saveCart();

    renderCart();

  }


  /* =====================================================
     RENDER CARRITO
  ===================================================== */

  function renderCart() {

    if (!cartItems) {

      return;

    }


    cartItems.innerHTML = "";


    if (cart.length === 0) {

      cartItems.innerHTML = `

        <div class="cart-empty">

          <div>

            <div style="
              font-size: 2.5rem;
              margin-bottom: 15px;
            ">
              🛒
            </div>

            <p>
              Tu carrito está vacío.
            </p>

            <p style="
              margin-top: 8px;
              color: #666;
            ">
              Agrega productos para comenzar.
            </p>

          </div>

        </div>

      `;

    }


    cart.forEach(
      (item, index) => {

        const itemTotal =
          Number(item.price) *
          Number(item.quantity);


        const cartItem =
          document.createElement(
            "div"
          );


        cartItem.className =
          "cart-item";


        cartItem.innerHTML = `

          <div class="cart-item-image">

            <img
              src="${escapeHtml(item.image)}"
              alt="${escapeHtml(item.name)}"
            >

          </div>

          <div class="cart-item-info">

            <h3>
              ${escapeHtml(item.name)}
            </h3>

            <div class="cart-item-price">
              ${formatPrice(itemTotal)}
            </div>

            <div class="cart-item-controls">

              <div class="quantity-controls">

                <button
                  type="button"
                  class="quantity-minus"
                  data-index="${index}"
                >
                  −
                </button>

                <span>
                  ${item.quantity}
                </span>

                <button
                  type="button"
                  class="quantity-plus"
                  data-index="${index}"
                >
                  +
                </button>

              </div>

              <button
                type="button"
                class="remove-item"
                data-index="${index}"
              >
                Eliminar
              </button>

            </div>

          </div>

        `;


        cartItems.appendChild(
          cartItem
        );

      }
    );


    document
      .querySelectorAll(
        ".quantity-minus"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            changeQuantity(
              Number(
                button.dataset.index
              ),
              -1
            );

          }
        );

      });


    document
      .querySelectorAll(
        ".quantity-plus"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            changeQuantity(
              Number(
                button.dataset.index
              ),
              1
            );

          }
        );

      });


    document
      .querySelectorAll(
        ".remove-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            removeItem(
              Number(
                button.dataset.index
              )
            );

          }
        );

      });


    const totalItems =
      cart.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity
          ),
        0
      );


    if (cartCount) {

      cartCount.textContent =
        totalItems;

    }


    if (cartTotal) {

      cartTotal.textContent =
        formatPrice(
          getCartTotal()
        );

    }

  }


  /* =====================================================
     VACIAR CARRITO
  ===================================================== */

  if (clearCart) {

    clearCart.addEventListener(
      "click",
      () => {

        if (
          cart.length === 0
        ) {

          return;

        }


        const confirmed =
          confirm(
            "¿Seguro que quieres vaciar el carrito?"
          );


        if (!confirmed) {

          return;

        }


        cart = [];

        saveCart();

        renderCart();

      }
    );

  }


  /* =====================================================
     ABRIR CHECKOUT
  ===================================================== */

  function openCheckout() {

    if (
      cart.length === 0
    ) {

      alert(
        "Tu carrito está vacío."
      );

      return;

    }


    if (!checkoutOverlay) {

      return;

    }


    closeCartSidebar();


    checkoutOverlay.classList.add(
      "active"
    );


    document.body.style.overflow =
      "hidden";


    showCheckoutStep(1);

  }


  if (checkoutButton) {

    checkoutButton.addEventListener(
      "click",
      openCheckout
    );

  }


  /* =====================================================
     CERRAR CHECKOUT
  ===================================================== */

  function closeCheckoutModal() {

    if (!checkoutOverlay) {

      return;

    }


    checkoutOverlay.classList.remove(
      "active"
    );


    document.body.style.overflow =
      "";

  }


  if (closeCheckout) {

    closeCheckout.addEventListener(
      "click",
      closeCheckoutModal
    );

  }


  if (cancelCheckout) {

    cancelCheckout.addEventListener(
      "click",
      closeCheckoutModal
    );

  }


  /* =====================================================
     PASOS CHECKOUT
  ===================================================== */

  function showCheckoutStep(step) {

    const step1 =
      document.getElementById(
        "checkoutStep1"
      );

    const step2 =
      document.getElementById(
        "checkoutStep2"
      );

    const step3 =
      document.getElementById(
        "checkoutStep3"
      );

    const success =
      document.getElementById(
        "checkoutSuccess"
      );


    [
      step1,
      step2,
      step3,
      success
    ].forEach(section => {

      if (section) {

        section.classList.remove(
          "active"
        );

      }

    });


    document
      .querySelectorAll(
        "[data-step-indicator]"
      )
      .forEach(indicator => {

        const indicatorStep =
          Number(
            indicator.dataset
              .stepIndicator
          );


        indicator.classList.toggle(
          "active",
          indicatorStep === step
        );


        indicator.classList.toggle(
          "completed",
          indicatorStep < step
        );

      });


    if (
      step === 1 &&
      step1
    ) {

      step1.classList.add(
        "active"
      );

    }


    if (
      step === 2 &&
      step2
    ) {

      step2.classList.add(
        "active"
      );

    }


    if (
      step === 3 &&
      step3
    ) {

      step3.classList.add(
        "active"
      );

    }


    if (
      step === 4 &&
      success
    ) {

      success.classList.add(
        "active"
      );

    }

  }


  /* =====================================================
     PASO 1 → PASO 2
  ===================================================== */

  if (customerForm) {

    customerForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();


        const formData =
          new FormData(
            customerForm
          );


        checkoutData.customer = {

          name:
            String(
              formData.get(
                "customerName"
              ) || ""
            ).trim(),

          lastName:
            String(
              formData.get(
                "customerLastName"
              ) || ""
            ).trim(),

          phone:
            String(
              formData.get(
                "customerPhone"
              ) || ""
            ).trim(),

          email:
            String(
              formData.get(
                "customerEmail"
              ) || ""
            ).trim(),

          address:
            String(
              formData.get(
                "customerAddress"
              ) || ""
            ).trim(),

          city:
            String(
              formData.get(
                "customerCity"
              ) || ""
            ).trim(),

          department:
            String(
              formData.get(
                "customerDepartment"
              ) || ""
            ).trim(),

          notes:
            String(
              formData.get(
                "customerNotes"
              ) || ""
            ).trim()

        };


        showCheckoutStep(2);

      }
    );

  }


  /* =====================================================
     MÉTODOS DE PAGO
  ===================================================== */

  function getSelectedPayment() {

    const selected =
      document.querySelector(
        'input[name="paymentMethod"]:checked'
      );


    return selected
      ? selected.value
      : "";

  }


  function getPaymentName(method) {

    const names = {

      nequi:
        "Nequi",

      transferencia:
        "PSE / Transferencia bancaria",

      tarjeta:
        "Tarjeta",

      contra_entrega:
        "Contra entrega"

    };


    return (
      names[method] ||
      ""
    );

  }


  function getPaymentIcon(method) {

    const icons = {

      nequi: "📱",

      transferencia: "🏦",

      tarjeta: "💳",

      contra_entrega: "🚚"

    };


    return (
      icons[method] ||
      "💰"
    );

  }


  /* =====================================================
     INSTRUCCIONES
  ===================================================== */

  function hidePaymentInstructions() {

    [
      nequiInstructions,
      transferInstructions,
      cardInstructions,
      cashInstructions
    ].forEach(element => {

      if (element) {

        element.style.display =
          "none";

      }

    });

  }


  function showPaymentInstructions(
    method
  ) {

    hidePaymentInstructions();


    if (
      method === "nequi" &&
      nequiInstructions
    ) {

      nequiInstructions.style.display =
        "block";

    }


    if (
      method === "transferencia" &&
      transferInstructions
    ) {

      transferInstructions.style.display =
        "block";

    }


    if (
      method === "tarjeta" &&
      cardInstructions
    ) {

      cardInstructions.style.display =
        "block";

    }


    if (
      method === "contra_entrega" &&
      cashInstructions
    ) {

      cashInstructions.style.display =
        "block";

    }

  }


  paymentOptions.forEach(option => {

    option.addEventListener(
      "change",
      () => {

        showPaymentInstructions(
          option.value
        );


        if (paymentMessage) {

          paymentMessage.textContent =
            "";

          paymentMessage.classList.remove(
            "active"
          );

        }

      }
    );

  });


  /* =====================================================
     ARCHIVO → BASE64
  ===================================================== */

  function fileToBase64(file) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const reader =
          new FileReader();


        reader.onload = () => {

          const result =
            String(
              reader.result || ""
            );


          /*
           * FileReader entrega:
           *
           * data:image/png;base64,XXXX
           *
           * Nosotros solo necesitamos:
           *
           * XXXX
           */

          const commaIndex =
            result.indexOf(",");


          const base64 =
            commaIndex >= 0
              ? result.substring(
                  commaIndex + 1
                )
              : result;


          resolve(base64);

        };


        reader.onerror =
          () => {

            reject(
              new Error(
                "No se pudo leer el comprobante."
              )
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  /* =====================================================
     OBTENER ARCHIVO
  ===================================================== */

  function getSelectedReceiptFile() {

    const method =
      getSelectedPayment();


    if (
      method === "nequi"
    ) {

      return (
        nequiReceipt
          ?.files
          ?.[
            0
          ] || null
      );

    }


    if (
      method === "transferencia"
    ) {

      return (
        transferReceipt
          ?.files
          ?.[
            0
          ] || null
      );

    }


    return null;

  }


  /* =====================================================
     VALIDAR COMPROBANTE
  ===================================================== */

  function validatePaymentReceipt() {

    const selectedPayment =
      getSelectedPayment();


    if (!selectedPayment) {

      return {

        valid: false,

        message:
          "Selecciona un método de pago."

      };

    }


    if (
      selectedPayment === "nequi"
    ) {

      if (
        !nequiReceipt ||
        !nequiReceipt.files ||
        !nequiReceipt.files.length
      ) {

        return {

          valid: false,

          message:
            "Debes adjuntar el comprobante de pago de Nequi."

        };

      }

    }


    if (
      selectedPayment ===
      "transferencia"
    ) {

      if (
        !transferReceipt ||
        !transferReceipt.files ||
        !transferReceipt.files.length
      ) {

        return {

          valid: false,

          message:
            "Debes adjuntar el comprobante de la transferencia."

        };

      }

    }


    const file =
      getSelectedReceiptFile();


    if (file) {

      const allowedTypes = [

        "image/jpeg",

        "image/png",

        "image/webp",

        "application/pdf"

      ];


      if (
        !allowedTypes.includes(
          file.type
        )
      ) {

        return {

          valid: false,

          message:
            "El comprobante debe ser JPG, PNG, WEBP o PDF."

        };

      }


      /*
       * 4 MB.
       *
       * Se usa 4 MB porque el archivo
       * viaja convertido a Base64 y
       * Base64 aumenta el tamaño.
       */

      const maxSize =
        4 * 1024 * 1024;


      if (
        file.size > maxSize
      ) {

        return {

          valid: false,

          message:
            "El comprobante no puede superar 4 MB."

        };

      }

    }


    return {

      valid: true,

      message: ""

    };

  }


  /* =====================================================
     PASO 2 → PASO 3
  ===================================================== */

  if (continueToSummary) {

    continueToSummary.addEventListener(
      "click",
      () => {

        const validation =
          validatePaymentReceipt();


        if (
          !validation.valid
        ) {

          if (paymentMessage) {

            paymentMessage.textContent =
              validation.message;

            paymentMessage.classList.add(
              "active"
            );

          }

          return;

        }


        checkoutData.paymentMethod =
          getSelectedPayment();


        if (paymentMessage) {

          paymentMessage.textContent =
            "";

          paymentMessage.classList.remove(
            "active"
          );

        }


        renderCheckoutSummary();

        showCheckoutStep(3);

      }
    );

  }


  /* =====================================================
     VOLVER CLIENTE
  ===================================================== */

  if (backToCustomer) {

    backToCustomer.addEventListener(
      "click",
      () => {

        showCheckoutStep(1);

      }
    );

  }


  /* =====================================================
     VOLVER PAGO
  ===================================================== */

  if (backToPayment) {

    backToPayment.addEventListener(
      "click",
      () => {

        showCheckoutStep(2);

      }
    );

  }


  /* =====================================================
     EDITAR CLIENTE
  ===================================================== */

  if (editCustomer) {

    editCustomer.addEventListener(
      "click",
      () => {

        showCheckoutStep(1);

      }
    );

  }


  /* =====================================================
     EDITAR PAGO
  ===================================================== */

  if (editPayment) {

    editPayment.addEventListener(
      "click",
      () => {

        const currentPayment =
          checkoutData.paymentMethod;


        if (currentPayment) {

          const radio =
            document.querySelector(
              `input[name="paymentMethod"][value="${currentPayment}"]`
            );


          if (radio) {

            radio.checked = true;

            showPaymentInstructions(
              currentPayment
            );

          }

        }


        showCheckoutStep(2);

      }
    );

  }


  /* =====================================================
     RESUMEN
  ===================================================== */

  function renderCheckoutSummary() {

    const customer =
      checkoutData.customer;


    if (customerSummary) {

      customerSummary.innerHTML = `

        <div class="summary-customer">

          <strong>
            ${escapeHtml(customer.name)}
            ${escapeHtml(customer.lastName)}
          </strong>

          <span>
            📱 ${escapeHtml(customer.phone)}
          </span>

          <span>
            ✉️ ${escapeHtml(customer.email)}
          </span>

          <span>
            📍 ${escapeHtml(customer.address)},
            ${escapeHtml(customer.city)}
            ${
              customer.department
                ? ", " +
                  escapeHtml(
                    customer.department
                  )
                : ""
            }
          </span>

          ${
            customer.notes
              ? `
                <span>
                  📝 ${escapeHtml(
                    customer.notes
                  )}
                </span>
              `
              : ""
          }

        </div>

      `;

    }


    if (paymentSummary) {

      paymentSummary.innerHTML = `

        <div class="summary-payment">

          <span>
            ${getPaymentIcon(
              checkoutData.paymentMethod
            )}
          </span>

          <strong>
            ${getPaymentName(
              checkoutData.paymentMethod
            )}
          </strong>

        </div>

      `;

    }


    if (orderSummaryItems) {

      orderSummaryItems.innerHTML =
        "";


      cart.forEach(item => {

        const itemTotal =
          Number(item.price) *
          Number(item.quantity);


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "checkout-product-row";


        row.innerHTML = `

          <div>

            <strong>
              ${escapeHtml(item.name)}
            </strong>

            <span>
              ${item.quantity} ×
              ${formatPrice(item.price)}
            </span>

          </div>

          <strong>
            ${formatPrice(itemTotal)}
          </strong>

        `;


        orderSummaryItems.appendChild(
          row
        );

      });

    }


    if (checkoutTotal) {

      checkoutTotal.textContent =
        formatPrice(
          getCartTotal()
        );

    }

  }


  /* =====================================================
     NÚMERO DE PEDIDO
  ===================================================== */

  function generateOrderId() {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );


    const random =
      Math.floor(
        1000 +
        Math.random() * 9000
      );


    return (
      `VT-${year}${month}${day}-${random}`
    );

  }


  /* =====================================================
     PREPARAR COMPROBANTE
  ===================================================== */

  async function prepareReceipt() {

    const file =
      getSelectedReceiptFile();


    if (!file) {

      return null;

    }


    const base64 =
      await fileToBase64(
        file
      );


    return {

      name:
        file.name,

      type:
        file.type,

      size:
        file.size,

      data:
        base64

    };

  }


  /* =====================================================
     CONFIRMAR PEDIDO
  ===================================================== */

  if (confirmOrder) {

    confirmOrder.addEventListener(
      "click",
      async () => {

        if (
          cart.length === 0
        ) {

          alert(
            "Tu carrito está vacío."
          );

          return;

        }


        const paymentValidation =
          validatePaymentReceipt();


        if (
          !paymentValidation.valid
        ) {

          alert(
            paymentValidation.message
          );

          showCheckoutStep(2);

          return;

        }


        if (
          !checkoutData.paymentMethod
        ) {

          alert(
            "Selecciona un método de pago."
          );

          showCheckoutStep(2);

          return;

        }


        confirmOrder.disabled =
          true;

        confirmOrder.textContent =
          "Preparando pedido...";


        try {

          /* =============================================
             PEDIDO
          ============================================= */

          const orderId =
            generateOrderId();


          /* =============================================
             COMPROBANTE
          ============================================= */

          const receipt =
            await prepareReceipt();


          /* =============================================
             OBJETO PEDIDO
          ============================================= */

          const order = {

            id:
              orderId,

            date:
              new Date().toISOString(),

            customer:
              checkoutData.customer,

            paymentMethod:
              checkoutData.paymentMethod,

            paymentMethodName:
              getPaymentName(
                checkoutData.paymentMethod
              ),

            products:
              cart.map(item => ({

                name:
                  item.name,

                price:
                  Number(item.price),

                quantity:
                  Number(item.quantity),

                subtotal:
                  Number(item.price) *
                  Number(item.quantity)

              })),

            total:
              getCartTotal(),

            status:
              "pendiente"

          };


          /* =============================================
             PAYLOAD NETLIFY
          ============================================= */

          const payload = {

            order,

            receipt

          };


          confirmOrder.textContent =
            "Enviando pedido...";


          /* =============================================
             NETLIFY
          ============================================= */

/* =============================================
   NETLIFY / WORKER
============================================= */

const response =
  await fetch(
    "https://vr-turbolub.jerezsteven85.workers.dev//",
    {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify(
          payload
        )

    }
  );


          let result = {};


          try {

            result =
              await response.json();

          } catch (jsonError) {

            result = {};

          }


          if (
            !response.ok ||
            !result.success
          ) {

            throw new Error(
              result.message ||
              "No se pudo registrar el pedido."
            );

          }


          /* =============================================
             GUARDAR ÚLTIMO PEDIDO
          ============================================= */

          localStorage.setItem(
            "vrTurbolubLastOrder",
            JSON.stringify({
              order,
              result
            })
          );


          /* =============================================
             MOSTRAR CONFIRMACIÓN
          ============================================= */

          if (orderNumber) {

            orderNumber.textContent =
              `Pedido #${orderId}`;

          }


          if (successMessage) {

            let message =
              "Tu pedido fue registrado correctamente.";

            if (
              result.fileWarning
            ) {

              message +=
                " El pedido quedó registrado, pero el comprobante está pendiente de configuración en HubSpot.";

            } else {

              message +=
                " Hemos recibido tu comprobante de pago.";

            }


            successMessage.textContent =
              message;

          }


          showCheckoutStep(4);

        } catch (error) {

          console.error(
            "Error enviando pedido:",
            error
          );


          alert(
            error.message ||
            "No pudimos registrar tu pedido. Por favor intenta nuevamente."
          );

        } finally {

          confirmOrder.disabled =
            false;

          confirmOrder.textContent =
            "Confirmar pedido";

        }

      }
    );

  }


  /* =====================================================
     FINALIZAR CHECKOUT
  ===================================================== */

  if (finishCheckout) {

    finishCheckout.addEventListener(
      "click",
      () => {

        cart = [];


        saveCart();


        renderCart();


        checkoutData = {

          customer: {},

          paymentMethod: ""

        };


        if (customerForm) {

          customerForm.reset();

        }


        paymentOptions.forEach(
          option => {

            option.checked =
              false;

          }
        );


        if (nequiReceipt) {

          nequiReceipt.value =
            "";

        }


        if (transferReceipt) {

          transferReceipt.value =
            "";

        }


        hidePaymentInstructions();


        closeCheckoutModal();

      }
    );

  }


  /* =====================================================
     INICIALIZAR
  ===================================================== */

  hidePaymentInstructions();

  renderCart();

});