(function () {
  "use strict";

  const STORAGE_KEY = "tintech_admin_session";
  const defaults = { gradient_strength: 98, gradient_width: 82, copy_width: 62, copy_side: "left", vertical_align: "center", text_align: "left" };
  const state = { loaded: false, loading: false, content: {}, factory: { ...defaults }, saving: false };
  const $ = (selector, root = document) => root.querySelector(selector);

  function clone(value) { return structuredClone(value ?? null); }
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
  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }
  function toast(message, type = "") {
    const stack = $("#toast-stack");
    if (!stack) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 5200);
  }

  function liveEditUrl(file = "index.html") { return `${file}?tintech_edit=1`; }

  function injectLaunchers() {
    const actions = $(".admin-topbar-actions");
    if (actions && !$(".tt-live-launch", actions)) {
      actions.insertAdjacentHTML("afterbegin", `<a class="tt-live-launch" href="${liveEditUrl()}" target="_blank" rel="noopener">✦ Live edit website</a>`);
    }
    const contentHeading = $('[data-admin-view="content"] .admin-heading');
    if (contentHeading && !$(".tt-live-content-launch", contentHeading)) {
      const publish = $("#cms-save-all", contentHeading);
      publish?.insertAdjacentHTML("beforebegin", `<a class="admin-button tt-live-content-launch" href="${liveEditUrl()}" target="_blank" rel="noopener">Open live editor</a>`);
    }
  }

  function controlsHTML() {
    return `<section class="tt-readability-controls" id="tt-readability-controls">
      <div class="tt-readability-head"><div><h3>Text readability & gradient</h3><p>Adjust the white protection behind the copy and watch the real layout update immediately.</p></div></div>
      <div class="tt-readability-grid">
        ${rangeField("tt-gradient-strength", "Gradient strength", 0, 100)}
        ${rangeField("tt-gradient-width", "Gradient coverage", 35, 100)}
        ${rangeField("tt-copy-width", "Text panel width", 35, 82)}
        <div class="tt-readability-field"><label for="tt-copy-side">Text position</label><select id="tt-copy-side"><option value="left">Left</option><option value="right">Right</option></select></div>
        <div class="tt-readability-field"><label for="tt-vertical-align">Vertical position</label><select id="tt-vertical-align"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
        <div class="tt-readability-field"><label for="tt-text-align">Text alignment</label><select id="tt-text-align"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
      </div>
      <div class="tt-readability-note">Mobile automatically changes to a bottom-up gradient so longer text stays readable without hiding the whole factory image.</div>
      <div class="tt-readability-actions"><button class="admin-button outline" id="tt-save-readability" type="button">Save readability</button></div>
    </section>`;
  }

  function rangeField(id, label, min, max) {
    return `<div class="tt-readability-field"><label for="${id}-range">${label}</label><div class="tt-readability-pair"><input id="${id}-range" type="range" min="${min}" max="${max}" step="1"><input id="${id}-number" type="number" min="${min}" max="${max}" step="1" aria-label="${label}"></div></div>`;
  }

  function injectControls() {
    const cards = Array.from(document.querySelectorAll('[data-admin-view="appearance"] .appearance-card'));
    const factoryCard = cards.find((card) => card.querySelector("h2")?.textContent?.toLowerCase().includes("factory"));
    if (factoryCard && !$("#tt-readability-controls")) factoryCard.insertAdjacentHTML("beforeend", controlsHTML());
  }

  function setPair(id, value) {
    $(`#${id}-range`).value = value;
    $(`#${id}-number`).value = value;
  }

  function fillControls() {
    setPair("tt-gradient-strength", clamp(state.factory.gradient_strength, 0, 100, defaults.gradient_strength));
    setPair("tt-gradient-width", clamp(state.factory.gradient_width, 35, 100, defaults.gradient_width));
    setPair("tt-copy-width", clamp(state.factory.copy_width, 35, 82, defaults.copy_width));
    $("#tt-copy-side").value = state.factory.copy_side === "right" ? "right" : "left";
    $("#tt-vertical-align").value = ["top","center","bottom"].includes(state.factory.vertical_align) ? state.factory.vertical_align : "center";
    $("#tt-text-align").value = ["left","center","right"].includes(state.factory.text_align) ? state.factory.text_align : "left";
    applyPreview();
  }

  function readControls() {
    state.factory.gradient_strength = clamp($("#tt-gradient-strength-range").value, 0, 100, defaults.gradient_strength);
    state.factory.gradient_width = clamp($("#tt-gradient-width-range").value, 35, 100, defaults.gradient_width);
    state.factory.copy_width = clamp($("#tt-copy-width-range").value, 35, 82, defaults.copy_width);
    state.factory.copy_side = $("#tt-copy-side").value === "right" ? "right" : "left";
    state.factory.vertical_align = ["top","center","bottom"].includes($("#tt-vertical-align").value) ? $("#tt-vertical-align").value : "center";
    state.factory.text_align = ["left","center","right"].includes($("#tt-text-align").value) ? $("#tt-text-align").value : "left";
  }

  function styleFactory(element, factory) {
    if (!element) return;
    const strength = clamp(factory.gradient_strength, 0, 100, defaults.gradient_strength);
    const width = clamp(factory.gradient_width, 35, 100, defaults.gradient_width);
    const copyWidth = clamp(factory.copy_width, 35, 82, defaults.copy_width);
    const strong = strength / 100;
    element.dataset.factorySide = factory.copy_side === "right" ? "right" : "left";
    element.dataset.factoryTextAlign = ["left","center","right"].includes(factory.text_align) ? factory.text_align : "left";
    element.style.setProperty("--factory-overlay-strong", strong.toFixed(3));
    element.style.setProperty("--factory-overlay-mid", Math.min(1, strong * .96).toFixed(3));
    element.style.setProperty("--factory-overlay-soft", Math.min(1, strong * .58).toFixed(3));
    element.style.setProperty("--factory-overlay-fade", Math.min(.22, strong * .12).toFixed(3));
    element.style.setProperty("--factory-stop-strong", `${Math.max(18, width * .36).toFixed(1)}%`);
    element.style.setProperty("--factory-stop-mid", `${Math.max(28, width * .68).toFixed(1)}%`);
    element.style.setProperty("--factory-stop-soft", `${width.toFixed(1)}%`);
    element.style.setProperty("--factory-copy-max", `${copyWidth.toFixed(1)}%`);
    element.style.setProperty("--factory-align", factory.vertical_align === "top" ? "flex-start" : factory.vertical_align === "bottom" ? "flex-end" : "center");
    element.style.setProperty("--factory-text-align", factory.text_align || "left");
  }

  function ensurePreviewStyles(doc) {
    if (!doc || doc.getElementById("tintech-site-v5-preview")) return;
    const link = doc.createElement("link");
    link.id = "tintech-site-v5-preview";
    link.rel = "stylesheet";
    link.href = "assets/css/site-v5.css";
    doc.head.appendChild(link);
  }

  function applyPreview() {
    const frame = $("#appearance-preview");
    const doc = frame?.contentDocument;
    if (!doc) return;
    ensurePreviewStyles(doc);
    const element = doc.querySelector(".factory-media");
    styleFactory(element, state.factory);
    const source = state.content.home?.factory || {};
    if (element) {
      const eyebrow = element.querySelector(".eyebrow");
      const title = element.querySelector("h2");
      const description = element.querySelector("p");
      const note = element.querySelector(".factory-media-note");
      if (eyebrow && source.eyebrow) eyebrow.textContent = source.eyebrow;
      if (title && source.title) title.textContent = source.title;
      if (description && source.description) description.textContent = source.description;
      if (note && source.note) note.textContent = source.note;
    }
  }

  async function load(force = false) {
    if (state.loading || (state.loaded && !force)) return;
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!token || !window.TinTechAPI) return;
    state.loading = true;
    try {
      const data = await window.TinTechAPI.adminData(token);
      state.content = merge(window.TinTechContentDefaults || {}, data.site_content || {});
      state.factory = { ...defaults, ...(state.content.home?.factory || {}) };
      state.loaded = true;
      fillControls();
    } catch (error) {
      console.warn("Tin Tech factory readability", error);
    } finally {
      state.loading = false;
    }
  }

  async function save() {
    if (state.saving) return;
    const token = localStorage.getItem(STORAGE_KEY) || "";
    if (!token) return toast("Your admin session has expired. Sign in again.", "error");
    state.saving = true;
    const ownButton = $("#tt-save-readability");
    if (ownButton) { ownButton.disabled = true; ownButton.textContent = "Saving…"; }
    try {
      readControls();
      const latest = await window.TinTechAPI.adminData(token);
      const content = merge(window.TinTechContentDefaults || {}, latest.site_content || {});
      content.home = content.home || {};
      content.home.factory = { ...(content.home.factory || {}), ...state.factory };
      const result = await window.TinTechAPI.adminAction("save-site-content", token, { content });
      state.content = merge(window.TinTechContentDefaults || {}, result.site_content || content);
      state.factory = { ...defaults, ...(state.content.home?.factory || {}) };
      fillControls();
      toast("Factory readability is live.", "success");
    } catch (error) {
      toast(error.message || "Factory readability could not be saved.", "error");
    } finally {
      state.saving = false;
      if (ownButton) { ownButton.disabled = false; ownButton.textContent = "Save readability"; }
    }
  }

  function bindPair(id) {
    const range = $(`#${id}-range`);
    const number = $(`#${id}-number`);
    range?.addEventListener("input", () => { number.value = range.value; readControls(); applyPreview(); });
    number?.addEventListener("input", () => { range.value = number.value; readControls(); applyPreview(); });
  }

  function bind() {
    bindPair("tt-gradient-strength");
    bindPair("tt-gradient-width");
    bindPair("tt-copy-width");
    ["tt-copy-side","tt-vertical-align","tt-text-align"].forEach((id) => $(`#${id}`)?.addEventListener("input", () => { readControls(); applyPreview(); }));
    $("#tt-save-readability")?.addEventListener("click", save);
    $("#save-appearance-button")?.addEventListener("click", save);
    $("#appearance-preview")?.addEventListener("load", () => window.setTimeout(applyPreview, 80));
    document.querySelector('[data-admin-tab="appearance"]')?.addEventListener("click", () => load(true));
    $("#login-form")?.addEventListener("submit", () => window.setTimeout(() => load(true), 900));
  }

  function init() {
    injectLaunchers();
    injectControls();
    bind();
    const app = $("#admin-app");
    if (app) new MutationObserver(() => { if (!app.classList.contains("hidden")) load(true); }).observe(app, { attributes:true, attributeFilter:["class"] });
    if (localStorage.getItem(STORAGE_KEY)) load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
