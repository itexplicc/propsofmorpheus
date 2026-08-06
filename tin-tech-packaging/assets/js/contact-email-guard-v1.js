(function () {
  "use strict";

  const legacyEmail = ["hockeyundergroundusa", "gmail.com"].join("@");
  const publicEmail = "sales@tintechpackaging.com";

  function sanitize(value) {
    if (typeof value === "string") return value.split(legacyEmail).join(publicEmail);
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, sanitize(item)])
      );
    }
    return value;
  }

  if (window.TinTechContentDefaults) {
    window.TinTechContentDefaults = sanitize(window.TinTechContentDefaults);
  }

  const api = window.TinTechAPI;
  if (api) {
    for (const name of ["siteContent", "adminData"]) {
      const original = api[name];
      if (typeof original === "function") {
        api[name] = async (...args) => sanitize(await original(...args));
      }
    }

    const originalAdminAction = api.adminAction;
    if (typeof originalAdminAction === "function") {
      api.adminAction = async (action, token, body = {}) => sanitize(
        await originalAdminAction(action, token, sanitize(body))
      );
    }
  }

  window.TinTechContactEmail = publicEmail;
})();
