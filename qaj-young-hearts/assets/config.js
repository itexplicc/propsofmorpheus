window.QAJ_CONFIG = Object.freeze({
  version: "QAJ Young Hearts 2.6.1",
  supabaseUrl: "https://zadxvmpgngwtpsmdkcod.supabase.co",
  supabaseKey: "sb_publishable_MxL_uLP-7iWrPDIM2J_RPQ_cDiVHZoA",
  publicBucket: "qaj-yh-media",
  submissionsBucket: "qaj-yh-submissions",
  submissionFunction: "qaj-yh-submit",
  maxSubmissionBytes: 6 * 1024 * 1024,
  fallbackEnabled: true
});

(() => {
  const head = document.head;
  if (!head) return;
  const addLink = (rel, href, extras = {}) => {
    if (head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    Object.entries(extras).forEach(([key, value]) => link.setAttribute(key, value));
    head.append(link);
  };
  const addMeta = (name, content) => {
    if (head.querySelector(`meta[name="${name}"]`)) return;
    const meta = document.createElement("meta");
    meta.name = name;
    meta.content = content;
    head.append(meta);
  };
  addLink("icon", "assets/icons/favicon.svg", { type: "image/svg+xml" });
  addLink("icon", "assets/icons/favicon-32.png", { type: "image/png", sizes: "32x32" });
  addLink("apple-touch-icon", "assets/icons/apple-touch-icon.png", { sizes: "180x180" });
  addLink("manifest", "site.webmanifest");
  addMeta("application-name", "Quranic Arabic for Young Hearts");
  addMeta("apple-mobile-web-app-title", "Young Hearts");
  addMeta("apple-mobile-web-app-capable", "yes");
  addMeta("mobile-web-app-capable", "yes");
  addMeta("msapplication-TileColor", "#0b5b58");
})();
