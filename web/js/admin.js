// ===================== Admin Panel =====================
const A = { tab: 'dashboard', dash: null, voters: [], posts: [], locked: false, hideResults: false, isLocal: true, pollTimer: null };

const EV = {
  VOTE_CAST: ['🗳️', 'Vote cast'], FACE_VERIFIED: ['✅', 'Face verified'], FACE_MISMATCH: ['⚠️', 'Face did not match'],
  OFFICER_OVERRIDE: ['👮', 'Officer verified'], OFFICER_PIN_FAILED: ['⛔', 'Wrong officer PIN'], DUPLICATE_ATTEMPT: ['🚫', 'Tried to vote again'],
  SESSION_CANCELLED: ['↩️', 'Left without voting'], SELF_CONFIRMED: ['☑️', 'Self-confirmed (face off)'],
  ELECTION_OPEN: ['▶️', 'Voting opened'], ELECTION_PAUSED: ['⏸️', 'Voting paused'], ELECTION_CLOSED: ['⏹️', 'Voting closed'],
  VOTER_ADDED: ['➕', 'Voter added'], VOTER_UPDATED: ['✏️', 'Voter updated'], VOTER_DELETED: ['🗑️', 'Voter deleted'],
  FACE_ENROLLED: ['📷', 'Face registered'], VOTERS_IMPORTED: ['📥', 'Voters imported'], ADMIN_LOGIN: ['🔑', 'Admin login'],
  ADMIN_LOGIN_FAILED: ['⛔', 'Wrong admin PIN'], SETTINGS_CHANGED: ['⚙️', 'Settings changed'], BACKUP: ['💾', 'Backup'],
  VOTES_RESET: ['♻️', 'Votes reset'], SETUP: ['🛠️', 'Setup'], SAMPLE_DATA: ['🧪', 'Sample data'], POST_SAVED: ['🏷️', 'Post saved'],
  POST_DELETED: ['🗑️', 'Post deleted'], TEAM_SAVED: ['🚩', 'Team saved'], TEAM_DELETED: ['🗑️', 'Team deleted'], CANDIDATE_SAVED: ['👤', 'Candidate saved'], CANDIDATE_DELETED: ['🗑️', 'Candidate deleted'], PIN_CHANGED: ['🔑', 'PIN changed'],
};
const evIcon = e => (EV[e] || ['•'])[0];
const evName = e => (EV[e] || [null, e])[1];
const tokenQ = () => 'token=' + encodeURIComponent(sessionStorage.getItem('adminToken') || '');
const ID_TYPES = ['Aadhaar Card', 'Voter ID (EPIC)', 'PAN Card', 'Driving Licence', 'Passport', 'Society ID Card', 'Other'];
const SYMBOLS = ['🌳', '🌸', '⭐', '🏠', '🚲', '🪔', '📘', '☀️', '🌙', '🍎', '🔔', '🌻', '🦚', '🐘', '🪁', '⚽', '🏏', '🚗', '✈️', '⛵', '🔑', '💡', '⏰', '🎺', '🌂', '🥭', '🌾', '🏵️', '⚓', '🧭'];

window.onAuthLost = () => { sessionStorage.removeItem('adminToken'); clearInterval(A.pollTimer); showLogin(); };

// ------------------------------------------------ login / setup
async function showLogin() {
  $('#app').classList.add('hidden');
  const st = await api('admin/state', undefined, { onAuth: false });
  A.isLocal = st.is_local;
  const el = $('#login'); el.classList.remove('hidden');
  if (!st.setup_done) {
    el.innerHTML = `<div class="card login">
      <h1>🗳️ First-time setup</h1>
      <p class="muted">Create the PINs that protect this election. Write them down and keep them safe.</p>
      <label class="field">Society name<input id="su_soc" value="${esc(st.society_name)}"></label>
      <label class="field">Election name<input id="su_el" value="${esc(st.election_name)}"></label>
      <label class="field">Admin PIN (for this panel)<input id="su_ap" type="password" inputmode="numeric" placeholder="at least 4 digits"></label>
      <label class="field">Confirm admin PIN<input id="su_ap2" type="password" inputmode="numeric"></label>
      <label class="field">Polling officer PIN (used at the booth when a face does not match)<input id="su_op" type="password" inputmode="numeric" placeholder="different from admin PIN"></label>
      <button class="btn" id="su_go" style="width:100%;margin-top:6px">Create &amp; continue</button></div>`;
    $('#su_go').onclick = async () => {
      if ($('#su_ap').value !== $('#su_ap2').value) return toast('Admin PINs do not match', 'bad');
      try {
        const r = await api('admin/setup', { society_name: $('#su_soc').value, election_name: $('#su_el').value, admin_pin: $('#su_ap').value, officer_pin: $('#su_op').value });
        sessionStorage.setItem('adminToken', r.token); startApp();
      } catch (e) { toast(e.message, 'bad'); }
    };
  } else {
    el.innerHTML = `<div class="card login" style="text-align:center">
      <div style="font-size:46px">🔐</div>
      <h1>${esc(st.society_name)}</h1><p class="muted">${esc(st.election_name)} — Admin panel</p>
      <label class="field" style="text-align:left">Admin PIN<input id="li_pin" type="password" inputmode="numeric" autofocus></label>
      <button class="btn" id="li_go" style="width:100%">Log in</button>
      <p class="muted" style="margin-top:16px;font-size:13px"><a href="/">← Back to start page</a></p></div>`;
    const go = async () => {
      try { const r = await api('admin/login', { pin: $('#li_pin').value }, { onAuth: false }); sessionStorage.setItem('adminToken', r.token); startApp(); }
      catch (e) { toast(e.message, 'bad'); $('#li_pin').value = ''; }
    };
    $('#li_go').onclick = go;
    $('#li_pin').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => $('#li_pin')?.focus(), 50);
  }
}

async function startApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  try { const st = await api('admin/state'); A.isLocal = st.is_local; } catch { }
  switchTab(A.tab);
  clearInterval(A.pollTimer);
  A.pollTimer = setInterval(() => { if (A.tab === 'dashboard') loadDashboard(); else refreshHeader(); }, 2000);
}

async function refreshHeader() {
  try {
    const d = A.tab === 'dashboard' ? A.dash : await api('admin/dashboard');
    if (A.tab !== 'dashboard') A.dash = d;
    setHeader(d);
  } catch { }
}
function setHeader(d) {
  if (!d) return;
  const p = $('#statusPill'); p.className = 'pill ' + d.status; p.textContent = STATUS_LABEL[d.status];
  $('#sideSociety').textContent = d.society_name + ' · ' + d.election_name;
  $('#clock').textContent = d.time;
}

function switchTab(tab) {
  A.tab = tab;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.main > section').forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + tab));
  $('#pageTitle').textContent = $(`#nav button[data-tab=${tab}]`).textContent.replace(/^\S+\s/, '');
  ({ dashboard: loadDashboard, voters: loadVoters, candidates: loadCandidates, audit: loadAudit, settings: loadSettings })[tab]();
  refreshHeader();
}

