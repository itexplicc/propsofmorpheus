(() => {
  const cfg = window.HILINE_CONFIG;
  const state = { vehicles: [], company: {}, current: null };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const statusLabels = {
    bought: "Recently bought", importing: "Importing", in_repair: "In repair", ready: "Ready",
    displayed: "Available", reserved: "Reserved", in_use: "In use", sold: "Sold", archived: "Archived"
  };
  const accents = ["#d6a82f", "#3b82c4", "#8b5cf6", "#1f9d68", "#d65f45", "#3ea0a0"];

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  }
  function money(value) {
    const n = Number(value || 0);
    return `Rs. ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(n)}`;
  }
  function compactMoney(value) {
    const n = Number(value || 0);
    if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(0)}K`;
    return money(n);
  }
  function showToast(message, type = "success") {
    const root = $("#toastRoot");
    root.innerHTML = `<div class="toast ${type}">${esc(message)}</div>`;
    setTimeout(() => root.innerHTML = "", 3200);
  }
  async function api(action, data = {}) {
    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": cfg.publishableKey },
      body: JSON.stringify({ action, ...data })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not connect. Please try again.");
    return json;
  }
  function mediaMarkup(vehicle, className = "vehicle-visual") {
    const media = (vehicle.media || []).find(m => m.media_type === "image") || (vehicle.media || [])[0];
    if (media?.url) {
      if (media.media_type === "video") return `<div class="${className}"><video src="${esc(media.url)}" muted playsinline preload="metadata"></video></div>`;
      return `<div class="${className}"><img src="${esc(media.url)}" alt="${esc(vehicle.title)}" loading="lazy"></div>`;
    }
    const index = Math.abs([...String(vehicle.make || vehicle.title)].reduce((a, c) => a + c.charCodeAt(0), 0)) % accents.length;
    const icon = /bike|motor/i.test(vehicle.vehicle_type) ? "🏍️" : /van|bus/i.test(vehicle.vehicle_type) ? "🚐" : /truck/i.test(vehicle.vehicle_type) ? "🚚" : "🚘";
    return `<div class="${className}" style="--vehicle-accent:${accents[index]}"><div class="vehicle-placeholder"><div class="car-icon">${icon}</div><strong>${esc(vehicle.make)} · ${esc(vehicle.model)}</strong></div></div>`;
  }
  function statusClass(status) { return `status-${status || "bought"}`; }
  function card(vehicle) {
    const specs = [vehicle.manufacture_year, vehicle.transmission, vehicle.fuel_type, vehicle.mileage_km ? `${Number(vehicle.mileage_km).toLocaleString()} km` : null].filter(Boolean);
    return `<article class="vehicle-card" data-open="${esc(vehicle.slug)}">
      <div style="position:relative">
        ${mediaMarkup(vehicle)}
        <span class="status-badge ${statusClass(vehicle.status)}">${esc(statusLabels[vehicle.status] || vehicle.status)}</span>
        ${vehicle.featured ? '<span class="featured-badge">FEATURED</span>' : ""}
      </div>
      <div class="vehicle-body">
        <div class="vehicle-ref">${esc(vehicle.reference_code)}</div>
        <h3 class="vehicle-title">${esc(vehicle.title)}</h3>
        <div class="vehicle-meta">${specs.map(s => `<span>${esc(s)}</span>`).join("")}</div>
        <div class="vehicle-footer">
          <div class="price"><small>${vehicle.status === "sold" ? "Last listed price" : "Price"}</small>${compactMoney(vehicle.price_lkr)}</div>
          <button class="btn btn-dark" type="button">View</button>
        </div>
      </div>
    </article>`;
  }
  function configureContacts() {
    const phone = String(state.company.phone || "+94 77 000 0000");
    const whatsapp = String(state.company.whatsapp || phone).replace(/\D/g, "");
    const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hello Hi-Line Auto, I would like to know about your vehicles.")}`;
    $("#headerWhatsApp").href = wa;
    $("#footerWhatsApp").href = wa;
    $("#footerCall").href = `tel:${phone.replace(/\s/g, "")}`;
  }
  function populateFilters() {
    const types = [...new Set(state.vehicles.map(v => v.vehicle_type).filter(Boolean))].sort();
    const makes = [...new Set(state.vehicles.map(v => v.make).filter(Boolean))].sort();
    $("#typeFilter").innerHTML = `<option value="">All vehicle types</option>${types.map(v => `<option>${esc(v)}</option>`).join("")}`;
    $("#makeFilter").innerHTML = `<option value="">All makes</option>${makes.map(v => `<option>${esc(v)}</option>`).join("")}`;
  }
  function renderVehicles() {
    const q = $("#searchInput").value.toLowerCase().trim();
    const type = $("#typeFilter").value;
    const make = $("#makeFilter").value;
    const status = $("#statusFilter").value;
    const filtered = state.vehicles.filter(v => {
      const hay = [v.title, v.make, v.model, v.variant, v.vehicle_type, v.fuel_type, v.transmission, v.manufacture_year, v.description].join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (!type || v.vehicle_type === type) && (!make || v.make === make)
        && (!status || (status === "sold" ? v.status === "sold" : v.status !== "sold"));
    });
    $("#resultCount").textContent = `${filtered.length} vehicle${filtered.length === 1 ? "" : "s"}`;
    $("#heroCount").textContent = state.vehicles.filter(v => v.status !== "sold").length;
    $("#vehicleGrid").innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="empty full">No vehicles match those filters.</div>`;
    $$('[data-open]').forEach(el => el.addEventListener("click", () => openVehicle(el.dataset.open)));
  }
  function galleryItem(item, vehicle, active = false) {
    if (!item) return `<div class="gallery-main">${mediaMarkup(vehicle, "vehicle-visual")}</div>`;
    if (item.media_type === "video") return `<video class="gallery-media" src="${esc(item.url)}" controls playsinline></video>`;
    return `<img class="gallery-media" src="${esc(item.url)}" alt="${esc(vehicle.title)}">`;
  }
  function buildDetail(vehicle) {
    const media = vehicle.media || [];
    const first = media[0] || null;
    const phone = String(state.company.phone || "+94 77 000 0000");
    const whatsapp = String(state.company.whatsapp || phone).replace(/\D/g, "");
    const url = `${location.origin}${location.pathname}?vehicle=${encodeURIComponent(vehicle.slug)}`;
    const message = `Hello Hi-Line Auto, I am interested in ${vehicle.title} (${vehicle.reference_code}). ${url}`;
    $("#detailWhatsApp").href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

    const specs = [
      ["Vehicle type", vehicle.vehicle_type], ["Year", vehicle.manufacture_year], ["Registered", vehicle.registration_year],
      ["Transmission", vehicle.transmission], ["Fuel", vehicle.fuel_type], ["Engine", vehicle.engine_capacity_cc ? `${vehicle.engine_capacity_cc} cc` : null],
      ["Mileage", vehicle.mileage_km ? `${Number(vehicle.mileage_km).toLocaleString()} km` : null], ["Colour", vehicle.exterior_color],
      ["Location", vehicle.district], ["Condition", vehicle.condition], ["Ownership", vehicle.ownership], ["Negotiable", vehicle.negotiable ? "Yes" : "No"]
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");
    const features = Array.isArray(vehicle.features) ? vehicle.features : [];
    const customSpecs = vehicle.specs && typeof vehicle.specs === "object" ? Object.entries(vehicle.specs) : [];

    return `<div>
      <div class="gallery-main" id="galleryMain">${first ? galleryItem(first, vehicle) : mediaMarkup(vehicle, "vehicle-visual")}</div>
      ${media.length > 1 ? `<div class="gallery-strip">${media.map((m, i) => `<button class="gallery-thumb ${i === 0 ? "active" : ""}" data-media-index="${i}">${m.media_type === "video" ? `<video src="${esc(m.url)}" muted></video>` : `<img src="${esc(m.url)}" alt="">`}</button>`).join("")}</div>` : ""}
      <div class="content-card"><h3>About this vehicle</h3><p>${esc(vehicle.description || "Contact Hi-Line Auto for more information about this vehicle.").replace(/\n/g, "<br>")}</p></div>
      ${features.length ? `<div class="content-card"><h3>Features</h3><ul class="feature-list">${features.map(f => `<li>${esc(f)}</li>`).join("")}</ul></div>` : ""}
      ${customSpecs.length ? `<div class="content-card"><h3>Additional details</h3><div class="spec-grid">${customSpecs.map(([k, v]) => `<div class="spec"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join("")}</div></div>` : ""}
    </div>
    <aside>
      <div class="detail-card">
        <span class="status-badge ${statusClass(vehicle.status)}" style="position:static;display:inline-flex">${esc(statusLabels[vehicle.status] || vehicle.status)}</span>
        <div class="vehicle-ref" style="margin-top:16px">${esc(vehicle.reference_code)}</div>
        <h1 class="detail-title">${esc(vehicle.title)}</h1>
        <div class="detail-price">${money(vehicle.price_lkr)}</div>
        <div class="quick-actions">
          <a class="btn btn-primary" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}">WhatsApp</a>
          <a class="btn btn-dark" href="tel:${phone.replace(/\s/g, "")}">Call now</a>
        </div>
        <div class="spec-grid">${specs.map(([k, v]) => `<div class="spec"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join("")}</div>
      </div>
      <div class="content-card">
        <h3>Enquire or make an offer</h3>
        <form class="enquiry-form" id="enquiryForm">
          <div class="form-row"><div><label>Your name</label><input class="field" name="name" required></div><div><label>Phone number</label><input class="field" name="phone" inputmode="tel" required></div></div>
          <div><label>What would you like to do?</label><select class="select-field" name="enquiry_type" id="enquiryType"><option value="enquiry">Ask about this vehicle</option><option value="offer">Make an offer</option><option value="test_drive">Arrange a viewing / test drive</option><option value="call_back">Request a call back</option></select></div>
          <div class="hidden" id="offerWrap"><label>Your offer (Rs.)</label><input class="field" name="offer_amount_lkr" type="number" min="0" step="1000" inputmode="numeric"></div>
          <div><label>Message</label><textarea class="field" name="message" placeholder="Anything you want the sales team to know"></textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Send to Hi-Line Auto</button>
        </form>
      </div>
    </aside>`;
  }
  async function openVehicle(slug, push = true) {
    try {
      $("#detailOverlay").classList.remove("hidden");
      $("#detailOverlay").setAttribute("aria-hidden", "false");
      $("#detailContent").innerHTML = `<div class="empty full">Loading vehicle…</div>`;
      document.body.classList.add("no-scroll");
      const existing = state.vehicles.find(v => v.slug === slug);
      const data = existing?.description && existing?.specs ? { vehicle: existing, company: state.company } : await api("public-get", { slug });
      state.current = data.vehicle;
      state.company = data.company || state.company;
      $("#detailContent").innerHTML = buildDetail(state.current);
      if (push) history.pushState({ vehicle: slug }, "", `?vehicle=${encodeURIComponent(slug)}`);
      $$('[data-media-index]').forEach(btn => btn.addEventListener("click", () => {
        const i = Number(btn.dataset.mediaIndex);
        $("#galleryMain").innerHTML = galleryItem(state.current.media[i], state.current);
        $$('[data-media-index]').forEach(x => x.classList.toggle("active", x === btn));
      }));
      $("#enquiryType").addEventListener("change", e => $("#offerWrap").classList.toggle("hidden", e.target.value !== "offer"));
      $("#enquiryForm").addEventListener("submit", async e => {
        e.preventDefault();
        const button = e.submitter; button.disabled = true; button.textContent = "Sending…";
        const form = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const result = await api("submit-enquiry", { ...form, vehicle_id: state.current.id });
          e.currentTarget.reset(); $("#offerWrap").classList.add("hidden"); showToast(result.message || "Enquiry sent.");
        } catch (err) { showToast(err.message, "error"); }
        finally { button.disabled = false; button.textContent = "Send to Hi-Line Auto"; }
      });
      window.scrollTo(0, 0);
    } catch (err) {
      closeDetail(false); showToast(err.message, "error");
    }
  }
  function closeDetail(push = true) {
    $("#detailOverlay").classList.add("hidden");
    $("#detailOverlay").setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    state.current = null;
    if (push) history.pushState({}, "", location.pathname);
  }
  async function init() {
    $("#vehicleGrid").innerHTML = Array(6).fill('<div class="vehicle-card"><div class="vehicle-visual skeleton"></div><div class="vehicle-body"><div class="skeleton" style="height:18px;border-radius:8px"></div><div class="skeleton" style="height:48px;border-radius:10px;margin-top:12px"></div></div></div>').join("");
    try {
      const data = await api("public-list");
      state.vehicles = data.vehicles || [];
      state.company = data.company || {};
      configureContacts(); populateFilters(); renderVehicles();
      const initialSlug = new URLSearchParams(location.search).get("vehicle");
      if (initialSlug) openVehicle(initialSlug, false);
    } catch (err) {
      $("#vehicleGrid").innerHTML = `<div class="empty full"><strong>Could not load vehicles.</strong><br>${esc(err.message)}</div>`;
      $("#resultCount").textContent = "Unavailable";
    }
  }

  ["searchInput", "typeFilter", "makeFilter", "statusFilter"].forEach(id => $("#" + id).addEventListener("input", renderVehicles));
  $("#clearFilters").addEventListener("click", () => { $("#searchInput").value = ""; $("#typeFilter").value = ""; $("#makeFilter").value = ""; $("#statusFilter").value = ""; renderVehicles(); });
  $("#backButton").addEventListener("click", () => closeDetail());
  $("#shareButton").addEventListener("click", async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: state.current?.title || "Hi-Line Auto", url }); else { await navigator.clipboard.writeText(url); showToast("Vehicle link copied."); } } catch (_) {}
  });
  addEventListener("popstate", () => {
    const slug = new URLSearchParams(location.search).get("vehicle");
    if (slug) openVehicle(slug, false); else closeDetail(false);
  });
  init();
})();
