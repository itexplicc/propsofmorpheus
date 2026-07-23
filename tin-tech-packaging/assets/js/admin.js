document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "tintech_admin_session";
  const state = {
    token: localStorage.getItem(STORAGE_KEY) || "",
    data: { products: [], categories: [], inquiries: [], stats: {} },
    images: [],
    activeTab: "overview",
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

  function setLoading(show) {
    loading.classList.toggle("hidden", !show);
  }

  function toast(message, type = "") {
    const stack = $("#toast-stack");
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3800);
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
    $$("[data-admin-tab]").forEach((button) => button.classList.toggle("active", button.dataset.adminTab === tab));
    $$("[data-admin-view]").forEach((view) => view.classList.toggle("active", view.dataset.adminView === tab));
  }

  async function refresh() {
    setLoading(true);
    try {
      state.data = await TinTechAPI.adminData(state.token);
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

  function categoryName(id) {
    return state.data.categories.find((category) => category.id === id)?.name || "Uncategorized";
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
          return `
            <div class="table-product" style="padding:10px 0;border-bottom:1px solid #e4ebf1">
              <div class="table-thumb"><img src="${TinTechAPI.escapeHTML(image.url)}" alt=""></div>
              <div><strong>${TinTechAPI.escapeHTML(product.name)}</strong><span>${TinTechAPI.escapeHTML(categoryName(product.category_id))} · ${product.is_published ? "Published" : "Draft"}</span></div>
            </div>`;
        }).join("")
      : `<div class="empty-panel"><h3>No products yet</h3><p>Create the first portfolio item.</p></div>`;

    $("#overview-inquiries").innerHTML = recentInquiries.length
      ? recentInquiries.map((inquiry) => `
          <div style="padding:10px 0;border-bottom:1px solid #e4ebf1">
            <strong style="display:block">${TinTechAPI.escapeHTML(inquiry.name)}${inquiry.company ? ` · ${TinTechAPI.escapeHTML(inquiry.company)}` : ""}</strong>
            <span style="display:block;color:#667789;font-size:.72rem">${TinTechAPI.escapeHTML(inquiry.project_type || "Project inquiry")} · ${new Date(inquiry.created_at).toLocaleDateString()}</span>
          </div>`).join("")
      : `<div class="empty-panel"><h3>No inquiries yet</h3><p>New project briefs will appear here.</p></div>`;
  }

  function productRow(product) {
    const image = TinTechAPI.primaryImage(product);
    return `
      <tr>
        <td>
          <div class="table-product">
            <div class="table-thumb"><img src="${TinTechAPI.escapeHTML(image.url)}" alt=""></div>
            <div><strong>${TinTechAPI.escapeHTML(product.name)}</strong><span>${TinTechAPI.escapeHTML(product.sku || product.slug)}</span></div>
          </div>
        </td>
        <td>${TinTechAPI.escapeHTML(categoryName(product.category_id))}</td>
        <td>${TinTechAPI.escapeHTML(TinTechAPI.formatPrice(product))}</td>
        <td>${TinTechAPI.escapeHTML(product.moq || "—")}</td>
        <td>
          <span class="status-pill ${product.is_published ? "published" : "draft"}">${product.is_published ? "Published" : "Draft"}</span>
          ${product.is_featured ? `<span class="status-pill featured" style="margin-left:4px">Featured</span>` : ""}
        </td>
        <td>
          <div class="row-actions">
            <button class="row-button" type="button" data-edit-product="${product.id}">Edit</button>
            <button class="row-button danger" type="button" data-delete-product="${product.id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  function renderProducts() {
    const query = ($("#product-search").value || "").trim().toLowerCase();
    const category = $("#product-category-filter").value || "all";
    const status = $("#product-status-filter").value || "all";

    const products = state.data.products.filter((product) => {
      const text = `${product.name} ${product.sku || ""} ${product.slug} ${product.short_description || ""}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesCategory = category === "all" || product.category_id === category;
      const matchesStatus = status === "all" || (status === "published" ? product.is_published : !product.is_published);
      return matchesQuery && matchesCategory && matchesStatus;
    });

    $("#product-category-filter").innerHTML = `
      <option value="all">All categories</option>
      ${state.data.categories.map((item) => `<option value="${item.id}" ${item.id === category ? "selected" : ""}>${TinTechAPI.escapeHTML(item.name)}</option>`).join("")}`;

    $("#products-table-body").innerHTML = products.length
      ? products.map(productRow).join("")
      : `<tr><td colspan="6"><div class="empty-panel"><h3>No matching products</h3><p>Change the filters or add a new product.</p></div></td></tr>`;
  }

  function renderCategories() {
    $("#category-grid").innerHTML = state.data.categories.length
      ? state.data.categories.map((category) => {
          const productCount = state.data.products.filter((product) => product.category_id === category.id).length;
          return `
            <article class="category-card">
              <h3>${TinTechAPI.escapeHTML(category.name)}</h3>
              <p>${TinTechAPI.escapeHTML(category.description || "No description added.")}</p>
              <div class="category-meta"><span>${TinTechAPI.escapeHTML(category.slug)}</span><span>${productCount} product${productCount === 1 ? "" : "s"}</span></div>
              <div class="category-actions">
                <button class="row-button" type="button" data-edit-category="${category.id}">Edit</button>
                <button class="row-button danger" type="button" data-delete-category="${category.id}">Delete</button>
              </div>
            </article>`;
        }).join("")
      : `<div class="empty-panel"><h3>No categories yet</h3><p>Create categories to organize the portfolio.</p></div>`;
  }

  function renderInquiries() {
    const statusFilter = $("#inquiry-status-filter").value || "all";
    const inquiries = state.data.inquiries.filter((item) => statusFilter === "all" || item.status === statusFilter);

    $("#inquiry-list").innerHTML = inquiries.length
      ? inquiries.map((inquiry) => `
          <article class="inquiry-card">
            <div class="inquiry-head">
              <div><h3>${TinTechAPI.escapeHTML(inquiry.name)}${inquiry.company ? ` · ${TinTechAPI.escapeHTML(inquiry.company)}` : ""}</h3><span>${new Date(inquiry.created_at).toLocaleString()}</span></div>
              <span class="status-pill ${inquiry.status === "new" ? "draft" : "published"}">${TinTechAPI.escapeHTML(inquiry.status)}</span>
            </div>
            <div class="inquiry-contact">
              <a href="mailto:${encodeURIComponent(inquiry.email)}">${TinTechAPI.escapeHTML(inquiry.email)}</a>
              ${inquiry.phone ? `<a href="tel:${TinTechAPI.escapeHTML(inquiry.phone)}">${TinTechAPI.escapeHTML(inquiry.phone)}</a>` : ""}
              ${inquiry.destination ? `<span>${TinTechAPI.escapeHTML(inquiry.destination)}</span>` : ""}
              ${inquiry.estimated_quantity ? `<span>Qty: ${TinTechAPI.escapeHTML(inquiry.estimated_quantity)}</span>` : ""}
            </div>
            <p class="inquiry-message">${TinTechAPI.escapeHTML(inquiry.message)}</p>
            <div class="inquiry-footer">
              <span>${TinTechAPI.escapeHTML(inquiry.project_type || "General manufacturing inquiry")}</span>
              <select data-inquiry-status="${inquiry.id}">
                ${["new","reviewing","contacted","quoted","closed"].map((status) => `<option value="${status}" ${status === inquiry.status ? "selected" : ""}>${status[0].toUpperCase() + status.slice(1)}</option>`).join("")}
              </select>
            </div>
          </article>`).join("")
      : `<div class="empty-panel"><h3>No inquiries in this status</h3><p>Change the filter to review other project briefs.</p></div>`;
  }

  function renderAll() {
    renderStats();
    renderOverview();
    renderProducts();
    renderCategories();
    renderInquiries();
    switchTab(state.activeTab);
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function addSpecRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "spec-row";
    row.innerHTML = `
      <input type="text" data-spec-key placeholder="Specification" value="${TinTechAPI.escapeHTML(key)}">
      <input type="text" data-spec-value placeholder="Value" value="${TinTechAPI.escapeHTML(value)}">
      <button class="spec-remove" type="button" aria-label="Remove specification">Remove</button>`;
    $("#spec-editor").appendChild(row);
  }

  function renderEditorImages() {
    $("#image-manager").innerHTML = state.images.length
      ? state.images.map((image, index) => `
          <div class="image-item">
            <img src="${TinTechAPI.escapeHTML(TinTechAPI.resolveImage(image.image_url))}" alt="${TinTechAPI.escapeHTML(image.alt_text || "")}">
            <button class="image-remove" type="button" data-remove-image="${index}" aria-label="Remove image">×</button>
          </div>`).join("")
      : `<div class="empty-panel" style="grid-column:1/-1;padding:24px"><h3>No product images</h3><p>Upload an image or save with the branded placeholder.</p></div>`;
  }

  function openProductEditor(id = "") {
    productForm.reset();
    $("#product-id").value = "";
    $("#product-modal-title").textContent = id ? "Edit product" : "Add product";
    $("#product-category").innerHTML = `<option value="">Uncategorized</option>${state.data.categories.map((category) => `<option value="${category.id}">${TinTechAPI.escapeHTML(category.name)}</option>`).join("")}`;
    $("#spec-editor").innerHTML = "";
    state.images = [];

    const product = id ? state.data.products.find((item) => item.id === id) : null;
    if (product) {
      $("#product-id").value = product.id;
      $("#product-name").value = product.name || "";
      $("#product-slug").value = product.slug || "";
      $("#product-sku").value = product.sku || "";
      $("#product-category").value = product.category_id || "";
      $("#product-short").value = product.short_description || "";
      $("#product-description").value = product.description || "";
      $("#product-price-min").value = product.price_min ?? "";
      $("#product-price-max").value = product.price_max ?? "";
      $("#product-currency").value = product.currency || "USD";
      $("#product-price-unit").value = product.price_unit || "";
      $("#product-price-note").value = product.price_note || "";
      $("#product-moq").value = product.moq || "";
      $("#product-dimensions").value = product.dimensions || "";
      $("#product-material").value = product.material || "";
      $("#product-lead-time").value = product.lead_time || "";
      $("#product-tags").value = (product.tags || []).join(", ");
      $("#product-sort").value = product.sort_order ?? 0;
      $("#product-seo-title").value = product.seo_title || "";
      $("#product-seo-description").value = product.seo_description || "";
      $("#product-published").checked = Boolean(product.is_published);
      $("#product-featured").checked = Boolean(product.is_featured);
      Object.entries(product.technical_data || {}).forEach(([key, value]) => addSpecRow(key, value));
      state.images = (product.images || []).map((image) => ({
        image_url: image.image_url,
        storage_path: image.storage_path || null,
        alt_text: image.alt_text || "",
        sort_order: image.sort_order || 0,
      }));
    } else {
      $("#product-currency").value = "USD";
      $("#product-sort").value = state.data.products.length * 10 + 10;
      addSpecRow();
    }

    if (!$("#spec-editor").children.length) addSpecRow();
    renderEditorImages();
    openModal(productModal);
  }

  async function saveProduct(event) {
    event.preventDefault();
    const button = $("#save-product");
    button.disabled = true;
    button.textContent = "Saving…";

    const technicalData = {};
    $$(".spec-row", $("#spec-editor")).forEach((row) => {
      const key = $("[data-spec-key]", row).value.trim();
      const value = $("[data-spec-value]", row).value.trim();
      if (key && value) technicalData[key] = value;
    });

    const product = {
      id: $("#product-id").value || undefined,
      name: $("#product-name").value,
      slug: $("#product-slug").value,
      sku: $("#product-sku").value,
      category_id: $("#product-category").value || null,
      short_description: $("#product-short").value,
      description: $("#product-description").value,
      price_min: $("#product-price-min").value,
      price_max: $("#product-price-max").value,
      currency: $("#product-currency").value,
      price_unit: $("#product-price-unit").value,
      price_note: $("#product-price-note").value,
      moq: $("#product-moq").value,
      dimensions: $("#product-dimensions").value,
      material: $("#product-material").value,
      lead_time: $("#product-lead-time").value,
      tags: $("#product-tags").value,
      sort_order: $("#product-sort").value,
      seo_title: $("#product-seo-title").value,
      seo_description: $("#product-seo-description").value,
      is_published: $("#product-published").checked,
      is_featured: $("#product-featured").checked,
      technical_data: technicalData,
      images: state.images.map((image, index) => ({ ...image, sort_order: (index + 1) * 10 })),
    };

    try {
      await TinTechAPI.adminAction("save-product", state.token, { product });
      toast(product.id ? "Product updated." : "Product created.", "success");
      closeModal(productModal);
      await refresh();
      switchTab("products");
    } catch (error) {
      toast(error.message || "Could not save the product.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save product";
    }
  }

  function openCategoryEditor(id = "") {
    categoryForm.reset();
    $("#category-id").value = "";
    $("#category-modal-title").textContent = id ? "Edit category" : "Add category";
    const category = id ? state.data.categories.find((item) => item.id === id) : null;

    if (category) {
      $("#category-id").value = category.id;
      $("#category-name").value = category.name || "";
      $("#category-slug").value = category.slug || "";
      $("#category-description").value = category.description || "";
      $("#category-sort").value = category.sort_order ?? 0;
      $("#category-active").checked = Boolean(category.is_active);
    } else {
      $("#category-sort").value = state.data.categories.length * 10 + 10;
      $("#category-active").checked = true;
    }

    openModal(categoryModal);
  }

  async function saveCategory(event) {
    event.preventDefault();
    const button = $("#save-category");
    button.disabled = true;
    const category = {
      id: $("#category-id").value || undefined,
      name: $("#category-name").value,
      slug: $("#category-slug").value,
      description: $("#category-description").value,
      sort_order: $("#category-sort").value,
      is_active: $("#category-active").checked,
    };

    try {
      await TinTechAPI.adminAction("save-category", state.token, { category });
      toast(category.id ? "Category updated." : "Category created.", "success");
      closeModal(categoryModal);
      await refresh();
      switchTab("categories");
    } catch (error) {
      toast(error.message || "Could not save the category.", "error");
    } finally {
      button.disabled = false;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#admin-password").value;
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Checking…";
    loginStatus.classList.add("hidden");

    try {
      const result = await TinTechAPI.login(password);
      state.token = result.token;
      localStorage.setItem(STORAGE_KEY, result.token);
      $("#admin-password").value = "";
      await refresh();
      toast("Admin session opened.", "success");
    } catch (error) {
      loginStatus.textContent = error.message || "Login failed.";
      loginStatus.classList.remove("hidden");
    } finally {
      button.disabled = false;
      button.textContent = "Open admin portal";
    }
  });

  $("#logout-button").addEventListener("click", async () => {
    try { await TinTechAPI.adminAction("logout", state.token); } catch {}
    localStorage.removeItem(STORAGE_KEY);
    state.token = "";
    showLogin();
  });

  $$("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.adminTab)));
  $$("[data-open-products]").forEach((button) => button.addEventListener("click", () => switchTab("products")));
  $$("[data-open-inquiries]").forEach((button) => button.addEventListener("click", () => switchTab("inquiries")));

  $("#add-product-button").addEventListener("click", () => openProductEditor());
  $("#add-category-button").addEventListener("click", () => openCategoryEditor());
  $("#add-spec-button").addEventListener("click", () => addSpecRow());
  productForm.addEventListener("submit", saveProduct);
  categoryForm.addEventListener("submit", saveCategory);

  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".admin-modal"))));
  $$(".admin-modal").forEach((modal) => modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  }));

  $("#spec-editor").addEventListener("click", (event) => {
    const button = event.target.closest(".spec-remove");
    if (button) button.closest(".spec-row").remove();
  });

  $("#image-manager").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-image]");
    if (!button) return;
    state.images.splice(Number(button.dataset.removeImage), 1);
    renderEditorImages();
  });

  $("#upload-image-button").addEventListener("click", async () => {
    const input = $("#product-image-file");
    const file = input.files?.[0];
    if (!file) return toast("Choose an image first.", "error");

    const button = $("#upload-image-button");
    button.disabled = true;
    button.textContent = "Uploading…";

    try {
      const result = await TinTechAPI.uploadImage(file, state.token, $("#product-name").value || "Tin Tech product");
      state.images.push({
        image_url: result.image_url,
        storage_path: result.storage_path,
        alt_text: result.alt_text || $("#product-name").value,
      });
      input.value = "";
      renderEditorImages();
      toast("Image uploaded.", "success");
    } catch (error) {
      toast(error.message || "Image upload failed.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Upload image";
    }
  });

  $("#products-table-body").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-product]");
    if (edit) return openProductEditor(edit.dataset.editProduct);

    const remove = event.target.closest("[data-delete-product]");
    if (!remove) return;
    const product = state.data.products.find((item) => item.id === remove.dataset.deleteProduct);
    if (!confirm(`Delete “${product?.name || "this product"}”? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await TinTechAPI.adminAction("delete-product", state.token, { id: remove.dataset.deleteProduct });
      toast("Product deleted.", "success");
      await refresh();
      switchTab("products");
    } catch (error) {
      toast(error.message || "Could not delete the product.", "error");
    } finally {
      setLoading(false);
    }
  });

  $("#category-grid").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-category]");
    if (edit) return openCategoryEditor(edit.dataset.editCategory);

    const remove = event.target.closest("[data-delete-category]");
    if (!remove) return;
    const category = state.data.categories.find((item) => item.id === remove.dataset.deleteCategory);
    if (!confirm(`Delete “${category?.name || "this category"}”? Products will become uncategorized.`)) return;

    try {
      await TinTechAPI.adminAction("delete-category", state.token, { id: remove.dataset.deleteCategory });
      toast("Category deleted.", "success");
      await refresh();
      switchTab("categories");
    } catch (error) {
      toast(error.message || "Could not delete the category.", "error");
    }
  });

  $("#inquiry-list").addEventListener("change", async (event) => {
    const select = event.target.closest("[data-inquiry-status]");
    if (!select) return;
    try {
      await TinTechAPI.adminAction("update-inquiry", state.token, { id: select.dataset.inquiryStatus, status: select.value });
      toast("Inquiry status updated.", "success");
      await refresh();
      switchTab("inquiries");
    } catch (error) {
      toast(error.message || "Could not update the inquiry.", "error");
    }
  });

  ["product-search", "product-category-filter", "product-status-filter"].forEach((id) => {
    $(`#${id}`).addEventListener(id === "product-search" ? "input" : "change", renderProducts);
  });
  $("#inquiry-status-filter").addEventListener("change", renderInquiries);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!productModal.classList.contains("hidden")) closeModal(productModal);
      if (!categoryModal.classList.contains("hidden")) closeModal(categoryModal);
    }
  });

  if (state.token) refresh();
  else showLogin();
});
