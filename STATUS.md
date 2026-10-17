# MazalQuiz - status (2026-10-17)

## Decision record
- **Why this niche:** Adam asked for "a Glowit-style play" (glowit.io = Hebrew Kahoot clone, 8 languages, organic FB groups, ChatGPT traffic). Copying Glowit head-on is late, so we took its formula (free multiplayer tool + RTL + programmatic SEO + FB communities) into **celebration quizzes** ("how well do you know the couple").
- **Gap evidence:** English market has Quiz your Guests, Trivia Anywhere, Toast&Play, Uplup, plus Kahoot/AhaSlides. Hebrew search returns only translated AhaSlides blog posts - no dedicated Hebrew product.
- **Name/domain:** MazalQuiz / mazalquiz.com - unregistered on 2026-10-17. (simchon.com, simchaquiz.com, toastquiz.com were also free.)
- **Stack:** static site + MQTT over WSS on free public brokers, host browser authoritative. Zero cost, zero accounts. Tested from Node and in the browser on all 3 brokers.
- **Monetization (later, not built):** free core to grow; paid event pass (~₪49-99) for no branding, photo questions, team mode, custom QR card for tables. Vendor plan for DJs/MCs.

## Built today
- Quiz builder with 7 Hebrew + 6 English event templates, prewritten wrong answers, "who is more likely" questions.
- Big-screen host: QR + 5-digit code, live lobby, timer, answer counts, reveal, leaderboard, podium + confetti, resumes after refresh.
- Phone player: join by code/QR, colored answer buttons, correct/wrong + points + rank, final medal.
- 16 SEO pages (he + en): home, per-event quiz pages, "wedding games", "Kahoot alternative", FAQ schema, hreflang, sitemap. noindex until domain.
- Tested: full 4-player game (1 browser + 3 bots) through to podium. No horizontal overflow at 375px.
- `DISTRIBUTION-KIT.md` - FB group targets + 4 post drafts (Adam posts).

## LIVE (temp, noindex)
https://mobizombi.github.io/mazalquiz/ - repo github.com/mobizombi/mazalquiz, Pages from `gh-pages` (= `git subtree split --prefix site`).

## Blocked on Adam
1. Buy **mazalquiz.com** (~$10). Then: add CNAME, rebuild with `SITE_INDEX=1`, submit sitemap to GSC.
2. Try one real game with 3-4 phones at home.
3. Post in FB groups (drafts in DISTRIBUTION-KIT.md).

## Known risks / next
- Public MQTT brokers have no SLA and are not load-tested at 200 players. Before a real wedding at scale: move to an owned broker (HiveMQ Cloud / EMQX Serverless free tiers need an account) - transport is isolated in `js/common.js`.
- Game data (nicknames, answers) passes through public brokers on guessable topics - fine for party nicknames, not for anything sensitive.
- Next features: team mode (Team Bride / Team Groom / tables), photo questions, Arabic + Russian (Glowit's languages), AI question writer, paid event pass.
