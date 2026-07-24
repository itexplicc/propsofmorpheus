(function () {
  "use strict";

  const body = document.body;
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  const scriptBase = document.currentScript ? new URL("./", document.currentScript.src) : new URL("assets/js/", window.location.href);

  function loadStylesheet(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = new URL(href, scriptBase).href;
    document.head.appendChild(link);
  }

  function loadScript(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(src, scriptBase).href;
    script.async = false;
    document.head.appendChild(script);
  }

  loadStylesheet("tintech-site-v5", "../css/site-v5.css");
  loadStylesheet("tintech-site-v5-1", "../css/site-v5-1.css");
  loadScript("tintech-factory-layout-v5", "factory-layout-v5.js");
  if (new URLSearchParams(window.location.search).get("tintech_edit") === "1") {
    loadStylesheet("tintech-live-editor-style", "../css/live-editor-v1.css");
    loadScript("tintech-live-editor", "live-editor-v1.js");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  let observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
  }

  function refreshPageEnhancements(root = document) {
    const file = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      const page = link.getAttribute("data-nav-page");
      const active = page === file || (file === "" && page === "index.html");
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    root.querySelectorAll?.("[data-year]").forEach((element) => {
      element.textContent = new Date().getFullYear();
    });

    root.querySelectorAll?.(".reveal:not([data-reveal-bound])").forEach((element) => {
      element.setAttribute("data-reveal-bound", "true");
      if (observer) observer.observe(element);
      else element.classList.add("is-visible");
    });
  }

  refreshPageEnhancements();
  window.addEventListener("tintech:content-ready", () => refreshPageEnhancements());

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) refreshPageEnhancements(node);
    }));
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
})();