/* Makes the landing page's product shot: the Net worth page filled with made-up data (never real figures).
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tools/landing-shot.js
   Writes images/landing-hero-dark.webp, images/landing-hero-light.webp and images/landing-hero.jpg (fallback).
   Run it again after a UI change. The data is fixed (seeded), so only UI changes alter the picture. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const START = process.env.START_URL || 'http://localhost:8000/';
const OUT = path.join(__dirname, '..', 'images');

/* someone saving steadily from March 2025 to August 2026: pay in, rent and life out, 300 € to savings and
   250 € to an index fund a month, a small pension plan; funds move with a made-up market. Sep-Dec 2026 show as forecast. */
function demo() {
  let seed = 4242; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296, pick = (a, b) => Math.round((a + (b - a) * rnd()) * 100) / 100;
  const months = {}, snaps = {}; let id = 0, cash = 1900, save = 4200, fund = 6100, pp = 2300;
  for (let i = 0; i < 18; i++) {
    const y = 2025 + Math.floor((2 + i) / 12), m = (2 + i) % 12, k = y + '-' + String(m + 1).padStart(2, '0');
    const row = (d, amount, concept, category) => ({ id: 'd' + (++id), date: k + '-' + String(d).padStart(2, '0'), amount: Math.round(amount * 100) / 100, concept, category });
    const doc = { income: [row(28, 2350, 'SALARY', 'Salary')], expenses: [row(1, -780, 'RENT', 'Rent'), row(6, -pick(40, 85), 'ELECTRICITY', 'Utilities'), row(5, -25, 'PHONE', 'Phone')], investments: [row(3, -250, 'INDEX FUND', 'Funds/ETFs')] };
    for (let j = 0; j < 5; j++) doc.expenses.push(row(2 + j * 6, -pick(30, 80), 'SUPERMARKET', 'Groceries'));
    for (let j = 0; j < 3; j++) doc.expenses.push(row(5 + j * 8, -pick(15, 45), 'RESTAURANT', 'Restaurants'));
    if (m === 6) { doc.income.push(row(20, 2350, 'SUMMER BONUS', 'Salary')); doc.expenses.push(row(12, -690, 'HOLIDAY FLIGHTS AND HOTEL', 'Vacation + Hotel + Travel')); }
    if (m === 11) doc.expenses.push(row(15, -320, 'GIFTS', 'Gifts'));
    months[k] = doc;
    const flow = [...doc.income, ...doc.expenses, ...doc.investments].reduce((a, r) => a + r.amount, 0);
    cash += flow - 300; save = save * 1.0017 + 300; fund = (fund + 250) * (1 + pick(-0.03, 0.04)); pp = (pp + 75) * (1 + pick(-0.012, 0.018));
    if (k <= '2026-08') snaps[k] = { c: r(cash), s: r(save), f: r(fund), p: r(pp) };
  }
  function r(v) { return Math.round(v * 100) / 100; }
  return JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months, config: {
    settings: { lang: 'en', start: { y: 2025, m: 2 }, fixedVar: 1, numFmt: 'es', currency: 'EUR', birthYear: 1994 },
    networth: { accounts: [{ id: 'c', name: 'Current account', group: 'cash' }, { id: 's', name: 'Savings account', group: 'cash' },
      { id: 'f', name: 'Index fund', group: 'invest' }, { id: 'p', name: 'Pension plan', group: 'pension' }], snaps, goal: { amount: 30000, month: '2027-12' } } } });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1010 }, deviceScaleFactor: 2, colorScheme: scheme });
    await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
    const p = await ctx.newPage();
    await p.goto(START, { waitUntil: 'load' });
    await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, demo());
    await p.goto(START, { waitUntil: 'load' });
    await p.click('.web-landing .wl-hero [data-x=open]');
    await p.waitForFunction(() => window.__ybtWeb.store && Object.keys(window.__ybtWeb.store.months).length);
    await p.click('#tab-networth');
    /* category names are the defaults, so nothing waits to be sorted */
    /* the year buttons: show 2026 only (Jan-Aug figures, Sep-Dec forecast) */
    const y26 = await p.$('[data-action=nw-year][data-y="2026"]'); if (y26 && (await y26.getAttribute('aria-pressed')) !== 'true') await y26.click();
    await p.addStyleTag({ content: '#view .notice,.toast,.guide,.guide-bar,.web-bar,.web-foot{display:none!important}' });
    await p.mouse.move(0, 0); await p.waitForTimeout(600);
    const png = await p.screenshot({ type: 'png' });
    /* WebP from the browser itself (no image tools needed), 2200 px wide */
    const webp = await p.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = 2200; c.height = Math.round(img.height * 2200 / img.width);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.8));
      return btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
    }, png.toString('base64'));
    fs.writeFileSync(path.join(OUT, `landing-hero-${scheme}.webp`), Buffer.from(webp, 'base64'));
    if (scheme === 'dark') await p.screenshot({ type: 'jpeg', quality: 72, path: path.join(OUT, 'landing-hero.jpg') });
    await ctx.close();
  }
  await browser.close();
  for (const f of fs.readdirSync(OUT)) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB');
})().catch(e => { console.error(e); process.exit(1); });
