// ===================== Voting Booth =====================
const T = {
  en: {
    loading: 'Getting the booth ready…', wait_officer: 'Please wait. The polling officer will start voting.',
    not_open: 'Voting has not started yet', paused: 'Voting is paused for a short while', closed: 'Voting has ended. Thank you!',
    welcome_title: 'Welcome to the voting booth', welcome_sub: 'Voting takes about 2 minutes. Take your time.',
    how: ['Find your name', 'Look at the camera', 'Choose candidates', 'Confirm your vote'],
    start: 'Start Voting', practice: 'Practice first (not counted)',
    find_title: 'Find your name', find_sub: 'Type your name or flat number, then tap on your name',
    scan: 'Scan my voter slip', scan_hint: 'Hold your voter slip in front of the camera', type_instead: 'Type my name instead',
    type_more: 'Start typing your name or flat number…', no_results: 'No voter found. Please check the spelling or ask the polling officer.',
    already: 'Already voted', flat_done: 'Flat already voted', space: 'Space', clear: 'Clear',
    verify_title: 'Look at the camera', is_this_you: 'Is this you?', not_me: 'Not me — go back',
    look: 'Please look at the camera', closer: 'Please come a little closer', hold: 'Hold still…',
    checking: 'Checking your face…', blink: 'Now please blink your eyes', verified: 'Verified! Welcome',
    mismatch: 'Face did not match. Please look straight at the camera and try again.',
    one_person: 'Only ONE person should be in front of the camera', no_face_reg: 'Your face is not registered. Please call the polling officer.',
    officer: 'Call polling officer', officer_title: 'Polling officer verification', officer_lead: 'Officer: check the voter\'s photo ID, then enter your PIN.',
    reason: 'Reason', confirm_me: 'Yes, this is me', self_confirm: 'Please check your name and flat, then press "Yes, this is me".',
    reasons: ['Photo ID checked – face not matching', 'Photo ID checked – face not registered', 'Camera problem – photo ID checked', 'Elderly / disabled voter – photo ID checked'],
    post_of: 'Post {a} of {b}', choose1: 'Tap on ONE candidate', chooseN: 'Tap on up to {n} candidates', any_team: ' — you may mix teams',
    nota: 'None of the above', next: 'Next', back: 'Back', review: 'Review my vote',
    exactN: 'Choose exactly {n} candidates', chosen: 'Chosen {a} of {b}', team_select: 'Select whole team', team_clear: 'Remove this team',
    team_selected: '{t}: all {n} members selected', one_team: 'You can choose members of ONE team only', must_all: 'Please choose all {n} candidates',
    independent: 'Independent candidates', vote_value: 'Your vote value',
    review_title: 'Check your choices', review_sub: 'If everything is correct, press the green button. To change, press "Change".',
    change: 'Change', cast: 'Cast My Vote', confirm_title: 'Are you sure?', confirm_text: 'Once you cast your vote, it CANNOT be changed.',
    go_back: 'No, go back', yes_cast: 'Yes, cast my vote',
    done_title: 'Thank you! Your vote has been recorded.', done_sub: 'Please step away for the next voter.',
    practice_done: 'Practice finished! This vote was NOT counted.', practice_sub: 'Now you know how it works. Press "Start Voting" to vote for real.',
    practice_banner: 'PRACTICE MODE — this vote will NOT be counted',
    still_there: 'Are you still there?', more_time: 'Yes, I need more time', returning: 'Going back to the start in {s} seconds',
    too_many: 'You can choose only {n}. Tap a selected one to remove it first.', choose_atleast: 'Please choose a candidate, or "None of the above"',
    back_in: 'Next voter in {s} seconds', cancel: 'Cancel', ok: 'OK', pin_wrong: 'Wrong PIN', camera_err: 'Camera not working: ',
    say_find: 'Please type your name or flat number, then touch your name.',
    say_team: 'Touch the photos of the members you want. You can also press Select whole team.',
    say_face: 'Please look at the camera.', say_ballot: 'Touch the photo of the candidate you want to choose. Then press Next.',
    say_review: 'Please check your choices. If correct, press the green button, Cast My Vote.', say_done: 'Thank you. Your vote has been recorded.',
  },
  hi: {
    loading: 'मतदान केंद्र तैयार हो रहा है…', wait_officer: 'कृपया प्रतीक्षा करें। मतदान अधिकारी मतदान शुरू करेंगे।',
    not_open: 'मतदान अभी शुरू नहीं हुआ है', paused: 'मतदान कुछ समय के लिए रुका है', closed: 'मतदान समाप्त हो गया है। धन्यवाद!',
    welcome_title: 'मतदान केंद्र में आपका स्वागत है', welcome_sub: 'मतदान में लगभग 2 मिनट लगते हैं। आराम से करें।',
    how: ['अपना नाम खोजें', 'कैमरे की ओर देखें', 'उम्मीदवार चुनें', 'अपना वोट पक्का करें'],
    start: 'मतदान शुरू करें', practice: 'पहले अभ्यास करें (गिना नहीं जाएगा)',
    find_title: 'अपना नाम खोजें', find_sub: 'अपना नाम या फ्लैट नंबर लिखें, फिर अपने नाम पर दबाएँ',
    scan: 'मतदाता पर्ची स्कैन करें', scan_hint: 'अपनी मतदाता पर्ची कैमरे के सामने रखें', type_instead: 'नाम लिखकर खोजें',
    type_more: 'अपना नाम या फ्लैट नंबर लिखना शुरू करें…', no_results: 'कोई मतदाता नहीं मिला। वर्तनी जाँचें या मतदान अधिकारी से पूछें।',
    already: 'वोट दे चुके हैं', flat_done: 'इस फ्लैट से वोट हो चुका', space: 'स्पेस', clear: 'मिटाएँ',
    verify_title: 'कैमरे की ओर देखें', is_this_you: 'क्या यह आप हैं?', not_me: 'यह मैं नहीं हूँ — वापस जाएँ',
    look: 'कृपया कैमरे की ओर देखें', closer: 'कृपया थोड़ा पास आएँ', hold: 'स्थिर रहें…',
    checking: 'आपका चेहरा जाँचा जा रहा है…', blink: 'अब कृपया आँखें झपकाएँ', verified: 'पहचान हो गई! स्वागत है',
    mismatch: 'चेहरा मेल नहीं खाया। कृपया सीधे कैमरे में देखें और फिर कोशिश करें।',
    one_person: 'कैमरे के सामने केवल एक व्यक्ति होना चाहिए', no_face_reg: 'आपका चेहरा पंजीकृत नहीं है। कृपया मतदान अधिकारी को बुलाएँ।',
    officer: 'मतदान अधिकारी को बुलाएँ', officer_title: 'मतदान अधिकारी द्वारा सत्यापन', officer_lead: 'अधिकारी: मतदाता का फोटो पहचान पत्र जाँचें, फिर अपना PIN डालें।',
    reason: 'कारण', confirm_me: 'हाँ, यह मैं हूँ', self_confirm: 'अपना नाम और फ्लैट जाँचें, फिर "हाँ, यह मैं हूँ" दबाएँ।',
    reasons: ['फोटो ID जाँची – चेहरा मेल नहीं खाया', 'फोटो ID जाँची – चेहरा पंजीकृत नहीं', 'कैमरे में समस्या – फोटो ID जाँची', 'बुज़ुर्ग / दिव्यांग मतदाता – फोटो ID जाँची'],
    post_of: 'पद {a} / {b}', choose1: 'किसी एक उम्मीदवार पर दबाएँ', chooseN: 'अधिकतम {n} उम्मीदवारों पर दबाएँ', any_team: ' — किसी भी टीम से',
    nota: 'इनमें से कोई नहीं', next: 'आगे', back: 'पीछे', review: 'अपना वोट देखें',
    exactN: 'ठीक {n} उम्मीदवार चुनें', chosen: '{b} में से {a} चुने गए', team_select: 'पूरी टीम चुनें', team_clear: 'यह टीम हटाएँ',
    team_selected: '{t}: सभी {n} सदस्य चुने गए', one_team: 'आप केवल एक ही टीम के सदस्य चुन सकते हैं', must_all: 'कृपया सभी {n} उम्मीदवार चुनें',
    independent: 'निर्दलीय उम्मीदवार', vote_value: 'आपके वोट का मूल्य',
    review_title: 'अपनी पसंद जाँचें', review_sub: 'सब सही है तो हरा बटन दबाएँ। बदलने के लिए "बदलें" दबाएँ।',
    change: 'बदलें', cast: 'मेरा वोट डालें', confirm_title: 'क्या आप निश्चित हैं?', confirm_text: 'वोट डालने के बाद इसे बदला नहीं जा सकता।',
    go_back: 'नहीं, वापस जाएँ', yes_cast: 'हाँ, मेरा वोट डालें',
    done_title: 'धन्यवाद! आपका वोट दर्ज हो गया है।', done_sub: 'कृपया अगले मतदाता के लिए जगह दें।',
    practice_done: 'अभ्यास पूरा हुआ! यह वोट गिना नहीं गया।', practice_sub: 'अब आप जानते हैं। असली वोट के लिए "मतदान शुरू करें" दबाएँ।',
    practice_banner: 'अभ्यास — यह वोट गिना नहीं जाएगा',
    still_there: 'क्या आप अभी भी यहाँ हैं?', more_time: 'हाँ, मुझे और समय चाहिए', returning: '{s} सेकंड में शुरुआत पर लौटेंगे',
    too_many: 'आप केवल {n} चुन सकते हैं। पहले किसी चुने हुए पर दबाकर उसे हटाएँ।', choose_atleast: 'कृपया एक उम्मीदवार या "इनमें से कोई नहीं" चुनें',
    back_in: '{s} सेकंड में अगला मतदाता', cancel: 'रद्द करें', ok: 'ठीक है', pin_wrong: 'गलत PIN', camera_err: 'कैमरा काम नहीं कर रहा: ',
    say_find: 'कृपया अपना नाम या फ्लैट नंबर लिखें, फिर अपने नाम पर दबाएँ।',
    say_team: 'जिन सदस्यों को चुनना है उनकी फोटो पर दबाएँ। आप पूरी टीम चुनें बटन भी दबा सकते हैं।',
    say_face: 'कृपया कैमरे की ओर देखें।', say_ballot: 'जिस उम्मीदवार को चुनना है, उसकी फोटो पर दबाएँ। फिर आगे दबाएँ।',
    say_review: 'कृपया अपनी पसंद जाँचें। सही है तो हरा बटन, मेरा वोट डालें, दबाएँ।', say_done: 'धन्यवाद। आपका वोट दर्ज हो गया है।',
  },
};

