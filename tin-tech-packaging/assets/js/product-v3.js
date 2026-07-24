document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const mount = document.querySelector("[data-product-detail]");
  if (!mount) return;
  const slug = new URLSearchParams(window.location.search).get("slug") || "";

  function groupLabel(type) {
    return ({ color: "Color", print: "Print", finish: "Finish", style: "Style" })[type] || "Option";
  }

  function galleryImages(product, variant) {
    if (variant?.images?.length) return variant.images;
    if (product.images?.length) return product.images;
    return [{ image_url: "assets/images/product-placeholder.svg", alt_text: product.name }];
  }

  function safeCssUrl(url) {
    return `url("${TinTechAPI.resolveImage(url).replace(/"/g, "%22")}")`;
  }

  function specs(product) {
    const rows = [
      ["SKU / reference", product.sku],
      ["MOQ", product.moq],
      ["Dimensions", product.dimensions],
      ["Material", product.material],
      ["Lead time", product.lead_time],
    ];
    Object.entries(product.technical_data || {}).forEach(([key, value]) => rows.push([key, value]));
    return rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim());
  }

  function render(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let activeVariant = variants.find((variant) => variant.is_default) || variants[0] || null;
    let activeImages = galleryImages(product, activeVariant);
    let activeImageIndex = 0;

    const variantGroups = variants.reduce((groups, variant) => {
      const type = variant.variant_type || "color";
      if (!groups[type]) groups[type] = [];
      groups[type].push(variant);
      return groups;
    }, {});

    mount.innerHTML = `
      <div class="product-v3-grid">
        <div class="product-gallery-v3">
          <div class="product-main-media" data-main-media>
            <img data-main-image src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(activeImages[0]?.image_url))}" alt="${TinTechAPI.escapeHTML(activeImages[0]?.alt_text || product.name)}">
            <span class="product-image-counter" data-image-counter></span>
          </div>
          <div class="product-thumbnails" data-thumbnails></div>
        </div>
        <article class="product-v3-info">
          <span class="category-pill">${TinTechAPI.escapeHTML(product.category?.name || "Custom manufacturing")}</span>
          <h1>${TinTechAPI.escapeHTML(product.name)}</h1>
          <p class="product-v3-lead">${TinTechAPI.escapeHTML(product.short_description || "Developed around the approved specification, volume, finish and supply program.")}</p>
          <div class="product-commercial-grid">
            <div class="product-commercial-card"><span>Pricing guidance</span><strong>${TinTechAPI.escapeHTML(TinTechAPI.formatPrice(product))}</strong></div>
            <div class="product-commercial-card"><span>Minimum order</span><strong>${TinTechAPI.escapeHTML(product.moq || "Confirmed by project")}</strong></div>
          </div>
          ${variants.length ? `
            <div class="variant-groups" data-variant-groups>
              ${Object.entries(variantGroups).map(([type, items]) => `
                <div class="variant-group">
                  <div class="variant-group-head"><strong>Select ${groupLabel(type)}</strong><span>${items.length} available</span></div>
                  <div class="variant-options">
                    ${items.map((variant) => {
                      const swatchStyle = variant.swatch_image_url
                        ? `background-image:${safeCssUrl(variant.swatch_image_url)}`
                        : `--swatch:${TinTechAPI.escapeHTML(variant.color_hex || "#dce5eb")}`;
                      return `<button class="variant-option ${activeVariant?.id === variant.id ? "active" : ""}" type="button" data-variant-id="${variant.id}" aria-pressed="${activeVariant?.id === variant.id}"><span class="variant-swatch" style="${swatchStyle}"></span><span>${TinTechAPI.escapeHTML(variant.label)}</span></button>`;
                    }).join("")}
                  </div>
                </div>`).join("")}
              <div class="variant-selection-note" data-variant-note></div>
            </div>` : ""}
          <div class="product-description-v3">${TinTechAPI.escapeHTML(product.description || "The final product specification, decoration, packing and delivery plan are confirmed before production approval.")}</div>
          <div class="product-specs-v3">
            ${specs(product).map(([key, value]) => `<div class="product-spec-row"><span>${TinTechAPI.escapeHTML(key)}</span><strong>${TinTechAPI.escapeHTML(value)}</strong></div>`).join("")}
          </div>
          <div class="product-actions-v3">
            <a class="button button-primary" data-product-inquiry href="contact.html">Request project review →</a>
            <a class="button button-ghost" href="portfolio.html">Back to portfolio</a>
          </div>
        </article>
      </div>`;

    const mainMedia = mount.querySelector("[data-main-media]");
    const mainImage = mount.querySelector("[data-main-image]");
    const thumbnails = mount.querySelector("[data-thumbnails]");
    const counter = mount.querySelector("[data-image-counter]");
    const note = mount.querySelector("[data-variant-note]");
    const inquiry = mount.querySelector("[data-product-inquiry]");

    function updateInquiry() {
      const params = new URLSearchParams({ product: product.name });
      if (activeVariant?.label) params.set("variant", `${groupLabel(activeVariant.variant_type)}: ${activeVariant.label}`);
      inquiry.href = `contact.html?${params.toString()}`;
    }

    function showImage(index) {
      if (!activeImages.length) return;
      activeImageIndex = Math.min(activeImages.length - 1, Math.max(0, index));
      const image = activeImages[activeImageIndex];
      mainMedia.classList.add("is-changing");
      window.setTimeout(() => {
        mainImage.src = TinTechAPI.resolveImage(image.image_url);
        mainImage.alt = image.alt_text || `${product.name}${activeVariant ? ` - ${activeVariant.label}` : ""}`;
        mainMedia.classList.remove("is-changing");
      }, 90);
      counter.textContent = `${activeImageIndex + 1} / ${activeImages.length}`;
      thumbnails.querySelectorAll(".product-thumb").forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === activeImageIndex));
    }

    function renderThumbnails() {
      thumbnails.innerHTML = activeImages.map((image, index) => `
        <button class="product-thumb ${index === 0 ? "active" : ""}" type="button" data-image-index="${index}" aria-label="View image ${index + 1}">
          <img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}" alt="" loading="lazy">
        </button>`).join("");
      thumbnails.hidden = activeImages.length < 2;
      showImage(0);
    }

    function selectVariant(id) {
      const variant = variants.find((item) => item.id === id);
      if (!variant) return;
      activeVariant = variant;
      activeImages = galleryImages(product, variant);
      mount.querySelectorAll("[data-variant-id]").forEach((button) => {
        const selected = button.dataset.variantId === id;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      if (note) note.textContent = `${groupLabel(variant.variant_type)} selected: ${variant.label}${variant.value ? ` · ${variant.value}` : ""}`;
      renderThumbnails();
      updateInquiry();
    }

    thumbnails.addEventListener("click", (event) => {
      const button = event.target.closest("[data-image-index]");
      if (button) showImage(Number(button.dataset.imageIndex));
    });
    mount.querySelector("[data-variant-groups]")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-variant-id]");
      if (button) selectVariant(button.dataset.variantId);
    });

    if (note && activeVariant) note.textContent = `${groupLabel(activeVariant.variant_type)} selected: ${activeVariant.label}${activeVariant.value ? ` · ${activeVariant.value}` : ""}`;
    renderThumbnails();
    updateInquiry();
    document.title = `${product.seo_title || product.name} | Tin Tech Packaging`;
    const description = document.querySelector('meta[name="description"]');
    if (description && (product.seo_description || product.short_description)) description.content = product.seo_description || product.short_description;
  }

  if (!slug) {
    mount.innerHTML = `<div class="product-error-panel"><h2>Choose a product from the portfolio.</h2><p>No product was selected.</p><a class="button button-primary" href="portfolio.html">Open portfolio</a></div>`;
    return;
  }

  try {
    const result = await TinTechAPI.getProduct(slug);
    render(result.product);
  } catch (error) {
    console.error("Tin Tech product", error);
    mount.innerHTML = `<div class="product-error-panel"><h2>Product unavailable</h2><p>${TinTechAPI.escapeHTML(error.message || "This product could not be loaded.")}</p><a class="button button-primary" href="portfolio.html">Back to portfolio</a></div>`;
  }
});
