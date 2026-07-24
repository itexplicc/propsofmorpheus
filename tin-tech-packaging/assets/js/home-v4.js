document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const bundle = await (window.TinTechCMS?.ready || Promise.resolve({ content: window.TinTechContentDefaults || {}, hero_slides: window.TinTechDefaultHeroSlides || [] }));
  const slider = document.querySelector("[data-hero-slider]");
  const featuredGrid = document.querySelector("[data-featured-products]");
  const escape = window.TinTechCMS?.escapeHTML || ((value) => String(value ?? ""));
  const safeUrl = window.TinTechCMS?.safeUrl || ((value, fallback = "#") => value || fallback);
  const content = bundle.content || window.TinTechContentDefaults || {};
  const activeSlides = (bundle.hero_slides || []).filter((slide) => slide.is_active !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const slides = activeSlides.length ? activeSlides : (window.TinTechDefaultHeroSlides || []);

  function imageUrl(slide) {
    if (slide.image_url) return window.TinTechAPI?.resolveImage ? window.TinTechAPI.resolveImage(slide.image_url) : slide.image_url;
    const fallback = bundle.site_settings?.hero_image_url || "assets/images/product-pouch-caddy.svg";
    return window.TinTechAPI?.resolveImage ? window.TinTechAPI.resolveImage(fallback) : fallback;
  }

  function slideHTML(slide, index) {
    const trust = (slide.trust_items || []).map((item) => `<span>${escape(item)}</span>`).join("");
    const primary = slide.primary_label ? `<a class="button button-primary" href="${escape(safeUrl(slide.primary_url, "contact.html"))}">${escape(slide.primary_label)}</a>` : "";
    const secondary = slide.secondary_label ? `<a class="button button-ghost" href="${escape(safeUrl(slide.secondary_url, "portfolio.html"))}">${escape(slide.secondary_label)}</a>` : "";
    const badge = slide.badge_title || slide.badge_text ? `<div class="home-hero-media-badge"><span class="badge-dot">TT</span><div><b>${escape(slide.badge_title)}</b><span>${escape(slide.badge_text)}</span></div></div>` : "";
    return `<article class="hero-slide${index === 0 ? " active" : ""}" data-hero-slide="${index}" aria-hidden="${index === 0 ? "false" : "true"}"><div class="container home-hero-grid"><div class="home-hero-copy"><span class="kicker">${escape(slide.kicker)}</span><h1>${escape(slide.headline)}${slide.accent_text ? ` <span class="accent">${escape(slide.accent_text)}</span>` : ""}</h1><p class="hero-lead">${escape(slide.description)}</p><div class="hero-actions">${primary}${secondary}</div>${trust ? `<div class="hero-trust">${trust}</div>` : ""}</div><div class="home-hero-media"><img class="home-hero-image" src="${escape(imageUrl(slide))}" alt="${escape(slide.alt_text || slide.headline || "Tin Tech Packaging")}" style="object-position:${escape(slide.image_position || "center center")}">${badge}</div></div></article>`;
  }

  if (slider) {
    slider.innerHTML = `<div class="hero-slides">${slides.map(slideHTML).join("")}</div>${slides.length > 1 ? `<button class="hero-arrow hero-prev" type="button" aria-label="Previous slide">‹</button><button class="hero-arrow hero-next" type="button" aria-label="Next slide">›</button><div class="hero-dots" role="tablist" aria-label="Hero slides">${slides.map((slide, index) => `<button type="button" class="hero-dot${index === 0 ? " active" : ""}" data-hero-dot="${index}" role="tab" aria-selected="${index === 0 ? "true" : "false"}" aria-label="Show slide ${index + 1}"></button>`).join("")}</div>` : ""}`;

    let current = 0;
    let timer = null;
    let pointerStart = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const autoplay = content.home?.hero_autoplay !== false && !reduceMotion && slides.length > 1;
    const pauseOnHover = content.home?.hero_pause_on_hover !== false;

    function duration() { return Math.max(2500, Math.min(30000, Number(slides[current]?.duration_ms) || 6500)); }
    function show(index, userInitiated = false) {
      const next = (index + slides.length) % slides.length;
      slider.querySelectorAll("[data-hero-slide]").forEach((element, itemIndex) => {
        const active = itemIndex === next;
        element.classList.toggle("active", active);
        element.setAttribute("aria-hidden", active ? "false" : "true");
      });
      slider.querySelectorAll("[data-hero-dot]").forEach((element, itemIndex) => {
        const active = itemIndex === next;
        element.classList.toggle("active", active);
        element.setAttribute("aria-selected", active ? "true" : "false");
      });
      current = next;
      if (userInitiated) restart();
    }
    function stop() { if (timer) window.clearTimeout(timer); timer = null; }
    function schedule() { stop(); if (autoplay && !document.hidden) timer = window.setTimeout(() => { show(current + 1); schedule(); }, duration()); }
    function restart() { stop(); schedule(); }

    slider.querySelector(".hero-prev")?.addEventListener("click", () => show(current - 1, true));
    slider.querySelector(".hero-next")?.addEventListener("click", () => show(current + 1, true));
    slider.querySelectorAll("[data-hero-dot]").forEach((dot) => dot.addEventListener("click", () => show(Number(dot.dataset.heroDot), true)));
    if (pauseOnHover) {
      slider.addEventListener("mouseenter", stop);
      slider.addEventListener("mouseleave", schedule);
      slider.addEventListener("focusin", stop);
      slider.addEventListener("focusout", schedule);
    }
    slider.addEventListener("pointerdown", (event) => { pointerStart = event.clientX; });
    slider.addEventListener("pointerup", (event) => {
      if (pointerStart === null) return;
      const distance = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(distance) > 55) show(current + (distance < 0 ? 1 : -1), true);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else schedule(); });
    schedule();
  }

  function renderFeatured(products = []) {
    if (!featuredGrid) return;
    const selected = products.filter((product) => product.is_featured).slice(0, 3);
    const items = selected.length ? selected : products.slice(0, 3);
    const portfolio = content.home?.portfolio || {};
    featuredGrid.innerHTML = items.length
      ? items.map(window.TinTechAPI.productCard).join("")
      : `<div class="empty-panel" style="grid-column:1/-1"><h3>${escape(portfolio.empty_title || "Portfolio being prepared")}</h3><p>${escape(portfolio.empty_text || "Use the project brief to discuss a custom product.")}</p></div>`;
  }

  try {
    const catalog = await window.TinTechAPI.catalog();
    renderFeatured(catalog.products || []);
  } catch (error) {
    console.error("Tin Tech featured products", error);
    renderFeatured([]);
  }
});