(function () {
  "use strict";

  const defaults = window.TinTechContentDefaults || {};
  const defaultSlides = window.TinTechDefaultHeroSlides || [];
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  const escapeHTML = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function safeUrl(value, fallback = "#") {
    const url = String(value ?? "").trim();
    if (!url) return fallback;
    if (/^(javascript|data:text\/html):/i.test(url)) return fallback;
    return url;
  }

  function deepMerge(base, override) {
    if (override === undefined) return structuredClone(base);
    if (Array.isArray(base)) return Array.isArray(override) ? structuredClone(override) : structuredClone(base);
    if (base && typeof base === "object") {
      const result = {};
      const source = override && typeof override === "object" && !Array.isArray(override) ? override : {};
      Object.keys(base).forEach((key) => { result[key] = deepMerge(base[key], source[key]); });
      Object.keys(source).forEach((key) => { if (!(key in result)) result[key] = structuredClone(source[key]); });
      return result;
    }
    return override;
  }

  function currentPage() {
    const file = window.location.pathname.split("/").pop() || "index.html";
    if (file === "" || file === "index.html") return "home";
    if (file === "about.html") return "about";
    if (file === "capabilities.html") return "capabilities";
    if (file === "portfolio.html") return "portfolio";
    if (file === "contact.html") return "contact";
    if (file === "product.html") return "product";
    return file.replace(/\.html$/, "") || "home";
  }

  function resolveImage(url, fallback = "assets/images/product-placeholder.svg") {
    if (window.TinTechAPI?.resolveImage) return window.TinTechAPI.resolveImage(url || fallback);
    return url || fallback;
  }

  function applySEO(content, page) {
    const seo = content.seo?.[page] || {};
    if (seo.title) document.title = seo.title;
    const description = document.querySelector('meta[name="description"]');
    if (description && seo.description) description.setAttribute("content", seo.description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && seo.title) ogTitle.setAttribute("content", seo.title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && seo.description) ogDescription.setAttribute("content", seo.description);
  }

  function renderHeader(content, page) {
    const brand = content.brand || {};
    document.querySelectorAll(".brand, .admin-brand").forEach((anchor) => {
      anchor.setAttribute("aria-label", `${brand.company_name || "Tin Tech Packaging"} home`);
      const image = anchor.querySelector("img");
      const label = anchor.querySelector("span");
      if (image) {
        image.src = resolveImage(brand.logo_url, "tin-tech-logo.svg");
        image.alt = brand.logo_alt || brand.company_name || "Tin Tech Packaging";
      }
      if (label) label.textContent = brand.company_name || "TIN TECH PACKAGING";
    });

    const nav = document.querySelector(".site-nav");
    if (nav) {
      const items = Array.isArray(content.navigation?.items) ? content.navigation.items : [];
      nav.innerHTML = items.map((item) => {
        const target = safeUrl(item.url, "#");
        const file = target.split("?")[0].split("#")[0].split("/").pop() || "index.html";
        const active = (page === "home" && file === "index.html") || file === `${page}.html`;
        return `<a href="${escapeHTML(target)}"${active ? ' class="active" aria-current="page"' : ""}>${escapeHTML(item.label)}</a>`;
      }).join("");
    }
    const cta = document.querySelector(".header-cta");
    if (cta) {
      cta.textContent = content.navigation?.cta_label || "Start a project";
      cta.href = safeUrl(content.navigation?.cta_url, "contact.html");
    }

    const favicon = document.querySelector('link[rel~="icon"]');
    if (favicon) favicon.href = resolveImage(brand.favicon_url || brand.logo_url, "tin-tech-logo.svg");
  }

  function contactLinks(content) {
    const contact = content.contact || {};
    const links = [];
    if (contact.email) links.push({ label: contact.email, url: `mailto:${contact.email}` });
    if (contact.phone) links.push({ label: contact.phone, url: `tel:${contact.phone.replace(/[^+\d]/g, "")}` });
    if (contact.whatsapp) links.push({ label: "WhatsApp", url: contact.whatsapp });
    links.push({ label: content.footer?.project_brief_label || "Project brief", url: "contact.html" });
    links.push({ label: content.footer?.admin_label || "Admin portal", url: "admin/" });
    return links;
  }

  function renderFooter(content) {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;
    const brand = content.brand || {};
    const columns = Array.isArray(content.footer?.columns) ? content.footer.columns : [];
    const columnsHTML = columns.map((column) => `<div class="footer-col"><h3>${escapeHTML(column.title)}</h3>${(column.links || []).map((link) => `<a href="${escapeHTML(safeUrl(link.url, "#"))}">${escapeHTML(link.label)}</a>`).join("")}</div>`).join("");
    const contactHTML = contactLinks(content).map((link) => `<a href="${escapeHTML(safeUrl(link.url, "#"))}">${escapeHTML(link.label)}</a>`).join("");
    const legal = (content.footer?.legal_links || []).map((link) => `<a href="${escapeHTML(safeUrl(link.url, "#"))}">${escapeHTML(link.label)}</a>`).join(" · ");
    const copyright = String(content.footer?.copyright || "© {year} Tin Tech Packaging. All rights reserved.").replace("{year}", String(new Date().getFullYear()));
    footer.innerHTML = `<div class="container"><div class="footer-grid"><div class="footer-brand"><img src="${escapeHTML(resolveImage(brand.logo_light_url || brand.logo_url, "tin-tech-logo-light.svg"))}" alt="${escapeHTML(brand.logo_alt || brand.company_name || "Tin Tech Packaging")}"><div><b>${escapeHTML(brand.company_name || "TIN TECH PACKAGING")}</b><p>${escapeHTML(content.footer?.description || brand.tagline || "")}</p></div></div>${columnsHTML}<div class="footer-col"><h3>${escapeHTML(content.footer?.contact_title || "Contact")}</h3>${contactHTML}</div></div><div class="footer-bottom"><span>${escapeHTML(copyright)}</span><span>${legal}</span></div></div>`;
  }

  const heading = (eyebrow, title, description = "") => `<div class="section-heading reveal"><div><span class="eyebrow">${escapeHTML(eyebrow)}</span><h2>${escapeHTML(title)}</h2></div>${description ? `<p>${escapeHTML(description)}</p>` : ""}</div>`;
  const metricHTML = (items, className = "metric") => (items || []).map((item) => `<div class="${className}"><strong>${escapeHTML(item.value)}</strong><span>${escapeHTML(item.label)}</span></div>`).join("");
  const valueCards = (items) => (items || []).map((item) => `<article class="value-card reveal"><div class="value-icon cms-icon">${escapeHTML(item.icon || "•")}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p></article>`).join("");
  const processSteps = (items) => (items || []).map((item) => `<div class="process-step reveal"><b>${escapeHTML(item.title)}</b><span>${escapeHTML(item.text)}</span></div>`).join("");

  function renderHeroMount() {
    return `<section class="home-hero home-hero-slider"><div class="hero-slider-shell" data-hero-slider><div class="hero-slider-loading"><div class="container home-hero-grid"><div class="home-hero-copy"><span class="kicker">Preparing the latest Tin Tech story</span><h1>From product idea to <span class="accent">repeatable production.</span></h1></div></div></div></div></section>`;
  }

  function renderHome(content, settings) {
    const home = content.home || {};
    const factory = home.factory || {};
    const factoryUrl = settings?.factory_image_url ? resolveImage(settings.factory_image_url) : "";
    const factoryStyle = [
      `--factory-height:${Math.min(900, Math.max(280, Number(settings?.factory_height) || 520))}px`,
      `--factory-position:${settings?.factory_position || "center center"}`,
      factoryUrl ? `--factory-image:url(&quot;${escapeHTML(factoryUrl)}&quot;)` : "",
    ].filter(Boolean).join(";");
    const intro = home.intro || {};
    const portfolio = home.portfolio || {};
    const testimonial = home.testimonial || {};
    const scale = home.scale || {};
    const finalCTA = home.final_cta || {};
    return `${renderHeroMount()}
      <section class="factory-media-section"><div class="container"><div class="factory-media reveal" data-managed-factory style="${factoryStyle}"${settings?.factory_alt_text ? ` role="img" aria-label="${escapeHTML(settings.factory_alt_text)}"` : ""}><div class="factory-media-copy"><span class="eyebrow">${escapeHTML(factory.eyebrow)}</span><h2>${escapeHTML(factory.title)}</h2><p>${escapeHTML(factory.description)}</p><span class="factory-media-note">${escapeHTML(factory.note)}</span></div></div></div></section>
      <section class="proof-strip proof-strip-overlap"><div class="container proof-grid"><div class="proof-item proof-intro">${escapeHTML(home.proof_intro)}</div>${metricHTML(home.proof_items, "proof-item")}</div></section>
      <section class="section section-white"><div class="container">${heading(intro.eyebrow, intro.title, intro.description)}<div class="intro-grid"><article class="statement-card reveal"><span class="kicker">${escapeHTML(intro.statement_kicker)}</span><h3>${escapeHTML(intro.statement_title)}</h3><p>${escapeHTML(intro.statement_text)}</p><a class="button button-primary" href="${escapeHTML(safeUrl(intro.button_url, "capabilities.html"))}">${escapeHTML(intro.button_label)}</a></article><div class="value-grid">${valueCards(intro.cards)}</div></div></div></section>
      <section class="section section-soft"><div class="container">${heading(portfolio.eyebrow, portfolio.title, portfolio.description)}<div class="section-inline-action"><a class="button button-dark" href="${escapeHTML(safeUrl(portfolio.button_url, "portfolio.html"))}">${escapeHTML(portfolio.button_label)}</a></div><div class="product-grid" data-featured-products><div class="product-skeleton"></div><div class="product-skeleton"></div><div class="product-skeleton"></div></div></div></section>
      <section class="section section-dark"><div class="container">${heading(home.process?.eyebrow, home.process?.title, home.process?.description)}<div class="process-grid">${processSteps(home.process?.steps)}</div></div></section>
      <section class="section section-white"><div class="container"><div class="testimonial-shell reveal"><div class="testimonial-stats">${metricHTML(testimonial.stats, "testimonial-stat")}</div><blockquote class="testimonial-quote"><span class="eyebrow">${escapeHTML(testimonial.eyebrow)}</span><h2>${escapeHTML(testimonial.title)}</h2><p>“${escapeHTML(testimonial.quote)}”</p><footer class="testimonial-attribution"><div><strong>${escapeHTML(testimonial.author)}</strong><span>${escapeHTML(testimonial.author_note)}</span></div><span class="testimonial-badge">${escapeHTML(testimonial.badge)}</span></footer></blockquote></div></div></section>
      <section class="section section-dark dark"><div class="container">${heading(scale.eyebrow, scale.title, scale.description)}<div class="factory-cta reveal"><div><b>${escapeHTML(scale.cta_kicker)}</b><h3>${escapeHTML(scale.cta_title)}</h3><p>${escapeHTML(scale.cta_text)}</p></div><a class="button button-primary" href="${escapeHTML(safeUrl(scale.button_url, "contact.html"))}">${escapeHTML(scale.button_label)}</a></div></div></section>
      <section class="section section-white"><div class="container"><div class="statement-card reveal cms-final-cta"><div><span class="kicker">${escapeHTML(finalCTA.kicker)}</span><h3>${escapeHTML(finalCTA.title)}</h3><p>${escapeHTML(finalCTA.text)}</p></div><a class="button button-primary" href="${escapeHTML(safeUrl(finalCTA.button_url, "contact.html"))}">${escapeHTML(finalCTA.button_label)}</a></div></div></section>`;
  }

  function pageHero(data) {
    return `<section class="page-hero"><div class="container page-hero-grid"><div class="reveal"><span class="kicker">${escapeHTML(data.kicker)}</span><h1>${escapeHTML(data.title)}</h1><p>${escapeHTML(data.description)}</p></div><aside class="page-hero-card reveal"><strong>${escapeHTML(data.aside_title)}</strong><span>${escapeHTML(data.aside_text)}</span></aside></div></section>`;
  }

  function renderAbout(content) {
    const about = content.about || {};
    const company = about.company || {};
    const values = about.values || {};
    const track = about.track || {};
    const testimonial = content.home?.testimonial || {};
    const pathway = about.pathway || {};
    return `${pageHero(about.hero || {})}
      <section class="section section-white"><div class="container about-grid"><article class="statement-card reveal"><span class="kicker">${escapeHTML(company.statement_kicker)}</span><h3>${escapeHTML(company.statement_title)}</h3><p>${escapeHTML(company.statement_text)}</p><a class="button button-primary" href="${escapeHTML(safeUrl(company.button_url, "contact.html"))}">${escapeHTML(company.button_label)}</a></article><article class="about-panel reveal"><span class="eyebrow">${escapeHTML(company.eyebrow)}</span><h2>${escapeHTML(company.title)}</h2>${(company.paragraphs || []).map((p) => `<p>${escapeHTML(p)}</p>`).join("")}<div class="metric-row">${metricHTML(company.metrics)}</div></article></div></section>
      <section class="section section-soft"><div class="container">${heading(values.eyebrow, values.title, values.description)}<div class="value-grid">${valueCards(values.cards)}</div></div></section>
      <section class="section section-white"><div class="container">${heading(track.eyebrow, track.title, track.description)}<div class="testimonial-shell reveal"><div class="testimonial-stats">${metricHTML(testimonial.stats, "testimonial-stat")}</div><blockquote class="testimonial-quote"><span class="eyebrow">${escapeHTML(testimonial.eyebrow)}</span><h2>${escapeHTML(testimonial.title)}</h2><p>“${escapeHTML(testimonial.quote)}”</p><footer class="testimonial-attribution"><div><strong>${escapeHTML(testimonial.author)}</strong><span>${escapeHTML(testimonial.author_note)}</span></div><span class="testimonial-badge">${escapeHTML(testimonial.badge)}</span></footer></blockquote></div></div></section>
      <section class="section section-dark dark"><div class="container">${heading(pathway.eyebrow, pathway.title, pathway.description)}<div class="factory-cta reveal"><div><b>${escapeHTML(pathway.kicker)}</b><h3>${escapeHTML(pathway.cta_title)}</h3><p>${escapeHTML(pathway.cta_text)}</p></div><a class="button button-primary" href="${escapeHTML(safeUrl(pathway.button_url, "contact.html"))}">${escapeHTML(pathway.button_label)}</a></div></div></section>`;
  }

  function renderCapabilities(content) {
    const data = content.capabilities || {};
    const stack = data.stack || {};
    const process = data.process || {};
    const markets = data.markets || {};
    const note = data.note || {};
    const cta = data.cta || {};
    const cards = (stack.cards || []).map((card) => `<article class="capability-card reveal"><span class="capability-number">${escapeHTML(card.number)}</span><h3>${escapeHTML(card.title)}</h3><p>${escapeHTML(card.text)}</p><ul>${(card.bullets || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></article>`).join("");
    const marketCards = (markets.cards || []).map((card) => `<article class="value-card reveal"><h3>${escapeHTML(card.title)}</h3><p>${escapeHTML(card.text)}</p></article>`).join("");
    return `${pageHero(data.hero || {})}
      <section class="section section-white"><div class="container">${heading(stack.eyebrow, stack.title, stack.description)}<div class="capability-grid">${cards}</div></div></section>
      <section class="section section-dark"><div class="container">${heading(process.eyebrow, process.title, process.description)}<div class="process-grid">${processSteps(process.steps)}</div></div></section>
      <section class="section section-soft"><div class="container">${heading(markets.eyebrow, markets.title, markets.description)}<div class="value-grid">${marketCards}</div></div></section>
      <section class="section section-white"><div class="container"><div class="intro-grid"><article class="about-panel reveal"><span class="eyebrow">${escapeHTML(note.eyebrow)}</span><h2>${escapeHTML(note.title)}</h2>${(note.paragraphs || []).map((p) => `<p>${escapeHTML(p)}</p>`).join("")}</article><article class="statement-card reveal"><span class="kicker">${escapeHTML(cta.kicker)}</span><h3>${escapeHTML(cta.title)}</h3><p>${escapeHTML(cta.text)}</p><a class="button button-primary" href="${escapeHTML(safeUrl(cta.button_url, "contact.html"))}">${escapeHTML(cta.button_label)}</a></article></div></div></section>`;
  }

  function renderContact(content) {
    const data = content.contact_page || {};
    const panel = data.panel || {};
    const form = data.form || {};
    const before = data.before_send || {};
    const contact = content.contact || {};
    const options = (form.project_types || []).map((option) => `<option>${escapeHTML(option)}</option>`).join("");
    const cards = (before.cards || []).map((card) => `<article class="value-card"><h3>${escapeHTML(card.title)}</h3><p>${escapeHTML(card.text)}</p></article>`).join("");
    return `${pageHero(data.hero || {})}
      <section class="section section-soft"><div class="container contact-grid"><aside class="contact-panel reveal"><span class="kicker">${escapeHTML(panel.kicker)}</span><h2>${escapeHTML(panel.title)}</h2><p>${escapeHTML(panel.text)}</p><div class="contact-list"><div><span>${escapeHTML(panel.email_label)}</span><a href="mailto:${escapeHTML(contact.email)}">${escapeHTML(contact.email)}</a></div>${contact.phone ? `<div><span>Phone</span><a href="tel:${escapeHTML(contact.phone.replace(/[^+\d]/g, ""))}">${escapeHTML(contact.phone)}</a></div>` : ""}<div><span>${escapeHTML(panel.operating_label)}</span><b>${escapeHTML(contact.operating_points)}</b></div><div><span>${escapeHTML(panel.inputs_label)}</span><b>${escapeHTML(contact.typical_inputs)}</b></div></div></aside>
      <form class="contact-form reveal" data-inquiry-form data-submit-label="${escapeHTML(form.submit_label)}" data-sending-label="${escapeHTML(form.sending_label)}" data-success-message="${escapeHTML(form.success_message)}" data-error-message="${escapeHTML(form.error_message)}"><div class="form-grid"><div class="field"><label for="name">${escapeHTML(form.name_label)}</label><input id="name" name="name" required autocomplete="name"></div><div class="field"><label for="company">${escapeHTML(form.company_label)}</label><input id="company" name="company" autocomplete="organization"></div><div class="field"><label for="email">${escapeHTML(form.email_label)}</label><input id="email" name="email" required type="email" autocomplete="email"></div><div class="field"><label for="phone">${escapeHTML(form.phone_label)}</label><input id="phone" name="phone" autocomplete="tel"></div><div class="field"><label for="project-type">${escapeHTML(form.project_type_label)}</label><select id="project-type" name="project_type">${options}</select></div><div class="field"><label for="quantity">${escapeHTML(form.quantity_label)}</label><input id="quantity" name="estimated_quantity" placeholder="${escapeHTML(form.quantity_placeholder)}"></div><div class="field field-full"><label for="destination">${escapeHTML(form.destination_label)}</label><input id="destination" name="destination" placeholder="${escapeHTML(form.destination_placeholder)}"></div><div class="field field-full"><label for="message">${escapeHTML(form.message_label)}</label><textarea id="message" name="message" required placeholder="${escapeHTML(form.message_placeholder)}"></textarea></div><div class="sr-only" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div></div><button class="button button-dark" type="submit">${escapeHTML(form.submit_label)}</button><p class="form-note">${escapeHTML(form.privacy_note)}</p><p class="form-status hidden" data-form-status role="status"></p></form></div></section>
      <section class="section section-white"><div class="container">${heading(before.eyebrow, before.title)}<div class="value-grid">${cards}</div></div></section>`;
  }

  function applyPortfolioText(content) {
    const data = content.portfolio || {};
    const main = document.querySelector("main");
    if (!main) return;
    const hero = main.querySelector(".page-hero-grid > div");
    if (hero) hero.innerHTML = `<span class="kicker">${escapeHTML(data.hero_kicker)}</span><h1>${escapeHTML(data.hero_title)}</h1><p>${escapeHTML(data.hero_description)}</p>`;
    const aside = main.querySelector(".page-hero-card");
    if (aside) aside.innerHTML = `<strong>${escapeHTML(data.aside_title)}</strong><span>${escapeHTML(data.aside_text)}</span>`;
    const search = main.querySelector("[data-portfolio-search]");
    if (search) search.placeholder = data.search_placeholder || "Search products";
    const statement = main.querySelector(".statement-card");
    if (statement) statement.innerHTML = `<div><span class="kicker">${escapeHTML(data.cta_kicker)}</span><h3>${escapeHTML(data.cta_title)}</h3><p>${escapeHTML(data.cta_text)}</p></div><a class="button button-primary" href="${escapeHTML(safeUrl(data.cta_button_url, "contact.html"))}">${escapeHTML(data.cta_button_label)}</a>`;
  }

  function applyProductText(content) {
    const data = content.product_page || {};
    const hero = document.querySelector(".page-hero .container");
    if (hero) hero.innerHTML = `<span class="kicker">${escapeHTML(data.kicker)}</span><p style="margin:12px 0 0;color:#b8c8d6">${escapeHTML(data.intro)}</p>`;
  }

  function renderPage(content, settings, page) {
    const mount = document.querySelector("main[data-cms-page]");
    if (mount) {
      if (page === "home") mount.innerHTML = renderHome(content, settings);
      if (page === "about") mount.innerHTML = renderAbout(content);
      if (page === "capabilities") mount.innerHTML = renderCapabilities(content);
      if (page === "contact") mount.innerHTML = renderContact(content);
    } else if (page === "portfolio") applyPortfolioText(content);
    else if (page === "product") applyProductText(content);
  }

  function renderAll(bundle) {
    const page = currentPage();
    const content = deepMerge(defaults, bundle?.site_content || {});
    const slides = Array.isArray(bundle?.hero_slides) && bundle.hero_slides.length ? bundle.hero_slides : structuredClone(defaultSlides);
    const settings = bundle?.site_settings || {};
    renderHeader(content, page);
    renderFooter(content);
    renderPage(content, settings, page);
    applySEO(content, page);
    return { content, hero_slides: slides, site_settings: settings, page };
  }

  const initial = renderAll({ site_content: defaults, hero_slides: defaultSlides, site_settings: {} });
  let latest = initial;

  document.addEventListener("DOMContentLoaded", async () => {
    latest = renderAll({ site_content: defaults, hero_slides: defaultSlides, site_settings: {} });
    try {
      const bundle = window.TinTechAPI?.siteContent ? await window.TinTechAPI.siteContent() : null;
      if (bundle) latest = renderAll(bundle);
    } catch (error) {
      console.error("Tin Tech content", error);
    }
    window.dispatchEvent(new CustomEvent("tintech:content-ready", { detail: latest }));
    resolveReady(latest);
  });

  window.TinTechCMS = { ready, get latest() { return latest; }, deepMerge, renderAll, escapeHTML, safeUrl };
})();