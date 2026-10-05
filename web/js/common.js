// Shared helpers
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = sessionStorage.getItem('adminToken');
  if (tok) headers['X-Admin-Token'] = tok;
  const res = await fetch('/api/' + path, {
    method: body !== undefined ? 'POST' : 'GET',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = { ok: false, error: 'Server not responding' }; }
  if (!res.ok) {
    const e = new Error(data.error || 'Error'); e.status = res.status; e.data = data;
    if (res.status === 401 && opts.onAuth !== false && window.onAuthLost) window.onAuthLost();
    throw e;
  }
  return data;
}

let toastTimer;
function toast(msg, kind = '') {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.className = 'toast ' + kind; t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), kind === 'bad' ? 5000 : 3000);
}

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
const AV_COLORS = ['#1d4e9e', '#1d7a44', '#a1421b', '#6b3fa0', '#0f766e', '#9d174d', '#7c5a00', '#334155'];
function avatarHTML(name, photo, size = 56, color = null) {
  if (photo) return `<img class="avatar" src="${photo}" style="width:${size}px;height:${size}px" alt="">`;
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = color || AV_COLORS[h % AV_COLORS.length];
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${c};color:#fff;font-size:${Math.round(size * .38)}px">${esc(initials(name))}</span>`;
}

function modal(html, cls = '') {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${cls}">${html}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('mousedown', e => { if (e.target === back && !back.dataset.sticky) close(); });
  return { el: back.firstElementChild, close, back };
}

function confirmBox(title, text, okLabel = 'Yes', kind = '') {
  return new Promise(res => {
    const m = modal(`<h2>${esc(title)}</h2><p class="muted">${text}</p>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn secondary" data-a="no">Cancel</button>
        <button class="btn ${kind}" data-a="yes">${esc(okLabel)}</button></div>`);
    m.el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      m.close(); res(a === 'yes');
    });
  });
}

function fileToDataURL(file, maxSize = 480) {
  return new Promise((res, rej) => {
    const img = new Image();
    const r = new FileReader();
    r.onload = () => { img.src = r.result; };
    r.onerror = rej;
    img.onload = () => {
      const s = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', .85));
    };
    img.onerror = () => rej(new Error('Not an image'));
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

const STATUS_LABEL = { setup: 'Not started', open: 'Voting open', paused: 'Paused', closed: 'Closed' };
