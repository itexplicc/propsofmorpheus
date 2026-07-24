(function () {
  "use strict";

  const defaults = {
    gradient_strength: 98,
    gradient_width: 82,
    copy_width: 62,
    copy_side: "left",
    vertical_align: "center",
    text_align: "left",
  };

  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  function normalize(factory = {}) {
    const strength = clamp(factory.gradient_strength, 0, 100, defaults.gradient_strength);
    const width = clamp(factory.gradient_width, 35, 100, defaults.gradient_width);
    const copyWidth = clamp(factory.copy_width, 35, 82, defaults.copy_width);
    const side = factory.copy_side === "right" ? "right" : "left";
    const vertical = ["top", "center", "bottom"].includes(factory.vertical_align) ? factory.vertical_align : defaults.vertical_align;
    const textAlign = ["left", "center", "right"].includes(factory.text_align) ? factory.text_align : defaults.text_align;
    return { strength, width, copyWidth, side, vertical, textAlign };
  }

  function applyToElement(element, factory = {}) {
    if (!element) return;
    const config = normalize(factory);
    const strong = config.strength / 100;
    const mid = Math.min(1, strong * .96);
    const soft = Math.min(1, strong * .58);
    const fade = Math.min(.22, strong * .12);
    const strongStop = Math.max(18, config.width * .36);
    const midStop = Math.max(strongStop + 8, config.width * .68);

    element.dataset.factorySide = config.side;
    element.dataset.factoryTextAlign = config.textAlign;
    element.style.setProperty("--factory-overlay-strong", strong.toFixed(3));
    element.style.setProperty("--factory-overlay-mid", mid.toFixed(3));
    element.style.setProperty("--factory-overlay-soft", soft.toFixed(3));
    element.style.setProperty("--factory-overlay-fade", fade.toFixed(3));
    element.style.setProperty("--factory-stop-strong", `${strongStop.toFixed(1)}%`);
    element.style.setProperty("--factory-stop-mid", `${midStop.toFixed(1)}%`);
    element.style.setProperty("--factory-stop-soft", `${config.width.toFixed(1)}%`);
    element.style.setProperty("--factory-copy-max", `${config.copyWidth.toFixed(1)}%`);
    element.style.setProperty("--factory-align", config.vertical === "top" ? "flex-start" : config.vertical === "bottom" ? "flex-end" : "center");
    element.style.setProperty("--factory-text-align", config.textAlign);
  }

  function apply(detail) {
    const latest = detail || window.TinTechCMS?.latest || {};
    const factory = latest.content?.home?.factory || window.TinTechContentDefaults?.home?.factory || {};
    document.querySelectorAll("[data-managed-factory]").forEach((element) => applyToElement(element, factory));
  }

  window.TinTechFactoryLayout = { defaults, normalize, apply, applyToElement };
  window.addEventListener("tintech:content-ready", (event) => requestAnimationFrame(() => apply(event.detail)));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply());
  else apply();
})();
