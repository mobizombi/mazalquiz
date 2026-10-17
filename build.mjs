// Static page generator: landing pages + SEO pages + sitemap.
// Usage: SITE_URL=https://mazalquiz.com/ SITE_INDEX=1 node build.mjs
// Writes into site/ next to the app pages (create/host/play are hand-written).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { PAGES, HOME } from './content.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'site');
const SITE_URL = (process.env.SITE_URL || 'https://mazalquiz.com/').replace(/\/?$/, '/');
const INDEX = process.env.SITE_INDEX === '1';

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(OUT, 'js/templates.js'), 'utf8'), ctx);
const TPL = ctx.window.MZQ_TEMPLATES;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const urlOf = (lang, slug) => (lang === 'he' ? '' : lang + '/') + (slug ? slug + '/' : '');

function layout({ lang, slug, title, desc, body, schema, alt }) {
  const depth = (lang === 'he' ? 0 : 1) + (slug ? 1 : 0);
  const rel = '../'.repeat(depth) || './';
  const he = lang === 'he';
  const canonical = SITE_URL + urlOf(lang, slug);
  const hreflang = alt ? Object.entries(alt).map(([l, s]) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL + urlOf(l, s)}">`).join('\n') : '';
  const F = HOME[lang].footer;
  const evLinks = PAGES.filter((p) => p.lang === lang && p.event).map((p) => `<a href="${rel}${urlOf(lang, p.slug)}">${esc(p.nav)}</a>`).join('');
  const moreLinks = PAGES.filter((p) => p.lang === lang && !p.event).map((p) => `<a href="${rel}${urlOf(lang, p.slug)}">${esc(p.nav)}</a>`).join('');
  return `<!doctype html>
<html lang="${lang}" dir="${he ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${INDEX ? '' : '<meta name="robots" content="noindex">'}
<link rel="canonical" href="${canonical}">
${hreflang}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎉</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}css/style.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body>
<div class="wrap">
  <div class="top">
    <a class="logo" href="${rel}${urlOf(lang, '')}">${he ? 'מזל <b>קוויז</b>' : 'Mazal<b>Quiz</b>'}</a>
    <div class="langs">${alt ? Object.entries(alt).map(([l, s]) => `<a href="${rel}${urlOf(l, s)}" class="${l === lang ? 'on' : ''}">${l === 'he' ? 'עברית' : 'English'}</a>`).join('') : ''}
      <a class="btn btn-gold btn-sm" style="color:var(--ink);margin-inline-start:14px" href="${rel}create.html?lang=${lang}">${esc(HOME[lang].ctaShort)}</a></div>
  </div>
  ${body(rel)}
  <footer class="foot"><div class="cols">
    <div><h4>${esc(F.brandH)}</h4><p style="margin:0">${esc(F.brandP)}</p></div>
    <div><h4>${esc(F.evH)}</h4>${evLinks}</div>
    <div><h4>${esc(F.moreH)}</h4>${moreLinks}<a href="${rel}play.html${he ? '' : '?lang=en'}">${esc(F.join)}</a></div>
  </div><p style="margin-top:22px">© 2026 ${he ? 'מזל קוויז' : 'MazalQuiz'}</p></footer>
</div>
</body>
</html>
`;
}

