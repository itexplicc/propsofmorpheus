(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const state = { client: null, categories: [], landings: [], media: [], session: null };
  const IMAGE_FIELDS = new Set(['image_url', 'hero_image_url', 'media_url', 'og_image_url']);

  function client() {
    if (!state.client && window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { headers: { 'x-client-info': 'source-labs-admin-v3/1.0' } }
      });
    }
    return state.client;
  }

  function notify(message, type = 'success') {
    const stack = $('#toast-stack');
    if (!stack) return;
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 4000);
  }

  async function requireSession() {
    const api = client();
    if (!api) throw new Error('Admin backend unavailable.');
    const { data: { session }, error } = await api.auth.getSession();
    if (error || !session) throw new Error('Open Admin and sign in first.');
    state.session = session;
    return session;
  }

  function ensureNav() {
    const navRoot = $('#admin-navigation');
    if (!navRoot || $('#v3-category-pages-button')) return;
    const group = document.createElement('div');
    group.className = 'nav-group v3-admin-nav-group';
    group.innerHTML = `<div class="nav-label">Category experience</div><nav class="admin-nav"><button type="button" id="v3-category-pages-button"><span class="nav-dot"></span>Category landing pages</button></nav>`;
    navRoot.appendChild(group);
    $('#v3-category-pages-button')?.addEventListener('click', async () => {
      document.body.classList.remove('sidebar-open');
      $$('#admin-navigation button').forEach((button) => button.classList.remove('active'));
      $('#v3-category-pages-button')?.classList.add('active');
      try { await renderCategoryPages(); } catch (error) { renderCustomError(error); }
    });
  }

  function renderCustomError(error) {
    const content = $('#admin-content');
    if (!content) return;
    content.innerHTML = `<div class="empty"><h2>Could not load category pages</h2><p>${esc(error.message || 'Unknown error')}</p></div>`;
  }

  async function loadCategoryData() {
    await requireSession();
    const [categories, landings] = await Promise.all([
      state.client.from('categories').select('*').order('kind').order('sort_order'),
      state.client.from('category_landings').select('*').order('sort_order')
    ]);
    if (categories.error) throw categories.error;
    if (landings.error) throw landings.error;
    state.categories = categories.data || [];
    state.landings = landings.data || [];
  }

  async function renderCategoryPages() {
    await loadCategoryData();
    const content = $('#admin-content');
    if (!content) return;
    $('#topbar-title').textContent = 'Category landing pages';
    $('#topbar-subtitle').textContent = 'Category-first product and service journeys';
    const rows = state.categories.map((category) => ({ category, landing: state.landings.find((item) => item.category_id === category.id) || null }));
    content.innerHTML = `<div class="view-head"><div><h1>Category landing pages</h1><p>Each product and service category has its own public page. Control the hero, images, explanation, highlights, gallery, related paths, SEO and call to action.</p></div><div class="head-actions"><a class="button button-secondary" href="../products.html" target="_blank" rel="noopener">View product categories ↗</a><a class="button button-secondary" href="../services.html" target="_blank" rel="noopener">View service categories ↗</a></div></div>
      <div class="v3-admin-category-grid">${rows.map(({ category, landing }) => categoryAdminCard(category, landing)).join('')}</div>`;
    $$('[data-v3-edit-category]').forEach((button) => button.addEventListener('click', () => {
      const category = state.categories.find((item) => item.id === button.dataset.v3EditCategory);
      const landing = state.landings.find((item) => item.category_id === category?.id) || null;
      if (category) openCategoryEditor(category, landing);
    }));
  }

  function categoryAdminCard(category, landing) {
    const image = landing?.hero_image_url || category.image_url || '';
    const status = landing?.status || 'not_created';
    const publicUrl = `../category.html?slug=${encodeURIComponent(category.slug)}`;
    return `<article class="v3-admin-category-card"><div class="v3-admin-category-image">${image ? `<img src="${attr(image)}" alt="">` : `<span>${esc((category.code || category.name_en || 'SL').slice(0, 5))}</span>`}</div><div class="v3-admin-category-body"><div class="v3-admin-category-meta"><span class="pill ${attr(category.kind)}">${esc(category.kind)}</span><span class="pill ${attr(status)}">${esc(status.replace('_', ' '))}</span></div><h2>${esc(category.name_en || category.slug)}</h2><p>${esc(category.summary_en || category.description_en || 'Add a clear category introduction and related paths.')}</p><div class="v3-admin-card-actions"><button class="button button-primary button-small" data-v3-edit-category="${category.id}">${landing ? 'Edit landing page' : 'Create landing page'}</button><a class="button button-secondary button-small" href="${attr(publicUrl)}" target="_blank" rel="noopener">Open ↗</a></div></div></article>`;
  }

  function lines(value) {
    if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item?.label_en || item?.en || item?.label || '').filter(Boolean).join('\n');
    return '';
  }

  function mediaField(name, label, value = '') {
    return `<div class="field full v3-media-field" data-v3-media-field><label for="v3-${name}">${esc(label)}</label><input id="v3-${name}" name="${name}" type="text" value="${attr(value || '')}" placeholder="Choose or upload an image"><div class="v3-media-preview">${value ? `<img src="${attr(value)}" alt="">` : '<span>No image selected</span>'}</div><div class="v3-media-actions"><button type="button" class="button button-secondary button-small" data-v3-media-pick="${name}">Choose from library</button><label class="button button-secondary button-small">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" data-v3-media-upload="${name}" hidden></label><button type="button" class="button button-danger button-small" data-v3-media-clear="${name}">Clear</button></div></div>`;
  }

  function galleryField(name, value) {
    const urls = parseGallery(value);
    return `<div class="field full v3-gallery-field" data-v3-gallery-field><label>Gallery images</label><textarea name="${name}" class="code v3-gallery-value" hidden>${esc(JSON.stringify(urls))}</textarea><div class="v3-gallery-editor">${urls.length ? urls.map((url, index) => `<div class="v3-gallery-thumb"><img src="${attr(url)}" alt=""><button type="button" data-v3-gallery-remove="${index}" aria-label="Remove image">×</button></div>`).join('') : '<p class="field-help">No gallery images selected.</p>'}</div><div class="v3-media-actions"><button type="button" class="button button-secondary button-small" data-v3-gallery-pick="${name}">Add from library</button><label class="button button-secondary button-small">Upload and add<input type="file" accept="image/jpeg,image/png,image/webp" data-v3-gallery-upload="${name}" hidden></label></div></div>`;
  }

  function openCategoryEditor(category, landing) {
    const root = $('#modal-root');
    if (!root) return;
    const row = landing || {};
    root.innerHTML = `<div class="modal-backdrop"><form class="admin-modal v3-category-editor" id="v3-category-form"><div class="modal-head"><div><small>${esc(category.kind)} category</small><h2>${esc(category.name_en)}</h2></div><button type="button" class="modal-close">×</button></div><div class="modal-body"><div class="v3-editor-intro"><strong>Public URL</strong><a href="../category.html?slug=${encodeURIComponent(category.slug)}" target="_blank" rel="noopener">category.html?slug=${esc(category.slug)} ↗</a></div><div class="form-grid">
      <div class="field"><label>Hero title — English</label><input name="hero_title_en" value="${attr(row.hero_title_en || category.name_en || '')}"></div><div class="field"><label>Hero title — Sinhala</label><input name="hero_title_si" value="${attr(row.hero_title_si || category.name_si || '')}"></div>
      <div class="field"><label>Hero body — English</label><textarea name="hero_body_en">${esc(row.hero_body_en || category.description_en || category.summary_en || '')}</textarea></div><div class="field"><label>Hero body — Sinhala</label><textarea name="hero_body_si">${esc(row.hero_body_si || category.description_si || category.summary_si || '')}</textarea></div>
      ${mediaField('hero_image_url', 'Hero / category cover image', row.hero_image_url || category.image_url || '')}
      <div class="field"><label>Introduction title — English</label><input name="intro_title_en" value="${attr(row.intro_title_en || `Everything related to ${category.name_en}`)}"></div><div class="field"><label>Introduction title — Sinhala</label><input name="intro_title_si" value="${attr(row.intro_title_si || '')}"></div>
      <div class="field"><label>Introduction body — English</label><textarea name="intro_body_en">${esc(row.intro_body_en || category.summary_en || '')}</textarea></div><div class="field"><label>Introduction body — Sinhala</label><textarea name="intro_body_si">${esc(row.intro_body_si || category.summary_si || '')}</textarea></div>
      <div class="field full"><label>Highlights — one per line</label><textarea name="highlights_text" placeholder="What can be found here?\nWhat should the customer prepare?\nWhat can Source Labs help with?">${esc(lines(row.highlights))}</textarea></div>
      ${galleryField('gallery', row.gallery)}
      <div class="field"><label>CTA label — English</label><input name="cta_label_en" value="${attr(row.cta_label_en || (category.kind === 'product' ? 'Send a product requirement' : 'Discuss this category'))}"></div><div class="field"><label>CTA label — Sinhala</label><input name="cta_label_si" value="${attr(row.cta_label_si || '')}"></div>
      <div class="field full"><label>CTA URL</label><input name="cta_url" value="${attr(row.cta_url || `contact.html?category=${category.slug}`)}"></div>
      <div class="field"><label>Maximum public items</label><input name="featured_limit" type="number" min="1" max="48" value="${Number(row.featured_limit || 12)}"></div><div class="field"><label>Status</label><select name="status">${['draft','published','archived'].map((status) => `<option value="${status}" ${(row.status || 'published') === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
      <div class="field"><label class="toggle"><input name="show_related" type="checkbox" ${row.show_related !== false ? 'checked' : ''}> Show related product/service paths</label></div><div class="field"><label class="toggle"><input name="show_industries" type="checkbox" ${row.show_industries !== false ? 'checked' : ''}> Show industry context</label></div>
      <div class="field"><label>SEO title — English</label><input name="seo_title_en" value="${attr(row.seo_title_en || '')}"></div><div class="field"><label>SEO title — Sinhala</label><input name="seo_title_si" value="${attr(row.seo_title_si || '')}"></div>
      <div class="field"><label>SEO description — English</label><textarea name="seo_description_en">${esc(row.seo_description_en || '')}</textarea></div><div class="field"><label>SEO description — Sinhala</label><textarea name="seo_description_si">${esc(row.seo_description_si || '')}</textarea></div>
      ${mediaField('og_image_url', 'Social sharing image', row.og_image_url || '')}
      </div><div id="v3-category-status" class="login-status"></div></div><div class="modal-foot"><button type="button" class="button button-secondary v3-editor-cancel">Cancel</button><button type="submit" class="button button-primary">Save category page</button></div></form></div>`;
    const close = () => { root.innerHTML = ''; };
    $('.modal-close', root)?.addEventListener('click', close);
    $('.v3-editor-cancel', root)?.addEventListener('click', close);
    bindMediaEnhancements(root);
    $('#v3-category-form', root)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const save = form.querySelector('button[type="submit"]');
      save.disabled = true;
      save.textContent = 'Saving…';
      try {
        const payload = {
          category_id: category.id,
          hero_title_en: form.hero_title_en.value.trim(), hero_title_si: form.hero_title_si.value.trim(),
          hero_body_en: form.hero_body_en.value.trim(), hero_body_si: form.hero_body_si.value.trim(),
          hero_image_url: form.hero_image_url.value.trim(),
          intro_title_en: form.intro_title_en.value.trim(), intro_title_si: form.intro_title_si.value.trim(),
          intro_body_en: form.intro_body_en.value.trim(), intro_body_si: form.intro_body_si.value.trim(),
          highlights: form.highlights_text.value.split(/\n/).map((value) => value.trim()).filter(Boolean),
          gallery: parseGallery(form.gallery.value),
          cta_label_en: form.cta_label_en.value.trim(), cta_label_si: form.cta_label_si.value.trim(), cta_url: form.cta_url.value.trim(),
          show_related: form.show_related.checked, show_industries: form.show_industries.checked,
          featured_limit: Math.min(48, Math.max(1, Number(form.featured_limit.value || 12))),
          seo_title_en: form.seo_title_en.value.trim(), seo_title_si: form.seo_title_si.value.trim(),
          seo_description_en: form.seo_description_en.value.trim(), seo_description_si: form.seo_description_si.value.trim(),
          og_image_url: form.og_image_url.value.trim(), status: form.status.value, sort_order: category.sort_order || 0
        };
        const result = landing
          ? await state.client.from('category_landings').update(payload).eq('id', landing.id)
          : await state.client.from('category_landings').insert(payload);
        if (result.error) throw result.error;
        notify('Category landing page saved.');
        close();
        await renderCategoryPages();
      } catch (error) {
        $('#v3-category-status', root).textContent = error.message || 'Save failed.';
        save.disabled = false;
        save.textContent = 'Save category page';
      }
    });
  }

  function parseGallery(value) {
    if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item?.url || item?.public_url).filter(Boolean);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => typeof item === 'string' ? item : item?.url || item?.public_url).filter(Boolean);
    } catch { return String(value).split(/\n|,/).map((item) => item.trim()).filter(Boolean); }
    return [];
  }

  function enhanceExistingEditor(root = document) {
    $$('.admin-modal input[name],.admin-modal textarea[name]', root).forEach((input) => {
      if (IMAGE_FIELDS.has(input.name) && !input.closest('[data-v3-media-field]')) {
        const field = input.closest('.field');
        if (!field || field.dataset.v3Enhanced) return;
        field.dataset.v3Enhanced = '1';
        field.classList.add('v3-media-field');
        field.dataset.v3MediaField = '';
        input.type = 'text';
        const controls = document.createElement('div');
        controls.innerHTML = `<div class="v3-media-preview">${input.value ? `<img src="${attr(input.value)}" alt="">` : '<span>No image selected</span>'}</div><div class="v3-media-actions"><button type="button" class="button button-secondary button-small" data-v3-media-pick="${attr(input.name)}">Choose from library</button><label class="button button-secondary button-small">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" data-v3-media-upload="${attr(input.name)}" hidden></label><button type="button" class="button button-danger button-small" data-v3-media-clear="${attr(input.name)}">Clear</button></div>`;
        while (controls.firstChild) field.appendChild(controls.firstChild);
      }
      if (input.name === 'gallery' && !input.closest('[data-v3-gallery-field]')) {
        const field = input.closest('.field');
        if (!field || field.dataset.v3GalleryEnhanced) return;
        field.dataset.v3GalleryEnhanced = '1';
        field.classList.add('v3-gallery-field', 'full');
        field.dataset.v3GalleryField = '';
        input.classList.add('v3-gallery-value');
        input.hidden = true;
        const urls = parseGallery(input.value);
        const controls = document.createElement('div');
        controls.innerHTML = `<div class="v3-gallery-editor">${urls.length ? urls.map((url, index) => `<div class="v3-gallery-thumb"><img src="${attr(url)}" alt=""><button type="button" data-v3-gallery-remove="${index}" aria-label="Remove image">×</button></div>`).join('') : '<p class="field-help">No gallery images selected.</p>'}</div><div class="v3-media-actions"><button type="button" class="button button-secondary button-small" data-v3-gallery-pick="gallery">Add from library</button><label class="button button-secondary button-small">Upload and add<input type="file" accept="image/jpeg,image/png,image/webp" data-v3-gallery-upload="gallery" hidden></label></div>`;
        while (controls.firstChild) field.appendChild(controls.firstChild);
      }
    });
    bindMediaEnhancements(root);
  }

  function updateMediaPreview(input) {
    const field = input.closest('[data-v3-media-field]');
    const preview = $('.v3-media-preview', field);
    if (preview) preview.innerHTML = input.value ? `<img src="${attr(input.value)}" alt="">` : '<span>No image selected</span>';
  }

  function updateGallery(field) {
    const textarea = $('.v3-gallery-value', field);
    const urls = parseGallery(textarea?.value || '[]');
    if (textarea) textarea.value = JSON.stringify(urls);
    const editor = $('.v3-gallery-editor', field);
    if (editor) editor.innerHTML = urls.length ? urls.map((url, index) => `<div class="v3-gallery-thumb"><img src="${attr(url)}" alt=""><button type="button" data-v3-gallery-remove="${index}" aria-label="Remove image">×</button></div>`).join('') : '<p class="field-help">No gallery images selected.</p>';
    $$('[data-v3-gallery-remove]', field).forEach((button) => button.addEventListener('click', () => {
      const next = parseGallery(textarea.value);
      next.splice(Number(button.dataset.v3GalleryRemove), 1);
      textarea.value = JSON.stringify(next);
      updateGallery(field);
    }));
  }

  function bindMediaEnhancements(root = document) {
    $$('[data-v3-media-pick]', root).forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const field = button.closest('[data-v3-media-field]');
        const input = $(`[name="${CSS.escape(button.dataset.v3MediaPick)}"]`, field);
        openMediaLibrary((url) => { input.value = url; input.dispatchEvent(new Event('input', { bubbles: true })); updateMediaPreview(input); });
      });
    });
    $$('[data-v3-media-upload]', root).forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = '1';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const field = input.closest('[data-v3-media-field]');
        const target = $(`[name="${CSS.escape(input.dataset.v3MediaUpload)}"]`, field);
        openUploadDialog(file, (url) => { target.value = url; target.dispatchEvent(new Event('input', { bubbles: true })); updateMediaPreview(target); });
        input.value = '';
      });
    });
    $$('[data-v3-media-clear]', root).forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const field = button.closest('[data-v3-media-field]');
        const input = $(`[name="${CSS.escape(button.dataset.v3MediaClear)}"]`, field);
        input.value = ''; updateMediaPreview(input);
      });
    });
    $$('[data-v3-gallery-pick]', root).forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const field = button.closest('[data-v3-gallery-field]');
        const textarea = $('.v3-gallery-value', field);
        openMediaLibrary((url) => { const urls = parseGallery(textarea.value); if (!urls.includes(url)) urls.push(url); textarea.value = JSON.stringify(urls); updateGallery(field); });
      });
    });
    $$('[data-v3-gallery-upload]', root).forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = '1';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        const field = input.closest('[data-v3-gallery-field]');
        const textarea = $('.v3-gallery-value', field);
        openUploadDialog(file, (url) => { const urls = parseGallery(textarea.value); if (!urls.includes(url)) urls.push(url); textarea.value = JSON.stringify(urls); updateGallery(field); });
        input.value = '';
      });
    });
    $$('[data-v3-gallery-field]', root).forEach(updateGallery);
  }

  async function openMediaLibrary(onChoose) {
    try {
      await requireSession();
      const { data, error } = await state.client.from('media_assets').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      state.media = data || [];
      const root = $('#drawer-root');
      root.innerHTML = `<aside class="assistant-drawer v3-media-drawer"><div class="drawer-head"><div><small>Source Labs media library</small><h2>Choose an image</h2></div><button class="modal-close" id="v3-media-close">×</button></div><div class="drawer-body"><div class="field"><input id="v3-media-search" type="search" placeholder="Search filename or alt text"></div><div class="v3-library-grid" id="v3-library-grid">${mediaLibraryCards(state.media)}</div></div><div class="drawer-foot"><label class="button button-primary">Upload new image<input id="v3-library-upload" type="file" accept="image/jpeg,image/png,image/webp" hidden></label></div></aside>`;
      const close = () => { root.innerHTML = ''; };
      $('#v3-media-close')?.addEventListener('click', close);
      const bind = () => $$('[data-v3-choose-media]', root).forEach((button) => button.addEventListener('click', () => { onChoose(button.dataset.v3ChooseMedia); close(); }));
      bind();
      $('#v3-media-search')?.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        const filtered = state.media.filter((item) => [item.storage_path, item.alt_en, item.alt_si, item.caption_en, item.caption_si].join(' ').toLowerCase().includes(query));
        $('#v3-library-grid').innerHTML = mediaLibraryCards(filtered); bind();
      });
      $('#v3-library-upload')?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) { close(); openUploadDialog(file, onChoose); }
      });
    } catch (error) { notify(error.message || 'Media library could not open.', 'error'); }
  }

  function mediaLibraryCards(rows) {
    return rows.length ? rows.map((item) => `<button type="button" class="v3-library-card" data-v3-choose-media="${attr(item.public_url)}"><img src="${attr(item.public_url)}" alt="${attr(item.alt_en || '')}" loading="lazy"><span>${esc(item.alt_en || item.storage_path.split('/').pop())}</span></button>`).join('') : '<div class="empty">No uploaded images yet.</div>';
  }

  function openUploadDialog(file, onUploaded) {
    const root = $('#drawer-root');
    const objectUrl = URL.createObjectURL(file);
    const defaultAlt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    root.innerHTML = `<aside class="assistant-drawer v3-upload-drawer"><div class="drawer-head"><div><small>Optimised website image</small><h2>Upload image</h2></div><button class="modal-close" id="v3-upload-close">×</button></div><form id="v3-upload-form" class="drawer-body"><img class="v3-upload-preview" src="${attr(objectUrl)}" alt=""><div class="field"><label>English alternative text</label><input name="alt_en" value="${attr(defaultAlt)}" required><div class="field-help">Describe what is visible, not what you hope the product will do.</div></div><div class="field"><label>Sinhala alternative text</label><input name="alt_si"></div><div class="field"><label>Caption — English</label><input name="caption_en"></div><div class="field"><label>Caption — Sinhala</label><input name="caption_si"></div><div id="v3-upload-status" class="login-status"></div><button class="button button-primary" type="submit">Optimise and upload</button></form></aside>`;
    const close = () => { URL.revokeObjectURL(objectUrl); root.innerHTML = ''; };
    $('#v3-upload-close')?.addEventListener('click', close);
    $('#v3-upload-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true; button.textContent = 'Optimising…';
      try {
        await requireSession();
        const optimised = await optimiseImage(file);
        button.textContent = 'Uploading…';
        const path = `library/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName(optimised.file.name)}`;
        const upload = await state.client.storage.from('site-media').upload(path, optimised.file, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
        if (upload.error) throw upload.error;
        const { data: publicData } = state.client.storage.from('site-media').getPublicUrl(path);
        const record = await state.client.from('media_assets').insert({
          storage_path: path, public_url: publicData.publicUrl, alt_en: form.alt_en.value.trim(), alt_si: form.alt_si.value.trim(),
          caption_en: form.caption_en.value.trim(), caption_si: form.caption_si.value.trim(), mime_type: 'image/webp',
          width: optimised.width, height: optimised.height, original_bytes: file.size, optimized_bytes: optimised.file.size, status: 'published'
        });
        if (record.error) throw record.error;
        notify('Image optimised and uploaded.');
        const url = publicData.publicUrl;
        close(); onUploaded(url);
      } catch (error) {
        $('#v3-upload-status').textContent = error.message || 'Upload failed.';
        button.disabled = false; button.textContent = 'Optimise and upload';
      }
    });
  }

  async function optimiseImage(file) {
    const bitmap = await createImageBitmap(file);
    const max = CONFIG.imageMaxDimension || 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', CONFIG.imageQuality || .82));
    if (!blob) throw new Error('Image optimisation failed.');
    return { file: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }), width, height };
  }

  function safeName(name) { return String(name).normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 100); }

  function boot() {
    client();
    const observer = new MutationObserver(() => {
      ensureNav();
      enhanceExistingEditor($('#modal-root') || document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => { ensureNav(); enhanceExistingEditor(); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
