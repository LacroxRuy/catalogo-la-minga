(() => {
  "use strict";

  const config = window.CATALOGO_CONFIG;
  const products = Array.isArray(window.PRODUCTOS) ? window.PRODUCTOS : [];
  const storageKey = "la-minga-cart-v1";
  const noveltyExtensions = ["webp", "jpg", "jpeg", "png"];
  const maxNoveltyImages = 99;

  const state = {
    query: "",
    category: "",
    cart: loadCart(),
    news: [],
    newsLoaded: false,
    currentSlide: 0,
    carouselTimer: null,
    dragging: false,
    dragStartX: 0,
    dragDeltaX: 0,
    newsSessionToken: Date.now(),
    viewerIndex: 0,
    viewerScale: 1,
    viewerX: 0,
    viewerY: 0,
    viewerDragging: false,
    viewerDragStartX: 0,
    viewerDragStartY: 0,
    viewerStartX: 0,
    viewerStartY: 0,
    viewerLastTap: 0
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

  const $ = selector => document.querySelector(selector);

  const elements = {
    catalog: $("#catalogo"),
    news: $("#novedades"),
    showProducts: $("#showProducts"),
    showNews: $("#showNews"),
    newsBackToProducts: $("#newsBackToProducts"),

    grid: $("#productsGrid"),
    empty: $("#emptyState"),
    count: $("#resultCount"),
    search: $("#searchInput"),
    select: $("#categorySelect"),
    chips: $("#categoryChips"),

    newsCount: $("#newsCount"),
    newsLoading: $("#newsLoading"),
    newsEmpty: $("#newsEmpty"),
    carouselShell: $("#carouselShell"),
    carouselViewport: $("#carouselViewport"),
    carouselTrack: $("#carouselTrack"),
    carouselPrev: $("#carouselPrev"),
    carouselNext: $("#carouselNext"),
    carouselDots: $("#carouselDots"),

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
    priceNotice: $("#priceNotice"),
    imageViewer: $("#imageViewer"),
    imageViewerBackdrop: $("#imageViewerBackdrop"),
    imageViewerStage: $("#imageViewerStage"),
    imageViewerImage: $("#imageViewerImage"),
    imageViewerCounter: $("#imageViewerCounter"),
    closeImageViewer: $("#closeImageViewer"),
    zoomOutButton: $("#zoomOutButton"),
    zoomResetButton: $("#zoomResetButton"),
    zoomInButton: $("#zoomInButton"),
    viewerPrev: $("#viewerPrev"),
    viewerNext: $("#viewerNext")
  };

  const money = value =>
    `${config.moneda}${Number(value).toLocaleString("es-UY", {
      maximumFractionDigits: 0
    })}`;

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function productImagePath(product) {
    return `imagenes-productos/productos/${product.imagenId}.webp`;
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
    return getCartRows().reduce(
      (sum, item) => sum + item.precio * item.qty,
      0
    );
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(
      () => elements.toast.classList.remove("show"),
      2300
    );
  }

  function setCategory(category) {
    state.category = category;
    elements.select.value = category;

    [...elements.chips.querySelectorAll("button")].forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === category
      );
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
      const categoryMatches =
        !state.category || product.categoria === state.category;

      const textMatches =
        !query ||
        normalize(`${product.nombre} ${product.categoria}`).includes(query);

      return categoryMatches && textMatches;
    });
  }

  function renderProducts() {
    const visible = filteredProducts();

    elements.grid.innerHTML = "";
    elements.count.textContent =
      `${visible.length} producto${visible.length === 1 ? "" : "s"}`;
    elements.empty.hidden = visible.length !== 0;

    const fragment = document.createDocumentFragment();

    visible.forEach(product => {
      const card = document.createElement("article");
      card.className = "product-card";

      card.innerHTML = `
        ${product.novedad ? '<span class="new-badge">NUEVO</span>' : ""}
        <div class="product-icon">
          <img
            class="product-image"
            src="${productImagePath(product)}"
            alt="${escapeHtml(product.nombre)}"
            loading="lazy"
            decoding="async"
            data-product-image
          >
        </div>
        <span class="product-category">${escapeHtml(product.categoria)}</span>
        <h3>${escapeHtml(product.nombre)}</h3>
        <div class="product-footer">
          <strong class="product-price">${money(product.precio)}</strong>
          <button
            class="add-button"
            type="button"
            data-add="${product.id}"
            aria-label="Agregar ${escapeHtml(product.nombre)}"
          >+</button>
        </div>
      `;

      fragment.appendChild(card);
    });

    elements.grid.appendChild(fragment);
  }

  function showProductsView(scroll = true) {
    elements.news.hidden = true;
    elements.catalog.hidden = false;
    elements.showProducts.classList.add("active");
    elements.showNews.classList.remove("active");
    stopCarouselTimer();

    if (scroll) {
      requestAnimationFrame(() => {
        elements.catalog.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    }
  }

  async function showNewsView() {
    elements.catalog.hidden = true;
    elements.news.hidden = false;
    elements.showProducts.classList.remove("active");
    elements.showNews.classList.add("active");

    if (!state.newsLoaded) {
      await loadNoveltyImages();
    } else {
      startCarouselTimer();
    }

    requestAnimationFrame(() => {
      elements.news.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function probeImage(url) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(url);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function findNoveltyForNumber(number) {
    const sequential = String(number).padStart(2, "0");

    for (const extension of noveltyExtensions) {
      const cleanPath =
        `imagenes-novedades/novedad-${sequential}.${extension}`;
      const checkedPath =
        `${cleanPath}?comprobar=${state.newsSessionToken}`;

      const result = await probeImage(checkedPath);

      if (result) {
        return {
          id: number,
          cleanPath,
          url: checkedPath,
          title: `Noticia u oferta ${number}`
        };
      }
    }

    return null;
  }

  async function loadNoveltyImages() {
    elements.newsLoading.hidden = false;
    elements.newsLoading.style.display = "grid";
    elements.newsEmpty.hidden = true;
    elements.newsEmpty.style.display = "none";
    elements.carouselShell.hidden = true;
    elements.carouselShell.style.display = "none";
    elements.carouselDots.hidden = true;
    elements.carouselDots.style.display = "none";
    elements.newsCount.textContent = "";

    state.news = [];
    state.currentSlide = 0;
    state.newsSessionToken = Date.now();

    for (let number = 1; number <= maxNoveltyImages; number += 1) {
      const item = await findNoveltyForNumber(number);

      /*
        La numeración debe ser consecutiva.
        Si falta novedad-05, se detiene la búsqueda en 04.
      */
      if (!item) break;
      state.news.push(item);
    }

    state.newsLoaded = true;
    elements.newsLoading.hidden = true;
    elements.newsLoading.style.display = "none";

    if (!state.news.length) {
      elements.newsEmpty.hidden = false;
      elements.newsEmpty.style.display = "grid";
      elements.newsCount.textContent = "0 imágenes";
      return;
    }

    elements.newsEmpty.hidden = true;
    elements.newsEmpty.style.display = "none";

    elements.newsCount.textContent =
      `${state.news.length} imagen${state.news.length === 1 ? "" : "es"}`;

    renderCarousel();
  }

  function renderCarousel() {
    elements.carouselTrack.innerHTML = "";
    elements.carouselDots.innerHTML = "";

    state.news.forEach((item, index) => {
      const slide = document.createElement("article");
      slide.className = "promo-slide";
      slide.innerHTML = `
        <button
          class="open-news-image"
          type="button"
          data-open-news="${index}"
          aria-label="Ampliar ${escapeHtml(item.title)}"
          title="Ver en pantalla completa"
        ><span aria-hidden="true">⛶</span> Ampliar</button>
        <img
          src="${item.url}"
          alt="${escapeHtml(item.title)}"
          draggable="false"
          data-open-news="${index}"
        >
      `;
      elements.carouselTrack.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.dataset.slide = index;
      dot.setAttribute("aria-label", `Ver noticia u oferta ${index + 1}`);
      elements.carouselDots.appendChild(dot);
    });

    const multiple = state.news.length > 1;
    elements.carouselPrev.hidden = !multiple;
    elements.carouselNext.hidden = !multiple;
    elements.carouselDots.hidden = !multiple;
    elements.carouselDots.style.display = multiple ? "flex" : "none";
    elements.carouselShell.hidden = false;
    elements.carouselShell.style.display = "block";

    updateCarousel(false);
    startCarouselTimer();
  }

  function updateCarousel(animate = true) {
    const count = state.news.length;
    if (!count) return;

    state.currentSlide = (state.currentSlide + count) % count;

    elements.carouselTrack.style.transition = animate
      ? "transform .42s cubic-bezier(.2,.75,.25,1)"
      : "none";

    elements.carouselTrack.style.transform =
      `translateX(calc(${-state.currentSlide * 100}% + ${state.dragDeltaX}px))`;

    [...elements.carouselDots.children].forEach((dot, index) => {
      dot.classList.toggle("active", index === state.currentSlide);
    });
  }

  function goToSlide(index) {
    state.dragDeltaX = 0;
    state.currentSlide = index;
    updateCarousel(true);
    restartCarouselTimer();
  }

  function startCarouselTimer() {
    stopCarouselTimer();

    if (state.news.length <= 1 || elements.news.hidden) return;

    state.carouselTimer = setInterval(() => {
      goToSlide(state.currentSlide + 1);
    }, 5500);
  }

  function stopCarouselTimer() {
    clearInterval(state.carouselTimer);
    state.carouselTimer = null;
  }

  function restartCarouselTimer() {
    startCarouselTimer();
  }


  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateViewerTransform() {
    const scale = state.viewerScale;
    const maxX = Math.max(0, (elements.imageViewerImage.clientWidth * scale - elements.imageViewerStage.clientWidth) / 2);
    const maxY = Math.max(0, (elements.imageViewerImage.clientHeight * scale - elements.imageViewerStage.clientHeight) / 2);
    state.viewerX = clamp(state.viewerX, -maxX, maxX);
    state.viewerY = clamp(state.viewerY, -maxY, maxY);
    elements.imageViewerImage.style.transform = `translate(${state.viewerX}px, ${state.viewerY}px) scale(${scale})`;
    elements.zoomResetButton.textContent = `${Math.round(scale * 100)}%`;
  }

  function resetViewerZoom() {
    state.viewerScale = 1; state.viewerX = 0; state.viewerY = 0; updateViewerTransform();
  }

  function setViewerZoom(nextScale) {
    state.viewerScale = clamp(nextScale, 1, 5);
    if (state.viewerScale === 1) { state.viewerX = 0; state.viewerY = 0; }
    updateViewerTransform();
  }

  function renderViewerImage() {
    if (!state.news.length) return;
    state.viewerIndex = (state.viewerIndex + state.news.length) % state.news.length;
    const item = state.news[state.viewerIndex];
    elements.imageViewerImage.src = item.url;
    elements.imageViewerImage.alt = item.title;
    elements.imageViewerCounter.textContent = `${state.viewerIndex + 1} / ${state.news.length}`;
    const multiple = state.news.length > 1;
    elements.viewerPrev.hidden = !multiple;
    elements.viewerNext.hidden = !multiple;
    resetViewerZoom();
  }

  function openImageViewer(index) {
    state.viewerIndex = Number(index) || 0;
    renderViewerImage();
    elements.imageViewer.hidden = false;
    elements.imageViewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-viewer-open");
    stopCarouselTimer();
    requestAnimationFrame(() => elements.closeImageViewer.focus());
  }

  function closeImageViewer() {
    elements.imageViewer.hidden = true;
    elements.imageViewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-viewer-open");
    resetViewerZoom();
    if (!elements.news.hidden) startCarouselTimer();
  }

  function changeViewerImage(delta) {
    state.viewerIndex += delta;
    renderViewerImage();
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

    if (next <= 0) {
      delete state.cart[id];
    } else {
      state.cart[id] = next;
    }

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
            <button
              type="button"
              data-change="${item.id}"
              data-delta="-1"
              aria-label="Restar uno"
            >−</button>
            <b>${item.qty}</b>
            <button
              type="button"
              data-change="${item.id}"
              data-delta="1"
              aria-label="Sumar uno"
            >+</button>
          </div>
          <button
            class="remove-button"
            type="button"
            data-remove="${item.id}"
          >Quitar</button>
        </div>
      `;

      elements.cartItems.appendChild(row);
    });

    elements.total.textContent = money(total);

    const missing = Math.max(0, config.compraMinima - total);
    const progress = Math.min(
      100,
      (total / config.compraMinima) * 100
    );

    elements.minProgress.style.width = `${progress}%`;
    elements.minText.textContent =
      missing > 0
        ? "Falta para la compra mínima"
        : "Compra mínima alcanzada";
    elements.minAmount.textContent =
      missing > 0 ? money(missing) : "✓";

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
      item =>
        `• ${item.qty} × ${item.nombre} — ${money(item.precio * item.qty)}`
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
      delivery === "Envío a domicilio"
        ? `Dirección: ${address}`
        : null,
      `Pago: ${payment}`,
      notes ? `Comentarios: ${notes}` : null,
      "",
      "Quedo a la espera de la confirmación. ¡Gracias!"
    ]
      .filter(line => line !== null)
      .join("\n");
  }

  function validateOrder() {
    if (cartTotal() < config.compraMinima) {
      showToast(`La compra mínima es ${money(config.compraMinima)}`);
      return false;
    }

    return elements.orderForm.reportValidity();
  }

  elements.showProducts.addEventListener(
    "click",
    () => showProductsView(true)
  );

  elements.showNews.addEventListener(
    "click",
    () => showNewsView()
  );

  elements.newsBackToProducts.addEventListener(
    "click",
    () => showProductsView(true)
  );

  elements.search.addEventListener("input", event => {
    state.query = event.target.value;
    renderProducts();
  });

  elements.select.addEventListener(
    "change",
    event => setCategory(event.target.value)
  );

  elements.chips.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (button) setCategory(button.dataset.category);
  });

  elements.grid.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (button) addItem(Number(button.dataset.add));
  });

  elements.grid.addEventListener(
    "error",
    event => {
      if (!event.target.matches("[data-product-image]")) return;
      if (event.target.dataset.fallbackApplied === "true") return;

      event.target.dataset.fallbackApplied = "true";
      event.target.src =
        "imagenes-productos/productos/sin-imagen.webp";
    },
    true
  );

  elements.cartItems.addEventListener("click", event => {
    const changeButton = event.target.closest("[data-change]");

    if (changeButton) {
      changeQuantity(
        Number(changeButton.dataset.change),
        Number(changeButton.dataset.delta)
      );
      return;
    }

    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
      removeItem(Number(removeButton.dataset.remove));
    }
  });

  elements.openCart.addEventListener("click", openCart);
  elements.closeCart.addEventListener("click", closeCart);
  elements.backdrop.addEventListener("click", closeCart);

  elements.continueShopping.addEventListener("click", () => {
    closeCart();
    showProductsView(true);
  });

  elements.deliveryType.addEventListener("change", () => {
    const needsAddress =
      elements.deliveryType.value === "Envío a domicilio";

    elements.addressLabel.hidden = !needsAddress;
    elements.customerAddress.required = needsAddress;
  });

  elements.orderForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!validateOrder()) return;

    const url =
      `https://wa.me/${config.whatsapp}` +
      `?text=${encodeURIComponent(buildOrderText())}`;

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

  elements.carouselPrev.addEventListener(
    "click",
    () => goToSlide(state.currentSlide - 1)
  );

  elements.carouselNext.addEventListener(
    "click",
    () => goToSlide(state.currentSlide + 1)
  );

  elements.carouselDots.addEventListener("click", event => {
    const dot = event.target.closest("[data-slide]");
    if (dot) goToSlide(Number(dot.dataset.slide));
  });

  elements.carouselViewport.addEventListener(
    "pointerdown",
    event => {
      if (state.news.length <= 1) return;

      state.dragging = true;
      state.dragStartX = event.clientX;
      state.dragDeltaX = 0;
      elements.carouselViewport.classList.add("dragging");
      elements.carouselViewport.setPointerCapture(event.pointerId);
      stopCarouselTimer();
    }
  );

  elements.carouselViewport.addEventListener(
    "pointermove",
    event => {
      if (!state.dragging) return;

      state.dragDeltaX = event.clientX - state.dragStartX;
      updateCarousel(false);
    }
  );

  function finishCarouselDrag(event) {
    if (!state.dragging) return;

    state.dragging = false;
    elements.carouselViewport.classList.remove("dragging");

    const threshold = Math.min(
      120,
      elements.carouselViewport.clientWidth * .18
    );

    if (state.dragDeltaX < -threshold) {
      state.currentSlide += 1;
    }

    if (state.dragDeltaX > threshold) {
      state.currentSlide -= 1;
    }

    state.dragDeltaX = 0;
    updateCarousel(true);
    restartCarouselTimer();

    if (
      event &&
      elements.carouselViewport.hasPointerCapture(event.pointerId)
    ) {
      elements.carouselViewport.releasePointerCapture(event.pointerId);
    }
  }

  elements.carouselViewport.addEventListener(
    "pointerup",
    finishCarouselDrag
  );

  elements.carouselViewport.addEventListener(
    "pointercancel",
    finishCarouselDrag
  );


  elements.carouselTrack.addEventListener("click", event => {
    const target = event.target.closest("[data-open-news]");
    if (!target) return;
    openImageViewer(Number(target.dataset.openNews));
  });

  elements.closeImageViewer.addEventListener("click", closeImageViewer);
  elements.imageViewerBackdrop.addEventListener("click", closeImageViewer);
  elements.zoomInButton.addEventListener("click", () => setViewerZoom(state.viewerScale + .35));
  elements.zoomOutButton.addEventListener("click", () => setViewerZoom(state.viewerScale - .35));
  elements.zoomResetButton.addEventListener("click", resetViewerZoom);
  elements.viewerPrev.addEventListener("click", () => changeViewerImage(-1));
  elements.viewerNext.addEventListener("click", () => changeViewerImage(1));

  elements.imageViewerStage.addEventListener("wheel", event => {
    event.preventDefault();
    setViewerZoom(state.viewerScale + (event.deltaY < 0 ? .25 : -.25));
  }, { passive: false });

  elements.imageViewerStage.addEventListener("pointerdown", event => {
    const now = Date.now();
    if (now - state.viewerLastTap < 320) {
      setViewerZoom(state.viewerScale > 1 ? 1 : 2.25);
      state.viewerLastTap = 0;
      return;
    }
    state.viewerLastTap = now;
    if (state.viewerScale <= 1) return;
    state.viewerDragging = true;
    state.viewerDragStartX = event.clientX;
    state.viewerDragStartY = event.clientY;
    state.viewerStartX = state.viewerX;
    state.viewerStartY = state.viewerY;
    elements.imageViewerStage.classList.add("dragging");
    elements.imageViewerStage.setPointerCapture(event.pointerId);
  });

  elements.imageViewerStage.addEventListener("pointermove", event => {
    if (!state.viewerDragging) return;
    state.viewerX = state.viewerStartX + (event.clientX - state.viewerDragStartX);
    state.viewerY = state.viewerStartY + (event.clientY - state.viewerDragStartY);
    updateViewerTransform();
  });

  function finishViewerDrag(event) {
    if (!state.viewerDragging) return;
    state.viewerDragging = false;
    elements.imageViewerStage.classList.remove("dragging");
    if (event && elements.imageViewerStage.hasPointerCapture(event.pointerId)) {
      elements.imageViewerStage.releasePointerCapture(event.pointerId);
    }
  }

  elements.imageViewerStage.addEventListener("pointerup", finishViewerDrag);
  elements.imageViewerStage.addEventListener("pointercancel", finishViewerDrag);

  document.addEventListener("keydown", event => {
    if (!elements.imageViewer.hidden) {
      if (event.key === "Escape") { closeImageViewer(); return; }
      if (event.key === "ArrowLeft") { changeViewerImage(-1); return; }
      if (event.key === "ArrowRight") { changeViewerImage(1); return; }
      if (event.key === "+" || event.key === "=") { setViewerZoom(state.viewerScale + .35); return; }
      if (event.key === "-") { setViewerZoom(state.viewerScale - .35); return; }
      if (event.key === "0") { resetViewerZoom(); return; }
    }
    if (event.key === "Escape" && elements.drawer.classList.contains("open")) {
      closeCart();
    }
  });

  window.addEventListener(
    "resize",
    () => updateCarousel(false)
  );

  elements.priceNotice.textContent = config.avisoPrecios;

  renderCategories();
  renderProducts();
  renderCart();
  showProductsView(false);

  if (
    "serviceWorker" in navigator &&
    location.protocol.startsWith("http")
  ) {
    navigator.serviceWorker
      .register("sw.js?v=11", { updateViaCache: "none" })
      .then(registration => registration.update())
      .catch(() => {});
  }
})();
