document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "tintech_admin_session";
  const defaults = window.TinTechContentDefaults || {};
  const defaultSlides = window.TinTechDefaultHeroSlides || [];
  const root = document.getElementById("cms-editor-root");
  const saveButton = document.getElementById("cms-save-all");
  if (!root || !saveButton || !window.TinTechAPI) return;

  const state = {
    loaded: false,
    loading: false,
    content: structuredClone(defaults),
    slides: structuredClone(defaultSlides),
    activePanel: "slides",
    dirty: false,
  };

  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const clone = (value) => structuredClone(value ?? null);

  function merge(base, override) {
    if (override === undefined) return clone(base);
    if (Array.isArray(base)) return Array.isArray(override) ? clone(override) : clone(base);
    if (base && typeof base === "object") {
      const result = {};
      const source = override && typeof override === "object" && !Array.isArray(override) ? override : {};
      Object.keys(base).forEach((key) => { result[key] = merge(base[key], source[key]); });
      Object.keys(source).forEach((key) => { if (!(key in result)) result[key] = clone(source[key]); });
      return result;
    }
    return override;
  }

  function toast(message, type = "") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 5200);
  }

  function pathParts(path) {
    return String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  }
  function getPath(path) {
    return pathParts(path).reduce((value, part) => value?.[part], state.content);
  }
  function setPath(path, value) {
    const parts = pathParts(path);
    let cursor = state.content;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value;
      else {
        const nextIsIndex = /^\d+$/.test(parts[index + 1]);
        if (cursor[part] === undefined || cursor[part] === null) cursor[part] = nextIsIndex ? [] : {};
        cursor = cursor[part];
      }
    });
    markDirty();
  }

  function markDirty() {
    state.dirty = true;
    saveButton.textContent = "Publish website changes";
    saveButton.classList.add("cms-dirty");
  }
  function markClean() {
    state.dirty = false;
    saveButton.textContent = "Website is up to date";
    saveButton.classList.remove("cms-dirty");
    setTimeout(() => { if (!state.dirty) saveButton.textContent = "Publish website changes"; }, 1800);
  }

  const linkField = (path, label, help = "One per line: Label | URL") => ({ path, label, type: "links", help });
  const linesField = (path, label, help = "One item per line") => ({ path, label, type: "lines", help });
  const textField = (path, label, help = "") => ({ path, label, type: "text", help });
  const areaField = (path, label, help = "") => ({ path, label, type: "textarea", help });
  const urlField = (path, label) => ({ path, label, type: "url" });
  const checkboxField = (path, label) => ({ path, label, type: "checkbox" });
  const repeater = (path, label, itemLabel, itemFields, help = "") => ({ path, label, type: "repeater", itemLabel, itemFields, help });

  const PANELS = [
    { id: "slides", label: "Hero slideshow", custom: true },
    {
      id: "brand", label: "Brand & contact", groups: [
        { title: "Brand identity", fields: [
          textField("brand.company_name", "Company name"),
          textField("brand.short_name", "Short company name"),
          areaField("brand.tagline", "Company tagline / footer description"),
          textField("brand.logo_alt", "Logo description"),
          { type: "image", label: "Primary logo", urlPath: "brand.logo_url", storagePath: "brand.logo_storage_path", folder: "brand" },
          { type: "image", label: "Light logo for dark backgrounds", urlPath: "brand.logo_light_url", storagePath: "brand.logo_light_storage_path", folder: "brand" },
          { type: "image", label: "Browser favicon", urlPath: "brand.favicon_url", storagePath: "brand.favicon_storage_path", folder: "brand" },
        ] },
        { title: "Contact and company details", fields: [
          textField("contact.email", "Public email address"),
          textField("contact.phone", "Phone number"),
          urlField("contact.whatsapp", "WhatsApp link"),
          textField("contact.commercial_contact_name", "Commercial contact name"),
          textField("contact.commercial_contact_role", "Commercial contact role"),
          areaField("contact.sri_lanka_address", "Sri Lanka address / operation detail"),
          areaField("contact.new_york_address", "New York address / operation detail"),
          textField("contact.operating_points", "Operating-points summary"),
          textField("contact.typical_inputs", "Typical project inputs"),
          repeater("contact.social_links", "Social links", "Social link", [
            { key: "label", label: "Label", type: "text" },
            { key: "url", label: "URL", type: "url" },
          ])
        ] }
      ]
    },
    {
      id: "navigation", label: "Header & footer", groups: [
        { title: "Header navigation", fields: [
          linkField("navigation.items", "Navigation links"),
          textField("navigation.cta_label", "Header button label"),
          urlField("navigation.cta_url", "Header button URL")
        ] },
        { title: "Footer", fields: [
          areaField("footer.description", "Footer company description"),
          repeater("footer.columns", "Footer link columns", "Footer column", [
            { key: "title", label: "Column title", type: "text" },
            { key: "links", label: "Links", type: "links", help: "Label | URL" }
          ]),
          textField("footer.contact_title", "Contact column title"),
          textField("footer.project_brief_label", "Project brief link label"),
          textField("footer.admin_label", "Admin link label"),
          textField("footer.copyright", "Copyright line", "Use {year} where the current year should appear."),
          linkField("footer.legal_links", "Legal links")
        ] }
      ]
    },
    {
      id: "home", label: "Homepage", groups: [
        { title: "Slideshow behaviour & factory story", fields: [
          checkboxField("home.hero_autoplay", "Automatically rotate hero slides"),
          checkboxField("home.hero_pause_on_hover", "Pause slideshow on hover or keyboard focus"),
          textField("home.factory.eyebrow", "Factory section eyebrow"),
          textField("home.factory.title", "Factory section title"),
          areaField("home.factory.description", "Factory section description"),
          textField("home.factory.note", "Factory image note")
        ] },
        { title: "Proof numbers", fields: [
          areaField("home.proof_intro", "Proof-strip introduction"),
          repeater("home.proof_items", "Proof figures", "Proof figure", [
            { key: "value", label: "Number / value", type: "text" },
            { key: "label", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "What Tin Tech does", fields: [
          textField("home.intro.eyebrow", "Eyebrow"),
          textField("home.intro.title", "Section title"),
          areaField("home.intro.description", "Section description"),
          textField("home.intro.statement_kicker", "Feature-card kicker"),
          textField("home.intro.statement_title", "Feature-card title"),
          areaField("home.intro.statement_text", "Feature-card description"),
          textField("home.intro.button_label", "Feature-card button"),
          urlField("home.intro.button_url", "Feature-card button URL"),
          repeater("home.intro.cards", "Capability cards", "Card", [
            { key: "icon", label: "Icon / number", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "text", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "Portfolio preview", fields: [
          textField("home.portfolio.eyebrow", "Eyebrow"), textField("home.portfolio.title", "Title"),
          areaField("home.portfolio.description", "Description"), textField("home.portfolio.button_label", "Button label"),
          urlField("home.portfolio.button_url", "Button URL"), textField("home.portfolio.empty_title", "Empty-state title"),
          areaField("home.portfolio.empty_text", "Empty-state description")
        ] },
        { title: "Process", fields: [
          textField("home.process.eyebrow", "Eyebrow"), textField("home.process.title", "Title"), areaField("home.process.description", "Description"),
          repeater("home.process.steps", "Process steps", "Step", [
            { key: "title", label: "Step title", type: "text" }, { key: "text", label: "Step description", type: "textarea" }
          ])
        ] },
        { title: "Testimonial", fields: [
          repeater("home.testimonial.stats", "Testimonial figures", "Figure", [
            { key: "value", label: "Value", type: "text" }, { key: "label", label: "Description", type: "textarea" }
          ]),
          textField("home.testimonial.eyebrow", "Eyebrow"), textField("home.testimonial.title", "Title"),
          areaField("home.testimonial.quote", "Full testimonial"), textField("home.testimonial.author", "Attribution"),
          textField("home.testimonial.author_note", "Attribution note"), textField("home.testimonial.badge", "Badge")
        ] },
        { title: "Scale and final calls to action", fields: [
          textField("home.scale.eyebrow", "Scale-section eyebrow"), textField("home.scale.title", "Scale-section title"),
          areaField("home.scale.description", "Scale-section description"), textField("home.scale.cta_kicker", "Scale CTA kicker"),
          textField("home.scale.cta_title", "Scale CTA title"), areaField("home.scale.cta_text", "Scale CTA text"),
          textField("home.scale.button_label", "Scale CTA button"), urlField("home.scale.button_url", "Scale CTA URL"),
          textField("home.final_cta.kicker", "Final CTA kicker"), textField("home.final_cta.title", "Final CTA title"),
          areaField("home.final_cta.text", "Final CTA text"), textField("home.final_cta.button_label", "Final CTA button"),
          urlField("home.final_cta.button_url", "Final CTA URL")
        ] }
      ]
    },
    {
      id: "company", label: "Company page", groups: [
        { title: "Page introduction", fields: [
          textField("about.hero.kicker", "Kicker"), textField("about.hero.title", "Title"), areaField("about.hero.description", "Description"),
          textField("about.hero.aside_title", "Side-card title"), areaField("about.hero.aside_text", "Side-card text")
        ] },
        { title: "Company and operating approach", fields: [
          textField("about.company.statement_kicker", "Statement kicker"), textField("about.company.statement_title", "Statement title"),
          areaField("about.company.statement_text", "Statement text"), textField("about.company.button_label", "Button label"),
          urlField("about.company.button_url", "Button URL"), textField("about.company.eyebrow", "Operating eyebrow"),
          textField("about.company.title", "Operating title"), linesField("about.company.paragraphs", "Operating paragraphs"),
          repeater("about.company.metrics", "Company metrics", "Metric", [
            { key: "value", label: "Value", type: "text" }, { key: "label", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "Values", fields: [
          textField("about.values.eyebrow", "Eyebrow"), textField("about.values.title", "Title"), areaField("about.values.description", "Description"),
          repeater("about.values.cards", "Value cards", "Value", [
            { key: "icon", label: "Icon / number", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "Track record and pathway", fields: [
          textField("about.track.eyebrow", "Track-record eyebrow"), textField("about.track.title", "Track-record title"), areaField("about.track.description", "Track-record description"),
          textField("about.pathway.eyebrow", "Pathway eyebrow"), textField("about.pathway.title", "Pathway title"), areaField("about.pathway.description", "Pathway description"),
          textField("about.pathway.kicker", "Pathway CTA kicker"), textField("about.pathway.cta_title", "Pathway CTA title"),
          areaField("about.pathway.cta_text", "Pathway CTA text"), textField("about.pathway.button_label", "Button label"), urlField("about.pathway.button_url", "Button URL")
        ] }
      ]
    },
    {
      id: "capabilities", label: "Capabilities page", groups: [
        { title: "Page introduction", fields: [
          textField("capabilities.hero.kicker", "Kicker"), textField("capabilities.hero.title", "Title"), areaField("capabilities.hero.description", "Description"),
          textField("capabilities.hero.aside_title", "Side-card title"), areaField("capabilities.hero.aside_text", "Side-card text")
        ] },
        { title: "Capability stack", fields: [
          textField("capabilities.stack.eyebrow", "Eyebrow"), textField("capabilities.stack.title", "Title"), areaField("capabilities.stack.description", "Description"),
          repeater("capabilities.stack.cards", "Capabilities", "Capability", [
            { key: "number", label: "Number / stage", type: "text" }, { key: "title", label: "Title", type: "text" },
            { key: "text", label: "Description", type: "textarea" }, { key: "bullets", label: "Bullet points", type: "lines" }
          ])
        ] },
        { title: "Project flow", fields: [
          textField("capabilities.process.eyebrow", "Eyebrow"), textField("capabilities.process.title", "Title"), areaField("capabilities.process.description", "Description"),
          repeater("capabilities.process.steps", "Process steps", "Step", [
            { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "Markets and applications", fields: [
          textField("capabilities.markets.eyebrow", "Eyebrow"), textField("capabilities.markets.title", "Title"), areaField("capabilities.markets.description", "Description"),
          repeater("capabilities.markets.cards", "Market cards", "Market", [
            { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }
          ])
        ] },
        { title: "Compliance note and CTA", fields: [
          textField("capabilities.note.eyebrow", "Note eyebrow"), textField("capabilities.note.title", "Note title"), linesField("capabilities.note.paragraphs", "Note paragraphs"),
          textField("capabilities.cta.kicker", "CTA kicker"), textField("capabilities.cta.title", "CTA title"), areaField("capabilities.cta.text", "CTA description"),
          textField("capabilities.cta.button_label", "CTA button"), urlField("capabilities.cta.button_url", "CTA URL")
        ] }
      ]
    },
    {
      id: "portfolio", label: "Portfolio & product pages", groups: [
        { title: "Portfolio page", fields: [
          textField("portfolio.hero_kicker", "Kicker"), textField("portfolio.hero_title", "Title"), areaField("portfolio.hero_description", "Description"),
          textField("portfolio.aside_title", "Side-card title"), areaField("portfolio.aside_text", "Side-card text"),
          textField("portfolio.search_placeholder", "Search placeholder"), textField("portfolio.cta_kicker", "CTA kicker"),
          textField("portfolio.cta_title", "CTA title"), areaField("portfolio.cta_text", "CTA text"),
          textField("portfolio.cta_button_label", "CTA button"), urlField("portfolio.cta_button_url", "CTA URL")
        ] },
        { title: "Product detail page", fields: [
          textField("product_page.kicker", "Page kicker"), areaField("product_page.intro", "Page introduction"), textField("product_page.request_label", "Request button label")
        ] }
      ]
    },
    {
      id: "contact", label: "Contact page & form", groups: [
        { title: "Page introduction", fields: [
          textField("contact_page.hero.kicker", "Kicker"), textField("contact_page.hero.title", "Title"), areaField("contact_page.hero.description", "Description"),
          textField("contact_page.hero.aside_title", "Side-card title"), areaField("contact_page.hero.aside_text", "Side-card text")
        ] },
        { title: "Contact panel", fields: [
          textField("contact_page.panel.kicker", "Kicker"), textField("contact_page.panel.title", "Title"), areaField("contact_page.panel.text", "Description"),
          textField("contact_page.panel.email_label", "Email label"), textField("contact_page.panel.operating_label", "Operating-points label"), textField("contact_page.panel.inputs_label", "Inputs label")
        ] },
        { title: "Inquiry form", fields: [
          textField("contact_page.form.name_label", "Name label"), textField("contact_page.form.company_label", "Company label"),
          textField("contact_page.form.email_label", "Email label"), textField("contact_page.form.phone_label", "Phone label"),
          textField("contact_page.form.project_type_label", "Project-type label"), linesField("contact_page.form.project_types", "Project-type options"),
          textField("contact_page.form.quantity_label", "Quantity label"), textField("contact_page.form.quantity_placeholder", "Quantity placeholder"),
          textField("contact_page.form.destination_label", "Destination label"), textField("contact_page.form.destination_placeholder", "Destination placeholder"),
          textField("contact_page.form.message_label", "Message label"), areaField("contact_page.form.message_placeholder", "Message placeholder"),
          textField("contact_page.form.submit_label", "Submit button"), textField("contact_page.form.sending_label", "Sending button"),
          areaField("contact_page.form.success_message", "Success message"), areaField("contact_page.form.error_message", "Error message"), areaField("contact_page.form.privacy_note", "Privacy note")
        ] },
        { title: "Before-you-send cards", fields: [
          textField("contact_page.before_send.eyebrow", "Eyebrow"), textField("contact_page.before_send.title", "Title"),
          repeater("contact_page.before_send.cards", "Information cards", "Card", [
            { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }
          ])
        ] }
      ]
    },
    {
      id: "seo", label: "Page titles & SEO", groups: [
        { title: "Search titles and descriptions", fields: [
          textField("seo.home.title", "Home page title"), areaField("seo.home.description", "Home description"),
          textField("seo.about.title", "Company page title"), areaField("seo.about.description", "Company description"),
          textField("seo.capabilities.title", "Capabilities page title"), areaField("seo.capabilities.description", "Capabilities description"),
          textField("seo.portfolio.title", "Portfolio page title"), areaField("seo.portfolio.description", "Portfolio description"),
          textField("seo.contact.title", "Contact page title"), areaField("seo.contact.description", "Contact description"),
          textField("seo.product.title", "Product page title"), areaField("seo.product.description", "Product description")
        ] }
      ]
    }
  ];

  function toLines(value) { return Array.isArray(value) ? value.join("\n") : ""; }
  function fromLines(value) { return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
  function toLinks(value) { return Array.isArray(value) ? value.map((item) => `${item.label || ""} | ${item.url || ""}`).join("\n") : ""; }
  function fromLinks(value) {
    return String(value || "").split(/\r?\n/).map((line) => {
      const [label, ...rest] = line.split("|");
      return { label: (label || "").trim(), url: rest.join("|").trim() };
    }).filter((item) => item.label || item.url);
  }

  function inputHTML(field, value, path, indexContext = "") {
    const id = `cms-${(path || field.urlPath || Math.random()).replace(/[^a-z0-9]+/gi, "-")}-${indexContext}`;
    const help = field.help ? `<small>${esc(field.help)}</small>` : "";
    if (field.type === "textarea") return `<label class="cms-field cms-span-2"><span>${esc(field.label)}</span><textarea id="${id}" data-cms-path="${esc(path)}">${esc(value)}</textarea>${help}</label>`;
    if (field.type === "lines") return `<label class="cms-field cms-span-2"><span>${esc(field.label)}</span><textarea id="${id}" data-cms-path="${esc(path)}" data-cms-type="lines">${esc(toLines(value))}</textarea>${help}</label>`;
    if (field.type === "links") return `<label class="cms-field cms-span-2"><span>${esc(field.label)}</span><textarea id="${id}" data-cms-path="${esc(path)}" data-cms-type="links">${esc(toLinks(value))}</textarea>${help}</label>`;
    if (field.type === "checkbox") return `<label class="cms-check"><input id="${id}" type="checkbox" data-cms-path="${esc(path)}" data-cms-type="checkbox" ${value ? "checked" : ""}><span>${esc(field.label)}</span></label>`;
    if (field.type === "image") {
      const url = getPath(field.urlPath);
      return `<div class="cms-field cms-span-2 cms-image-field"><span>${esc(field.label)}</span><div class="cms-image-current">${url ? `<img src="${esc(window.TinTechAPI.resolveImage(url))}" alt=""><div><b>Current image</b><small>${esc(url)}</small></div><button type="button" data-cms-clear-image="${esc(field.urlPath)}" data-storage-path="${esc(field.storagePath)}">Remove</button>` : `<div><b>No uploaded image</b><small>The current website fallback remains in use.</small></div>`}</div><div class="cms-image-upload"><input type="file" accept="image/*" data-cms-image-file="${esc(field.urlPath)}"><button class="admin-button outline" type="button" data-cms-upload-image="${esc(field.urlPath)}" data-storage-path="${esc(field.storagePath)}" data-folder="${esc(field.folder || "brand")}">Upload image</button></div></div>`;
    }
    const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
    return `<label class="cms-field"><span>${esc(field.label)}</span><input id="${id}" type="${inputType}" data-cms-path="${esc(path)}" value="${esc(value)}">${help}</label>`;
  }

  function blankItem(field) {
    const item = {};
    (field.itemFields || []).forEach((child) => { item[child.key] = child.type === "lines" || child.type === "links" ? [] : ""; });
    return item;
  }

  function repeaterHTML(field) {
    const items = Array.isArray(getPath(field.path)) ? getPath(field.path) : [];
    const cards = items.map((item, index) => {
      const fields = (field.itemFields || []).map((child) => inputHTML({ ...child, label: child.label }, item?.[child.key], `${field.path}[${index}].${child.key}`, `${index}-${child.key}`)).join("");
      return `<article class="cms-repeat-card"><div class="cms-repeat-head"><strong>${esc(field.itemLabel || "Item")} ${index + 1}</strong><div><button type="button" data-cms-move="up" data-repeat-path="${esc(field.path)}" data-repeat-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-cms-move="down" data-repeat-path="${esc(field.path)}" data-repeat-index="${index}" ${index === items.length - 1 ? "disabled" : ""}>↓</button><button class="danger" type="button" data-cms-remove-item="${esc(field.path)}" data-repeat-index="${index}">Remove</button></div></div><div class="cms-field-grid">${fields}</div></article>`;
    }).join("");
    return `<div class="cms-repeater cms-span-2"><div class="cms-repeater-title"><div><strong>${esc(field.label)}</strong>${field.help ? `<small>${esc(field.help)}</small>` : ""}</div><button class="admin-button outline" type="button" data-cms-add-item="${esc(field.path)}">+ Add ${esc(field.itemLabel || "item")}</button></div>${cards || `<div class="cms-empty">No items yet.</div>`}</div>`;
  }

  function renderStandardPanel(panel) {
    return `<div class="cms-panel-heading"><div><h2>${esc(panel.label)}</h2><p>Every field below publishes directly to the website after you press Publish website changes.</p></div></div>${(panel.groups || []).map((group, index) => `<details class="cms-group" ${index === 0 ? "open" : ""}><summary><span>${esc(group.title)}</span><small>${group.fields.length} controls</small></summary><div class="cms-group-body"><div class="cms-field-grid">${group.fields.map((field) => field.type === "repeater" ? repeaterHTML(field) : inputHTML(field, field.type === "image" ? null : getPath(field.path), field.path || "")).join("")}</div></div></details>`).join("")}`;
  }

  function slideCard(slide, index) {
    const image = slide.image_url ? window.TinTechAPI.resolveImage(slide.image_url) : window.TinTechAPI.resolveImage("assets/images/product-pouch-caddy.svg");
    return `<article class="cms-slide-card" data-slide-index="${index}"><div class="cms-slide-preview"><img src="${esc(image)}" alt=""><div><span>${esc(slide.kicker || "Hero slide")}</span><h3>${esc(slide.headline || "Untitled slide")} <em>${esc(slide.accent_text || "")}</em></h3><p>${esc(slide.description || "")}</p></div></div><div class="cms-slide-head"><strong>Slide ${index + 1}</strong><div><label><input type="checkbox" data-slide-field="is_active" data-slide-index="${index}" ${slide.is_active !== false ? "checked" : ""}> Active</label><button type="button" data-slide-action="duplicate" data-slide-index="${index}">Duplicate</button><button type="button" data-slide-action="up" data-slide-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-slide-action="down" data-slide-index="${index}" ${index === state.slides.length - 1 ? "disabled" : ""}>↓</button><button class="danger" type="button" data-slide-action="remove" data-slide-index="${index}" ${state.slides.length === 1 ? "disabled" : ""}>Remove</button></div></div><div class="cms-field-grid"><div class="cms-field cms-span-2"><span>Slide image</span><div class="cms-image-current"><img src="${esc(image)}" alt=""><div><b>${slide.image_url ? "Uploaded slide image" : "Fallback image"}</b><small>${esc(slide.image_url || "assets/images/product-pouch-caddy.svg")}</small></div></div><div class="cms-image-upload"><input type="file" accept="image/*" data-slide-image-file="${index}"><button class="admin-button outline" type="button" data-slide-upload="${index}">Upload slide image</button></div></div>${[
      ["kicker", "Kicker", "text"], ["headline", "Headline", "text"], ["accent_text", "Highlighted text", "text"], ["description", "Description", "textarea"],
      ["primary_label", "Primary button label", "text"], ["primary_url", "Primary button URL", "url"], ["secondary_label", "Secondary button label", "text"], ["secondary_url", "Secondary button URL", "url"],
      ["badge_title", "Image description title", "text"], ["badge_text", "Image description text", "textarea"], ["alt_text", "Image accessibility description", "text"],
      ["trust_items", "Trust points", "lines"], ["duration_ms", "Slide duration in milliseconds", "number"]
    ].map(([key, label, type]) => { const value = key === "trust_items" ? toLines(slide[key]) : slide[key] ?? ""; return `<label class="cms-field ${type === "textarea" || type === "lines" ? "cms-span-2" : ""}"><span>${esc(label)}</span>${type === "textarea" || type === "lines" ? `<textarea data-slide-field="${key}" data-slide-index="${index}" data-slide-type="${type}">${esc(value)}</textarea>` : `<input type="${type === "number" ? "number" : type === "url" ? "url" : "text"}" data-slide-field="${key}" data-slide-index="${index}" value="${esc(value)}">`}</label>`; }).join("")}<label class="cms-field"><span>Image focus</span><select data-slide-field="image_position" data-slide-index="${index}">${["left top","center top","right top","left center","center center","right center","left bottom","center bottom","right bottom"].map((position) => `<option value="${position}" ${position === (slide.image_position || "center center") ? "selected" : ""}>${position.replace(/\b\w/g, (char) => char.toUpperCase())}</option>`).join("")}</select></label></div></article>`;
  }

  function renderSlidesPanel() {
    return `<div class="cms-panel-heading"><div><h2>Hero slideshow</h2><p>Create multiple opening stories. Every slide can have its own image, headline, description, buttons, trust points and timing.</p></div><button class="admin-button primary" type="button" id="cms-add-slide">+ Add slide</button></div><div class="cms-slide-list">${state.slides.map(slideCard).join("")}</div>`;
  }

  function render() {
    const panel = PANELS.find((item) => item.id === state.activePanel) || PANELS[0];
    root.innerHTML = `<div class="cms-shell"><aside class="cms-subnav">${PANELS.map((item) => `<button type="button" data-cms-panel="${item.id}" class="${item.id === state.activePanel ? "active" : ""}">${esc(item.label)}</button>`).join("")}</aside><section class="cms-editor-panel">${panel.custom ? renderSlidesPanel() : renderStandardPanel(panel)}</section></div>`;
  }

  async function ensureLoaded(force = false) {
    if (state.loading || (state.loaded && !force)) return;
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!token) { root.innerHTML = `<div class="cms-empty">Sign in to load website content.</div>`; return; }
    state.loading = true;
    root.innerHTML = `<div class="cms-loading">Loading website content…</div>`;
    try {
      const data = await window.TinTechAPI.adminData(token);
      state.content = merge(defaults, data.site_content || {});
      state.slides = Array.isArray(data.hero_slides) && data.hero_slides.length ? clone(data.hero_slides) : clone(defaultSlides);
      state.loaded = true;
      state.dirty = false;
      render();
    } catch (error) {
      root.innerHTML = `<div class="cms-empty"><h3>Website content could not load</h3><p>${esc(error.message || "Try signing in again.")}</p></div>`;
    } finally { state.loading = false; }
  }

  async function uploadFile(file, folder, altText, button) {
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!file || !token) throw new Error("Choose an image and make sure you are signed in.");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Uploading…";
    try { return await window.TinTechAPI.uploadImage(file, token, altText, folder); }
    finally { button.disabled = false; button.textContent = original; }
  }

  async function saveAll() {
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!token) return toast("Your admin session has expired. Sign in again.", "error");
    const original = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = "Publishing…";
    try {
      const contentResult = await window.TinTechAPI.adminAction("save-site-content", token, { content: state.content });
      const slideResult = await window.TinTechAPI.adminAction("save-hero-slides", token, { slides: state.slides.map((slide, index) => ({ ...slide, sort_order: (index + 1) * 10 })) });
      state.content = merge(defaults, contentResult.site_content || state.content);
      state.slides = Array.isArray(slideResult.hero_slides) ? clone(slideResult.hero_slides) : state.slides;
      markClean();
      render();
      toast("Website content and hero slideshow are live.", "success");
    } catch (error) {
      toast(error.message || "Website content could not be published.", "error");
      saveButton.textContent = original;
    } finally { saveButton.disabled = false; }
  }

  document.querySelector('[data-admin-tab="content"]')?.addEventListener("click", () => ensureLoaded());
  saveButton.addEventListener("click", saveAll);

  root.addEventListener("click", async (event) => {
    const panel = event.target.closest("[data-cms-panel]");
    if (panel) { state.activePanel = panel.dataset.cmsPanel; render(); return; }
    const add = event.target.closest("[data-cms-add-item]");
    if (add) {
      const field = PANELS.flatMap((panelItem) => panelItem.groups || []).flatMap((group) => group.fields || []).find((item) => item.path === add.dataset.cmsAddItem);
      const list = getPath(add.dataset.cmsAddItem) || [];
      list.push(blankItem(field || { itemFields: [] }));
      setPath(add.dataset.cmsAddItem, list);
      render(); return;
    }
    const remove = event.target.closest("[data-cms-remove-item]");
    if (remove) { const list = getPath(remove.dataset.cmsRemoveItem) || []; list.splice(Number(remove.dataset.repeatIndex), 1); setPath(remove.dataset.cmsRemoveItem, list); render(); return; }
    const move = event.target.closest("[data-cms-move]");
    if (move) { const list = getPath(move.dataset.repeatPath) || []; const index = Number(move.dataset.repeatIndex); const target = move.dataset.cmsMove === "up" ? index - 1 : index + 1; if (target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]]; setPath(move.dataset.repeatPath, list); render(); return; }
    const upload = event.target.closest("[data-cms-upload-image]");
    if (upload) {
      const path = upload.dataset.cmsUploadImage;
      const input = root.querySelector(`[data-cms-image-file="${CSS.escape(path)}"]`);
      try { const result = await uploadFile(input?.files?.[0], upload.dataset.folder || "brand", `Tin Tech ${path}`, upload); setPath(path, result.image_url); setPath(upload.dataset.storagePath, result.storage_path); render(); toast("Image uploaded. Publish website changes when ready.", "success"); } catch (error) { toast(error.message, "error"); }
      return;
    }
    const clear = event.target.closest("[data-cms-clear-image]");
    if (clear) { setPath(clear.dataset.cmsClearImage, null); setPath(clear.dataset.storagePath, null); render(); return; }
    const addSlide = event.target.closest("#cms-add-slide");
    if (addSlide) { state.slides.push({ ...clone(defaultSlides[0] || {}), id: crypto.randomUUID(), image_url: null, storage_path: null, headline: "New hero message", accent_text: "Add highlighted text.", description: "Add the supporting description for this slide.", sort_order: (state.slides.length + 1) * 10, is_active: true }); markDirty(); render(); return; }
    const slideAction = event.target.closest("[data-slide-action]");
    if (slideAction) {
      const index = Number(slideAction.dataset.slideIndex); const action = slideAction.dataset.slideAction;
      if (action === "remove" && state.slides.length > 1) state.slides.splice(index, 1);
      if (action === "duplicate") state.slides.splice(index + 1, 0, { ...clone(state.slides[index]), id: crypto.randomUUID(), headline: `${state.slides[index].headline || "Slide"} copy` });
      if (action === "up" && index > 0) [state.slides[index - 1], state.slides[index]] = [state.slides[index], state.slides[index - 1]];
      if (action === "down" && index < state.slides.length - 1) [state.slides[index + 1], state.slides[index]] = [state.slides[index], state.slides[index + 1]];
      markDirty(); render(); return;
    }
    const slideUpload = event.target.closest("[data-slide-upload]");
    if (slideUpload) {
      const index = Number(slideUpload.dataset.slideUpload); const input = root.querySelector(`[data-slide-image-file="${index}"]`);
      try { const result = await uploadFile(input?.files?.[0], "slides", state.slides[index]?.alt_text || state.slides[index]?.headline || "Tin Tech hero slide", slideUpload); state.slides[index].image_url = result.image_url; state.slides[index].storage_path = result.storage_path; markDirty(); render(); toast("Slide image uploaded. Publish website changes when ready.", "success"); } catch (error) { toast(error.message, "error"); }
    }
  });

  root.addEventListener("input", (event) => {
    const input = event.target.closest("[data-cms-path]");
    if (input) {
      let value = input.value;
      if (input.dataset.cmsType === "lines") value = fromLines(value);
      if (input.dataset.cmsType === "links") value = fromLinks(value);
      if (input.dataset.cmsType === "checkbox") value = input.checked;
      setPath(input.dataset.cmsPath, value);
      return;
    }
    const slideInput = event.target.closest("[data-slide-field]");
    if (slideInput) {
      const index = Number(slideInput.dataset.slideIndex); const field = slideInput.dataset.slideField;
      let value = slideInput.type === "checkbox" ? slideInput.checked : slideInput.value;
      if (slideInput.dataset.slideType === "lines") value = fromLines(value);
      if (slideInput.type === "number") value = Number(value);
      state.slides[index][field] = value; markDirty();
      if (["kicker", "headline", "accent_text", "description", "is_active"].includes(field)) {
        const preview = slideInput.closest(".cms-slide-card")?.querySelector(".cms-slide-preview");
        if (preview) {
          preview.querySelector("span").textContent = state.slides[index].kicker || "Hero slide";
          preview.querySelector("h3").innerHTML = `${esc(state.slides[index].headline || "Untitled slide")} <em>${esc(state.slides[index].accent_text || "")}</em>`;
          preview.querySelector("p").textContent = state.slides[index].description || "";
        }
      }
    }
  });

  root.addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-cms-path][type="checkbox"]');
    if (checkbox) setPath(checkbox.dataset.cmsPath, checkbox.checked);
  });

  window.addEventListener("beforeunload", (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
});