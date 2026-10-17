(function () {
  const { t, esc, $, topic, pub, params, COLORS, SHAPES } = MZQ;
  MZQ.applyDir();
  let client, code, pid, me = null, st = null, answeredI = -1, gotState = false;

  function toast(msg, ms = 3500) { const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.add('hidden'), ms); }
  const view = (html) => ($('#pv').innerHTML = html);
  const main = (inner) => view(`<div class="pmain">${inner}</div>`);

  function joinForm(err) {
    const c = params.get('c') || '';
    let lastNick = ''; try { lastNick = localStorage.getItem('mzq_nick') || ''; } catch (e) {}
    main(`<h2>${t('brand')}</h2>
      <form class="joinbox" id="jf" style="width:100%;max-width:380px">
        <input id="jc" inputmode="numeric" maxlength="5" placeholder="${t('code')}" value="${esc(c)}" autocomplete="off" ${c ? 'class="hidden"' : ''}>
        <input id="jn" class="nick" maxlength="20" placeholder="${t('nick')}" value="${esc(lastNick)}" autocomplete="off">
        <button class="btn btn-gold">${t('enter')}</button>
        <p class="err">${esc(err || '')}</p>
      </form>`);
    (c ? $('#jn') : $('#jc')).focus();
    $('#jf').onsubmit = (e) => {
      e.preventDefault();
      const cv = $('#jc').value.replace(/\D/g, ''), nv = $('#jn').value.trim();
      if (cv.length !== 5) return joinForm(t('notFound'));
      if (!nv) return joinForm(t('badNick'));
      try { localStorage.setItem('mzq_nick', nv); } catch (e2) {}
      join(cv, nv);
    };
  }

  async function join(c, nick) {
    code = c;
    try { pid = localStorage.getItem('mzq_pid_' + c); } catch (e) {}
    if (!pid) { pid = MZQ.uid(); try { localStorage.setItem('mzq_pid_' + c, pid); } catch (e) {} }
    main(`<div class="spinner"></div><p>${t('connecting')}</p>`);
    if (client) client.end(true);
    gotState = false; me = null;
    try {
      client = await MZQ.connect(MZQ.brokerForCode(c).url, { onMessage, onOffline: () => toast(t('connLost')),
        onConnect: (cl) => cl.subscribe([topic(c, 'state'), topic(c, 'p/' + pid)], { qos: 1 }) });
    } catch (e) { return joinForm(t('connLost')); }
    client.subscribe([topic(c, 'state'), topic(c, 'p/' + pid)], { qos: 1 });
    setTimeout(() => { if (!gotState) { client.end(true); client = null; joinForm(t('notFound')); } }, 5000);
    pub(client, topic(c, 'join'), { pid, name: nick });
  }

  function onMessage(tp, d) {
    if (tp.endsWith('/state')) { gotState = true; st = d; st.recv = Date.now(); render(); }
    else if (tp.endsWith('/p/' + pid)) {
      if (!d.ok) { client.end(true); client = null; return joinForm(d.err === 'taken' ? t('nickTaken') : t('notFound')); }
      me = d; $('#pname').textContent = d.name; $('#pscore').textContent = `${d.score} ${t('points')}`; render();
    }
  }

  function render() {
    if (!st || !me) return;
    const p = st.phase;
    if (p === 'lobby') return main(`<div class="big-emoji">🎉</div><h2>${t('youreIn')}</h2><p class="muted">${t('waiting')}</p>`);
    if (p === 'q') {
      if (answeredI === st.i) return main(`<div class="spinner"></div><h2>${t('answered')}</h2>`);
      const two = st.options.length === 2;
      return view(`<p class="pq">${esc(st.text)}</p>
        <div class="pbtns ${two ? 'two' : ''}">${st.options.map((o, k) => `<button data-a="${k}" style="background:${COLORS[k]}"><span class="sh">${SHAPES[k]}</span>${esc(o)}</button>`).join('')}</div>`);
    }
    if (p === 'reveal' || p === 'lb') {
      const last = me.i === st.i ? me.last : null;
      const head = !last ? `<div class="big-emoji">⏰</div><h2>${t('tooLate')}</h2>`
        : last.ok ? `<div class="big-emoji">🎯</div><h2 class="result-ok">${t('correct')}</h2><p>+${last.gained} ${t('points')}</p>`
        : `<div class="big-emoji">🙈</div><h2 class="result-bad">${t('wrong')}</h2>`;
      return main(`${head}<p class="muted">${t('place')} ${me.rank} ${t('of')} ${me.of}</p>`);
    }
    if (p === 'end') {
      const medal = ['🥇', '🥈', '🥉'][me.rank - 1] || '🎉';
      return main(`<div class="big-emoji">${medal}</div><h2>${t('final')}</h2><p style="font-size:1.3rem">${t('place')} ${me.rank} ${t('of')} ${me.of}</p><p class="muted">${me.score} ${t('points')}</p>`);
    }
  }

  $('#pv').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b || !st || st.phase !== 'q') return;
    answeredI = st.i;
    pub(client, topic(code, 'ans'), { pid, i: st.i, a: +b.dataset.a });
    if (navigator.vibrate) navigator.vibrate(30);
    render();
  });

  joinForm();
})();
