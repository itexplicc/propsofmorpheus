(() => {
  'use strict';

  const CONFIG = window.SOURCE_LABS_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const attr = (value = '') => esc(String(value)).replace(/`/g, '&#96;');
  const nice = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const fmt = (value) => value ? new Intl.DateTimeFormat('en-LK', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)) : '—';
  const safeName = (value = '') => String(value).normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 100) || 'document';
  const state = { client:null, session:null, clients:[], projects:[], selectedClient:null, selectedProject:null, tab:'overview', data:{} };

  function api() {
    if (!state.client && window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
        global:{ headers:{ 'x-client-info':'source-labs-portal-admin/1.0' } }
      });
    }
    return state.client;
  }

  function notify(message, type = 'success') {
    const root = $('#toast-stack'); if (!root) return;
    const item = document.createElement('div'); item.className = `toast ${type}`; item.textContent = message; root.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  async function requireSession() {
    const client = api(); if (!client) throw new Error('Admin backend unavailable.');
    const { data:{ session }, error } = await client.auth.getSession();
    if (error || !session) throw new Error('Sign in to Source Labs Admin first.');
    if (session.user?.app_metadata?.role !== 'admin') throw new Error('Admin access required.');
    state.session = session; return session;
  }

  function ensureNav() {
    const nav = $('#admin-navigation');
    if (!nav || $('#portal-admin-button')) return;
    const group = document.createElement('div'); group.className = 'nav-group portal-admin-nav-group';
    group.innerHTML = `<div class="nav-label">Client operations</div><nav class="admin-nav"><button id="portal-admin-button" type="button"><span class="nav-dot"></span>Advisor client portal</button></nav>`;
    nav.appendChild(group);
    $('#portal-admin-button')?.addEventListener('click', async () => {
      document.body.classList.remove('sidebar-open');
      $$('#admin-navigation button').forEach((button) => button.classList.remove('active'));
      $('#portal-admin-button').classList.add('active');
      try { await renderManager(); } catch (error) { renderError(error); }
    });
  }

  function renderError(error) {
    const content = $('#admin-content'); if (!content) return;
    content.innerHTML = `<div class="empty"><h2>Could not load the client portal</h2><p>${esc(error.message || 'Unknown error')}</p></div>`;
  }

  async function loadBase() {
    await requireSession();
    const [clients, projects] = await Promise.all([
      api().from('client_profiles').select('*').order('created_at', { ascending:false }),
      api().from('client_projects').select('*').order('updated_at', { ascending:false })
    ]);
    if (clients.error) throw clients.error; if (projects.error) throw projects.error;
    state.clients = clients.data || []; state.projects = projects.data || [];
    if (state.selectedClient) state.selectedClient = state.clients.find((item) => item.user_id === state.selectedClient.user_id) || null;
    if (!state.selectedClient && state.clients.length) state.selectedClient = state.clients[0];
  }

  async function renderManager() {
    await loadBase();
    $('#topbar-title').textContent = 'Advisor client portal';
    $('#topbar-subtitle').textContent = 'Clients, projects, progress and secure documents';
    const content = $('#admin-content');
    content.innerHTML = `<div class="view-head"><div><h1>Advisor client portal</h1><p>Give each client a secure progress dashboard, private documents, advisor messages, compliance reminders and relevant Source Labs next steps.</p></div><div class="head-actions"><button id="portal-new-client" class="button button-accent">+ Create client access</button><a class="button button-secondary" href="../portal/" target="_blank" rel="noopener">Open client portal ↗</a></div></div><div class="portal-admin-layout"><section class="portal-admin-list"><div class="portal-admin-list-head"><h2>Clients</h2><span class="pill">${state.clients.length}</span></div><div class="portal-client-search"><input id="portal-client-search" type="search" placeholder="Search client or company"></div><div id="portal-client-list" class="portal-client-list">${clientRows(state.clients)}</div></section><section class="portal-admin-workspace" id="portal-admin-workspace">${state.selectedClient ? clientWorkspace(state.selectedClient) : '<div class="empty"><h2>No clients yet</h2><p>Create client access to begin.</p></div>'}</section></div>`;
    $('#portal-new-client')?.addEventListener('click', openCreateClient);
    $('#portal-client-search')?.addEventListener('input', (event) => { const q = event.target.value.toLowerCase(); $('#portal-client-list').innerHTML = clientRows(state.clients.filter((item) => [item.display_name,item.company_name,item.internal_ref,item.phone].join(' ').toLowerCase().includes(q))); bindClientRows(); });
    bindClientRows(); bindClientWorkspace();
  }

  function clientRows(rows) {
    if (!rows.length) return '<div class="empty">No clients match this view.</div>';
    return rows.map((client) => `<button class="portal-client-row ${client.user_id === state.selectedClient?.user_id ? 'active' : ''}" type="button" data-client="${client.user_id}"><span class="portal-client-avatar">${esc((client.display_name || 'CL').split(/\s+/).map((v) => v[0]).join('').slice(0,2).toUpperCase())}</span><span><strong>${esc(client.display_name)}</strong><small>${esc(client.company_name || client.internal_ref || '')}</small></span><span class="pill ${attr(client.status)}">${esc(client.status)}</span></button>`).join('');
  }

  function bindClientRows() {
    $$('[data-client]').forEach((button) => button.addEventListener('click', () => {
      state.selectedClient = state.clients.find((item) => item.user_id === button.dataset.client) || null;
      state.selectedProject = null; renderManager();
    }));
  }

  function clientWorkspace(client) {
    const projects = state.projects.filter((project) => project.primary_client_id === client.user_id);
    return `<div class="portal-admin-workspace-head"><div><small>${esc(client.internal_ref || 'Client')}</small><h2>${esc(client.display_name)}</h2></div><div class="row-actions"><button id="portal-edit-client" class="button button-secondary button-small">Edit client</button><button id="portal-reset-client" class="button button-secondary button-small">Reset password</button><button id="portal-new-project" class="button button-primary button-small">+ New project</button></div></div><div class="portal-admin-workspace-body"><div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="stat"><div class="stat-label">Company</div><div class="stat-value" style="font-size:1.1rem">${esc(client.company_name || '—')}</div></div><div class="stat"><div class="stat-label">Projects</div><div class="stat-value">${projects.length}</div></div><div class="stat"><div class="stat-label">Status</div><div class="stat-value" style="font-size:1.1rem">${esc(nice(client.status))}</div></div></div><div class="portal-project-grid">${projects.length ? projects.map(projectCard).join('') : '<div class="empty" style="grid-column:1/-1">No projects for this client.</div>'}</div></div>`;
  }

  function projectCard(project) {
    return `<article class="portal-project-card"><div style="display:flex;justify-content:space-between;gap:8px"><span class="pill ${attr(project.status)}">${esc(nice(project.status))}</span><small>${esc(project.project_code)}</small></div><h3>${esc(project.title)}</h3><p>${esc(project.current_stage || project.summary || nice(project.project_type))}</p><div class="portal-project-progress"><i style="--progress:${Number(project.progress_percent || 0)}%"></i></div><div class="portal-project-actions"><button class="button button-primary button-small" data-open-project="${project.id}">Manage project</button><a class="button button-secondary button-small" href="../portal/" target="_blank" rel="noopener">Portal ↗</a></div></article>`;
  }

  function bindClientWorkspace() {
    $('#portal-edit-client')?.addEventListener('click', () => openClientEditor(state.selectedClient));
    $('#portal-reset-client')?.addEventListener('click', () => resetClientPassword(state.selectedClient));
    $('#portal-new-project')?.addEventListener('click', () => openProjectEditor(null));
    $$('[data-open-project]').forEach((button) => button.addEventListener('click', () => openProject(button.dataset.openProject)));
  }

  function modal(content) {
    const root = $('#modal-root'); root.innerHTML = `<div class="modal-backdrop">${content}</div>`;
    const close = () => root.innerHTML = '';
    $('.modal-close', root)?.addEventListener('click', close); $('.modal-cancel', root)?.addEventListener('click', close);
    $('.modal-backdrop', root)?.addEventListener('click', (event) => { if (event.target === event.currentTarget) close(); });
    return { root, close };
  }

  function openCreateClient() {
    const { root, close } = modal(`<form class="admin-modal" id="portal-create-client-form"><div class="modal-head"><div><small>Advisor portal</small><h2>Create client access</h2></div><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-admin-form-grid"><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Client name</label><input name="display_name" required></div><div class="field"><label>Company name</label><input name="company_name"></div><div class="field"><label>Phone</label><input name="phone"></div><div class="field"><label>Internal reference</label><input name="internal_ref" placeholder="CLI-0001"></div><div class="field"><label>Language</label><select name="preferred_language"><option value="en">English</option><option value="si">Sinhala</option></select></div><div class="field full"><label>Temporary password (optional)</label><input name="temporary_password" type="text" minlength="12" placeholder="Leave blank to generate securely"><p class="field-help">The password is displayed once after creation. Share it through an approved private channel.</p></div></div><div id="portal-client-create-status" class="login-status"></div></div><div class="modal-foot"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button class="button button-primary" type="submit">Create access</button></div></form>`);
    $('#portal-create-client-form', root)?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const save = form.querySelector('button[type="submit"]'); save.disabled = true; save.textContent = 'Creating…';
      const body = Object.fromEntries(new FormData(form)); body.action = 'create_client';
      try {
        const result = await invokePortalAdmin(body);
        form.innerHTML = `<div class="modal-head"><div><small>Client access created</small><h2>${esc(result.profile.display_name)}</h2></div><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-credential-box"><strong>Temporary credentials — copy now</strong><p class="field-help">This password is not stored in the dashboard.</p><code>${esc(body.email)}</code><code>${esc(result.temporary_password)}</code></div></div><div class="modal-foot"><button id="portal-copy-credentials" class="button button-secondary" type="button">Copy credentials</button><button id="portal-client-created-done" class="button button-primary" type="button">Done</button></div>`;
        $('#portal-copy-credentials')?.addEventListener('click', () => navigator.clipboard.writeText(`Source Labs Client Portal\nEmail: ${body.email}\nTemporary password: ${result.temporary_password}\nPortal: ${CONFIG.publicBaseUrl}portal/`));
        $('#portal-client-created-done')?.addEventListener('click', async () => { close(); await renderManager(); });
        $('.modal-close', root)?.addEventListener('click', async () => { close(); await renderManager(); });
      } catch (error) { $('#portal-client-create-status', root).textContent = error.message; save.disabled = false; save.textContent = 'Create access'; }
    });
  }

  async function invokePortalAdmin(body) {
    await requireSession();
    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/portal-admin`, { method:'POST', headers:{ 'content-type':'application/json', apikey:CONFIG.supabaseKey, authorization:`Bearer ${state.session.access_token}` }, body:JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Portal action failed.');
    return result;
  }

  function openClientEditor(client) {
    if (!client) return;
    const { root, close } = modal(`<form class="admin-modal" id="portal-client-edit-form"><div class="modal-head"><h2>Edit client</h2><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-admin-form-grid"><div class="field"><label>Client name</label><input name="display_name" value="${attr(client.display_name)}" required></div><div class="field"><label>Company</label><input name="company_name" value="${attr(client.company_name || '')}"></div><div class="field"><label>Phone</label><input name="phone" value="${attr(client.phone || '')}"></div><div class="field"><label>Language</label><select name="preferred_language"><option value="en" ${client.preferred_language === 'en' ? 'selected' : ''}>English</option><option value="si" ${client.preferred_language === 'si' ? 'selected' : ''}>Sinhala</option></select></div><div class="field"><label>Status</label><select name="status">${['active','invited','suspended','archived'].map((s) => `<option value="${s}" ${client.status === s ? 'selected' : ''}>${nice(s)}</option>`).join('')}</select></div><div class="field"><label>Internal reference</label><input name="internal_ref" value="${attr(client.internal_ref || '')}"></div><div class="field full"><label>Internal notes</label><textarea name="notes">${esc(client.notes || '')}</textarea></div></div><div id="portal-client-edit-status" class="login-status"></div></div><div class="modal-foot"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button class="button button-primary" type="submit">Save client</button></div></form>`);
    $('#portal-client-edit-form', root)?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const payload = Object.fromEntries(new FormData(form));
      const result = await api().from('client_profiles').update(payload).eq('user_id', client.user_id);
      if (result.error) return $('#portal-client-edit-status', root).textContent = result.error.message;
      await invokePortalAdmin({ action:'set_client_status', user_id:client.user_id, status:payload.status });
      notify('Client updated.'); close(); await renderManager();
    });
  }

  async function resetClientPassword(client) {
    if (!client || !confirm(`Reset the portal password for ${client.display_name}?`)) return;
    try {
      const result = await invokePortalAdmin({ action:'reset_password', user_id:client.user_id });
      const { root, close } = modal(`<div class="admin-modal"><div class="modal-head"><h2>Temporary password created</h2><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-credential-box"><strong>Copy this password now</strong><code>${esc(result.temporary_password)}</code></div></div><div class="modal-foot"><button id="portal-copy-reset" class="button button-secondary">Copy</button><button class="button button-primary modal-cancel">Done</button></div></div>`);
      $('#portal-copy-reset', root)?.addEventListener('click', () => navigator.clipboard.writeText(result.temporary_password));
    } catch (error) { notify(error.message, 'error'); }
  }

  function openProjectEditor(project) {
    if (!state.selectedClient) return;
    const row = project || {};
    const { root, close } = modal(`<form class="admin-modal" id="portal-project-form"><div class="modal-head"><div><small>${esc(state.selectedClient.display_name)}</small><h2>${project ? 'Edit project' : 'Create project'}</h2></div><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-admin-form-grid"><div class="field"><label>Project code</label><input name="project_code" value="${attr(row.project_code || `PRJ-${Date.now().toString().slice(-7)}`)}" required></div><div class="field"><label>Project type</label><select name="project_type">${['business_registration','import_export','product_sourcing','packaging','business_build','other'].map((v) => `<option value="${v}" ${row.project_type === v ? 'selected' : ''}>${nice(v)}</option>`).join('')}</select></div><div class="field full"><label>Title</label><input name="title" value="${attr(row.title || 'Business registration advisory')}" required></div><div class="field full"><label>Summary</label><textarea name="summary">${esc(row.summary || '')}</textarea></div><div class="field"><label>Status</label><select name="status">${['new','awaiting_documents','in_review','submitted','in_progress','client_action','completed','on_hold','cancelled','archived'].map((v) => `<option value="${v}" ${row.status === v ? 'selected' : ''}>${nice(v)}</option>`).join('')}</select></div><div class="field"><label>Progress %</label><input name="progress_percent" type="number" min="0" max="100" value="${Number(row.progress_percent || 0)}"></div><div class="field"><label>Current stage</label><input name="current_stage" value="${attr(row.current_stage || '')}"></div><div class="field"><label>Target date</label><input name="target_date" type="date" value="${attr(row.target_date || '')}"></div><div class="field"><label>Advisor name</label><input name="advisor_name" value="${attr(row.advisor_name || 'Source Labs team')}"></div><div class="field"><label>Advisor contact</label><input name="advisor_contact" value="${attr(row.advisor_contact || '')}"></div><div class="field"><label>Accent colour</label><input name="accent_color" type="color" value="${attr(row.accent_color || '#35c7b8')}"></div><div class="field"><label>Cover image URL</label><input name="cover_image_url" value="${attr(row.cover_image_url || '')}"></div><div class="field"><label>Status message — English</label><textarea name="status_message_en">${esc(row.status_message_en || '')}</textarea></div><div class="field"><label>Status message — Sinhala</label><textarea name="status_message_si">${esc(row.status_message_si || '')}</textarea></div><div class="field"><label>Next action — English</label><textarea name="next_action_en">${esc(row.next_action_en || '')}</textarea></div><div class="field"><label>Next action — Sinhala</label><textarea name="next_action_si">${esc(row.next_action_si || '')}</textarea></div></div><div id="portal-project-status" class="login-status"></div></div><div class="modal-foot"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button class="button button-primary" type="submit">Save project</button></div></form>`);
    $('#portal-project-form', root)?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); data.progress_percent = Number(data.progress_percent || 0); data.primary_client_id = state.selectedClient.user_id;
      Object.keys(data).forEach((key) => { if (data[key] === '') data[key] = null; });
      const result = project ? await api().from('client_projects').update(data).eq('id', project.id) : await api().from('client_projects').insert(data);
      if (result.error) return $('#portal-project-status', root).textContent = result.error.message;
      notify('Project saved.'); close(); await renderManager();
    });
  }

  async function openProject(id) {
    state.selectedProject = state.projects.find((item) => item.id === id) || null; state.tab = 'overview';
    if (!state.selectedProject) return;
    await loadProjectData(); renderProjectWorkspace();
  }

  async function loadProjectData() {
    const id = state.selectedProject.id;
    const [milestones, documents, messages, reminders, recommendations, notifications] = await Promise.all([
      api().from('project_milestones').select('*').eq('project_id', id).order('sort_order'),
      api().from('project_documents').select('*').eq('project_id', id).order('created_at', { ascending:false }),
      api().from('project_messages').select('*').eq('project_id', id).order('created_at'),
      api().from('compliance_reminders').select('*').eq('client_id', state.selectedClient.user_id).or(`project_id.eq.${id},project_id.is.null`).order('due_date'),
      api().from('project_recommendations').select('*').eq('project_id', id).order('sort_order'),
      api().from('client_notifications').select('*').eq('client_id', state.selectedClient.user_id).order('created_at', { ascending:false })
    ]);
    const failed = [milestones,documents,messages,reminders,recommendations,notifications].find((r) => r.error); if (failed) throw failed.error;
    state.data = { milestones:milestones.data||[], documents:documents.data||[], messages:messages.data||[], reminders:reminders.data||[], recommendations:recommendations.data||[], notifications:notifications.data||[] };
  }

  function renderProjectWorkspace() {
    const p = state.selectedProject; const content = $('#admin-content');
    $('#topbar-title').textContent = p.title; $('#topbar-subtitle').textContent = `${p.project_code} · ${nice(p.status)}`;
    content.innerHTML = `<div class="view-head"><div><p class="pill">${esc(nice(p.project_type))}</p><h1>${esc(p.title)}</h1><p>${esc(p.summary || p.current_stage || '')}</p></div><div class="head-actions"><button id="portal-back-clients" class="button button-secondary">← Clients</button><button id="portal-edit-project" class="button button-primary">Edit project</button><a class="button button-secondary" href="../portal/" target="_blank" rel="noopener">Client view ↗</a></div></div><div class="portal-workspace-tabs">${[['overview','Overview'],['milestones','Milestones'],['documents','Documents'],['messages','Messages'],['reminders','Reminders'],['recommendations','Recommendations'],['notifications','Notifications']].map(([key,label]) => `<button data-portal-tab="${key}" class="${state.tab === key ? 'active' : ''}">${label}</button>`).join('')}</div><div id="portal-workspace-content">${workspaceTab()}</div>`;
    $('#portal-back-clients')?.addEventListener('click', () => { state.selectedProject = null; renderManager(); });
    $('#portal-edit-project')?.addEventListener('click', () => openProjectEditor(p));
    $$('[data-portal-tab]').forEach((button) => button.addEventListener('click', () => { state.tab = button.dataset.portalTab; $$('[data-portal-tab]').forEach((b) => b.classList.toggle('active', b === button)); $('#portal-workspace-content').innerHTML = workspaceTab(); bindWorkspaceTab(); }));
    bindWorkspaceTab();
  }

  function workspaceTab() {
    if (state.tab === 'milestones') return listSection('Milestones', 'Add milestone', state.data.milestones, milestoneItem);
    if (state.tab === 'documents') return documentWorkspace();
    if (state.tab === 'messages') return messageWorkspace();
    if (state.tab === 'reminders') return listSection('Compliance reminders', 'Add reminder', state.data.reminders, reminderItem);
    if (state.tab === 'recommendations') return listSection('Related Source Labs services', 'Add recommendation', state.data.recommendations, recommendationItem);
    if (state.tab === 'notifications') return listSection('Client notifications', 'Send notification', state.data.notifications, notificationItem);
    const p = state.selectedProject;
    return `<div class="stats"><div class="stat"><div class="stat-label">Progress</div><div class="stat-value">${Number(p.progress_percent || 0)}%</div></div><div class="stat"><div class="stat-label">Milestones</div><div class="stat-value">${state.data.milestones.length}</div></div><div class="stat"><div class="stat-label">Documents</div><div class="stat-value">${state.data.documents.length}</div></div><div class="stat"><div class="stat-label">Messages</div><div class="stat-value">${state.data.messages.length}</div></div></div><div class="panel-grid"><section class="panel"><div class="panel-head"><h2>Current client view</h2></div><div class="panel-body"><p><strong>${esc(p.current_stage || nice(p.status))}</strong></p><p>${esc(p.status_message_en || p.summary || '')}</p><div class="detail-box"><h3>Next client action</h3><p>${esc(p.next_action_en || 'No action required.')}</p></div></div></section><section class="panel"><div class="panel-head"><h2>Advisor</h2></div><div class="panel-body"><p><strong>${esc(p.advisor_name || 'Source Labs team')}</strong></p><p>${esc(p.advisor_contact || 'Not configured')}</p><p>Target: ${esc(p.target_date || 'Not set')}</p></div></section></div>`;
  }

  function listSection(title, addLabel, rows, renderItem) {
    return `<section class="portal-admin-section"><div class="portal-admin-section-head"><h3>${esc(title)}</h3><button class="button button-primary button-small" id="portal-add-record">+ ${esc(addLabel)}</button></div><div class="portal-admin-items">${rows.length ? rows.map(renderItem).join('') : '<div class="empty">No records yet.</div>'}</div></section>`;
  }

  const milestoneItem = (r) => `<article class="portal-admin-item"><div><strong>${esc(r.title_en)}</strong><small>${esc(nice(r.status))}${r.due_date ? ` · ${esc(r.due_date)}` : ''}${r.requires_client_action ? ' · Client action' : ''}</small></div><div class="row-actions"><button class="icon-button" data-edit-milestone="${r.id}">✎</button><button class="icon-button" data-delete-record="project_milestones:${r.id}">×</button></div></article>`;
  const reminderItem = (r) => `<article class="portal-admin-item"><div><strong>${esc(r.title_en)}</strong><small>${esc(r.due_date)} · ${esc(nice(r.status))}</small></div><div class="row-actions"><button class="icon-button" data-edit-reminder="${r.id}">✎</button><button class="icon-button" data-delete-record="compliance_reminders:${r.id}">×</button></div></article>`;
  const recommendationItem = (r) => `<article class="portal-admin-item"><div><strong>${esc(r.title_en)}</strong><small>${esc(nice(r.status))} · ${esc(r.cta_url || 'No link')}</small></div><div class="row-actions"><button class="icon-button" data-edit-recommendation="${r.id}">✎</button><button class="icon-button" data-delete-record="project_recommendations:${r.id}">×</button></div></article>`;
  const notificationItem = (r) => `<article class="portal-admin-item"><div><strong>${esc(r.title_en)}</strong><small>${esc(fmt(r.created_at))} · ${r.read_at ? 'Read' : 'Unread'}</small></div><div class="row-actions"><button class="icon-button" data-delete-record="client_notifications:${r.id}">×</button></div></article>`;

  function documentWorkspace() {
    return `<section class="portal-admin-section"><div class="portal-admin-section-head"><h3>Project documents</h3><div class="row-actions"><button id="portal-request-document" class="button button-secondary button-small">Request document</button><label class="button button-primary button-small">Upload file<input id="portal-admin-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx" hidden></label></div></div><div class="portal-admin-items">${state.data.documents.length ? state.data.documents.map((r) => `<article class="portal-admin-item"><div><strong>${esc(r.title)}</strong><small>${esc(nice(r.status))} · ${esc(r.original_name || r.document_type)}${r.file_size ? ` · ${Math.round(r.file_size/1024)} KB` : ''}</small></div><div class="row-actions">${r.storage_path ? `<button class="button button-secondary button-small" data-open-admin-document="${r.id}">Open</button>` : ''}<button class="icon-button" data-edit-document="${r.id}">✎</button><button class="icon-button" data-delete-document="${r.id}">×</button></div></article>`).join('') : '<div class="empty">No documents.</div>'}</div></section>`;
  }

  function messageWorkspace() {
    return `<section class="panel"><div class="panel-head"><h2>Client conversation</h2></div><div class="panel-body"><div class="portal-admin-message-list">${state.data.messages.length ? state.data.messages.map((r) => `<article class="portal-admin-message ${attr(r.sender_role)}"><p>${esc(r.body)}</p><small>${esc(nice(r.sender_role))} · ${esc(fmt(r.created_at))}</small></article>`).join('') : '<div class="empty">No messages yet.</div>'}</div><form id="portal-admin-message-form" class="field" style="margin-top:14px"><label>Message visible to client</label><textarea name="body" required maxlength="6000"></textarea><button class="button button-primary" type="submit">Send message</button></form></div></section>`;
  }

  function bindWorkspaceTab() {
    $('#portal-add-record')?.addEventListener('click', () => {
      if (state.tab === 'milestones') openMilestoneEditor(null);
      if (state.tab === 'reminders') openReminderEditor(null);
      if (state.tab === 'recommendations') openRecommendationEditor(null);
      if (state.tab === 'notifications') openNotificationEditor();
    });
    $$('[data-edit-milestone]').forEach((b) => b.addEventListener('click', () => openMilestoneEditor(state.data.milestones.find((r) => r.id === b.dataset.editMilestone))));
    $$('[data-edit-reminder]').forEach((b) => b.addEventListener('click', () => openReminderEditor(state.data.reminders.find((r) => r.id === b.dataset.editReminder))));
    $$('[data-edit-recommendation]').forEach((b) => b.addEventListener('click', () => openRecommendationEditor(state.data.recommendations.find((r) => r.id === b.dataset.editRecommendation))));
    $$('[data-delete-record]').forEach((b) => b.addEventListener('click', () => { const [table,id] = b.dataset.deleteRecord.split(':'); deleteRecord(table,id); }));
    $('#portal-request-document')?.addEventListener('click', () => openDocumentEditor(null, true));
    $('#portal-admin-file')?.addEventListener('change', (event) => uploadAdminDocument(event.target.files?.[0]));
    $$('[data-open-admin-document]').forEach((b) => b.addEventListener('click', () => openAdminDocument(b.dataset.openAdminDocument)));
    $$('[data-edit-document]').forEach((b) => b.addEventListener('click', () => openDocumentEditor(state.data.documents.find((r) => r.id === b.dataset.editDocument), false)));
    $$('[data-delete-document]').forEach((b) => b.addEventListener('click', () => deleteDocument(b.dataset.deleteDocument)));
    $('#portal-admin-message-form')?.addEventListener('submit', sendAdminMessage);
  }

  function simpleEditor(title, fields, row, saveHandler) {
    const { root, close } = modal(`<form class="admin-modal" id="portal-simple-editor"><div class="modal-head"><h2>${esc(title)}</h2><button class="modal-close" type="button">×</button></div><div class="modal-body"><div class="portal-admin-form-grid">${fields.map((f) => fieldHtml(f,row)).join('')}</div><div id="portal-editor-status" class="login-status"></div></div><div class="modal-foot"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button class="button button-primary" type="submit">Save</button></div></form>`);
    $('#portal-simple-editor', root)?.addEventListener('submit', async (event) => { event.preventDefault(); try { await saveHandler(Object.fromEntries(new FormData(event.currentTarget))); close(); await loadProjectData(); renderProjectWorkspace(); } catch (error) { $('#portal-editor-status', root).textContent = error.message; } });
  }

  function fieldHtml(f,row={}) {
    const value = row?.[f.name] ?? f.default ?? '';
    const cls = f.full ? 'field full' : 'field';
    if (f.type === 'textarea') return `<div class="${cls}"><label>${esc(f.label)}</label><textarea name="${f.name}">${esc(value)}</textarea></div>`;
    if (f.type === 'select') return `<div class="${cls}"><label>${esc(f.label)}</label><select name="${f.name}">${f.options.map((v) => `<option value="${attr(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(nice(v))}</option>`).join('')}</select></div>`;
    if (f.type === 'checkbox') return `<div class="${cls}"><label class="toggle"><input type="checkbox" name="${f.name}" ${value ? 'checked' : ''}> ${esc(f.label)}</label></div>`;
    return `<div class="${cls}"><label>${esc(f.label)}</label><input name="${f.name}" type="${f.type || 'text'}" value="${attr(value)}" ${f.required ? 'required' : ''}></div>`;
  }

  function openMilestoneEditor(row) {
    simpleEditor(row ? 'Edit milestone' : 'Add milestone', [
      {name:'title_en',label:'Title — English',required:true},{name:'title_si',label:'Title — Sinhala'},
      {name:'description_en',label:'Description — English',type:'textarea'},{name:'description_si',label:'Description — Sinhala',type:'textarea'},
      {name:'status',label:'Status',type:'select',options:['pending','in_progress','awaiting_client','completed','blocked','skipped'],default:'pending'},
      {name:'due_date',label:'Due date',type:'date'},{name:'sort_order',label:'Order',type:'number',default:0},
      {name:'requires_client_action',label:'Requires client action',type:'checkbox'},{name:'visible_to_client',label:'Visible to client',type:'checkbox',default:true}
    ], row, async (data) => { data.project_id = state.selectedProject.id; data.sort_order = Number(data.sort_order||0); data.requires_client_action = Boolean(data.requires_client_action); data.visible_to_client = Boolean(data.visible_to_client); const result = row ? await api().from('project_milestones').update(data).eq('id',row.id) : await api().from('project_milestones').insert(data); if(result.error)throw result.error; notify('Milestone saved.'); });
  }

  function openReminderEditor(row) {
    simpleEditor(row ? 'Edit reminder' : 'Add reminder', [
      {name:'title_en',label:'Title — English',required:true},{name:'title_si',label:'Title — Sinhala'},
      {name:'description_en',label:'Description — English',type:'textarea'},{name:'description_si',label:'Description — Sinhala',type:'textarea'},
      {name:'due_date',label:'Due date',type:'date',required:true},{name:'status',label:'Status',type:'select',options:['upcoming','due','completed','dismissed','overdue'],default:'upcoming'},
      {name:'recurrence',label:'Recurrence',type:'select',options:['none','monthly','quarterly','yearly'],default:'none'},
      {name:'action_url',label:'Action URL',full:true},{name:'visible_to_client',label:'Visible to client',type:'checkbox',default:true}
    ], row, async (data) => { data.project_id = state.selectedProject.id; data.client_id = state.selectedClient.user_id; data.visible_to_client = Boolean(data.visible_to_client); const result = row ? await api().from('compliance_reminders').update(data).eq('id',row.id) : await api().from('compliance_reminders').insert(data); if(result.error)throw result.error; notify('Reminder saved.'); });
  }

  function openRecommendationEditor(row) {
    simpleEditor(row ? 'Edit recommendation' : 'Add recommendation', [
      {name:'title_en',label:'Title — English',required:true},{name:'title_si',label:'Title — Sinhala'},
      {name:'description_en',label:'Description — English',type:'textarea'},{name:'description_si',label:'Description — Sinhala',type:'textarea'},
      {name:'image_url',label:'Image URL',full:true},{name:'cta_label_en',label:'CTA — English'},{name:'cta_label_si',label:'CTA — Sinhala'},
      {name:'cta_url',label:'CTA URL',full:true},{name:'status',label:'Status',type:'select',options:['active','accepted','dismissed','expired'],default:'active'},
      {name:'sort_order',label:'Order',type:'number',default:0},{name:'visible_to_client',label:'Visible to client',type:'checkbox',default:true}
    ], row, async (data) => { data.project_id = state.selectedProject.id; data.sort_order = Number(data.sort_order||0); data.visible_to_client = Boolean(data.visible_to_client); const result = row ? await api().from('project_recommendations').update(data).eq('id',row.id) : await api().from('project_recommendations').insert(data); if(result.error)throw result.error; notify('Recommendation saved.'); });
  }

  function openNotificationEditor() {
    simpleEditor('Send notification', [
      {name:'title_en',label:'Title — English',required:true},{name:'title_si',label:'Title — Sinhala'},
      {name:'body_en',label:'Message — English',type:'textarea'},{name:'body_si',label:'Message — Sinhala',type:'textarea'},
      {name:'notification_type',label:'Type',default:'update'},{name:'action_url',label:'Action URL',full:true}
    ], {}, async (data) => { data.client_id = state.selectedClient.user_id; data.project_id = state.selectedProject.id; const result = await api().from('client_notifications').insert(data); if(result.error)throw result.error; notify('Notification sent.'); });
  }

  function openDocumentEditor(row, requested) {
    simpleEditor(row ? 'Edit document record' : 'Request a document', [
      {name:'title',label:'Document title',required:true},{name:'document_type',label:'Document type',default:'other'},
      {name:'description',label:'Description / instructions',type:'textarea',full:true},{name:'status',label:'Status',type:'select',options:['requested','uploaded','under_review','accepted','rejected','superseded'],default:requested?'requested':'uploaded'},
      {name:'due_date',label:'Due date',type:'date'},{name:'review_note',label:'Review note',type:'textarea'},
      {name:'visible_to_client',label:'Visible to client',type:'checkbox',default:true},{name:'downloadable_by_client',label:'Client can download',type:'checkbox',default:true},
      {name:'requires_client_upload',label:'Requires client upload',type:'checkbox',default:requested}
    ], row, async (data) => { data.project_id = state.selectedProject.id; data.upload_source = row?.upload_source || 'admin'; data.visible_to_client = Boolean(data.visible_to_client); data.downloadable_by_client = Boolean(data.downloadable_by_client); data.requires_client_upload = Boolean(data.requires_client_upload); const result = row ? await api().from('project_documents').update(data).eq('id',row.id) : await api().from('project_documents').insert(data); if(result.error)throw result.error; notify('Document record saved.'); });
  }

  async function uploadAdminDocument(file) {
    if (!file) return; if (file.size > 15*1024*1024) return notify('File must be 15 MB or less.','error');
    const path = `${state.selectedProject.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload = await api().storage.from('client-documents').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'}); if(upload.error)return notify(upload.error.message,'error');
    const result = await api().from('project_documents').insert({ project_id:state.selectedProject.id, uploaded_by:state.session.user.id, document_type:'advisor_document', title:file.name, storage_path:path, original_name:file.name, mime_type:file.type, file_size:file.size, status:'uploaded', upload_source:'admin', visible_to_client:true, downloadable_by_client:true, requires_client_upload:false });
    if(result.error){await api().storage.from('client-documents').remove([path]);return notify(result.error.message,'error')} notify('Document uploaded.'); await loadProjectData(); renderProjectWorkspace();
  }

  async function openAdminDocument(id) { const doc=state.data.documents.find((r)=>r.id===id); if(!doc?.storage_path)return; const {data,error}=await api().storage.from('client-documents').createSignedUrl(doc.storage_path,900); if(error)return notify(error.message,'error'); window.open(data.signedUrl,'_blank','noopener'); }
  async function deleteDocument(id) { const doc=state.data.documents.find((r)=>r.id===id); if(!doc||!confirm('Delete this document record and stored file?'))return; if(doc.storage_path)await api().storage.from('client-documents').remove([doc.storage_path]); const {error}=await api().from('project_documents').delete().eq('id',id); if(error)return notify(error.message,'error'); notify('Document deleted.'); await loadProjectData(); renderProjectWorkspace(); }
  async function sendAdminMessage(event) { event.preventDefault(); const form=event.currentTarget; const body=form.body.value.trim(); if(!body)return; const {error}=await api().from('project_messages').insert({project_id:state.selectedProject.id,sender_id:state.session.user.id,sender_role:'admin',body,visible_to_client:true}); if(error)return notify(error.message,'error'); form.reset(); notify('Message sent.'); await loadProjectData(); renderProjectWorkspace(); }
  async function deleteRecord(table,id) { if(!confirm('Delete this record?'))return; const {error}=await api().from(table).delete().eq('id',id); if(error)return notify(error.message,'error'); notify('Record deleted.'); await loadProjectData(); renderProjectWorkspace(); }

  const observer = new MutationObserver(() => ensureNav());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',ensureNav); setInterval(ensureNav,1200);
})();
