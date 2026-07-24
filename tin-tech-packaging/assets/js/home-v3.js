document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const heroImage = document.querySelector("[data-managed-hero-image]");
  const factoryMedia = document.querySelector("[data-managed-factory]");
  const featuredGrid = document.querySelector("[data-featured-products]");

  function applySettings(settings = {}) {
    if (heroImage) {
      if (settings.hero_image_url) {
        heroImage.src = TinTechAPI.resolveImage(settings.hero_image_url);
        heroImage.alt = settings.hero_alt_text || "Tin Tech Packaging manufacturing and product development";
      }
      heroImage.style.objectPosition = settings.hero_position || "center center";
    }

    if (factoryMedia) {
      const height = Math.min(900, Math.max(280, Number(settings.factory_height) || 520));
      factoryMedia.style.setProperty("--factory-height", `${height}px`);
      factoryMedia.style.setProperty("--factory-position", settings.factory_position || "center center");
      if (settings.factory_image_url) {
        const resolved = TinTechAPI.resolveImage(settings.factory_image_url).replace(/"/g, "%22");
        factoryMedia.style.setProperty("--factory-image", `url("${resolved}")`);
        factoryMedia.setAttribute("role", "img");
        factoryMedia.setAttribute("aria-label", settings.factory_alt_text || "Tin Tech Packaging manufacturing facility");
      } else {
        factoryMedia.style.removeProperty("--factory-image");
        factoryMedia.removeAttribute("role");
        factoryMedia.removeAttribute("aria-label");
      }
    }
  }

  function renderFeatured(products = []) {
    if (!featuredGrid) return;
    const selected = products.filter((product) => product.is_featured).slice(0, 3);
    const items = selected.length ? selected : products.slice(0, 3);
    featuredGrid.innerHTML = items.length
      ? items.map(TinTechAPI.productCard).join("")
      : `<div class="empty-panel" style="grid-column:1/-1"><h3>Portfolio being prepared</h3><p>Use the project brief to discuss a custom product while published listings are being added.</p></div>`;
  }

  try {
    const [settingsResult, catalogResult] = await Promise.all([
      TinTechAPI.siteSettings(),
      TinTechAPI.catalog(),
    ]);
    applySettings(settingsResult.site_settings || {});
    renderFeatured(catalogResult.products || []);
  } catch (error) {
    console.error("Tin Tech homepage", error);
    renderFeatured([]);
  }
});
