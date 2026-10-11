/* Browser check: Net worth forecast months, Days off for "All", every refund visible in Days.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/overview-days.e2e.js
   SHOTS=<folder> also saves screenshots there. */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const SHOTS = process.env.SHOTS;
const now = new Date(), Y = now.getFullYear(), CM = now.getMonth();   /* the forecast needs months after the last figure: this year */
const ym = m => Y + '-' + String(m + 1).padStart(2, '0');
let id = 0;
const row = (m, d, amount, concept, category) => ({ id: 'r' + (++id), date: ym(m) + '-' + String(d).padStart(2, '0'), amount, concept, category });
const months = {};
for (let m = 0; m <= Math.min(CM, 8); m++) months[ym(m)] = { income: [row(m, 1, 2000, 'Salary', 'Salary')], expenses: [row(m, 4, -60, 'Shop', 'Groceries'), row(m, 18, -25, 'Shop', 'Groceries')], investments: [] };
/* refunds: a day with a purchase and a refund (Feb 3), refunds alone (Mar 10, Jul 7) and a small one (May 20) */
const refunds = [[1, 3, 30], [2, 10, 45], [4, 20, 12.5], [6, 7, 430]].filter(([m]) => months[ym(m)]);
months[ym(1)] && months[ym(1)].expenses.push(row(1, 3, -80, 'Shop', 'Groceries'));
for (const [m, d, v] of refunds) months[ym(m)].expenses.push(row(m, d, v, 'Refund shop', 'Groceries'));
/* net worth Jan to the month before last: cash +300, funds +500 a month */
const snaps = {}; const last = Math.max(0, Math.min(CM, 8) - 1);
for (let m = 0; m <= last; m++) snaps[ym(m)] = { a1: 2000 + 300 * m, a2: 10000 + 500 * m };
const data = JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months, config: {
  settings: { lang: 'en', start: { y: Y, m: 0 }, fixedVar: 1, numFmt: 'en', currency: 'EUR' },
  networth: { accounts: [{ id: 'a1', name: 'Bank', group: 'cash' }, { id: 'a2', name: 'Funds', group: 'invest' }], snaps } } });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto(START, { waitUntil: 'load' });
  await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, data);
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=open]');
  await p.waitForFunction(() => window.__ybtWeb.store && Object.keys(window.__ybtWeb.store.months).length);
  const tab = async t => { await p.click('#tab-' + t); await p.waitForTimeout(300); };

  /* 1. Net worth: Jan-Dec, months after the last figure greyed, the note under the chart, a tooltip that says forecast */
  await tab('networth');
  const nw = await p.evaluate(() => ({ fc: document.querySelectorAll('#ch-nw g.nw-fc').length, fcLine: !!document.querySelector('#ch-nw line.trend.fc'),
    labels: [...document.querySelectorAll('#ch-nw text.tk')].map(t => t.textContent).filter(t => /^[A-Z][a-z]/.test(t)).length,
    approx: [...document.querySelectorAll('#ch-nw text.nw-lbl')].filter(t => t.textContent.startsWith('≈')).length }));
  assert.strictEqual(nw.fc, 11 - last, 'forecast bars');
  assert.strictEqual(nw.approx, 11 - last, '≈ labels');
  assert.strictEqual(nw.labels, 12, 'month labels');
  assert.ok(nw.fcLine, 'dotted trend over the forecast');
  assert.match(await p.innerText('#view'), /Greyed months are projected from your last \d+ months\./);
  const box = await p.locator('#ch-nw svg').boundingBox();
  await p.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
  assert.match(await p.innerText('#tip'), /Forecast[\s\S]*A projection/);
  if (SHOTS) await p.locator('#ch-nw').screenshot({ path: SHOTS + '/nw-forecast.png' });
  console.log('1. Net worth shows the whole year, ' + nw.fc + ' months projected');

  /* 2. Days is off for All; All sends Days back to Months */
  await tab('overview');
  const daysBtn = '[data-action=mm-days][data-v="1"]', monthsBtn = '[data-action=mm-days][data-v="0"]';
  await p.click('[data-action=mm-table][data-t=all]');
  assert.strictEqual(await p.getAttribute(daysBtn, 'aria-disabled'), 'true');
  assert.match(await p.getAttribute(daysBtn, 'title'), /individually/);
  await p.click(daysBtn, { force: true });
  assert.strictEqual(await p.getAttribute(monthsBtn, 'aria-pressed'), 'true', 'Days turned on for All');
  await p.click('[data-action=mm-table][data-t=expenses]');
  await p.click(daysBtn);
  assert.strictEqual(await p.getAttribute(daysBtn, 'aria-pressed'), 'true');
  await p.click('[data-action=mm-table][data-t=all]');
  assert.strictEqual(await p.getAttribute(monthsBtn, 'aria-pressed'), 'true', 'All left Days on');
  assert.ok(!/Days show one type/.test(await p.innerText('#view')), 'old helper text');
  console.log('2. Days is off for All and All goes back to Months');

  /* 3. Days + Expenses: every refund is a bar below the line, the purchase on the same day too, axis reaches the biggest refund */
  await p.click('[data-action=mm-table][data-t=expenses]');
  await p.click(daysBtn);
  await p.waitForTimeout(200);
  const d = await p.evaluate(() => ({ neg: document.querySelectorAll('#ch-monthly path.bar[data-j="1"]').length,
    ticks: [...document.querySelectorAll('#ch-monthly text.tk')].map(t => t.textContent) }));
  assert.strictEqual(d.neg, refunds.length, 'refund bars: ' + d.neg);
  assert.ok(d.ticks.some(t => /^[-−]\s?[\d.,]+k?$/.test(t.trim())), 'no negative tick: ' + d.ticks.join(' '));
  if (SHOTS) await p.locator('#ch-monthly').screenshot({ path: SHOTS + '/days-expenses.png' });
  assert.deepStrictEqual(errs, []);
  console.log('3. Days + Expenses shows all ' + refunds.length + ' refunds');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