const B = {
  lang: localStorage.getItem('boothLang') || 'en',
  voice: localStorage.getItem('boothVoice') !== '0',
  config: null,
  screen: 'loading',
  voter: null,
  token: null,
  practice: false,
  postIdx: 0,
  sel: {},             // post_id -> [candidate ids] or ['NOTA']
  fromReview: false,
  stopFaceLoop: null,
  stopQr: null,
  stream: null,
  lastActive: Date.now(),
  idleModal: null,
};

const t = (k, vars = {}) => {
  let s = (T[B.lang][k] ?? T.en[k] ?? k);
  if (typeof s === 'string') for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', b);
  return s;
};

// ------------------------------------------------ sound & voice
let audioCtx;
function beep(freq = 660, dur = 0.08, vol = 0.15) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur); o.stop(audioCtx.currentTime + dur);
  } catch { }
}
function chime() { beep(523, .12); setTimeout(() => beep(659, .12), 120); setTimeout(() => beep(784, .25), 240); }

function say(text) {
  if (!B.voice || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const want = B.lang === 'hi' ? 'hi' : 'en';
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.toLowerCase().startsWith(want + '-in')) || voices.find(v => v.lang.toLowerCase().startsWith(want));
    if (v) u.voice = v;
    u.lang = B.lang === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch { }
}

