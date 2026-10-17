# MazalQuiz (מזל קוויז)

Live party quiz for celebrations - weddings, bar/bat mitzvahs, birthdays, bachelorettes, anniversaries.
Guests scan a QR code and answer on their phones; the host screen shows questions, live answers and a leaderboard.

- `site/` - the deployable static site. `create.html` (quiz builder), `host.html` (big screen), `play.html` (phone).
- `site/js/templates.js` - question templates per event (he + en).
- `build.mjs` + `content.mjs` - generate landing + SEO pages + sitemap into `site/`.
- Realtime: MQTT over WebSocket on free public brokers (EMQX / Mosquitto / HiveMQ). The first digit of the game code picks the broker. Host browser is authoritative (scores, timing).

Build: `SITE_URL=https://mazalquiz.com/ SITE_INDEX=1 node build.mjs` (default is noindex).
Local: `python3 -m http.server 4660 --directory site`.
Deploy: push `site/` to the `gh-pages` branch.
