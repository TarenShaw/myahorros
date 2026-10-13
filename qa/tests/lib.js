/* Shared helpers for the QA suite. Needs Playwright (Edge channel) and a server on the repo root:
     python -m http.server 8131
     NODE_PATH=<folder with playwright + @axe-core/playwright> START_URL=http://localhost:8131/ node qa/tests/<script>.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const START = process.env.START_URL || 'http://localhost:8131/';
const SHOTS = path.join(__dirname, '..', 'screenshots');
const RESULTS = path.join(__dirname, '..', 'results');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(RESULTS, { recursive: true });

let browser;
async function launch() { browser = await chromium.launch({ channel: 'msedge' }); return browser; }

/* a fresh, private-like browser context. opts: w, h, lang ('en'|'es'), scheme ('light'|'dark'), mobile, bypassCSP, test (expose window.__ybt) */
async function context(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.w || 1440, height: opts.h || 900 },
    isMobile: !!opts.mobile, hasTouch: !!opts.mobile, deviceScaleFactor: opts.mobile ? 2 : 1,
    colorScheme: opts.scheme || 'light', bypassCSP: !!opts.bypassCSP, acceptDownloads: true,
    locale: opts.locale || (opts.lang === 'es' ? 'es-ES' : 'en-GB'), timezoneId: opts.tz || 'Europe/Madrid'
  });
  const lang = opts.lang;
  await ctx.addInitScript(([l, t]) => { try { if (l) localStorage.setItem('ybt.lang', l); if (t) window.__ybtTest = true; } catch (_) {} }, [lang, !!opts.test]);
  /* never reach Google or the AI vendors from tests */
  await ctx.route('https://accounts.google.com/**', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
  await ctx.route(/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com/, r => r.fulfill({ status: 401, body: '{"error":"mocked"}' }));
  await ctx.route(/goatcounter\.com/, r => r.fulfill({ status: 204, body: '' }));
  ctx.errors = [];
  ctx.on('page', p => watch(p, ctx));
  return ctx;
}
function watch(p, ctx) {
  p.on('pageerror', e => ctx.errors.push('pageerror: ' + String(e).slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') ctx.errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('dialog', d => { ctx.errors.push('DIALOG ' + d.type() + ': ' + d.message()); d.dismiss().catch(() => {}); });
}

/* open the app with this tracker saved in the browser (IndexedDB), the way a returning visitor sees it */
async function openWith(ctx, tracker) {
  const p = await ctx.newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, JSON.stringify(tracker));
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.__ybtWeb && window.__ybtWeb.store && document.querySelector('#view .card, #view .state h2, #view section'), null, { timeout: 15000 });
  await p.waitForTimeout(400);
  return p;
}
/* the demo ("See a demo") */
async function openDemo(ctx) {
  const p = await ctx.newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=demo]');
  await p.waitForFunction(() => window.__ybtWeb && window.__ybtWeb.store, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  await closeAll(p);
  return p;
}
async function closeAll(p) { for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(120); } }
async function tab(p, t) { await p.click('#tab-' + t); await p.waitForTimeout(350); }
async function shot(p, name, full) { const f = path.join(SHOTS, name + '.png'); await p.screenshot({ path: f, fullPage: !!full }); return 'qa/screenshots/' + name + '.png'; }
function save(name, data) { fs.writeFileSync(path.join(RESULTS, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2)); }

/* layout problems on the current screen: horizontal page scroll, elements wider than the viewport, small tap targets */
async function layoutCheck(p) {
  return p.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = { vw, pageScrollX: document.documentElement.scrollWidth > vw + 1, overflow: [], small: [] };
    const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 && !el.closest('.tbl-wrap,.table-wrap,[style*="overflow"],.scroll-x,.mm-scroll,.chart-scroll')) {
        let p = el.parentElement, clipped = false;
        while (p) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.overflow.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ' right=' + Math.round(r.right));
      }
      if (el.matches('button,a[href],input:not([type=hidden]),select,[role=button],[role=tab],summary,label.radio-card') && (r.width < 44 || r.height < 44) && r.width > 0)
        out.small.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')) + ` ${Math.round(r.width)}x${Math.round(r.height)} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 25)}"`);
    }
    out.overflow = [...new Set(out.overflow)].slice(0, 15); out.smallCount = out.small.length; out.small = [...new Set(out.small)].slice(0, 12);
    return out;
  });
}