// ------------------------------------------------ dashboard
async function loadDashboard() {
  let d;
  try { d = await api('admin/dashboard'); } catch (e) { return; }
  A.dash = d; setHeader(d);
  const el = $('#tab-dashboard');
  const c = d.counts;
  const notYet = c.registered - c.voted;
  const controls = {
    setup: `<button class="btn ok" data-st="open">▶ Open voting</button>`,
    open: `<button class="btn warn" data-st="paused">⏸ Pause</button><button class="btn bad" data-st="closed">⏹ Close voting</button>`,
    paused: `<button class="btn ok" data-st="open">▶ Resume voting</button><button class="btn bad" data-st="closed">⏹ Close voting</button>`,
    closed: `<span class="muted">Voting is closed. Final results below.</span>`,
  }[d.status];

  if (!el.dataset.built) {
    el.innerHTML = `
      <div class="card" style="margin-bottom:18px;padding:14px 18px"><div class="row">
        <div><b id="d_status"></b><div class="muted" id="d_times" style="font-size:13px"></div></div>
        <div class="spacer"></div><div class="ctl" id="d_ctl"></div></div></div>
      <div class="tiles" id="d_tiles"></div>
      <div class="grid2">
        <div class="card" id="d_resCard">
          <div class="section-title"><h2>Live results</h2><div class="spacer"></div>
            <button class="btn small secondary" id="d_hide">🙈 Hide counts</button>
            <button class="btn small secondary" id="d_print">🖨 Print result sheet</button></div>
          <div class="res-body" id="d_results"></div>
        </div>
        <div>
          <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Votes over time</h2></div><div class="chart" id="d_chart"></div></div>
          <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Tamper check</h2></div><div id="d_integrity"></div></div>
          <div class="card"><div class="section-title"><h2>Live activity</h2></div><div class="feed" id="d_feed"></div></div>
        </div>
      </div>`;
    el.dataset.built = '1';
    $('#d_hide').onclick = () => { A.hideResults = !A.hideResults; $('#d_hide').textContent = A.hideResults ? '👁 Show counts' : '🙈 Hide counts'; $('#d_resCard').classList.toggle('blurred', A.hideResults); };
    $('#d_print').onclick = printResults;
    $('#d_ctl').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) changeStatus(b.dataset.st); });
    $('#d_feed').addEventListener('click', e => { const b = e.target.closest('[data-snap]'); if (b) showSnapshot(b.dataset.snap); });
  }
  $('#d_status').textContent = { setup: 'Voting has not started', open: 'Voting is OPEN', paused: 'Voting is PAUSED', closed: 'Voting is CLOSED' }[d.status];
  $('#d_times').textContent = [d.opened_at && 'Opened ' + d.opened_at, d.closed_at && 'Closed ' + d.closed_at].filter(Boolean).join(' · ') || 'Set up voters and candidates, then open voting.';
  if ($('#d_ctl').dataset.st !== d.status) { $('#d_ctl').innerHTML = controls; $('#d_ctl').dataset.st = d.status; }

  $('#d_tiles').innerHTML = `
    <div class="tile hero"><div class="k">Turnout</div><div class="v">${c.turnout}%</div><div class="s">${c.ballots} of ${c.eligible} ${d.one_flat ? 'flats' : 'voters'}</div><div class="bar-track"><i style="width:${c.turnout}%"></i></div></div>
    <div class="tile"><div class="k">Weighted votes cast</div><div class="v">${c.weight_cast}<span style="font-size:18px;color:var(--muted)">/${c.weight_total}</span></div><div class="s">${c.weighted_turnout}% of total vote value</div></div>
    <div class="tile"><div class="k">Ballots</div><div class="v">${c.ballots}</div><div class="s">${notYet} registered voters yet to vote</div></div>
    <div class="tile"><div class="k">Flats voted</div><div class="v">${c.flats_voted}<span style="font-size:18px;color:var(--muted)">/${c.flats}</span></div><div class="s">households</div></div>
    <div class="tile"><div class="k">Faces registered</div><div class="v">${c.faces}<span style="font-size:18px;color:var(--muted)">/${c.registered}</span></div><div class="s">${c.registered - c.faces ? `<span style="color:var(--warn)">${c.registered - c.faces} missing</span>` : 'all set'}</div></div>`;

  $('#d_results').innerHTML = d.results.length ? d.results.map(r => resultBlock(r, d.status)).join('')
    : `<p class="muted">No posts yet. Add them under <b>Teams &amp; Candidates</b>, or load sample data in Settings.</p>`;

  $('#d_chart').innerHTML = chartSVG(d.timeline);
  const ig = d.integrity;
  $('#d_integrity').innerHTML = `<div class="integrity ${ig.ok ? 'ok' : 'bad'}">${ig.ok ? '🛡️ All ballots verified — no tampering detected' : '🚨 Problem detected! Check Settings → Tamper check'}</div>
    <p class="muted" style="font-size:12.5px;margin:8px 0 0">${ig.ballots} ballots = ${ig.voters_marked_voted} voters marked as voted · fingerprint <span class="mono">${ig.fingerprint}</span></p>`;
  $('#d_feed').innerHTML = d.recent.map(a => `<div class="it"><span class="ic">${evIcon(a.event)}</span>
      <div><b>${evName(a.event)}</b>${a.name ? ` — ${esc(a.name)} <span class="muted">(${esc(a.flat)})</span>` : ''}<div class="muted" style="font-size:12px">${esc(a.detail)}</div>
      ${a.has_snap ? `<button class="btn small ghost" style="padding:2px 0" data-snap="${a.id}">📷 view photo</button>` : ''}</div>
      <span class="tm">${a.ts.slice(11)}</span></div>`).join('') || '<p class="muted">Nothing yet.</p>';
}

function resultBlock(r, status) {
  const tmap = {}; (r.teams || []).forEach(t => tmap[t.id] = t);
  const max = Math.max(1, ...r.candidates.map(x => x.wvotes), r.wnota);
  const totalW = r.candidates.reduce((s, x) => s + x.wvotes, 0) + r.wnota;
  const ranked = [...r.candidates].sort((a, b) => b.wvotes - a.wvotes || b.votes - a.votes);
  const word = r.tie ? 'Tie' : status === 'closed' ? 'Elected' : 'Leading';
  const rowsH = ranked.map((x, i) => {
    const lead = r.leaders.includes(x.id);
    const tm = tmap[x.team_id];
    const cut = r.seats > 1 && i === r.seats ? `<div class="cutline">▲ top ${r.seats} ${status === 'closed' ? 'elected' : 'currently winning'}</div>` : '';
    return `${cut}<div class="res-row ${lead ? 'lead' : ''}" ${tm ? `style="--team:${tm.color}"` : ''}>
      <span class="rank">${i + 1}</span>
      <div><div class="nm">${esc(x.name)} <span class="muted" style="font-weight:500">${esc(x.flat)}</span>
        ${tm ? `<span class="tchip">${esc(tm.symbol || '')} ${esc(tm.name)}</span>` : ''}
        ${lead ? `<span class="badge ${r.tie ? 'tie' : 'lead'}">${word}</span>` : ''}</div>
        <div class="track"><i style="width:${(x.wvotes / max) * 100}%"></i></div></div>
      <div class="vt">${x.wvotes}<small>${x.votes} voter${x.votes === 1 ? '' : 's'}</small></div></div>`;
  }).join('');
  const teamsH = (r.teams || []).length ? `<div class="team-sum">${r.teams.map(t => `<div class="ts" style="--team:${t.color}">
      <div class="tn">${esc(t.symbol || '')} ${esc(t.name)}</div><div class="tw"><b>${t.seats_won}</b> / ${r.seats} seats</div>
      <div class="muted" style="font-size:12px">${t.wvotes} weighted votes</div></div>`).join('')}</div>` : '';
  return `<div class="post-res"><h3>${esc(r.name)} <span class="badge gray">${r.seats} seat${r.seats > 1 ? 's' : ''}</span>
      <span class="muted" style="font-size:12px;font-weight:500">ranked by weighted votes</span></h3>${teamsH}${rowsH}
    <div class="res-row"><span class="rank">–</span>
      <div><div class="nm" style="color:var(--muted)">NOTA (None of the above)</div><div class="track"><i style="width:${(r.wnota / max) * 100}%;background:#c9c5bb"></i></div></div>
      <div class="vt" style="color:var(--muted)">${r.wnota}<small>${r.nota} voters</small></div></div></div>`;
}

