(() => {
  'use strict';

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const attr = (value = '') => esc(value).replace(/`/g, '&#96;');
  const isSinhala = () => document.documentElement.lang === 'si';

  function refineBrand(root = document) {
    qa('.brand', root).forEach((brand) => {
      if (q('.brand-logo', brand)) return;
      const isFooter = Boolean(brand.closest('.site-footer'));
      brand.innerHTML = `<img class="brand-logo${isFooter ? ' brand-logo-light' : ''}" src="assets/logo.svg" alt="Source Labs">`;
    });
  }

  function arrowIcon() {
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  }

  function refineHero() {
    const hero = q('.hero');
    if (!hero || hero.dataset.refined === '1') return;
    const grid = q('.hero-grid', hero);
    if (!grid) return;

    const oldCopy = grid.firstElementChild;
    const eyebrow = q('.eyebrow', oldCopy)?.textContent?.trim() || '';
    const title = q('.display', oldCopy)?.textContent?.trim() || '';
    const body = q('.lede', oldCopy)?.textContent?.trim() || '';
    const search = q('#hero-search', oldCopy);
    const searchValue = search?.value || '';
    const placeholder = search?.getAttribute('placeholder') || (isSinhala() ? 'ඔබට අවශ්‍ය දේ විස්තර කරන්න' : 'Describe what you need');
    const searchText = q('[data-action="hero-search"]', oldCopy)?.textContent?.trim() || (isSinhala() ? 'සොයන්න' : 'Search');
    const prompts = qa('.prompt-chip', oldCopy).slice(0, 4).map((item) => item.textContent?.trim()).filter(Boolean);
    const buttons = qa('.button-row a', oldCopy).map((item) => ({ href: item.getAttribute('href') || '#', text: item.textContent?.trim() || '' }));
    const si = isSinhala();

    const primary = buttons[0];
    const secondary = buttons[1];
    grid.innerHTML = `
      <div class="hero-copy">
        <div class="hero-kicker"><span></span>${esc(eyebrow)}</div>
        <h1 class="display">${esc(title)}</h1>
        <p class="lede">${esc(body)}</p>
        <div class="hero-search">
          <input id="hero-search" type="search" value="${attr(searchValue)}" placeholder="${attr(placeholder)}" aria-label="${attr(searchText)}">
          <button type="button" data-refined-search>${esc(searchText)} ${arrowIcon()}</button>
        </div>
        <div class="prompt-chips">${prompts.map((prompt) => `<button type="button" class="prompt-chip" data-refined-prompt="${attr(prompt)}">${esc(prompt)}</button>`).join('')}</div>
        <div class="button-row">
          ${primary ? `<a class="button button-primary" href="${attr(primary.href)}">${esc(primary.text)} ${arrowIcon()}</a>` : ''}
          ${secondary ? `<a class="button button-secondary" href="${attr(secondary.href)}">${esc(secondary.text)}</a>` : ''}
        </div>
        <div class="hero-trust">
          <span>${si ? 'අවශ්‍යතාවයෙන් ආරම්භය' : 'Request-first'}</span>
          <span>${si ? 'සාක්ෂි මත පදනම්' : 'Evidence-led'}</span>
          <span>${si ? 'ශ්‍රී ලංකාව කේන්ද්‍ර කරගත්' : 'Sri Lanka focused'}</span>
        </div>
      </div>
      <aside class="hero-brief" aria-label="${si ? 'Source Labs ක්‍රියාවලිය' : 'How Source Labs turns a request into action'}">
        <div class="brief-header">
          <span class="brief-label">${si ? 'මූලාශ්‍ර කෙටි සටහන' : 'SOURCE BRIEF'}</span>
          <span class="brief-status"><i></i>${si ? 'සැකසීමට සූදානම්' : 'Ready to structure'}</span>
        </div>
        <div class="brief-block">
          <small>${si ? 'ඔබට ආරම්භ කළ හැක්කේ' : 'YOU CAN START WITH'}</small>
          <strong>${si ? 'නමක්, ඡායාරූපයක්, සාම්පලයක්, හඬ සටහනක් හෝ භාවිත අරමුණක්' : 'A name, photo, sample, voice note or intended use'}</strong>
        </div>
        <div class="brief-flow">
          <div><b>01</b><span>${si ? 'හඳුනාගන්න' : 'Identify'}</span><small>${si ? 'එය කුමක්ද?' : 'What is it?'}</small></div><i></i>
          <div><b>02</b><span>${si ? 'පිරිවිතර සකස් කරන්න' : 'Specify'}</span><small>${si ? 'එය කළ යුත්තේ කුමක්ද?' : 'What must it do?'}</small></div><i></i>
          <div><b>03</b><span>${si ? 'මූලාශ්‍ර සොයන්න' : 'Source'}</span><small>${si ? 'ගැලපෙන මාර්ගය කුමක්ද?' : 'What route works?'}</small></div>
        </div>
        <div class="brief-output">
          <small>${si ? 'ඔබට ලැබෙන්නේ' : 'YOU RECEIVE'}</small>
          <ul>
            <li>${si ? 'භාවිත කළ හැකි අවශ්‍යතාවයක්' : 'Usable requirement'}</li>
            <li>${si ? 'සසඳිය හැකි මූලාශ්‍ර මාර්ග' : 'Comparable sourcing paths'}</li>
            <li>${si ? 'අවදානම් සහ ඊළඟ පියවර' : 'Risks and next action'}</li>
          </ul>
        </div>
        <div class="brief-footer"><span>Find it. Source it. Build with it.</span><span class="brief-node"></span></div>
      </aside>`;

    const runSearch = () => {
      const value = q('#hero-search', hero)?.value.trim() || '';
      const url = new URL('products.html', location.href);
      if (value) url.searchParams.set('q', value);
      location.href = url.href;
    };
    q('[data-refined-search]', hero)?.addEventListener('click', runSearch);
    q('#hero-search', hero)?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') runSearch();
    });
    qa('[data-refined-prompt]', hero).forEach((button) => button.addEventListener('click', () => {
      const input = q('#hero-search', hero);
      if (!input) return;
      input.value = button.dataset.refinedPrompt || '';
      input.focus();
    }));
    hero.dataset.refined = '1';
  }

  let scheduled = false;
  function refine() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refineBrand();
      refineHero();
    });
  }

  document.addEventListener('DOMContentLoaded', refine);
  window.addEventListener('load', refine);
  const observer = new MutationObserver(refine);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  refine();
})();
