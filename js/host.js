(function () {
  const { t, esc, $, topic, pub, COLORS, SHAPES } = MZQ;
  MZQ.applyDir();
  let game;
  try { game = JSON.parse(localStorage.getItem('mzq_game')); } catch (e) {}
  if (!game || !game.questions || !game.questions.length) { location.href = 'create.html'; return; }
  document.title = `${game.title} - ${t('brand')}`;
  $('#btitle').textContent = game.title;

  // Session survives a refresh of the host screen mid-game.
  let S;
  try { S = JSON.parse(localStorage.getItem('mzq_session')); } catch (e) {}
  if (!S || S.title !== game.title) S = { code: null, broker: null, players: {}, qi: -1, phase: 'lobby' };
  const save = () => { try { localStorage.setItem('mzq_session', JSON.stringify(S)); } catch (e) {} };

  let client, timer = null, qStart = 0, qTotal = 0, liveCount = 0;
  const N = game.questions.length;
  const players = () => Object.entries(S.players);
  const ranked = () => players().map(([pid, p]) => ({ pid, ...p })).sort((a, b) => b.score - a.score);

  function toast(msg, ms = 3500) { const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.add('hidden'), ms); }
  $('#fs').textContent = t('fullscreen');
  $('#fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));

  async function boot() {
    $('#view').innerHTML = `<div class="lb"><div class="spinner"></div><p>${t('connecting')}</p></div>`;
    const order = S.broker ? [MZQ.BROKERS.find((b) => b.url === S.broker), ...MZQ.BROKERS] : MZQ.BROKERS;
    for (const b of order.filter(Boolean)) {
      try {
        client = await MZQ.connect(b.url, { onMessage, onOffline: () => toast(t('connLost')), onConnect: subscribe });
        if (!S.code || S.broker !== b.url) { S.code = MZQ.codeForBroker(b); S.broker = b.url; S.players = {}; S.qi = -1; S.phase = 'lobby'; }
        save(); subscribe(); break;
      } catch (e) { /* try next broker */ }
    }
    if (!client) { $('#view').innerHTML = `<div class="lb"><h2>😕</h2><p>${t('connLost')}</p></div>`; setTimeout(boot, 4000); return; }
    resume();
  }
  function subscribe() { client.subscribe([topic(S.code, 'join'), topic(S.code, 'ans')], { qos: 1 }); }

  function resume() {
    if (S.phase === 'lobby') lobby();
    else if (S.phase === 'end') finish();
    else if (S.phase === 'q') askQuestion(S.qi);
    else if (S.phase === 'reveal') reveal();
    else leaderboard();
  }

  // ---------- messages from players ----------
  function onMessage(tp, d) {
    if (tp.endsWith('/join')) return onJoin(d);
    if (tp.endsWith('/ans')) return onAnswer(d);
  }
  function onJoin(d) {
    const name = String(d.name || '').trim().slice(0, 20), pid = String(d.pid || '').slice(0, 20);
    if (!name || !pid) return;
    if (S.players[pid]) { S.players[pid].name = name; sendPlayer(pid); return; }
    const taken = players().some(([, p]) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) { pub(client, topic(S.code, 'p/' + pid), { ok: false, err: 'taken' }); return; }
    S.players[pid] = { name, score: 0, ans: {} };
    save(); sendPlayer(pid); updateCount();
    if (S.phase === 'lobby') renderPlayers();
  }
  function onAnswer(d) {
    const p = S.players[d.pid];
    if (!p || S.phase !== 'q' || d.i !== S.qi || p.ans[S.qi]) return;
    const q = game.questions[S.qi], a = +d.a;
    if (!(a >= 0 && a < q.options.length)) return;
    const left = Math.max(0, qTotal - (Date.now() - qStart));
    const ok = a === q.correct, gained = ok ? Math.round(500 + 500 * (left / qTotal)) : 0;
    p.ans[S.qi] = { a, ok, gained };
    p.score += gained;
    save();
    const answered = players().filter(([, x]) => x.ans[S.qi]).length;
    const el = $('#answered'); if (el) el.textContent = answered;
    if (answered >= players().length) endQuestion();
  }

  // ---------- publishing ----------
  function state(extra) {
    pub(client, topic(S.code, 'state'), { phase: S.phase, title: game.title, lang: game.lang, i: S.qi, n: N, count: players().length, at: Date.now(), ...extra }, true);
  }
  function sendPlayer(pid) {
    const r = ranked(), p = S.players[pid], rank = r.findIndex((x) => x.pid === pid) + 1, last = p.ans[S.qi];
    pub(client, topic(S.code, 'p/' + pid), { ok: true, name: p.name, score: p.score, rank, of: r.length, i: S.qi,
      last: last ? { ok: last.ok, gained: last.gained } : null }, true);
  }
  const sendAll = () => players().forEach(([pid]) => sendPlayer(pid));
  function updateCount() { $('#bcount').textContent = `${players().length} ${t('players')}`; }

  // ---------- screens ----------
  function joinUrl() { return new URL(`play.html?c=${S.code}${game.lang !== 'he' ? '&lang=' + game.lang : ''}`, location.href).href; }
  function lobby() {
    S.phase = 'lobby'; save(); state({});
    const url = joinUrl(), short = url.replace(/^https?:\/\//, '').replace(/play\.html.*$/, '');
    $('#view').innerHTML = `<div class="lobby">
      <div class="qrbox" id="qr"></div>
      <div>
        <h1>${esc(game.title)}</h1>
        <div class="muted" style="font-size:clamp(1rem,2.6vh,1.6rem)">${t('scan')} <span class="joinurl">${esc(short)}</span> ${t('andCode')}</div>
        <div class="bigcode">${S.code}</div>
        <div class="plist" id="plist"></div>
      </div></div>`;
    new QRCode($('#qr'), { text: url, width: 512, height: 512, colorDark: '#1a0f2e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    renderPlayers(); updateCount();
    ctl([[t('start'), () => askQuestion(0), 'gold']]);
  }
  function renderPlayers() {
    const el = $('#plist'); if (!el) return;
    const list = players().map(([, p]) => p.name);
    el.innerHTML = list.length ? list.slice(-60).reverse().map((n) => `<span>${esc(n)}</span>`).join('') : `<span class="muted" style="background:none">${t('waitingPlayers')}</span>`;
  }

  function askQuestion(i) {
    clearInterval(timer);
    const q = game.questions[i];
    const resumed = S.phase === 'q' && S.qi === i && S.qStart;
    S.phase = 'q'; S.qi = i;
    qTotal = q.time * 1000;
    qStart = resumed ? S.qStart : Date.now(); S.qStart = qStart; save();
    const left = () => Math.max(0, qTotal - (Date.now() - qStart));
    state({ text: q.text, options: q.options, remain: left() });
    const answered = players().filter(([, x]) => x.ans[i]).length;
    $('#view').innerHTML = `<div class="qscreen">
      <div class="qmeta"><span>${t('question')} ${i + 1}/${N}</span><div class="timer" id="tm">${Math.ceil(left() / 1000)}</div>
        <span><b id="answered">${answered}</b>/${players().length} ${t('answers')}</span></div>
      <h2>${esc(q.text)}</h2>
      <div class="answers">${q.options.map((o, k) => `<div class="ans" style="background:${COLORS[k]}"><span class="sh">${SHAPES[k]}</span>${esc(o)}</div>`).join('')}</div>
    </div>`;
    ctl([[t('next'), endQuestion, 'ghost']]);
    timer = setInterval(() => { const l = left(); const el = $('#tm'); if (el) el.textContent = Math.ceil(l / 1000); if (l <= 0) endQuestion(); }, 250);
  }

  function endQuestion() { clearInterval(timer); if (S.phase !== 'q') return; S.phase = 'reveal'; save(); reveal(); }
  function reveal() {
    const i = S.qi, q = game.questions[i];
    const counts = q.options.map((_, k) => players().filter(([, p]) => p.ans[i] && p.ans[i].a === k).length);
    state({ text: q.text, options: q.options, correct: q.correct, counts });
    sendAll();
    $('#view').innerHTML = `<div class="qscreen">
      <div class="qmeta"><span>${t('reveal')}</span></div>
      <h2>${esc(q.text)}</h2>
      <div class="answers">${q.options.map((o, k) => `<div class="ans ${k === q.correct ? 'win' : 'dim'}" style="background:${COLORS[k]}">
        <span class="sh">${k === q.correct ? '✔' : SHAPES[k]}</span>${esc(o)}<span class="cnt">${counts[k]}</span></div>`).join('')}</div>
    </div>`;
    if (i === N - 1) ctl([[t('final'), finish, 'gold']]); else ctl([[t('leaderboard'), leaderboard, 'gold']]);
  }

  function leaderboard() {
    S.phase = 'lb'; save(); state({});
    const top = ranked().slice(0, 5);
    $('#view').innerHTML = `<div class="lb"><h2>${t('leaderboard')}</h2>
      ${top.map((p, k) => `<div class="lbrow ${k === 0 ? 'r1' : ''}"><span>${k + 1}. ${esc(p.name)}</span><span>${p.score}</span></div>`).join('')}</div>`;
    ctl([[t('next'), () => askQuestion(S.qi + 1), 'gold']]);
  }

  function finish() {
    S.phase = 'end'; save();
    const r = ranked(), top = r.slice(0, 3);
    state({ podium: top.map((p) => ({ name: p.name, score: p.score })) });
    sendAll();
    const h = [26, 36, 18], order = [1, 0, 2], medal = ['🥇', '🥈', '🥉'];
    $('#view').innerHTML = `<div class="lb"><h2>🎉 ${t('final')}</h2>
      <div class="podium">${order.filter((k) => top[k]).map((k) => `<div class="col"><div class="nm">${esc(top[k].name)}</div>
        <div class="sc">${top[k].score}</div><div class="blk" style="height:${h[k]}vh;background:${[ 'var(--gold)', '#d9d3e8', '#e3a46b'][k]}">${medal[k]}</div></div>`).join('')}</div></div>`;
    ctl([[t('again'), () => { try { localStorage.removeItem('mzq_session'); } catch (e) {} location.href = `create.html?type=${game.type}&lang=${game.lang}`; }, 'ghost']]);
    confetti();
  }

  function ctl(btns) {
    $('#ctl').innerHTML = btns.map(([label, , kind], k) => `<button class="btn btn-${kind}" data-k="${k}">${esc(label)}</button>`).join('');
    $('#ctl').onclick = (e) => { const b = e.target.closest('button'); if (b) btns[+b.dataset.k][1](); };
    ctl.primary = btns[btns.length - 1][1];
  }
  document.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && ctl.primary && e.target === document.body) { e.preventDefault(); ctl.primary(); } });

  function confetti() {
    const box = $('#confetti'), cols = ['#f5c451', '#ff6f91', '#2f7ff0', '#27a96c', '#fff'];
    box.innerHTML = Array.from({ length: 140 }, () => `<i style="left:${Math.random() * 100}vw;background:${cols[Math.floor(Math.random() * 5)]};animation-duration:${2.5 + Math.random() * 3}s;animation-delay:${Math.random() * 1.5}s"></i>`).join('');
  }

  boot();
})();