function chartSVG(tl) {
  if (!tl.length) return '<p class="muted">The chart fills in as votes come in (15-minute blocks).</p>';
  const W = 460, H = 160, pad = 26, bw = Math.min(40, (W - pad) / tl.length - 6);
  const max = Math.max(...tl.map(x => x.n));
  const bars = tl.map((x, i) => {
    const h = (x.n / max) * (H - 50);
    const xx = pad + i * ((W - pad) / tl.length) + 3;
    return `<rect x="${xx}" y="${H - 24 - h}" width="${bw}" height="${h}" rx="4" fill="#1d4e9e"><title>${x.t}: ${x.n} votes</title></rect>
      <text x="${xx + bw / 2}" y="${H - 28 - h}" text-anchor="middle" font-size="11" font-weight="700" fill="#18212f">${x.n}</text>
      <text x="${xx + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#5b6475">${x.t}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${pad - 6}" x2="${W}" y1="${H - 24}" y2="${H - 24}" stroke="#dcd8cf"/>${bars}</svg>`;
}

async function changeStatus(st) {
  const msgs = {
    open: ['Open voting?', 'Voters can start voting at the booth. Posts and candidates will be locked.', 'Open voting', 'ok'],
    paused: ['Pause voting?', 'The booth will stop accepting new voters until you resume.', 'Pause', 'warn'],
    closed: ['Close voting?', '<b>This is final.</b> Voting cannot be reopened. Results will be declared and shown on the results screen.', 'Close voting', 'bad'],
  };
  const [ti, tx, ok, kind] = msgs[st];
  let pin = '';
  if (st === 'closed') {
    pin = await new Promise(res => {
      const m = modal(`<h2>${ti}</h2><p class="muted">${tx}</p><label class="field">Admin PIN<input type="password" id="cl_pin" inputmode="numeric"></label>
        <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-a="no">Cancel</button><button class="btn bad" data-a="yes">${ok}</button></div>`);
      setTimeout(() => $('#cl_pin')?.focus(), 30);
      m.el.addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; const v = $('#cl_pin').value; m.close(); res(a === 'yes' ? v : null); });
    });
    if (pin === null) return;
  } else if (!(await confirmBox(ti, tx, ok, kind))) return;
  try { await api('admin/status', { status: st, pin }); toast('Done', 'ok'); loadDashboard(); }
  catch (e) { toast(e.message, 'bad'); }
}

async function showSnapshot(id) {
  const r = await api('admin/audit/snapshot?id=' + id);
  modal(`<h2>Photo at the booth</h2><p class="muted">Captured during verification (audit record #${id}).</p>
    ${r.snapshot ? `<img src="${r.snapshot}" style="width:100%;border-radius:12px">` : '<p>No photo.</p>'}`);
}

