/* Browser check: one tab at a time, restoring a browser backup, and a safe "Start fresh?".
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/tabs-restore.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const TRACKER = JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': { income: [{ id: 'a1', date: '2026-09-01', desc: 'Salary', amount: 2000, cat: 'Salary' }], expenses: [], investments: [] } }, config: {} });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200))); await p.goto(START, { waitUntil: 'load' }); return p; };
  const txCount = p => p.evaluate(() => Object.values(window.__ybtWeb.store.months).reduce((n, m) => n + m.income.length + m.expenses.length + m.investments.length, 0));

  /* a tracker with one transaction, saved only in this browser */
  let a = await open();
  await a.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser');
    await window.__ybtWeb.idb.set('data', t); }, TRACKER);
  await a.reload({ waitUntil: 'load' });
  await a.waitForFunction(() => window.__ybtWeb && window.__ybtWeb.store);
  assert.strictEqual(await txCount(a), 1);

  /* 1. a second tab takes over; the first one stops and says so */
  const b = await open();
  await b.click('.web-landing .wl-hero [data-x=open]');
  await b.waitForFunction(() => window.__ybtWeb && window.__ybtWeb.store);
  await a.waitForSelector('.web-panel [data-x=here]');
  assert.ok(/another tab/i.test(await a.innerText('#wp-title')));
  assert.ok(!(await b.$('.web-panel [data-x=here]')), 'the new tab must keep working');
  await a.close();
  console.log('1. second tab takes over, first one stops');

  /* 2. "Start fresh?": focus on Cancel, Escape cancels */
  const fresh = b.evaluate(async () => (await window.claude.use('local')).startFresh());
  await b.waitForSelector('.web-panel [data-x=no]');
  await b.waitForFunction(() => document.activeElement && document.activeElement.dataset.x === 'no');
  await b.keyboard.press('Escape');
  assert.strictEqual(await fresh, null);
  assert.ok(!(await b.$('.web-panel [data-x=no]')));
  assert.strictEqual(await txCount(b), 1);
  console.log('2. start fresh: Cancel focused, Escape cancels');

  /* 3. start fresh for real, then bring the data back from the browser's backups */
  const fresh2 = b.evaluate(async () => (await window.claude.use('local')).startFresh());
  await b.click('.web-panel [data-x=yes]');
  await fresh2;
  assert.strictEqual(await txCount(b), 0);
  const restore = b.evaluate(async () => (await window.claude.use('local')).browserRestore());
  await b.waitForSelector('.web-panel .web-list [data-i="0"]');
  assert.ok(/before starting fresh/.test(await b.innerText('.web-panel .web-list li:first-child')));
  await b.click('.web-panel .web-list [data-i="0"]');
  const r = await restore;
  assert.ok(r && !r.bad && /1 transactions/.test(r.message), JSON.stringify(r));
  assert.strictEqual(await txCount(b), 1);
  console.log('3. start fresh, then restore from this browser');

  /* 4. another tab takes over right after an edit (inside the 250 ms before it's saved): the edit is saved first */
  for (let i = 0; i < 3; i++) { await b.keyboard.press('Escape'); await b.waitForTimeout(150); }
  await b.click('#tab-transactions'); await b.click('#view [data-action="add-tx"]'); await b.waitForSelector('#tx-form');
  await b.fill('#f-date', '2026-09-15'); await b.fill('#f-concept', 'Last-moment edit'); await b.fill('#f-amount', '12');
  const c = await ctx.newPage(); await c.goto(START + 'privacy.html');
  await b.$eval('#tx-form', f => f.requestSubmit());
  await c.evaluate(() => new BroadcastChannel('myahorros-tab').postMessage('take'));
  await b.waitForSelector('.web-panel [data-x=here]');
  const saved = await b.evaluate(async () => JSON.stringify(await window.__ybtWeb.idb.get('data')));
  assert.ok(/Last-moment edit/.test(saved), 'edit lost when another tab took over');
  console.log('4. an edit made just before another tab takes over is saved');

  await browser.close();
  console.log('tabs-restore: all passed');
})().catch(e => { console.error(e); process.exit(1); });