// ------------------------------------------------ language & screens
function applyLang() {
  document.documentElement.lang = B.lang;
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $('#btnLang').textContent = B.lang === 'en' ? 'हिंदी' : 'English';
  $('#how').innerHTML = t('how').map((h, i) => `<div><span class="n">${i + 1}</span><span class="ic">${['🔍', '📷', '👆', '✅'][i]}</span>${esc(h)}</div>`).join('');
  $('#q').placeholder = t('type_more');
  $('#practiceBanner').textContent = '⚠ ' + t('practice_banner') + ' ⚠';
  buildKeyboard();
  if (B.screen === 'ballot') renderPost();
  if (B.screen === 'review') renderReview();
  if (B.screen === 'closed') showStatusScreen(B.config?.status);
  if (B.screen === 'find') doSearch();
  renderSteps();
}

function show(name) {
  B.screen = name;
  $('#toast')?.classList.add('hidden');
  $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== 's-' + name));
  $('#practiceBanner').classList.toggle('hidden', !B.practice || ['welcome', 'closed', 'loading'].includes(name));
  renderSteps();
  window.scrollTo(0, 0);
  touch();
}

function renderSteps() {
  const map = { find: 0, scan: 0, face: 1, ballot: 2, review: 3 };
  const cur = map[B.screen];
  const el = $('#steps');
  if (cur === undefined) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const labels = t('how');
  el.innerHTML = labels.map((l, i) => {
    if (B.practice && i === 1) return '';
    return `<div class="st ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><b>${i < cur ? '✓' : i + 1}</b>${esc(l)}</div>`;
  }).join('');
}

function showStatusScreen(status) {
  $('#closedMsg').textContent = status === 'paused' ? t('paused') : status === 'closed' ? t('closed') : t('not_open');
  $('#btnPractice2').classList.toggle('hidden', status === 'closed');
  if (B.screen !== 'closed') show('closed');
}

// ------------------------------------------------ reset / start
function resetSession(reason) {
  if (B.token && !B.practice) api('booth/cancel', { token: B.token, reason: reason || 'Voter left without voting' }).catch(() => { });
  stopFace(); stopQr();
  B.voter = null; B.token = null; B.practice = false; B.sel = {}; B.postIdx = 0; B.fromReview = false;
  $('#q').value = '';
  if (B.idleModal) { B.idleModal.close(); B.idleModal = null; }
}

async function goHome() {
  resetSession();
  try {
    const s = await api('booth/status');
    B.config.status = s.status;
  } catch { }
  if (B.config.status === 'open') show('welcome'); else showStatusScreen(B.config.status);
}

async function refreshConfig() {
  B.config = await api('booth/config');
  $('#hdrSociety').textContent = B.config.society_name;
  $('#hdrElection').textContent = B.config.election_name;
  document.title = 'Voting Booth – ' + B.config.election_name;
}

// ------------------------------------------------ find voter
function buildKeyboard() {
  const rows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM-'];
  $('#kbd').innerHTML = rows.map(r => `<div class="r">${[...r].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`).join('')
    + `<div class="r"><button class="wide" data-k="clear">${t('clear')}</button><button class="wide" data-k=" " style="max-width:320px;flex:4">${t('space')}</button><button class="wide" data-k="bs">⌫</button></div>`;
}