async function printResults() {
  const d = await api('admin/dashboard');
  const w = window.open('', '_blank');
  const c = d.counts;
  const body = d.results.map(r => {
    const tmap = {}; (r.teams || []).forEach(t => tmap[t.id] = t);
    const rowsH = [...r.candidates].sort((a, b) => b.wvotes - a.wvotes || b.votes - a.votes).map((x, i) =>
      `<tr ${r.leaders.includes(x.id) ? 'style="background:#eef7f0"' : ''}><td>${i + 1}</td><td>${esc(x.name)}</td><td>${esc(tmap[x.team_id]?.name || '')}</td><td>${esc(x.flat)}</td>
       <td style="text-align:right"><b>${x.wvotes}</b></td><td style="text-align:right">${x.votes}</td>
       <td>${r.leaders.includes(x.id) ? (r.tie ? 'TIE' : d.status === 'closed' ? '<b>ELECTED</b>' : 'Leading') : ''}</td></tr>`).join('');
    const ts = (r.teams || []).length ? `<p><b>Team summary:</b> ${r.teams.map(t => `${esc(t.name)} — ${t.seats_won} seat(s), ${t.wvotes} weighted votes`).join(' &nbsp;|&nbsp; ')}</p>` : '';
    return `<h3>${esc(r.name)} <small>(${r.seats} seat${r.seats > 1 ? 's' : ''})</small></h3>${ts}
      <table><tr><th>#</th><th>Candidate</th><th>Team</th><th>Flat</th><th style="text-align:right">Weighted votes</th><th style="text-align:right">Voters</th><th>Result</th></tr>${rowsH}
      <tr><td></td><td colspan="3"><i>NOTA (None of the above)</i></td><td style="text-align:right">${r.wnota}</td><td style="text-align:right">${r.nota}</td><td></td></tr></table>`;
  }).join('');
  w.document.write(`<!doctype html><html><head><title>Result Sheet</title><style>
    body{font-family:-apple-system,Segoe UI,Arial,sans-serif;padding:30px;color:#111}h1{margin:0}h3{margin:26px 0 8px}
    table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px 10px;text-align:left;font-size:14px}
    .meta{margin:10px 0 20px;font-size:14px}.sig{display:flex;gap:40px;margin-top:70px}.sig div{flex:1;border-top:1px solid #000;padding-top:6px;text-align:center;font-size:13px}
    .stamp{font-size:12px;color:#555;margin-top:30px}</style></head><body>
    <h1>${esc(d.society_name)}</h1><h2 style="margin:4px 0">${esc(d.election_name)} — ${d.status === 'closed' ? 'Final Result' : 'Provisional Result (voting not closed)'}</h2>
    <div class="meta">Voting opened: ${esc(d.opened_at || '—')} &nbsp;|&nbsp; closed: ${esc(d.closed_at || '—')}<br>
    Registered voters: <b>${c.registered}</b> &nbsp;|&nbsp; Ballots cast: <b>${c.ballots}</b> &nbsp;|&nbsp; Turnout: <b>${c.turnout}%</b><br>
    Weighted votes cast: <b>${c.weight_cast}</b> of ${c.weight_total} (${c.weighted_turnout}%) &nbsp;|&nbsp; Vote weights: ${esc(d.weights_text || '')}</div>
    ${body}
    <div class="sig"><div>Election Officer</div><div>Observer / Witness</div><div>Observer / Witness</div></div>
    <div class="stamp">Printed ${esc(d.time)} · Ballot integrity: ${d.integrity.ok ? 'verified' : 'PROBLEM'} · Fingerprint ${d.integrity.fingerprint}</div>
    <script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}

// ------------------------------------------------ voters
async function loadVoters() {
  const el = $('#tab-voters');
  if (!el.dataset.built) {
    el.innerHTML = `<div class="toolbar">
        <input type="search" id="v_q" placeholder="Search name, flat or ID…">
        <select id="v_f"><option value="">All voters</option><option value="voted">Voted</option><option value="not">Not voted</option><option value="noface">Face not registered</option></select>
        <div class="spacer"></div>
        <button class="btn" id="v_add">➕ Add voter</button>
        <button class="btn secondary" id="v_imp">📥 Import CSV</button>
        <button class="btn secondary" id="v_slips">🖨 Print voter slips</button>
        <a class="btn secondary" id="v_exp">⬇ Export</a>
      </div>
      <p class="hint" id="v_count"></p>
      <table class="t"><thead><tr><th></th><th>ID</th><th>Name</th><th>Flat</th><th>Vote weight</th><th>Phone</th><th>Photo ID</th><th>Face</th><th>Status</th></tr></thead><tbody id="v_body"></tbody></table>`;
    el.dataset.built = '1';
    $('#v_q').oninput = renderVoters; $('#v_f').onchange = renderVoters;
    $('#v_add').onclick = () => voterModal(null);
    $('#v_imp').onclick = importModal;
    $('#v_slips').onclick = printSlips;
    $('#v_body').addEventListener('click', e => { const r = e.target.closest('[data-vid]'); if (r) voterModal(A.voters.find(v => v.id === r.dataset.vid)); });
  }
  $('#v_exp').href = '/api/admin/export/turnout.csv?' + tokenQ();
  const r = await api('admin/voters');
  A.voters = r.voters;
  renderVoters();
}

function filteredVoters() {
  const q = ($('#v_q')?.value || '').toLowerCase(), f = $('#v_f')?.value;
  return A.voters.filter(v => (!q || (v.name + ' ' + v.flat + ' ' + v.id + ' ' + v.phone).toLowerCase().includes(q))
    && (!f || (f === 'voted' && v.has_voted) || (f === 'not' && !v.has_voted) || (f === 'noface' && !v.face_enrolled)));
}

function renderVoters() {
  const list = filteredVoters();
  $('#v_count').textContent = `${list.length} of ${A.voters.length} voters shown · ${A.voters.filter(v => v.has_voted).length} voted · ${A.voters.filter(v => !v.face_enrolled).length} without face`;
  $('#v_body').innerHTML = list.map(v => `<tr class="click" data-vid="${esc(v.id)}">
    <td>${avatarHTML(v.name, v.photo, 38)}</td><td class="mono">${esc(v.id)}</td><td><b>${esc(v.name)}</b></td><td>${esc(v.flat)}</td>
    <td><b>${v.weight}</b> <span class="muted" style="font-size:12px">${v.weight_override ? 'custom' : v.block ? 'block ' + esc(v.block) : 'default'}</span></td>
    <td>${esc(v.phone)}</td><td>${esc(v.id_type)}${v.id_number ? ' · ' + esc(v.id_number) : ''}</td>
    <td>${v.face_enrolled ? '<span class="badge lead">✓ Registered</span>' : '<span class="badge no">Missing</span>'}</td>
    <td>${v.has_voted ? `<span class="badge lead">Voted</span> <span class="muted" style="font-size:12px">${esc(v.voted_at.slice(11, 16))}</span>` : '<span class="badge gray">Not yet</span>'}</td></tr>`).join('')
    || `<tr><td colspan="9" class="muted" style="text-align:center;padding:30px">No voters. Click “Add voter” or “Import CSV”.</td></tr>`;
}

function voterModal(v) {
  const isNew = !v;
  v = v || { name: '', flat: '', phone: '', id_type: 'Aadhaar Card', id_number: '' };
  const m = modal(`
    <div class="row"><h2 style="margin:0">${isNew ? 'Add voter' : 'Voter ' + esc(v.id)}</h2><div class="spacer"></div>${v.has_voted ? '<span class="badge lead">Voted ' + esc(v.voted_at) + '</span>' : ''}</div>
    <div class="face-box" style="margin-top:16px">
      <div>
        <label class="field">Full name *<input id="vm_name" value="${esc(v.name)}"></label>
        <label class="field">Flat number *<input id="vm_flat" value="${esc(v.flat)}" placeholder="e.g. A-101"></label>
        <label class="field">Mobile<input id="vm_phone" value="${esc(v.phone)}"></label>
        <label class="field">Photo ID type<select id="vm_idt">${ID_TYPES.map(x => `<option ${x === v.id_type ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field">Photo ID number (last 4 digits is enough)<input id="vm_idn" value="${esc(v.id_number)}"></label>
        <label class="field">Vote weight <span class="muted" style="font-weight:400">— leave empty to use the block weight${v.weight !== undefined ? ` (now ${v.weight})` : ''}</span>
          <input id="vm_w" value="${esc(v.weight_override || '')}" placeholder="e.g. 1.25" inputmode="decimal"></label>
        ${v.verify_method ? `<p class="hint">Verified at booth by: ${esc(v.verify_method)}</p>` : ''}
      </div>
      <div>
        <b>Face registration</b>
        <p class="hint" style="margin:4px 0 10px">Needed so the booth can recognise this voter.</p>
        <div id="vm_face"></div>
      </div>
    </div>
    <div class="row" style="margin-top:16px">
      ${!isNew && !v.has_voted ? '<button class="btn bad small" id="vm_del">Delete voter</button>' : ''}
      ${!isNew ? '<button class="btn secondary small" id="vm_slip">🖨 Print slip</button>' : ''}
      <div class="spacer"></div>
      <button class="btn secondary" id="vm_close">Close</button>
      <button class="btn" id="vm_save">${isNew ? 'Save & register face →' : 'Save details'}</button>
    </div>`, 'wide');
  const faceBox = $('#vm_face', m.el);
  const renderFace = () => {
    if (!v.id) { faceBox.innerHTML = '<div class="empty" style="padding:30px;border:2px dashed var(--line);border-radius:12px;text-align:center;color:var(--muted)">Save the details first</div>'; return; }
    faceEnroll(faceBox, v, () => { loadVoters(); });
  };
  renderFace();
  const cleanup = () => { Face.stopCamera(); m.close(); };
  $('#vm_close', m.el).onclick = cleanup;
  m.back.addEventListener('mousedown', e => { if (e.target === m.back) Face.stopCamera(); });
  if ($('#vm_del', m.el)) $('#vm_del', m.el).onclick = async () => {
    if (!(await confirmBox('Delete voter?', `${esc(v.name)} (${esc(v.flat)}) will be removed from the voter list.`, 'Delete', 'bad'))) return;
    try { await api('admin/voter/delete', { id: v.id }); cleanup(); loadVoters(); toast('Deleted'); } catch (e) { toast(e.message, 'bad'); }
  };
  if ($('#vm_slip', m.el)) $('#vm_slip', m.el).onclick = () => printSlips([v]);
  $('#vm_save', m.el).onclick = async () => {
    const body = { id: v.id, name: $('#vm_name', m.el).value, flat: $('#vm_flat', m.el).value, phone: $('#vm_phone', m.el).value, id_type: $('#vm_idt', m.el).value, id_number: $('#vm_idn', m.el).value, weight: $('#vm_w', m.el).value };
    try {
      const r = await api('admin/voter/save', body);
      toast('Saved', 'ok');
      if (!v.id) { v = { ...body, id: r.id, face_enrolled: false }; $('#vm_save', m.el).textContent = 'Save details'; m.el.querySelector('h2').textContent = 'Voter ' + r.id; renderFace(); }
      loadVoters();
    } catch (e) { toast(e.message, 'bad'); }
  };
  setTimeout(() => $('#vm_name', m.el)?.focus(), 30);
}

// face enrolment widget (camera or upload)
function faceEnroll(box, v, onDone) {
  const camOK = A.isLocal && !!navigator.mediaDevices?.getUserMedia;
  box.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${avatarHTML(v.name, v.photo, 64)}
      <div>${v.face_enrolled ? '<span class="badge lead">✓ Face registered</span>' : '<span class="badge no">Not registered</span>'}</div></div>
    <div class="cam-wrap hidden" id="fe_cam"><video id="fe_video" autoplay muted playsinline></video><canvas class="overlay" id="fe_ov"></canvas><div class="cam-guide" id="fe_guide"></div><div class="cam-msg" id="fe_msg" style="font-size:15px"></div></div>
    <div class="row" style="margin-top:10px">
      ${camOK ? `<button class="btn small" id="fe_start">📷 Use camera</button><button class="btn small ok hidden" id="fe_snap">● Capture</button>` : ''}
      <label class="btn small secondary">⬆ Upload photo<input type="file" accept="image/*" id="fe_file" hidden></label>
    </div>
    ${camOK ? '' : '<p class="hint" style="margin-top:8px">Camera works only on the main computer (localhost). Here you can upload a clear, front-facing photo.</p>'}
    <p class="hint" id="fe_status" style="margin-top:8px"></p>`;
  const status = (s, bad) => { const e = $('#fe_status', box); e.textContent = s; e.style.color = bad ? 'var(--bad)' : ''; };
  let stopLoop = null, lastDet = null;

  const submit = async (descriptor, photo, force = false) => {
    status('Saving…');
    try {
      const r = await api('admin/voter/face', { id: v.id, descriptor, photo, force });
      if (!r.ok && r.duplicate) {
        const yes = await confirmBox('Possible duplicate person', esc(r.error) + '<br><br>Only continue if these are really two different people (e.g. twins).', 'Register anyway', 'warn');
        if (yes) return submit(descriptor, photo, true);
        status('Not saved: ' + r.error, true); return;
      }
      v.face_enrolled = true; v.photo = photo;
      if (stopLoop) stopLoop(); Face.stopCamera();
      toast('Face registered ✓', 'ok');
      faceEnroll(box, v, onDone); onDone && onDone();
    } catch (e) { status(e.message, true); }
  };

  const ensureModels = async () => {
    status('Loading face recognition…');
    await Face.load(p => status(`Loading face recognition… ${Math.round(p * 100)}%`));
    status('');
  };

  $('#fe_file', box).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      await ensureModels();
      const url = await fileToDataURL(f, 640);
      const img = await loadImage(url);
      status('Finding face…');
      const n = await Face.countFaces(img);
      if (n > 1) return status('More than one face in the photo. Use a photo of only this voter.', true);
      const d = await Face.describe(img);
      if (!d) return status('No clear face found. Try a brighter, front-facing photo.', true);
      const b = d.detection.box, s = Math.max(b.width, b.height) * 1.6;
      const c = document.createElement('canvas'); c.width = c.height = 280;
      c.getContext('2d').drawImage(img, b.x + b.width / 2 - s / 2, b.y + b.height / 2 - s / 2, s, s, 0, 0, 280, 280);
      submit(Array.from(d.descriptor), c.toDataURL('image/jpeg', .85));
    } catch (err) { status(err.message, true); }
  };

  if (camOK) {
    $('#fe_start', box).onclick = async () => {
      try {
        await ensureModels();
        $('#fe_cam', box).classList.remove('hidden');
        const vid = $('#fe_video', box);
        await Face.startCamera(vid);
        $('#fe_start', box).classList.add('hidden'); $('#fe_snap', box).classList.remove('hidden');
        stopLoop = Face.loop(vid, async det => {
          if (!document.body.contains(vid)) { stopLoop(); Face.stopCamera(); return; }
          lastDet = det;
          Face.draw($('#fe_ov', box), vid, det);
          const good = det && det.detection.box.width / vid.videoWidth > 0.2;
          $('#fe_guide', box).classList.toggle('good', !!good);
          $('#fe_msg', box).textContent = !det ? 'Look straight at the camera' : good ? 'Good — press Capture' : 'Come a little closer';
        });
      } catch (e) { status(e.message, true); }
    };
    $('#fe_snap', box).onclick = async () => {
      const vid = $('#fe_video', box);
      status('Capturing… keep still');
      if (await Face.countFaces(vid) > 1) return status('Only the voter should be in front of the camera.', true);
      const descs = []; let det = null;
      for (let i = 0; i < 5; i++) { const d = await Face.describe(vid); if (d) { descs.push(Array.from(d.descriptor)); det = d; } }
      if (descs.length < 2) return status('Face not clear. Improve lighting and try again.', true);
      submit(Face.averageDescriptors(descs), Face.snapshot(vid, 280, det.detection.box));
    };
  }
}

function importModal() {
  const m = modal(`<h2>Import voters from CSV / Excel</h2>
    <p class="muted">In Excel or Google Sheets, make columns <b>Name, Flat</b> (and optionally <b>Phone, ID Type, ID Number, Weight</b>), then <i>File → Save As → CSV</i>. Duplicates (same name + flat) are skipped.</p>
    <label class="btn secondary">📄 Choose CSV file<input type="file" accept=".csv,text/csv" id="im_file" hidden></label>
    <label class="field" style="margin-top:12px">…or paste here<textarea id="im_text" rows="8" placeholder="Name,Flat,Phone&#10;Asha Kulkarni,A-101,9876543210"></textarea></label>
    <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-a="x">Cancel</button><button class="btn" data-a="go">Import</button></div>`);
  $('#im_file', m.el).onchange = async e => { const f = e.target.files[0]; if (f) $('#im_text', m.el).value = await f.text(); };
  m.el.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') return m.close();
    try { const r = await api('admin/voters/import', { csv: $('#im_text', m.el).value }); m.close(); toast(`${r.added} added, ${r.skipped} skipped`, 'ok'); loadVoters(); }
    catch (err) { toast(err.message, 'bad'); }
  });
}

function qrSVG(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0 });
}

function printSlips(list) {
  list = Array.isArray(list) ? list : filteredVoters().filter(v => !v.has_voted);
  if (!list.length) return toast('No voters to print', 'bad');
  const d = A.dash || {};
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><title>Voter Slips</title><style>
    @page{size:A4;margin:10mm}body{font-family:-apple-system,Segoe UI,Arial,sans-serif;margin:0}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
    .s{border:1.5px dashed #888;border-radius:8px;padding:5mm;display:flex;gap:5mm;align-items:center;break-inside:avoid;height:58mm}
    .s svg{width:34mm;height:34mm}.s h4{margin:0 0 2mm;font-size:11px;color:#555;text-transform:uppercase}
    .n{font-size:18px;font-weight:800}.f{font-size:15px;font-weight:700;margin:1mm 0}.i{font-family:monospace;font-size:14px}
    .p{width:20mm;height:20mm;border-radius:50%;object-fit:cover;float:right}
    .h{font-size:10px;color:#555;margin-top:2mm}</style></head><body><div class="g">
    ${list.map(v => `<div class="s">${qrSVG('SOCVOTE:' + v.id)}<div style="flex:1">
      <h4>${esc(d.society_name || '')} · ${esc(d.election_name || '')}</h4>
      ${v.photo ? `<img class="p" src="${v.photo}">` : ''}<div class="n">${esc(v.name)}</div><div class="f">Flat ${esc(v.flat)}</div><div class="i">${esc(v.id)}</div>
      <div class="h">Bring this slip and your photo ID. Show the QR code to the booth camera.<br>यह पर्ची और फोटो पहचान पत्र साथ लाएँ।</div></div></div>`).join('')}
    </div><script>setTimeout(()=>print(),400)<\/script></body></html>`);
  w.document.close();
}

// ------------------------------------------------ posts & candidates
async function loadCandidates() {
  const r = await api('admin/posts');
  A.posts = r.posts; A.teams = r.teams; A.locked = r.locked;
  const tmap = {}; r.teams.forEach(t => tmap[t.id] = t);
  const el = $('#tab-candidates');
  const L = r.locked;
  el.innerHTML = `
    ${L ? '<div class="integrity bad" style="margin-bottom:14px">🔒 Locked — teams and candidates cannot be changed after voting has started.</div>' : ''}
    <div class="card" style="margin-bottom:16px">
      <div class="section-title"><h2>Teams / Panels</h2><div class="spacer"></div>${L ? '' : '<button class="btn small" id="t_add">➕ Add team</button>'}</div>
      <p class="hint">Each team has a colour and symbol so voters can recognise it on the ballot. Candidates can also be independent (no team).</p>
      <div class="team-list">${r.teams.map(t => {
        const n = r.posts.reduce((s, p) => s + p.candidates.filter(c => c.team_id === t.id).length, 0);
        return `<div class="team-card" style="--team:${t.color}"><span class="team-sym">${esc(t.symbol || '')}</span>
          <div style="flex:1"><b>${esc(t.name)}</b><div class="muted" style="font-size:13px">${n} candidate${n === 1 ? '' : 's'}</div></div>
          ${L ? '' : `<button class="btn small ghost" data-tedit="${t.id}">Edit</button>`}</div>`;
      }).join('') || '<p class="muted">No teams yet.</p>'}</div>
    </div>
    <div class="toolbar"><p class="muted" style="margin:0">A <b>post</b> is what people vote for, e.g. “Managing Committee — 10 seats”. Every ballot also gets “None of the above”.</p><div class="spacer"></div>
      ${L ? '' : '<button class="btn" id="p_add">➕ Add post</button>'}</div>
    ${r.posts.map((p, i) => {
      const groups = [...r.teams.map(t => [t, p.candidates.filter(c => c.team_id === t.id)]), [null, p.candidates.filter(c => !c.team_id || !tmap[c.team_id])]].filter(g => g[1].length);
      return `<div class="card post-card">
      <div class="hd"><h3>${i + 1}. ${esc(p.name)}</h3>${p.name_hi ? `<span class="muted">${esc(p.name_hi)}</span>` : ''}
        <span class="badge gray">${p.seats} seat${p.seats > 1 ? 's' : ''} · voter chooses up to ${p.seats}</span><span class="muted" style="font-size:13px">${p.candidates.length} candidates</span><div class="spacer"></div>
        ${L ? '' : `<button class="btn small secondary" data-pmove="${p.id}" data-dir="up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn small secondary" data-pmove="${p.id}" data-dir="down" ${i === r.posts.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn small secondary" data-pedit="${p.id}">Edit</button><button class="btn small bad" data-pdel="${p.id}">Delete</button>`}</div>
      ${groups.map(([t, cs]) => `<div class="cgroup" style="--team:${t ? t.color : '#9ca3af'}"><div class="cg-hd">${t ? esc(t.symbol || '') + ' ' + esc(t.name) : 'Independent'} <span class="muted">(${cs.length})</span></div>
        <div class="cand-list">${cs.map(c => `<div class="cand-it">${avatarHTML(c.name, c.photo, 42, t ? t.color : null)}
          <div style="flex:1"><b>${esc(c.name)}</b><div class="muted" style="font-size:13px">${esc(c.flat)}</div></div><span class="sym">${esc(c.symbol)}</span>
          ${L ? '' : `<button class="btn small ghost" data-cedit="${c.id}" data-post="${p.id}">Edit</button>`}</div>`).join('')}</div></div>`).join('')}
      ${L ? '' : `<button class="btn secondary" style="margin-top:12px" data-cadd="${p.id}">➕ Add candidate</button>`}
      </div>`;
    }).join('') || '<div class="card"><p class="muted">No posts yet. For a team election create one post like “Managing Committee” with 10 seats.</p></div>'}`;
  if ($('#p_add')) $('#p_add').onclick = () => postModal(null);
  if ($('#t_add')) $('#t_add').onclick = () => teamModal(null);
  el.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tedit) teamModal(A.teams.find(x => x.id == t.dataset.tedit));
    if (t.dataset.pedit) postModal(A.posts.find(p => p.id == t.dataset.pedit));
    if (t.dataset.pmove) { await api('admin/post/move', { id: Number(t.dataset.pmove), dir: t.dataset.dir }); loadCandidates(); }
    if (t.dataset.pdel) {
      const p = A.posts.find(p => p.id == t.dataset.pdel);
      if (await confirmBox('Delete post?', `"${esc(p.name)}" and its ${p.candidates.length} candidates will be removed.`, 'Delete', 'bad')) {
        try { await api('admin/post/delete', { id: p.id }); loadCandidates(); } catch (err) { toast(err.message, 'bad'); }
      }
    }
    if (t.dataset.cadd) candModal(null, Number(t.dataset.cadd));
    if (t.dataset.cedit) candModal(A.posts.find(p => p.id == t.dataset.post).candidates.find(c => c.id == t.dataset.cedit), Number(t.dataset.post));
  };
}

