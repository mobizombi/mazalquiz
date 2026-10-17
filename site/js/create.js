(function () {
  const { lang, esc, $, params } = MZQ;
  MZQ.applyDir();
  const L = {
    he: { h1: 'יוצרים חידון לשמחה', sub: 'בוחרים אירוע, ממלאים את התשובות הנכונות - את התשובות השגויות כבר הכנו לכם.', ev: 'איזה אירוע?',
      title: 'כותרת החידון', time: 'זמן לכל שאלה', sec: 'שניות', hq: 'השאלות', qhint: 'מלאו את התשובה הנכונה (מסומנת בירוק). אפשר לערוך כל דבר, לכבות שאלות או להוסיף משלכם.',
      add: '+ שאלה משלי', go: '🎉 פותחים משחק', correctPh: 'התשובה הנכונה', wrongPh: 'תשובה שגויה', newQ: 'שאלה חדשה', count: (n) => `${n} שאלות במשחק`,
      whoHint: 'שאלת "מי יותר" - האורחים בוחרים בין השניים. סמנו מי התשובה הנכונה.', needQ: 'צריך לפחות שאלה אחת עם תשובה נכונה',
      missing: (n) => `בשאלה ${n} חסרה תשובה נכונה או שתי אפשרויות לפחות`, docTitle: 'יצירת חידון לשמחה - מזל קוויז', logo: 'מזל <b>קוויז</b>' },
    en: { h1: 'Create your party quiz', sub: 'Pick the event and fill in the right answers - we already wrote the wrong ones for you.', ev: 'What are we celebrating?',
      title: 'Quiz title', time: 'Time per question', sec: 'seconds', hq: 'Questions', qhint: 'Fill in the correct answer (green). Edit anything, switch questions off, or add your own.',
      add: '+ Add my own question', go: '🎉 Start the game', correctPh: 'Correct answer', wrongPh: 'Wrong answer', newQ: 'New question', count: (n) => `${n} questions`,
      whoHint: '"Who is more likely" - guests pick between the two. Mark the right one.', needQ: 'Add at least one question with a correct answer',
      missing: (n) => `Question ${n} needs a correct answer and at least two options`, docTitle: 'Create a party quiz - MazalQuiz', logo: 'Mazal<b>Quiz</b>' },
  }[lang];

  document.title = L.docTitle;
  $('#logo').innerHTML = L.logo; $('#logo').href = lang === 'he' ? './' : './en/';
  $('#h1').textContent = L.h1; $('#sub').textContent = L.sub; $('#l-ev').textContent = L.ev; $('#l-title').textContent = L.title;
  $('#l-time').textContent = L.time; $('#h-q').textContent = L.hq; $('#qhint').textContent = L.qhint; $('#addq').textContent = L.add; $('#go').textContent = L.go;
  [...$('#qtime').options].forEach((o) => (o.textContent = `${o.value} ${L.sec}`));
  $('#langs').innerHTML = MZQ.LANGS.map((l) => `<a href="?lang=${l}" class="${l === lang ? 'on' : ''}" data-l="${l}">${l === 'he' ? 'עברית' : 'English'}</a>`).join('');
  $('#langs').onclick = (e) => { const a = e.target.closest('a'); if (a) MZQ.setLang(a.dataset.l); };

  const T = MZQ_TEMPLATES[lang];
  let type = T[params.get('type')] ? params.get('type') : Object.keys(T)[0];
  let names = [];
  let qs = [];

  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fill = (s) => s.replace(/\{A\}/g, names[0] || '').replace(/\{B\}/g, names[1] || '');

  function buildFromTemplate() {
    const tpl = T[type];
    qs = tpl.q.map((q) => q.t === 'who'
      ? { kind: 'who', raw: q.q, text: '', options: [], correct: 0, on: true }
      : { kind: 'mc', raw: q.q, text: '', options: ['', ...shuffle(q.pool).slice(0, 3)], correct: 0, on: true });
    if (!qs.length) qs.push({ kind: 'mc', raw: '', text: '', options: ['', '', '', ''], correct: 0, on: true });
    refreshTexts(true);
  }

  // Template questions follow the names until the host edits the text by hand.
  function refreshTexts(force) {
    qs.forEach((q) => {
      if (q.raw && (force || !q.edited)) q.text = fill(q.raw);
      if (q.kind === 'who') q.options = [names[0] || 'A', names[1] || 'B'];
    });
  }

  function renderTypes() {
    $('#evtypes').innerHTML = Object.entries(T).map(([k, v]) =>
      `<button type="button" data-k="${k}" class="${k === type ? 'on' : ''}"><span class="ic">${v.icon}</span>${esc(v.label)}</button>`).join('');
  }
  function renderNames() {
    const tpl = T[type];
    names = tpl.defNames.slice();
    $('#names').innerHTML = tpl.names.map((n, i) =>
      `<label class="lbl" for="nm${i}">${esc(n)}</label><input class="field" id="nm${i}" data-i="${i}" value="${esc(tpl.defNames[i])}">`).join('');
    $('#title').value = fill(tpl.title);
  }

  function renderQs() {
    $('#qlist').innerHTML = qs.map((q, qi) => {
      const opts = q.options.map((o, oi) => `
        <div class="opt ${q.correct === oi ? 'correct' : ''}">
          <input type="radio" name="c${qi}" data-q="${qi}" data-o="${oi}" ${q.correct === oi ? 'checked' : ''} aria-label="correct">
          <input class="field" data-q="${qi}" data-o="${oi}" value="${esc(o)}" ${q.kind === 'who' ? 'readonly' : ''}
            placeholder="${q.correct === oi ? L.correctPh : L.wrongPh}">
        </div>`).join('');
      return `<div class="qitem ${q.on ? '' : 'off'}">
        <div class="qhead">
          <input type="checkbox" class="toggle" data-q="${qi}" data-act="on" ${q.on ? 'checked' : ''} aria-label="include">
          <input class="field qtext" data-q="${qi}" data-act="text" value="${esc(q.text)}" placeholder="${L.newQ}">
          <button class="iconbtn" data-q="${qi}" data-act="del" title="delete">✕</button>
        </div>
        <div class="opts">${opts}</div>
        ${q.kind === 'who' ? `<div class="hint">${L.whoHint}</div>` : ''}
      </div>`;
    }).join('');
    updateCount();
  }
  const valid = (q) => q.on && q.text.trim() && (q.options[q.correct] || '').trim() && q.options.filter((o) => o.trim()).length >= 2;
  function updateCount() { $('#count').textContent = L.count(qs.filter(valid).length); }

  $('#evtypes').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    type = b.dataset.k; renderTypes(); renderNames(); buildFromTemplate(); renderQs();
    history.replaceState(null, '', `?type=${type}${params.get('lang') ? '&lang=' + lang : ''}`);
  };
  $('#names').oninput = (e) => {
    const i = +e.target.dataset.i; names[i] = e.target.value;
    if (!$('#title').dataset.edited) $('#title').value = fill(T[type].title);
    refreshTexts(false); renderQs();
    const el = $(`#nm${i}`); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  };
  $('#title').oninput = () => ($('#title').dataset.edited = '1');
  $('#qlist').addEventListener('input', (e) => {
    const el = e.target, qi = +el.dataset.q, q = qs[qi]; if (!q) return;
    if (el.dataset.act === 'text') { q.text = el.value; q.edited = true; }
    else if (el.dataset.act === 'on') { q.on = el.checked; el.closest('.qitem').classList.toggle('off', !q.on); }
    else if (el.type === 'radio') { q.correct = +el.dataset.o; renderQs(); return; }
    else if (el.dataset.o != null) q.options[+el.dataset.o] = el.value;
    updateCount();
  });
  $('#qlist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act=del]'); if (!b) return;
    qs.splice(+b.dataset.q, 1); renderQs();
  });
  $('#addq').onclick = () => {
    qs.push({ kind: 'mc', raw: '', text: '', options: ['', '', '', ''], correct: 0, on: true, edited: true });
    renderQs(); const all = document.querySelectorAll('.qtext'); all[all.length - 1].focus();
  };

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 3500); }

  $('#go').onclick = () => {
    const bad = qs.findIndex((q) => q.on && !valid(q));
    if (bad >= 0) { toast(L.missing(bad + 1)); document.querySelectorAll('.qitem')[bad].scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const use = qs.filter(valid);
    if (!use.length) { toast(L.needQ); return; }
    const time = +$('#qtime').value;
    const game = {
      title: $('#title').value.trim() || fill(T[type].title), type, lang, names,
      questions: use.map((q) => {
        const opts = q.options.map((o, i) => ({ o: o.trim(), ok: i === q.correct })).filter((x) => x.o);
        const mixed = q.kind === 'who' ? opts : shuffle(opts);
        return { text: q.text.trim(), options: mixed.map((x) => x.o), correct: mixed.findIndex((x) => x.ok), time };
      }),
    };
    try { localStorage.setItem('mzq_game', JSON.stringify(game)); localStorage.removeItem('mzq_session'); } catch (e) {}
    location.href = `host.html?lang=${lang}`;
  };

  renderTypes(); renderNames(); buildFromTemplate(); renderQs();
})();
