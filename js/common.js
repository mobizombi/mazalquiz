// Shared: language, UI strings, realtime transport, helpers.
(function () {
  const params = new URLSearchParams(location.search);
  const LANGS = ['he', 'en'];
  let lang = params.get('lang') || document.documentElement.lang || 'he';
  try { if (!params.get('lang') && localStorage.getItem('mzq_lang')) lang = localStorage.getItem('mzq_lang'); } catch (e) {}
  if (!LANGS.includes(lang)) lang = 'he';

  const STR = {
    he: {
      brand: 'מזל קוויז', join: 'הצטרפות למשחק', code: 'קוד משחק', nick: 'הכינוי שלך', enter: 'יאללה, נכנסים',
      create: 'צרו חידון לשמחה', free: 'חינם', waiting: 'מחכים שהמשחק יתחיל...', youreIn: 'אתם בפנים!',
      look: 'מסתכלים על המסך הגדול', answered: 'נקלט! מחכים לכולם...', correct: 'נכון!', wrong: 'לא נכון',
      tooLate: 'נגמר הזמן', points: 'נקודות', place: 'מקום', of: 'מתוך', final: 'המשחק נגמר!',
      notFound: 'לא מצאנו משחק עם הקוד הזה. בדקו שוב?', connecting: 'מתחברים...', badNick: 'צריך כינוי',
      nickTaken: 'הכינוי תפוס, נסו אחר', players: 'שחקנים', start: 'מתחילים!', next: 'הבא', leaderboard: 'טבלת המובילים',
      scan: 'סרקו או היכנסו ל', andCode: 'והקלידו את הקוד', question: 'שאלה', winner: 'המנצח/ת',
      reveal: 'התשובה הנכונה', endGame: 'סיום', again: 'משחק חדש', answers: 'ענו', waitingPlayers: 'מחכים לשחקנים...',
      fullscreen: 'מסך מלא', sound: 'צליל', connLost: 'החיבור נותק, מתחברים מחדש...',
    },
    en: {
      brand: 'MazalQuiz', join: 'Join a game', code: 'Game code', nick: 'Your nickname', enter: "Let's go",
      create: 'Create a party quiz', free: 'free', waiting: 'Waiting for the game to start...', youreIn: "You're in!",
      look: 'Look at the big screen', answered: 'Got it! Waiting for everyone...', correct: 'Correct!', wrong: 'Wrong',
      tooLate: "Time's up", points: 'points', place: 'place', of: 'of', final: 'Game over!',
      notFound: 'No game found with that code. Check again?', connecting: 'Connecting...', badNick: 'Pick a nickname',
      nickTaken: 'Nickname taken, try another', players: 'players', start: 'Start!', next: 'Next', leaderboard: 'Leaderboard',
      scan: 'Scan or go to', andCode: 'and enter the code', question: 'Question', winner: 'Winner',
      reveal: 'Correct answer', endGame: 'Finish', again: 'New game', answers: 'answered', waitingPlayers: 'Waiting for players...',
      fullscreen: 'Fullscreen', sound: 'Sound', connLost: 'Connection lost, reconnecting...',
    },
  };

  // Public brokers, picked by the first digit of the game code so players
  // always land on the same broker as the host without any lookup.
  const BROKERS = [
    { url: 'wss://broker.emqx.io:8084/mqtt', digits: '123' },
    { url: 'wss://test.mosquitto.org:8081/mqtt', digits: '456' },
    { url: 'wss://broker.hivemq.com:8884/mqtt', digits: '789' },
  ];
  const brokerForCode = (code) => BROKERS.find((b) => b.digits.includes(String(code)[0])) || BROKERS[0];
  const codeForBroker = (b) => b.digits[Math.floor(Math.random() * 3)] + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const topic = (code, sub) => `mazalquiz/v1/${code}/${sub}`;

  function connect(url, { onConnect, onMessage, onOffline, timeout = 7000 } = {}) {
    return new Promise((resolve, reject) => {
      const c = mqtt.connect(url, { connectTimeout: timeout, reconnectPeriod: 2000, clean: true, keepalive: 30,
        clientId: 'mzq_' + Math.random().toString(36).slice(2, 12) });
      let first = true;
      const t = setTimeout(() => { if (first) { c.end(true); reject(new Error('timeout')); } }, timeout + 500);
      c.on('connect', () => { if (first) { first = false; clearTimeout(t); resolve(c); } onConnect && onConnect(c); });
      c.on('message', (tp, buf) => { let d; try { d = JSON.parse(buf.toString()); } catch (e) { return; } onMessage && onMessage(tp, d); });
      c.on('offline', () => onOffline && onOffline());
      c.on('error', () => {});
    });
  }

  const pub = (c, tp, data, retain = false) => c.publish(tp, JSON.stringify(data), { qos: 1, retain });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const $ = (s, r = document) => r.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 10);

  function setLang(l) { try { localStorage.setItem('mzq_lang', l); } catch (e) {} }
  function applyDir() { document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'; }

  window.MZQ = { lang, LANGS, t: (k) => (STR[lang] && STR[lang][k]) || STR.en[k] || k, STR, BROKERS, brokerForCode, codeForBroker,
    topic, connect, pub, esc, $, uid, params, setLang, applyDir,
    COLORS: ['#e8455d', '#2f7ff0', '#f2b33d', '#27a96c'], SHAPES: ['▲', '◆', '●', '■'] };
})();
