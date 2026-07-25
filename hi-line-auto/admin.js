(() => {
  const cfg = window.HILINE_CONFIG;
  const storageClient = window.supabase?.createClient(cfg.supabaseUrl, cfg.publishableKey, { auth: { persistSession: false } });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const state = {
    token: localStorage.getItem("hiline_admin_token") || "",
    section: "dashboard",
    dashboard: null,
    vehicles: [],
    investors: [],
    catalogue: [],
    enquiries: [],
    current: null,
    editorTab: "basics"
  };
  const statusLabels = {
    bought: "Bought", importing: "Importing", in_repair: "In repair", ready: "Ready",
    displayed: "Displayed", reserved: "Reserved", in_use: "In use", sold: "Sold", archived: "Archived"
  };
  const costLabels = {
    repair: "Repair", service: "Service", wash_shine: "Wash & shine", marketing: "Marketing",
    commission: "Commission", transport: "Transport", registration: "Registration", insurance: "Insurance",
    import: "Import cost", tax: "Tax / duty", inspection: "Inspection", other: "Other"
  };

  function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function money(v) { return `Rs. ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(num(v))}`; }
  function shortMoney(v) { const n = num(v); return n >= 1e6 ? `Rs. ${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : money(n); }
  function dateOnly(v) { return v ? String(v).slice(0, 10) : new Date().toISOString().slice(0, 10); }
  function showToast(message, type = "success") {
    $("#toastRoot").innerHTML = `<div class="toast ${type}">${esc(message)}</div>`;
    setTimeout(() => $("#toastRoot").innerHTML = "", 3200);
  }
  async function api(action, data = {}) {
    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.publishableKey,
        ...(state.token ? { "x-hiline-session": state.token } : {})
      },
      body: JSON.stringify({ action, ...data })
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && action !== "login") {
      state.token = ""; localStorage.removeItem("hiline_admin_token"); showLogin();
    }
    if (!res.ok) throw new Error(json.error || "Something went wrong.");
    return json;
  }
  function showLogin() {
    $("#loginScreen").classList.remove("hidden");
    $("#adminApp").classList.add("hidden");
    $("#editorOverlay").classList.add("hidden");
  }
  function showApp() {
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
  }
  function setActiveMenu() {
    $$('[data-section]').forEach(b => b.classList.toggle("active", b.dataset.section === state.section));
  }
  function pageHead(title, subtitle, action = "") {
    return `<div class="admin-top"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
  }
  function statusOptions(selected) {
    return Object.entries(statusLabels).map(([v, l]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${l}</option>`).join("");
  }
  function catalogueValues(key) {
    return [...new Set(state.catalogue.map(x => x[key]).filter(Boolean))].sort();
  }

  async function loadCore() {
    const [dash, vehicles, investors, enquiries, catalogue] = await Promise.all([
      api("admin-dashboard"), api("admin-list-vehicles"), api("admin-list-investors"), api("admin-list-enquiries"), api("admin-catalogue")
    ]);
    state.dashboard = dash;
    state.vehicles = vehicles.vehicles || [];
    state.investors = investors.investors || [];
    state.enquiries = enquiries.enquiries || [];
    state.catalogue = catalogue.catalogue || [];
  }

  function renderDashboard() {
    const d = state.dashboard || {};
    const recent = state.enquiries.slice(0, 6);
    $("#adminContent").innerHTML = pageHead("Dashboard", "The important things, without clutter.", `<button class="btn btn-primary" data-action="add-vehicle">+ Add vehicle</button>`) + `
      <div class="kpi-grid">
        <div class="kpi"><small>All vehicles</small><strong>${d.vehicle_count || 0}</strong><span>${d.public_count || 0} visible on website</span></div>
        <div class="kpi"><small>New enquiries</small><strong>${d.new_enquiries || 0}</strong><span>${d.negotiating || 0} in negotiation</span></div>
        <div class="kpi"><small>Money invested</small><strong>${shortMoney(d.total_invested_lkr)}</strong><span>Across all vehicle records</span></div>
        <div class="kpi"><small>Profit made</small><strong class="${num(d.realized_profit_lkr) >= 0 ? "money-positive" : "money-negative"}">${shortMoney(d.realized_profit_lkr)}</strong><span>From completed sales</span></div>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>Vehicle status</h2><button class="btn btn-soft" data-section="vehicles">See all</button></div>
        <div class="kpi-grid">${Object.entries(statusLabels).map(([k, label]) => `<div class="kpi"><small>${esc(label)}</small><strong>${d.status_counts?.[k] || 0}</strong></div>`).join("")}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Latest enquiries</h2><button class="btn btn-soft" data-section="leads">See all</button></div>
        ${recent.length ? `<div class="simple-list">${recent.map(leadMini).join("")}</div>` : `<div class="empty">No enquiries yet.</div>`}
      </section>`;
  }

  function vehicleCard(v) {
    const f = v.financial || {};
    return `<article class="admin-vehicle" data-edit-vehicle="${esc(v.id)}">
      <div class="admin-vehicle-top"><div><div class="vehicle-ref">${esc(v.reference_code)}</div><h3>${esc(v.title)}</h3><p>${esc(v.manufacture_year || "")} ${esc(v.transmission || "")} · ${esc(v.vehicle_type)}</p></div><span class="mini-status">${esc(statusLabels[v.status] || v.status)}</span></div>
      <div class="money">${money(v.price_lkr)}</div>
      <div class="help">Cost: ${money(f.total_cost_lkr)} ${v.published ? "· Website: On" : "· Website: Off"}</div>
    </article>`;
  }
  function renderVehicles() {
    $("#adminContent").innerHTML = pageHead("Vehicles", "Tap a vehicle to manage everything about it.", `<button class="btn btn-primary" data-action="add-vehicle">+ Add vehicle</button>`) + `
      <section class="panel" style="margin-top:0"><div class="form-row"><input class="field" id="vehicleSearch" placeholder="Search vehicle, reference or model"><select class="select-field" id="vehicleStatusFilter"><option value="">All statuses</option>${statusOptions("")}</select></div></section>
      <div class="admin-vehicle-grid" id="adminVehicleGrid" style="margin-top:16px"></div>`;
    const draw = () => {
      const q = $("#vehicleSearch").value.toLowerCase().trim();
      const status = $("#vehicleStatusFilter").value;
      const list = state.vehicles.filter(v => (!q || [v.title, v.reference_code, v.make, v.model, v.variant].join(" ").toLowerCase().includes(q)) && (!status || v.status === status));
      $("#adminVehicleGrid").innerHTML = list.length ? list.map(vehicleCard).join("") : `<div class="empty full">No vehicles found.</div>`;
    };
    $("#vehicleSearch").addEventListener("input", draw); $("#vehicleStatusFilter").addEventListener("change", draw); draw();
  }
  function leadMini(e) {
    const title = e.vehicle?.title || "General enquiry";
    return `<div class="simple-row"><div class="main"><strong>${esc(e.name)} · ${esc(title)}</strong><small>${esc(e.phone)} · ${esc(e.enquiry_type)} · ${new Date(e.created_at).toLocaleString("en-LK")}</small></div><span class="mini-status">${esc(e.stage)}</span></div>`;
  }
  function renderLeads() {
    $("#adminContent").innerHTML = pageHead("Enquiries", "Calls, offers and negotiations from the website.") + `
      <section class="panel" style="margin-top:0"><div class="form-row"><input class="field" id="leadSearch" placeholder="Search name, phone or vehicle"><select class="select-field" id="leadStage"><option value="">All stages</option>${["new","contacted","negotiating","won","lost","closed"].map(x => `<option>${x}</option>`).join("")}</select></div></section>
      <section class="panel"><div id="leadList"></div></section>`;
    const draw = () => {
      const q = $("#leadSearch").value.toLowerCase().trim(); const stage = $("#leadStage").value;
      const list = state.enquiries.filter(e => (!q || [e.name,e.phone,e.email,e.message,e.vehicle?.title,e.vehicle?.reference_code].join(" ").toLowerCase().includes(q)) && (!stage || e.stage === stage));
      $("#leadList").innerHTML = list.length ? list.map(leadCard).join("") : `<div class="empty">No enquiries found.</div>`;
      bindLeadActions($("#leadList"));
    };
    $("#leadSearch").addEventListener("input", draw); $("#leadStage").addEventListener("change", draw); draw();
  }
  function leadCard(e) {
    return `<article class="lead-card" data-lead="${esc(e.id)}"><div class="lead-head"><div><div class="vehicle-ref">${esc(e.vehicle?.reference_code || "GENERAL")}</div><strong>${esc(e.name)} · ${esc(e.vehicle?.title || "General enquiry")}</strong><div class="help">${esc(e.phone)} ${e.email ? `· ${esc(e.email)}` : ""} · ${new Date(e.created_at).toLocaleString("en-LK")}</div></div><select class="lead-stage" data-lead-stage>${["new","contacted","negotiating","won","lost","closed"].map(s => `<option ${e.stage === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      ${e.offer_amount_lkr ? `<p><strong>Offer: ${money(e.offer_amount_lkr)}</strong></p>` : ""}<p>${esc(e.message || "No message")}</p>
      <textarea class="field" data-lead-notes placeholder="Staff notes">${esc(e.admin_notes || "")}</textarea>
      <div class="inline-actions" style="margin-top:10px"><a class="btn btn-success" href="tel:${esc(e.phone)}">Call</a><a class="btn btn-success" target="_blank" href="https://wa.me/${String(e.phone).replace(/\D/g, "")}">WhatsApp</a><button class="btn btn-dark" data-save-lead>Save</button></div></article>`;
  }
  function bindLeadActions(root) {
    $$('[data-save-lead]', root).forEach(btn => btn.addEventListener("click", async () => {
      const card = btn.closest('[data-lead]'); btn.disabled = true;
      try {
        const result = await api("admin-save-enquiry", { id: card.dataset.lead, stage: $('[data-lead-stage]', card).value, admin_notes: $('[data-lead-notes]', card).value });
        const i = state.enquiries.findIndex(x => x.id === result.enquiry.id); if (i >= 0) state.enquiries[i] = { ...state.enquiries[i], ...result.enquiry };
        showToast("Enquiry updated.");
      } catch (e) { showToast(e.message, "error"); } finally { btn.disabled = false; }
    }));
  }
  function renderInvestors() {
    $("#adminContent").innerHTML = pageHead("Investors", "Save each name once, then choose it whenever they fund a vehicle.", `<button class="btn btn-primary" data-action="add-investor">+ Add investor</button>`) + `
      <section class="panel" style="margin-top:0"><div class="simple-list">${state.investors.length ? state.investors.map(i => `<div class="simple-row"><div class="main"><strong>${esc(i.name)}</strong><small>${esc(i.phone || "No phone saved")} ${i.notes ? `· ${esc(i.notes)}` : ""}</small></div><button class="btn btn-soft" data-edit-investor="${esc(i.id)}">Edit</button></div>`).join("") : `<div class="empty">No investors saved.</div>`}</div></section>`;
  }
  async function renderSettings() {
    let settings = [];
    try { settings = (await api("admin-settings")).settings || []; } catch (e) { showToast(e.message, "error"); }
    const company = settings.find(s => s.key === "company")?.value || {};
    const display = settings.find(s => s.key === "display")?.value || {};
    $("#adminContent").innerHTML = pageHead("Settings", "Company contact details shown on the public website.") + `
      <form class="panel" id="settingsForm" style="margin-top:0"><div class="form-grid cols-2">
        <div><label>Company name</label><input class="field" name="name" value="${esc(company.name || "Hi-Line Auto")}"></div>
        <div><label>Location</label><input class="field" name="location" value="${esc(company.location || "Sri Lanka")}"></div>
        <div><label>Phone number</label><input class="field" name="phone" value="${esc(company.phone || "")}"></div>
        <div><label>WhatsApp number</label><input class="field" name="whatsapp" value="${esc(company.whatsapp || "")}"><div class="help">Use country code, for example 9477...</div></div>
        <div><label>Email</label><input class="field" name="email" value="${esc(company.email || "")}"></div>
        <div><label>Keep sold vehicles visible for</label><input class="field" name="sold_display_days" type="number" min="0" max="90" value="${esc(display.sold_display_days ?? 7)}"><div class="help">Number of days after sale</div></div>
      </div><button class="btn btn-primary" type="submit" style="margin-top:14px">Save settings</button></form>`;
    $("#settingsForm").addEventListener("submit", async e => {
      e.preventDefault(); const b = e.submitter; b.disabled = true;
      const f = Object.fromEntries(new FormData(e.currentTarget));
      try {
        await Promise.all([
          api("admin-save-settings", { key: "company", value: { name:f.name,location:f.location,phone:f.phone,whatsapp:f.whatsapp,email:f.email } }),
          api("admin-save-settings", { key: "display", value: { sold_display_days:num(f.sold_display_days),currency:"LKR" } })
        ]); showToast("Settings saved.");
      } catch (err) { showToast(err.message, "error"); } finally { b.disabled = false; }
    });
  }
  function renderSection() {
    setActiveMenu();
    if (state.section === "dashboard") renderDashboard();
    if (state.section === "vehicles") renderVehicles();
    if (state.section === "leads") renderLeads();
    if (state.section === "investors") renderInvestors();
    if (state.section === "settings") renderSettings();
  }
  function switchSection(section) { state.section = section; renderSection(); window.scrollTo(0,0); }

  function blankVehicle() {
    return { vehicle: { vehicle_type:"Car", condition:"Used", status:"bought", negotiable:true, published:false, featured:false, features:[], specs:{} }, media:[], costs:[], investments:[], sale:null, enquiries:[], financial:null };
  }
  async function openEditor(id = "") {
    $("#editorOverlay").classList.remove("hidden"); document.body.classList.add("no-scroll");
    state.current = id ? null : blankVehicle(); state.editorTab = "basics";
    $("#editorTitle").textContent = id ? "Loading vehicle…" : "Add a vehicle"; $("#editorRef").textContent = id ? "PLEASE WAIT" : "NEW VEHICLE";
    if (id) {
      try { state.current = await api("admin-get-vehicle", { vehicle_id: id }); } catch (e) { showToast(e.message,"error"); closeEditor(); return; }
    }
    renderEditor();
  }
  function closeEditor() { $("#editorOverlay").classList.add("hidden"); document.body.classList.remove("no-scroll"); state.current = null; }
  function renderEditor() {
    const v = state.current.vehicle || {};
    $("#editorTitle").textContent = v.id ? v.title : "Add a vehicle";
    $("#editorRef").textContent = v.reference_code || "NEW VEHICLE";
    renderBasics(); renderMedia(); renderCosts(); renderInvestment(); renderSale(); renderVehicleLeads(); setEditorTab(state.editorTab);
  }
  function setEditorTab(tab) {
    state.editorTab = tab;
    $$('[data-tab]').forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $$('[data-pane]').forEach(p => p.classList.toggle("active", p.dataset.pane === tab));
  }
  function parseSpecs(text) {
    const out = {}; String(text || "").split(/\n/).forEach(line => { const i = line.indexOf(":"); if (i > 0) out[line.slice(0,i).trim()] = line.slice(i+1).trim(); }); return out;
  }
  function specsText(specs) { return Object.entries(specs || {}).map(([k,v]) => `${k}: ${v}`).join("\n"); }
  function renderBasics() {
    const v = state.current.vehicle || {};
    $("#basicsPane").innerHTML = `<form id="vehicleForm">
      <div class="form-card"><h3>What vehicle is it?</h3><div class="form-grid">
        <div class="full"><label>Listing title</label><input class="field" name="title" value="${esc(v.title || "")}" placeholder="Example: 2018 Toyota Allion 260" required></div>
        <div><label>Vehicle type</label><input class="field" name="vehicle_type" list="vehicleTypes" value="${esc(v.vehicle_type || "Car")}"><datalist id="vehicleTypes">${["Car","SUV","Van","Truck","Bus","Motorbike","Three-wheeler","Machinery"].map(x=>`<option>${x}</option>`).join("")}</datalist></div>
        <div><label>Make</label><input class="field" name="make" list="makeList" value="${esc(v.make || "")}" required><datalist id="makeList">${catalogueValues("make").map(x=>`<option>${esc(x)}</option>`).join("")}</datalist></div>
        <div><label>Model</label><input class="field" name="model" list="modelList" value="${esc(v.model || "")}" required><datalist id="modelList">${catalogueValues("model").map(x=>`<option>${esc(x)}</option>`).join("")}</datalist></div>
        <div><label>Variant</label><input class="field" name="variant" list="variantList" value="${esc(v.variant || "")}"><datalist id="variantList">${catalogueValues("variant").map(x=>`<option>${esc(x)}</option>`).join("")}</datalist></div>
        <div><label>Manufactured year</label><input class="field" name="manufacture_year" type="number" min="1900" max="2100" value="${esc(v.manufacture_year || "")}"></div>
        <div><label>Registration year</label><input class="field" name="registration_year" type="number" min="1900" max="2100" value="${esc(v.registration_year || "")}"></div>
        <div><label>Condition</label><select class="select-field" name="condition">${["Brand new","Unregistered","Used","Reconditioned"].map(x=>`<option ${v.condition===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div><label>Status now</label><select class="select-field" name="status">${statusOptions(v.status)}</select></div>
      </div></div>
      <div class="form-card"><h3>Basic details</h3><div class="form-grid">
        <div><label>Transmission</label><select class="select-field" name="transmission"><option></option>${["Automatic","Manual","CVT","Tiptronic"].map(x=>`<option ${v.transmission===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div><label>Fuel type</label><select class="select-field" name="fuel_type"><option></option>${["Petrol","Diesel","Hybrid","Electric","Plug-in Hybrid"].map(x=>`<option ${v.fuel_type===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div><label>Engine (cc)</label><input class="field" name="engine_capacity_cc" type="number" value="${esc(v.engine_capacity_cc || "")}"></div>
        <div><label>Mileage (km)</label><input class="field" name="mileage_km" type="number" value="${esc(v.mileage_km || "")}"></div>
        <div><label>Exterior colour</label><input class="field" name="exterior_color" value="${esc(v.exterior_color || "")}"></div>
        <div><label>Interior colour</label><input class="field" name="interior_color" value="${esc(v.interior_color || "")}"></div>
        <div><label>District / location</label><input class="field" name="district" value="${esc(v.district || "")}"></div>
        <div><label>Registration number</label><input class="field" name="registration_number" value="${esc(v.registration_number || "")}"></div>
        <div class="full"><label>Ownership / documents</label><input class="field" name="ownership" value="${esc(v.ownership || "")}" placeholder="Example: 1st owner, clear documents"></div>
      </div></div>
      <div class="form-card"><h3>Prices</h3><div class="form-grid cols-2">
        <div><label>Bought for (private)</label><input class="field" name="purchase_price_lkr" type="number" min="0" step="1000" value="${esc(v.purchase_price_lkr || "")}"><div class="help">Used for costing and profit only.</div></div>
        <div><label>Selling price (public)</label><input class="field" name="price_lkr" type="number" min="0" step="1000" value="${esc(v.price_lkr || "")}"></div>
      </div></div>
      <div class="form-card"><h3>Website description</h3><div class="form-grid cols-2">
        <div class="full"><label>Description</label><textarea class="field" name="description" rows="5">${esc(v.description || "")}</textarea></div>
        <div><label>Features — one per line</label><textarea class="field" name="features" rows="7" placeholder="Push start\nReverse camera\nLeather seats">${esc((v.features || []).join("\n"))}</textarea></div>
        <div><label>Extra details — Key: Value</label><textarea class="field" name="specs" rows="7" placeholder="Seating: 5\nDrive: 2WD">${esc(specsText(v.specs))}</textarea></div>
      </div></div>
      <div class="form-card"><h3>Website controls</h3><div class="inline-actions">
        <label style="margin:0"><input type="checkbox" name="published" ${v.published ? "checked" : ""}> Show on website</label>
        <label style="margin:0"><input type="checkbox" name="featured" ${v.featured ? "checked" : ""}> Feature at the top</label>
        <label style="margin:0"><input type="checkbox" name="negotiable" ${v.negotiable !== false ? "checked" : ""}> Price negotiable</label>
      </div></div>
      <div class="inline-actions"><button class="btn btn-primary" type="submit">${v.id ? "Save vehicle" : "Save and continue"}</button>${v.id ? `<button class="btn btn-danger" type="button" data-delete-vehicle>Archive vehicle</button>` : ""}</div>
    </form>`;
    $("#vehicleForm").addEventListener("submit", saveVehicleForm);
    $('[data-delete-vehicle]', $("#basicsPane"))?.addEventListener("click", deleteCurrentVehicle);
  }
  async function saveVehicleForm(e) {
    e.preventDefault(); const button = e.submitter; button.disabled = true; button.textContent = "Saving…";
    const f = new FormData(e.currentTarget); const obj = Object.fromEntries(f);
    const vehicle = { ...state.current.vehicle, ...obj,
      published: f.has("published"), featured: f.has("featured"), negotiable: f.has("negotiable"),
      manufacture_year: obj.manufacture_year ? num(obj.manufacture_year) : null, registration_year: obj.registration_year ? num(obj.registration_year) : null,
      engine_capacity_cc: obj.engine_capacity_cc ? num(obj.engine_capacity_cc) : null, mileage_km: obj.mileage_km ? num(obj.mileage_km) : null,
      purchase_price_lkr: num(obj.purchase_price_lkr), price_lkr: num(obj.price_lkr),
      features: String(obj.features || "").split(/\n|,/).map(x=>x.trim()).filter(Boolean), specs: parseSpecs(obj.specs)
    };
    try {
      const saved = await api("admin-save-vehicle", { vehicle });
      state.current = await api("admin-get-vehicle", { vehicle_id: saved.vehicle.id });
      const [vs, cat, dash] = await Promise.all([api("admin-list-vehicles"), api("admin-catalogue"), api("admin-dashboard")]);
      state.vehicles = vs.vehicles || []; state.catalogue = cat.catalogue || []; state.dashboard = dash;
      renderEditor(); showToast("Vehicle saved.");
      if (!vehicle.id) setEditorTab("media");
    } catch (err) { showToast(err.message,"error"); }
    finally { button.disabled = false; button.textContent = state.current?.vehicle?.id ? "Save vehicle" : "Save and continue"; }
  }
  async function deleteCurrentVehicle() {
    if (!confirm("Archive this vehicle? It will disappear from the website but the record is kept.")) return;
    try { await api("admin-delete-vehicle", { vehicle_id: state.current.vehicle.id }); await loadCore(); closeEditor(); renderSection(); showToast("Vehicle archived."); } catch (e) { showToast(e.message,"error"); }
  }
  function needsVehicle() { return `<div class="empty"><strong>Save the vehicle first.</strong><br>Then this section becomes available.</div>`; }
  function renderMedia() {
    const v = state.current.vehicle || {};
    if (!v.id) { $("#mediaPane").innerHTML = needsVehicle(); return; }
    const media = state.current.media || [];
    $("#mediaPane").innerHTML = `<div class="form-card"><h3>Add photos or videos</h3><div class="dropzone"><strong>Choose files from the phone or computer</strong><span class="help">You can choose many at once. The first item becomes the main display.</span><input id="mediaFiles" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple class="field" style="margin-top:14px"></div></div>
      <div class="form-card"><div class="panel-head"><h3 style="margin:0">Uploaded media</h3><span class="count-pill">${media.length}</span></div>${media.length ? `<div class="media-grid">${media.map(m=>`<div class="media-item">${m.media_type === "video" ? `<video src="${esc(m.url)}" controls></video>` : `<img src="${esc(m.url)}" alt="">`}<footer><small>${m.media_type}</small><button class="btn btn-danger" data-delete-media="${esc(m.id)}">Delete</button></footer></div>`).join("")}</div>` : `<div class="empty">No photos or videos yet.</div>`}</div>`;
    $("#mediaFiles").addEventListener("change", uploadMediaFiles);
    $$('[data-delete-media]', $("#mediaPane")).forEach(b=>b.addEventListener("click", async()=>{ if(!confirm("Delete this file?"))return; try{await api("admin-delete-media",{id:b.dataset.deleteMedia}); state.current=await api("admin-get-vehicle",{vehicle_id:v.id}); renderMedia(); showToast("Media deleted.");}catch(e){showToast(e.message,"error");}}));
  }
  async function uploadFile(file, bucket, parentId) {
    if (!storageClient) throw new Error("Upload library did not load.");
    const signed = await api("admin-create-upload", { bucket, parent_id: parentId, file_name: file.name });
    const { error } = await storageClient.storage.from(bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return signed;
  }
  async function uploadMediaFiles(e) {
    const files = [...e.target.files]; if (!files.length) return;
    e.target.disabled = true; showToast(`Uploading ${files.length} file${files.length>1?"s":""}…`);
    try {
      let order = (state.current.media || []).length;
      for (const file of files) {
        const up = await uploadFile(file, "hla-public", state.current.vehicle.id);
        await api("admin-add-media", { media: { vehicle_id:state.current.vehicle.id, media_type:file.type.startsWith("video/")?"video":"image", url:up.public_url, storage_path:up.path, sort_order:order++ } });
      }
      state.current = await api("admin-get-vehicle", { vehicle_id: state.current.vehicle.id }); renderMedia(); showToast("Files uploaded.");
    } catch (err) { showToast(err.message,"error"); } finally { e.target.disabled = false; e.target.value = ""; }
  }
  function financialStrip() {
    const f = state.current.financial || {}; return `<div class="calc-strip"><div class="calc-box"><small>Bought for</small><strong>${money(f.purchase_price_lkr)}</strong></div><div class="calc-box"><small>Other costs</small><strong>${money(f.extra_cost_lkr)}</strong></div><div class="calc-box"><small>Total cost</small><strong>${money(f.total_cost_lkr)}</strong></div><div class="calc-box"><small>Investment</small><strong>${money(f.investment_total_lkr)}</strong></div></div>`;
  }
  function renderCosts() {
    const v = state.current.vehicle || {}; if (!v.id) { $("#costsPane").innerHTML = needsVehicle(); return; }
    const costs = state.current.costs || [];
    $("#costsPane").innerHTML = `${financialStrip()}<div class="form-card"><h3>Add a cost</h3><form id="costForm"><div class="form-grid cols-3"><div><label>Type</label><select class="select-field" name="category">${Object.entries(costLabels).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div><div><label>Description</label><input class="field" name="description" required placeholder="What was paid for?"></div><div><label>Amount (Rs.)</label><input class="field" name="amount_lkr" type="number" min="0" step="100" required></div><div><label>Date</label><input class="field" name="expense_date" type="date" value="${dateOnly()}"></div><div><label>Paid to</label><input class="field" name="vendor"></div><div><label>Invoice / receipt</label><input class="field" name="invoice" type="file" accept="application/pdf,image/*"></div></div><button class="btn btn-primary" type="submit" style="margin-top:12px">Add cost</button></form></div>
      <div class="form-card"><div class="panel-head"><h3 style="margin:0">Cost breakdown</h3><strong>${money((state.current.financial||{}).extra_cost_lkr)}</strong></div>${costs.length?`<div class="simple-list">${costs.map(c=>`<div class="simple-row"><div class="main"><strong>${esc(costLabels[c.category]||c.category)} · ${esc(c.description)}</strong><small>${esc(c.vendor||"")} ${c.expense_date?`· ${esc(c.expense_date)}`:""}</small></div><div class="inline-actions"><strong>${money(c.amount_lkr)}</strong>${c.invoice_path?`<button class="btn btn-soft" data-invoice="${esc(c.invoice_path)}">Invoice</button>`:""}<button class="btn btn-danger" data-delete-cost="${esc(c.id)}">Delete</button></div></div>`).join("")}</div>`:`<div class="empty">No extra costs added.</div>`}</div>`;
    $("#costForm").addEventListener("submit", saveCostForm);
    $$('[data-delete-cost]', $("#costsPane")).forEach(b=>b.addEventListener("click", async()=>{if(!confirm("Delete this cost?"))return;try{await api("admin-delete-cost",{id:b.dataset.deleteCost});state.current=await api("admin-get-vehicle",{vehicle_id:v.id});renderCosts();renderInvestment();renderSale();showToast("Cost deleted.");}catch(e){showToast(e.message,"error");}}));
    $$('[data-invoice]', $("#costsPane")).forEach(b=>b.addEventListener("click",async()=>{try{const r=await api("admin-invoice-url",{path:b.dataset.invoice});open(r.url,"_blank");}catch(e){showToast(e.message,"error");}}));
  }
  async function saveCostForm(e) {
    e.preventDefault(); const b=e.submitter;b.disabled=true;b.textContent="Adding…"; const f=new FormData(e.currentTarget); let invoice_path=null;
    try {
      const file=f.get("invoice"); if(file?.size){const up=await uploadFile(file,"hla-private",state.current.vehicle.id);invoice_path=up.path;}
      await api("admin-save-cost",{cost:{vehicle_id:state.current.vehicle.id,category:f.get("category"),description:f.get("description"),amount_lkr:num(f.get("amount_lkr")),expense_date:f.get("expense_date"),vendor:f.get("vendor"),invoice_path}});
      state.current=await api("admin-get-vehicle",{vehicle_id:state.current.vehicle.id});renderCosts();renderInvestment();renderSale();showToast("Cost added.");
    } catch(err){showToast(err.message,"error");} finally{b.disabled=false;b.textContent="Add cost";}
  }
  function renderInvestment() {
    const v=state.current.vehicle||{};if(!v.id){$("#investmentPane").innerHTML=needsVehicle();return;}
    const investments=state.current.investments||[];const f=state.current.financial||{};const gap=num(f.funding_gap_lkr);
    $("#investmentPane").innerHTML=`${financialStrip()}<div class="form-card"><h3>Add investment</h3><form id="investmentForm"><div class="form-grid cols-3"><div><label>Investor</label><select class="select-field" name="investor_id" required><option value="">Choose name</option>${state.investors.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join("")}</select></div><div><label>Amount (Rs.)</label><input class="field" name="amount_lkr" type="number" min="1" step="1000" required></div><div><label>Date</label><input class="field" name="contribution_date" type="date" value="${dateOnly()}"></div></div><div class="inline-actions" style="margin-top:12px"><button class="btn btn-primary" type="submit">Add investment</button><button class="btn btn-soft" type="button" data-action="add-investor">+ New investor name</button></div></form></div>
      <div class="form-card"><div class="panel-head"><h3 style="margin:0">Who put how much</h3><span class="mini-status ${gap===0?"money-positive":gap<0?"money-negative":""}">${gap===0?"Fully matched":gap>0?`${money(gap)} extra funded`:`${money(Math.abs(gap))} still unfunded`}</span></div>${investments.length?`<div class="simple-list">${investments.map(i=>`<div class="simple-row"><div class="main"><strong>${esc(i.investor?.name||"Investor")}</strong><small>${num(i.percentage).toFixed(2)}% of investment</small></div><div class="inline-actions"><strong>${money(i.amount_lkr)}</strong><button class="btn btn-danger" data-delete-investment="${esc(i.id)}">Delete</button></div></div>`).join("")}</div>`:`<div class="empty">No investment entries yet.</div>`}</div>`;
    $("#investmentForm").addEventListener("submit",saveInvestmentForm);
    $$('[data-delete-investment]',$("#investmentPane")).forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Delete this investment entry?"))return;try{await api("admin-delete-investment",{id:b.dataset.deleteInvestment});state.current=await api("admin-get-vehicle",{vehicle_id:v.id});renderInvestment();renderSale();showToast("Investment deleted.");}catch(e){showToast(e.message,"error");}}));
    $('[data-action="add-investor"]',$("#investmentPane"))?.addEventListener("click",()=>investorDialog());
  }
  async function saveInvestmentForm(e){e.preventDefault();const b=e.submitter;b.disabled=true;try{const f=Object.fromEntries(new FormData(e.currentTarget));await api("admin-save-investment",{investment:{...f,vehicle_id:state.current.vehicle.id,amount_lkr:num(f.amount_lkr)}});state.current=await api("admin-get-vehicle",{vehicle_id:state.current.vehicle.id});renderInvestment();renderSale();showToast("Investment added.");}catch(err){showToast(err.message,"error");}finally{b.disabled=false;}}
  function renderSale(){
    const v=state.current.vehicle||{};if(!v.id){$("#salePane").innerHTML=needsVehicle();return;}
    const sale=state.current.sale||{};const f=state.current.financial||{};const sold=Boolean(state.current.sale);
    $("#salePane").innerHTML=`<div class="calc-strip"><div class="calc-box"><small>Total cost</small><strong>${money(f.total_cost_lkr)}</strong></div><div class="calc-box"><small>Sold for</small><strong>${sold?money(f.sold_price_lkr):"Not sold"}</strong></div><div class="calc-box"><small>Profit</small><strong class="${num(f.profit_lkr)>=0?"money-positive":"money-negative"}">${sold?money(f.profit_lkr):"—"}</strong></div><div class="calc-box"><small>Investment</small><strong>${money(f.investment_total_lkr)}</strong></div></div>
      <div class="form-card"><h3>${sold?"Update sale":"Mark as sold"}</h3><form id="saleForm"><div class="form-grid cols-3"><div><label>Final selling price</label><input class="field" name="sold_price_lkr" type="number" min="0" step="1000" value="${esc(sale.sold_price_lkr||"")}" required></div><div><label>Other deductions</label><input class="field" name="other_deductions_lkr" type="number" min="0" step="100" value="${esc(sale.other_deductions_lkr||0)}"></div><div><label>Sold date</label><input class="field" name="sold_date" type="date" value="${dateOnly(sale.sold_date)}"></div><div><label>Buyer name</label><input class="field" name="buyer_name" value="${esc(sale.buyer_name||"")}"></div><div><label>Buyer phone</label><input class="field" name="buyer_phone" value="${esc(sale.buyer_phone||"")}"></div><div><label>Show SOLD online for days</label><input class="field" name="display_days" type="number" min="0" max="90" value="7"></div><div class="full"><label>Notes</label><textarea class="field" name="notes">${esc(sale.notes||"")}</textarea></div></div><div class="inline-actions" style="margin-top:12px"><button class="btn btn-primary" type="submit">Calculate and save sale</button>${sold?`<button class="btn btn-danger" type="button" data-remove-sale>Undo sale</button>`:""}</div></form></div>
      <div class="form-card"><h3>Automatic profit sharing</h3>${sold&&state.current.investments.length?`<div class="table-wrap"><table><thead><tr><th>Investor</th><th>Invested</th><th>Share %</th><th>Profit share</th><th>Total payout</th></tr></thead><tbody>${state.current.investments.map(i=>`<tr><td><strong>${esc(i.investor?.name||"")}</strong></td><td>${money(i.amount_lkr)}</td><td>${num(i.percentage).toFixed(2)}%</td><td class="${num(i.profit_share_lkr)>=0?"money-positive":"money-negative"}">${money(i.profit_share_lkr)}</td><td><strong>${money(i.payout_lkr)}</strong></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">${sold?"Add investment entries to calculate each share.":"Save the sale to see the profit split."}</div>`}</div>`;
    $("#saleForm").addEventListener("submit",saveSaleForm);
    $('[data-remove-sale]',$("#salePane"))?.addEventListener("click",async()=>{if(!confirm("Undo this sale record?"))return;try{await api("admin-remove-sale",{vehicle_id:v.id});state.current=await api("admin-get-vehicle",{vehicle_id:v.id});renderEditor();showToast("Sale removed.");}catch(e){showToast(e.message,"error");}});
  }
  async function saveSaleForm(e){e.preventDefault();const b=e.submitter;b.disabled=true;b.textContent="Calculating…";try{const f=Object.fromEntries(new FormData(e.currentTarget));await api("admin-save-sale",{sale:{...f,vehicle_id:state.current.vehicle.id,sold_price_lkr:num(f.sold_price_lkr),other_deductions_lkr:num(f.other_deductions_lkr),display_days:num(f.display_days)}});state.current=await api("admin-get-vehicle",{vehicle_id:state.current.vehicle.id});const [vs,dash]=await Promise.all([api("admin-list-vehicles"),api("admin-dashboard")]);state.vehicles=vs.vehicles||[];state.dashboard=dash;renderEditor();setEditorTab("sale");showToast("Sale saved and profit calculated.");}catch(err){showToast(err.message,"error");}finally{b.disabled=false;b.textContent="Calculate and save sale";}}
  function renderVehicleLeads(){const v=state.current.vehicle||{};if(!v.id){$("#vehicleLeadsPane").innerHTML=needsVehicle();return;}const list=state.current.enquiries||[];$("#vehicleLeadsPane").innerHTML=`<div class="form-card"><div class="panel-head"><h3 style="margin:0">Enquiries for this vehicle</h3><span class="count-pill">${list.length}</span></div>${list.length?list.map(leadCard).join(""):`<div class="empty">No enquiries for this vehicle yet.</div>`}</div>`;bindLeadActions($("#vehicleLeadsPane"));}

  function investorDialog(existing=null){
    const name=prompt(existing?"Investor name":"Enter investor name",existing?.name||"");if(!name)return;
    const phone=prompt("Phone number (optional)",existing?.phone||"")||"";
    api("admin-save-investor",{investor:{id:existing?.id,name,phone,notes:existing?.notes||""}}).then(async r=>{const inv=await api("admin-list-investors");state.investors=inv.investors||[];if(state.current){renderInvestment();}else if(state.section==="investors")renderInvestors();showToast("Investor saved.");}).catch(e=>showToast(e.message,"error"));
  }

  document.addEventListener("click", e => {
    const sectionBtn = e.target.closest('[data-section]'); if(sectionBtn){switchSection(sectionBtn.dataset.section);return;}
    const action = e.target.closest('[data-action]')?.dataset.action;
    if(action === "add-vehicle") openEditor();
    if(action === "add-investor") investorDialog();
    const vehicle = e.target.closest('[data-edit-vehicle]'); if(vehicle) openEditor(vehicle.dataset.editVehicle);
    const inv = e.target.closest('[data-edit-investor]'); if(inv) investorDialog(state.investors.find(x=>x.id===inv.dataset.editInvestor));
  });
  $("#editorTabs").addEventListener("click", e => { const b=e.target.closest('[data-tab]'); if(b) setEditorTab(b.dataset.tab); });
  $("#closeEditor").addEventListener("click", closeEditor);
  $("#editorOverlay").addEventListener("click", e => { if(e.target === $("#editorOverlay")) closeEditor(); });
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault(); const b=e.submitter;b.disabled=true;b.textContent="Opening…";
    try{const result=await api("login",{password:new FormData(e.currentTarget).get("password")});state.token=result.token;localStorage.setItem("hiline_admin_token",state.token);await loadCore();showApp();renderSection();e.currentTarget.reset();}
    catch(err){showToast(err.message,"error");}
    finally{b.disabled=false;b.textContent="Open admin portal";}
  });
  $("#logoutButton").addEventListener("click",async()=>{try{await api("logout");}catch(_){}state.token="";localStorage.removeItem("hiline_admin_token");showLogin();});

  async function init(){
    if(!state.token){showLogin();return;}
    try{await loadCore();showApp();renderSection();}catch(e){state.token="";localStorage.removeItem("hiline_admin_token");showLogin();}
  }
  init();
})();