const TEAM_COLORS = ['#15803d', '#a16207', '#ea580c', '#1d4e9e', '#b91c1c', '#6b3fa0', '#0f766e', '#334155'];
function teamModal(t) {
  t = t || { name: '', color: TEAM_COLORS[(A.teams || []).length % TEAM_COLORS.length], symbol: '' };
  let color = t.color, symbol = t.symbol;
  const m = modal(`<h2>${t.id ? 'Edit team' : 'Add team'}</h2>
    <label class="field">Team / panel name *<input id="tm_n" value="${esc(t.name)}" placeholder="e.g. Team Pragati"></label>
    <b style="font-size:14px">Colour</b>
    <div class="row" style="margin:6px 0 12px" id="tm_cols">${TEAM_COLORS.map(c => `<button data-col="${c}" class="colbtn ${c === color ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
    <b style="font-size:14px">Team symbol (shown on the ballot)</b>
    <div class="sym-grid">${SYMBOLS.map(x => `<button data-sym="${x}" class="${x === symbol ? 'on' : ''}">${x}</button>`).join('')}</div>
    <p class="hint">Tip: give every candidate of a team the same symbol so voters can spot the team easily.</p>
    <div class="row">${t.id ? '<button class="btn bad small" data-a="d">Delete team</button>' : ''}<div class="spacer"></div><button class="btn secondary" data-a="x">Cancel</button><button class="btn" data-a="s">Save</button></div>`);
  m.el.addEventListener('click', async e => {
    const cb = e.target.closest('[data-col]'); if (cb) { color = cb.dataset.col; $$('[data-col]', m.el).forEach(b => b.classList.toggle('on', b === cb)); return; }
    const sb = e.target.closest('[data-sym]'); if (sb) { symbol = symbol === sb.dataset.sym ? '' : sb.dataset.sym; $$('[data-sym]', m.el).forEach(b => b.classList.toggle('on', b.dataset.sym === symbol)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') return m.close();
    try {
      if (a === 'd') { if (!(await confirmBox('Delete team?', 'Its candidates stay, but become independent.', 'Delete', 'bad'))) return; await api('admin/team/delete', { id: t.id }); }
      else await api('admin/team/save', { id: t.id, name: $('#tm_n', m.el).value, color, symbol });
      m.close(); loadCandidates();
    } catch (err) { toast(err.message, 'bad'); }
  });
  setTimeout(() => $('#tm_n', m.el).focus(), 30);
}

function postModal(p) {
  p = p || { name: '', name_hi: '', seats: 1 };
  const m = modal(`<h2>${p.id ? 'Edit post' : 'Add post'}</h2>
    <label class="field">Post name *<input id="pm_n" value="${esc(p.name)}" placeholder="e.g. President"></label>
    <label class="field">Post name in Hindi (optional, shown on Hindi ballot)<input id="pm_h" value="${esc(p.name_hi)}" placeholder="e.g. अध्यक्ष"></label>
    <label class="field">Number of seats (how many can each voter choose?)<input id="pm_s" type="number" min="1" max="20" value="${p.seats}"></label>
    <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-a="x">Cancel</button><button class="btn" data-a="s">Save</button></div>`);
  m.el.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') return m.close();
    try { await api('admin/post/save', { id: p.id, name: $('#pm_n', m.el).value, name_hi: $('#pm_h', m.el).value, seats: Number($('#pm_s', m.el).value) }); m.close(); loadCandidates(); }
    catch (err) { toast(err.message, 'bad'); }
  });
  setTimeout(() => $('#pm_n', m.el).focus(), 30);
}

function candModal(c, postId) {
  c = c || { name: '', flat: '', symbol: '', photo: '', team_id: A.lastTeam || null };
  let photo = c.photo, symbol = c.symbol;
  const m = modal(`<h2>${c.id ? 'Edit candidate' : 'Add candidate'}</h2>
    <div class="row" style="align-items:flex-start;gap:18px">
      <div style="text-align:center"><div id="cm_av">${avatarHTML(c.name || '?', photo, 110)}</div>
        <label class="btn small secondary" style="margin-top:8px">⬆ Photo<input type="file" accept="image/*" id="cm_file" hidden></label>
        <button class="btn small ghost" id="cm_rm">Remove</button></div>
      <div style="flex:1;min-width:240px">
        <label class="field">Candidate name *<input id="cm_n" value="${esc(c.name)}"></label>
        <label class="field">Flat number<input id="cm_f" value="${esc(c.flat)}"></label>
        <label class="field">Team<select id="cm_t"><option value="">— Independent (no team) —</option>${(A.teams || []).map(t => `<option value="${t.id}" ${t.id === c.team_id ? 'selected' : ''}>${esc(t.symbol || '')} ${esc(t.name)}</option>`).join('')}</select></label>
      </div></div>
    <b style="font-size:14px">Symbol (helps voters who cannot read easily)</b>
    <div class="sym-grid">${SYMBOLS.map(s => `<button data-sym="${s}" class="${s === symbol ? 'on' : ''}">${s}</button>`).join('')}</div>
    <div class="row">${c.id ? '<button class="btn bad small" data-a="d">Delete candidate</button>' : ''}<div class="spacer"></div><button class="btn secondary" data-a="x">Cancel</button><button class="btn" data-a="s">Save</button></div>`, 'wide');
  const refreshAv = () => { $('#cm_av', m.el).innerHTML = avatarHTML($('#cm_n', m.el).value || '?', photo, 110); };
  $('#cm_t', m.el).onchange = () => { const t = (A.teams || []).find(x => x.id == $('#cm_t', m.el).value); if (t && t.symbol && !symbol) { symbol = t.symbol; $$('[data-sym]', m.el).forEach(b => b.classList.toggle('on', b.dataset.sym === symbol)); } };
  $('#cm_n', m.el).oninput = refreshAv;
  $('#cm_file', m.el).onchange = async e => { if (e.target.files[0]) { photo = await fileToDataURL(e.target.files[0], 360); refreshAv(); } };
  $('#cm_rm', m.el).onclick = () => { photo = ''; refreshAv(); };
  m.el.addEventListener('click', async e => {
    const sb = e.target.closest('[data-sym]');
    if (sb) { symbol = symbol === sb.dataset.sym ? '' : sb.dataset.sym; $$('[data-sym]', m.el).forEach(b => b.classList.toggle('on', b.dataset.sym === symbol)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') return m.close();
    try {
      if (a === 'd') { if (!(await confirmBox('Delete candidate?', esc(c.name), 'Delete', 'bad'))) return; await api('admin/candidate/delete', { id: c.id }); }
      else {
        const team_id = Number($('#cm_t', m.el).value) || null; A.lastTeam = team_id;
        await api('admin/candidate/save', { id: c.id, post_id: postId, team_id, name: $('#cm_n', m.el).value, flat: $('#cm_f', m.el).value, symbol, photo });
      }
      m.close(); loadCandidates();
    } catch (err) { toast(err.message, 'bad'); }
  });
}

// ------------------------------------------------ audit
async function loadAudit() {
  const el = $('#tab-audit');
  if (!el.dataset.built) {
    el.innerHTML = `<div class="toolbar"><select id="a_ev"><option value="">All events</option>${Object.keys(EV).map(k => `<option value="${k}">${EV[k][0]} ${EV[k][1]}</option>`).join('')}</select>
      <button class="btn secondary" id="a_ref">↻ Refresh</button><div class="spacer"></div><a class="btn secondary" id="a_exp">⬇ Export audit log</a></div>
      <p class="hint">Every action is recorded here. Photos taken at the booth during verification can be viewed for disputes. Vote choices are never recorded with a name (secret ballot).</p>
      <table class="t"><thead><tr><th>#</th><th>Time</th><th>Event</th><th>Voter</th><th>Detail</th><th></th></tr></thead><tbody id="a_body"></tbody></table>`;
    el.dataset.built = '1';
    $('#a_ev').onchange = loadAudit; $('#a_ref').onclick = loadAudit;
    $('#a_body').addEventListener('click', e => { const b = e.target.closest('[data-snap]'); if (b) showSnapshot(b.dataset.snap); });
  }
  $('#a_exp').href = '/api/admin/export/audit.csv?' + tokenQ();
  const r = await api('admin/audit?limit=1000&event=' + ($('#a_ev').value || ''));
  $('#a_body').innerHTML = r.audit.map(a => `<tr><td class="muted">${a.id}</td><td class="mono" style="white-space:nowrap">${esc(a.ts)}</td>
    <td>${evIcon(a.event)} ${evName(a.event)}</td><td>${a.voter_id ? `${esc(a.name || '')} <span class="muted">${esc(a.flat || '')} · ${esc(a.voter_id)}</span>` : ''}</td>
    <td>${esc(a.detail)}</td><td>${a.has_snap ? `<button class="btn small ghost" data-snap="${a.id}">📷</button>` : ''}</td></tr>`).join('');
}

