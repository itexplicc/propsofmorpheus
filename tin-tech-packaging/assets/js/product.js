document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-product-detail]");
  if (!root || !window.TinTechAPI) return;

  const slug = new URLSearchParams(window.location.search).get("slug") || "";
  if (!slug) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>Select a product from the portfolio.</h3>
        <p>This page needs a product reference.</p>
        <a class="button button-dark" href="portfolio.html">View portfolio</a>
      </div>`;
    return;
  }

  function galleryHTML(product) {
    const images = product.images?.length
      ? product.images
      : [{ image_url: "./assets/images/product-placeholder.svg", alt_text: product.name }];

    const main = images[0];
    const thumbs = images.length > 1
      ? `<div class="gallery-thumbs">${images.map((image, index) => `
          <button class="gallery-thumb ${index === 0 ? "active" : ""}" type="button"
            data-gallery-image="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}"
            data-gallery-alt="${TinTechAPI.escapeHTML(image.alt_text || product.name)}">
            <img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}" alt="">
          </button>`).join("")}</div>`
      : "";

    return `
      <div class="product-gallery">
        <div class="gallery-main">
          <img data-gallery-main src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(main.image_url))}" alt="${TinTechAPI.escapeHTML(main.alt_text || product.name)}">
        </div>
        ${thumbs}
      </div>`;
  }

  function specsHTML(product) {
    const rows = [
      ["Category", product.category?.name],
      ["SKU / reference", product.sku],
      ["Pricing", TinTechAPI.formatPrice(product)],
      ["MOQ", product.moq],
      ["Dimensions", product.dimensions],
      ["Material", product.material],
      ["Lead time", product.lead_time],
    ];

    Object.entries(product.technical_data || {}).forEach(([key, value]) => rows.push([key, value]));

    return rows
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
      .map(([label, value]) =>
        `<tr><th>${TinTechAPI.escapeHTML(label)}</th><td>${TinTechAPI.escapeHTML(value)}</td></tr>`
      ).join("");
  }

  try {
    const [{ product }, catalog] = await Promise.all([
      TinTechAPI.getProduct(slug),
      TinTechAPI.catalog(),
    ]);

    document.title = product.seo_title || `${product.name} | Tin Tech Packaging`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", product.seo_description || product.short_description || "Tin Tech product details.");

    const related = catalog.products
      .filter((item) => item.slug !== product.slug && item.category_id === product.category_id)
      .slice(0, 3);

    root.innerHTML = `
      <div class="product-detail-grid">
        ${galleryHTML(product)}
        <div class="product-info">
          <span class="eyebrow">${TinTechAPI.escapeHTML(product.category?.name || "Custom manufacturing")}</span>
          <h1>${TinTechAPI.escapeHTML(product.name)}</h1>
          <p class="product-summary">${TinTechAPI.escapeHTML(product.short_description || "")}</p>
          <div class="product-quick">
            <div class="quick-card"><span>Pricing</span><strong>${TinTechAPI.escapeHTML(TinTechAPI.formatPrice(product))}</strong></div>
            <div class="quick-card"><span>Minimum order</span><strong>${TinTechAPI.escapeHTML(product.moq || "Confirmed by project")}</strong></div>
            <div class="quick-card"><span>Dimensions</span><strong>${TinTechAPI.escapeHTML(product.dimensions || "Made to specification")}</strong></div>
            <div class="quick-card"><span>Lead time</span><strong>${TinTechAPI.escapeHTML(product.lead_time || "Confirmed after review")}</strong></div>
          </div>
          <div class="product-description">${String(product.description || "").split(/\n+/).filter(Boolean).map((paragraph) => `<p>${TinTechAPI.escapeHTML(paragraph)}</p>`).join("")}</div>
          <table class="spec-table" aria-label="Product technical information"><tbody>${specsHTML(product)}</tbody></table>
          <div class="product-actions">
            <a class="button button-dark" href="contact.html?product=${encodeURIComponent(product.name)}">Request pricing and review</a>
            <a class="button button-outline" href="portfolio.html">Back to portfolio</a>
          </div>
        </div>
      </div>
      ${related.length ? `
        <div class="related-products">
          <div class="section-heading">
            <div><span class="eyebrow">Related capability</span><h2>More in this category.</h2></div>
          </div>
          <div class="product-grid">${related.map(TinTechAPI.productCard).join("")}</div>
        </div>` : ""}`;

    root.addEventListener("click", (event) => {
      const thumb = event.target.closest("[data-gallery-image]");
      if (!thumb) return;
      root.querySelectorAll(".gallery-thumb").forEach((button) => button.classList.remove("active"));
      thumb.classList.add("active");
      const main = root.querySelector("[data-gallery-main]");
      main.src = thumb.dataset.galleryImage;
      main.alt = thumb.dataset.galleryAlt || product.name;
    });
  } catch (error) {
    console.error(error);
    root.innerHTML = `
      <div class="empty-state">
        <h3>Product not found.</h3>
        <p>The product may have been unpublished or the link may be incorrect.</p>
        <a class="button button-dark" href="portfolio.html">View full portfolio</a>
      </div>`;
  }
});
