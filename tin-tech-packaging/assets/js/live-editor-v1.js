(function () {
  "use strict";

  const STORAGE_KEY = "tintech_admin_session";
  const PAGE_LINKS = [
    ["Home", "index.html"],
    ["Company", "about.html"],
    ["Capabilities", "capabilities.html"],
    ["Portfolio", "portfolio.html"],
    ["Contact", "contact.html"],
  ];
  const GLOBAL_PREFIXES = ["brand.", "navigation.", "footer.", "contact."];
  const PAGE_PREFIXES = {
    home: ["home.", "hero_slides["],
    about: ["about.", "home.testimonial."],
    capabilities: ["capabilities."],
    portfolio: ["portfolio."],
    contact: ["contact_page."],
    product: ["product_page."],
  };

  const state = {
    token: "",
    content: {},
    slides: [],
    settings: {},
    originalContent: {},
    originalSlides: [],
    originalSettings: {},
    matches: new WeakMap(),
    meta: new WeakMap(),
    targets: new Map(),
    selected: null,
    selectedPath: "",
    selectedNode: null,
    dirty: new Set(),
    page: "home",
  };

  const clone = (value) => structuredClone(value ?? null);
  const escapeHTML = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const normalizeText = (value) => String(value ?? "")
    .replace(/^[\s“”‘’'\"]+|[\s“”‘’'\"]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const pathParts = (path) => String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);

  function currentPage() {
    const file = window.location.pathname.split("/").pop() || "index.html";
    if (!file || file === "index.html") return "home";
    if (file === "about.html") return "about";
    if (file === "capabilities.html") return "capabilities";
    if (file === "portfolio.html") return "portfolio";
    if (file === "contact.html") return "contact";
    if (file === "product.html") return "product";
    return file.replace(/\.html$/, "");
  }

  function getPath(path) {
    const source = path.startsWith("hero_slides[") ? state.slides : state.content;
    const normalized = path.startsWith("hero_slides[") ? path.replace(/^hero_slides/, "") : path;
    return pathParts(normalized).reduce((value, part) => value?.[part], source);
  }

  function setPath(path, value) {
    const isSlide = path.startsWith("hero_slides[");
    const source = isSlide ? state.slides : state.content;
    const normalized = isSlide ? path.replace(/^hero_slides/, "") : path;
    const parts = pathParts(normalized);
    let cursor = source;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value;
      else {
        const nextIsIndex = /^\d+$/.test(parts[index + 1]);
        if (cursor[part] === undefined || cursor[part] === null) cursor[part] = nextIsIndex ? [] : {};
        cursor = cursor[part];
      }
    });
    state.dirty.add(isSlide ? "slides" : "content");
    updateStatus();
  }

  function flatten(value, path = "", output = []) {
    if (typeof value === "string") {
      const normalized = normalizeText(value);
      if (normalized.length >= 2 && value.length <= 12000) output.push({ path, value, normalized });
      return output;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => flatten(item, `${path}[${index}]`, output));
      return output;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => flatten(item, path ? `${path}.${key}` : key, output));
    }
    return output;
  }

  function buildIndex() {
    const entries = flatten(state.content);
    state.slides.forEach((slide, index) => flatten(slide, `hero_slides[${index}]`, entries));
    const index = new Map();
    entries.forEach((entry) => {
      if (/(_url|\.url|storage_path|image_url|favicon_url|logo_url)$/i.test(entry.path)) return;
      const list = index.get(entry.normalized) || [];
      list.push(entry);
      index.set(entry.normalized, list);
    });
    return index;
  }

  function allowedForPage(entry) {
    const prefixes = [...GLOBAL_PREFIXES, ...(PAGE_PREFIXES[state.page] || [])];
    return prefixes.some((prefix) => entry.path.startsWith(prefix));
  }

  function bestMatches(list) {
    const allowed = list.filter(allowedForPage);
    return allowed.length ? allowed : list;
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue?.trim()) return true;
    if (parent.closest(".tt-live-toolbar,.tt-live-drawer,.tt-live-login-warning,script,style,noscript,textarea,input,select,option,svg")) return true;
    if (!parent.closest("header,main,footer")) return true;
    return false;
  }

  function wrapEditableText() {
    document.querySelectorAll(".tt-live-target").forEach((wrapper) => wrapper.replaceWith(document.createTextNode(wrapper.textContent || "")));
    state.matches = new WeakMap();
    state.meta = new WeakMap();
    state.targets = new Map();
    const index = buildIndex();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (shouldSkipTextNode(node)) return;
      const normalized = normalizeText(node.nodeValue);
      if (!normalized) return;
      const candidates = bestMatches(index.get(normalized) || []);
      if (!candidates.length) return;
      const wrapper = document.createElement("span");
      const raw = node.nodeValue || "";
      const sample = candidates[0].value || raw.trim();
      const start = raw.indexOf(sample);
      const prefix = start >= 0 ? raw.slice(0, start) : raw.match(/^\s*/)?.[0] || "";
      const suffix = start >= 0 ? raw.slice(start + sample.length) : raw.match(/\s*$/)?.[0] || "";
      wrapper.className = "tt-live-target";
      wrapper.textContent = raw;
      wrapper.setAttribute("tabindex", "0");
      wrapper.setAttribute("role", "button");
      wrapper.setAttribute("aria-label", `Edit ${humanize(candidates[0].path)}`);
      state.matches.set(wrapper, candidates);
      state.meta.set(wrapper, { prefix, suffix });
      candidates.forEach((candidate) => {
        const set = state.targets.get(candidate.path) || new Set();
        set.add(wrapper);
        state.targets.set(candidate.path, set);
      });
      node.replaceWith(wrapper);
    });
  }

  function humanize(path) {
    return String(path)
      .replace(/^hero_slides\[(\d+)\]\./, (_, index) => `Hero slide ${Number(index) + 1} · `)
      .replace(/\[(\d+)\]/g, (_, index) => ` ${Number(index) + 1} `)
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();
  }

  function companionUrlPath(path) {
    const replacements = [
      [/primary_label$/, "primary_url"],
      [/secondary_label$/, "secondary_url"],
      [/button_label$/, "button_url"],
      [/cta_label$/, "cta_url"],
      [/project_brief_label$/, null],
      [/\.label$/, ".url"],
    ];
    for (const [pattern, replacement] of replacements) {
      if (!pattern.test(path) || replacement === null) continue;
      const candidate = path.replace(pattern, replacement);
      if (getPath(candidate) !== undefined) return candidate;
    }
    return "";
  }

  function toolbarHTML() {
    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    return `<div class="tt-live-toolbar" role="region" aria-label="Tin Tech live editor">
      <div class="tt-live-brand"><span class="tt-live-brand-badge">TT</span><div><strong>Live website editor</strong><span>Click highlighted text to change it</span></div></div>
      <nav class="tt-live-pages" aria-label="Editable pages">${PAGE_LINKS.map(([label, file]) => `<a href="${file}?tintech_edit=1" class="${file === currentFile || (!currentFile && file === "index.html") ? "active" : ""}">${label}</a>`).join("")}</nav>
      <div class="tt-live-actions"><span class="tt-live-status" id="tt-live-status">Ready</span>${state.page === "home" ? `<button class="tt-live-button" id="tt-live-factory" type="button">Factory readability</button>` : ""}<button class="tt-live-button primary" id="tt-live-publish" type="button">Publish changes</button><button class="tt-live-button" id="tt-live-exit" type="button">Exit</button></div>
    </div>`;
  }

  function drawerHTML() {
    return `<aside class="tt-live-drawer" id="tt-live-drawer" hidden aria-live="polite">
      <div class="tt-live-drawer-head"><div><h2 id="tt-live-title">Edit content</h2><p id="tt-live-description">Changes appear immediately in this preview and publish only when you press Publish changes.</p></div><button class="tt-live-close" id="tt-live-close" type="button" aria-label="Close editor">×</button></div>
      <div id="tt-live-fields"></div>
    </aside>`;
  }

  function installShell() {
    document.documentElement.classList.add("tt-live-editing");
    document.body.classList.add("tt-live-editing");
    document.body.insertAdjacentHTML("afterbegin", toolbarHTML());
    document.body.insertAdjacentHTML("beforeend", drawerHTML());
  }

  function status(message, type = "") {
    const element = document.getElementById("tt-live-status");
    if (!element) return;
    element.textContent = message;
    element.className = `tt-live-status ${type}`.trim();
  }

  function updateStatus() {
    if (state.dirty.size) status("Unpublished changes", "dirty");
    else status("Up to date");
  }

  function closeDrawer() {
    document.getElementById("tt-live-drawer")?.setAttribute("hidden", "");
    state.selected?.classList.remove("tt-live-selected");
    state.selected = null;
    state.selectedNode = null;
    state.selectedPath = "";
  }

  function updateVisibleTargets(path, value) {
    (state.targets.get(path) || []).forEach((wrapper) => {
      const meta = state.meta.get(wrapper) || { prefix: "", suffix: "" };
      wrapper.textContent = `${meta.prefix}${value}${meta.suffix}`;
    });
    if (state.selected && (state.targets.get(path) || new Set()).has(state.selected)) state.selectedNode = state.selected.firstChild;
  }

  function originalValue(path) {
    const isSlide = path.startsWith("hero_slides[");
    const source = isSlide ? state.originalSlides : state.originalContent;
    const normalized = isSlide ? path.replace(/^hero_slides/, "") : path;
    return pathParts(normalized).reduce((value, part) => value?.[part], source);
  }

  function renderFieldEditor(wrapper, candidates) {
    state.selected?.classList.remove("tt-live-selected");
    state.selected = wrapper;
    state.selected.classList.add("tt-live-selected");
    const drawer = document.getElementById("tt-live-drawer");
    const fields = document.getElementById("tt-live-fields");
    const selected = candidates[0];
    state.selectedPath = selected.path;
    state.selectedNode = wrapper.firstChild;

    const choices = candidates.length > 1
      ? `<div class="tt-live-field"><label for="tt-live-path-choice">This wording is used in more than one field</label><select id="tt-live-path-choice">${candidates.map((item) => `<option value="${escapeHTML(item.path)}">${escapeHTML(humanize(item.path))}</option>`).join("")}</select></div>`
      : "";
    const value = String(getPath(selected.path) ?? "");
    const urlPath = wrapper.closest("a") ? companionUrlPath(selected.path) : "";
    const short = value.length < 90 && !value.includes("\n");
    fields.innerHTML = `${choices}<div class="tt-live-field"><label for="tt-live-value">${escapeHTML(humanize(selected.path))}</label>${short ? `<input id="tt-live-value" value="${escapeHTML(value)}">` : `<textarea id="tt-live-value">${escapeHTML(value)}</textarea>`}<span class="tt-live-path">${escapeHTML(selected.path)}</span></div>${urlPath ? `<div class="tt-live-field"><label for="tt-live-url">Link destination</label><input id="tt-live-url" type="text" value="${escapeHTML(getPath(urlPath) || "")}"><span class="tt-live-path">${escapeHTML(urlPath)}</span></div>` : ""}<div class="tt-live-drawer-actions"><button id="tt-live-reset-field" type="button">Reset field</button><a href="admin/" target="_blank" rel="noopener">Full admin</a></div><div class="tt-live-help">Only structured text and links are editable here. Products, images, slides, repeaters and technical data remain available in the full admin portal.</div>`;
    document.getElementById("tt-live-title").textContent = "Edit page content";
    drawer.removeAttribute("hidden");
    bindEditorInputs(candidates);
  }

  function bindEditorInputs(candidates) {
    const choice = document.getElementById("tt-live-path-choice");
    const valueInput = document.getElementById("tt-live-value");
    const urlInput = document.getElementById("tt-live-url");

    function selectPath(path) {
      state.selectedPath = path;
      const value = String(getPath(path) ?? "");
      valueInput.value = value;
      const pathLabel = valueInput.closest(".tt-live-field")?.querySelector(".tt-live-path");
      if (pathLabel) pathLabel.textContent = path;
      const label = valueInput.closest(".tt-live-field")?.querySelector("label");
      if (label) label.textContent = humanize(path);
      const companion = state.selected?.closest("a") ? companionUrlPath(path) : "";
      if (urlInput) {
        urlInput.value = companion ? String(getPath(companion) || "") : "";
        urlInput.dataset.path = companion;
      }
    }

    choice?.addEventListener("change", () => selectPath(choice.value));
    if (urlInput) urlInput.dataset.path = companionUrlPath(state.selectedPath);

    valueInput?.addEventListener("input", () => {
      setPath(state.selectedPath, valueInput.value);
      updateVisibleTargets(state.selectedPath, valueInput.value);
    });
    urlInput?.addEventListener("input", () => {
      const path = urlInput.dataset.path;
      if (!path) return;
      setPath(path, urlInput.value);
      const link = state.selected?.closest("a");
      if (link) link.setAttribute("href", urlInput.value || "#");
    });
    document.getElementById("tt-live-reset-field")?.addEventListener("click", () => {
      const value = String(originalValue(state.selectedPath) ?? "");
      setPath(state.selectedPath, value);
      valueInput.value = value;
      updateVisibleTargets(state.selectedPath, value);
    });
  }

  function factoryValues() {
    const factory = state.content.home?.factory || {};
    const normal = window.TinTechFactoryLayout?.normalize(factory) || { strength:98, width:82, copyWidth:62, side:"left", vertical:"center", textAlign:"left" };
    return normal;
  }

  function showFactoryEditor() {
    const drawer = document.getElementById("tt-live-drawer");
    const fields = document.getElementById("tt-live-fields");
    const values = factoryValues();
    state.selected?.classList.remove("tt-live-selected");
    state.selected = document.querySelector("[data-managed-factory]");
    state.selected?.classList.add("tt-live-selected");
    document.getElementById("tt-live-title").textContent = "Factory readability";
    document.getElementById("tt-live-description").textContent = "Adjust the white protection behind the factory text while watching the real page.";
    fields.innerHTML = `${rangeField("tt-factory-strength", "Gradient strength", values.strength, 0, 100, "%")}${rangeField("tt-factory-width", "Gradient coverage", values.width, 35, 100, "%")}${rangeField("tt-factory-copy-width", "Text panel width", values.copyWidth, 35, 82, "%")}<div class="tt-live-field"><label for="tt-factory-side">Text position</label><select id="tt-factory-side"><option value="left" ${values.side === "left" ? "selected" : ""}>Left</option><option value="right" ${values.side === "right" ? "selected" : ""}>Right</option></select></div><div class="tt-live-field"><label for="tt-factory-vertical">Vertical position</label><select id="tt-factory-vertical"><option value="top" ${values.vertical === "top" ? "selected" : ""}>Top</option><option value="center" ${values.vertical === "center" ? "selected" : ""}>Center</option><option value="bottom" ${values.vertical === "bottom" ? "selected" : ""}>Bottom</option></select></div><div class="tt-live-field"><label for="tt-factory-align">Text alignment</label><select id="tt-factory-align"><option value="left" ${values.textAlign === "left" ? "selected" : ""}>Left</option><option value="center" ${values.textAlign === "center" ? "selected" : ""}>Center</option><option value="right" ${values.textAlign === "right" ? "selected" : ""}>Right</option></select></div><div class="tt-live-help">Mobile automatically uses a bottom-up gradient so the copy remains readable on narrow screens.</div>`;
    drawer.removeAttribute("hidden");

    const update = () => {
      const factory = state.content.home.factory || (state.content.home.factory = {});
      factory.gradient_strength = Number(document.getElementById("tt-factory-strength").value);
      factory.gradient_width = Number(document.getElementById("tt-factory-width").value);
      factory.copy_width = Number(document.getElementById("tt-factory-copy-width").value);
      factory.copy_side = document.getElementById("tt-factory-side").value;
      factory.vertical_align = document.getElementById("tt-factory-vertical").value;
      factory.text_align = document.getElementById("tt-factory-align").value;
      state.dirty.add("content");
      updateStatus();
      window.TinTechFactoryLayout?.applyToElement(document.querySelector("[data-managed-factory]"), factory);
    };
    ["strength","width","copy-width"].forEach((id) => {
      const range = document.getElementById(`tt-factory-${id}`);
      const number = document.getElementById(`tt-factory-${id}-number`);
      range?.addEventListener("input", () => { number.value = range.value; update(); });
      number?.addEventListener("input", () => { range.value = number.value; update(); });
    });
    ["tt-factory-side","tt-factory-vertical","tt-factory-align"].forEach((id) => document.getElementById(id)?.addEventListener("input", update));
  }

  function rangeField(id, label, value, min, max, suffix) {
    return `<div class="tt-live-field"><label for="${id}">${label}</label><div class="tt-live-factory-grid"><input id="${id}" type="range" min="${min}" max="${max}" step="1" value="${value}"><input id="${id}-number" type="number" min="${min}" max="${max}" step="1" value="${value}" aria-label="${label}"></div><span class="tt-live-path">${suffix} · changes preview immediately</span></div>`;
  }

  async function publish() {
    if (!state.dirty.size) return status("Nothing to publish");
    const button = document.getElementById("tt-live-publish");
    button.disabled = true;
    button.textContent = "Publishing…";
    status("Publishing…");
    try {
      if (state.dirty.has("content")) {
        const result = await window.TinTechAPI.adminAction("save-site-content", state.token, { content: state.content });
        state.content = window.TinTechCMS.deepMerge(window.TinTechContentDefaults || {}, result.site_content || state.content);
      }
      if (state.dirty.has("slides")) {
        const result = await window.TinTechAPI.adminAction("save-hero-slides", state.token, { slides: state.slides.map((slide, index) => ({ ...slide, sort_order: (index + 1) * 10 })) });
        if (Array.isArray(result.hero_slides)) state.slides = clone(result.hero_slides);
      }
      if (state.dirty.has("settings")) {
        const result = await window.TinTechAPI.adminAction("save-site-settings", state.token, { settings: state.settings });
        state.settings = clone(result.site_settings || state.settings);
      }
      state.originalContent = clone(state.content);
      state.originalSlides = clone(state.slides);
      state.originalSettings = clone(state.settings);
      state.dirty.clear();
      status("Published", "success");
      button.textContent = "Published";
      window.setTimeout(() => { button.textContent = "Publish changes"; updateStatus(); }, 1800);
    } catch (error) {
      status(error.message || "Publish failed", "error");
      button.textContent = "Try publishing again";
    } finally {
      button.disabled = false;
    }
  }

  function bindShell() {
    document.body.addEventListener("click", (event) => {
      const target = event.target.closest(".tt-live-target");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      renderFieldEditor(target, state.matches.get(target) || []);
    }, true);
    document.body.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches(".tt-live-target")) {
        event.preventDefault();
        renderFieldEditor(event.target, state.matches.get(event.target) || []);
      }
    });
    document.getElementById("tt-live-close")?.addEventListener("click", closeDrawer);
    document.getElementById("tt-live-exit")?.addEventListener("click", () => {
      if (state.dirty.size && !window.confirm("Exit live editing without publishing these changes?")) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("tintech_edit");
      window.location.href = url.toString();
    });
    document.getElementById("tt-live-publish")?.addEventListener("click", publish);
    document.getElementById("tt-live-factory")?.addEventListener("click", showFactoryEditor);
    window.addEventListener("beforeunload", (event) => {
      if (!state.dirty.size) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function showLoginWarning() {
    const url = new URL("admin/", window.location.href);
    document.body.insertAdjacentHTML("beforeend", `<div class="tt-live-login-warning"><strong>Admin session required</strong><p>Open the admin portal and sign in, then return to Live Edit.</p><a href="${escapeHTML(url.href)}">Open Tin Tech admin</a></div>`);
  }

  async function init() {
    if (new URLSearchParams(window.location.search).get("tintech_edit") !== "1") return;
    await (window.TinTechCMS?.ready || Promise.resolve());
    state.token = localStorage.getItem(STORAGE_KEY) || "";
    if (!state.token || !window.TinTechAPI) return showLoginWarning();
    try {
      const data = await window.TinTechAPI.adminData(state.token);
      state.page = currentPage();
      state.content = window.TinTechCMS.deepMerge(window.TinTechContentDefaults || {}, data.site_content || {});
      state.slides = Array.isArray(data.hero_slides) ? clone(data.hero_slides) : [];
      state.settings = clone(data.site_settings || {});
      state.originalContent = clone(state.content);
      state.originalSlides = clone(state.slides);
      state.originalSettings = clone(state.settings);
      installShell();
      bindShell();
      window.TinTechFactoryLayout?.apply({ content: state.content, site_settings: state.settings });
      window.setTimeout(wrapEditableText, 120);
    } catch (error) {
      console.error("Tin Tech live editor", error);
      showLoginWarning();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
