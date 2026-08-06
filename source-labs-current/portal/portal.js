(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const safeName = (value = '') => String(value).normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 100) || 'document';
  const fmtDate = (value, withTime = false) => value ? new Intl.DateTimeFormat(state.lang === 'si' ? 'si-LK' : 'en-LK', withTime ? { dateStyle:'medium', timeStyle:'short' } : { dateStyle:'medium' }).format(new Date(value)) : '—';
  const statusLabel = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const bytes = (value = 0) => Number(value) < 1024 * 1024 ? `${Math.max(1, Math.round(Number(value) / 1024))} KB` : `${(Number(value) / 1024 / 1024).toFixed(1)} MB`;

  const copy = {
    en: {
      overview:'Overview', documents:'Documents', messages:'Messages', reminders:'Deadlines', services:'Next opportunities',
      currentStage:'Current stage', nextAction:'Your next action', advisor:'Your Source Labs advisor', projectTimeline:'Project timeline',
      noMilestones:'No public milestones have been added yet.', noDocuments:'No documents are available yet.', upload:'Upload document',
      open:'Open', download:'Download', requested:'Requested from you', noMessages:'No messages yet. Start the conversation below.',
      send:'Send message', noReminders:'No upcoming deadlines.', noRecommendations:'No related Source Labs recommendations yet.',
      progress:'Progress', target:'Target', status:'Status', notifications:'Notifications', markRead:'Mark all read', account:'Account & password'
    },
    si: {
      overview:'සාරාංශය', documents:'ලේඛන', messages:'පණිවිඩ', reminders:'අවසාන දින', services:'ඊළඟ අවස්ථා',
      currentStage:'වත්මන් අදියර', nextAction:'ඔබේ ඊළඟ ක්‍රියාව', advisor:'ඔබේ Source Labs උපදේශක', projectTimeline:'ව්‍යාපෘති කාලරේඛාව',
      noMilestones:'තවමත් පොදු අදියර එකතු කර නැත.', noDocuments:'තවමත් ලේඛන නොමැත.', upload:'ලේඛනය උඩුගත කරන්න',
      open:'විවෘත කරන්න', download:'බාගන්න', requested:'ඔබෙන් ඉල්ලා ඇත', noMessages:'තවමත් පණිවිඩ නොමැත.',
      send:'පණිවිඩය යවන්න', noReminders:'ඉදිරියේ අවසාන දින නොමැත.', noRecommendations:'තවමත් අදාළ යෝජනා නොමැත.',
      progress:'ප්‍රගතිය', target:'ඉලක්ක දිනය', status:'තත්ත්වය', notifications:'දැනුම්දීම්', markRead:'සියල්ල කියවූ ලෙස සලකන්න', account:'ගිණුම සහ මුරපදය'
    }
  };

  const state = {
    client: null, session: null, user: null, profile: null, projects: [], currentProject: null,
    milestones: [], documents: [], messages: [], reminders: [], recommendations: [], notifications: [],
    tab: 'overview', lang: localStorage.getItem('sl_portal_lang') === 'si' ? 'si' : 'en', simple: localStorage.getItem('sl_portal_simple') === '1'
  };

  const tr = (key) => copy[state.lang]?.[key] || copy.en[key] || key;
  const localized = (row, field, fallback = '') => row ? String(row[`${field}_${state.lang}`] || row[`${field}_en`] || row[`${field}_si`] || row[field] || fallback || '') : fallback;

  function api() {
    if (!state.client && window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
        global: { headers: { 'x-client-info':'source-labs-portal/1.0' } }
      });
    }
    return state.client;
  }

  function announce(message) { const el = $('#portal-announcer'); if (el) el.textContent = message; }
  function toast(message, type = '') { const root = $('#portal-toast-root'); if (!root) return; const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 4200); }
  function setLoginStatus(message) { const el = $('#portal-login-status'); if (el) el.textContent = message || ''; }

  async function boot() {
    applyPreferences();
    const client = api();
    if (!client) return setLoginStatus('Portal configuration is unavailable.');
    bindLogin();
    const { data: { session } } = await client.auth.getSession();
    if (session) await acceptSession(session);
    else showLogin();
    client.auth.onAuthStateChange(async (event, sessionNext) => {
      if (event === 'SIGNED_OUT') showLogin();
      else if (sessionNext && sessionNext.user?.id !== state.user?.id) await acceptSession(sessionNext);
    });
  }

  function bindLogin() {
    $('#portal-show-password')?.addEventListener('change', (event) => { $('#portal-password').type = event.target.checked ? 'text' : 'password'; });
    $('#portal-login-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true; button.textContent = 'Opening…'; setLoginStatus('');
      const result = await api().auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
      if (result.error) { setLoginStatus(result.error.message); button.disabled = false; button.textContent = 'Open dashboard'; return; }
      form.reset(); await acceptSession(result.data.session); button.disabled = false; button.textContent = 'Open dashboard';
    });
    $('#portal-reset-password')?.addEventListener('click', async () => {
      const email = $('#portal-email')?.value.trim();
      if (!email) return setLoginStatus('Enter your email first.');
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await api().auth.resetPasswordForEmail(email, { redirectTo });
      setLoginStatus(error ? error.message : 'Check your email for the password-reset link.');
    });
  }

  async function acceptSession(session) {
    if (!session?.user) return showLogin();
    state.session = session; state.user = session.user;
    try {
      const profileResult = await api().from('client_profiles').select('*').eq('user_id', session.user.id).single();
      if (profileResult.error || !profileResult.data) throw new Error('This account is not connected to a Source Labs client profile.');
      if (profileResult.data.status !== 'active') throw new Error('This portal account is not active. Please contact Source Labs.');
      state.profile = profileResult.data;
      const projectsResult = await api().from('client_projects').select('*').order('updated_at', { ascending:false });
      if (projectsResult.error) throw projectsResult.error;
      state.projects = projectsResult.data || [];
      state.currentProject = state.projects[0] || null;
      showApp(); bindShell(); renderSidebar();
      if (state.currentProject) await loadProject(state.currentProject.id); else renderNoProjects();
      if (session.user.user_metadata?.must_change_password) openAccount(true);
    } catch (error) {
      await api().auth.signOut();
      showLogin(); setLoginStatus(error.message || 'Portal access failed.');
    }
  }

  function showLogin() { state.session = null; state.user = null; $('#portal-login')?.classList.remove('hidden'); $('#portal-app')?.classList.add('hidden'); }
  function showApp() { $('#portal-login')?.classList.add('hidden'); $('#portal-app')?.classList.remove('hidden'); }

  function applyPreferences() {
    document.documentElement.lang = state.lang === 'si' ? 'si' : 'en';
    document.documentElement.classList.toggle('simple-portal', state.simple);
    const language = $('#portal-language'); if (language) language.textContent = state.lang === 'si' ? 'EN' : 'සිං';
    const simple = $('#portal-simple'); if (simple) simple.textContent = state.simple ? 'Standard mode' : 'Simple mode';
  }

  let shellBound = false;
  function bindShell() {
    if (shellBound) return; shellBound = true;
    $('#portal-sidebar-open')?.addEventListener('click', () => $('#portal-sidebar')?.classList.add('open'));
    $('#portal-sidebar-close')?.addEventListener('click', () => $('#portal-sidebar')?.classList.remove('open'));
    $('#portal-logout')?.addEventListener('click', () => api().auth.signOut());
    $('#portal-account-button')?.addEventListener('click', () => openAccount(false));
    $('#portal-language')?.addEventListener('click', () => { state.lang = state.lang === 'en' ? 'si' : 'en'; localStorage.setItem('sl_portal_lang', state.lang); applyPreferences(); renderSidebar(); renderProject(); });
    $('#portal-simple')?.addEventListener('click', () => { state.simple = !state.simple; localStorage.setItem('sl_portal_simple', state.simple ? '1' : '0'); applyPreferences(); });
    $('#portal-notifications-button')?.addEventListener('click', openNotifications);
  }

  function renderSidebar() {
    const profile = state.profile || {};
    $('#portal-client-card').innerHTML = `<strong>${esc(profile.display_name || 'Client')}</strong><span>${esc(profile.company_name || profile.internal_ref || '')}</span>`;
    $('#portal-projects').innerHTML = state.projects.length ? state.projects.map((project) => `<button type="button" data-project="${project.id}" class="${project.id === state.currentProject?.id ? 'active' : ''}" style="--project-accent:${attr(project.accent_color || '#35c7b8')}"><i class="project-dot"></i><span><strong>${esc(project.title)}</strong><small>${esc(project.project_code)} · ${esc(statusLabel(project.status))}</small></span></button>`).join('') : '<p style="padding:10px;color:#7893a1;font-size:.78rem">No projects yet.</p>';
    $$('[data-project]').forEach((button) => button.addEventListener('click', async () => { $('#portal-sidebar')?.classList.remove('open'); await loadProject(button.dataset.project); }));
  }

  async function loadProject(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    state.currentProject = project; state.tab = 'overview'; renderSidebar();
    $('#portal-project-title').textContent = project.title;
    $('#portal-content').innerHTML = '<div class="loading">Loading project information…</div>';
    const [milestones, documents, messages, reminders, recommendations, notifications] = await Promise.all([
      api().from('project_milestones').select('*').eq('project_id', project.id).order('sort_order'),
      api().from('project_documents').select('*').eq('project_id', project.id).order('created_at', { ascending:false }),
      api().from('project_messages').select('*').eq('project_id', project.id).order('created_at'),
      api().from('compliance_reminders').select('*').eq('client_id', state.user.id).or(`project_id.eq.${project.id},project_id.is.null`).order('due_date'),
      api().from('project_recommendations').select('*').eq('project_id', project.id).order('sort_order'),
      api().from('client_notifications').select('*').eq('client_id', state.user.id).order('created_at', { ascending:false }).limit(100),
    ]);
    const failed = [milestones, documents, messages, reminders, recommendations, notifications].find((result) => result.error);
    if (failed) { $('#portal-content').innerHTML = `<div class="empty-state"><h3>Could not load this project</h3><p>${esc(failed.error.message)}</p></div>`; return; }
    state.milestones = milestones.data || []; state.documents = documents.data || []; state.messages = messages.data || [];
    state.reminders = reminders.data || []; state.recommendations = recommendations.data || []; state.notifications = notifications.data || [];
    updateNotificationCount(); renderProject();
  }

  function renderNoProjects() {
    $('#portal-content').innerHTML = `<div class="empty-state"><h3>No active project is connected yet</h3><p>Contact Source Labs if you expected to see a registration, sourcing, packaging or business-build project here.</p><a class="button button-primary" href="../contact.html">Contact Source Labs</a></div>`;
  }

  function renderProject() {
    if (!state.currentProject) return renderNoProjects();
    const project = state.currentProject;
    const content = $('#portal-content');
    const statusMessage = localized(project, 'status_message', project.summary || 'Your Source Labs project is active.');
    const nextAction = localized(project, 'next_action', 'No client action is currently required.');
    const progress = Math.min(100, Math.max(0, Number(project.progress_percent || 0)));
    content.innerHTML = `<section class="project-hero" style="--project-accent:${attr(project.accent_color || '#35c7b8')};--progress:${progress}"><div class="project-hero-content"><div class="project-meta"><span>${esc(statusLabel(project.project_type))}</span><span>${esc(project.project_code)}</span><span>${esc(statusLabel(project.status))}</span></div><h1>${esc(project.title)}</h1><p>${esc(project.summary || statusMessage)}</p></div><div class="progress-ring"><div><strong>${progress}%</strong><small>${esc(tr('progress'))}</small></div></div></section>
      <nav class="project-tabs" aria-label="Project sections">${[['overview',tr('overview')],['documents',tr('documents')],['messages',tr('messages')],['reminders',tr('reminders')],['services',tr('services')]].map(([key,label]) => `<button type="button" data-tab="${key}" class="${state.tab === key ? 'active' : ''}">${esc(label)}</button>`).join('')}</nav>
      <div id="portal-tab-content">${renderTab(statusMessage, nextAction)}</div>`;
    $$('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.tab = button.dataset.tab; $$('[data-tab]').forEach((item) => item.classList.toggle('active', item === button)); $('#portal-tab-content').innerHTML = renderTab(statusMessage, nextAction); bindTab(); }));
    bindTab();
  }

  function renderTab(statusMessage, nextAction) {
    if (state.tab === 'documents') return renderDocuments();
    if (state.tab === 'messages') return renderMessages();
    if (state.tab === 'reminders') return renderReminders();
    if (state.tab === 'services') return renderRecommendations();
    return renderOverview(statusMessage, nextAction);
  }

  function renderOverview(statusMessage, nextAction) {
    const p = state.currentProject;
    return `<div class="overview-grid"><section class="panel"><div class="panel-head"><h2>${esc(tr('currentStage'))}</h2><span class="pill ${attr(p.status)}">${esc(statusLabel(p.status))}</span></div><div class="panel-body status-card"><h2>${esc(p.current_stage || statusLabel(p.status))}</h2><p>${esc(statusMessage)}</p><div class="next-action"><small>${esc(tr('nextAction'))}</small><strong>${esc(nextAction)}</strong></div>${p.target_date ? `<p><strong>${esc(tr('target'))}:</strong> ${esc(fmtDate(p.target_date))}</p>` : ''}<div class="advisor-card"><div class="advisor-avatar">SL</div><div><small>${esc(tr('advisor'))}</small><strong>${esc(p.advisor_name || 'Source Labs team')}</strong><small>${esc(p.advisor_contact || 'Use Messages to contact the team')}</small></div></div></div></section><section class="panel"><div class="panel-head"><h2>${esc(tr('projectTimeline'))}</h2></div><div class="panel-body"><div class="timeline">${state.milestones.length ? state.milestones.map(milestoneHtml).join('') : `<div class="empty-state"><p>${esc(tr('noMilestones'))}</p></div>`}</div></div></section></div>`;
  }

  function milestoneHtml(item) {
    return `<article class="milestone ${attr(item.status)}"><i class="milestone-dot"></i><div><h3>${esc(localized(item, 'title'))}</h3>${localized(item, 'description') ? `<p>${esc(localized(item, 'description'))}</p>` : ''}<div class="milestone-meta"><span class="pill ${attr(item.status)}">${esc(statusLabel(item.status))}</span>${item.due_date ? `<span class="pill">${esc(fmtDate(item.due_date))}</span>` : ''}${item.requires_client_action ? `<span class="pill awaiting_client">${esc(tr('requested'))}</span>` : ''}</div></div></article>`;
  }

  function renderDocuments() {
    const requested = state.documents.filter((doc) => doc.requires_client_upload && ['requested','rejected'].includes(doc.status));
    return `<section class="panel"><div class="panel-head"><h2>${esc(tr('documents'))}</h2><label class="button button-accent button-small">${esc(tr('upload'))}<input id="general-document-upload" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx" hidden></label></div><div class="panel-body">${requested.length ? `<div class="next-action" style="margin-bottom:16px"><small>${esc(tr('requested'))}</small><strong>${esc(requested.map((item) => item.title).join(' · '))}</strong></div>` : ''}<div class="data-list">${state.documents.length ? state.documents.map(documentRow).join('') : `<div class="empty-state"><p>${esc(tr('noDocuments'))}</p></div>`}</div></div></section>`;
  }

  function documentRow(doc) {
    const canDownload = doc.storage_path && doc.downloadable_by_client;
    return `<article class="data-row"><div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><h3>${esc(doc.title)}</h3><span class="pill ${attr(doc.status)}">${esc(statusLabel(doc.status))}</span></div><p>${esc(doc.description || doc.original_name || doc.document_type)}${doc.file_size ? ` · ${esc(bytes(doc.file_size))}` : ''}${doc.due_date ? ` · Due ${esc(fmtDate(doc.due_date))}` : ''}</p>${doc.review_note ? `<small>${esc(doc.review_note)}</small>` : ''}</div><div class="row-actions">${canDownload ? `<button class="button button-secondary button-small" type="button" data-download-document="${doc.id}">${esc(tr('download'))}</button>` : ''}${doc.requires_client_upload && ['requested','rejected'].includes(doc.status) ? `<label class="button button-primary button-small">${esc(tr('upload'))}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx" data-upload-request="${doc.id}" hidden></label>` : ''}</div></article>`;
  }

  function renderMessages() {
    return `<section class="panel"><div class="panel-head"><h2>${esc(tr('messages'))}</h2></div><div class="panel-body"><div id="message-thread" class="message-thread">${state.messages.length ? state.messages.map(messageHtml).join('') : `<div class="empty-state"><p>${esc(tr('noMessages'))}</p></div>`}</div><form id="message-form" class="message-compose"><textarea name="body" maxlength="6000" required placeholder="Write a message to your Source Labs advisor"></textarea><button class="button button-primary" type="submit">${esc(tr('send'))}</button></form></div></section>`;
  }

  function messageHtml(item) {
    return `<article class="message ${attr(item.sender_role)}"><p>${esc(item.body)}</p><small>${esc(item.sender_role === 'client' ? (state.profile?.display_name || 'You') : item.sender_role === 'admin' ? 'Source Labs' : 'System')} · ${esc(fmtDate(item.created_at, true))}</small></article>`;
  }

  function renderReminders() {
    return `<div class="reminder-grid">${state.reminders.length ? state.reminders.map((item) => `<article class="reminder-card"><time>${esc(fmtDate(item.due_date))}</time><h3>${esc(localized(item, 'title'))}</h3><p>${esc(localized(item, 'description'))}</p><span class="pill ${attr(item.status)}">${esc(statusLabel(item.status))}</span>${item.action_url ? `<div style="margin-top:12px"><a class="button button-secondary button-small" href="${attr(item.action_url)}">Open action</a></div>` : ''}</article>`).join('') : `<div class="empty-state" style="grid-column:1/-1"><p>${esc(tr('noReminders'))}</p></div>`}</div>`;
  }

  function renderRecommendations() {
    return `<div class="recommendation-grid">${state.recommendations.length ? state.recommendations.map((item) => `<article class="recommendation-card">${item.image_url ? `<img src="${attr(item.image_url)}" alt="">` : ''}<span class="pill">Source Labs</span><h3>${esc(localized(item, 'title'))}</h3><p>${esc(localized(item, 'description'))}</p>${item.cta_url ? `<a class="button button-primary button-small" href="${attr(item.cta_url)}">${esc(localized(item, 'cta_label', 'Learn more'))}</a>` : ''}</article>`).join('') : `<div class="empty-state" style="grid-column:1/-1"><p>${esc(tr('noRecommendations'))}</p></div>`}</div>`;
  }

  function bindTab() {
    $$('[data-download-document]').forEach((button) => button.addEventListener('click', () => downloadDocument(button.dataset.downloadDocument)));
    $$('[data-upload-request]').forEach((input) => input.addEventListener('change', () => uploadDocument(input.files?.[0], input.dataset.uploadRequest)));
    $('#general-document-upload')?.addEventListener('change', (event) => uploadDocument(event.target.files?.[0], ''));
    $('#message-form')?.addEventListener('submit', sendMessage);
    const thread = $('#message-thread'); if (thread) thread.scrollTop = thread.scrollHeight;
  }

  async function downloadDocument(id) {
    const doc = state.documents.find((item) => item.id === id);
    if (!doc?.storage_path) return;
    const { data, error } = await api().storage.from('client-documents').createSignedUrl(doc.storage_path, 900);
    if (error || !data?.signedUrl) return toast(error?.message || 'Document could not be opened.', 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function uploadDocument(file, requestId) {
    if (!file || !state.currentProject) return;
    if (file.size > 15 * 1024 * 1024) return toast('Files must be 15 MB or less.', 'error');
    const allowed = new Set(['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    if (!allowed.has(file.type)) return toast('This file type is not allowed.', 'error');
    toast('Uploading document…');
    const path = `${state.currentProject.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload = await api().storage.from('client-documents').upload(path, file, { contentType:file.type, upsert:false, cacheControl:'3600' });
    if (upload.error) return toast(upload.error.message, 'error');
    const requested = state.documents.find((item) => item.id === requestId);
    const record = {
      project_id: state.currentProject.id, uploaded_by: state.user.id, document_type: requested?.document_type || 'client_upload',
      title: requested?.title || file.name, description: requested?.description || '', storage_path:path, original_name:file.name,
      mime_type:file.type, file_size:file.size, status:'uploaded', upload_source:'client', visible_to_client:true,
      downloadable_by_client:true, requires_client_upload:false
    };
    const inserted = await api().from('project_documents').insert(record).select('*').single();
    if (inserted.error) { await api().storage.from('client-documents').remove([path]); return toast(inserted.error.message, 'error'); }
    if (requested) await api().from('project_documents').update({ status:'superseded', review_note:'Client uploaded a replacement document.' }).eq('id', requested.id);
    toast('Document uploaded successfully.'); await loadProject(state.currentProject.id); state.tab = 'documents'; renderProject();
  }

  async function sendMessage(event) {
    event.preventDefault();
    const form = event.currentTarget; const body = form.body.value.trim();
    if (!body) return;
    const button = form.querySelector('button'); button.disabled = true;
    const result = await api().from('project_messages').insert({ project_id:state.currentProject.id, sender_id:state.user.id, sender_role:'client', body, visible_to_client:true }).select('*').single();
    button.disabled = false;
    if (result.error) return toast(result.error.message, 'error');
    state.messages.push(result.data); form.reset(); $('#message-thread').innerHTML = state.messages.map(messageHtml).join(''); const thread = $('#message-thread'); thread.scrollTop = thread.scrollHeight;
  }

  function updateNotificationCount() {
    const unread = state.notifications.filter((item) => !item.read_at).length;
    const count = $('#portal-notification-count'); if (count) count.textContent = String(unread);
  }

  function openNotifications() {
    const root = $('#portal-modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="portal-modal"><div class="modal-head"><h2>${esc(tr('notifications'))}</h2><button class="icon-button modal-close" type="button">×</button></div><div class="modal-body"><div class="notification-list">${state.notifications.length ? state.notifications.map((item) => `<article class="notification-item ${item.read_at ? '' : 'unread'}"><h3>${esc(localized(item, 'title'))}</h3><p>${esc(localized(item, 'body'))}</p><small>${esc(fmtDate(item.created_at, true))}</small>${item.action_url ? `<div style="margin-top:8px"><a class="button button-secondary button-small" href="${attr(item.action_url)}">Open</a></div>` : ''}</article>`).join('') : '<div class="empty-state">No notifications.</div>'}</div></div><div class="modal-foot"><button id="mark-notifications-read" class="button button-secondary" type="button">${esc(tr('markRead'))}</button></div></div></div>`;
    $('.modal-close', root)?.addEventListener('click', () => root.innerHTML = '');
    $('#mark-notifications-read')?.addEventListener('click', async () => { const ids = state.notifications.filter((item) => !item.read_at).map((item) => item.id); if (ids.length) await api().from('client_notifications').update({ read_at:new Date().toISOString() }).in('id', ids); state.notifications.forEach((item) => { if (!item.read_at) item.read_at = new Date().toISOString(); }); updateNotificationCount(); root.innerHTML = ''; });
  }

  function openAccount(forceChange) {
    const root = $('#portal-modal-root');
    root.innerHTML = `<div class="modal-backdrop"><form class="portal-modal" id="account-form"><div class="modal-head"><h2>${esc(tr('account'))}</h2>${forceChange ? '' : '<button class="icon-button modal-close" type="button">×</button>'}</div><div class="modal-body"><p class="muted">${forceChange ? 'Change the temporary password before continuing.' : 'Update your password and basic contact details.'}</p><label class="field"><span>Display name</span><input name="display_name" value="${attr(state.profile?.display_name || '')}" required></label><label class="field"><span>Phone</span><input name="phone" value="${attr(state.profile?.phone || '')}"></label><label class="field"><span>New password ${forceChange ? '(required)' : '(optional)'}</span><input name="password" type="password" minlength="12" ${forceChange ? 'required' : ''}></label><label class="field"><span>Confirm new password</span><input name="confirm" type="password" minlength="12" ${forceChange ? 'required' : ''}></label><div id="account-status" class="form-status"></div></div><div class="modal-foot"><button class="button button-primary" type="submit">Save account</button></div></form></div>`;
    $('.modal-close', root)?.addEventListener('click', () => root.innerHTML = '');
    $('#account-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const status = $('#account-status');
      if (form.password.value && form.password.value !== form.confirm.value) return status.textContent = 'Passwords do not match.';
      if (forceChange && form.password.value.length < 12) return status.textContent = 'Use at least 12 characters.';
      const profileUpdate = await api().from('client_profiles').update({ display_name:form.display_name.value.trim(), phone:form.phone.value.trim() }).eq('user_id', state.user.id).select('*').single();
      if (profileUpdate.error) return status.textContent = profileUpdate.error.message;
      state.profile = profileUpdate.data;
      if (form.password.value) {
        const authUpdate = await api().auth.updateUser({ password:form.password.value, data:{ ...state.user.user_metadata, must_change_password:false } });
        if (authUpdate.error) return status.textContent = authUpdate.error.message;
        state.user = authUpdate.data.user;
      }
      root.innerHTML = ''; renderSidebar(); toast('Account updated.'); announce('Account updated');
    });
  }

  boot().catch((error) => setLoginStatus(error.message || 'Portal failed to start.'));
})();
