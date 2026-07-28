window.QAJ_CONFIG = Object.freeze({
  version: "QAJ Young Hearts 2.6.0",
  supabaseUrl: "https://zadxvmpgngwtpsmdkcod.supabase.co",
  supabaseKey: "sb_publishable_MxL_uLP-7iWrPDIM2J_RPQ_cDiVHZoA",
  publicBucket: "qaj-yh-media",
  submissionsBucket: "qaj-yh-submissions",
  submissionFunction: "qaj-yh-submit",
  maxSubmissionBytes: 6 * 1024 * 1024,
  fallbackEnabled: true
});

(() => {
  const scriptUrl = new URL(document.currentScript?.src || "assets/config.js", location.href);
  const assetBase = new URL("./", scriptUrl);
  const pageBase = new URL("../", scriptUrl);

  const ensureLink = (rel, href, attributes = {}) => {
    let link = document.head.querySelector(`link[rel="${rel}"][href="${href}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      Object.entries(attributes).forEach(([key, value]) => link.setAttribute(key, value));
      document.head.append(link);
    }
    return link;
  };

  const ensureMeta = (name, content) => {
    let meta = document.head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.append(meta);
    }
    meta.content = content;
  };

  ensureLink("icon", new URL("icons/favicon.svg", assetBase).href, { type: "image/svg+xml" });
  ensureLink("icon", new URL("icons/favicon-32.png", assetBase).href, { type: "image/png", sizes: "32x32" });
  ensureLink("apple-touch-icon", new URL("icons/apple-touch-icon.png", assetBase).href, { sizes: "180x180" });
  ensureLink("manifest", new URL("site.webmanifest", pageBase).href);

  ensureMeta("application-name", "Quranic Words for Young Hearts");
  ensureMeta("apple-mobile-web-app-title", "Young Hearts");
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-status-bar-style", "default");
  ensureMeta("mobile-web-app-capable", "yes");

  const theme = document.head.querySelector('meta[name="theme-color"]');
  if (theme && !location.pathname.endsWith("admin.html")) theme.content = "#0b5b58";
})();
