(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const PAGE = document.body.dataset.page || 'home';
  const BASE = CONFIG.publicBaseUrl || new URL('./', location.href).href;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const slugify = (value = '') => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90);
  const safeHref = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '#';
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
    if (/^javascript:/i.test(raw)) return '#';
    return raw.replace(/^\//, '');
  };
  const jsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [];
    try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  const textList = (value, lang = 'en') => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (value && typeof value === 'object') {
      const picked = value[lang] || value.en || value.si || [];
      return Array.isArray(picked) ? picked.map(String).filter(Boolean) : [];
    }
    return [];
  };
  const debounce = (fn, delay = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
  const storage = {
    get(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignored */ } }
  };
  const state = {
    lang: storage.get('sl_lang', 'en') === 'si' ? 'si' : 'en',
    simple: storage.get('sl_simple', '0') === '1',
    industry: new URLSearchParams(location.search).get('industry') || storage.get('sl_industry', ''),
    query: new URLSearchParams(location.search).get('q') || '',
    category: new URLSearchParams(location.search).get('category') || '',
    view: storage.get(`sl_view_${PAGE}`, 'grid'),
    data: { settings: {}, copy: {}, pages: [], sections: [], industries: [], categories: [], offerings: [], nav: [], contacts: [], socials: [] },
    files: [],
    client: null,
  };

  const t = (row, field, fallback = '') => {
    if (!row) return fallback;
    const localized = row[`${field}_${state.lang}`];
    const english = row[`${field}_en`];
    const sinhala = row[`${field}_si`];
    return String(localized || english || sinhala || row[field] || fallback || '');
  };
  const c = (key, fallback = '') => {
    const row = state.data.copy[key];
    return row ? String(row[state.lang] || row.en || row.si || fallback) : fallback;
  };
  const setting = (key, fallback = {}) => state.data.settings[key] || fallback;
  const currentPage = () => state.data.pages.find((page) => page.slug === PAGE);
  const pageSections = () => {
    const page = currentPage();
    return page ? state.data.sections.filter((section) => section.page_id === page.id && section.is_visible !== false && section.status === 'published').sort((a, b) => (b.is_pinned - a.is_pinned) || a.sort_order - b.sort_order) : [];
  };
  const currentIndustry = () => state.data.industries.find((item) => item.slug === state.industry) || null;
  const categoryFor = (id) => state.data.categories.find((item) => item.id === id) || null;
  const pageFile = (slug) => slug === 'home' ? 'index.html' : `${slug}.html`;
  const activeFilename = () => PAGE === 'home' ? 'index.html' : `${PAGE}.html`;

  function icon(name = 'spark') {
    const paths = {
      home: '<path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      box: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
      route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M6 16V8a3 3 0 0 1 3-3h6"/>',
      workflow: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M10 6.5h4a3 3 0 0 1 3 3V14M6.5 10v4a3 3 0 0 0 3 3H14"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
      mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
      type: '<path d="M4 6V4h16v2M9 20h6M12 4v16"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      spark: '<path d="m12 3 1.6 4.7L18 9.5l-4.4 1.8L12 16l-1.6-4.7L6 9.5l4.4-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.9.7 2 2 0 0 1 1.7 2Z"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    };
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }

  function announce(message) {
    const live = $('#site-announcer');
    if (live) live.textContent = message;
  }
  function applyPreferences() {
    document.documentElement.lang = state.lang === 'si' ? 'si' : 'en';
    document.documentElement.classList.toggle('simple-mode', state.simple);
    const industry = currentIndustry();
    document.documentElement.style.setProperty('--industry-accent', industry?.accent_color || 'var(--accent)');
    document.documentElement.style.setProperty('--industry-surface', industry?.surface_color || 'var(--surface)');
  }

  async function loadData() {
    if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) throw new Error('Live content service unavailable');
    state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-client-info': 'source-labs-public/1.0' } }
    });
    const queries = [
      state.client.from('site_settings').select('key,value').eq('is_public', true),
      state.client.from('site_copy').select('key,en,si').eq('is_public', true),
      state.client.from('pages').select('*').eq('status', 'published').order('sort_order'),
      state.client.from('page_sections').select('*').eq('status', 'published').eq('is_visible', true).order('sort_order'),
      state.client.from('industries').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('sort_order'),
      state.client.from('categories').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('sort_order'),
      state.client.from('offerings').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('sort_order'),
      state.client.from('navigation_items').select('*').eq('is_active', true).order('sort_order'),
      state.client.from('contact_routes').select('*').eq('is_active', true).order('is_primary', { ascending: false }).order('sort_order'),
      state.client.from('social_links').select('*').eq('is_active', true).order('sort_order'),
    ];
    const results = await Promise.all(queries);
    const failed = results.find((result) => result.error);
    if (failed) throw failed.error;
    const [settings, copy, pages, sections, industries, categories, offerings, nav, contacts, socials] = results.map((result) => result.data || []);
    state.data.settings = Object.fromEntries(settings.map((row) => [row.key, row.value]));
    state.data.copy = Object.fromEntries(copy.map((row) => [row.key, row]));
    Object.assign(state.data, { pages, sections, industries, categories, offerings, nav, contacts, socials });
    if (state.industry && !currentIndustry()) state.industry = '';
  }

  function renderHeader() {
    const header = $('#site-header');
    if (!header) return;
    const navRows = state.data.nav.filter((item) => item.location === 'header');
    const nav = navRows.length ? navRows : [
      { label_en: 'Home', label_si: 'මුල් පිටුව', href: 'index.html', icon: 'home' },
      { label_en: 'Products', label_si: 'නිෂ්පාදන', href: 'products.html', icon: 'box' },
      { label_en: 'Services', label_si: 'සේවා', href: 'services.html', icon: 'route' },
      { label_en: 'How it works', label_si: 'ක්‍රියා කරන ආකාරය', href: 'about.html', icon: 'workflow' },
      { label_en: 'Talk to Source Labs', label_si: 'Source Labs සමඟ කතා කරන්න', href: 'contact.html', icon: 'message' },
    ];
    header.innerHTML = `<div class="shell header-inner">
      <a class="brand" href="index.html" aria-label="Source Labs home"><span class="brand-mark" aria-hidden="true"><i></i><b></b><em></em></span><span class="brand-type"><strong>SOURCE</strong><small>LABS</small></span></a>
      <nav class="site-nav" id="site-nav" aria-label="${state.lang === 'si' ? 'ප්‍රධාන සංචාලනය' : 'Primary navigation'}">
        ${nav.map((item, index) => {
          const href = safeHref(item.href);
          const active = href.endsWith(activeFilename()) || (PAGE === 'home' && /(^|\/)index\.html$/.test(href));
          const cta = index === nav.length - 1 ? ' nav-cta' : '';
          return `<a class="${cta}" href="${attr(href)}"${active ? ' aria-current="page"' : ''}${item.is_external ? ' target="_blank" rel="noopener"' : ''}>${esc(state.lang === 'si' ? item.label_si || item.label_en : item.label_en || item.label_si)}</a>`;
        }).join('')}
      </nav>
      <div class="header-tools">
        <button class="language-toggle" type="button" data-action="language" aria-label="Change language"><span aria-hidden="true">文</span><strong>${state.lang === 'si' ? 'EN' : 'සිං'}</strong></button>
        <button class="simple-toggle" type="button" data-action="simple" aria-pressed="${state.simple}">${icon('file')}<span>${state.simple ? c('action.standard_mode', 'Standard mode') : c('action.simple_mode', 'Simple mode')}</span></button>
        <button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" data-action="menu"><span></span><span class="sr-only">Menu</span></button>
      </div>
    </div>`;
  }

  function renderFooter() {
    const footer = $('#site-footer');
    if (!footer) return;
    const nav = state.data.nav.filter((item) => item.location === 'footer');
    const features = setting('features', {});
    footer.innerHTML = `<div class="shell">
      <div class="footer-grid">
        <div class="footer-brand"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true"><i></i><b></b><em></em></span><span class="brand-type"><strong>SOURCE</strong><small>LABS</small></span></a><p>${esc(c('footer.statement', 'Source Labs turns unclear requirements into usable specifications, sourcing options and practical next steps.'))}</p><p><strong>${esc(setting('brand', {}).line || 'Find it. Source it. Build with it.')}</strong></p></div>
        <div><p class="footer-title">${esc(state.lang === 'si' ? 'වෙබ් අඩවිය' : 'Website')}</p><div class="footer-links">${nav.map((item) => `<a href="${attr(safeHref(item.href))}">${esc(state.lang === 'si' ? item.label_si || item.label_en : item.label_en || item.label_si)}</a>`).join('') || '<a href="products.html">Products</a><a href="services.html">Services</a><a href="privacy.html">Privacy</a>'}</div></div>
        <div><p class="footer-title">${esc(state.lang === 'si' ? 'සම්බන්ධ වන්න' : 'Connect')}</p>${state.data.socials.length ? `<div class="social-row">${state.data.socials.map((item) => `<a href="${attr(item.url)}" target="_blank" rel="noopener" aria-label="${attr(item.label)}">${esc(item.label)}</a>`).join('')}</div>` : `<p>${esc(state.lang === 'si' ? 'අනුමත සමාජ සබැඳි පරිපාලකයා විසින් මෙහි එක් කළ හැක.' : 'Approved social profiles can be connected here from Admin.')}</p>`}${features.visitor_counter_public ? `<p class="visitor-count" id="visitor-count">${esc(c('label.visitor_count', 'Website visits'))}: <strong>—</strong></p>` : ''}</div>
      </div>
      <div class="footer-bottom"><span>${esc(c('footer.accuracy', 'No product, price, stock, certificate or delivery claim is final until checked for the specific request.'))}</span><span>© ${new Date().getFullYear()} Source Labs</span></div>
    </div>`;
    if (features.visitor_counter_public) loadCounter();
  }

  function renderPageHero(page, eyebrow = '') {
    const industry = currentIndustry();
    const industryName = industry ? t(industry, 'name') : '';
    return `<section class="page-hero"><div class="shell page-hero-grid"><div><p class="eyebrow">${esc(eyebrow || t(page, 'nav_label', page?.title_en || PAGE))}</p><h1 class="headline">${esc(t(page, 'title', page?.title_en || 'Source Labs'))}</h1><p class="lede">${esc(t(page, 'summary', page?.summary_en || ''))}</p></div>${industry ? `<div class="context-badge">${esc(state.lang === 'si' ? 'සන්දර්භය' : 'Context')}: ${esc(industryName)}</div>` : ''}</div></section>`;
  }

  function renderHome() {
    const root = $('#page-content');
    const sections = pageSections();
    if (!root) return;
    root.className = '';
    root.innerHTML = sections.map(renderSection).join('');
    bindHome();
  }

  function renderSection(section) {
    const type = section.section_type;
    const title = t(section, 'title');
    const body = t(section, 'body');
    const eyebrow = t(section, 'eyebrow');
    const cta = t(section, 'cta_label');
    const href = safeHref(section.cta_url);
    const cfg = section.config || {};
    if (type === 'hero') return `<section class="section hero" id="${attr(section.section_key)}"><div class="shell hero-grid"><div><p class="eyebrow">${esc(eyebrow)}</p><h1 class="display">${esc(title)}</h1><p class="lede">${esc(body)}</p><div class="hero-search"><input id="hero-search" type="search" value="${attr(state.query)}" placeholder="${attr(c('label.search_placeholder', 'Describe what you need, what it does, or what you call it'))}" aria-label="${attr(c('action.search', 'Search'))}"><button type="button" data-action="hero-search">${esc(c('action.search', 'Search'))}</button></div><div class="prompt-chips">${(cfg.quick_prompts || []).map((prompt) => `<button type="button" class="prompt-chip" data-prompt="${attr(prompt)}">${esc(prompt)}</button>`).join('')}</div><div class="button-row">${cta ? `<a class="button button-primary" href="${attr(href)}">${esc(cta)} ${icon('arrow')}</a>` : ''}<a class="button button-secondary" href="products.html">${esc(c('action.explore_products', 'Explore product paths'))}</a></div></div><div class="hero-panel"><div class="source-node"><span></span><label>${esc(setting('brand', {}).line || 'Find it. Source it. Build with it.')}</label></div></div></div></section>`;
    if (type === 'request-modes') {
      const items = Array.isArray(cfg.items) ? cfg.items : [];
      return `<section class="section section-accent" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p></div>${cta ? `<a class="button button-dark" href="${attr(href)}">${esc(cta)}</a>` : ''}</div><div class="cards cards-3">${items.map((item) => `<article class="card"><div class="icon-box">${icon(item.icon || 'spark')}</div><h3>${esc(item[state.lang] || item.en || item.si || '')}</h3></article>`).join('')}</div></div></section>`;
    }
    if (type === 'process') {
      const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
      return `<section class="section section-navy" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p></div>${cta ? `<a class="button button-secondary" href="${attr(href)}">${esc(cta)}</a>` : ''}</div><div class="cards cards-4 process-grid">${steps.map((step) => `<article class="card process-card"><span class="card-number">${esc(step.n || '')}</span><h3>${esc(step[state.lang] || step.en || step.si || step)}</h3></article>`).join('')}</div></div></section>`;
    }
    if (type === 'industries') return renderIndustrySection(section);
    if (type === 'supply-chain') {
      const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
      return `<section class="section section-dark" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p></div>${cta ? `<a class="button button-secondary" href="${attr(href)}">${esc(cta)}</a>` : ''}</div><div class="chain">${stages.map((stage, index) => `<div class="chain-step"><div class="chain-dot">${String(index + 1).padStart(2, '0')}</div><span>${esc(stage)}</span></div>`).join('')}</div></div></section>`;
    }
    if (type === 'paths') {
      const cards = Array.isArray(cfg.cards) ? cfg.cards : [];
      return `<section class="section" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p></div></div><div class="path-grid">${cards.map((card) => `<article class="path-card ${card.key === 'build' ? 'build' : 'trade'}"><p class="eyebrow">${esc(card.key === 'build' ? 'BUILD' : 'TRADE')}</p><h3>${esc(card.title)}</h3><p>${esc(card.text)}</p><a class="text-link" href="services.html?arm=${attr(card.key)}">${esc(state.lang === 'si' ? 'මාර්ගය බලන්න' : 'Explore this route')}</a></article>`).join('')}</div></div></section>`;
    }
    if (type === 'catalogue-preview') return renderPreviewSection(section);
    if (type === 'trust') {
      const points = Array.isArray(cfg.points) ? cfg.points : [];
      return `<section class="section section-dark" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p></div>${cta ? `<a class="button button-secondary" href="${attr(href)}">${esc(cta)}</a>` : ''}</div><div class="cards cards-4">${points.map((point, index) => `<article class="card"><div class="icon-box">${icon(index % 2 ? 'shield' : 'spark')}</div><h3>${esc(point)}</h3></article>`).join('')}</div></div></section>`;
    }
    if (type === 'cta') return `<section class="section section-accent" id="${attr(section.section_key)}"><div class="shell"><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p>${cta ? `<div class="button-row"><a class="button button-dark" href="${attr(href)}">${esc(cta)} ${icon('arrow')}</a></div>` : ''}</div></section>`;
    return `<section class="section" id="${attr(section.section_key)}"><div class="shell"><p class="eyebrow">${esc(eyebrow)}</p><h2 class="headline">${esc(title)}</h2><p class="lede">${esc(body)}</p>${cta ? `<div class="button-row"><a class="button button-dark" href="${attr(href)}">${esc(cta)}</a></div>` : ''}</div></section>`;
  }

  function renderIndustrySection(section) {
    const industries = state.data.industries;
    const active = currentIndustry() || industries[0];
    if (!active) return '';
    return `<section class="section" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="headline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p></div></div><div class="industry-shell"><div class="industry-list" role="tablist" aria-label="Industries">${industries.map((item) => `<button type="button" role="tab" aria-selected="${item.slug === active.slug}" class="industry-option ${item.slug === active.slug ? 'active' : ''}" data-industry="${attr(item.slug)}" style="--industry-accent:${attr(item.accent_color)}"><i></i>${esc(t(item, 'name'))}</button>`).join('')}</div><div class="industry-stage" id="industry-stage" style="--industry-accent:${attr(active.accent_color)};--industry-surface:${attr(active.surface_color)}"><span class="tag">${esc(t(active, 'name'))}</span><h3>${esc(t(active, 'hero', t(active, 'short')))}</h3><p>${esc(t(active, 'short'))}</p><div class="industry-links"><a class="button button-dark button-small" href="products.html?industry=${attr(active.slug)}">${esc(c('action.explore_products', 'Explore product paths'))}</a><a class="button button-secondary button-small" href="services.html?industry=${attr(active.slug)}">${esc(c('action.explore_services', 'Explore services'))}</a></div></div></div></div></section>`;
  }

  function renderPreviewSection(section) {
    const industry = state.industry;
    let products = state.data.offerings.filter((item) => item.kind === 'product');
    let services = state.data.offerings.filter((item) => item.kind === 'service');
    if (industry) {
      products = products.filter((item) => (item.industry_slugs || []).includes(industry) || !(item.industry_slugs || []).length);
      services = services.filter((item) => (item.industry_slugs || []).includes(industry) || !(item.industry_slugs || []).length);
    }
    const limit = Number(section.config?.featured_limit || 3);
    const picks = [...products.slice(0, Math.ceil(limit / 2)), ...services.slice(0, Math.floor(limit / 2))].slice(0, limit);
    return `<section class="section section-accent" id="${attr(section.section_key)}"><div class="shell"><div class="section-heading"><div><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="headline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p></div><a class="button button-dark" href="products.html">${esc(t(section, 'cta_label') || c('action.explore_products', 'Explore product paths'))}</a></div><div class="catalogue-grid">${picks.map(offeringCard).join('')}</div></div></section>`;
  }

  function catalogueSearchText(item) {
    const cat = categoryFor(item.category_id);
    return [item.name_en, item.name_si, item.short_en, item.short_si, item.description_en, item.description_si, item.code, cat?.name_en, cat?.name_si, ...(textList(item.aliases, 'en')), ...(textList(item.aliases, 'si')), ...(textList(item.aliases, 'local')), ...(textList(item.use_cases, 'en')), ...(textList(item.use_cases, 'si')), ...(item.industry_slugs || [])].join(' ').toLowerCase();
  }

  function filteredOfferings(kind) {
    const query = state.query.trim().toLowerCase();
    return state.data.offerings.filter((item) => item.kind === kind)
      .filter((item) => !state.category || categoryFor(item.category_id)?.slug === state.category)
      .filter((item) => !state.industry || (item.industry_slugs || []).includes(state.industry) || !(item.industry_slugs || []).length)
      .filter((item) => !query || catalogueSearchText(item).includes(query))
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order);
  }

  function offeringCard(item) {
    const cat = categoryFor(item.category_id);
    const badges = jsonArray(item.badges).slice(0, 3);
    const image = item.image_url ? ` style="background-image:url('${attr(item.image_url)}')"` : '';
    return `<article class="offering-card ${item.image_url ? 'has-image' : ''}" data-offering="${attr(item.id)}"><div class="offering-visual"${image}><span></span></div><div class="offering-body"><div class="offering-meta"><span>${esc(cat ? t(cat, 'name') : (item.kind === 'product' ? c('label.products', 'Products') : c('label.services', 'Services')))}</span><span>${esc(item.code || '')}</span></div><h3>${esc(t(item, 'name'))}</h3><p>${esc(t(item, 'short', t(item, 'description')))}</p>${badges.length ? `<div class="badges">${badges.map((badge) => `<span class="badge">${esc(typeof badge === 'string' ? badge : badge[state.lang] || badge.en || badge.si || '')}</span>`).join('')}</div>` : ''}<div class="offering-footer"><span class="accuracy-pill">${esc(c('label.not_stock_claim', 'Sourced per request'))}</span><button type="button" class="text-link" data-open-offering="${attr(item.id)}">${esc(c('action.view_details', 'View details'))}</button></div></div></article>`;
  }

  function renderCatalogue(kind) {
    const root = $('#page-content');
    const page = currentPage();
    if (!root || !page) return;
    root.className = '';
    const sections = pageSections();
    const intros = sections.filter((section) => section.section_type !== 'cta');
    const ctas = sections.filter((section) => section.section_type === 'cta');
    const categories = state.data.categories.filter((item) => item.kind === kind);
    const results = filteredOfferings(kind);
    const allCount = state.data.offerings.filter((item) => item.kind === kind).length;
    root.innerHTML = `${renderPageHero(page, kind === 'product' ? c('label.products', 'Products') : c('label.services', 'Services'))}
      ${intros.map((section) => section.section_type === 'notice' ? `<section class="section-tight"><div class="shell"><div class="notice"><div class="notice-icon">!</div><div><h3>${esc(t(section, 'title'))}</h3><p>${esc(t(section, 'body'))}</p></div></div></div></section>` : `<section class="section-tight"><div class="shell"><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="subheadline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p></div></section>`).join('')}
      <div class="catalogue-tools"><div class="shell"><div class="tool-row"><div class="search-box"><input id="catalogue-search" type="search" value="${attr(state.query)}" placeholder="${attr(c('label.search_placeholder', 'Describe what you need, what it does, or what you call it'))}"><button type="button" aria-label="Search">${icon('search')}</button></div><select class="select" id="industry-filter" aria-label="Industry"><option value="">${esc(c('label.industries', 'All industries'))}</option>${state.data.industries.map((item) => `<option value="${attr(item.slug)}" ${item.slug === state.industry ? 'selected' : ''}>${esc(t(item, 'name'))}</option>`).join('')}</select><div class="view-toggle" aria-label="View"><button type="button" data-view="grid" class="${state.view !== 'list' ? 'active' : ''}" aria-label="Grid view">${icon('grid')}</button><button type="button" data-view="list" class="${state.view === 'list' ? 'active' : ''}" aria-label="List view">${icon('list')}</button></div></div><div class="category-strip"><button type="button" class="category-chip ${!state.category ? 'active' : ''}" data-category="">${esc(c('label.all', 'All'))} · ${allCount}</button>${categories.map((cat) => { const count = state.data.offerings.filter((item) => item.kind === kind && item.category_id === cat.id).length; return `<button type="button" class="category-chip ${state.category === cat.slug ? 'active' : ''}" data-category="${attr(cat.slug)}">${esc(t(cat, 'name'))} · ${count}</button>`; }).join('')}</div></div></div>
      <section class="catalogue-section"><div class="shell"><div class="result-line"><span id="result-count">${results.length} ${esc(state.lang === 'si' ? 'ප්‍රතිඵල' : 'paths found')}</span><span>${esc(state.industry ? t(currentIndustry(), 'name') : c('label.request_first', 'Request-first, not catalogue-first'))}</span></div><div id="catalogue-grid" class="catalogue-grid ${state.view === 'list' ? 'list' : ''}">${results.length ? results.map(offeringCard).join('') : renderEmptyState(kind)}</div></div></section>${ctas.map(renderSection).join('')}`;
    bindCatalogue(kind);
  }

  function renderEmptyState(kind) {
    const params = new URLSearchParams({ type: 'identify', q: state.query || '', kind });
    return `<div class="empty-state" style="grid-column:1/-1"><h3>${esc(c('label.no_results', 'No exact match yet.'))}</h3><p>${esc(state.lang === 'si' ? 'විස්තරය හෝ ඡායාරූපය යවන්න. නිවැරදි මාර්ගය හඳුනාගැනීමට අපි උදව් කරමු.' : 'Send the description or photo. We will help identify the closest product or service path.')}</p><a class="button button-dark" href="contact.html?${params.toString()}">${esc(c('action.start_request', 'Start with what you know'))}</a></div>`;
  }

  function renderInformationPage() {
    const root = $('#page-content');
    const page = currentPage();
    if (!root || !page) return;
    root.className = '';
    const legal = PAGE === 'privacy' || PAGE === 'terms';
    root.innerHTML = `${renderPageHero(page)}<section class="section"><div class="shell ${legal ? 'legal-content' : ''}">${pageSections().map((section) => legal ? `<article class="legal-section"><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2>${esc(t(section, 'title'))}</h2><p>${esc(t(section, 'body'))}</p>${t(section, 'cta_label') ? `<a class="text-link" href="${attr(safeHref(section.cta_url))}">${esc(t(section, 'cta_label'))}</a>` : ''}</article>` : renderInfoSection(section)).join('')}</div></section>`;
  }

  function renderInfoSection(section) {
    const cfg = section.config || {};
    const type = section.section_type;
    if (type === 'process') {
      const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
      return `<article class="section-tight"><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="subheadline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p><div class="cards cards-4 process-grid" style="margin-top:30px">${steps.map((step) => `<div class="card process-card"><h3>${esc(typeof step === 'string' ? step : step[state.lang] || step.en || step.si || '')}</h3></div>`).join('')}</div></article>`;
    }
    if (type === 'trust') {
      const levels = Array.isArray(cfg.levels) ? cfg.levels : [];
      return `<article class="section-tight"><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="subheadline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p><div class="cards cards-3" style="margin-top:30px">${levels.map((level) => `<div class="card"><h3>${esc(level)}</h3></div>`).join('')}</div></article>`;
    }
    if (type === 'notice') return `<article class="section-tight"><div class="notice"><div class="notice-icon">!</div><div><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h3>${esc(t(section, 'title'))}</h3><p>${esc(t(section, 'body'))}</p>${t(section, 'cta_label') ? `<div class="button-row"><a class="button button-dark button-small" href="${attr(safeHref(section.cta_url))}">${esc(t(section, 'cta_label'))}</a></div>` : ''}</div></div></article>`;
    return `<article class="section-tight"><p class="eyebrow">${esc(t(section, 'eyebrow'))}</p><h2 class="subheadline">${esc(t(section, 'title'))}</h2><p class="lede">${esc(t(section, 'body'))}</p>${t(section, 'cta_label') ? `<div class="button-row"><a class="button button-dark" href="${attr(safeHref(section.cta_url))}">${esc(t(section, 'cta_label'))}</a></div>` : ''}</article>`;
  }

  function renderContact() {
    const root = $('#page-content');
    const page = currentPage();
    if (!root || !page) return;
    root.className = '';
    const sections = pageSections();
    const districts = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'];
    const typeParam = new URLSearchParams(location.search).get('type') || 'source';
    const q = new URLSearchParams(location.search).get('q') || '';
    const offering = state.data.offerings.find((item) => item.id === new URLSearchParams(location.search).get('offering'));
    const routes = state.data.contacts.filter((route) => !state.industry || !route.industry_slug || route.industry_slug === state.industry);
    root.innerHTML = `${renderPageHero(page)}<section class="section"><div class="shell contact-layout"><aside><p class="eyebrow">${esc(state.lang === 'si' ? 'යොමු මාර්ග' : 'Contact routes')}</p><h2 class="subheadline">${esc(state.lang === 'si' ? 'ඉල්ලීම නිවැරදි පුද්ගලයා වෙත යොමු කරමු' : 'We route the request to the right path')}</h2><p class="lede">${esc(sections[0] ? t(sections[0], 'body') : '')}</p><div class="route-list" style="margin-top:28px">${routes.length ? routes.map(routeCard).join('') : `<div class="route-card"><h3>${esc(state.lang === 'si' ? 'මධ්‍යගත ඉල්ලීම් පෝරමය' : 'Central request form')}</h3><p>${esc(state.lang === 'si' ? 'අනුමත කාණ්ඩ දුරකථන අංක සහ WhatsApp මාර්ග පරිපාලකයා එක් කළ විට මෙහි පෙන්වනු ඇත.' : 'Approved category phone and WhatsApp routes will appear here when configured by Admin.')}</p></div>`}</div></aside><div>${requestForm({ districts, typeParam, q, offering })}</div></div></section>`;
    bindRequestForm();
  }

  function routeCard(route) {
    const phone = route.phone_display || route.phone_e164;
    return `<article class="route-card"><h3>${esc(t(route, 'label'))}</h3><p>${esc(t(route, 'description'))}</p>${t(route, 'hours') ? `<p><small>${esc(t(route, 'hours'))}</small></p>` : ''}<div class="route-actions">${phone ? `<a data-track-route="phone" href="tel:${attr(route.phone_e164 || phone.replace(/\s/g,''))}">${icon('phone')} ${esc(phone)}</a>` : ''}${route.whatsapp_e164 ? `<a data-track-route="whatsapp" href="https://wa.me/${attr(route.whatsapp_e164.replace(/\D/g,''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${route.email ? `<a data-track-route="email" href="mailto:${attr(route.email)}">${icon('mail')} ${esc(route.email)}</a>` : ''}</div></article>`;
  }

  function requestForm({ districts, typeParam, q, offering }) {
    const selectedIndustry = state.industry || '';
    const requestTypes = [
      ['identify','Identify a product','නිෂ්පාදනයක් හඳුනාගැනීම'],['source','Find sourcing options','මූලාශ්‍ර විකල්ප සෙවීම'],['procure','Procurement support','මිලදී ගැනීමේ සහාය'],['build','Build a small business path','කුඩා ව්‍යාපාර මාර්ගයක් ගොඩනැගීම'],['package','Packaging support','ඇසුරුම්කරණ සහාය'],['launch','Launch support','දියත් කිරීමේ සහාය'],['export','Export readiness','අපනයන සූදානම'],['other','Other','වෙනත්']
    ];
    const prefill = q || (offering ? `${t(offering, 'name')} — ${t(offering, 'short')}` : '');
    return `<form id="request-form" class="request-form" enctype="multipart/form-data" novalidate><input type="text" name="website" autocomplete="off" tabindex="-1" class="sr-only"><input type="hidden" name="started_at" value="${Date.now()}"><input type="hidden" name="source_code" value="${attr(CONFIG.sourceCode || 'WEB-DIRECT')}"><input type="hidden" name="source_url" value="${attr(location.href)}"><input type="hidden" name="session_id" value="${attr(getSessionId())}"><input type="hidden" name="preferred_language" value="${attr(state.lang)}"><input type="hidden" name="offering_id" value="${attr(offering?.id || '')}"><input type="hidden" name="category_id" value="${attr(offering?.category_id || '')}"><div id="form-fields"><p class="eyebrow">${esc(c('form.title', 'Tell us what you need'))}</p><h2 class="subheadline">${esc(c('form.intro', 'A name, photo, voice note, sample, local term or intended use is enough to begin.'))}</h2><div class="form-grid" style="margin-top:25px"><div class="field"><label for="name">${esc(c('form.name', 'Your name'))}</label><input id="name" name="name" required maxlength="120" autocomplete="name"></div><div class="field"><label for="contact">${esc(c('form.contact', 'Phone or WhatsApp number'))}</label><input id="contact" name="contact" required maxlength="80" inputmode="tel" autocomplete="tel"></div><div class="field"><label for="email">${esc(c('form.email', 'Email (optional)'))}</label><input id="email" name="email" type="email" maxlength="180" autocomplete="email"></div><div class="field"><label for="district">${esc(c('form.district', 'District (optional)'))}</label><select id="district" name="district"><option value="">—</option>${districts.map((district) => `<option value="${attr(district)}">${esc(district)}</option>`).join('')}</select></div><div class="field"><label for="contact_method">${esc(state.lang === 'si' ? 'කැමති ප්‍රතිචාර මාර්ගය' : 'Preferred response')}</label><select id="contact_method" name="contact_method"><option value="whatsapp">WhatsApp</option><option value="phone">${esc(state.lang === 'si' ? 'දුරකථනය' : 'Phone')}</option><option value="email">Email</option></select></div><div class="field"><label for="request_type">${esc(c('form.request_type', 'What should we help with?'))}</label><select id="request_type" name="request_type">${requestTypes.map(([value,en,si]) => `<option value="${value}" ${value === typeParam ? 'selected' : ''}>${esc(state.lang === 'si' ? si : en)}</option>`).join('')}</select></div><div class="field"><label for="industry_slug">${esc(c('form.industry', 'Closest industry (optional)'))}</label><select id="industry_slug" name="industry_slug"><option value="">${esc(state.lang === 'si' ? 'තහවුරු නැත' : 'Not sure')}</option>${state.data.industries.map((industry) => `<option value="${attr(industry.slug)}" ${industry.slug === selectedIndustry ? 'selected' : ''}>${esc(t(industry, 'name'))}</option>`).join('')}</select></div><div class="field"><label for="quantity">${esc(c('form.quantity', 'Quantity or scale (optional)'))}</label><input id="quantity" name="quantity" maxlength="200" placeholder="e.g. sample, 100 units, monthly use"></div><div class="field full"><label for="description">${esc(c('form.description', 'Describe the product, problem or goal'))}</label><textarea id="description" name="description" required maxlength="6000" placeholder="${attr(c('label.search_placeholder', 'Describe what you need, what it does, or what you call it'))}">${esc(prefill)}</textarea></div><div class="field full"><label for="intended_use">${esc(c('form.intended_use', 'What will you use it for?'))}</label><textarea id="intended_use" name="intended_use" maxlength="1000" rows="3"></textarea></div><div class="field"><label for="timeline">${esc(c('form.timeline', 'Needed by (optional)'))}</label><input id="timeline" name="timeline" maxlength="200" placeholder="e.g. within 4 weeks"></div><div class="field full"><span class="field-label">${esc(c('form.files', 'Add up to 3 photos, PDFs or audio files'))}</span><div class="file-drop"><strong>${esc(state.lang === 'si' ? 'ගොනු තෝරන්න හෝ මෙහි දමන්න' : 'Choose files or drop them here')}</strong><div class="field-help">JPG, PNG, WebP, PDF or audio · ${Math.round((CONFIG.maxTotalBytes || 10485760)/1048576)} MB total</div><input id="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav"></div><div class="file-list" id="file-list"></div></div><div class="field full"><label class="checkbox"><input type="checkbox" name="consent" value="true" required><span>${esc(c('form.consent', 'I agree that Source Labs may use these details to respond to this request, subject to the privacy notice.'))} <a href="privacy.html" target="_blank">${esc(state.lang === 'si' ? 'රහස්‍යතා දැන්වීම' : 'Privacy notice')}</a></span></label></div></div><div class="form-status" id="form-status" role="status"></div><button class="button button-dark" type="submit">${esc(c('action.submit', 'Send request'))} ${icon('arrow')}</button></div></form>`;
  }

  function bindHeader() {
    $('[data-action="language"]')?.addEventListener('click', () => {
      state.lang = state.lang === 'en' ? 'si' : 'en';
      storage.set('sl_lang', state.lang);
      track('language_change', { selection: state.lang });
      applyPreferences();
      renderAll();
      announce(state.lang === 'si' ? 'සිංහල භාෂාව තෝරා ඇත' : 'English selected');
    });
    $('[data-action="simple"]')?.addEventListener('click', () => {
      state.simple = !state.simple;
      storage.set('sl_simple', state.simple ? '1' : '0');
      applyPreferences();
      renderHeader(); bindHeader();
      track('simple_mode', { mode: state.simple ? 'simple' : 'standard' });
      announce(state.simple ? c('action.simple_mode', 'Simple mode') : c('action.standard_mode', 'Standard mode'));
    });
    $('[data-action="menu"]')?.addEventListener('click', (event) => {
      const open = document.body.classList.toggle('menu-open');
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });
  }

  function bindHome() {
    const runSearch = () => {
      const value = $('#hero-search')?.value.trim() || '';
      location.href = `products.html${value ? `?q=${encodeURIComponent(value)}` : ''}`;
    };
    $('[data-action="hero-search"]')?.addEventListener('click', runSearch);
    $('#hero-search')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') runSearch(); });
    $$('.prompt-chip').forEach((button) => button.addEventListener('click', () => {
      const input = $('#hero-search'); if (input) { input.value = button.dataset.prompt || ''; input.focus(); }
    }));
    $$('.industry-option').forEach((button) => button.addEventListener('click', () => setIndustry(button.dataset.industry || '', true)));
    bindOfferingButtons();
  }

  function bindCatalogue(kind) {
    const input = $('#catalogue-search');
    input?.addEventListener('input', debounce(() => {
      state.query = input.value;
      updateCatalogueResults(kind);
      updateUrl();
      track('search', { query_length: state.query.length, results_count: filteredOfferings(kind).length });
    }, 220));
    $('#industry-filter')?.addEventListener('change', (event) => setIndustry(event.target.value || '', false, kind));
    $$('.category-chip').forEach((button) => button.addEventListener('click', () => {
      state.category = button.dataset.category || '';
      updateCatalogueResults(kind);
      $$('.category-chip').forEach((item) => item.classList.toggle('active', item === button));
      updateUrl();
    }));
    $$('.view-toggle button').forEach((button) => button.addEventListener('click', () => {
      state.view = button.dataset.view === 'list' ? 'list' : 'grid';
      storage.set(`sl_view_${PAGE}`, state.view);
      $('#catalogue-grid')?.classList.toggle('list', state.view === 'list');
      $$('.view-toggle button').forEach((item) => item.classList.toggle('active', item === button));
    }));
    bindOfferingButtons();
  }

  function updateCatalogueResults(kind) {
    const results = filteredOfferings(kind);
    const grid = $('#catalogue-grid');
    if (grid) grid.innerHTML = results.length ? results.map(offeringCard).join('') : renderEmptyState(kind);
    const count = $('#result-count');
    if (count) count.textContent = `${results.length} ${state.lang === 'si' ? 'ප්‍රතිඵල' : 'paths found'}`;
    bindOfferingButtons();
  }

  function bindOfferingButtons() {
    $$('[data-open-offering]').forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => openOffering(button.dataset.openOffering));
    });
  }

  function openOffering(id) {
    const item = state.data.offerings.find((offering) => offering.id === id);
    if (!item) return;
    const cat = categoryFor(item.category_id);
    const uses = textList(item.use_cases, state.lang);
    const questions = textList(item.key_questions, state.lang);
    const specs = jsonArray(item.specifications);
    const modalRoot = $('#modal-root');
    const params = new URLSearchParams({ type: item.kind === 'product' ? 'source' : 'other', offering: item.id, industry: state.industry || '' });
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><small>${esc(cat ? t(cat, 'name') : item.kind)}</small><h2 id="modal-title" style="margin:2px 0">${esc(t(item, 'name'))}</h2></div><button class="modal-close" type="button" aria-label="Close">×</button></div><div class="modal-content"><p class="lede" style="margin-top:0">${esc(t(item, 'description', t(item, 'short')))}</p><div class="detail-grid">${uses.length ? `<div><h3>${esc(state.lang === 'si' ? 'භාවිත' : 'Useful for')}</h3><ul class="detail-list">${uses.map((use) => `<li>${esc(use)}</li>`).join('')}</ul></div>` : ''}${questions.length ? `<div><h3>${esc(state.lang === 'si' ? 'අපි අසන ප්‍රධාන ප්‍රශ්න' : 'Key questions')}</h3><ul class="detail-list">${questions.map((question) => `<li>${esc(question)}</li>`).join('')}</ul></div>` : ''}${specs.length ? `<div><h3>${esc(state.lang === 'si' ? 'පිරිවිතර ක්ෂේත්‍ර' : 'Specification fields')}</h3><ul class="detail-list">${specs.slice(0, 8).map((spec) => `<li>${esc(typeof spec === 'string' ? spec : spec.label || spec.name || JSON.stringify(spec))}</li>`).join('')}</ul></div>` : ''}<div><h3>${esc(state.lang === 'si' ? 'වත්මන් තත්ත්වය' : 'Current status')}</h3><p>${esc(t(item, 'availability_note', c('label.not_stock_claim', 'Sourced per request')))}</p>${t(item, 'compliance_note') ? `<p>${esc(t(item, 'compliance_note'))}</p>` : ''}</div></div><div class="button-row"><a class="button button-dark" href="contact.html?${params.toString()}">${esc(t(item, 'cta_label', c('action.send_requirement', 'Send a requirement')))}</a><button class="button button-secondary modal-close-inline" type="button">${esc(c('action.close', 'Close'))}</button></div></div></div></div>`;
    modalRoot.querySelector('.modal-close')?.focus();
    const close = () => { modalRoot.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    modalRoot.querySelector('.modal-close')?.addEventListener('click', close);
    modalRoot.querySelector('.modal-close-inline')?.addEventListener('click', close);
    modalRoot.querySelector('.modal-backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) close(); });
    document.addEventListener('keydown', onKey);
    track('offering_open', { offering_kind: item.kind, offering_code: item.code, category_code: cat?.code || '' });
  }

  function setIndustry(slug, rerenderHome = false, catalogueKind = '') {
    state.industry = slug;
    storage.set('sl_industry', slug);
    applyPreferences();
    updateUrl();
    track('industry_select', { selection: slug || 'all' });
    if (rerenderHome || PAGE === 'home') renderHome();
    else if (catalogueKind) {
      const select = $('#industry-filter'); if (select) select.value = slug;
      updateCatalogueResults(catalogueKind);
    }
  }

  function updateUrl() {
    const url = new URL(location.href);
    if (state.query) url.searchParams.set('q', state.query); else url.searchParams.delete('q');
    if (state.category) url.searchParams.set('category', state.category); else url.searchParams.delete('category');
    if (state.industry) url.searchParams.set('industry', state.industry); else url.searchParams.delete('industry');
    history.replaceState({}, '', url);
  }

  function bindRequestForm() {
    const input = $('#files');
    input?.addEventListener('change', async () => {
      const selected = Array.from(input.files || []).slice(0, CONFIG.maxFiles || 3);
      state.files = [];
      let total = 0;
      for (const file of selected) {
        const optimized = file.type.startsWith('image/') ? await optimizeImage(file) : file;
        total += optimized.size;
        state.files.push(optimized);
      }
      if (total > (CONFIG.maxTotalBytes || 10 * 1024 * 1024)) {
        state.files = [];
        showFormStatus(state.lang === 'si' ? 'ගොනු වල සමස්ත ප්‍රමාණය වැඩිය.' : 'The selected files exceed the total size limit.', true);
      }
      renderFileList();
      track('file_selected', { file_type_group: selected.some((file) => file.type.startsWith('image/')) ? 'image' : 'document', file_size_band: total > 5e6 ? '5-10mb' : total > 1e6 ? '1-5mb' : '<1mb' });
    });
    const form = $('#request-form');
    form?.addEventListener('input', onceFormStart, { once: true });
    form?.addEventListener('submit', submitRequest);
    $$('[data-track-route]').forEach((link) => link.addEventListener('click', () => track('contact_route_click', { route_scope: link.dataset.trackRoute })));
    track('request_form_open', { page_type: PAGE });
  }

  function onceFormStart() { track('form_start', { page_type: PAGE }); }
  function renderFileList() {
    const list = $('#file-list');
    if (!list) return;
    list.innerHTML = state.files.map((file, index) => `<div class="file-item"><span>${esc(file.name)} · ${formatBytes(file.size)}</span><button type="button" data-remove-file="${index}" aria-label="Remove">×</button></div>`).join('');
    $$('[data-remove-file]', list).forEach((button) => button.addEventListener('click', () => { state.files.splice(Number(button.dataset.removeFile), 1); renderFileList(); }));
  }
  function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

  async function optimizeImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const max = CONFIG.imageMaxDimension || 1600;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', CONFIG.imageQuality || .82));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: Date.now() });
    } catch { return file; }
  }

  async function submitRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = state.lang === 'si' ? 'යවමින්…' : 'Sending…';
    showFormStatus(state.lang === 'si' ? 'ආරක්ෂිතව ඉල්ලීම යවමින්…' : 'Sending your request securely…');
    state.files.forEach((file) => formData.append('files', file, file.name));
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/submit-enquiry`, { method: 'POST', headers: { apikey: CONFIG.supabaseKey }, body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Request failed');
      $('#form-fields').innerHTML = `<div class="success-panel"><p class="eyebrow">${esc(c('form.success', 'Request received'))}</p><h2>${esc(state.lang === 'si' ? 'ඔබේ ඉල්ලීම ආරක්ෂිතව සුරකින ලදී' : 'Your request has been saved securely')}</h2><div class="request-code">${esc(result.request_code || '')}</div><p>${esc(c('form.success_note', 'Keep this request code. A Source Labs representative can use it to continue the conversation.'))}</p><a class="button button-dark" href="index.html">${esc(c('nav.home', 'Home'))}</a></div>`;
      state.files = [];
      announce(c('form.success', 'Request received'));
    } catch (error) {
      showFormStatus(error.message || (state.lang === 'si' ? 'ඉල්ලීම යැවිය නොහැකි විය.' : 'The request could not be sent.'), true);
      button.disabled = false;
      button.innerHTML = `${esc(c('action.submit', 'Send request'))} ${icon('arrow')}`;
    }
  }
  function showFormStatus(message, isError = false) { const status = $('#form-status'); if (status) { status.textContent = message; status.className = `form-status ${isError ? 'error' : ''}`; } }

  function updateSEO() {
    const page = currentPage();
    if (!page) return;
    const title = t(page, 'seo_title', t(page, 'title')) || document.title;
    const description = t(page, 'seo_description', t(page, 'summary')) || setting('seo', {}).default_description || '';
    document.title = title;
    $('meta[name="description"]')?.setAttribute('content', description);
    $('meta[property="og:title"]')?.setAttribute('content', title);
    $('meta[property="og:description"]')?.setAttribute('content', description);
    const canonicalPath = page.canonical_path || (PAGE === 'home' ? '/' : `/${PAGE}.html`);
    const canonical = new URL(canonicalPath.replace(/^\//, ''), BASE).href;
    $('link[rel="canonical"]')?.setAttribute('href', canonical);
    $('meta[property="og:url"]')?.setAttribute('content', canonical);
    const existing = $('#organization-schema'); if (existing) existing.remove();
    const schema = document.createElement('script'); schema.id = 'organization-schema'; schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Source Labs', url: BASE, description: setting('brand', {}).position || description, slogan: setting('brand', {}).line || 'Find it. Source it. Build with it.' });
    document.head.appendChild(schema);
  }

  function getVisitorId() {
    let id = storage.get('sl_visitor_id');
    if (!id) { id = crypto.randomUUID(); storage.set('sl_visitor_id', id); }
    return id;
  }
  function getSessionId() {
    try {
      let id = sessionStorage.getItem('sl_session_id');
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('sl_session_id', id); }
      return id;
    } catch { return crypto.randomUUID(); }
  }
  async function track(eventName, metadata = {}) {
    if (navigator.doNotTrack === '1' && setting('analytics', {}).respect_do_not_track !== false) return;
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
    try {
      await fetch(`${CONFIG.supabaseUrl}/functions/v1/track-visit`, {
        method: 'POST', keepalive: true,
        headers: { 'content-type': 'application/json', apikey: CONFIG.supabaseKey },
        body: JSON.stringify({ event_name: eventName, visitor_id: getVisitorId(), session_id: getSessionId(), page_path: location.pathname, industry_slug: state.industry || '', language: state.lang, referrer_host: (() => { try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch { return ''; } })(), metadata })
      });
    } catch { /* analytics must never interrupt the experience */ }
  }
  async function loadCounter() {
    const element = $('#visitor-count strong');
    if (!element) return;
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/track-visit`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CONFIG.supabaseKey }, body: JSON.stringify({ event_name: 'counter' }) });
      const result = await response.json();
      element.textContent = Number(result.total_views || 0).toLocaleString(state.lang === 'si' ? 'si-LK' : 'en-LK');
    } catch { element.textContent = '—'; }
  }

  function renderAll() {
    applyPreferences();
    renderHeader();
    renderFooter();
    updateSEO();
    if (PAGE === 'home') renderHome();
    else if (PAGE === 'products') renderCatalogue('product');
    else if (PAGE === 'services') renderCatalogue('service');
    else if (PAGE === 'contact') renderContact();
    else renderInformationPage();
    bindHeader();
  }

  async function boot() {
    applyPreferences();
    try {
      await loadData();
      renderAll();
      track('page_view', { page_type: PAGE });
      let sent25 = false, sent75 = false;
      window.addEventListener('scroll', debounce(() => {
        const doc = document.documentElement;
        const percent = Math.round((doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight)) * 100);
        if (!sent25 && percent >= 25) { sent25 = true; track('scroll_depth', { percent_scrolled: 25 }); }
        if (!sent75 && percent >= 75) { sent75 = true; track('scroll_depth', { percent_scrolled: 75 }); }
      }, 250), { passive: true });
    } catch (error) {
      console.error('[Source Labs] Live CMS load failed:', error);
      applyPreferences();
      const header = $('#site-header');
      if (header) header.querySelector('.header-inner')?.insertAdjacentHTML('beforeend', `<button class="language-toggle" type="button" onclick="document.documentElement.classList.toggle('simple-mode')">Simple mode</button>`);
      announce(c('label.error', 'We could not load live content. Please refresh or use the request form.'));
    }
  }

  boot();
})();
