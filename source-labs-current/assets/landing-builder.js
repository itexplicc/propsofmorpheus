(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const safeHref = (value = '') => { const raw = String(value || '').trim(); if (!raw) return '#'; if (/^javascript:/i.test(raw)) return '#'; return raw; };
  const slug = new URLSearchParams(location.search).get('slug') || '';
  const state = { client:null, page:null, sections:[], pages:[], categories:[], offerings:[], lang:localStorage.getItem('sl_landing_lang') === 'si' ? 'si' : 'en', simple:localStorage.getItem('sl_landing_simple') === '1' };
  const local = (row, field, fallback = '') => row ? String(row[`${field}_${state.lang}`] || row[`${field}_en`] || row[`${field}_si`] || row[field] || fallback || '') : fallback;
  const jsonArray = (value) => Array.isArray(value) ? value : (() => { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })();

  function api() {
    if (!state.client && window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}, global:{headers:{'x-client-info':'source-labs-landing/1.0'}} });
    }
    return state.client;
  }

  async function boot() {
    bindUtilities(); applyPreferences();
    if (!slug) return renderNotFound('No landing-page slug was supplied.');
    const client = api(); if (!client) return renderNotFound('Live content is temporarily unavailable.');
    const [page, pages, categories, offerings] = await Promise.all([
      client.from('landing_pages').select('*').eq('slug', slug).eq('status','published').maybeSingle(),
      client.from('landing_pages').select('*').eq('status','published').order('is_pinned',{ascending:false}).order('sort_order'),
      client.from('categories').select('*').eq('status','published').order('sort_order'),
      client.from('offerings').select('*').eq('status','published').order('is_pinned',{ascending:false}).order('sort_order')
    ]);
    if (page.error || !page.data) return renderNotFound(page.error?.message || 'This page is not published.');
    if (pages.error || categories.error || offerings.error) return renderNotFound('Related content could not be loaded.');
    state.page = page.data; state.pages = pages.data || []; state.categories = categories.data || []; state.offerings = offerings.data || [];
    const sections = await client.from('landing_sections').select('*').eq('landing_page_id', state.page.id).eq('status','published').eq('is_visible',true).order('is_pinned',{ascending:false}).order('sort_order');
    if (sections.error) return renderNotFound(sections.error.message);
    state.sections = sections.data || [];
    applyTheme(); updateSEO(); render();
  }

  function bindUtilities() {
    $('#lb-language')?.addEventListener('click', () => { state.lang = state.lang === 'en' ? 'si' : 'en'; localStorage.setItem('sl_landing_lang', state.lang); applyPreferences(); if (state.page) { updateSEO(); render(); } });
    $('#lb-simple')?.addEventListener('click', () => { state.simple = !state.simple; localStorage.setItem('sl_landing_simple', state.simple ? '1' : '0'); applyPreferences(); });
    $('#lb-menu')?.addEventListener('click', () => $('.lb-header')?.classList.toggle('mobile-open'));
  }

  function applyPreferences() {
    document.documentElement.lang = state.lang === 'si' ? 'si' : 'en';
    document.documentElement.classList.toggle('lb-simple', state.simple);
    const language = $('#lb-language'); if (language) language.textContent = state.lang === 'si' ? 'EN' : 'සිං';
    const simple = $('#lb-simple'); if (simple) simple.textContent = state.simple ? 'Standard mode' : 'Simple mode';
  }

  function applyTheme() {
    const theme = state.page.theme || {};
    document.documentElement.style.setProperty('--page-accent', theme.accent || '#35c7b8');
    if (theme.paper) document.documentElement.style.setProperty('--lb-paper', theme.paper);
    if (theme.ink) document.documentElement.style.setProperty('--lb-ink', theme.ink);
    if (theme.navy) document.documentElement.style.setProperty('--lb-navy', theme.navy);
    if (theme.radius) document.documentElement.style.setProperty('--lb-radius', `${Number(theme.radius)}px`);
  }

  function updateSEO() {
    const page = state.page;
    const title = local(page,'seo_title',local(page,'title','Source Labs'));
    const description = local(page,'seo_description',local(page,'summary',local(page,'body','')));
    document.title = title;
    $('meta[name="description"]')?.setAttribute('content',description);
    $('meta[property="og:title"]')?.setAttribute('content',title);
    $('meta[property="og:description"]')?.setAttribute('content',description);
    const canonical = new URL(`landing.html?slug=${encodeURIComponent(page.slug)}`, CONFIG.publicBaseUrl || location.href).href;
    $('link[rel="canonical"]')?.setAttribute('href',canonical);
    if (page.og_image_url) { let meta = $('meta[property="og:image"]'); if (!meta) { meta=document.createElement('meta'); meta.setAttribute('property','og:image'); document.head.appendChild(meta); } meta.setAttribute('content',page.og_image_url); }
    $('meta[name="robots"]')?.setAttribute('content',page.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
  }

  function render() {
    const root = $('#landing-content'); const page = state.page;
    const parent = page.parent_page_id ? state.pages.find((item) => item.id === page.parent_page_id) : null;
    const category = page.category_id ? state.categories.find((item) => item.id === page.category_id) : null;
    const breadcrumbs = page.show_breadcrumbs ? `<div class="lb-breadcrumbs"><a href="index.html">Source Labs</a><span>›</span>${category ? `<a href="category.html?slug=${encodeURIComponent(category.slug)}">${esc(local(category,'name'))}</a><span>›</span>` : ''}${parent ? `<a href="landing.html?slug=${encodeURIComponent(parent.slug)}">${esc(local(parent,'title'))}</a><span>›</span>` : ''}<span>${esc(local(page,'title'))}</span></div>` : '';
    const heroImage = page.hero_image_url ? `<div class="lb-hero-image"><img src="${attr(page.hero_image_url)}" alt="${attr(local(page,'hero_media_alt',local(page,'title')))}"></div>` : '';
    const hero = `<section class="lb-hero"><div class="lb-shell lb-hero-grid"><div>${breadcrumbs}<p class="lb-eyebrow">${esc(local(page,'eyebrow',page.page_type.replace(/_/g,' ')))}</p><h1>${esc(local(page,'title'))}</h1><p>${esc(local(page,'summary',local(page,'body')))}</p><div class="lb-actions">${page.cta_label_en || page.cta_label_si ? `<a class="lb-button lb-button-primary" href="${attr(safeHref(local(page,'cta_url',page.cta_url || 'contact.html')))}">${esc(local(page,'cta_label','Talk to Source Labs'))}</a>` : ''}${page.show_contact ? `<a class="lb-button lb-button-secondary" href="contact.html?landing=${encodeURIComponent(page.slug)}">Send a requirement</a>` : ''}</div></div>${heroImage}</div></section>`;
    const sections = state.sections.length ? state.sections.map((section,index) => renderSection(section,index)).join('') : renderDefaultSections();
    root.innerHTML = hero + sections;
    bindOfferingModals();
  }

  function renderDefaultSections() {
    const page = state.page;
    const children = state.pages.filter((item) => item.parent_page_id === page.id);
    const categoryOfferings = page.category_id ? state.offerings.filter((item) => item.category_id === page.category_id) : [];
    return `${page.body_en || page.body_si ? `<section class="lb-section"><div class="lb-shell lb-rich"><div class="lb-section-head"><h2>${esc(local(page,'title'))}</h2></div><p>${esc(local(page,'body'))}</p></div></section>` : ''}${children.length ? renderPageCards(children,'Explore related types') : ''}${categoryOfferings.length ? renderOfferingCards(categoryOfferings,'Related products and services') : ''}${page.show_contact ? renderCTA({title_en:'Not sure which option fits?',title_si:'ඔබට ගැළපෙන විකල්පය පැහැදිලි නැද්ද?',body_en:'Send the name, photo, description, sample or intended use. Source Labs will help identify the right path.',body_si:'නම, ඡායාරූපය, විස්තරය, නියැදිය හෝ භාවිතය යවන්න.',cta_label_en:'Start a request',cta_label_si:'ඉල්ලීමක් අරඹන්න',cta_url:`contact.html?landing=${encodeURIComponent(page.slug)}`}) : ''}`;
  }

  function renderSection(section,index) {
    const type = section.section_type;
    const cls = `lb-section ${index % 2 ? 'lb-alt' : ''}`;
    const title = local(section,'title'); const body = local(section,'body'); const eyebrow = local(section,'eyebrow');
    const head = title || body ? `<div class="lb-section-head">${eyebrow ? `<p class="lb-eyebrow">${esc(eyebrow)}</p>` : ''}${title ? `<h2>${esc(title)}</h2>` : ''}${body ? `<p>${esc(body)}</p>` : ''}</div>` : '';
    if (type === 'rich_text') return `<section class="${cls}"><div class="lb-shell lb-rich">${head}${section.cta_url ? `<a class="lb-button lb-button-primary" href="${attr(safeHref(section.cta_url))}">${esc(local(section,'cta_label','Learn more'))}</a>` : ''}</div></section>`;
    if (type === 'image_text') return `<section class="${cls}"><div class="lb-shell lb-image-text ${section.config?.reverse ? 'reverse' : ''}"><div>${head}${section.cta_url ? `<a class="lb-button lb-button-primary" href="${attr(safeHref(section.cta_url))}">${esc(local(section,'cta_label','Learn more'))}</a>` : ''}</div><div class="lb-section-media">${section.image_url ? `<img src="${attr(section.image_url)}" alt="${attr(local(section,'image_alt',title))}">` : ''}</div></div></section>`;
    if (type === 'features' || type === 'testimonials') { const items=jsonArray(section.config?.items); return `<section class="${cls}"><div class="lb-shell">${head}<div class="lb-feature-grid">${items.map((item,i) => `<article class="lb-feature"><div class="lb-feature-icon">${esc(item.icon || String(i+1).padStart(2,'0'))}</div><h3>${esc(item[`title_${state.lang}`] || item.title_en || item.title_si || item.title || '')}</h3><p>${esc(item[`body_${state.lang}`] || item.body_en || item.body_si || item.body || '')}</p></article>`).join('')}</div></div></section>`; }
    if (type === 'gallery') { const gallery=jsonArray(section.gallery); return `<section class="${cls}"><div class="lb-shell">${head}<div class="lb-gallery">${gallery.map((item) => { const url=typeof item==='string'?item:item.url||item.public_url; const caption=typeof item==='object'?(item[`caption_${state.lang}`]||item.caption_en||item.caption_si||item.caption||''):''; return url ? `<figure><img src="${attr(url)}" alt="${attr(caption)}">${caption?`<figcaption>${esc(caption)}</figcaption>`:''}</figure>`:''; }).join('')}</div></div></section>`; }
    if (type === 'faq') { const items=jsonArray(section.config?.items); return `<section class="${cls}"><div class="lb-shell">${head}<div class="lb-faq-grid">${items.map((item) => `<article class="lb-faq"><h3>${esc(item[`question_${state.lang}`] || item.question_en || item.question_si || item.question || '')}</h3><p>${esc(item[`answer_${state.lang}`] || item.answer_en || item.answer_si || item.answer || '')}</p></article>`).join('')}</div></div></section>`; }
    if (type === 'process') { const steps=jsonArray(section.config?.steps); return `<section class="${cls}"><div class="lb-shell">${head}<div class="lb-process-grid">${steps.map((step,i) => `<article class="lb-process"><b>${String(i+1).padStart(2,'0')}</b><h3>${esc(step[`title_${state.lang}`] || step.title_en || step.title_si || step.title || step)}</h3><p>${esc(step[`body_${state.lang}`] || step.body_en || step.body_si || step.body || '')}</p></article>`).join('')}</div></div></section>`; }
    if (type === 'offerings') { const items = selectOfferings(section.config || {}); return renderOfferingCards(items,title || 'Related paths',body,cls); }
    if (type === 'categories') { const items = selectPages(section.config || {}); return renderPageCards(items,title || 'Explore related types',body,cls); }
    if (type === 'cta') return renderCTA(section);
    if (type === 'notice') return `<section class="${cls}"><div class="lb-shell"><div class="lb-notice">${head}${section.cta_url ? `<a class="lb-button lb-button-primary" href="${attr(safeHref(section.cta_url))}">${esc(local(section,'cta_label','Open'))}</a>` : ''}</div></div></section>`;
    return `<section class="${cls}"><div class="lb-shell">${head}</div></section>`;
  }

  function selectOfferings(config) {
    let items = [...state.offerings];
    const ids = jsonArray(config.offering_ids); if (ids.length) items = items.filter((item) => ids.includes(item.id));
    else if (config.category_id || state.page.category_id) items = items.filter((item) => item.category_id === (config.category_id || state.page.category_id));
    if (config.kind) items = items.filter((item) => item.kind === config.kind);
    if (config.industry_slug) items = items.filter((item) => (item.industry_slugs || []).includes(config.industry_slug));
    return items.slice(0,Math.max(1,Number(config.limit || 12)));
  }

  function selectPages(config) {
    const ids = jsonArray(config.page_ids);
    let items = ids.length ? state.pages.filter((item) => ids.includes(item.id)) : state.pages.filter((item) => item.parent_page_id === state.page.id);
    if (config.page_type) items = items.filter((item) => item.page_type === config.page_type);
    return items.slice(0,Math.max(1,Number(config.limit || 12)));
  }

  function renderOfferingCards(items,title,body='',sectionClass='lb-section') {
    if (!items.length) return '';
    return `<section class="${sectionClass}"><div class="lb-shell"><div class="lb-section-head"><p class="lb-eyebrow">Source Labs paths</p><h2>${esc(title)}</h2>${body?`<p>${esc(body)}</p>`:''}</div><div class="lb-card-grid">${items.map((item) => { const category=state.categories.find((cat)=>cat.id===item.category_id); return `<article class="lb-card">${item.image_url?`<img src="${attr(item.image_url)}" alt="${attr(local(item,'name'))}">`:''}<div class="lb-card-meta"><span>${esc(category?local(category,'name'):niceKind(item.kind))}</span><span>${esc(item.code||'')}</span></div><h3>${esc(local(item,'name'))}</h3><p>${esc(local(item,'short',local(item,'description')))}</p><button type="button" class="lb-button lb-button-primary" data-lb-offering="${item.id}">View details</button></article>`; }).join('')}</div></div></section>`;
  }

  function renderPageCards(items,title,body='',sectionClass='lb-section lb-alt') {
    if (!items.length) return '';
    return `<section class="${sectionClass}"><div class="lb-shell"><div class="lb-section-head"><p class="lb-eyebrow">Explore by type</p><h2>${esc(title)}</h2>${body?`<p>${esc(body)}</p>`:''}</div><div class="lb-card-grid">${items.map((item) => `<article class="lb-card">${item.hero_image_url?`<img src="${attr(item.hero_image_url)}" alt="${attr(local(item,'title'))}">`:''}<div class="lb-card-meta"><span>${esc(item.page_type.replace(/_/g,' '))}</span></div><h3>${esc(local(item,'title'))}</h3><p>${esc(local(item,'summary',local(item,'body')))}</p><a href="landing.html?slug=${encodeURIComponent(item.slug)}">Explore this type →</a></article>`).join('')}</div></div></section>`;
  }

  function renderCTA(row) {
    return `<section class="lb-cta-section"><div class="lb-shell"><p class="lb-eyebrow">Source Labs</p><h2>${esc(local(row,'title','Ready to discuss the requirement?'))}</h2><p>${esc(local(row,'body','Start with what you know. A name, photo, description, sample or intended use is enough.'))}</p><div class="lb-actions"><a class="lb-button lb-button-primary" href="${attr(safeHref(row.cta_url || 'contact.html'))}">${esc(local(row,'cta_label','Talk to Source Labs'))}</a></div></div></section>`;
  }

  function niceKind(value='') { return String(value).replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase()); }

  function bindOfferingModals() {
    $$('[data-lb-offering]').forEach((button) => button.addEventListener('click', () => openOffering(button.dataset.lbOffering)));
  }

  function openOffering(id) {
    const item=state.offerings.find((row)=>row.id===id); if(!item)return;
    const root=$('#lb-modal-root'); const specs=jsonArray(item.specifications);
    const specLabel=(spec)=>typeof spec==='string'?spec:spec[`label_${state.lang}`]||spec.label_en||spec.label_si||spec.label||spec.name||spec.key||'';
    root.innerHTML=`<div style="position:fixed;inset:0;background:rgba(4,17,29,.72);backdrop-filter:blur(7px);z-index:300;display:grid;place-items:center;padding:12px"><div style="width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px"><div style="display:flex;justify-content:space-between;align-items:center;padding:17px 20px;border-bottom:1px solid #dfe6e8"><h2 style="margin:0;font-size:1.3rem">${esc(local(item,'name'))}</h2><button id="lb-modal-close" style="width:40px;height:40px;border:0;border-radius:10px">×</button></div><div style="padding:22px"><p>${esc(local(item,'description',local(item,'short')))}</p>${specs.length?`<h3>Specification fields</h3><ul>${specs.map((spec)=>`<li>${esc(specLabel(spec))}</li>`).join('')}</ul>`:''}<div class="lb-actions"><a class="lb-button lb-button-primary" href="contact.html?offering=${encodeURIComponent(item.id)}">Send a requirement</a></div></div></div></div>`;
    $('#lb-modal-close')?.addEventListener('click',()=>root.innerHTML='');
  }

  function renderNotFound(message) {
    $('#landing-content').innerHTML=`<div class="lb-empty"><div><p class="lb-eyebrow">Source Labs</p><h1>Page not available</h1><p>${esc(message)}</p><a class="lb-button lb-button-primary" href="products.html">Explore products</a></div></div>`;
  }

  boot().catch((error)=>renderNotFound(error.message||'Page failed to load.'));
})();