/* axe-core on the current page (needs a context with bypassCSP) */
async function axe(p, tag) {
  const { AxeBuilder } = require('@axe-core/playwright');
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  return { screen: tag, violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })) };
}

/* a made-up tracker: 18 months, round-cent amounts, known totals. Returns {tracker, expect} */
function fakeTracker() {
  const months = {}; let id = 0;
  const add = (ym, t, day, concept, amount, category) => {
    (months[ym] = months[ym] || { income: [], expenses: [], investments: [] })[t].push({ id: 'q' + (++id), date: ym + '-' + String(day).padStart(2, '0'), concept, amount, category });
  };
  const yms = []; for (let y = 2025, m = 4; y * 12 + m <= 2026 * 12 + 9; m++) { if (m > 12) { m = 1; y++; } yms.push(y + '-' + String(m).padStart(2, '0')); }
  yms.forEach((ym, i) => {
    add(ym, 'income', 28, 'ACME PAYROLL', 2150.35, 'Salary');
    add(ym, 'expenses', 1, 'Rent flat', -850, 'Rent');
    add(ym, 'expenses', 3, 'SUPERMARKET FAKE', -(62.4 + i), 'Groceries');
    add(ym, 'expenses', 17, 'SUPERMARKET FAKE', -(48.15 + (i % 3)), 'Groceries');
    add(ym, 'expenses', 9, 'POWER CO', -(55.55 + (i % 4) * 10), 'Utilities');
    add(ym, 'expenses', 12, 'CAFE TEST', -3.3, 'Restaurants');
    if (i % 5 === 0) add(ym, 'expenses', 20, 'Mystery shop', -19.99, '');
    if (i % 6 === 2) add(ym, 'expenses', 15, 'Refund test shop', 25.5, 'Groceries');
    add(ym, 'investments', 5, 'Index fund', -200, 'Funds/ETFs');
  });
  /* expected totals per year, by hand */
  const expect = {};
  for (const [ym, m] of Object.entries(months)) {
    const y = ym.slice(0, 4), e = expect[y] = expect[y] || { income: 0, expenses: 0, investments: 0, months: {} };
    const mm = e.months[ym] = { income: 0, expenses: 0, investments: 0 };
    for (const t of ['income', 'expenses', 'investments']) for (const r of m[t]) { e[t] += r.amount; mm[t] += r.amount; }
  }
  const r2 = x => Math.round(x * 100) / 100;
  for (const e of Object.values(expect)) { for (const t of ['income', 'expenses', 'investments']) e[t] = r2(e[t]); e.savings = r2(e.income + e.expenses); e.rate = e.income ? e.savings / e.income : 0;
    for (const mm of Object.values(e.months)) for (const t of ['income', 'expenses', 'investments']) mm[t] = r2(mm[t]); }
  /* made-up accounts with month-end balances, so Net worth has something to show */
  const accounts = [{ id: 'a1', name: 'Everyday account', group: 'cash' }, { id: 'a2', name: 'Savings pot', group: 'cash' }, { id: 'a3', name: 'Index fund', group: 'invest', words: 'index fund' }, { id: 'a4', name: 'Pension plan', group: 'pension' }];
  const snaps = {}; yms.forEach((ym, i) => { snaps[ym] = { a1: 1500 + i * 120.5, a2: 6000 + i * 300, a3: 4000 + i * 230.25, a4: 9000 + i * 150 }; });
  return { tracker: { app: 'Yearly Budget Tracker', format: 1, months, config: { settings: { lang: 'en', numFmt: 'eu', currency: 'EUR', start: { y: 2025, m: 3 } }, networth: { accounts, snaps, goal: null } } }, expect };
}
/* "1.234,56 €" / "−1.234,56 €" / "1,234.56" -> number */
function money(s) { s = String(s).replace(/[−–]/g, '-').replace(/[^\d,.\-]/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); return parseFloat(s); }

module.exports = { launch, context, openWith, openDemo, closeAll, tab, shot, save, layoutCheck, axe, fakeTracker, money, START, SHOTS, RESULTS, get browser() { return browser; } };
