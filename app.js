(() => {
  "use strict";

  const config = window.CATALOGO_CONFIG;
  const products = Array.isArray(window.PRODUCTOS) ? window.PRODUCTOS : [];
  const storageKey = "la-minga-cart-v1";

  const state = {
    query: "",
    category: "",
    cart: loadCart()
  };

  const categoryIcons = {
    "Artículos de limpieza": "🧹",
    "Productos de limpieza": "🧴",
    "Bolsas de basura Herradura": "🗑️",
    "Plásticos": "🪣",
    "Macetas": "🪴",
    "Papeles": "🧻",
    "Insecticidas": "🦟",
    "Varios": "✨",
    "Esponjas ecológicas": "🌿",
    "Otros": "🏠"
  };

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    grid: $("#productsGrid"),
    empty: $("#emptyState"),
    count: $("#resultCount"),
    search: $("#searchInput"),
    select: $("#categorySelect"),
    chips: $("#categoryChips"),
    openCart: $("#openCart"),
    closeCart: $("#closeCart"),
    backdrop: $("#cartBackdrop"),
    drawer: $("#cartDrawer"),
    cartCount: $("#cartCount"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    checkout: $("#checkoutArea"),
    total: $("#cartTotal"),
    minText: $("#minimumText"),
    minAmount: $("#minimumAmount"),
    minProgress: $("#minimumProgress"),
    orderForm: $("#orderForm"),
    copyOrder: $("#copyOrder"),
    continueShopping: $("#continueShopping"),
    deliveryType: $("#deliveryType"),
    addressLabel: $("#addressLabel"),
    customerAddress: $("#customerAddress"),
    toast: $("#toast"),
    priceNotice: $("#priceNotice")
  };

  const money = value =>
    `${config.moneda}${Number(value).toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCart() {
    localStorage.setItem(storageKey, JSON.stringify(state.cart));
  }

  function getCartRows() {
    return Object.entries(state.cart)
      .map(([id, qty]) => {
        const product = products.find(item => item.id === Number(id));
        return product ? { ...product, qty: Number(qty) } : null;
      })
      .filter(Boolean)
      .filter(item => item.qty > 0);
  }

  function cartQuantity() {
    return getCartRows().reduce((sum, item) => sum + item.qty, 0);
  }

  function cartTotal() {
    return getCartRows().reduce((sum, item) => sum + item.precio * item.qty, 0);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => elements.toast.classList.remove("show"), 2300);
  }

  function setCategory(category) {
    state.category = category;
    elements.select.value = category;
    [...elements.chips.querySelectorAll("button")].forEach(button => {
      button.classList.toggle("active", button.dataset.category === category);
    });
    renderProducts();
  }

  function renderCategories() {
    const categories = [...new Set(products.map(item => item.categoria))];
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      elements.select.appendChild(option);
    });

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "category-chip active";
    allButton.dataset.category = "";
    allButton.textContent = "Todos";
    elements.chips.appendChild(allButton);

    categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-chip";
      button.dataset.category = category;
      button.textContent = `${categoryIcons[category] || "•"} ${category}`;
      elements.chips.appendChild(button);
    });
  }

  function filteredProducts() {
    const query = normalize(state.query);
    return products.filter(product => {
      const categoryMatches = !state.category || product.categoria === state.category;
      const textMatches = !query || normalize(`${product.nombre} ${product.categoria}`).includes(query);
      return categoryMatches && textMatches;
    });
  }

  function renderProducts() {
    const visible = filteredProducts();
    elements.grid.innerHTML = "";
    elements.count.textContent = `${visible.length} producto${visible.length === 1 ? "" : "s"}`;
    elements.empty.hidden = visible.length !== 0;

    const fragment = document.createDocumentFragment();
    visible.forEach(product => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        ${product.novedad ? '<span class="new-badge">NUEVO</span>' : ""}
        <div class="product-icon" aria-hidden="true">${categoryIcons[product.categoria] || "🛍️"}</div>
        <span class="product-category">${escapeHtml(product.categoria)}</span>
        <h3>${escapeHtml(product.nombre)}</h3>
        <div class="product-footer">
          <strong class="product-price">${money(product.precio)}</strong>
          <button class="add-button" type="button" data-add="${product.id}" aria-label="Agregar ${escapeHtml(product.nombre)}">+</button>
        </div>`;
      fragment.appendChild(card);
    });
    elements.grid.appendChild(fragment);
  }

  function addItem(id) {
    state.cart[id] = (Number(state.cart[id]) || 0) + 1;
    saveCart();
    renderCart();
    const product = products.find(item => item.id === id);
    showToast(`${product ? product.nombre : "Producto"} agregado`);
  }

  function changeQuantity(id, delta) {
    const next = (Number(state.cart[id]) || 0) + delta;
    if (next <= 0) delete state.cart[id];
    else state.cart[id] = next;
    saveCart();
    renderCart();
  }

  function removeItem(id) {
    delete state.cart[id];
    saveCart();
    renderCart();
  }

  function renderCart() {
    const rows = getCartRows();
    const total = cartTotal();
    const quantity = cartQuantity();

    elements.cartCount.textContent = quantity;
    elements.cartItems.innerHTML = "";
    elements.cartEmpty.hidden = rows.length > 0;
    elements.checkout.hidden = rows.length === 0;

    rows.forEach(item => {
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <h4>${escapeHtml(item.nombre)}</h4>
          <small>${money(item.precio)} c/u</small>
        </div>
        <div class="cart-item-price">${money(item.precio * item.qty)}</div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button type="button" data-change="${item.id}" data-delta="-1" aria-label="Restar uno">−</button>
            <b>${item.qty}</b>
            <button type="button" data-change="${item.id}" data-delta="1" aria-label="Sumar uno">+</button>
          </div>
          <button class="remove-button" type="button" data-remove="${item.id}">Quitar</button>
        </div>`;
      elements.cartItems.appendChild(row);
    });

    elements.total.textContent = money(total);
    const missing = Math.max(0, config.compraMinima - total);
    const progress = Math.min(100, (total / config.compraMinima) * 100);
    elements.minProgress.style.width = `${progress}%`;
    elements.minText.textContent = missing > 0 ? "Falta para la compra mínima" : "Compra mínima alcanzada";
    elements.minAmount.textContent = missing > 0 ? money(missing) : "✓";
    $("#sendWhatsApp").disabled = total < config.compraMinima;
  }

  function openCart() {
    elements.backdrop.hidden = false;
    elements.drawer.classList.add("open");
    elements.drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    elements.closeCart.focus();
  }

  function closeCart() {
    elements.drawer.classList.remove("open");
    elements.drawer.setAttribute("aria-hidden", "true");
    elements.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
  }

  function buildOrderText() {
    const rows = getCartRows();
    const name = $("#customerName").value.trim();
    const delivery = elements.deliveryType.value;
    const address = elements.customerAddress.value.trim();
    const payment = $("#paymentType").value;
    const notes = $("#customerNotes").value.trim();

    const itemLines = rows.map(
      item => `• ${item.qty} × ${item.nombre} — ${money(item.precio * item.qty)}`
    );

    return [
      `Hola, quiero realizar un pedido en ${config.negocio}:`,
      "",
      ...itemLines,
      "",
      `*TOTAL: ${money(cartTotal())}*`,
      "",
      `Nombre: ${name}`,
      `Entrega: ${delivery}`,
      delivery === "Envío a domicilio" ? `Dirección: ${address}` : null,
      `Pago: ${payment}`,
      notes ? `Comentarios: ${notes}` : null,
      "",
      "Quedo a la espera de la confirmación. ¡Gracias!"
    ].filter(line => line !== null).join("\n");
  }

  function validateOrder() {
    if (cartTotal() < config.compraMinima) {
      showToast(`La compra mínima es ${money(config.compraMinima)}`);
      return false;
    }
    if (!elements.orderForm.reportValidity()) return false;
    return true;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  elements.search.addEventListener("input", event => {
    state.query = event.target.value;
    renderProducts();
  });

  elements.select.addEventListener("change", event => setCategory(event.target.value));

  elements.chips.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (button) setCategory(button.dataset.category);
  });

  elements.grid.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (button) addItem(Number(button.dataset.add));
  });

  elements.cartItems.addEventListener("click", event => {
    const changeButton = event.target.closest("[data-change]");
    if (changeButton) {
      changeQuantity(Number(changeButton.dataset.change), Number(changeButton.dataset.delta));
      return;
    }
    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) removeItem(Number(removeButton.dataset.remove));
  });

  elements.openCart.addEventListener("click", openCart);
  elements.closeCart.addEventListener("click", closeCart);
  elements.backdrop.addEventListener("click", closeCart);
  elements.continueShopping.addEventListener("click", closeCart);

  elements.deliveryType.addEventListener("change", () => {
    const needsAddress = elements.deliveryType.value === "Envío a domicilio";
    elements.addressLabel.hidden = !needsAddress;
    elements.customerAddress.required = needsAddress;
  });

  elements.orderForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateOrder()) return;
    const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(buildOrderText())}`;
    window.open(url, "_blank", "noopener");
  });

  elements.copyOrder.addEventListener("click", async () => {
    if (!validateOrder()) return;
    try {
      await navigator.clipboard.writeText(buildOrderText());
      showToast("Pedido copiado");
    } catch {
      showToast("No se pudo copiar automáticamente");
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && elements.drawer.classList.contains("open")) closeCart();
  });

  elements.priceNotice.textContent = config.avisoPrecios;
  renderCategories();
  renderProducts();
  renderCart();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