// ------------------------------------------------ settings & backup
async function loadSettings() {
  const s = await api('admin/settings');
  const b = await api('admin/backups');
  const el = $('#tab-settings');
  const thr = parseFloat(s.face_threshold);
  el.innerHTML = `<div class="settings-grid">
    <div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Election details</h2></div>
        <label class="field">Society name<input id="s_soc" value="${esc(s.society_name)}"></label>
        <label class="field">Election name<input id="s_el" value="${esc(s.election_name)}"></label>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>⚖️ Vote weight by block</h2></div>
        <p class="hint">Each flat's vote counts by its size. The block is read from the flat number (A-101 → block A). ${s.status !== 'setup' ? '<b>Locked after voting starts.</b>' : ''}</p>
        <table class="t wtab"><thead><tr><th>Block</th><th>Area (sq ft)</th><th>Vote weight</th><th>Flats</th><th></th></tr></thead><tbody id="s_wt"></tbody></table>
        <div class="row" style="margin-top:10px"><button class="btn small secondary" id="s_wadd" ${s.status !== 'setup' ? 'disabled' : ''}>➕ Add block</button>
          <div class="spacer"></div><label style="font-size:14px;font-weight:600">Any other flat: <input id="s_dw" value="${esc(s.default_weight)}" style="width:70px;padding:6px 8px;border:1.5px solid var(--line);border-radius:8px" ${s.status !== 'setup' ? 'disabled' : ''}></label></div>
        <p class="hint" style="margin-top:10px">Weights for a single flat can be changed on that voter's page.</p>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>🚩 Team voting rules</h2></div>
        <label class="check"><input type="checkbox" id="s_ct" ${s.cross_team === '1' ? 'checked' : ''} ${s.status !== 'setup' ? 'disabled' : ''}><span><b>Allow mixing teams</b><br><span class="muted">Voters can pick members from different teams. If off, all choices must be from one team.</span></span></label>
        <label class="check"><input type="checkbox" id="s_mf" ${s.must_fill_all === '1' ? 'checked' : ''} ${s.status !== 'setup' ? 'disabled' : ''}><span><b>Voter must choose all seats</b><br><span class="muted">e.g. exactly 10 members. If off, a voter may choose fewer (up to 10).</span></span></label>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Verification rules</h2></div>
        <label class="check"><input type="checkbox" id="s_rf" ${s.require_face === '1' ? 'checked' : ''}><span><b>Require face verification</b><br><span class="muted">If off, voters without a registered face just confirm their name on screen.</span></span></label>
        <label class="check"><input type="checkbox" id="s_lv" ${s.liveness === '1' ? 'checked' : ''}><span><b>Blink check (anti-photo)</b><br><span class="muted">Asks the voter to blink so a printed photo cannot be used.</span></span></label>
        <label class="check"><input type="checkbox" id="s_ov" ${s.one_vote_per_flat === '1' ? 'checked' : ''} ${s.status !== 'setup' ? 'disabled' : ''}><span><b>One vote per flat</b> (recommended with weighted votes)<br><span class="muted">Once anyone from a flat votes, others from that flat cannot. ${s.status !== 'setup' ? '(locked after voting starts)' : ''}</span></span></label>
        <label class="field" style="margin-top:14px">Face match strictness: <span id="s_thrv"></span>
          <input type="range" id="s_thr" min="0.35" max="0.65" step="0.01" value="${thr}"></label>
        <p class="hint">Left = stricter (fewer false matches, more retries). 0.50 is a good default. Try 0.55 if elderly voters fail often.</p>
        <label class="field">Face attempts before calling officer<input type="number" id="s_ma" min="1" max="10" value="${esc(s.max_face_attempts)}"></label>
        <label class="field">Booth idle timeout (seconds)<input type="number" id="s_idle" min="60" max="900" value="${esc(s.booth_idle_seconds)}"></label>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Results screen</h2></div>
        <label class="check"><input type="checkbox" id="s_pub" ${s.public_live_results === '1' ? 'checked' : ''}><span><b>Show live vote counts on the public results screen</b><br><span class="muted">If off, the screen shows only turnout until voting closes (recommended).</span></span></label>
      </div>
      <button class="btn" id="s_save" style="width:100%">💾 Save settings</button>
    </div>
    <div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Backups &amp; exports</h2></div>
        <p class="hint">Everything is saved instantly to <span class="mono">${esc(b.folder.replace(/\/backups$/, ''))}</span>. A copy is also made after every vote (latest.db) and every 5 minutes. Copy the <b>data</b> folder to a pen drive after the election.</p>
        <div class="ctl" style="margin-bottom:12px">
          <button class="btn" id="s_bk">💾 Back up now</button>
          <a class="btn secondary" href="/api/admin/export/database?${tokenQ()}">⬇ Download database</a>
          <a class="btn secondary" href="/api/admin/export/results.csv?${tokenQ()}">⬇ Results (CSV)</a>
          <a class="btn secondary" href="/api/admin/export/turnout.csv?${tokenQ()}">⬇ Voter turnout (CSV)</a>
          <a class="btn secondary" href="/api/admin/export/audit.csv?${tokenQ()}">⬇ Audit log (CSV)</a>
        </div>
        <details><summary class="muted" style="cursor:pointer">Recent backup files (${b.files.length})</summary>
          <div style="max-height:180px;overflow:auto;font-size:12.5px" class="mono">${b.files.map(f => `<div>${esc(f.name)} · ${(f.size / 1024).toFixed(0)} KB</div>`).join('')}</div></details>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>Tamper check</h2></div>
        <p class="hint">Each ballot is digitally sealed. This checks every seal and that the number of ballots equals the number of voters marked as voted.</p>
        <button class="btn secondary" id="s_ig">🛡️ Run tamper check</button><div id="s_igr" style="margin-top:10px"></div>
      </div>
      <div class="card" style="margin-bottom:18px"><div class="section-title"><h2>PINs</h2></div>
        <label class="field">Current admin PIN<input type="password" id="s_cur" inputmode="numeric"></label>
        <label class="field">Change<select id="s_which"><option value="admin_pin">Admin PIN</option><option value="officer_pin">Polling officer PIN</option></select></label>
        <label class="field">New PIN<input type="password" id="s_new" inputmode="numeric"></label>
        <button class="btn secondary" id="s_pin">Change PIN</button>
      </div>
      <div class="card danger"><div class="section-title"><h2>Trial run tools</h2></div>
        <p class="hint">Do a mock election with committee members first. Then reset the votes (voters, faces and candidates are kept).</p>
        <div class="ctl"><button class="btn secondary" id="s_sample" ${s.status !== 'setup' ? 'disabled' : ''}>🧪 Load sample teams &amp; voters</button>
        <button class="btn bad" id="s_reset" ${s.status === 'open' ? 'disabled' : ''}>♻️ Reset all votes…</button></div>
      </div>
    </div></div>`;
  let wt = JSON.parse(s.block_weights || '[]');
  const found = s.blocks_found || {};
  Object.keys(found).filter(b => b !== '(none)' && !wt.some(r => r.block === b)).forEach(b => wt.push({ block: b, area: '', weight: '' }));
  const lockW = s.status !== 'setup';
  const drawW = () => {
    $('#s_wt').innerHTML = wt.map((r, i) => `<tr><td><input data-i="${i}" data-k="block" value="${esc(r.block)}" style="width:70px" ${lockW ? 'disabled' : ''}></td>
      <td><input data-i="${i}" data-k="area" value="${esc(r.area)}" style="width:90px" inputmode="numeric" ${lockW ? 'disabled' : ''}></td>
      <td><input data-i="${i}" data-k="weight" value="${esc(r.weight)}" style="width:80px" inputmode="decimal" placeholder="e.g. 1.25" ${lockW ? 'disabled' : ''}></td>
      <td class="muted">${found[String(r.block).toUpperCase()] || 0}</td>
      <td>${lockW ? '' : `<button class="btn small ghost" data-wdel="${i}">✕</button>`}</td></tr>`).join('')
      + (found['(none)'] ? `<tr><td colspan="5" class="muted" style="font-size:12.5px">${found['(none)']} flat(s) have no block letter and use the “any other flat” weight.</td></tr>` : '');
  };
  drawW();
  $('#s_wt').addEventListener('input', e => { const i = e.target.dataset.i; if (i !== undefined) wt[i][e.target.dataset.k] = e.target.value; });
  $('#s_wt').addEventListener('click', e => { const b = e.target.closest('[data-wdel]'); if (b) { wt.splice(Number(b.dataset.wdel), 1); drawW(); } });
  $('#s_wadd').onclick = () => { wt.push({ block: '', area: '', weight: '' }); drawW(); };
  const thrLabel = () => { const v = parseFloat($('#s_thr').value); $('#s_thrv').textContent = v.toFixed(2) + (v < 0.45 ? ' (strict)' : v > 0.56 ? ' (lenient)' : ' (balanced)'); };
  $('#s_thr').oninput = thrLabel; thrLabel();
  $('#s_save').onclick = async () => {
    try {
      await api('admin/settings', {
        society_name: $('#s_soc').value, election_name: $('#s_el').value, require_face: $('#s_rf').checked ? '1' : '0', liveness: $('#s_lv').checked ? '1' : '0',
        one_vote_per_flat: $('#s_ov').checked ? '1' : '0', face_threshold: $('#s_thr').value, max_face_attempts: $('#s_ma').value,
        booth_idle_seconds: $('#s_idle').value, public_live_results: $('#s_pub').checked ? '1' : '0',
        ...(lockW ? {} : {
          block_weights: wt.filter(r => String(r.block).trim() && String(r.weight).trim()).map(r => ({ block: r.block, area: r.area, weight: r.weight })),
          default_weight: $('#s_dw').value, cross_team: $('#s_ct').checked ? '1' : '0', must_fill_all: $('#s_mf').checked ? '1' : '0',
        }),
      });
      loadSettings();
      toast('Settings saved ✓', 'ok'); refreshHeader();
    } catch (e) { toast(e.message, 'bad'); }
  };
  $('#s_bk').onclick = async () => { try { const r = await api('admin/backup', {}); toast('Backup saved: ' + r.file, 'ok'); loadSettings(); } catch (e) { toast(e.message, 'bad'); } };
  $('#s_ig').onclick = async () => {
    const r = await api('admin/integrity');
    $('#s_igr').innerHTML = `<div class="integrity ${r.ok ? 'ok' : 'bad'}">${r.ok ? '🛡️ All good' : '🚨 Problem found'} — ${r.ballots} ballots, ${r.voters_marked_voted} voters marked voted, ${r.bad_signatures} broken seals</div>
      <p class="hint" style="margin-top:6px">Fingerprint: <span class="mono">${r.fingerprint}</span> (write this on the result sheet)</p>`;
  };
  $('#s_pin').onclick = async () => {
    try { await api('admin/change_pin', { current: $('#s_cur').value, which: $('#s_which').value, new: $('#s_new').value }); toast('PIN changed ✓', 'ok'); $('#s_cur').value = $('#s_new').value = ''; }
    catch (e) { toast(e.message, 'bad'); }
  };
  $('#s_sample').onclick = async () => { try { await api('admin/sample', {}); toast('Sample data loaded', 'ok'); loadSettings(); } catch (e) { toast(e.message, 'bad'); } };
  $('#s_reset').onclick = () => {
    const m = modal(`<h2>♻️ Reset all votes?</h2><p class="muted">All ballots will be deleted and every voter can vote again. A backup is saved first. Voters, faces, posts and candidates are kept.</p>
      <label class="field">Type RESET<input id="rs_c"></label><label class="field">Admin PIN<input id="rs_p" type="password"></label>
      <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-a="x">Cancel</button><button class="btn bad" data-a="go">Reset votes</button></div>`);
    m.el.addEventListener('click', async e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'x') return m.close();
      try { const r = await api('admin/reset', { confirm: $('#rs_c', m.el).value.trim(), pin: $('#rs_p', m.el).value }); m.close(); toast('Votes reset. Backup: ' + r.backup, 'ok'); loadSettings(); }
      catch (err) { toast(err.message, 'bad'); }
    });
  };
}

// ------------------------------------------------ boot
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { Face.stopCamera(); switchTab(b.dataset.tab); } });
$('#btnLogout').onclick = async () => { try { await api('admin/logout', {}); } catch { } sessionStorage.removeItem('adminToken'); location.reload(); };
(async () => {
  if (sessionStorage.getItem('adminToken')) {
    try { await api('admin/dashboard', undefined, { onAuth: false }); return startApp(); } catch { sessionStorage.removeItem('adminToken'); }
  }
  showLogin();
})();