const howSteps = (lang) => HOME[lang].steps.map((s, i) => `<div class="card"><div class="num">${i + 1}</div><h3>${esc(s[0])}</h3><p class="muted" style="margin:0">${esc(s[1])}</p></div>`).join('');
const faqHtml = (faq) => `<div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const faqSchema = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

function writePage(lang, slug, html) {
  const dir = path.join(OUT, urlOf(lang, slug));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// ---------- home pages ----------
for (const lang of ['he', 'en']) {
  const H = HOME[lang];
  const evCards = (rel) => PAGES.filter((p) => p.lang === lang && p.event).map((p) => {
    const tp = TPL[lang][p.event];
    return `<a class="card" href="${rel}${urlOf(lang, p.slug)}"><div class="ic">${tp.icon}</div><h3 style="margin:6px 0 4px">${esc(p.nav)}</h3><p class="muted" style="margin:0">${esc(p.cardLine)}</p></a>`;
  }).join('');
  writePage(lang, '', layout({
    lang, slug: '', title: H.title, desc: H.desc, alt: { he: '', en: '' },
    schema: [faqSchema(H.faq), { '@context': 'https://schema.org', '@type': 'WebApplication', name: lang === 'he' ? 'מזל קוויז' : 'MazalQuiz', url: SITE_URL + urlOf(lang, ''),
      applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: lang === 'he' ? 'ILS' : 'USD' } }],
    body: (rel) => `
  <section class="hero">
    <div>
      <h1>${H.h1}</h1>
      <p class="lead">${esc(H.lead)}</p>
      <a class="btn btn-gold" href="${rel}create.html?lang=${lang}" style="font-size:1.1rem">🎉 ${esc(H.cta)}</a>
      <div class="chips">${H.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
    </div>
    <form class="joinbox" onsubmit="event.preventDefault();var c=this.c.value.replace(/\\D/g,'');if(c.length===5)location.href='${rel}play.html?c='+c+'${lang === 'he' ? '' : '&lang=en'}';">
      <h2>${esc(H.joinH)}</h2>
      <input name="c" inputmode="numeric" maxlength="5" placeholder="${esc(H.codePh)}" autocomplete="off" aria-label="${esc(H.codePh)}">
      <button class="btn btn-gold">${esc(H.joinBtn)}</button>
      <p class="muted" style="color:#6b5b86;margin:10px 0 0;font-size:.9rem">${esc(H.joinNote)}</p>
    </form>
  </section>
  <div class="steps">${howSteps(lang)}</div>
  <section class="section"><h2>${esc(H.evH)}</h2><div class="grid-ev">${evCards(rel)}</div></section>
  <section class="section prose"><h2>${esc(H.whyH)}</h2>${H.why.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
  <section class="section prose"><h2>${esc(H.faqH)}</h2>${faqHtml(H.faq)}</section>`,
  }));
}

// ---------- SEO pages ----------
const fillGeneric = (s, g) => s.replace(/\{A\}/g, g[0]).replace(/\{B\}/g, g[1] || '');
for (const p of PAGES) {
  const H = HOME[p.lang];
  const tp = p.event ? TPL[p.lang][p.event] : null;
  const ideas = tp ? [...tp.q.map((q) => fillGeneric(q.q, p.generic)), ...(p.extraIdeas || [])] : [];
  const alt = p.alt ? { [p.lang]: p.slug, ...p.alt } : null;
  writePage(p.lang, p.slug, layout({
    lang: p.lang, slug: p.slug, title: p.title, desc: p.desc, alt,
    schema: p.faq ? faqSchema(p.faq) : null,
    body: (rel) => `
  <section class="prose" style="padding:20px 0 10px">
    <h1 style="font-size:clamp(1.8rem,4.5vw,2.8rem);line-height:1.15;margin:0 0 14px">${esc(p.h1)}</h1>
    ${p.intro.map((x) => `<p class="lead" style="font-size:1.1rem;color:var(--mute)">${esc(x)}</p>`).join('')}
    <a class="btn btn-gold" href="${rel}create.html?lang=${p.lang}${p.event ? '&type=' + p.event : ''}">🎉 ${esc(p.cta || H.cta)}</a>
  </section>
  <div class="steps">${howSteps(p.lang)}</div>
  ${ideas.length ? `<section class="section prose"><h2>${esc(p.ideasH)}</h2><ol>${ideas.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>
    <p><a class="btn btn-gold btn-sm" style="color:var(--ink)" href="${rel}create.html?lang=${p.lang}&type=${p.event}">${esc(p.useTpl)}</a></p></section>` : ''}
  ${(p.sections || []).map(([h, paras]) => `<section class="section prose"><h2>${esc(h)}</h2>${paras.map((x) => Array.isArray(x) ? `<ul>${x.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : `<p>${esc(x)}</p>`).join('')}</section>`).join('')}
  ${p.faq ? `<section class="section prose"><h2>${esc(H.faqH)}</h2>${faqHtml(p.faq)}</section>` : ''}`,
  }));
}

// ---------- sitemap / robots ----------
const urls = ['he', 'en'].map((l) => SITE_URL + urlOf(l, '')).concat(PAGES.map((p) => SITE_URL + urlOf(p.lang, p.slug)));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), INDEX ? `User-agent: *\nAllow: /\nDisallow: /host.html\nSitemap: ${SITE_URL}sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
console.log(`built ${urls.length} pages -> ${OUT} (index=${INDEX}, url=${SITE_URL})`);
