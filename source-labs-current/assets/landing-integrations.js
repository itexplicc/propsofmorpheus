(() => {
  'use strict';
  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const PAGE = document.body?.dataset.page || '';
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const lang = () => localStorage.getItem('sl_lang') === 'si' ? 'si' : 'en';
  const local = (row, field, fallback = '') => row ? String(row[`${field}_${lang()}`] || row[`${field}_en`] || row[`${field}_si`] || row[field] || fallback || '') : fallback;
  let injected = false;

  function addPortalLinks() {
    const footerLinks = document.querySelector('.footer-links');
    if (footerLinks && !footerLinks.querySelector('[data-client-portal-link]')) {
      const link = document.createElement('a'); link.href = 'portal/'; link.dataset.clientPortalLink = '1'; link.textContent = 'Client portal'; footerLinks.appendChild(link);
    }
    const tools = document.querySelector('.header-tools');
    if (tools && !tools.querySelector('[data-client-portal-link]')) {
      const link = document.createElement('a'); link.href='portal/'; link.dataset.clientPortalLink='1'; link.className='v3-client-portal-link'; link.textContent='Client portal'; tools.prepend(link);
    }
  }

  async function integrate() {
    addPortalLinks();
    if (injected || !['products','services','category'].includes(PAGE)) return;
    if (!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
    const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}, global:{headers:{'x-client-info':'source-labs-landing-integrations/1.0'}} });
    const pagesResult = await client.from('landing_pages').select('*').eq('status','published').order('is_pinned',{ascending:false}).order('sort_order');
    if (pagesResult.error) return;
    let pages = pagesResult.data || [];
    let title = PAGE === 'services' ? 'Explore service types' : 'Explore product types';
    let body = 'Choose the closest type. Each page can explain the use, related products or services, images and next action.';
    if (PAGE === 'products') pages = pages.filter((item) => item.page_type === 'product_type');
    if (PAGE === 'services') pages = pages.filter((item) => item.page_type === 'service_type');
    if (PAGE === 'category') {
      const slug = new URLSearchParams(location.search).get('slug') || '';
      const category = await client.from('categories').select('id,name_en,name_si').eq('slug',slug).maybeSingle();
      if (!category.data) return;
      pages = pages.filter((item) => item.category_id === category.data.id);
      title = `Explore types within ${local(category.data,'name')}`;
      body = 'Open a focused page for the exact product or service type you are looking for.';
    }
    if (!pages.length) return;
    const section = document.createElement('section');
    section.className = 'landing-type-discovery';
    section.dataset.landingTypes = '1';
    section.innerHTML = `<div class="shell"><div class="landing-type-head"><p class="eyebrow">Focused pathways</p><h2>${esc(title)}</h2><p>${esc(body)}</p></div><div class="landing-type-grid">${pages.map((item) => `<a class="landing-type-card" href="landing.html?slug=${encodeURIComponent(item.slug)}">${item.hero_image_url ? `<img src="${attr(item.hero_image_url)}" alt="${attr(local(item,'hero_media_alt',local(item,'title')))}">` : `<span class="landing-type-placeholder">${esc((item.page_key || item.slug).slice(0,4).toUpperCase())}</span>`}<div><small>${esc(item.page_type.replace(/_/g,' '))}</small><h3>${esc(local(item,'title'))}</h3><p>${esc(local(item,'summary',local(item,'body')))}</p><b>Explore this page →</b></div></a>`).join('')}</div></div>`;
    const root = document.querySelector('#page-content') || document.querySelector('main');
    const marker = root?.querySelector('.category-discovery-shell,.catalogue-tools,.category-landing-main');
    if (marker?.parentNode) marker.parentNode.insertBefore(section, marker);
    else root?.appendChild(section);
    injected = true;
  }

  const observer = new MutationObserver(() => { addPortalLinks(); integrate(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',integrate);
  setTimeout(integrate,1200); setTimeout(integrate,3000);
})();
