document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const bundle = await (window.TinTechCMS?.ready || Promise.resolve({ content: window.TinTechContentDefaults || {} }));
  const content = bundle.content || window.TinTechContentDefaults || {};
  const email = content.contact?.email || "";
  const company = content.brand?.company_name || "Tin Tech Packaging";
  document.querySelectorAll("[data-cms-contact-email]").forEach((element) => {
    element.textContent = email;
    if (element.tagName === "A") element.href = email ? `mailto:${email}` : "contact.html";
  });
  document.querySelectorAll("[data-cms-company-name]").forEach((element) => { element.textContent = company; });
});