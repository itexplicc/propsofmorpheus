const menu=document.querySelector('.menu-toggle');const nav=document.getElementById('site-nav');function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});const filters=[...document.querySelectorAll('[data-filter]')];const cards=[...document.querySelectorAll('[data-industry]')];filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));cards.forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.industry!==button.dataset.filter);const n=cards.filter(c=>!c.hidden).length;document.getElementById('work-count').textContent=n+' selected project'+(n===1?'':'s');}));document.querySelectorAll('.image-viewport img,.concept-visual img').forEach(img=>{const failed=()=>{img.hidden=true;const fallback=img.parentElement.querySelector('.image-fallback');if(fallback)fallback.hidden=false;};img.addEventListener('error',failed);if(img.complete&&!img.naturalWidth)failed();});document.querySelectorAll('[data-package]').forEach(a=>a.addEventListener('click',()=>{const radio=document.querySelector('input[name="package"][value="'+a.dataset.package+'"]');if(radio)radio.checked=true;}));
const form = document.getElementById('inquiry-form');
const formStatus = document.getElementById('form-status');
let submitting = false;
let requestState = null;
try { requestState = JSON.parse(sessionStorage.getItem('morpheus_business_inquiry_request') || 'null'); } catch (_) {}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach(element => element.remove());
  form.querySelectorAll('[aria-invalid]').forEach(element => { element.removeAttribute('aria-invalid'); element.removeAttribute('aria-describedby'); });
}
function showFieldError(input,message,target) {
  const error = document.createElement('p');
  error.className = 'field-error';
  error.id = 'error-' + (input.id || input.name);
  error.textContent = message;
  input.setAttribute('aria-invalid','true');
  input.setAttribute('aria-describedby',error.id);
  if (input.type === 'checkbox') input.closest('.consent').insertAdjacentElement('afterend',error);
  else (target || input.parentElement).appendChild(error);
}
function setStatus(message,error=false,withEmail=false) {
  formStatus.replaceChildren();
  formStatus.classList.toggle('error',error);
  formStatus.append(document.createTextNode(message));
  if (withEmail) {
    const link = document.createElement('a');
    link.href = 'mailto:info@morpheuspd.io?subject=Website%20project%20inquiry';
    link.textContent = 'info@morpheuspd.io';
    formStatus.append(link,document.createTextNode('.'));
  }
}
function validateForm() {
  clearErrors();
  const fields = {
    name:'Please enter your name.',
    email:'Please enter a valid email address.',
    business:'Please enter your business name.',
    message:'Please share at least 10 characters about the project.'
  };
  let firstInvalid = null;
  for (const [name,message] of Object.entries(fields)) {
    const input = form.elements.namedItem(name);
    const value = input.value.trim();
    const invalid = !value || (name === 'email' && !input.validity.valid) || (name === 'message' && value.length < 10) || value.length > input.maxLength;
    if (invalid) { showFieldError(input,message); firstInvalid ||= input; }
  }
  const selected = form.querySelector('input[name="package"]:checked');
  if (!selected) {
    const input = form.querySelector('input[name="package"]');
    showFieldError(input,'Please choose a package or “Let’s discuss”.',form.querySelector('.package-picker'));
    firstInvalid ||= input;
  }
  const consent = form.elements.namedItem('privacy_consent');
  if (!consent.checked) { showFieldError(consent,'Please agree to the privacy notice so we can respond.',consent.closest('.consent').parentElement); firstInvalid ||= consent; }
  if (firstInvalid) { setStatus('Please check the highlighted fields.',true); firstInvalid.focus(); return false; }
  return true;
}
function createUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,8) + '-' + hex.slice(8,12) + '-' + hex.slice(12,16) + '-' + hex.slice(16,20) + '-' + hex.slice(20);
}
async function requestKey(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  const signature = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2,'0')).join('');
  if (!requestState || requestState.signature !== signature) requestState = {signature,key:createUUID()};
  try { sessionStorage.setItem('morpheus_business_inquiry_request',JSON.stringify(requestState)); } catch (_) {}
  return requestState.key;
}
if (form && formStatus) {
  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (submitting || !validateForm()) return;
    submitting = true;
    const button = form.querySelector('.submit-button');
    const buttonLabel = button.querySelector('span');
    button.disabled = true;
    buttonLabel.textContent = 'Sending your idea…';
    form.setAttribute('aria-busy','true');
    setStatus('Submitting your inquiry…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),25000);
    try {
      const payload = {
        name:form.elements.namedItem('name').value.trim(),
        email:form.elements.namedItem('email').value.trim(),
        business:form.elements.namedItem('business').value.trim(),
        website:form.elements.namedItem('website').value.trim(),
        package:form.querySelector('input[name="package"]:checked').value,
        message:form.elements.namedItem('message').value.trim(),
        privacy_consent:form.elements.namedItem('privacy_consent').checked,
        company_url:form.elements.namedItem('company_url').value,
        source:'business-reimagined'
      };
      payload.idempotency_key = await requestKey(payload);
      const response = await fetch('/business-reimagined/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':payload.idempotency_key},body:JSON.stringify(payload),signal:controller.signal});
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.status !== 'recorded') {
        if (response.status === 429) setStatus('We couldn’t submit your inquiry just now. Please wait a moment and try again, or email ',true,true);
        else setStatus('Your inquiry wasn’t confirmed. Please try again or email ',true,true);
        return;
      }
      const notified = ['sent','confirmed'].includes(result.notification_status);
      setStatus(notified ? 'Thank you — your inquiry is recorded and our team has been notified by email. We’ll review your idea and get back to you.' : 'Thank you — your inquiry is recorded. Our team will review your idea and get back to you.');
      form.reset();
      clearErrors();
      requestState = null;
      try { sessionStorage.removeItem('morpheus_business_inquiry_request'); } catch (_) {}
      formStatus.focus();
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'We couldn’t confirm the submission in time. Please retry; your request is protected against duplicate submissions. You can also email ' : 'The submission couldn’t be confirmed. Please check your connection and retry, or email ',true,true);
    } finally {
      clearTimeout(timeout);
      submitting = false;
      button.disabled = false;
      buttonLabel.textContent = 'Send your idea';
      form.removeAttribute('aria-busy');
    }
  });
}