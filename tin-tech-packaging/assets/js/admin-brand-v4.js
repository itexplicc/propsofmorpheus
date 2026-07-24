document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  if (!window.TinTechAPI) return;
  try {
    const bundle = await window.TinTechAPI.siteContent();
    const defaults = window.TinTechContentDefaults || {};
    const brand = { ...(defaults.brand || {}), ...(bundle.site_content?.brand || {}) };
    document.querySelectorAll(".admin-brand, .login-brand").forEach((container) => {
      const image = container.querySelector("img");
      const label = container.querySelector("strong, span");
      if (image) {
        image.src = window.TinTechAPI.resolveImage(brand.logo_url || "tin-tech-logo.svg");
        image.alt = brand.logo_alt || brand.company_name || "Tin Tech Packaging";
      }
      if (label) label.textContent = brand.company_name || "TIN TECH PACKAGING";
    });
    const favicon = document.querySelector('link[rel~="icon"]');
    if (favicon) favicon.href = window.TinTechAPI.resolveImage(brand.favicon_url || brand.logo_url || "tin-tech-logo.svg");
  } catch (error) {
    console.warn("Tin Tech admin brand", error);
  }
});