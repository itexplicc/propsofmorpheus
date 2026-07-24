(function () {
  "use strict";
  const scriptBase = document.currentScript ? new URL("./", document.currentScript.src) : new URL("assets/js/", window.location.href);
  if (!document.getElementById("tintech-admin-v5-style")) {
    const link = document.createElement("link");
    link.id = "tintech-admin-v5-style";
    link.rel = "stylesheet";
    link.href = new URL("../css/admin-v5.css", scriptBase).href;
    document.head.appendChild(link);
  }
  if (!document.getElementById("tintech-admin-v5")) {
    const script = document.createElement("script");
    script.id = "tintech-admin-v5";
    script.src = new URL("admin-v5.js", scriptBase).href;
    script.async = false;
    document.head.appendChild(script);
  }
})();

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
