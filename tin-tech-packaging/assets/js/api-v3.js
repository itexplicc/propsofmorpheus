(function () {
  "use strict";

  const currentScript = document.currentScript;
  const siteBase = currentScript ? new URL("../../", currentScript.src) : new URL("./", window.location.href);
  const API_URL = "https://zadxvmpgngwtpsmdkcod.supabase.co/functions/v1/tin-tech-api";

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function resolveImage(url) {
    if (!url) return new URL("assets/images/product-placeholder.svg", siteBase).href;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return new URL(String(url).replace(/^\.\//, ""), siteBase).href;
  }

  async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Request failed with status ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function request(action, options = {}) {
    const method = options.method || "GET";
    const url = new URL(API_URL);
    if (action) url.searchParams.set("action", action);
    if (options.query) Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });

    const headers = { ...(options.headers || {}) };
    const fetchOptions = { method, headers, cache: options.cache || "no-store" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify({ action, ...options.body });
    }
    return parseResponse(await fetch(url, fetchOptions));
  }

  function money(value, currency = "USD") {
    if (value === null || value === undefined || value === "") return "";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(Number(value));
    } catch {
      return `${currency || "USD"} ${Number(value).toLocaleString()}`;
    }
  }

  function formatPrice(product) {
    const min = product?.price_min;
    const max = product?.price_max;
    const currency = product?.currency || "USD";
    const unit = product?.price_unit ? ` ${product.price_unit}` : "";
    if (min !== null && min !== undefined && max !== null && max !== undefined) {
      if (Number(min) === Number(max)) return `${money(min, currency)}${unit}`;
      return `${money(min, currency)}–${money(max, currency)}${unit}`;
    }
    if (min !== null && min !== undefined) return `From ${money(min, currency)}${unit}`;
    if (max !== null && max !== undefined) return `Up to ${money(max, currency)}${unit}`;
    return product?.price_note || "Request pricing";
  }

  function primaryImage(product) {
    const defaultVariant = Array.isArray(product?.variants)
      ? product.variants.find((variant) => variant.is_default && variant.images?.length) || product.variants.find((variant) => variant.images?.length)
      : null;
    const image = defaultVariant?.images?.[0] || (Array.isArray(product?.images) && product.images.length ? product.images[0] : null);
    return {
      url: resolveImage(image?.image_url),
      alt: image?.alt_text || product?.name || "Tin Tech product",
    };
  }

  function productCard(product) {
    const image = primaryImage(product);
    const category = product.category?.name || "Custom manufacturing";
    const price = formatPrice(product);
    const moq = product.moq || "Confirmed by project";
    const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;
    return `
      <article class="product-card reveal is-visible">
        <a class="product-media" href="product.html?slug=${encodeURIComponent(product.slug)}">
          <img src="${escapeHTML(image.url)}" alt="${escapeHTML(image.alt)}" loading="lazy">
          <span class="category-pill">${escapeHTML(category)}</span>
        </a>
        <div class="product-body">
          <h3><a href="product.html?slug=${encodeURIComponent(product.slug)}">${escapeHTML(product.name)}</a></h3>
          <p>${escapeHTML(product.short_description || "Custom-developed around your specification, volume and supply plan.")}</p>
          <div class="product-meta">
            <div class="meta-chip"><b>${escapeHTML(price)}</b><span>Pricing</span></div>
            <div class="meta-chip"><b>${escapeHTML(moq)}</b><span>MOQ</span></div>
          </div>
          ${variantCount ? `<div style="margin-top:12px;color:#597083;font-size:.72rem;font-weight:700">${variantCount} selectable option${variantCount === 1 ? "" : "s"}</div>` : ""}
          <a class="product-link" href="product.html?slug=${encodeURIComponent(product.slug)}">View product details</a>
        </div>
      </article>`;
  }

  async function uploadImage(file, token, altText = "", folder = "products") {
    const form = new FormData();
    form.append("file", file);
    form.append("alt_text", altText);
    form.append("folder", folder);
    return request("upload", { method: "POST", token, body: form });
  }

  window.TinTechAPI = {
    apiUrl: API_URL,
    siteBase: siteBase.href,
    escapeHTML,
    resolveImage,
    formatPrice,
    primaryImage,
    productCard,
    catalog: () => request("catalog", { cache: "default" }),
    siteSettings: () => request("site-settings", { cache: "default" }),
    siteContent: () => request("site-content", { cache: "default" }),
    getProduct: (slug) => request("product", { query: { slug }, cache: "default" }),
    inquiry: (payload) => request("inquiry", { method: "POST", body: payload }),
    login: (password) => request("login", { method: "POST", body: { password } }),
    adminData: (token) => request("admin-data", { method: "POST", token, body: {} }),
    adminAction: (action, token, body = {}) => request(action, { method: "POST", token, body }),
    uploadImage,
  };
})();