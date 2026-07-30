(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const nice = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const debounce = (fn, delay = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
  const formatDate = (value) => value ? new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  const state = { client: null, session: null, user: null, module: 'dashboard', rows: [], search: '', filter: '', references: {}, assistTarget: null, comfort: false };

  const NAV = [
    { label: 'Overview', items: [['dashboard','Dashboard'],['enquiries','Enquiries'],['analytics','Visitor analytics']] },
    { label: 'Website', items: [['pages','Pages'],['sections','Homepage & sections'],['navigation','Navigation'],['copy','Interface copy'],['seo','SEO']] },
    { label: 'Discovery', items: [['industries','Industries'],['categories','Categories'],['products','Products'],['services','Services']] },
    { label: 'Channels', items: [['contacts','Contact routing'],['socials','Social profiles'],['media','Media & optimiser']] },
    { label: 'System', items: [['settings','Feature settings'],['audit','Change history'],['account','Account']] },
  ];

  const STATUS = ['draft','published','archived'];
  const FIELD = {
    text: (name, label, extra = {}) => ({ name, label, type: 'text', ...extra }),
    textarea: (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra }),
    number: (name, label, extra = {}) => ({ name, label, type: 'number', ...extra }),
    checkbox: (name, label, extra = {}) => ({ name, label, type: 'checkbox', ...extra }),
    select: (name, label, options, extra = {}) => ({ name, label, type: 'select', options, ...extra }),
    json: (name, label, extra = {}) => ({ name, label, type: 'json', ...extra }),
    array: (name, label, extra = {}) => ({ name, label, type: 'array', ...extra }),
    color: (name, label, extra = {}) => ({ name, label, type: 'color', ...extra }),
    relation: (name, label, source, extra = {}) => ({ name, label, type: 'relation', source, ...extra }),
  };

  const COMMON_STATUS = FIELD.select('status','Status',STATUS);
  const MODULES = {
    pages: {
      table: 'pages', title: 'Pages', description: 'Edit page titles, summaries, navigation labels, templates and publishing state.', order: 'sort_order',
      columns: [['title_en','Page'],['slug','Slug'],['template','Template'],['status','Status'],['sort_order','Order']],
      fields: [FIELD.text('slug','Slug',{required:true}),FIELD.select('template','Template',['home','catalogue','standard','form','legal']),FIELD.text('title_en','Title — English',{required:true,assist:true}),FIELD.text('title_si','Title — Sinhala',{assist:true}),FIELD.textarea('summary_en','Summary — English',{assist:true}),FIELD.textarea('summary_si','Summary — Sinhala',{assist:true}),FIELD.text('nav_label_en','Navigation label — English'),FIELD.text('nav_label_si','Navigation label — Sinhala'),FIELD.checkbox('show_in_nav','Show in navigation'),FIELD.text('nav_group','Navigation group'),FIELD.number('sort_order','Sort order'),COMMON_STATUS,FIELD.text('seo_title_en','SEO title — English',{assist:true}),FIELD.text('seo_title_si','SEO title — Sinhala',{assist:true}),FIELD.textarea('seo_description_en','SEO description — English',{assist:true}),FIELD.textarea('seo_description_si','SEO description — Sinhala',{assist:true}),FIELD.text('canonical_path','Canonical path'),FIELD.text('og_image_url','Social image URL'),FIELD.checkbox('noindex','Prevent indexing'),FIELD.json('settings','Page settings JSON')]
    },
    sections: {
      table: 'page_sections', title: 'Homepage & sections', description: 'Switch sections on or off, pin important sections, reorder the story and edit every bilingual field.', order: 'sort_order', cardMode: true,
      columns: [['title_en','Section'],['section_key','Key'],['section_type','Type'],['is_visible','Visible'],['is_pinned','Pinned'],['sort_order','Order']],
      fields: [FIELD.relation('page_id','Page','pages',{required:true}),FIELD.text('section_key','Section key',{required:true}),FIELD.text('section_type','Section type',{required:true}),FIELD.text('eyebrow_en','Eyebrow — English',{assist:true}),FIELD.text('eyebrow_si','Eyebrow — Sinhala',{assist:true}),FIELD.text('title_en','Title — English',{assist:true}),FIELD.text('title_si','Title — Sinhala',{assist:true}),FIELD.textarea('body_en','Body — English',{assist:true}),FIELD.textarea('body_si','Body — Sinhala',{assist:true}),FIELD.text('cta_label_en','CTA label — English',{assist:true}),FIELD.text('cta_label_si','CTA label — Sinhala',{assist:true}),FIELD.text('cta_url','CTA URL'),FIELD.text('media_url','Media URL'),FIELD.text('theme_variant','Theme variant'),FIELD.json('config','Section configuration JSON'),FIELD.checkbox('is_visible','Visible'),FIELD.checkbox('is_pinned','Pinned'),FIELD.number('sort_order','Sort order'),COMMON_STATUS]
    },
    navigation: {
      table: 'navigation_items', title: 'Navigation', description: 'Manage header, footer and utility links in English and Sinhala.', order: 'sort_order',
      columns: [['label_en','Label'],['location','Location'],['href','Destination'],['is_active','Active'],['sort_order','Order']],
      fields: [FIELD.select('location','Location',['header','footer','utility']),FIELD.text('label_en','Label — English',{required:true,assist:true}),FIELD.text('label_si','Label — Sinhala',{assist:true}),FIELD.text('href','Destination',{required:true}),FIELD.text('icon','Icon name'),FIELD.checkbox('is_external','Open in new tab'),FIELD.checkbox('is_active','Active'),FIELD.number('sort_order','Sort order')]
    },
    copy: {
      table: 'site_copy', key: 'key', title: 'Interface copy', description: 'Edit buttons, labels, form wording and system messages.', order: 'key',
      columns: [['key','Key'],['en','English'],['si','Sinhala'],['context','Context'],['is_public','Public']],
      fields: [FIELD.text('key','Copy key',{required:true,readonlyOnEdit:true}),FIELD.textarea('en','English',{assist:true}),FIELD.textarea('si','Sinhala',{assist:true}),FIELD.text('context','Context'),FIELD.checkbox('is_public','Public')]
    },
    industries: {
      table: 'industries', title: 'Industries', description: 'Control industry-specific language, colours, search aliases and visual context.', order: 'sort_order',
      columns: [['name_en','Industry'],['code','Code'],['slug','Slug'],['is_pinned','Pinned'],['status','Status']],
      fields: [FIELD.text('slug','Slug',{required:true}),FIELD.text('code','Code',{required:true}),FIELD.text('name_en','Name — English',{required:true,assist:true}),FIELD.text('name_si','Name — Sinhala',{assist:true}),FIELD.textarea('short_en','Short description — English',{assist:true}),FIELD.textarea('short_si','Short description — Sinhala',{assist:true}),FIELD.textarea('hero_en','Hero message — English',{assist:true}),FIELD.textarea('hero_si','Hero message — Sinhala',{assist:true}),FIELD.json('aliases','Search aliases JSON'),FIELD.color('accent_color','Accent colour'),FIELD.color('surface_color','Surface colour'),FIELD.text('pattern','Pattern'),FIELD.text('icon','Icon'),FIELD.text('hero_image_url','Hero image URL'),FIELD.checkbox('is_pinned','Pinned'),FIELD.number('sort_order','Sort order'),COMMON_STATUS,FIELD.text('seo_title_en','SEO title — English',{assist:true}),FIELD.text('seo_title_si','SEO title — Sinhala',{assist:true}),FIELD.textarea('seo_description_en','SEO description — English',{assist:true}),FIELD.textarea('seo_description_si','SEO description — Sinhala',{assist:true})]
    },
    categories: {
      table: 'categories', title: 'Categories', description: 'Create product and service categories, search aliases and industry mappings.', order: 'sort_order',
      columns: [['name_en','Category'],['kind','Kind'],['code','Code'],['is_pinned','Pinned'],['status','Status']],
      fields: [FIELD.select('kind','Kind',['product','service'],{required:true}),FIELD.relation('parent_id','Parent category','categories',{nullable:true}),FIELD.text('slug','Slug',{required:true}),FIELD.text('code','Code',{required:true}),FIELD.text('name_en','Name — English',{required:true,assist:true}),FIELD.text('name_si','Name — Sinhala',{assist:true}),FIELD.textarea('summary_en','Summary — English',{assist:true}),FIELD.textarea('summary_si','Summary — Sinhala',{assist:true}),FIELD.textarea('description_en','Description — English',{assist:true}),FIELD.textarea('description_si','Description — Sinhala',{assist:true}),FIELD.json('aliases','Aliases JSON'),FIELD.array('industry_slugs','Industry slugs'),FIELD.text('icon','Icon'),FIELD.text('image_url','Image URL'),FIELD.select('view_style','View style',['cards','compact','editorial','steps']),FIELD.checkbox('is_pinned','Pinned'),FIELD.number('sort_order','Sort order'),COMMON_STATUS]
    },
    products: offeringConfig('product','Products','Manage request-led product paths. These are not live stock listings.'),
    services: offeringConfig('service','Services','Manage identification, sourcing, procurement, packaging, Build, launch and export pathways.'),
    contacts: {
      table: 'contact_routes', title: 'Contact routing', description: 'Add approved phone, WhatsApp and email routes by industry, category, offering or district.', order: 'sort_order',
      columns: [['label_en','Route'],['route_scope','Scope'],['phone_display','Phone'],['email','Email'],['is_active','Active']],
      fields: [FIELD.select('route_scope','Route scope',['general','industry','category','product','service','district']),FIELD.text('industry_slug','Industry slug'),FIELD.relation('category_id','Category','categories',{nullable:true}),FIELD.relation('offering_id','Offering','offerings',{nullable:true}),FIELD.text('district','District'),FIELD.text('label_en','Label — English',{required:true,assist:true}),FIELD.text('label_si','Label — Sinhala',{assist:true}),FIELD.textarea('description_en','Description — English',{assist:true}),FIELD.textarea('description_si','Description — Sinhala',{assist:true}),FIELD.text('phone_e164','Phone E.164'),FIELD.text('phone_display','Phone display'),FIELD.text('whatsapp_e164','WhatsApp E.164'),FIELD.text('email','Email'),FIELD.text('hours_en','Hours — English'),FIELD.text('hours_si','Hours — Sinhala'),FIELD.checkbox('is_primary','Primary'),FIELD.checkbox('is_active','Active'),FIELD.number('sort_order','Sort order'),FIELD.json('metadata','Metadata JSON')]
    },
    socials: {
      table: 'social_links', title: 'Social profiles', description: 'Connect only approved public Source Labs profiles.', order: 'sort_order',
      columns: [['platform','Platform'],['label','Label'],['handle','Handle'],['url','URL'],['is_active','Active']],
      fields: [FIELD.text('platform','Platform',{required:true}),FIELD.text('label','Label',{required:true}),FIELD.text('handle','Handle'),FIELD.text('url','URL',{required:true}),FIELD.text('icon','Icon'),FIELD.checkbox('is_active','Active'),FIELD.number('sort_order','Sort order')]
    },
    settings: {
      table: 'site_settings', key: 'key', title: 'Feature settings', description: 'Control public features, visual preferences, analytics, AI behaviour and deployment settings.', order: 'key',
      columns: [['key','Setting'],['description','Description'],['is_public','Public'],['updated_at','Updated']],
      fields: [FIELD.text('key','Setting key',{required:true,readonlyOnEdit:true}),FIELD.json('value','Value JSON',{required:true}),FIELD.textarea('description','Description'),FIELD.checkbox('is_public','Public')]
    },
    seo: {
      table: 'pages', title: 'SEO', description: 'Review and edit page titles, descriptions, canonical paths, social images and indexing.', order: 'sort_order', seoMode: true,
      columns: [['title_en','Page'],['seo_title_en','SEO title'],['canonical_path','Canonical'],['noindex','Noindex']],
      fields: [FIELD.text('seo_title_en','SEO title — English',{assist:true}),FIELD.text('seo_title_si','SEO title — Sinhala',{assist:true}),FIELD.textarea('seo_description_en','Meta description — English',{assist:true}),FIELD.textarea('seo_description_si','Meta description — Sinhala',{assist:true}),FIELD.text('canonical_path','Canonical path'),FIELD.text('og_image_url','Social image URL'),FIELD.checkbox('noindex','Prevent indexing')]
    },
  };

  function offeringConfig(kind, title, description) {
    return {
      table: 'offerings', kind, title, description, order: 'sort_order',
      columns: [['name_en',title.slice(0,-1)],['code','Code'],['category_id','Category'],['is_featured','Featured'],['status','Status']],
      fields: [FIELD.relation('category_id','Category','categories',{required:true,filterKind:kind}),FIELD.text('slug','Slug',{required:true}),FIELD.text('code','Code',{required:true}),FIELD.text('name_en','Name — English',{required:true,assist:true}),FIELD.text('name_si','Name — Sinhala',{assist:true}),FIELD.textarea('short_en','Short description — English',{assist:true}),FIELD.textarea('short_si','Short description — Sinhala',{assist:true}),FIELD.textarea('description_en','Description — English',{assist:true}),FIELD.textarea('description_si','Description — Sinhala',{assist:true}),FIELD.json('aliases','Aliases JSON'),FIELD.json('use_cases','Use cases JSON'),FIELD.json('key_questions','Key questions JSON'),FIELD.json('specifications','Specifications JSON'),FIELD.json('badges','Badges JSON'),FIELD.array('industry_slugs','Industry slugs'),FIELD.text('image_url','Image URL'),FIELD.json('gallery','Gallery JSON'),FIELD.text('cta_label_en','CTA label — English',{assist:true}),FIELD.text('cta_label_si','CTA label — Sinhala',{assist:true}),FIELD.textarea('availability_note_en','Availability note — English',{assist:true}),FIELD.textarea('availability_note_si','Availability note — Sinhala',{assist:true}),FIELD.textarea('compliance_note_en','Compliance note — English',{assist:true}),FIELD.textarea('compliance_note_si','Compliance note — Sinhala',{assist:true}),FIELD.checkbox('is_featured','Featured'),FIELD.checkbox('is_pinned','Pinned'),FIELD.select('view_style','View style',['card','compact','editorial','spec-led']),FIELD.number('sort_order','Sort order'),COMMON_STATUS,FIELD.text('seo_title_en','SEO title — English',{assist:true}),FIELD.text('seo_title_si','SEO title — Sinhala',{assist:true}),FIELD.textarea('seo_description_en','SEO description — English',{assist:true}),FIELD.textarea('seo_description_si','SEO description — Sinhala',{assist:true}),FIELD.json('metadata','Metadata JSON')]
    };
  }

  function toast(message, type = '') {
    const stack = $('#toast-stack'); if (!stack) return;
    const item = document.createElement('div'); item.className = `toast ${type}`; item.textContent = message; stack.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  function client() {
    if (!state.client) state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, global: { headers: { 'x-client-info': 'source-labs-admin/1.0' } } });
    return state.client;
  }

  async function bootstrap() {
    if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      $('#login-status').textContent = 'Admin configuration is unavailable.'; return;
    }
    client();
    const { data: { session } } = await state.client.auth.getSession();
    if (session) await acceptSession(session); else showLogin();
    state.client.auth.onAuthStateChange(async (event, sessionNext) => {
      if (event === 'SIGNED_OUT') showLogin();
      else if (sessionNext && (!state.session || sessionNext.user.id !== state.session.user.id)) await acceptSession(sessionNext);
    });
    bindLogin();
  }

  function bindLogin() {
    $('#show-password')?.addEventListener('change', (event) => { $('#admin-password').type = event.target.checked ? 'text' : 'password'; });
    $('#login-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const password = form.password.value;
      if (password.length < 8) return setLoginStatus('Enter the complete admin password.');
      button.disabled = true; button.textContent = 'Opening…'; setLoginStatus('');
      try {
        let result = await state.client.auth.signInWithPassword({ email: CONFIG.adminEmail, password });
        if (result.error) {
          const bootstrapResponse = await fetch(`${CONFIG.supabaseUrl}/functions/v1/bootstrap-source-labs-admin`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CONFIG.supabaseKey }, body: JSON.stringify({ password }) });
          const bootstrapData = await bootstrapResponse.json().catch(() => ({}));
          if (!bootstrapResponse.ok && !bootstrapData.already_initialized) throw new Error(bootstrapData.error || 'Admin access failed.');
          result = await state.client.auth.signInWithPassword({ email: CONFIG.adminEmail, password });
          if (result.error) throw result.error;
        }
        await acceptSession(result.data.session);
        form.reset();
      } catch (error) { setLoginStatus(error.message || 'The password was not accepted.'); }
      finally { button.disabled = false; button.textContent = 'Open admin'; }
    });
  }
  function setLoginStatus(message) { const status = $('#login-status'); if (status) status.textContent = message; }

  async function acceptSession(session) {
    if (!session?.user) return showLogin();
    const { data, error } = await state.client.auth.getUser(session.access_token);
    const user = data?.user;
    if (error || !user || user.app_metadata?.role !== 'admin') {
      await state.client.auth.signOut(); setLoginStatus('This account does not have Source Labs admin access.'); return;
    }
    state.session = session; state.user = user; showApp(); renderNavigation(); bindShell(); await loadModule(state.module);
    if (user.user_metadata?.must_change_password) toast('Security action: change the initial admin password in Account.', 'error');
  }
  function showLogin() { state.session = null; state.user = null; $('#login-view')?.classList.remove('hidden'); $('#app-view')?.classList.add('hidden'); }
  function showApp() { $('#login-view')?.classList.add('hidden'); $('#app-view')?.classList.remove('hidden'); }

  function renderNavigation() {
    const root = $('#admin-navigation'); if (!root) return;
    root.innerHTML = NAV.map((group) => `<div class="nav-group"><div class="nav-label">${esc(group.label)}</div><nav class="admin-nav">${group.items.map(([key,label]) => `<button type="button" data-module="${key}" class="${state.module === key ? 'active' : ''}"><span class="nav-dot"></span>${esc(label)}</button>`).join('')}</nav></div>`).join('');
    $$('[data-module]', root).forEach((button) => button.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); loadModule(button.dataset.module); }));
  }
  function bindShell() {
    $('#mobile-menu')?.addEventListener('click', () => document.body.classList.add('sidebar-open'));
    $('.sidebar-close')?.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
    $('#logout-button')?.addEventListener('click', () => state.client.auth.signOut());
    $('#comfort-toggle')?.addEventListener('click', () => { state.comfort = !state.comfort; document.documentElement.classList.toggle('simple-admin', state.comfort); });
    $('#quick-assist')?.addEventListener('click', () => openAssistant(null));
  }

  async function loadModule(module) {
    state.module = module; state.search = ''; state.filter = ''; renderNavigation();
    $('#topbar-title').textContent = MODULES[module]?.title || nice(module);
    $('#topbar-subtitle').textContent = module === 'dashboard' ? 'Source Labs operating view' : 'Live Supabase content';
    const content = $('#admin-content'); content.innerHTML = '<div class="loading">Loading…</div>';
    try {
      if (module === 'dashboard') await renderDashboard();
      else if (module === 'analytics') await renderAnalytics();
      else if (module === 'enquiries') await renderEnquiries();
      else if (module === 'media') await renderMedia();
      else if (module === 'audit') await renderAudit();
      else if (module === 'account') renderAccount();
      else await renderCrud(module);
    } catch (error) { console.error(error); content.innerHTML = `<div class="empty"><h2>Could not load this module</h2><p>${esc(error.message || 'Unknown error')}</p><button class="button button-secondary" onclick="location.reload()">Reload</button></div>`; }
  }

  async function query(table, select = '*', builder = null) {
    let request = state.client.from(table).select(select);
    if (builder) request = builder(request);
    const { data, error } = await request;
    if (error) throw error; return data || [];
  }

  async function loadReferences() {
    if (state.references.loaded) return;
    const [pages,categories,offerings,industries] = await Promise.all([
      query('pages','id,title_en,title_si,slug,sort_order',(q)=>q.order('sort_order')),
      query('categories','id,name_en,name_si,kind,slug,sort_order',(q)=>q.order('sort_order')),
      query('offerings','id,name_en,name_si,kind,code,sort_order',(q)=>q.order('sort_order')),
      query('industries','id,name_en,name_si,slug,sort_order',(q)=>q.order('sort_order')),
    ]);
    state.references = { loaded:true,pages,categories,offerings,industries };
  }

  async function renderDashboard() {
    const [counters,daily,enquiries,offerings,recent] = await Promise.all([
      query('visitor_counters','metric,value'),
      query('visitor_daily','day,views,first_seen',(q)=>q.gte('day',new Date(Date.now()-13*864e5).toISOString().slice(0,10)).order('day')),
      query('enquiries','id,request_code,name,status,request_type,created_at'),
      query('offerings','id,kind,status'),
      query('admin_audit_log','*',(q)=>q.order('created_at',{ascending:false}).limit(8)),
    ]);
    const counts = Object.fromEntries(counters.map((item)=>[item.metric,Number(item.value||0)]));
    const uniqueDays = new Map(); daily.forEach((row)=>uniqueDays.set(row.day,(uniqueDays.get(row.day)||0)+Number(row.views||0)));
    const max = Math.max(1,...uniqueDays.values());
    const newEnquiries = enquiries.filter((item)=>item.status==='new').length;
    const published = offerings.filter((item)=>item.status==='published').length;
    $('#admin-content').innerHTML = `<div class="view-head"><div><h1>Operating dashboard</h1><p>Live enquiries, website reach and content readiness without inventing commercial performance.</p></div><div class="head-actions"><button class="button button-accent" data-module-shortcut="enquiries">Review enquiries</button><a class="button button-secondary" href="../index.html" target="_blank" rel="noopener">Open website ↗</a></div></div><div class="stats"><div class="stat"><div class="stat-label">Total views</div><div class="stat-value">${Number(counts.total_views||0).toLocaleString()}</div><div class="stat-note">First-party page views</div></div><div class="stat"><div class="stat-label">Unique visitors</div><div class="stat-value">${Number(counts.unique_visitors||0).toLocaleString()}</div><div class="stat-note">Daily privacy-aware visitors</div></div><div class="stat"><div class="stat-label">New enquiries</div><div class="stat-value">${newEnquiries}</div><div class="stat-note">Needs triage</div></div><div class="stat"><div class="stat-label">Published paths</div><div class="stat-value">${published}</div><div class="stat-note">Products and services</div></div></div><div class="panel-grid"><section class="panel"><div class="panel-head"><h2>Views — last 14 days</h2><button class="button button-secondary button-small" data-module-shortcut="analytics">Full analytics</button></div><div class="panel-body"><div class="chart">${Array.from({length:14},(_,i)=>{const day=new Date(Date.now()-(13-i)*864e5).toISOString().slice(0,10);const value=uniqueDays.get(day)||0;return `<div class="chart-bar" style="--h:${Math.max(3,Math.round(value/max*100))}%" data-label="${day}: ${value}"></div>`;}).join('')}</div></div></section><section class="panel"><div class="panel-head"><h2>Recent changes</h2><button class="button button-secondary button-small" data-module-shortcut="audit">History</button></div><div class="panel-body activity-list">${recent.length?recent.map(activityItem).join(''):'<div class="empty">No recent changes.</div>'}</div></section></div>`;
    $$('[data-module-shortcut]').forEach((button)=>button.addEventListener('click',()=>loadModule(button.dataset.moduleShortcut)));
  }

  function activityItem(row) {
    const table = row.table_name || row.entity_table || row.table || 'content';
    const operation = row.operation || row.action || row.event || 'changed';
    const record = row.record_id || row.entity_id || row.row_id || '';
    return `<div class="activity-item"><div class="activity-icon">•</div><div><strong>${esc(nice(operation))} · ${esc(nice(table))}</strong><small>${esc(record || 'record')}</small></div><small>${formatDate(row.created_at)}</small></div>`;
  }

  async function renderAnalytics() {
    const [counters,daily,events] = await Promise.all([
      query('visitor_counters','metric,value,updated_at'),
      query('visitor_daily','day,views,landing_path,last_path,industry_slug,language,referrer_host',(q)=>q.order('day',{ascending:false}).limit(1000)),
      query('analytics_events','event_name,page_path,industry_slug,language,metadata,created_at',(q)=>q.order('created_at',{ascending:false}).limit(500)),
    ]);
    const values=Object.fromEntries(counters.map(r=>[r.metric,Number(r.value||0)]));
    const eventCount={};events.forEach(r=>eventCount[r.event_name]=(eventCount[r.event_name]||0)+1);
    const industries={};daily.forEach(r=>{const k=r.industry_slug||'general';industries[k]=(industries[k]||0)+Number(r.views||0)});
    const refs={};daily.forEach(r=>{const k=r.referrer_host||'Direct / unknown';refs[k]=(refs[k]||0)+1});
    $('#admin-content').innerHTML=`<div class="view-head"><div><h1>Visitor analytics</h1><p>First-party aggregate analytics. Raw IP addresses are not shown or stored in these public reporting tables.</p></div></div><div class="stats"><div class="stat"><div class="stat-label">Total views</div><div class="stat-value">${values.total_views||0}</div></div><div class="stat"><div class="stat-label">Unique visitors</div><div class="stat-value">${values.unique_visitors||0}</div></div><div class="stat"><div class="stat-label">Tracked events</div><div class="stat-value">${events.length}</div></div><div class="stat"><div class="stat-label">Days recorded</div><div class="stat-value">${new Set(daily.map(r=>r.day)).size}</div></div></div><div class="panel-grid"><section class="panel"><div class="panel-head"><h2>Event activity</h2></div><div class="panel-body">${miniRanking(eventCount)}</div></section><section class="panel"><div class="panel-head"><h2>Industry context</h2></div><div class="panel-body">${miniRanking(industries)}</div></section><section class="panel"><div class="panel-head"><h2>Referrers</h2></div><div class="panel-body">${miniRanking(refs)}</div></section><section class="panel"><div class="panel-head"><h2>Recent event stream</h2></div><div class="panel-body activity-list">${events.slice(0,12).map(r=>`<div class="activity-item"><div class="activity-icon">•</div><div><strong>${esc(nice(r.event_name))}</strong><small>${esc(r.page_path||'/')} · ${esc(r.industry_slug||'general')}</small></div><small>${formatDate(r.created_at)}</small></div>`).join('')}</div></section></div>`;
  }
  function miniRanking(obj){const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,10);const max=Math.max(1,...entries.map(x=>x[1]));return entries.length?`<div class="activity-list">${entries.map(([k,v])=>`<div><div style="display:flex;justify-content:space-between;font-size:.8rem"><strong>${esc(nice(k))}</strong><span>${v}</span></div><div style="height:7px;background:#edf3f6;border-radius:999px;margin:5px 0 9px"><div style="height:100%;width:${Math.round(v/max*100)}%;background:linear-gradient(90deg,var(--accent),var(--blue));border-radius:999px"></div></div></div>`).join('')}</div>`:'<div class="empty">No data yet.</div>'}

  async function renderCrud(module) {
    await loadReferences(); const cfg=MODULES[module]; let request=state.client.from(cfg.table).select('*');
    if(cfg.kind)request=request.eq('kind',cfg.kind);request=request.order(cfg.order||'created_at',{ascending:cfg.order!=='created_at'});
    const {data,error}=await request;if(error)throw error;state.rows=data||[];
    drawCrud(module);
  }
  function drawCrud(module){const cfg=MODULES[module];const filtered=state.rows.filter(row=>!state.search||Object.values(row).some(v=>String(v??'').toLowerCase().includes(state.search.toLowerCase()))).filter(row=>!state.filter||row.status===state.filter||row.kind===state.filter||row.location===state.filter);const content=$('#admin-content');content.innerHTML=`<div class="view-head"><div><h1>${esc(cfg.title)}</h1><p>${esc(cfg.description)}</p></div><div class="head-actions"><button class="button button-accent" id="new-record">+ Add ${esc(cfg.title.replace(/s$/,''))}</button></div></div><div class="toolbar"><div class="toolbar-search"><input id="table-search" type="search" value="${attr(state.search)}" placeholder="Search this module"></div>${['pages','sections','industries','categories','products','services'].includes(module)?`<select id="table-filter"><option value="">All states</option>${STATUS.map(s=>`<option value="${s}" ${state.filter===s?'selected':''}>${nice(s)}</option>`).join('')}</select>`:''}<span class="pill">${filtered.length} records</span></div>${cfg.cardMode?renderSectionCards(filtered):renderTable(filtered,cfg)}`;
    $('#new-record')?.addEventListener('click',()=>openEditor(module,null));
    $('#table-search')?.addEventListener('input',debounce(e=>{state.search=e.target.value;drawCrud(module)},180));
    $('#table-filter')?.addEventListener('change',e=>{state.filter=e.target.value;drawCrud(module)});
    bindCrudActions(module);
  }
  function renderTable(rows,cfg){if(!rows.length)return '<div class="panel empty">No records match this view.</div>';return `<div class="table-shell"><table class="data-table"><thead><tr>${cfg.columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}<th style="text-align:right">Actions</th></tr></thead><tbody>${rows.map(row=>`<tr>${cfg.columns.map(([key])=>`<td>${formatCell(row,key)}</td>`).join('')}<td><div class="row-actions"><button class="icon-button" data-edit="${attr(row[cfg.key||'id'])}" title="Edit">✎</button><button class="icon-button" data-delete="${attr(row[cfg.key||'id'])}" title="Delete">×</button></div></td></tr>`).join('')}</tbody></table></div>`}
  function renderSectionCards(rows){if(!rows.length)return '<div class="panel empty">No sections match this view.</div>';return `<div class="card-list">${rows.map(row=>`<article class="content-card"><div class="drag-handle">⋮⋮</div><div><h3>${esc(row.title_en||row.section_key||'Untitled section')}</h3><p>${esc(row.section_type)} · order ${row.sort_order} · ${row.status}</p></div><div class="content-card-actions"><label class="toggle"><input type="checkbox" data-toggle="is_visible" data-id="${row.id}" ${row.is_visible?'checked':''}>Visible</label><button class="icon-button" data-move="up" data-id="${row.id}">↑</button><button class="icon-button" data-move="down" data-id="${row.id}">↓</button><button class="icon-button" data-edit="${row.id}">✎</button><button class="icon-button" data-delete="${row.id}">×</button></div></article>`).join('')}</div>`}
  function formatCell(row,key){const v=row[key];if(['status','kind','location'].includes(key))return `<span class="pill ${attr(v)}">${esc(nice(v||''))}</span>`;if(typeof v==='boolean')return `<span class="pill ${v?'active':''}">${v?'Yes':'No'}</span>`;if(key.endsWith('_at'))return formatDate(v);if(key.endsWith('_id')&&v){const all=[...(state.references.pages||[]),...(state.references.categories||[]),...(state.references.offerings||[])];const ref=all.find(x=>x.id===v);return ref?`<span class="row-title">${esc(ref.title_en||ref.name_en||ref.code)}</span>`:esc(String(v).slice(0,8));}if(v&&typeof v==='object')return `<code>${esc(JSON.stringify(v).slice(0,90))}</code>`;const text=String(v??'');return `<span class="${key.includes('title')||key.includes('name')?'row-title':''}">${esc(text.length>110?text.slice(0,107)+'…':text||'—')}</span>`}

  function bindCrudActions(module){const cfg=MODULES[module];$$('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.edit;const row=state.rows.find(r=>String(r[cfg.key||'id'])===key);openEditor(module,row)}));$$('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteRecord(module,b.dataset.delete)));$$('[data-toggle]').forEach(b=>b.addEventListener('change',()=>quickUpdate(cfg.table,b.dataset.id,{[b.dataset.toggle]:b.checked})));$$('[data-move]').forEach(b=>b.addEventListener('click',()=>moveSection(b.dataset.id,b.dataset.move)))}
  async function moveSection(id,direction){const row=state.rows.find(r=>r.id===id);if(!row)return;const siblings=state.rows.filter(r=>r.page_id===row.page_id).sort((a,b)=>a.sort_order-b.sort_order);const index=siblings.findIndex(r=>r.id===id);const other=siblings[index+(direction==='up'?-1:1)];if(!other)return;await Promise.all([quickUpdate('page_sections',row.id,{sort_order:other.sort_order},false),quickUpdate('page_sections',other.id,{sort_order:row.sort_order},false)]);toast('Section order updated.','success');renderCrud('sections')}
  async function quickUpdate(table,id,changes,notify=true){const {error}=await state.client.from(table).update(changes).eq('id',id);if(error)throw error;if(notify)toast('Updated.','success')}

  function relationOptions(field,row){let source=state.references[field.source]||[];if(field.filterKind)source=source.filter(item=>item.kind===field.filterKind);return `<option value="">${field.nullable?'— None —':'— Select —'}</option>${source.map(item=>`<option value="${item.id}" ${row?.[field.name]===item.id?'selected':''}>${esc(item.title_en||item.name_en||item.code||item.slug||item.id)}</option>`).join('')}`}
  function defaultFor(field,module){if(field.name==='kind')return MODULES[module]?.kind||field.options?.[0]||'';if(field.type==='checkbox')return field.name==='is_visible'||field.name==='is_active'||field.name==='is_public'||field.name==='show_in_nav';if(field.name==='status')return 'draft';if(field.name==='view_style')return field.options?.[0];if(field.type==='json')return '{}';if(field.type==='array')return '';if(field.type==='number')return 0;if(field.type==='color')return field.name.includes('surface')?'#e9fbf9':'#2cd4c8';return ''}
  function fieldHtml(field,row,module,isEdit){let value=row?.[field.name];if(value===undefined||value===null)value=defaultFor(field,module);const id=`f-${field.name}`;const disabled=field.readonlyOnEdit&&isEdit?'disabled':'';let input='';if(field.type==='textarea'||field.type==='json'){const shown=field.type==='json'?(typeof value==='string'?value:JSON.stringify(value,null,2)):value;input=`<textarea id="${id}" name="${field.name}" class="${field.type==='json'?'code':''}" ${field.required?'required':''} ${disabled}>${esc(shown)}</textarea>`}else if(field.type==='checkbox'){input=`<label class="toggle"><input id="${id}" name="${field.name}" type="checkbox" ${value?'checked':''}> ${esc(field.label)}</label>`;return `<div class="field ${field.full?'full':''}">${input}</div>`}else if(field.type==='select'){input=`<select id="${id}" name="${field.name}" ${field.required?'required':''}>${field.options.map(opt=>`<option value="${attr(opt)}" ${String(value)===String(opt)?'selected':''}>${esc(nice(opt))}</option>`).join('')}</select>`}else if(field.type==='relation'){input=`<select id="${id}" name="${field.name}" ${field.required?'required':''}>${relationOptions(field,row)}</select>`}else if(field.type==='array'){input=`<textarea id="${id}" name="${field.name}" placeholder="One value per line">${esc(Array.isArray(value)?value.join('\n'):value)}</textarea>`}else if(field.type==='color'){input=`<div style="display:flex;gap:8px"><input id="${id}" name="${field.name}" type="color" value="${attr(value||'#2cd4c8')}" style="width:55px;padding:4px"><input data-color-text="${field.name}" value="${attr(value||'#2cd4c8')}"></div>`}else{input=`<input id="${id}" name="${field.name}" type="${field.type==='number'?'number':'text'}" value="${attr(value)}" ${field.required?'required':''} ${disabled}>`}return `<div class="field ${field.full?'full':''}"><label for="${id}">${esc(field.label)}</label>${input}${field.assist?`<button type="button" class="assistant-button" data-assist-field="${field.name}">✦ Write / translate</button>`:''}</div>`}

  async function openEditor(module,row){await loadReferences();const cfg=MODULES[module];const isEdit=Boolean(row);const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><form class="admin-modal" id="record-form"><div class="modal-head"><div><small>${esc(cfg.title)}</small><h2>${isEdit?'Edit record':'Add record'}</h2></div><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="form-grid">${cfg.fields.map(field=>fieldHtml(field,row,module,isEdit)).join('')}</div><div id="editor-status" class="login-status"></div></div><div class="modal-foot"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button class="button button-primary" type="submit">Save changes</button></div></form></div>`;
    const close=()=>root.innerHTML='';$('.modal-close',root)?.addEventListener('click',close);$('.modal-cancel',root)?.addEventListener('click',close);$('.modal-backdrop',root)?.addEventListener('click',e=>{if(e.target===e.currentTarget)close()});$$('[data-color-text]',root).forEach(input=>input.addEventListener('input',()=>{const color=$(`[name="${input.dataset.colorText}"]`,root);if(/^#[0-9a-f]{6}$/i.test(input.value))color.value=input.value}));$$('[data-assist-field]',root).forEach(button=>button.addEventListener('click',()=>openAssistant($(`[name="${button.dataset.assistField}"]`,root))));$('#record-form',root)?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const save=form.querySelector('button[type="submit"]');save.disabled=true;save.textContent='Saving…';try{const payload=serializeForm(form,cfg.fields,row,module);if(cfg.kind)payload.kind=cfg.kind;let result;if(isEdit){const key=cfg.key||'id';result=await state.client.from(cfg.table).update(payload).eq(key,row[key])}else result=await state.client.from(cfg.table).insert(payload);if(result.error)throw result.error;toast('Saved successfully.','success');close();await renderCrud(module)}catch(error){$('#editor-status',root).textContent=error.message||'Save failed';save.disabled=false;save.textContent='Save changes'}})}
  function serializeForm(form,fields,row,module){const data={};for(const field of fields){if(field.readonlyOnEdit&&row)continue;const element=form.elements[field.name];if(!element)continue;if(field.type==='checkbox'){data[field.name]=element.checked;continue}let value=element.value;if(field.type==='number')value=Number(value||0);else if(field.type==='json'){try{value=JSON.parse(value||'{}')}catch{throw new Error(`${field.label} contains invalid JSON.`)}}else if(field.type==='array')value=value.split(/\n|,/).map(v=>v.trim()).filter(Boolean);else if(field.type==='relation')value=isUuid(value)?value:null;data[field.name]=value}if(MODULES[module]?.kind)data.kind=MODULES[module].kind;return data}
  async function deleteRecord(module,key){const cfg=MODULES[module];if(!confirm('Delete this record? This cannot be undone.'))return;const column=cfg.key||'id';const {error}=await state.client.from(cfg.table).delete().eq(column,key);if(error){toast(error.message,'error');return}toast('Deleted.','success');await renderCrud(module)}

  async function renderEnquiries(){const {data,error}=await state.client.from('enquiries').select('*').order('created_at',{ascending:false}).limit(500);if(error)throw error;state.rows=data||[];drawEnquiries()}
  function drawEnquiries(){const rows=state.rows.filter(r=>!state.search||[r.request_code,r.name,r.contact,r.description,r.industry_slug,r.status].join(' ').toLowerCase().includes(state.search.toLowerCase())).filter(r=>!state.filter||r.status===state.filter);$('#admin-content').innerHTML=`<div class="view-head"><div><h1>Enquiries</h1><p>Review request codes, attachments, routing details and commercial status. Private customer information is visible only to authorised admins.</p></div></div><div class="toolbar"><div class="toolbar-search"><input id="enquiry-search" type="search" placeholder="Search request, name, contact or description" value="${attr(state.search)}"></div><select id="enquiry-filter"><option value="">All statuses</option>${['new','triaged','in_progress','quoted','won','lost','closed'].map(s=>`<option value="${s}" ${state.filter===s?'selected':''}>${nice(s)}</option>`).join('')}</select><span class="pill">${rows.length} requests</span></div><div class="table-shell"><table class="data-table"><thead><tr><th>Request</th><th>Customer</th><th>Type</th><th>Status</th><th>Received</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="row-title">${esc(r.request_code||'Pending code')}</span><span class="row-sub">${esc(r.industry_slug||'General')}</span></td><td><span class="row-title">${esc(r.name)}</span><span class="row-sub">${esc(r.contact||r.email)}</span></td><td>${esc(nice(r.request_type))}</td><td><span class="pill ${attr(r.status)}">${esc(nice(r.status))}</span></td><td>${formatDate(r.created_at)}</td><td><div class="row-actions"><button class="button button-secondary button-small" data-open-enquiry="${r.id}">Open</button></div></td></tr>`).join('')}</tbody></table></div>`;$('#enquiry-search')?.addEventListener('input',debounce(e=>{state.search=e.target.value;drawEnquiries()}));$('#enquiry-filter')?.addEventListener('change',e=>{state.filter=e.target.value;drawEnquiries()});$$('[data-open-enquiry]').forEach(b=>b.addEventListener('click',()=>openEnquiry(b.dataset.openEnquiry)))}
  async function openEnquiry(id){const row=state.rows.find(r=>r.id===id);if(!row)return;const attachments=Array.isArray(row.attachment_paths)?row.attachment_paths:[];const signed=[];for(const file of attachments){const path=typeof file==='string'?file:file.path;if(!path)continue;const {data}=await state.client.storage.from('request-files').createSignedUrl(path,900);if(data?.signedUrl)signed.push({...file,path,url:data.signedUrl})}const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><form class="admin-modal" id="enquiry-form"><div class="modal-head"><div><small>${esc(row.request_code||'Request')}</small><h2>${esc(row.name)}</h2></div><button type="button" class="modal-close">×</button></div><div class="modal-body enquiry-detail"><div class="detail-box"><h3>Request details</h3><dl class="detail-list">${[['Contact',row.contact],['Email',row.email],['District',row.district],['Preferred language',row.preferred_language],['Request type',nice(row.request_type)],['Industry',row.industry_slug],['Quantity',row.quantity],['Timeline',row.timeline],['Source code',row.source_code],['Received',formatDate(row.created_at)]].map(([k,v])=>`<div class="detail-row"><dt>${esc(k)}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl><h3 style="margin-top:18px">Attachments</h3><div class="attachment-list">${signed.length?signed.map(f=>`<a class="attachment-link" href="${attr(f.url)}" target="_blank" rel="noopener"><span>${esc(f.name||f.path.split('/').pop())}</span><span>Open ↗</span></a>`).join(''):'<p class="field-help">No attachments.</p>'}</div></div><div><div class="detail-box"><h3>Description</h3><p>${esc(row.description)}</p>${row.intended_use?`<h3>Intended use</h3><p>${esc(row.intended_use)}</p>`:''}</div><div class="field" style="margin-top:14px"><label for="status">Status</label><select name="status" id="status">${['new','triaged','in_progress','quoted','won','lost','closed'].map(s=>`<option value="${s}" ${row.status===s?'selected':''}>${nice(s)}</option>`).join('')}</select></div><div class="field"><label for="internal_notes">Internal notes</label><textarea name="internal_notes" id="internal_notes">${esc(row.internal_notes||'')}</textarea></div><div class="field"><label for="lost_reason">Lost reason</label><input name="lost_reason" id="lost_reason" value="${attr(row.lost_reason||'')}"></div></div></div><div class="modal-foot"><button type="button" class="button button-secondary modal-close-inline">Close</button><button type="submit" class="button button-primary">Save workflow</button></div></form></div>`;const close=()=>root.innerHTML='';$('.modal-close',root)?.addEventListener('click',close);$('.modal-close-inline',root)?.addEventListener('click',close);$('#enquiry-form',root)?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const {error}=await state.client.from('enquiries').update({status:form.status.value,internal_notes:form.internal_notes.value,lost_reason:form.lost_reason.value}).eq('id',id);if(error)return toast(error.message,'error');toast('Enquiry updated.','success');close();renderEnquiries()})}

  async function renderMedia(){const rows=await query('media_assets','*',(q)=>q.order('created_at',{ascending:false}));state.rows=rows;$('#admin-content').innerHTML=`<div class="view-head"><div><h1>Media & image optimiser</h1><p>Images are resized and converted to WebP in your browser before upload. Add accurate English and Sinhala alternative text before publishing.</p></div></div><div class="panel"><div class="panel-body"><div class="media-drop"><strong>Choose or drop an image</strong><p class="field-help">JPG, PNG or WebP · resized to ${CONFIG.imageMaxDimension||1600}px maximum</p><input id="media-input" type="file" accept="image/jpeg,image/png,image/webp"></div><div id="media-work"></div></div></div><div class="media-preview-grid">${rows.map(mediaCard).join('')}</div>`;$('#media-input')?.addEventListener('change',e=>prepareMedia(e.target.files?.[0]));$$('[data-delete-media]').forEach(b=>b.addEventListener('click',()=>deleteMedia(b.dataset.deleteMedia)))}
  function mediaCard(row){return `<article class="media-card"><img src="${attr(row.public_url)}" alt="${attr(row.alt_en||'')}"><div class="media-card-body"><strong>${esc(row.storage_path.split('/').pop())}</strong><small>${row.optimized_bytes?Math.round(row.optimized_bytes/1024)+' KB':'—'} · ${esc(row.status)}</small><div style="margin-top:8px"><button class="button button-danger button-small" data-delete-media="${row.id}">Delete</button></div></div></article>`}
  async function prepareMedia(file){if(!file)return;const work=$('#media-work');work.innerHTML='<div class="loading">Optimising image…</div>';try{const optimized=await optimiseImage(file);work.innerHTML=`<form id="media-form" class="form-grid" style="margin-top:18px"><div class="field"><label>English alt text</label><input name="alt_en" required></div><div class="field"><label>Sinhala alt text</label><input name="alt_si"></div><div class="field full"><label>Caption — English</label><input name="caption_en"></div><div class="field full"><label>Caption — Sinhala</label><input name="caption_si"></div><div class="field full"><p class="field-help">Original ${Math.round(file.size/1024)} KB → optimised ${Math.round(optimized.file.size/1024)} KB · ${optimized.width}×${optimized.height}</p><button class="button button-primary" type="submit">Upload optimised image</button></div></form>`;$('#media-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const path=`library/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName(optimized.file.name)}`;const {error:uploadError}=await state.client.storage.from('site-media').upload(path,optimized.file,{contentType:'image/webp',cacheControl:'31536000'});if(uploadError)return toast(uploadError.message,'error');const {data:urlData}=state.client.storage.from('site-media').getPublicUrl(path);const {error}=await state.client.from('media_assets').insert({storage_path:path,public_url:urlData.publicUrl,alt_en:form.alt_en.value,alt_si:form.alt_si.value,caption_en:form.caption_en.value,caption_si:form.caption_si.value,mime_type:'image/webp',width:optimized.width,height:optimized.height,original_bytes:file.size,optimized_bytes:optimized.file.size,status:'published'});if(error)return toast(error.message,'error');toast('Image optimised and uploaded.','success');renderMedia()})}catch(error){work.innerHTML=`<p class="login-status">${esc(error.message)}</p>`}}
  async function optimiseImage(file){const bitmap=await createImageBitmap(file);const max=CONFIG.imageMaxDimension||1600;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const width=Math.max(1,Math.round(bitmap.width*scale));const height=Math.max(1,Math.round(bitmap.height*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(bitmap,0,0,width,height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',CONFIG.imageQuality||.82));if(!blob)throw new Error('Image optimisation failed.');return{file:new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'}),width,height}}
  function safeName(name){return String(name).normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,100)}
  async function deleteMedia(id){const row=state.rows.find(r=>r.id===id);if(!row||!confirm('Delete this media record and stored image?'))return;const {error:storageError}=await state.client.storage.from('site-media').remove([row.storage_path]);if(storageError)return toast(storageError.message,'error');const {error}=await state.client.from('media_assets').delete().eq('id',id);if(error)return toast(error.message,'error');toast('Media deleted.','success');renderMedia()}

  async function renderAudit(){const rows=await query('admin_audit_log','*',(q)=>q.order('created_at',{ascending:false}).limit(500));$('#admin-content').innerHTML=`<div class="view-head"><div><h1>Change history</h1><p>Audit records generated by CMS changes. This is an operational trace, not a substitute for Git history or formal approvals.</p></div></div><div class="table-shell"><table class="data-table"><thead><tr><th>Time</th><th>Operation</th><th>Table</th><th>Record</th><th>Actor</th></tr></thead><tbody>${rows.map(row=>{const table=row.table_name||row.entity_table||row.table||'—';const operation=row.operation||row.action||row.event||'—';const record=row.record_id||row.entity_id||row.row_id||'—';return `<tr><td>${formatDate(row.created_at)}</td><td><span class="pill">${esc(nice(operation))}</span></td><td>${esc(table)}</td><td>${esc(String(record).slice(0,40))}</td><td>${esc(String(row.actor_id||row.user_id||'system').slice(0,18))}</td></tr>`}).join('')}</tbody></table></div>`}

  function renderAccount(){const mustChange=Boolean(state.user?.user_metadata?.must_change_password);$('#admin-content').innerHTML=`<div class="view-head"><div><h1>Account</h1><p>Manage the password-only administrator account. The hidden email is used internally by Supabase Auth and is not shown on the public login.</p></div></div><div class="panel-grid"><section class="panel"><div class="panel-head"><h2>Change password</h2></div><div class="panel-body"><form id="password-form"><div class="field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" required><div class="field-help">Use at least 12 characters and do not reuse the initial password.</div></div><div class="field"><label for="confirm-password">Confirm password</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="12" required></div><div id="password-status" class="login-status"></div><button class="button button-primary" type="submit">Update password</button></form></div></section><section class="panel"><div class="panel-head"><h2>Security state</h2></div><div class="panel-body"><p><span class="pill ${mustChange?'draft':'published'}">${mustChange?'Initial password still active':'Password updated'}</span></p><p class="field-help">Role: ${esc(state.user?.app_metadata?.role||'—')}<br>Account ID: ${esc(state.user?.id||'—')}</p><div class="danger-zone"><strong>Sign out other use</strong><p class="field-help">Changing the password protects future logins. Existing sessions may remain valid until expiry; sign out when using a shared device.</p></div></div></section></div>`;$('#password-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;if(form.password.value!==form.confirm.value)return $('#password-status').textContent='Passwords do not match.';if(form.password.value.length<12)return $('#password-status').textContent='Use at least 12 characters.';const {error}=await state.client.auth.updateUser({password:form.password.value,data:{...state.user.user_metadata,must_change_password:false}});if(error)return $('#password-status').textContent=error.message;toast('Password changed.','success');const {data}=await state.client.auth.getUser();state.user=data.user;renderAccount()})}

  function openAssistant(target){state.assistTarget=target;const root=$('#drawer-root');const source=target?.value||'';root.innerHTML=`<aside class="assistant-drawer"><div class="drawer-head"><div><small>Source Labs writing tool</small><h2>Write, shorten, translate</h2></div><button class="modal-close" id="assistant-close">×</button></div><div class="drawer-body"><div class="field"><label>Source text</label><textarea id="assist-source">${esc(source)}</textarea></div><div class="assist-actions"><button data-assist-action="improve">Improve clarity</button><button data-assist-action="concise">Make concise</button><button data-assist-action="headline">Headline options</button><button data-assist-action="seo">SEO description</button><button data-assist-action="translate_si">Draft Sinhala</button></div><div class="field"><label>Result</label><div id="assist-output" class="assist-output">Choose an action.</div></div><p class="field-help" id="assist-notice">AI output and translations must be reviewed before publishing. Unsupported stock, price, certification or outcome claims are not allowed.</p></div><div class="drawer-foot"><button class="button button-secondary" id="assistant-copy">Copy</button>${target?'<button class="button button-primary" id="assistant-use">Use in field</button>':''}</div></aside>`;const close=()=>root.innerHTML='';$('#assistant-close')?.addEventListener('click',close);$$('[data-assist-action]').forEach(b=>b.addEventListener('click',()=>runAssistant(b.dataset.assistAction)));$('#assistant-copy')?.addEventListener('click',()=>navigator.clipboard.writeText($('#assist-output').textContent||''));$('#assistant-use')?.addEventListener('click',()=>{if(state.assistTarget){state.assistTarget.value=$('#assist-output').textContent||'';state.assistTarget.dispatchEvent(new Event('input',{bubbles:true}))}close()})}
  async function runAssistant(action){const output=$('#assist-output');const notice=$('#assist-notice');const text=$('#assist-source').value.trim();if(!text)return output.textContent='Add source text first.';output.textContent='Working…';try{const {data,error}=await state.client.functions.invoke('admin-assist',{body:{action,text,context:`Source Labs ${state.module} editor`}});if(error)throw error;output.textContent=data.text||'No output returned.';notice.textContent=data.notice||`Mode: ${data.mode||'assistant'}${data.model?' · '+data.model:''}. Review before publishing.`}catch(error){output.textContent=error.message||'Assistant unavailable.'}}

  bootstrap();
})();