let searchTimer;
function doSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = $('#q').value.trim();
    const box = $('#results');
    if (!q) { box.innerHTML = `<div class="empty">${t('type_more')}</div>`; return; }
    try {
      const r = await api('booth/search?q=' + encodeURIComponent(q));
      if (!r.voters.length) { box.innerHTML = `<div class="empty">${t('no_results')}</div>`; return; }
      box.innerHTML = r.voters.map(v => {
        const blocked = v.has_voted || v.flat_done;
        return `<button class="vcard" data-vid="${esc(v.id)}" ${blocked ? 'disabled' : ''}>
          ${avatarHTML(v.name, v.photo, 72)}
          <div><div class="nm">${esc(v.name)}</div><div class="fl">🏠 ${esc(v.flat)} · ${esc(v.id)}</div></div>
          ${v.has_voted ? `<span class="tag">✓ ${t('already')}</span>` : v.flat_done ? `<span class="tag">${t('flat_done')}</span>` : '<span class="go">›</span>'}
        </button>`;
      }).join('');
      B.lastResults = r.voters;
    } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }, 150);
}

function startFind() {
  show('find');
  $('#q').value = '';
  doSearch();
  say(t('say_find'));
  setTimeout(() => $('#q').focus(), 50);
}

// ------------------------------------------------ camera
async function ensureCamera() {
  if (B.stream && B.stream.active) return B.stream;
  B.stream = await Face.startCamera($('#faceVideo'));
  return B.stream;
}

