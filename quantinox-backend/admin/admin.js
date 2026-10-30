/* Quantinox admin dashboard. Plain JavaScript, no build step. All data is inserted with
   textContent (never as HTML), so nothing a visitor types into a form can run here. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var ME = null;
  var TYPES = { demo: 'Demo', assistant_demo: 'Demo (AI)', callback: 'Call back', contact: 'Contact', event: 'Event', trial: 'Trial', download: 'Download' };
  var STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'];

  // ---------- helpers
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(function (x) { add(el, x); }); else el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }
  function api(path, opts) {
    opts = opts || {};
    return fetch('/api/admin' + path, {
      method: opts.method || 'GET', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Admin': '1' },
      // Writes always carry a JSON body: the server refuses an empty body sent as application/json
      body: opts.body ? JSON.stringify(opts.body) : (opts.method && opts.method !== 'GET' ? '{}' : undefined)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && path !== '/login' && path !== '/me') { ME = null; renderLogin(); throw new Error('unauthorized'); }
        if (!r.ok) { var e = new Error(data.error || 'error'); e.status = r.status; e.data = data; throw e; }
        return data;
      });
    });
  }
  function errText(e) {
    if (e.data && e.data.fields && e.data.fields.length) return e.data.fields.map(function (f) { return f.message; }).join(' ');
    return { invalid_credentials: 'Wrong email or password.', rate_limited: 'Too many attempts. Try again in a few minutes.', forbidden: 'Your role cannot do this.', invalid_code: 'That code is not right.', totp_required: 'Enter the 6-digit code from your authenticator app.' }[e.message] || 'Something went wrong (' + e.message + ').';
  }
  var dt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var dshort = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
  function fmt(s) { return s ? dt.format(new Date(s)) : '—'; }
  function tag(text, cls) { return h('span', { class: 'tag ' + (cls || ''), text: text }); }
  function qs(obj) { var p = []; Object.keys(obj).forEach(function (k) { if (obj[k] !== '' && obj[k] !== undefined && obj[k] !== null) p.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])); }); return p.length ? '?' + p.join('&') : ''; }
  function can(role) { return { viewer: 1, editor: 2, owner: 3 }[ME.role] >= { viewer: 1, editor: 2, owner: 3 }[role]; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  // ---------- login
  function renderLogin(needCode) {
    app.className = '';
    var err = h('p', { class: 'err', hidden: true });
    var code = h('label', { hidden: !needCode }, '2FA code', h('input', { name: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6' }));
    var form = h('form', { novalidate: true },
      h('div', { class: 'brand' }, h('i', { text: 'Q' }), 'QUANTINOX'),
      h('h1', { text: 'Admin sign in' }),
      h('label', null, 'Email', h('input', { name: 'email', type: 'email', autocomplete: 'username', required: true })),
      h('label', null, 'Password', h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
      code, err, h('button', { class: 'btn primary', type: 'submit', text: 'Sign in' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var body = { email: form.email.value.trim(), password: form.password.value };
      if (!code.hidden) body.code = form.code.value.trim();
      api('/login', { method: 'POST', body: body }).then(function (r) { ME = r.admin; route(); }).catch(function (e2) {
        if (e2.message === 'totp_required') { code.hidden = false; form.code.focus(); }
        err.textContent = errText(e2); err.hidden = false;
      });
    });
    app.replaceChildren(h('div', { class: 'login' }, form));
    form.email.focus();
  }

  // ---------- shell
  var NAV = [['dashboard', 'Dashboard'], ['leads', 'Leads'], ['customers', 'Customers'], ['subscribers', 'Newsletter'], ['feedback', 'Quanta AI feedback'], ['insights', 'AI insights'], ['emails', 'Emails & webhooks'], ['audit', 'Audit log', 'owner'], ['settings', 'Settings']];
  var mainEl, sideEl;
  function shell(active) {
    sideEl = h('nav', { class: 'side', 'aria-label': 'Admin' },
      h('div', { class: 'brand' }, h('i', { text: 'Q' }), 'QUANTINOX'),
      NAV.filter(function (n) { return !n[2] || can(n[2]); }).map(function (n) {
        return h('a', { href: '#/' + n[0], class: n[0] === active ? 'on' : '', id: 'nav-' + n[0] }, n[1]);
      }),
      h('div', { class: 'me' }, h('div', { text: ME.name }), h('div', { class: 'muted', text: ME.email + ' · ' + ME.role }),
        h('button', { class: 'btn sm', type: 'button', onclick: function () { api('/logout', { method: 'POST' }).then(function () { ME = null; renderLogin(); }); } }, 'Sign out')));
    mainEl = h('main');
    app.className = '';
    app.replaceChildren(h('div', { class: 'shell' }, sideEl, mainEl));
    sideEl.addEventListener('click', function (e) { if (e.target.tagName === 'A') sideEl.classList.remove('open'); });
  }
  function top(title, actions) {
    return h('div', { class: 'top' },
      h('div', { class: 'row' }, h('button', { class: 'btn sm menu-btn', type: 'button', onclick: function () { sideEl.classList.toggle('open'); } }, '☰'), h('h1', { text: title })),
      h('div', { class: 'row' }, actions || null));
  }

  // ---------- dashboard
  function viewDashboard() {
    mainEl.replaceChildren(top('Dashboard'), h('p', { class: 'muted', text: 'Loading…' }));
    api('/stats').then(function (s) {
      var delta = s.leads.prev7 ? Math.round((s.leads.last7 - s.leads.prev7) / s.leads.prev7 * 100) : null;
      var newCount = document.getElementById('nav-leads'); if (newCount && s.leads.newOpen) newCount.appendChild(h('span', { class: 'count', text: s.leads.newOpen }));
      var kpi = function (label, value, sub, cls) { return h('div', { class: 'card kpi' }, h('div', { class: 'muted', text: label }), h('div', { class: 'v', text: value }), h('div', { class: 's ' + (cls || ''), text: sub || '' })); };
      var fb = s.assistant.good + s.assistant.bad;
      mainEl.replaceChildren(top('Dashboard', h('a', { class: 'btn primary', href: '#/leads?status=new' }, 'Open new leads')),
        h('div', { class: 'grid' },
          kpi('Leads, last 7 days', s.leads.last7, delta === null ? 'No data for the week before' : (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '% vs previous 7 days', delta >= 0 ? 'up' : 'down'),
          kpi('Waiting for first contact', s.leads.newOpen, s.leads.gradeA + ' open grade A leads'),
          kpi('Leads, last 30 days', s.leads.last30, s.leads.won + ' won in total'),
          kpi('Customer accounts', s.customers.total, s.customers.verified + ' confirmed · ' + s.customers.last30 + ' new in 30 days'),
          kpi('Newsletter', s.subscribers.active, s.subscribers.pending + ' waiting for confirmation'),
          kpi('Quanta AI', s.assistant.messagesToday + ' today', fb ? Math.round(s.assistant.good / fb * 100) + '% helpful (' + fb + ' ratings)' : 'No ratings yet'),
          kpi('Emails & webhooks', s.jobs.pending + ' queued', s.jobs.failed ? s.jobs.failed + ' failed: check Emails' : 'No failures', s.jobs.failed ? 'down' : 'up')),
        h('div', { class: 'two' },
          h('div', { class: 'card chart' }, h('h2', { text: 'Leads per day (30 days)' }), dayChart(s.leads.byDay)),
          h('div', { class: 'card' }, h('h2', { text: 'By form' }), barList(s.leads.byType.map(function (r) { return [TYPES[r.type] || r.type, r.n]; })))),
        h('div', { class: 'grid', style: 'margin-top:14px' },
          h('div', { class: 'card' }, h('h2', { text: 'Pipeline' }), barList(STATUSES.map(function (st) { var r = s.leads.byStatus.filter(function (x) { return x.status === st; })[0]; return [st, r ? r.n : 0]; }))),
          h('div', { class: 'card' }, h('h2', { text: 'Modules asked about (90 days)' }), barList(s.leads.topModules.map(function (r) { return [r.module, r.n]; }))),
          h('div', { class: 'card' }, h('h2', { text: 'Language' }), barList(s.leads.byLang.map(function (r) { return [r.lang === 'hi' ? 'Hindi' : 'English', r.n]; })))));
    });
  }
  function dayChart(rows, label) {
    var map = {}; rows.forEach(function (r) { map[r.day] = r.n; });
    var days = []; for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, map[d] || 0]); }
    var max = Math.max(1, Math.max.apply(null, days.map(function (x) { return x[1]; })));
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 600 180'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', (label || 'Leads per day') + ' for the last 30 days, total ' + days.reduce(function (a, x) { return a + x[1]; }, 0));
    days.forEach(function (x, i) {
      var bh = Math.round(x[1] / max * 140), r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', i * 20 + 3); r.setAttribute('y', 150 - bh); r.setAttribute('width', 14); r.setAttribute('height', Math.max(bh, 1)); r.setAttribute('rx', 3);
      r.setAttribute('fill', x[1] ? '#2F54EB' : 'rgba(127,140,170,.25)');
      var t = document.createElementNS(ns, 'title'); t.textContent = dshort.format(new Date(x[0])) + ': ' + x[1]; r.appendChild(t);
      svg.appendChild(r);
      if ((i % 7 === 0 && i < 26) || i === 29) { var tx = document.createElementNS(ns, 'text'); tx.setAttribute('x', i * 20 + 10); tx.setAttribute('y', 172); tx.setAttribute('font-size', 11); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('fill', '#8F9AB2'); tx.textContent = dshort.format(new Date(x[0])); svg.appendChild(tx); }
    });
    return svg;
  }
  function barList(pairs) {
    if (!pairs.length) return h('p', { class: 'muted', text: 'No data yet.' });
    var max = Math.max(1, Math.max.apply(null, pairs.map(function (p) { return p[1]; })));
    return h('div', { class: 'bars' }, pairs.map(function (p) { return h('div', { class: 'bar' }, h('span', { text: p[0] }), h('span', { class: 't' }, h('i', { style: 'width:' + Math.round(p[1] / max * 100) + '%' })), h('strong', { text: p[1] })); }));
  }

  // ---------- leads
  var leadFilters = { q: '', status: '', type: '', grade: '', from: '', to: '', sort: 'newest', page: 1 };
  function viewLeads(params) {
    Object.keys(params).forEach(function (k) { if (k in leadFilters) leadFilters[k] = params[k]; });
    var f = leadFilters;
    var sel = function (name, opts, label) { return h('label', null, label, h('select', { name: name, onchange: change }, opts.map(function (o) { return h('option', { value: o[0], selected: f[name] === o[0] }, o[1]); }))); };
    var q = h('input', { name: 'q', type: 'search', value: f.q, placeholder: 'Name, email, company, phone…' });
    var timer; q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(change, 300); });
    function change() {
      var form = mainEl.querySelector('.filters');
      ['status', 'type', 'grade', 'sort'].forEach(function (k) { f[k] = form.querySelector('[name=' + k + ']').value; });
      f.q = q.value.trim(); f.from = form.querySelector('[name=from]').value; f.to = form.querySelector('[name=to]').value; f.page = 1; load();
    }
    var csv = h('a', { class: 'btn', href: '#', download: '' }, 'Export CSV');
    mainEl.replaceChildren(top('Leads', csv),
      h('div', { class: 'filters' },
        h('label', { class: 'grow' }, 'Search', q),
        sel('status', [['', 'All (no spam)']].concat(STATUSES.map(function (s) { return [s, s]; })), 'Status'),
        sel('type', [['', 'All forms']].concat(Object.keys(TYPES).map(function (t) { return [t, TYPES[t]]; })), 'Form'),
        sel('grade', [['', 'All'], ['A', 'A'], ['B', 'B'], ['C', 'C']], 'Grade'),
        h('label', null, 'From', h('input', { type: 'date', name: 'from', value: f.from, onchange: change })),
        h('label', null, 'To', h('input', { type: 'date', name: 'to', value: f.to, onchange: change })),
        sel('sort', [['newest', 'Newest'], ['score', 'Best score'], ['oldest', 'Oldest']], 'Sort')),
      h('div', { class: 'table-wrap', id: 'leads-table' }, h('p', { class: 'empty', text: 'Loading…' })));
    function load() {
      var query = { q: f.q, status: f.status, type: f.type, grade: f.grade, from: f.from, to: f.to, sort: f.sort, page: f.page, pageSize: 25 };
      csv.href = '/api/admin/leads/export.csv' + qs(Object.assign({}, query, { page: '', pageSize: '' }));
      api('/leads' + qs(query)).then(function (r) {
        var wrap = document.getElementById('leads-table');
        if (!r.items.length) { wrap.replaceChildren(h('p', { class: 'empty', text: 'No leads match these filters.' })); return; }
        wrap.replaceChildren(h('table', null,
          h('thead', null, h('tr', null, ['Received', 'Name', 'Contact', 'Form', 'Grade', 'Status'].map(function (t) { return h('th', { text: t }); }))),
          h('tbody', null, r.items.map(function (l) {
            return h('tr', { tabindex: '0', onclick: function () { location.hash = '#/leads/' + l.id; }, onkeydown: function (e) { if (e.key === 'Enter') location.hash = '#/leads/' + l.id; } },
              h('td', { text: fmt(l.created_at) }),
              h('td', null, h('strong', { text: ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || '—' }), h('div', { class: 'muted', text: l.company || '' })),
              h('td', null, h('div', { text: l.email }), h('div', { class: 'muted', text: l.phone || '' })),
              h('td', null, TYPES[l.type] || l.type, l.lang === 'hi' ? h('span', { class: 'muted', text: ' · हिन्दी' }) : null),
              h('td', null, tag(l.grade + ' · ' + l.score, 'g-' + l.grade)),
              h('td', null, tag(l.status, 's-' + l.status)));
          }))),
          pager(r, function (p) { f.page = p; load(); }));
      });
    }
    load();
  }
  function pager(r, go) {
    var pages = Math.max(1, Math.ceil(r.total / r.pageSize));
    return h('div', { class: 'pager' }, h('span', { text: r.total + ' result' + (r.total === 1 ? '' : 's') }),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', disabled: r.page <= 1, onclick: function () { go(r.page - 1); } }, '‹ Previous'),
        h('span', { text: 'Page ' + r.page + ' of ' + pages }),
        h('button', { class: 'btn sm', type: 'button', disabled: r.page >= pages, onclick: function () { go(r.page + 1); } }, 'Next ›')));
  }
  function openLead(id) {
    var bg = h('div', { class: 'drawer-bg', onclick: close });
    var dr = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Lead details' }, h('p', { class: 'muted', text: 'Loading…' }));
    function close() { bg.remove(); dr.remove(); document.removeEventListener('keydown', esc); if (location.hash.indexOf('#/leads/') === 0) history.replaceState(null, '', '#/leads'); }
    function esc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    document.body.appendChild(bg); document.body.appendChild(dr);
    function load() {
      api('/leads/' + id).then(function (r) {
        var l = r.lead;
        var name = ((l.first_name || '') + ' ' + (l.last_name || '')).trim() || l.email;
        var status = h('select', { 'aria-label': 'Status', disabled: !can('editor') }, STATUSES.map(function (s) { return h('option', { value: s, selected: s === l.status }, s); }));
        var note = h('textarea', { placeholder: 'Add a note (call summary, next step…)', disabled: !can('editor') });
        var msg = h('p', { class: 'okmsg', hidden: true });
        var save = function () {
          var body = {}; if (status.value !== l.status) body.status = status.value; if (note.value.trim()) body.note = note.value.trim();
          if (!Object.keys(body).length) return;
          api('/leads/' + l.id, { method: 'PATCH', body: body }).then(function () { load(); }).catch(function (e) { msg.className = 'err'; msg.textContent = errText(e); msg.hidden = false; });
        };
        var details = Object.keys(l.details || {}).map(function (k) { return [k.replace(/_/g, ' '), l.details[k]]; });
        var phone = digits(l.phone);
        dr.replaceChildren(
          h('div', { class: 'top' }, h('div', null, h('h2', { text: name }), h('div', { class: 'row' }, tag(TYPES[l.type] || l.type), tag(l.grade + ' · ' + l.score, 'g-' + l.grade), tag(l.status, 's-' + l.status))),
            h('button', { class: 'btn sm', type: 'button', onclick: close, 'aria-label': 'Close' }, '✕')),
          h('div', { class: 'row' },
            h('a', { class: 'btn sm', href: 'mailto:' + l.email }, 'Email'),
            phone ? h('a', { class: 'btn sm', href: 'tel:+' + (phone.length === 10 ? '91' + phone : phone) }, 'Call') : null,
            phone ? h('a', { class: 'btn sm', href: 'https://wa.me/' + (phone.length === 10 ? '91' + phone : phone), target: '_blank', rel: 'noopener' }, 'WhatsApp') : null,
            r.customer ? tag(r.customer.email_verified_at ? 'Has an account' : 'Account not confirmed', 's-active') : null),
          aiBriefBox(l),
          h('dl', { class: 'kv' }, [['Email', l.email], ['Phone', l.phone], ['Company', l.company], ['Country', l.country], ['Company size', l.company_size], ['Modules', (l.modules || []).join(', ')], ['Message', l.message]]
            .concat(details).concat([['Language', l.lang === 'hi' ? 'Hindi' : 'English'], ['Page', l.page], ['Source', l.source], ['Campaign', l.utm ? [l.utm.source, l.utm.medium, l.utm.campaign].filter(Boolean).join(' / ') : null], ['Received', fmt(l.created_at)]])
            .filter(function (p) { return p[1]; }).map(function (p) { return [h('dt', { text: p[0] }), h('dd', { text: p[1] })]; })),
          h('div', { class: 'card' }, h('h3', { text: 'Update' }), h('div', { class: 'row' }, h('label', { style: 'flex:1' }, 'Status', status)), h('label', { style: 'margin-top:10px' }, 'Note', note),
            h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn primary', type: 'button', disabled: !can('editor'), onclick: save }, 'Save'),
              can('owner') ? h('button', { class: 'btn danger', type: 'button', onclick: function () { if (confirm('Delete this lead permanently?')) api('/leads/' + l.id, { method: 'DELETE' }).then(function () { close(); route(); }); } }, 'Delete') : null), msg),
          h('div', null, h('h3', { text: 'History' }), h('ul', { class: 'timeline' }, r.events.map(function (e) { return h('li', null, h('div', { text: e.body || e.kind }), h('small', { text: fmt(e.created_at) + (e.admin_name ? ' · ' + e.admin_name : '') + ' · ' + e.kind })); }))),
          r.others.length ? h('div', null, h('h3', { text: 'Other requests from this person' }), h('ul', { class: 'timeline' }, r.others.map(function (o) { return h('li', null, h('a', { href: '#/leads/' + o.id, text: (TYPES[o.type] || o.type) + ' · ' + o.status }), h('small', { text: fmt(o.created_at) })); }))) : null);
      }).catch(function (e) { dr.replaceChildren(h('p', { class: 'err', text: errText(e) })); });
    }
    load();
  }

  // ---------- AI lead brief (summary, intent, next step, draft reply)
  function fillBox(el) { el.replaceChildren.apply(el, [].slice.call(arguments, 1).filter(function (x) { return x !== null && x !== undefined; })); }
  var INTENT_CLASS = { high: 's-good', medium: 's-pending', low: 's-bad' };
  function aiBriefBox(l) {
    var box = h('div', { class: 'card ai-card' }, h('p', { class: 'muted', text: 'Loading AI brief…' }));
    function render(r, busy, error) {
      var b = r && r.brief;
      var btn = can('editor') && r && r.enabled ? h('button', { class: 'btn sm' + (b ? '' : ' primary'), type: 'button', disabled: busy, onclick: write }, busy ? 'Writing…' : b ? '↻ Rewrite' : '✨ Write AI brief') : null;
      var head = h('div', { class: 'ai-head' }, h('h3', null, h('span', { class: 'spark', text: '✨ ' }), 'AI brief'), btn);
      if (r && !r.enabled) { fillBox(box, head, h('p', { class: 'muted', text: 'Add ANTHROPIC_API_KEY to the backend .env to get an AI summary, buying intent, next step and a draft reply for every lead.' })); return; }
      if (!b) { fillBox(box, head, error ? h('p', { class: 'err', text: error }) : null, h('p', { class: 'muted', text: busy ? 'Reading the lead, its history and your website…' : 'Get a summary, buying intent, the best next step, talking points and a draft reply in the lead’s language.' })); return; }
      var subject = h('input', { value: b.reply_subject, 'aria-label': 'Reply subject' });
      var body = h('textarea', { rows: 8, 'aria-label': 'Reply text' }); body.value = b.reply_body;
      var copied = h('span', { class: 'okmsg', hidden: true, text: 'Copied' });
      var section = function (title, items) { return items && items.length ? h('div', null, h('h4', { text: title }), h('ul', null, items.map(function (x) { return h('li', { text: x }); }))) : null; };
      fillBox(box, head, error ? h('p', { class: 'err', text: error }) : null,
        h('div', { class: 'row' }, tag(b.intent + ' intent', INTENT_CLASS[b.intent]), h('small', { class: 'muted', text: b.intent_reason })),
        h('p', { text: b.summary }),
        h('p', { class: 'ai-next' }, h('strong', { text: 'Next step: ' }), b.next_step),
        h('div', { class: 'ai-cols' }, section('Fits', b.fit), section('Talking points', b.talking_points), section('Questions to ask', b.questions_to_ask)),
        h('h4', { text: 'Draft reply' }), subject, body,
        h('div', { class: 'row', style: 'margin-top:8px' },
          h('button', { class: 'btn sm', type: 'button', onclick: function () { var t = 'Subject: ' + subject.value + '\n\n' + body.value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { copied.hidden = false; setTimeout(function () { copied.hidden = true; }, 1500); }, function () {}); } }, 'Copy'),
          h('a', { class: 'btn sm primary', href: '#', onclick: function (e) { e.currentTarget.href = 'mailto:' + encodeURIComponent(l.email) + '?subject=' + encodeURIComponent(subject.value) + '&body=' + encodeURIComponent(body.value); } }, 'Open in email'), copied),
        h('small', { class: 'muted', text: 'Written by AI on ' + fmt(b.created_at) + '. Check it before sending.' }));
    }
    var state = null;
    function write() {
      render(state, true);
      api('/leads/' + l.id + '/ai-brief', { method: 'POST' }).then(function (r) { state = r; render(r); })
        .catch(function (e) { render(state, false, e.message === 'ai_unavailable' ? 'The AI service did not answer. Try again in a minute.' : errText(e)); });
    }
    api('/leads/' + l.id + '/ai-brief').then(function (r) { state = r; render(r); }).catch(function () { box.remove(); });
    return box;
  }

  // ---------- AI insights: what visitors ask Quanta AI, and what the website cannot answer yet
  function viewInsights(params) {
    var days = Number(params.days) || 30;
    var sel = h('select', { 'aria-label': 'Period', onchange: function () { location.hash = '#/insights?days=' + sel.value; } },
      [7, 30, 90, 180].map(function (d) { return h('option', { value: d, selected: d === days }, 'Last ' + d + ' days'); }));
    mainEl.replaceChildren(top('AI insights', sel), h('p', { class: 'muted', text: 'Loading…' }));
    api('/ai/insights?days=' + days).then(function (s) {
      var kpi = function (label, value, sub) { return h('div', { class: 'card kpi' }, h('div', { class: 'muted', text: label }), h('div', { class: 'v', text: value }), h('div', { class: 's', text: sub || '' })); };
      var good = 0, bad = 0; s.feedback.forEach(function (f) { if (f.rating === 'good') good = f.n; else bad = f.n; });
      var pct = s.total ? Math.round(s.unansweredCount / s.total * 100) : 0;
      var report = h('div', { class: 'card ai-card' });
      function renderReport(rep, busy, error) {
        var btn = s.enabled && can('editor') ? h('button', { class: 'btn sm primary', type: 'button', disabled: busy || s.total < 5, onclick: analyse }, busy ? 'Analysing…' : rep ? '↻ Analyse again' : '✨ Analyse with AI') : null;
        var kids = [h('div', { class: 'ai-head' }, h('h2', null, h('span', { class: 'spark', text: '✨ ' }), 'AI report'), btn)];
        if (error) kids.push(h('p', { class: 'err', text: error }));
        if (!s.enabled) kids.push(h('p', { class: 'muted', text: 'Add ANTHROPIC_API_KEY to the backend .env and Quanta AI will group these questions into themes, find content gaps and suggest FAQ entries.' }));
        else if (!rep) kids.push(h('p', { class: 'muted', text: s.total < 5 ? 'Needs at least 5 questions in this period.' : 'Group the questions into themes, find content gaps and get FAQ ideas for the website.' }));
        if (rep) {
          kids.push(h('p', { class: 'ai-next' }, h('strong', { text: rep.headline })), h('small', { class: 'muted', text: rep.questions + ' questions, last ' + rep.days + ' days · ' + fmt(rep.created_at) }));
          kids.push(h('div', { class: 'ai-cols' },
            h('div', null, h('h4', { text: 'Themes' }), h('div', { class: 'bars' }, rep.themes.map(function (t) { return h('div', { class: 'bar', title: (t.examples || []).join(' · ') }, h('span', { text: t.title }), h('span', { class: 't' }, h('i', { style: 'width:' + t.share + '%' })), h('strong', { text: t.share + '%' })); }))),
            h('div', null, h('h4', { text: 'Content gaps' }), h('ul', null, rep.gaps.map(function (g) { return h('li', null, h('strong', { text: g.topic }), ' — ' + g.suggestion, g.page ? h('code', { text: ' ' + g.page }) : null); }))),
            h('div', null, h('h4', { text: 'FAQ ideas' }), h('ul', null, rep.faq.map(function (f) { return h('li', null, h('strong', { text: f.q }), f.hint ? h('div', { class: 'muted', text: f.hint }) : null); })))));
          if (rep.actions.length) kids.push(h('h4', { text: 'Do next' }), h('ol', null, rep.actions.map(function (a) { return h('li', { text: a }); })));
        }
        report.replaceChildren.apply(report, kids);
      }
      function analyse() {
        renderReport(s.report, true);
        api('/ai/insights/summary', { method: 'POST', body: { days: days } }).then(function (r) { s.report = r.report; renderReport(r.report); })
          .catch(function (e) { renderReport(s.report, false, e.message === 'not_enough_data' ? 'Needs at least 5 questions in this period.' : e.message === 'ai_unavailable' ? 'The AI service did not answer. Try again in a minute.' : errText(e)); });
      }
      renderReport(s.report);
      var table = function (cols, rows) {
        if (!rows.length) return h('p', { class: 'empty', text: 'Nothing yet.' });
        return h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { text: c[0] }); }))),
          h('tbody', null, rows.map(function (r) { return h('tr', null, cols.map(function (c) { var v = c[1](r); return h('td', { class: c[2] || '' }, v === null || v === undefined || v === '' ? '—' : String(v)); })); }))));
      };
      mainEl.replaceChildren(top('AI insights', sel),
        h('div', { class: 'grid' },
          kpi('Questions asked', s.total, s.byMode.map(function (m) { return m.n + (m.mode === 'ai' ? ' AI' : ' site guide'); }).join(' · ')),
          kpi('Not answered by the website', s.unansweredCount, pct + '% of questions: content gaps'),
          kpi('Solution Advisor plans', s.advisorRuns, 'AI plans written for visitors'),
          kpi('Answers rated helpful', good + bad ? Math.round(good / (good + bad) * 100) + '%' : '—', good + bad ? (good + bad) + ' ratings' : 'No ratings yet')),
        h('div', { style: 'margin-top:14px' }, report),
        h('div', { class: 'two' },
          h('div', { class: 'card chart' }, h('h2', { text: 'Questions per day' }), dayChart(s.perDay, 'Questions per day')),
          h('div', { class: 'card' }, h('h2', { text: 'Language' }), barList(s.byLang.map(function (r) { return [r.lang === 'hi' ? 'Hindi' : 'English', r.n]; })))),
        h('div', { class: 'grid', style: 'margin-top:14px' },
          h('div', { class: 'card' }, h('h2', { text: 'Most-used words' }), barList(s.topTerms.slice(0, 12).map(function (t) { return [t.term, t.n]; }))),
          h('div', { class: 'card' }, h('h2', { text: 'Asked on these pages' }), barList(s.topPages.map(function (p) { return [p.page, p.n]; })))),
        h('div', { class: 'card', style: 'margin-top:14px' }, h('h2', { text: 'Questions the website could not answer' }),
          h('p', { class: 'muted', text: 'Add this information to your pages (then rebuild the assistant knowledge) or to the FAQ.' }),
          table([['Question', function (r) { return r.question; }, 'wrap'], ['Times', function (r) { return r.n; }], ['Page', function (r) { return r.page; }], ['Lang', function (r) { return r.lang; }], ['Last asked', function (r) { return fmt(r.last); }]], s.unanswered)),
        h('div', { class: 'card', style: 'margin-top:14px' }, h('h2', { text: 'Latest questions' }),
          table([['When', function (r) { return fmt(r.created_at); }], ['Question', function (r) { return r.question; }, 'wrap'], ['Mode', function (r) { return r.mode === 'ai' ? 'AI' : 'Site guide'; }], ['Answered', function (r) { return r.matched ? 'yes' : 'no'; }], ['Page', function (r) { return r.page; }]], s.recent)));
    }).catch(function (e) { mainEl.replaceChildren(top('AI insights', sel), h('p', { class: 'err', text: errText(e) })); });
  }

  // ---------- simple lists
  function listView(title, path, cols, opts) {
    opts = opts || {};
    var state = { q: '', status: '', page: 1 };
    var q = h('input', { type: 'search', placeholder: 'Search…' });
    var timer; q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { state.q = q.value.trim(); state.page = 1; load(); }, 300); });
    var statusSel = opts.statuses ? h('select', { onchange: function () { state.status = statusSel.value; state.page = 1; load(); } }, [h('option', { value: '' }, 'All')].concat(opts.statuses.map(function (s) { return h('option', { value: s }, s); }))) : null;
    var wrap = h('div', { class: 'table-wrap' }, h('p', { class: 'empty', text: 'Loading…' }));
    mainEl.replaceChildren(top(title, opts.action || null), h('div', { class: 'filters' }, h('label', { class: 'grow' }, 'Search', q), statusSel ? h('label', null, 'Status', statusSel) : null), wrap);
    function load() {
      api(path + qs({ q: state.q, status: state.status, page: state.page, pageSize: 25 })).then(function (r) {
        if (!r.items.length) { wrap.replaceChildren(h('p', { class: 'empty', text: 'Nothing here yet.' })); return; }
        wrap.replaceChildren(h('table', null, h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { text: c[0] }); }))),
          h('tbody', null, r.items.map(function (it) { return h('tr', null, cols.map(function (c) { var v = c[1](it, load); return h('td', { class: c[2] || '' }, v && v.nodeType ? v : (v === null || v === undefined || v === '' ? '—' : String(v))); })); }))),
          pager(r, function (p) { state.page = p; load(); }));
      });
    }
    load();
  }
  function viewCustomers() {
    listView('Customers', '/customers', [['Created', function (c) { return fmt(c.created_at); }], ['Name', function (c) { return c.first_name + ' ' + c.last_name; }], ['Email', function (c) { return c.email; }],
      ['Company', function (c) { return c.company; }], ['Size', function (c) { return c.company_size; }], ['Confirmed', function (c) { return c.email_verified_at ? tag('yes', 's-active') : tag('no', 's-pending'); }], ['Last login', function (c) { return fmt(c.last_login_at); }]]);
  }
  function viewSubscribers() {
    listView('Newsletter subscribers', '/subscribers', [['Since', function (s) { return fmt(s.created_at); }], ['Email', function (s) { return s.email; }], ['Status', function (s) { return tag(s.status, 's-' + s.status); }],
      ['Language', function (s) { return s.lang === 'hi' ? 'Hindi' : 'English'; }], ['Confirmed', function (s) { return fmt(s.confirmed_at); }], ['Signed up on', function (s) { return s.source; }]],
      { statuses: ['active', 'pending', 'unsubscribed'], action: h('a', { class: 'btn', href: '/api/admin/subscribers/export.csv' }, 'Export active (CSV)') });
  }
  function viewFeedback() {
    listView('Quanta AI feedback', '/feedback', [['When', function (f) { return fmt(f.created_at); }], ['Rating', function (f) { return tag(f.rating === 'good' ? '👍 helpful' : '👎 not helpful', 's-' + f.rating); }],
      ['Question', function (f) { return f.question; }, 'wrap'], ['Answer', function (f) { return (f.answer || '').slice(0, 400); }, 'wrap'], ['Page', function (f) { return f.page; }]], { statuses: ['good', 'bad'] });
  }
  function viewEmails() {
    listView('Emails & webhooks', '/jobs', [['Created', function (j) { return fmt(j.created_at); }], ['Type', function (j) { var p = {}; try { p = JSON.parse(j.payload); } catch (e) { /* ignore */ } return j.type + (p.kind ? ': ' + p.kind : '') + (p.to ? ' → ' + p.to : ''); }],
      ['Status', function (j) { return tag(j.status, 's-' + j.status); }], ['Attempts', function (j) { return j.attempts; }], ['Last error', function (j) { return j.last_error; }, 'wrap'],
      ['', function (j, reload) { return j.status === 'failed' && can('editor') ? h('button', { class: 'btn sm', type: 'button', onclick: function (e) { e.stopPropagation(); api('/jobs/' + j.id + '/retry', { method: 'POST' }).then(reload); } }, 'Retry') : ''; }]],
      { statuses: ['pending', 'running', 'done', 'failed'] });
  }
  function viewAudit() {
    listView('Audit log', '/audit', [['When', function (a) { return fmt(a.created_at); }], ['Who', function (a) { return a.actor; }], ['Action', function (a) { return a.action; }], ['Target', function (a) { return a.target; }], ['Details', function (a) { return a.details; }, 'wrap']]);
  }

  // ---------- settings
  function viewSettings() {
    var sys = h('div', { class: 'card' }, h('h2', { text: 'System' }), h('p', { class: 'muted', text: 'Loading…' }));
    var pw = form([['current', 'Current password', 'password'], ['next', 'New password (12+ characters)', 'password']], 'Change password', function (v, done) { api('/password', { method: 'POST', body: v }).then(function () { done('Password changed.'); }, done); });
    var tfa = h('div', { class: 'card' }, h('h2', { text: 'Two-factor sign-in' }));
    function renderTfa() {
      tfa.replaceChildren(h('h2', { text: 'Two-factor sign-in' }));
      if (ME.totpEnabled) {
        tfa.appendChild(h('p', { class: 'okmsg', text: 'On. You need a code from your authenticator app to sign in.' }));
        tfa.appendChild(form([['password', 'Your password, to turn it off', 'password']], 'Turn off 2FA', function (v, done) { api('/totp/disable', { method: 'POST', body: v }).then(function () { ME.totpEnabled = false; renderTfa(); }, done); }));
        return;
      }
      tfa.appendChild(h('p', { class: 'muted', text: 'Protect this account with a 6-digit code from Google Authenticator, Microsoft Authenticator or Authy.' }));
      tfa.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function () {
        api('/totp/setup', { method: 'POST' }).then(function (r) {
          tfa.replaceChildren(h('h2', { text: 'Two-factor sign-in' }),
            h('p', null, 'In your authenticator app, add an account with this key (or open the link on your phone):'),
            h('p', null, h('code', { text: r.secret })), h('p', null, h('a', { href: r.otpauth, text: 'Open in authenticator app' })),
            form([['code', '6-digit code from the app', 'text']], 'Turn on 2FA', function (v, done) { api('/totp/enable', { method: 'POST', body: v }).then(function () { ME.totpEnabled = true; renderTfa(); }, done); }));
        });
      } }, 'Set up 2FA'));
    }
    renderTfa();
    var admins = can('owner') ? h('div', { class: 'card' }, h('h2', { text: 'Admins' })) : null;
    function loadAdmins() {
      api('/admins').then(function (r) {
        admins.replaceChildren(h('h2', { text: 'Admins' }),
          h('table', null, h('tbody', null, r.items.map(function (a) {
            return h('tr', null, h('td', null, h('strong', { text: a.name }), h('div', { class: 'muted', text: a.email })), h('td', null, tag(a.role)), h('td', { text: a.totp_enabled ? '2FA on' : '2FA off' }),
              h('td', null, a.id !== ME.id ? h('button', { class: 'btn sm danger', type: 'button', onclick: function () { if (confirm('Remove ' + a.email + '?')) api('/admins/' + a.id, { method: 'DELETE' }).then(loadAdmins); } }, 'Remove') : 'You'));
          }))),
          h('h3', { text: 'Add an admin', style: 'margin-top:16px' }),
          form([['name', 'Name', 'text'], ['email', 'Email', 'email'], ['password', 'Temporary password (12+ characters)', 'password'], ['role', 'Role', ['editor', 'viewer', 'owner']]], 'Add admin',
            function (v, done) { api('/admins', { method: 'POST', body: v }).then(function () { loadAdmins(); }, done); }));
      });
    }
    if (admins) loadAdmins();
    mainEl.replaceChildren(top('Settings'), h('div', { class: 'grid' }, h('div', { class: 'card' }, h('h2', { text: 'My password' }), pw), tfa), admins ? h('div', { style: 'margin-top:14px' }, admins) : null, h('div', { style: 'margin-top:14px' }, sys));
    api('/system').then(function (s) {
      var msg = h('p', { hidden: true });
      sys.replaceChildren(h('h2', { text: 'System' }),
        h('dl', { class: 'kv' }, [['Version', s.version + ' · Node ' + s.node + ' · ' + s.environment], ['Running for', Math.round(s.uptimeSeconds / 60) + ' minutes'], ['Website', s.siteUrl], ['Backend', s.publicUrl],
          ['Allowed origins', s.allowedOrigins.join(', ')], ['Database', s.databaseBytes ? Math.round(s.databaseBytes / 1024) + ' KB' : 'in memory'], ['Email', s.mail.transport + ' · from ' + s.mail.from + (s.mail.salesEmail ? ' · lead alerts to ' + s.mail.salesEmail : ' · no SALES_EMAIL set')],
          ['Lead webhook', s.webhook ? 'on' : 'off'], ['Quanta AI', (s.assistant.enabled ? 'AI mode on (' + s.assistant.model + ')' : 'site guide only (no API key)') + ' · ' + s.assistant.knowledge.passages + ' passages'],
          ['Serves website', s.servesWebsite ? 'yes' : 'no'], ['API docs', s.docs || 'off']].map(function (p) { return [h('dt', { text: p[0] }), h('dd', { text: p[1] })]; })),
        h('div', { class: 'row', style: 'margin-top:12px' },
          can('editor') ? h('button', { class: 'btn', type: 'button', onclick: function () { api('/test-email', { method: 'POST' }).then(function (r) { msg.className = r.ok ? 'okmsg' : 'err'; msg.textContent = r.ok ? 'Test email sent to ' + ME.email + '.' : 'Email failed: ' + (r.error || r.status); msg.hidden = false; }); } }, 'Send me a test email') : null,
          can('editor') ? h('button', { class: 'btn', type: 'button', onclick: function () { api('/knowledge/refresh', { method: 'POST' }).then(function (k) { msg.className = 'okmsg'; msg.textContent = 'Quanta AI knowledge reloaded: ' + k.passages + ' passages.'; msg.hidden = false; }); } }, 'Reload Quanta AI knowledge') : null,
          s.docs ? h('a', { class: 'btn', href: '/docs', target: '_blank', rel: 'noopener' }, 'API docs') : null), msg);
    });
  }
  // small form builder: fields = [name, label, type | options[]]
  function form(fields, submitText, onSubmit) {
    var msg = h('p', { hidden: true });
    var f = h('form', { novalidate: true, style: 'display:flex;flex-direction:column;gap:10px' },
      fields.map(function (fd) {
        var input = Array.isArray(fd[2]) ? h('select', { name: fd[0] }, fd[2].map(function (o) { return h('option', { value: o }, o); })) : h('input', { name: fd[0], type: fd[2], autocomplete: fd[2] === 'password' ? 'new-password' : 'off' });
        return h('label', null, fd[1], input);
      }), msg, h('button', { class: 'btn primary', type: 'submit', text: submitText }));
    f.addEventListener('submit', function (e) {
      e.preventDefault(); msg.hidden = true;
      var v = {}; fields.forEach(function (fd) { v[fd[0]] = f[fd[0]].value.trim(); });
      onSubmit(v, function (res) {
        if (res instanceof Error) { msg.className = 'err'; msg.textContent = errText(res); } else { msg.className = 'okmsg'; msg.textContent = res; f.reset(); }
        msg.hidden = false;
      });
    });
    return f;
  }

  // ---------- router
  function parseHash() {
    var hsh = location.hash.replace(/^#\/?/, '') || 'dashboard';
    var parts = hsh.split('?'), path = parts[0].split('/'), params = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { view: path[0], id: path[1], params: params };
  }
  var VIEWS = { dashboard: viewDashboard, leads: viewLeads, customers: viewCustomers, subscribers: viewSubscribers, feedback: viewFeedback, insights: viewInsights, emails: viewEmails, audit: viewAudit, settings: viewSettings };
  var lastView = null;
  function route() {
    if (!ME) return renderLogin();
    var r = parseHash();
    var view = VIEWS[r.view] ? r.view : 'dashboard';
    if (view === 'leads' && r.id) { if (lastView !== 'leads') { shell('leads'); viewLeads({}); lastView = 'leads'; } openLead(r.id); return; }
    shell(view); VIEWS[view](r.params); lastView = view;
  }
  window.addEventListener('hashchange', route);
  api('/me').then(function (r) { ME = r.admin; route(); }).catch(function () { renderLogin(); });
})();
