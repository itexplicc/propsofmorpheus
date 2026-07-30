(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const PAGE = document.body?.dataset.page || 'home';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const lang = () => {
    try { return localStorage.getItem('sl_lang') === 'si' ? 'si' : 'en'; } catch { return 'en'; }
  };
  const text = (row, field, fallback = '') => {
    if (!row) return fallback;
    const current = lang();
    return String(row[`${field}_${current}`] || row[`${field}_en`] || row[`${field}_si`] || row[field] || fallback || '');
  };
  const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'object') return [];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return String(value).split(/\n|,/).map((item) => item.trim()).filter(Boolean); }
  };
  const localizedItem = (item) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    const current = lang();
    return String(item[`label_${current}`] || item[current] || item.label_en || item.en || item.label_si || item.si || item.label || item.name || item.key || '');
  };
  const intersection = (a = [], b = []) => a.some((value) => b.includes(value));
  const state = { client: null, categories: [], offerings: [], landings: [], industries: [], contacts: [] };

  function ensureMobileMenu() {
    if (!document.body) return;
    let backdrop = $('.v3-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'v3-menu-backdrop';
      backdrop.setAttribute('aria-label', 'Close menu');
      document.body.appendChild(backdrop);
    }
    const close = () => {
      document.body.classList.remove('menu-open');
      $('[data-action="menu"]')?.setAttribute('aria-expanded', 'false');
    };
    backdrop.onclick = close;
    $$('a', $('#site-nav') || document).forEach((link) => link.addEventListener('click', close, { once: true }));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); }, { once: true });
  }

  function repairSpecificationLabels(root = document) {
    $$('.detail-list li', root).forEach((item) => {
      const raw = item.textContent.trim();
      if (!raw.startsWith('{') && !raw.startsWith('[')) return;
      try {
        const parsed = JSON.parse(raw);
        const label = Array.isArray(parsed) ? parsed.map(localizedItem).filter(Boolean).join(', ') : localizedItem(parsed);
        if (label) item.textContent = label;
      } catch { /* keep original text when it is not JSON */ }
    });
  }

  async function loadData() {
    if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) throw new Error('Live content service unavailable.');
    state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-client-info': 'source-labs-category-v3/1.0' } }
    });
    const [categories, offerings, landings, industries, contacts] = await Promise.all([
      state.client.from('categories').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('sort_order'),
      state.client.from('offerings').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('is_featured', { ascending: false }).order('sort_order'),
      state.client.from('category_landings').select('*').eq('status', 'published').order('sort_order'),
      state.client.from('industries').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('sort_order'),
      state.client.from('contact_routes').select('*').eq('is_active', true).order('is_primary', { ascending: false }).order('sort_order')
    ]);
    const failed = [categories, offerings, landings, industries, contacts].find((result) => result.error);
    if (failed) throw failed.error;
    state.categories = categories.data || [];
    state.offerings = offerings.data || [];
    state.landings = landings.data || [];
    state.industries = industries.data || [];
    state.contacts = contacts.data || [];
  }

  function categorySearchText(category, matches) {
    return [category.name_en, category.name_si, category.summary_en, category.summary_si, category.description_en, category.description_si, category.code, ...parseArray(category.aliases), ...matches.flatMap((item) => [item.name_en, item.name_si, item.short_en, item.short_si, ...parseArray(item.aliases)])].join(' ').toLowerCase();
  }

  function categoryImage(category, landing) {
    return landing?.hero_image_url || category.image_url || '';
  }

  function categoryCard(category, kind, query = '') {
    const landing = state.landings.find((item) => item.category_id === category.id);
    const items = state.offerings.filter((item) => item.kind === kind && item.category_id === category.id);
    const image = categoryImage(category, landing);
    const matchCount = query ? items.filter((item) => [item.name_en, item.name_si, item.short_en, item.short_si, item.description_en, item.description_si, ...parseArray(item.aliases)].join(' ').toLowerCase().includes(query)).length : items.length;
    const href = `category.html?slug=${encodeURIComponent(category.slug)}`;
    return `<article class="v3-category-card ${image ? 'has-image' : ''}">
      <a class="v3-category-image" href="${attr(href)}" aria-label="${attr(text(category, 'name'))}">
        ${image ? `<img src="${attr(image)}" alt="${attr(text(category, 'name'))}" loading="lazy">` : `<span class="v3-category-placeholder">${esc((category.code || text(category, 'name')).slice(0, 4))}</span>`}
        <span class="v3-category-count">${items.length} ${esc(lang() === 'si' ? 'මාර්ග' : (kind === 'product' ? 'product paths' : 'service paths'))}</span>
      </a>
      <div class="v3-category-body">
        <p class="v3-category-code">${esc(category.code || (kind === 'product' ? 'PRODUCT' : 'SERVICE'))}</p>
        <h2><a href="${attr(href)}">${esc(text(category, 'name'))}</a></h2>
        <p>${esc(text(category, 'summary', text(category, 'description', lang() === 'si' ? 'මෙම කාණ්ඩයට අදාළ මාර්ග බලන්න.' : 'Explore everything connected to this category.')))}</p>
        ${query && matchCount ? `<div class="v3-match-note">${matchCount} ${esc(lang() === 'si' ? 'ගැළපීම් ඇතුළත' : 'matching items inside')}</div>` : ''}
        <a class="v3-card-link" href="${attr(href)}">${esc(lang() === 'si' ? 'කාණ්ඩය විවෘත කරන්න' : 'Open category')} <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }

  function renderCategoryIndex(kind) {
    const root = $('#page-content');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const query = (params.get('q') || '').trim().toLowerCase();
    const industry = params.get('industry') || (() => { try { return localStorage.getItem('sl_industry') || ''; } catch { return ''; } })();
    const categories = state.categories.filter((category) => category.kind === kind).filter((category) => {
      const items = state.offerings.filter((item) => item.kind === kind && item.category_id === category.id);
      if (industry && !(category.industry_slugs || []).includes(industry) && !items.some((item) => (item.industry_slugs || []).includes(industry))) return false;
      return !query || categorySearchText(category, items).includes(query);
    });
    const label = kind === 'product' ? (lang() === 'si' ? 'නිෂ්පාදන' : 'Products') : (lang() === 'si' ? 'සේවා' : 'Services');
    const title = kind === 'product'
      ? (lang() === 'si' ? 'පළමුව නිෂ්පාදන කාණ්ඩයක් තෝරන්න' : 'Start with a product category')
      : (lang() === 'si' ? 'පළමුව සේවා කාණ්ඩයක් තෝරන්න' : 'Start with a service category');
    const body = kind === 'product'
      ? (lang() === 'si' ? 'ඔබට අවශ්‍ය දේට ආසන්න කාණ්ඩය තෝරන්න. ඉන්පසු එම කාණ්ඩයට අදාළ සියලුම නිෂ්පාදන මාර්ග බලන්න.' : 'Choose the closest category, then see every product path connected to it. You can still search using a name, local term, use or problem.')
      : (lang() === 'si' ? 'ඔබට අවශ්‍ය ප්‍රතිඵලයට ගැළපෙන සේවා කාණ්ඩය තෝරන්න. ඉන්පසු එම කාණ්ඩයේ සියලු මාර්ග බලන්න.' : 'Choose the service category that matches the outcome you need, then see every related service path inside it.');
    root.className = 'v3-category-index-page';
    root.innerHTML = `<section class="v3-index-hero"><div class="shell"><p class="eyebrow">${esc(label)}</p><h1>${esc(title)}</h1><p>${esc(body)}</p><div class="v3-category-search"><input id="v3-category-search" type="search" value="${attr(params.get('q') || '')}" placeholder="${attr(lang() === 'si' ? 'නම, භාවිතය හෝ ගැටලුව සොයන්න' : 'Search by name, use, local term or problem')}"><button type="button" id="v3-category-search-button">${esc(lang() === 'si' ? 'සොයන්න' : 'Search')}</button></div></div></section>
      <section class="v3-category-section"><div class="shell"><div class="v3-index-heading"><div><p class="eyebrow">${esc(lang() === 'si' ? 'කාණ්ඩ' : 'Categories')}</p><h2>${categories.length} ${esc(lang() === 'si' ? 'කාණ්ඩ හමු විය' : 'categories available')}</h2></div><a href="contact.html?type=identify" class="button button-dark">${esc(lang() === 'si' ? 'කාණ්ඩය නොපෙනේද?' : 'Cannot find the category?')}</a></div><div class="v3-category-grid">${categories.length ? categories.map((category) => categoryCard(category, kind, query)).join('') : `<div class="v3-empty"><h2>${esc(lang() === 'si' ? 'නිවැරදි කාණ්ඩය හමු නොවීය' : 'No exact category match')}</h2><p>${esc(lang() === 'si' ? 'ඡායාරූපයක් හෝ විස්තරයක් යවන්න. අපි නිවැරදි මාර්ගය හඳුනාගන්නෙමු.' : 'Send a photo or description. Source Labs will identify the closest path.')}</p><a class="button button-dark" href="contact.html?type=identify">${esc(lang() === 'si' ? 'ඔබ දන්නා දේ සමඟ ආරම්භ කරන්න' : 'Start with what you know')}</a></div>`}</div></div></section>`;
    const run = () => {
      const value = $('#v3-category-search')?.value.trim() || '';
      const url = new URL(location.href);
      if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
      location.href = url.href;
    };
    $('#v3-category-search-button')?.addEventListener('click', run);
    $('#v3-category-search')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') run(); });
  }

  function offeringCard(item) {
    const image = item.image_url || parseArray(item.gallery)[0] || '';
    return `<article class="v3-offering-card">
      <button type="button" class="v3-offering-open" data-v3-offering="${attr(item.id)}">
        <span class="v3-offering-image">${image ? `<img src="${attr(image)}" alt="${attr(text(item, 'name'))}" loading="lazy">` : `<span>${esc((item.code || 'SL').slice(0, 5))}</span>`}</span>
        <span class="v3-offering-content"><small>${esc(item.code || (item.kind === 'product' ? 'PRODUCT' : 'SERVICE'))}</small><strong>${esc(text(item, 'name'))}</strong><span>${esc(text(item, 'short', text(item, 'description')))}</span><em>${esc(lang() === 'si' ? 'විස්තර බලන්න' : 'View details')} →</em></span>
      </button>
    </article>`;
  }

  function renderCategoryLanding() {
    const root = $('#page-content');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug') || params.get('category') || '';
    const category = state.categories.find((item) => item.slug === slug);
    if (!category) {
      root.innerHTML = `<section class="v3-index-hero"><div class="shell"><p class="eyebrow">Source Labs</p><h1>${esc(lang() === 'si' ? 'කාණ්ඩය හමු නොවීය' : 'Category not found')}</h1><p>${esc(lang() === 'si' ? 'නිෂ්පාදන හෝ සේවා කාණ්ඩ වෙත ආපසු යන්න.' : 'Return to the product or service categories and choose another path.')}</p><div class="button-row"><a class="button button-dark" href="products.html">Products</a><a class="button button-secondary" href="services.html">Services</a></div></div></section>`;
      return;
    }
    const landing = state.landings.find((item) => item.category_id === category.id) || {};
    const items = state.offerings.filter((item) => item.category_id === category.id && item.kind === category.kind).slice(0, Number(landing.featured_limit || 48));
    const heroImage = categoryImage(category, landing);
    const highlights = parseArray(landing.highlights).map(localizedItem).filter(Boolean);
    const gallery = parseArray(landing.gallery).map((item) => typeof item === 'string' ? item : item?.url).filter(Boolean);
    const relatedCategories = state.categories.filter((item) => item.kind === category.kind && item.id !== category.id).filter((item) => intersection(item.industry_slugs || [], category.industry_slugs || []) || !(category.industry_slugs || []).length).slice(0, 4);
    const oppositeKind = category.kind === 'product' ? 'service' : 'product';
    const relatedOfferings = landing.show_related === false ? [] : state.offerings.filter((item) => item.kind === oppositeKind && intersection(item.industry_slugs || [], category.industry_slugs || [])).slice(0, 4);
    const parentLabel = category.kind === 'product' ? (lang() === 'si' ? 'නිෂ්පාදන' : 'Products') : (lang() === 'si' ? 'සේවා' : 'Services');
    const parentUrl = category.kind === 'product' ? 'products.html' : 'services.html';
    root.className = 'v3-category-landing-page';
    root.innerHTML = `<section class="v3-category-hero ${heroImage ? 'has-image' : ''}" ${heroImage ? `style="--category-hero:url('${attr(heroImage)}')"` : ''}><div class="shell"><nav class="v3-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Source Labs</a><span>›</span><a href="${parentUrl}">${esc(parentLabel)}</a><span>›</span><strong>${esc(text(category, 'name'))}</strong></nav><div class="v3-category-hero-copy"><p class="eyebrow">${esc(category.code || parentLabel)}</p><h1>${esc(text(landing, 'hero_title', text(category, 'name')))}</h1><p>${esc(text(landing, 'hero_body', text(category, 'description', text(category, 'summary'))))}</p><div class="button-row"><a class="button button-primary" href="${attr(landing.cta_url || `contact.html?category=${encodeURIComponent(category.slug)}`)}">${esc(text(landing, 'cta_label', category.kind === 'product' ? 'Send a product requirement' : 'Discuss this category'))}</a><a class="button button-secondary" href="#category-items">${esc(lang() === 'si' ? 'සියලු මාර්ග බලන්න' : 'See all paths')}</a></div></div></div></section>
      <section class="v3-category-intro"><div class="shell v3-category-intro-grid"><div><p class="eyebrow">${esc(lang() === 'si' ? 'කාණ්ඩ දළ විශ්ලේෂණය' : 'Category overview')}</p><h2>${esc(text(landing, 'intro_title', `Everything related to ${text(category, 'name')}`))}</h2><p>${esc(text(landing, 'intro_body', text(category, 'summary')))}</p></div>${highlights.length ? `<div class="v3-highlight-list">${highlights.map((item) => `<div><span>✓</span><p>${esc(item)}</p></div>`).join('')}</div>` : `<div class="v3-highlight-list"><div><span>01</span><p>${esc(lang() === 'si' ? 'නිවැරදි අවශ්‍යතාවය පැහැදිලි කරන්න' : 'Clarify the exact requirement')}</p></div><div><span>02</span><p>${esc(lang() === 'si' ? 'අදාළ විකල්ප සහ පිරිවිතර බලන්න' : 'Review related paths and specifications')}</p></div><div><span>03</span><p>${esc(lang() === 'si' ? 'Source Labs සමඟ ඉදිරියට යන්න' : 'Move forward with Source Labs')}</p></div></div>`}</div></section>
      <section class="v3-category-items" id="category-items"><div class="shell"><div class="v3-index-heading"><div><p class="eyebrow">${esc(parentLabel)}</p><h2>${esc(lang() === 'si' ? `${text(category, 'name')} යටතේ මාර්ග` : `Paths inside ${text(category, 'name')}`)}</h2><p>${items.length} ${esc(lang() === 'si' ? 'මාර්ග' : 'related paths')}</p></div><a class="button button-dark" href="contact.html?category=${encodeURIComponent(category.slug)}">${esc(lang() === 'si' ? 'විශේෂ අවශ්‍යතාවයක් යවන්න' : 'Send a specific requirement')}</a></div><div class="v3-offering-grid">${items.length ? items.map(offeringCard).join('') : `<div class="v3-empty"><h3>${esc(lang() === 'si' ? 'තවම පොදු මාර්ගයක් නැත' : 'No public path yet')}</h3><p>${esc(lang() === 'si' ? 'ඔබේ අවශ්‍යතාවය යවන්න. අපි මෙම කාණ්ඩය යටතේ එය හඳුනාගන්නෙමු.' : 'Send your requirement and Source Labs will identify it inside this category.')}</p></div>`}</div></div></section>
      ${gallery.length ? `<section class="v3-category-gallery"><div class="shell"><p class="eyebrow">${esc(lang() === 'si' ? 'දෘශ්‍ය උදාහරණ' : 'Visual examples')}</p><div class="v3-gallery-grid">${gallery.map((url) => `<img src="${attr(url)}" alt="${attr(text(category, 'name'))}" loading="lazy">`).join('')}</div></div></section>` : ''}
      ${relatedOfferings.length ? `<section class="v3-related-section"><div class="shell"><div class="v3-index-heading"><div><p class="eyebrow">${esc(lang() === 'si' ? 'සම්බන්ධ මාර්ග' : 'Related pathways')}</p><h2>${esc(oppositeKind === 'service' ? (lang() === 'si' ? 'මෙම කාණ්ඩයට සහාය වන සේවා' : 'Services that support this category') : (lang() === 'si' ? 'මෙම සේවාවට සම්බන්ධ නිෂ්පාදන' : 'Products connected to this service'))}</h2></div></div><div class="v3-offering-grid">${relatedOfferings.map(offeringCard).join('')}</div></div></section>` : ''}
      ${relatedCategories.length ? `<section class="v3-related-categories"><div class="shell"><div class="v3-index-heading"><div><p class="eyebrow">${esc(lang() === 'si' ? 'තවත් කාණ්ඩ' : 'More categories')}</p><h2>${esc(lang() === 'si' ? 'සම්බන්ධ කාණ්ඩ බලන්න' : 'Explore related categories')}</h2></div></div><div class="v3-category-grid compact">${relatedCategories.map((item) => categoryCard(item, item.kind)).join('')}</div></div></section>` : ''}`;
    bindOfferingCards();
    updateCategorySEO(category, landing);
  }

  function specificationLabel(spec) {
    if (typeof spec === 'string') {
      if (spec.trim().startsWith('{')) { try { return localizedItem(JSON.parse(spec)); } catch { return spec; } }
      return spec;
    }
    return localizedItem(spec);
  }

  function bindOfferingCards() {
    $$('[data-v3-offering]').forEach((button) => button.addEventListener('click', () => openOffering(button.dataset.v3Offering)));
  }

  function openOffering(id) {
    const item = state.offerings.find((row) => row.id === id);
    if (!item) return;
    const category = state.categories.find((row) => row.id === item.category_id);
    const uses = parseArray(item.use_cases).map(localizedItem).filter(Boolean);
    const questions = parseArray(item.key_questions).map(localizedItem).filter(Boolean);
    const specs = parseArray(item.specifications).map(specificationLabel).filter(Boolean);
    const image = item.image_url || parseArray(item.gallery)[0] || '';
    const root = $('#modal-root');
    if (!root) return;
    const params = new URLSearchParams({ type: item.kind === 'product' ? 'source' : 'other', offering: item.id, category: category?.slug || '' });
    root.innerHTML = `<div class="modal-backdrop v3-modal-backdrop"><div class="modal v3-detail-modal" role="dialog" aria-modal="true" aria-labelledby="v3-modal-title"><div class="modal-head"><div><small>${esc(category ? text(category, 'name') : item.kind)}</small><h2 id="v3-modal-title">${esc(text(item, 'name'))}</h2></div><button type="button" class="modal-close v3-modal-close" aria-label="Close">×</button></div><div class="modal-content">${image ? `<img class="v3-modal-image" src="${attr(image)}" alt="${attr(text(item, 'name'))}">` : ''}<p class="lede">${esc(text(item, 'description', text(item, 'short')))}</p><div class="detail-grid">${uses.length ? `<div><h3>${esc(lang() === 'si' ? 'භාවිත' : 'Useful for')}</h3><ul class="detail-list">${uses.map((value) => `<li>${esc(value)}</li>`).join('')}</ul></div>` : ''}${questions.length ? `<div><h3>${esc(lang() === 'si' ? 'ප්‍රධාන ප්‍රශ්න' : 'Key questions')}</h3><ul class="detail-list">${questions.map((value) => `<li>${esc(value)}</li>`).join('')}</ul></div>` : ''}${specs.length ? `<div><h3>${esc(lang() === 'si' ? 'පිරිවිතර ක්ෂේත්‍ර' : 'Specification fields')}</h3><ul class="detail-list">${specs.map((value) => `<li>${esc(value)}</li>`).join('')}</ul></div>` : ''}<div><h3>${esc(lang() === 'si' ? 'වත්මන් තත්ත්වය' : 'Current status')}</h3><p>${esc(text(item, 'availability_note', lang() === 'si' ? 'විශේෂ ඉල්ලීම අනුව සොයා බලයි.' : 'Sourced per request.'))}</p>${text(item, 'compliance_note') ? `<p>${esc(text(item, 'compliance_note'))}</p>` : ''}</div></div><div class="button-row"><a class="button button-dark" href="contact.html?${params.toString()}">${esc(text(item, 'cta_label', lang() === 'si' ? 'අවශ්‍යතාවය යවන්න' : 'Send a requirement'))}</a><button class="button button-secondary v3-modal-close-inline" type="button">${esc(lang() === 'si' ? 'වසන්න' : 'Close')}</button></div></div></div></div>`;
    const close = () => { root.innerHTML = ''; };
    $('.v3-modal-close', root)?.addEventListener('click', close);
    $('.v3-modal-close-inline', root)?.addEventListener('click', close);
    $('.v3-modal-backdrop', root)?.addEventListener('click', (event) => { if (event.target === event.currentTarget) close(); });
    document.addEventListener('keydown', function onKey(event) { if (event.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
  }

  function updateCategorySEO(category, landing) {
    const title = text(landing, 'seo_title', `${text(category, 'name')} | Source Labs Sri Lanka`);
    const description = text(landing, 'seo_description', text(landing, 'hero_body', text(category, 'summary')));
    document.title = title;
    $('meta[name="description"]')?.setAttribute('content', description);
    $('meta[property="og:title"]')?.setAttribute('content', title);
    $('meta[property="og:description"]')?.setAttribute('content', description);
    const canonical = new URL(`category.html?slug=${encodeURIComponent(category.slug)}`, CONFIG.publicBaseUrl || location.href).href;
    $('link[rel="canonical"]')?.setAttribute('href', canonical);
    $('meta[property="og:url"]')?.setAttribute('content', canonical);
    const image = landing.og_image_url || landing.hero_image_url || category.image_url;
    if (image) {
      let og = $('meta[property="og:image"]');
      if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:image'); document.head.appendChild(og); }
      og.setAttribute('content', image);
    }
  }

  function scheduleRender() {
    window.setTimeout(() => {
      ensureMobileMenu();
      repairSpecificationLabels($('#modal-root') || document);
      if (PAGE === 'products') renderCategoryIndex('product');
      else if (PAGE === 'services') renderCategoryIndex('service');
      else if (PAGE === 'category') renderCategoryLanding();
    }, 80);
  }

  async function boot() {
    ensureMobileMenu();
    const observer = new MutationObserver((mutations) => {
      let needsMenu = false;
      let needsSpecs = false;
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('#site-nav,.site-header') || node.querySelector?.('#site-nav')) needsMenu = true;
        if (node.matches?.('.modal-backdrop,.detail-list') || node.querySelector?.('.detail-list')) needsSpecs = true;
      }));
      if (needsMenu) ensureMobileMenu();
      if (needsSpecs) repairSpecificationLabels($('#modal-root') || document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="language"],[data-action="simple"]')) scheduleRender();
      if (event.target.closest('[data-action="menu"]')) window.setTimeout(ensureMobileMenu, 0);
    });
    if (!['products', 'services', 'category'].includes(PAGE)) return;
    try {
      await loadData();
      scheduleRender();
    } catch (error) {
      console.error('Source Labs category experience:', error);
      const root = $('#page-content');
      if (root && PAGE === 'category') root.innerHTML = `<section class="v3-index-hero"><div class="shell"><h1>Source Labs</h1><p>The category experience could not load. Please refresh or send your request directly.</p><a class="button button-dark" href="contact.html">Talk to Source Labs</a></div></section>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