// ------------------------------------------------ QR scan
async function startScan() {
  show('scan');
  say(t('scan_hint'));
  try { await ensureCamera(); } catch (e) { $('#qrMsg').textContent = t('camera_err') + e.message; return; }
  const v = $('#qrVideo');
  v.srcObject = B.stream; await v.play().catch(() => { });
  const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true });
  let alive = true; B.stopQr = () => { alive = false; };
  $('#qrMsg').textContent = '📇 ' + t('scan_hint');
  while (alive && B.screen === 'scan') {
    if (v.readyState >= 2) {
      c.width = v.videoWidth; c.height = v.videoHeight;
      g.drawImage(v, 0, 0);
      const img = g.getImageData(0, 0, c.width, c.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (code && /^SOCVOTE:/i.test(code.data)) {
        alive = false; beep(880, .15);
        const id = code.data.split(':')[1];
        try {
          const r = await api('booth/voter?id=' + encodeURIComponent(id));
          const vt = r.voter;
          if (vt.has_voted || vt.flat_done) { toast(vt.has_voted ? t('already') : t('flat_done'), 'bad'); say(t('already')); setTimeout(startScan, 2500); return; }
          return startFace(vt);
        } catch (e) { toast(e.message, 'bad'); setTimeout(startScan, 2500); return; }
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }
}
function stopQr() { if (B.stopQr) { B.stopQr(); B.stopQr = null; } }

// ------------------------------------------------ face verification
function setFaceStatus(msg, kind = 'info') {
  const el = $('#faceStatus'); el.textContent = msg; el.className = 'face-status ' + kind;
}
function stopFace() { if (B.stopFaceLoop) { B.stopFaceLoop(); B.stopFaceLoop = null; } }

async function startFace(voter) {
  stopQr();
  B.voter = voter;
  show('face');
  $('#whoAv').innerHTML = avatarHTML(voter.name, voter.photo, 180);
  $('#whoName').textContent = voter.name;
  $('#whoFlat').textContent = '🏠 ' + voter.flat + ' · ' + voter.id;
  $('#whoWeight').innerHTML = voter.weight !== undefined ? `${t('vote_value')}: <b>${voter.weight}</b>` : '';
  $('#btnSelfConfirm').classList.add('hidden');
  $('#camGuide').className = 'cam-guide';
  $('#camMsg').textContent = '';
  const ov = $('#faceOverlay'); ov.getContext('2d').clearRect(0, 0, ov.width, ov.height);

  try { await ensureCamera(); } catch (e) { setFaceStatus(t('camera_err') + e.message, 'bad'); }
  const v = $('#faceVideo');
  if (B.stream && v.srcObject !== B.stream) { v.srcObject = B.stream; await v.play().catch(() => { }); }

  if (!voter.face_enrolled) {
    if (B.config.require_face) { setFaceStatus(t('no_face_reg'), 'bad'); say(t('no_face_reg')); }
    else { setFaceStatus(t('self_confirm'), 'info'); $('#btnSelfConfirm').classList.remove('hidden'); say(t('self_confirm')); }
    return;
  }
  setFaceStatus(t('look'));
  say(t('say_face'));
  await faceLoop();
}

async function faceLoop() {
  const v = $('#faceVideo');
  let stable = 0, busy = false, sawOpen = false, blinked = !B.config.liveness, lastMsg = '';
  const msg = (m, good = false) => {
    if (m !== lastMsg) { $('#camMsg').textContent = m; lastMsg = m; }
    $('#camGuide').classList.toggle('good', good);
  };
  stopFace();
  B.stopFaceLoop = Face.loop(v, async det => {
    if (busy || B.screen !== 'face') return;
    Face.draw($('#faceOverlay'), v, det, '#4ade80');
    if (!det) { stable = 0; msg('🙂 ' + t('look')); return; }
    const ratio = det.detection.box.width / v.videoWidth;
    if (ratio < 0.17) { stable = 0; msg('↔ ' + t('closer')); return; }
    if (!blinked) {
      const o = Face.eyeOpenness(det.landmarks);
      if (o > 0.27) sawOpen = true;
      if (sawOpen && o < 0.2) { blinked = true; beep(700); }
      msg('😉 ' + t('blink'), true); setFaceStatus(t('blink'));
      return;
    }
    stable++;
    msg('✋ ' + t('hold'), true);
    if (stable < 4) return;
    busy = true;
    setFaceStatus(t('checking'));
    try {
      const n = await Face.countFaces(v);
      if (n > 1) { setFaceStatus(t('one_person'), 'bad'); say(t('one_person')); await sleep(2500); stable = 0; busy = false; return; }
      const descs = []; let lastDet = null;
      for (let i = 0; i < 3; i++) {
        const d = await Face.describe(v);
        if (d) { descs.push(Array.from(d.descriptor)); lastDet = d; }
      }
      if (!descs.length) { stable = 0; busy = false; setFaceStatus(t('look')); return; }
      const snap = Face.snapshot(v, 280, lastDet.detection.box);
      const r = await api('booth/verify', { voter_id: B.voter.id, descriptor: Face.averageDescriptors(descs), snapshot: snap });
      if (r.ok) {
        stopFace();
        B.token = r.token;
        chime();
        setFaceStatus('✓ ' + t('verified') + ', ' + B.voter.name, 'ok');
        msg('✓', true);
        say(t('verified') + ' ' + B.voter.name);
        await sleep(1600);
        startBallot();
        return;
      }
      beep(220, .3);
      setFaceStatus(`${t('mismatch')} (${r.attempts}/${r.max_attempts})`, 'bad');
      say(t('mismatch'));
      if (r.need_officer) { stopFace(); openOfficer(0); return; }
      await sleep(2500);
      stable = 0; sawOpen = false; blinked = !B.config.liveness; busy = false;
      setFaceStatus(t('look'));
    } catch (e) {
      setFaceStatus(e.message, 'bad'); say(e.message);
      stopFace();
      setTimeout(() => goHome(), 4500);
    }
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// officer override
function openOfficer(defaultReason = 0) {
  stopFace();
  let pin = '';
  const m = modal(`
    <h2>👮 ${t('officer_title')}</h2>
    <p class="muted">${t('officer_lead')}</p>
    <p><b>${esc(B.voter.name)}</b> · ${esc(B.voter.flat)} · ${esc(B.voter.id)}</p>
    <div class="reasons">${t('reasons').map((r, i) => `<label><input type="radio" name="rsn" value="${esc(r)}" ${i === (B.voter.face_enrolled ? defaultReason : 1) ? 'checked' : ''}>${esc(r)}</label>`).join('')}</div>
    <div class="pin-dots" id="pinDots"></div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(k => `<button data-p="${k}">${k}</button>`).join('')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn secondary big-btn" data-a="cancel">${t('cancel')}</button><button class="btn ok big-btn" data-a="ok">${t('ok')}</button></div>`);
  m.back.dataset.sticky = '1';
  const upd = () => { $('#pinDots', m.el).textContent = '●'.repeat(pin.length); };
  m.el.addEventListener('click', async e => {
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (p !== undefined) { beep(500, .04); if (p === 'C') pin = ''; else if (p === '⌫') pin = pin.slice(0, -1); else if (pin.length < 10) pin += p; upd(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cancel') { m.close(); if (B.voter?.face_enrolled) faceLoop(); return; }
    if (a === 'ok') {
      const reason = $('input[name=rsn]:checked', m.el)?.value || '';
      let snap = '';
      try { const v = $('#faceVideo'); if (v.readyState >= 2) snap = Face.snapshot(v, 280); } catch { }
      try {
        const r = await api('booth/override', { voter_id: B.voter.id, pin, reason, snapshot: snap });
        m.close(); B.token = r.token; chime(); startBallot();
      } catch (err) { pin = ''; upd(); toast(err.status === 403 ? t('pin_wrong') : err.message, 'bad'); if (err.status !== 403) { m.close(); goHome(); } }
    }
  });
}

// ------------------------------------------------ ballot
function postName(p) { return (B.lang === 'hi' && p.name_hi) ? p.name_hi : p.name; }

function startBallot() {
  stopFace();
  if (!B.config.posts.length) { toast('No candidates have been added yet.', 'bad'); B.practice = false; return; }
  B.postIdx = 0; B.sel = {}; B.fromReview = false;
  show('ballot'); renderPost();
  say(B.config.posts[0].seats > 1 ? t('say_team') : t('say_ballot'));
}

function teamOf(id) { return (B.config.teams || []).find(t => t.id === id); }
function needCount(p) { return B.config.must_fill_all ? p.seats : 1; }
function selOk(p) { const sel = B.sel[p.id] || []; return sel.includes('NOTA') || (sel.length >= needCount(p) && sel.length <= p.seats); }

function candCard(c, sel, big) {
  const tm = teamOf(c.team_id);
  return `<button class="cand ${sel.includes(c.id) ? 'sel' : ''}" data-cid="${c.id}" ${tm ? `style="--team:${tm.color}"` : ''}>
      <span class="tick">✓</span>
      ${avatarHTML(c.name, c.photo, big ? 120 : 84, tm ? tm.color : null)}
      <span class="sym">${esc(c.symbol || '')}</span>
      <span class="nm">${esc(c.name)}</span>
      <span class="fl">${c.flat ? '🏠 ' + esc(c.flat) : ''}</span>
    </button>`;
}

function renderPost() {
  const posts = B.config.posts;
  const p = posts[B.postIdx];
  const sel = B.sel[p.id] || [];
  const teamIds = [...new Set(p.candidates.map(c => c.team_id).filter(Boolean))];
  const grouped = teamIds.length > 0;
  const big = p.candidates.length <= 8;
  $('#postOf').textContent = t('post_of', { a: B.postIdx + 1, b: posts.length });
  $('#postName').textContent = postName(p);
  $('#postInstr').textContent = '👆 ' + (p.seats === 1 ? t('choose1') : B.config.must_fill_all ? t('exactN', { n: p.seats }) : t('chooseN', { n: p.seats }) + (p.seats > 1 && grouped ? (B.config.cross_team ? t('any_team') : ' — ' + t('one_team')) : ''));
  const nota = `<button class="cand nota ${sel.includes('NOTA') ? 'sel' : ''}" data-cid="NOTA">
      <span class="tick">✓</span>
      <span class="avatar" style="width:${big ? 120 : 84}px;height:${big ? 120 : 84}px;font-size:${big ? 3 : 2.2}rem">✖</span>
      <span class="sym"></span>
      <span class="nm">${t('nota')}</span><span class="fl">NOTA</span>
    </button>`;
  let html = '';
  if (grouped) {
    const order = (B.config.teams || []).map(x => x.id).filter(id => teamIds.includes(id));
    for (const tid of order) {
      const tm = teamOf(tid);
      const mem = p.candidates.filter(c => c.team_id === tid);
      const picked = mem.filter(c => sel.includes(c.id)).length;
      const whole = p.seats > 1 && picked === Math.min(mem.length, p.seats);
      html += `<section class="team" style="--team:${tm.color}">
        <div class="team-hd"><span class="team-sym">${esc(tm.symbol || '')}</span><span class="team-nm">${esc(tm.name)}</span>
          <span class="team-cnt">${picked ? '✓ ' + picked : ''}</span><span class="spacer"></span>
          ${p.seats > 1 ? `<button class="btn team-all ${whole ? 'on' : ''}" data-team="${tid}">${whole ? '✖ ' + t('team_clear') : '✔ ' + t('team_select')}</button>` : ''}</div>
        <div class="cands ${big ? '' : 'compact'}">${mem.map(c => candCard(c, sel, big)).join('')}</div></section>`;
    }
    const ind = p.candidates.filter(c => !c.team_id);
    if (ind.length) html += `<section class="team" style="--team:#5b6475"><div class="team-hd"><span class="team-nm">${t('independent')}</span></div>
        <div class="cands ${big ? '' : 'compact'}">${ind.map(c => candCard(c, sel, big)).join('')}</div></section>`;
    html += `<section class="team" style="--team:#9ca3af"><div class="cands ${big ? '' : 'compact'}">${nota}</div></section>`;
  } else {
    html = `<div class="cands ${big ? '' : 'compact'}">${p.candidates.map(c => candCard(c, sel, big)).join('')}${nota}</div>`;
  }
  $('#cands').innerHTML = html;
  const n = sel.includes('NOTA') ? 0 : sel.length;
  $('#chosen').innerHTML = p.seats > 1 && !sel.includes('NOTA')
    ? `${t('chosen', { a: `<b>${n}</b>`, b: p.seats })}<span class="chosen-bar"><i style="width:${n / p.seats * 100}%"></i></span>` : '';
  $('#chosen').classList.toggle('full', n === p.seats);
  $('#dots').innerHTML = posts.map((pp, i) => `<i class="${i === B.postIdx ? 'on' : (B.sel[pp.id]?.length ? 'done' : '')}"></i>`).join('');
  $('#btnNext').innerHTML = (B.fromReview || B.postIdx === posts.length - 1) ? `${t('review')} →` : `${t('next')} →`;
  $('#btnNext').disabled = !selOk(p);
}

function toggleCand(cid) {
  const p = B.config.posts[B.postIdx];
  let sel = [...(B.sel[p.id] || [])];
  if (cid === 'NOTA') sel = sel.includes('NOTA') ? [] : ['NOTA'];
  else {
    cid = Number(cid);
    sel = sel.filter(x => x !== 'NOTA');
    const c = p.candidates.find(x => x.id === cid);
    if (sel.includes(cid)) sel = sel.filter(x => x !== cid);
    else if (p.seats === 1) sel = [cid];
    else if (sel.length >= p.seats) { toast(t('too_many', { n: p.seats }), 'bad'); beep(220, .2); return; }
    else if (!B.config.cross_team && sel.some(id => p.candidates.find(x => x.id === id)?.team_id !== c.team_id)) {
      toast(t('one_team'), 'bad'); beep(220, .2); return;
    } else sel.push(cid);
  }
  B.sel[p.id] = sel;
  beep(sel.length ? 760 : 400, .06);
  renderPost();
}

function selectTeam(tid) {
  const p = B.config.posts[B.postIdx];
  const mem = p.candidates.filter(c => c.team_id === tid).map(c => c.id);
  const want = mem.slice(0, p.seats);
  let sel = (B.sel[p.id] || []).filter(x => x !== 'NOTA');
  if (want.every(id => sel.includes(id))) {
    sel = sel.filter(id => !mem.includes(id));           // tapped again: clear this team
  } else {
    sel = [...want];                                        // pick the whole team (replaces earlier picks)
    toast(t('team_selected', { t: teamOf(tid).name, n: want.length }), 'ok');
    chime();
  }
  B.sel[p.id] = sel;
  renderPost();
}

function nextPost() {
  const posts = B.config.posts;
  const p = posts[B.postIdx];
  if (!selOk(p)) { toast(B.config.must_fill_all && p.seats > 1 ? t('must_all', { n: p.seats }) : t('choose_atleast'), 'bad'); return; }
  if (B.fromReview || B.postIdx === posts.length - 1) { showReview(); return; }
  B.postIdx++; renderPost(); window.scrollTo(0, 0);
}
function prevPost() {
  if (B.fromReview) { showReview(); return; }
  if (B.postIdx === 0) {
    confirmBox(t('cancel') + '?', '', t('ok'), 'bad').then(ok => { if (ok) goHome(); });
    return;
  }
  B.postIdx--; renderPost();
}

// ------------------------------------------------ review & cast
function showReview() {
  B.fromReview = false; show('review'); renderReview(); say(t('say_review'));
  $('#revWeight').innerHTML = (!B.practice && B.voter && B.voter.weight !== undefined) ? `${t('vote_value')}: <b>${B.voter.weight}</b>` : '';
}

function renderReview() {
  $('#rev').innerHTML = B.config.posts.map((p, i) => {
    const sel = B.sel[p.id] || [];
    const many = sel.length > 3;
    const order = id => { const c = p.candidates.find(x => x.id === id); return p.candidates.indexOf(c); };
    const chs = [...sel].sort((a, b) => order(a) - order(b)).map(id => {
      if (id === 'NOTA') return `<div class="ch"><span class="avatar" style="width:56px;height:56px;background:#e5e2da;color:#5b6475">✖</span>${t('nota')}</div>`;
      const c = p.candidates.find(c => c.id === id);
      const tm = teamOf(c.team_id);
      return `<div class="ch ${many ? 'sm' : ''}" ${tm ? `style="--team:${tm.color}"` : ''}>${avatarHTML(c.name, c.photo, many ? 40 : 56, tm ? tm.color : null)}<span>${esc(c.name)}${tm ? `<small>${esc(tm.symbol || '')} ${esc(tm.name)}</small>` : ''}</span></div>`;
    }).join('');
    const cnt = p.seats > 1 && !sel.includes('NOTA') ? `<div class="muted" style="font-weight:700;margin-top:4px">${sel.length} / ${p.seats}</div>` : '';
    return `<div class="rev-row ${many ? 'many' : ''}"><div class="pn">${esc(postName(p))}${cnt}</div><div class="chs">${chs}</div>
      <button class="btn secondary big-btn" data-edit="${i}">✎ ${t('change')}</button></div>`;
  }).join('');
}

async function castVote() {
  const m = modal(`<div style="text-align:center"><div style="font-size:3.5rem">⚠️</div><h2>${t('confirm_title')}</h2>
      <p class="lead">${t('confirm_text')}</p>
      <div class="row" style="justify-content:center;margin-top:20px;gap:16px">
        <button class="btn secondary big-btn" data-a="no">${t('go_back')}</button>
        <button class="btn ok big-btn" data-a="yes" style="font-size:1.3rem">✔ ${t('yes_cast')}</button></div></div>`);
  say(t('confirm_text'));
  m.back.dataset.sticky = '1';
  m.el.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'no') { m.close(); return; }
    $$('button', m.el).forEach(b => b.disabled = true);
    if (B.practice) { m.close(); finish(true); return; }
    try {
      await api('booth/cast', { token: B.token, choices: B.sel });
      B.token = null;
      m.close(); finish(false);
    } catch (err) {
      m.close(); toast(err.message, 'bad'); say(err.message);
      B.token = null;
      setTimeout(goHome, 3500);
    }
  });
}

function finish(practice) {
  chime();
  $('#doneTitle').textContent = practice ? t('practice_done') : t('done_title');
  $('#doneSub').textContent = practice ? t('practice_sub') : t('done_sub');
  show('done');
  say(practice ? t('practice_done') : t('say_done'));
  B.sel = {};
  let s = practice ? 8 : 6;
  const tick = () => {
    if (B.screen !== 'done') return;
    $('#doneCount').textContent = t('back_in', { s });
    if (s-- <= 0) goHome(); else setTimeout(tick, 1000);
  };
  tick();
}

// ------------------------------------------------ idle timeout
function touch() { B.lastActive = Date.now(); }
setInterval(() => {
  const active = ['find', 'scan', 'face', 'ballot', 'review'].includes(B.screen);
  if (!active || B.idleModal || $('.modal-back')) return;
  const limit = (B.config?.idle_seconds || 150) * 1000;
  if (Date.now() - B.lastActive < limit) return;
  let s = 20;
  B.idleModal = modal(`<div style="text-align:center"><div style="font-size:3rem">⏳</div><h2>${t('still_there')}</h2>
    <p class="lead" id="idleCount">${t('returning', { s })}</p>
    <button class="btn ok huge" data-a="more">${t('more_time')}</button></div>`);
  B.idleModal.back.dataset.sticky = '1';
  say(t('still_there'));
  const iv = setInterval(() => {
    s--;
    const el = $('#idleCount'); if (el) el.textContent = t('returning', { s });
    if (s <= 0) { clearInterval(iv); if (B.idleModal) { B.idleModal.close(); B.idleModal = null; } goHome(); }
  }, 1000);
  B.idleModal.el.addEventListener('click', e => {
    if (e.target.closest('[data-a=more]')) { clearInterval(iv); B.idleModal.close(); B.idleModal = null; touch(); }
  });
}, 1000);

// ------------------------------------------------ events
document.addEventListener('pointerdown', touch, true);
document.addEventListener('keydown', touch, true);
document.addEventListener('contextmenu', e => e.preventDefault());

$('#btnLang').onclick = () => { B.lang = B.lang === 'en' ? 'hi' : 'en'; localStorage.setItem('boothLang', B.lang); applyLang(); };
$('#btnSize').onclick = () => { document.documentElement.classList.toggle('big'); $('#btnSize').classList.toggle('on'); };
$('#btnVoice').onclick = () => { B.voice = !B.voice; localStorage.setItem('boothVoice', B.voice ? '1' : '0'); $('#btnVoice').classList.toggle('on', B.voice); $('#btnVoice').textContent = B.voice ? '🔊' : '🔇'; if (!B.voice) speechSynthesis?.cancel(); };
$('#btnStart').onclick = () => { beep(); B.practice = false; startFind(); };
const practice = () => { beep(); resetSession(); B.practice = true; startBallot(); };
$('#btnPractice').onclick = practice;
$('#btnPractice2').onclick = practice;
$('#btnScan').onclick = () => startScan();
$('#btnScanBack').onclick = () => { stopQr(); startFind(); };
$('#btnNotMe').onclick = () => { stopFace(); B.voter = null; startFind(); };
$('#btnOfficer').onclick = () => openOfficer(0);
$('#btnSelfConfirm').onclick = async () => {
  try {
    let snap = ''; try { snap = Face.snapshot($('#faceVideo'), 280); } catch { }
    const r = await api('booth/self_confirm', { voter_id: B.voter.id, snapshot: snap });
    B.token = r.token; chime(); startBallot();
  } catch (e) { toast(e.message, 'bad'); }
};
$('#btnNext').onclick = nextPost;
$('#btnPrev').onclick = prevPost;
$('#btnRevBack').onclick = () => { B.postIdx = B.config.posts.length - 1; show('ballot'); renderPost(); };
$('#btnCast').onclick = castVote;
$('#cands').addEventListener('click', e => {
  const tb = e.target.closest('[data-team]'); if (tb) { selectTeam(Number(tb.dataset.team)); return; }
  const c = e.target.closest('[data-cid]'); if (c) toggleCand(c.dataset.cid);
});
$('#rev').addEventListener('click', e => {
  const b = e.target.closest('[data-edit]'); if (!b) return;
  B.postIdx = Number(b.dataset.edit); B.fromReview = true; show('ballot'); renderPost();
});
$('#kbd').addEventListener('click', e => {
  const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
  beep(600, .03);
  const q = $('#q');
  if (k === 'bs') q.value = q.value.slice(0, -1);
  else if (k === 'clear') q.value = '';
  else q.value += k;
  doSearch();
});
$('#q').addEventListener('input', doSearch);
$('#results').addEventListener('click', e => {
  const c = e.target.closest('[data-vid]'); if (!c || c.disabled) return;
  beep();
  const v = (B.lastResults || []).find(x => x.id === c.dataset.vid);
  if (v) startFace(v);
});
$$('[data-go=welcome]').forEach(b => b.onclick = () => goHome());

// keep status in sync while idle on welcome/closed screens
setInterval(async () => {
  if (!['welcome', 'closed'].includes(B.screen)) return;
  try {
    const s = await api('booth/status');
    if (s.status !== B.config.status) { await refreshConfig(); goHome(); }
  } catch { }
}, 4000);

// ------------------------------------------------ boot
(async function boot() {
  $('#btnVoice').classList.toggle('on', B.voice); $('#btnVoice').textContent = B.voice ? '🔊' : '🔇';
  applyLang();
  try {
    await refreshConfig();
  } catch (e) {
    $('#loadMsg').textContent = e.status === 403
      ? 'This page must be opened on the booth computer itself (http://localhost:8000/booth).'
      : 'Cannot reach the election server. Is it running? ' + e.message;
    return;
  }
  try {
    $('#loadMsg').textContent = 'Loading face recognition…';
    await Face.load(p => { $('#loadMsg').textContent = `Loading face recognition… ${Math.round(p * 100)}%`; });
    try { await ensureCamera(); } catch (e) { toast(t('camera_err') + e.message, 'bad'); }
  } catch (e) {
    toast('Face recognition could not load: ' + e.message, 'bad');
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();
  goHome();
})();
