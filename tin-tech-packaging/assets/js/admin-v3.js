document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "tintech_admin_session";
  const state = {
    token: localStorage.getItem(STORAGE_KEY) || "",
    data: { products: [], categories: [], inquiries: [], stats: {}, site_settings: {} },
    baseImages: [],
    variants: [],
    appearance: {},
    activeTab: "overview",
    previewDevice: "desktop",
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const loginView = $("#login-view");
  const appView = $("#admin-app");
  const loading = $("#loading-cover");
  const loginForm = $("#login-form");
  const loginStatus = $("#login-status");
  const productModal = $("#product-modal");
  const categoryModal = $("#category-modal");
  const productForm = $("#product-form");
  const categoryForm = $("#category-form");

  function setLoading(show) { loading.classList.toggle("hidden", !show); }
  function toast(message, type = "") {
    const stack = $("#toast-stack");
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 4600);
  }
  function showLogin(message = "") {
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
    loginStatus.textContent = message;
    loginStatus.classList.toggle("hidden", !message);
    setTimeout(() => $("#admin-password")?.focus(), 50);
  }
  function showApp() {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
  }
  function switchTab(tab) {
    state.activeTab = tab;
    $$('[data-admin-tab]').forEach((button) => button.classList.toggle("active", button.dataset.adminTab === tab));
    $$('[data-admin-view]').forEach((view) => view.classList.toggle("active", view.dataset.adminView === tab));
    if (tab === "appearance") updateAppearancePreview();
  }
  function openModal(modal) { modal.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function closeModal(modal) { modal.classList.add("hidden"); document.body.style.overflow = ""; }
  function categoryName(id) { return state.data.categories.find((category) => category.id === id)?.name || "Uncategorized"; }
  function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }

  async function refresh() {
    setLoading(true);
    try {
      state.data = await TinTechAPI.adminData(state.token);
      state.appearance = clone(state.data.site_settings || {});
      showApp();
      renderAll();
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        state.token = "";
        showLogin("Your admin session has expired. Enter the password again.");
      } else {
        toast(error.message || "Could not load the admin dashboard.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  function renderStats() {
    const stats = state.data.stats || {};
    $("#stat-products").textContent = stats.products ?? state.data.products.length;
    $("#stat-published").textContent = stats.published ?? state.data.products.filter((product) => product.is_published).length;
    $("#stat-categories").textContent = stats.categories ?? state.data.categories.length;
    $("#stat-inquiries").textContent = stats.new_inquiries ?? state.data.inquiries.filter((inquiry) => inquiry.status === "new").length;
    const inquiryCount = state.data.inquiries.filter((item) => item.status === "new").length;
    $("#inquiry-tab-count").textContent = inquiryCount;
    $("#inquiry-tab-count").classList.toggle("hidden", inquiryCount === 0);
  }

  function renderOverview() {
    const recentProducts = state.data.products.slice(0, 5);
    const recentInquiries = state.data.inquiries.slice(0, 5);
    $("#overview-products").innerHTML = recentProducts.length
      ? recentProducts.map((product) => {
          const image = TinTechAPI.primaryImage(product);
          return `<div class="table-product" style="padding:10px 0;border-bottom:1px solid #e4ebf1"><div class="table-thumb"><img src="${TinTechAPI.escapeHTML(image.url)}" alt=""></div><div><strong>${TinTechAPI.escapeHTML(product.name)}</strong><span>${TinTechAPI.escapeHTML(categoryName(product.category_id))} · ${product.is_published ? "Published" : "Draft"} · ${(product.variants || []).length} options</span></div></div>`;
        }).join("")
      : `<div class="empty-panel"><h3>No products yet</h3><p>Create the first portfolio item.</p></div>`;
    $("#overview-inquiries").innerHTML = recentInquiries.length
      ? recentInquiries.map((inquiry) => `<div style="padding:10px 0;border-bottom:1px solid #e4ebf1"><strong style="display:block">${TinTechAPI.escapeHTML(inquiry.name)}${inquiry.company ? ` · ${TinTechAPI.escapeHTML(inquiry.company)}` : ""}</strong><span style="display:block;color:#667789;font-size:.72rem">${TinTechAPI.escapeHTML(inquiry.project_type || "Project inquiry")} · ${new Date(inquiry.created_at).toLocaleDateString()}</span></div>`).join("")
      : `<div class="empty-panel"><h3>No inquiries yet</h3><p>New project briefs will appear here.</p></div>`;
  }

  function productRow(product) {
    const image = TinTechAPI.primaryImage(product);
    return `<tr><td><div class="table-product"><div class="table-thumb"><img src="${TinTechAPI.escapeHTML(image.url)}" alt=""></div><div><strong>${TinTechAPI.escapeHTML(product.name)}</strong><span>${TinTechAPI.escapeHTML(product.sku || product.slug)} · ${(product.images || []).length} images · ${(product.variants || []).length} options</span></div></div></td><td>${TinTechAPI.escapeHTML(categoryName(product.category_id))}</td><td>${TinTechAPI.escapeHTML(TinTechAPI.formatPrice(product))}</td><td>${TinTechAPI.escapeHTML(product.moq || "—")}</td><td><span class="status-pill ${product.is_published ? "published" : "draft"}">${product.is_published ? "Published" : "Draft"}</span>${product.is_featured ? `<span class="status-pill featured" style="margin-left:4px">Featured</span>` : ""}</td><td><div class="row-actions"><button class="row-button" type="button" data-edit-product="${product.id}">Edit</button><button class="row-button danger" type="button" data-delete-product="${product.id}">Delete</button></div></td></tr>`;
  }

  function renderProducts() {
    const query = ($("#product-search").value || "").trim().toLowerCase();
    const category = $("#product-category-filter").value || "all";
    const status = $("#product-status-filter").value || "all";
    const products = state.data.products.filter((product) => {
      const haystack = `${product.name} ${product.sku || ""} ${product.slug} ${product.short_description || ""}`.toLowerCase();
      return (!query || haystack.includes(query)) && (category === "all" || product.category_id === category) && (status === "all" || (status === "published" ? product.is_published : !product.is_published));
    });
    $("#product-category-filter").innerHTML = `<option value="all">All categories</option>${state.data.categories.map((item) => `<option value="${item.id}" ${item.id === category ? "selected" : ""}>${TinTechAPI.escapeHTML(item.name)}</option>`).join("")}`;
    $("#products-table-body").innerHTML = products.length ? products.map(productRow).join("") : `<tr><td colspan="6"><div class="empty-panel"><h3>No matching products</h3><p>Change the filters or add a new product.</p></div></td></tr>`;
  }

  function renderCategories() {
    $("#category-grid").innerHTML = state.data.categories.length ? state.data.categories.map((category) => {
      const count = state.data.products.filter((product) => product.category_id === category.id).length;
      return `<article class="category-card"><h3>${TinTechAPI.escapeHTML(category.name)}</h3><p>${TinTechAPI.escapeHTML(category.description || "No description added.")}</p><div class="category-meta"><span>${TinTechAPI.escapeHTML(category.slug)}</span><span>${count} product${count === 1 ? "" : "s"}</span></div><div class="category-actions"><button class="row-button" type="button" data-edit-category="${category.id}">Edit</button><button class="row-button danger" type="button" data-delete-category="${category.id}">Delete</button></div></article>`;
    }).join("") : `<div class="empty-panel"><h3>No categories yet</h3><p>Create categories to organize the portfolio.</p></div>`;
  }

  function renderInquiries() {
    const filter = $("#inquiry-status-filter").value || "all";
    const inquiries = state.data.inquiries.filter((item) => filter === "all" || item.status === filter);
    $("#inquiry-list").innerHTML = inquiries.length ? inquiries.map((inquiry) => `<article class="inquiry-card"><div class="inquiry-head"><div><h3>${TinTechAPI.escapeHTML(inquiry.name)}${inquiry.company ? ` · ${TinTechAPI.escapeHTML(inquiry.company)}` : ""}</h3><span>${new Date(inquiry.created_at).toLocaleString()}</span></div><span class="status-pill ${inquiry.status === "new" ? "draft" : "published"}">${TinTechAPI.escapeHTML(inquiry.status)}</span></div><div class="inquiry-contact"><a href="mailto:${encodeURIComponent(inquiry.email)}">${TinTechAPI.escapeHTML(inquiry.email)}</a>${inquiry.phone ? `<a href="tel:${TinTechAPI.escapeHTML(inquiry.phone)}">${TinTechAPI.escapeHTML(inquiry.phone)}</a>` : ""}${inquiry.destination ? `<span>${TinTechAPI.escapeHTML(inquiry.destination)}</span>` : ""}${inquiry.estimated_quantity ? `<span>Qty: ${TinTechAPI.escapeHTML(inquiry.estimated_quantity)}</span>` : ""}</div><p class="inquiry-message">${TinTechAPI.escapeHTML(inquiry.message)}</p><div class="inquiry-footer"><span>${TinTechAPI.escapeHTML(inquiry.project_type || "General manufacturing inquiry")}</span><select data-inquiry-status="${inquiry.id}">${["new","reviewing","contacted","quoted","closed"].map((status) => `<option value="${status}" ${status === inquiry.status ? "selected" : ""}>${status[0].toUpperCase() + status.slice(1)}</option>`).join("")}</select></div></article>`).join("") : `<div class="empty-panel"><h3>No inquiries in this status</h3><p>Change the filter to review other project briefs.</p></div>`;
  }

  function positionOptions(value) {
    return ["left top","center top","right top","left center","center center","right center","left bottom","center bottom","right bottom"]
      .map((item) => `<option value="${item}" ${item === value ? "selected" : ""}>${item.replace(/\b\w/g, (char) => char.toUpperCase())}</option>`).join("");
  }
  function mediaCurrent(kind) {
    const url = state.appearance[`${kind}_image_url`];
    const mount = $(`#${kind}-current-media`);
    mount.innerHTML = url ? `<img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(url))}" alt=""><div><strong>Current ${kind} image</strong><span>${TinTechAPI.escapeHTML(url)}</span></div><button type="button" data-clear-site-image="${kind}">Remove</button>` : `<div><strong>No ${kind} image uploaded</strong><span>The branded fallback remains visible until an image is saved.</span></div>`;
  }
  function renderAppearanceControls() {
    $("#hero-alt").value = state.appearance.hero_alt_text || "";
    $("#hero-position").innerHTML = positionOptions(state.appearance.hero_position || "center center");
    $("#factory-alt").value = state.appearance.factory_alt_text || "";
    $("#factory-position").innerHTML = positionOptions(state.appearance.factory_position || "center center");
    const height = Math.min(900, Math.max(280, Number(state.appearance.factory_height) || 520));
    $("#factory-height-range").value = height;
    $("#factory-height-number").value = height;
    mediaCurrent("hero");
    mediaCurrent("factory");
    updateAppearancePreview();
  }

  function previewDocument() {
    const heroUrl = state.appearance.hero_image_url ? TinTechAPI.resolveImage(state.appearance.hero_image_url) : TinTechAPI.resolveImage("assets/images/product-pouch-caddy.svg");
    const factoryUrl = state.appearance.factory_image_url ? TinTechAPI.resolveImage(state.appearance.factory_image_url) : "";
    const factoryHeight = Math.min(900, Math.max(280, Number(state.appearance.factory_height) || 520));
    const base = TinTechAPI.siteBase;
    const factoryStyle = factoryUrl ? `--factory-image:url(&quot;${TinTechAPI.escapeHTML(factoryUrl)}&quot;);` : "";
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${TinTechAPI.escapeHTML(base)}"><link rel="stylesheet" href="assets/css/site.css"><link rel="stylesheet" href="assets/css/site-v3.css"><style>body{margin:0}.home-hero{padding-top:52px}.home-hero-copy h1{font-size:clamp(2.4rem,6vw,5.2rem)}.factory-media-section{margin-top:-42px}.preview-label{position:fixed;right:12px;top:12px;z-index:20;padding:7px 10px;border-radius:999px;background:rgba(7,21,37,.78);color:#fff;font:700 10px system-ui;backdrop-filter:blur(10px)}</style></head><body><span class="preview-label">Live layout preview</span><section class="home-hero"><div class="container home-hero-grid"><div class="home-hero-copy"><span class="kicker">Sri Lanka manufacturing · New York coordination</span><h1>From product idea to <span class="accent">repeatable production.</span></h1><p class="hero-lead">Product development, tooling, manufacturing, branding, packing and delivery coordination.</p><div class="hero-actions"><span class="button button-primary">Request a review</span><span class="button button-ghost">View portfolio</span></div></div><div class="home-hero-media"><img class="home-hero-image" src="${TinTechAPI.escapeHTML(heroUrl)}" style="object-position:${TinTechAPI.escapeHTML(state.appearance.hero_position || "center center")}" alt=""><div class="home-hero-media-badge"><span class="badge-dot">TT</span><div><b>Managed hero image</b><span>Changes after Save appearance</span></div></div></div></div></section><section class="factory-media-section"><div class="container"><div class="factory-media" style="--factory-height:${factoryHeight}px;--factory-position:${TinTechAPI.escapeHTML(state.appearance.factory_position || "center center")};${factoryStyle}"><div class="factory-media-copy"><span class="eyebrow">Manufacturing behind the product</span><h2>Built around repeatability, not one-off orders.</h2><p>The factory image stays full width while the white gradient protects the copy over any background.</p><span class="factory-media-note">Sri Lanka manufacturing operation</span></div></div></div></section><section class="proof-strip proof-strip-overlap"><div class="container proof-grid"><div class="proof-item proof-intro">The factory panel overlaps this proof section.</div><div class="proof-item"><strong>4+ years</strong><span>Ongoing supply</span></div><div class="proof-item"><strong>1M+</strong><span>Pieces sold</span></div><div class="proof-item"><strong>End-to-end</strong><span>Development to delivery</span></div></div></section></body></html>`;
  }
  function updateAppearancePreview() {
    const frame = $("#appearance-preview");
    if (frame) frame.srcdoc = previewDocument();
    const shell = $("#preview-frame-shell");
    if (shell) shell.classList.toggle("mobile", state.previewDevice === "mobile");
    $$('[data-preview-device]').forEach((button) => button.classList.toggle("active", button.dataset.previewDevice === state.previewDevice));
  }

  function renderAll() {
    renderStats(); renderOverview(); renderProducts(); renderCategories(); renderInquiries(); renderAppearanceControls(); switchTab(state.activeTab);
  }

  function addSpecRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "spec-row";
    row.innerHTML = `<input type="text" data-spec-key placeholder="Specification" value="${TinTechAPI.escapeHTML(key)}"><input type="text" data-spec-value placeholder="Value" value="${TinTechAPI.escapeHTML(value)}"><button class="spec-remove" type="button" aria-label="Remove specification">Remove</button>`;
    $("#spec-editor").appendChild(row);
  }
  function renderBaseImages() {
    $("#image-manager").innerHTML = state.baseImages.length ? state.baseImages.map((image, index) => `<div class="image-item"><img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}" alt="${TinTechAPI.escapeHTML(image.alt_text || "")}"><button class="image-remove" type="button" data-remove-base-image="${index}" aria-label="Remove image">×</button></div>`).join("") : `<div class="empty-panel" style="grid-column:1/-1;padding:24px"><h3>No general product images</h3><p>Upload one or more images, or use option-specific galleries below.</p></div>`;
  }
  function blankVariant() {
    return { variant_type:"color", label:"", value:"", color_hex:"#1b3658", swatch_image_url:null, swatch_storage_path:null, is_default:state.variants.length === 0, sort_order:(state.variants.length + 1) * 10, images:[] };
  }
  function renderVariants() {
    const mount = $("#variant-editor");
    mount.innerHTML = state.variants.length ? state.variants.map((variant, index) => {
      const swatch = variant.swatch_image_url ? TinTechAPI.resolveImage(variant.swatch_image_url) : "";
      return `<article class="variant-card" data-variant-card="${index}"><div class="variant-card-head"><strong>Option ${index + 1}${variant.label ? ` · ${TinTechAPI.escapeHTML(variant.label)}` : ""}</strong><div class="variant-card-head-actions"><label class="variant-default"><input type="radio" name="variant-default" data-variant-default="${index}" ${variant.is_default ? "checked" : ""}> Default</label><button class="variant-remove" type="button" data-remove-variant="${index}">Remove</button></div></div><div class="variant-fields"><div class="variant-field"><label>Option type</label><select data-variant-field="variant_type" data-variant-index="${index}">${["color","print","finish","style"].map((type) => `<option value="${type}" ${variant.variant_type === type ? "selected" : ""}>${type[0].toUpperCase()+type.slice(1)}</option>`).join("")}</select></div><div class="variant-field"><label>Customer-facing label</label><input data-variant-field="label" data-variant-index="${index}" value="${TinTechAPI.escapeHTML(variant.label || "")}" placeholder="Black, Floral Print, Matte"></div><div class="variant-field"><label>Internal value / code</label><input data-variant-field="value" data-variant-index="${index}" value="${TinTechAPI.escapeHTML(variant.value || "")}" placeholder="BLK-01"></div><div class="variant-field"><label>Color swatch</label><input type="color" data-variant-field="color_hex" data-variant-index="${index}" value="${/^#[0-9a-f]{6}$/i.test(variant.color_hex || "") ? variant.color_hex : "#1b3658"}"></div><div class="variant-field"><label>Sort order</label><input type="number" data-variant-field="sort_order" data-variant-index="${index}" value="${Number(variant.sort_order) || (index+1)*10}"></div><div class="variant-field span-2"><label>Print / finish swatch image</label><div style="display:flex;gap:10px;align-items:center"><img class="variant-swatch-preview" src="${TinTechAPI.escapeHTML(swatch || TinTechAPI.resolveImage("assets/images/product-placeholder.svg"))}" alt=""><input type="file" accept="image/*" data-variant-swatch-file="${index}"></div></div><div class="variant-field"><label>&nbsp;</label><button class="admin-button outline" type="button" data-upload-variant-swatch="${index}">Upload swatch</button></div></div><div class="variant-image-upload"><input type="file" accept="image/*" multiple data-variant-image-files="${index}"><button class="admin-button outline" type="button" data-upload-variant-images="${index}">Upload option images</button></div><div class="variant-gallery">${(variant.images || []).map((image, imageIndex) => `<div class="variant-image-item"><img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}" alt=""><button type="button" data-remove-variant-image="${index}:${imageIndex}">×</button></div>`).join("")}</div><p class="variant-help">Selecting this option on the product page replaces the main gallery with these images. Add several angles, print views or detail shots.</p></article>`;
    }).join("") : `<div class="empty-panel"><h3>No selectable options yet</h3><p>Add a Color, Print, Finish or Style. Each option can have its own swatch and multiple product images.</p></div>`;
  }

  function openProductEditor(id = "") {
    productForm.reset();
    $("#product-id").value = "";
    $("#product-modal-title").textContent = id ? "Edit product" : "Add product";
    $("#product-category").innerHTML = `<option value="">Uncategorized</option>${state.data.categories.map((category) => `<option value="${category.id}">${TinTechAPI.escapeHTML(category.name)}</option>`).join("")}`;
    $("#spec-editor").innerHTML = "";
    const product = id ? state.data.products.find((item) => item.id === id) : null;
    state.baseImages = clone(product?.images || []);
    state.variants = clone(product?.variants || []);
    if (product) {
      $("#product-id").value = product.id;
      $("#product-name").value = product.name || ""; $("#product-slug").value = product.slug || ""; $("#product-sku").value = product.sku || ""; $("#product-category").value = product.category_id || "";
      $("#product-short").value = product.short_description || ""; $("#product-description").value = product.description || ""; $("#product-price-min").value = product.price_min ?? ""; $("#product-price-max").value = product.price_max ?? ""; $("#product-currency").value = product.currency || "USD"; $("#product-price-unit").value = product.price_unit || ""; $("#product-price-note").value = product.price_note || ""; $("#product-moq").value = product.moq || ""; $("#product-dimensions").value = product.dimensions || ""; $("#product-material").value = product.material || ""; $("#product-lead-time").value = product.lead_time || ""; $("#product-tags").value = (product.tags || []).join(", "); $("#product-sort").value = product.sort_order ?? 0; $("#product-seo-title").value = product.seo_title || ""; $("#product-seo-description").value = product.seo_description || ""; $("#product-published").checked = Boolean(product.is_published); $("#product-featured").checked = Boolean(product.is_featured);
      Object.entries(product.technical_data || {}).forEach(([key, value]) => addSpecRow(key, value));
    } else {
      $("#product-currency").value = "USD"; $("#product-sort").value = state.data.products.length * 10 + 10; $("#product-published").checked = true; addSpecRow();
    }
    if (!$("#spec-editor").children.length) addSpecRow();
    renderBaseImages(); renderVariants(); openModal(productModal);
  }

  async function uploadFiles(files, folder, altText, onUploaded, button) {
    const list = Array.from(files || []);
    if (!list.length) return toast("Choose at least one image first.", "error");
    const original = button.textContent;
    button.disabled = true;
    try {
      for (let index = 0; index < list.length; index++) {
        button.textContent = `Uploading ${index + 1}/${list.length}…`;
        const result = await TinTechAPI.uploadImage(list[index], state.token, altText, folder);
        onUploaded(result);
      }
      toast(`${list.length} image${list.length === 1 ? "" : "s"} uploaded.`, "success");
    } catch (error) {
      toast(error.message || "Image upload failed.", "error");
    } finally {
      button.disabled = false; button.textContent = original;
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const button = $("#save-product");
    const min = $("#product-price-min").value === "" ? null : Number($("#product-price-min").value);
    const max = $("#product-price-max").value === "" ? null : Number($("#product-price-max").value);
    if (min !== null && max !== null && max < min) return toast("Maximum price cannot be lower than minimum price.", "error");
    if (state.variants.some((variant) => !String(variant.label || "").trim())) return toast("Every product option needs a customer-facing label.", "error");
    button.disabled = true; button.textContent = "Saving…";
    const technicalData = {};
    $$(".spec-row", $("#spec-editor")).forEach((row) => { const key = $("[data-spec-key]", row).value.trim(); const value = $("[data-spec-value]", row).value.trim(); if (key && value) technicalData[key] = value; });
    const product = {
      id: $("#product-id").value || undefined, name: $("#product-name").value, slug: $("#product-slug").value, sku: $("#product-sku").value, category_id: $("#product-category").value || null,
      short_description: $("#product-short").value, description: $("#product-description").value, price_min: $("#product-price-min").value, price_max: $("#product-price-max").value, currency: $("#product-currency").value, price_unit: $("#product-price-unit").value, price_note: $("#product-price-note").value, moq: $("#product-moq").value, dimensions: $("#product-dimensions").value, material: $("#product-material").value, lead_time: $("#product-lead-time").value, tags: $("#product-tags").value, sort_order: $("#product-sort").value, seo_title: $("#product-seo-title").value, seo_description: $("#product-seo-description").value, is_published: $("#product-published").checked, is_featured: $("#product-featured").checked, technical_data: technicalData,
      images: state.baseImages.map((image, index) => ({ ...image, sort_order:(index+1)*10 })), variants: state.variants.map((variant, index) => ({ ...variant, sort_order:Number(variant.sort_order) || (index+1)*10, images:(variant.images || []).map((image, imageIndex) => ({ ...image, sort_order:(imageIndex+1)*10 })) })),
    };
    try {
      const result = await TinTechAPI.adminAction("save-product", state.token, { product });
      if (!product.slug && result.product?.slug) toast(`Product saved. URL created as ${result.product.slug}.`, "success"); else toast(product.id ? "Product updated." : "Product created.", "success");
      closeModal(productModal); await refresh(); switchTab("products");
    } catch (error) { toast(error.message || "Could not save the product.", "error"); }
    finally { button.disabled = false; button.textContent = "Save product"; }
  }

  function openCategoryEditor(id = "") {
    categoryForm.reset(); $("#category-id").value = ""; $("#category-modal-title").textContent = id ? "Edit category" : "Add category";
    const category = id ? state.data.categories.find((item) => item.id === id) : null;
    if (category) { $("#category-id").value = category.id; $("#category-name").value = category.name || ""; $("#category-slug").value = category.slug || ""; $("#category-description").value = category.description || ""; $("#category-sort").value = category.sort_order ?? 0; $("#category-active").checked = Boolean(category.is_active); }
    else { $("#category-sort").value = state.data.categories.length * 10 + 10; $("#category-active").checked = true; }
    openModal(categoryModal);
  }
  async function saveCategory(event) {
    event.preventDefault(); const button = $("#save-category"); button.disabled = true;
    const category = { id: $("#category-id").value || undefined, name: $("#category-name").value, slug: $("#category-slug").value, description: $("#category-description").value, sort_order: $("#category-sort").value, is_active: $("#category-active").checked };
    try { await TinTechAPI.adminAction("save-category", state.token, { category }); toast(category.id ? "Category updated." : "Category created.", "success"); closeModal(categoryModal); await refresh(); switchTab("categories"); }
    catch (error) { toast(error.message || "Could not save the category.", "error"); }
    finally { button.disabled = false; }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); const password = $("#admin-password").value; const button = loginForm.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Checking…"; loginStatus.classList.add("hidden");
    try { const result = await TinTechAPI.login(password); state.token = result.token; localStorage.setItem(STORAGE_KEY, result.token); $("#admin-password").value = ""; await refresh(); toast("Admin session opened.", "success"); }
    catch (error) { loginStatus.textContent = error.message || "Login failed."; loginStatus.classList.remove("hidden"); }
    finally { button.disabled = false; button.textContent = "Open admin portal"; }
  });
  $("#logout-button").addEventListener("click", async () => { try { await TinTechAPI.adminAction("logout", state.token); } catch {} localStorage.removeItem(STORAGE_KEY); state.token = ""; showLogin(); });
  $$('[data-admin-tab]').forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.adminTab)));
  $$('[data-open-products]').forEach((button) => button.addEventListener("click", () => switchTab("products")));
  $$('[data-open-inquiries]').forEach((button) => button.addEventListener("click", () => switchTab("inquiries")));
  $("#add-product-button").addEventListener("click", () => openProductEditor());
  $("#add-category-button").addEventListener("click", () => openCategoryEditor());
  $("#add-spec-button").addEventListener("click", () => addSpecRow());
  $("#add-variant-button").addEventListener("click", () => { state.variants.push(blankVariant()); renderVariants(); });
  productForm.addEventListener("submit", saveProduct); categoryForm.addEventListener("submit", saveCategory);
  $$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".admin-modal"))));
  $$(".admin-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal); }));
  $("#spec-editor").addEventListener("click", (event) => { const button = event.target.closest(".spec-remove"); if (button) button.closest(".spec-row").remove(); });
  $("#image-manager").addEventListener("click", (event) => { const button = event.target.closest("[data-remove-base-image]"); if (!button) return; state.baseImages.splice(Number(button.dataset.removeBaseImage), 1); renderBaseImages(); });
  $("#upload-image-button").addEventListener("click", async (event) => {
    const input = $("#product-image-file"); await uploadFiles(input.files, "products", $("#product-name").value || "Tin Tech product", (result) => state.baseImages.push(result), event.currentTarget); input.value = ""; renderBaseImages();
  });

  $("#variant-editor").addEventListener("input", (event) => {
    const field = event.target.dataset.variantField; const index = Number(event.target.dataset.variantIndex); if (!field || !state.variants[index]) return;
    state.variants[index][field] = event.target.value;
  });
  $("#variant-editor").addEventListener("change", (event) => {
    if (event.target.matches("[data-variant-default]")) { const index = Number(event.target.dataset.variantDefault); state.variants.forEach((variant, itemIndex) => variant.is_default = itemIndex === index); }
  });
  $("#variant-editor").addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-remove-variant]");
    if (remove) { const index = Number(remove.dataset.removeVariant); const wasDefault = state.variants[index]?.is_default; state.variants.splice(index, 1); if (wasDefault && state.variants.length) state.variants[0].is_default = true; renderVariants(); return; }
    const removeImage = event.target.closest("[data-remove-variant-image]");
    if (removeImage) { const [variantIndex, imageIndex] = removeImage.dataset.removeVariantImage.split(":").map(Number); state.variants[variantIndex]?.images?.splice(imageIndex, 1); renderVariants(); return; }
    const swatchButton = event.target.closest("[data-upload-variant-swatch]");
    if (swatchButton) { const index = Number(swatchButton.dataset.uploadVariantSwatch); const input = $(`[data-variant-swatch-file="${index}"]`); await uploadFiles(input.files, "variants", state.variants[index].label || "Option swatch", (result) => { state.variants[index].swatch_image_url = result.image_url; state.variants[index].swatch_storage_path = result.storage_path; }, swatchButton); renderVariants(); return; }
    const imagesButton = event.target.closest("[data-upload-variant-images]");
    if (imagesButton) { const index = Number(imagesButton.dataset.uploadVariantImages); const input = $(`[data-variant-image-files="${index}"]`); await uploadFiles(input.files, "variants", `${$("#product-name").value || "Tin Tech product"} - ${state.variants[index].label || "option"}`, (result) => state.variants[index].images.push(result), imagesButton); renderVariants(); }
  });

  document.addEventListener("click", async (event) => {
    const editProduct = event.target.closest("[data-edit-product]"); if (editProduct) return openProductEditor(editProduct.dataset.editProduct);
    const deleteProduct = event.target.closest("[data-delete-product]"); if (deleteProduct && confirm("Delete this product and its catalog images?")) { try { await TinTechAPI.adminAction("delete-product", state.token, { id:deleteProduct.dataset.deleteProduct }); toast("Product deleted.", "success"); await refresh(); switchTab("products"); } catch (error) { toast(error.message, "error"); } return; }
    const editCategory = event.target.closest("[data-edit-category]"); if (editCategory) return openCategoryEditor(editCategory.dataset.editCategory);
    const deleteCategory = event.target.closest("[data-delete-category]"); if (deleteCategory && confirm("Delete this category? Products will become uncategorized.")) { try { await TinTechAPI.adminAction("delete-category", state.token, { id:deleteCategory.dataset.deleteCategory }); toast("Category deleted.", "success"); await refresh(); switchTab("categories"); } catch (error) { toast(error.message, "error"); } return; }
    const clearSite = event.target.closest("[data-clear-site-image]"); if (clearSite) { const kind = clearSite.dataset.clearSiteImage; state.appearance[`${kind}_image_url`] = null; state.appearance[`${kind}_storage_path`] = null; mediaCurrent(kind); updateAppearancePreview(); }
  });
  $("#product-search").addEventListener("input", renderProducts); $("#product-category-filter").addEventListener("change", renderProducts); $("#product-status-filter").addEventListener("change", renderProducts); $("#inquiry-status-filter").addEventListener("change", renderInquiries);
  $("#inquiry-list").addEventListener("change", async (event) => { const select = event.target.closest("[data-inquiry-status]"); if (!select) return; try { await TinTechAPI.adminAction("update-inquiry", state.token, { id:select.dataset.inquiryStatus, status:select.value }); toast("Inquiry status updated.", "success"); await refresh(); switchTab("inquiries"); } catch (error) { toast(error.message, "error"); } });

  ["hero-alt","hero-position","factory-alt","factory-position","factory-height-range","factory-height-number"].forEach((id) => $("#"+id).addEventListener("input", () => {
    state.appearance.hero_alt_text = $("#hero-alt").value; state.appearance.hero_position = $("#hero-position").value; state.appearance.factory_alt_text = $("#factory-alt").value; state.appearance.factory_position = $("#factory-position").value;
    const source = id === "factory-height-number" ? $("#factory-height-number") : $("#factory-height-range"); const height = Math.min(900, Math.max(280, Number(source.value) || 520)); state.appearance.factory_height = height; $("#factory-height-range").value = height; $("#factory-height-number").value = height; updateAppearancePreview();
  }));
  $("#upload-hero-button").addEventListener("click", async (event) => { const input = $("#hero-image-file"); await uploadFiles(input.files, "site", $("#hero-alt").value || "Tin Tech hero", (result) => { state.appearance.hero_image_url = result.image_url; state.appearance.hero_storage_path = result.storage_path; }, event.currentTarget); input.value=""; mediaCurrent("hero"); updateAppearancePreview(); });
  $("#upload-factory-button").addEventListener("click", async (event) => { const input = $("#factory-image-file"); await uploadFiles(input.files, "site", $("#factory-alt").value || "Tin Tech factory", (result) => { state.appearance.factory_image_url = result.image_url; state.appearance.factory_storage_path = result.storage_path; }, event.currentTarget); input.value=""; mediaCurrent("factory"); updateAppearancePreview(); });
  $("#save-appearance-button").addEventListener("click", async (event) => { const button = event.currentTarget; button.disabled = true; button.textContent = "Saving…"; try { const result = await TinTechAPI.adminAction("save-site-settings", state.token, { settings:state.appearance }); state.appearance = clone(result.site_settings); state.data.site_settings = clone(result.site_settings); toast("Homepage appearance is live.", "success"); renderAppearanceControls(); } catch (error) { toast(error.message || "Could not save appearance.", "error"); } finally { button.disabled=false; button.textContent="Save appearance"; } });
  $$('[data-preview-device]').forEach((button) => button.addEventListener("click", () => { state.previewDevice = button.dataset.previewDevice; updateAppearancePreview(); }));

  if (state.token) refresh(); else showLogin();
});
