/* Browser check of the monthly check-in: two statements dropped at once, the known one goes to its account by itself,
   the other is picked once and remembered, Balance columns fill the month-end, the missing figure and an uncategorised
   row are done in the check-in, and the month's summary closes it.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/checkin.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const SHOTS = process.env.SHOTS;   /* a folder: screenshots of the steps go there */
const ym = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const shot = async n => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
  await p.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await p.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));

  /* a tracker set up two months ago: three accounts, figures for the month before the one to check, the current account's file known */
  const now = new Date(), ck = ym(now, -1), prev = ym(now, -2), cur = ym(now, 0);
  await p.goto(START, { waitUntil: 'load' });
  await p.evaluate(async ({ ck, prev }) => { localStorage.setItem('ybt.storage', 'browser');
    await window.__ybtWeb.idb.set('data', JSON.stringify({ app: 'Yearly Budget Tracker', format: 1,
      months: { [prev]: { income: [{ id: 's1', date: prev + '-27', concept: 'ACME PAYROLL', amount: 2000, category: 'Salary' }], expenses: [], investments: [] } },
      config: { settings: { lang: 'en', start: { y: +prev.slice(0, 4), m: +prev.slice(5, 7) - 1 }, guide: { on: false, done: true, stmts: { cur: { from: prev + '-01', to: prev + '-27', n: 1 } } },
          stmtFp: { cur: { h: 'date|description|amount|balance', n: 'bank_#', id: '' } }, lastCheckin: prev },
        networth: { accounts: [{ id: 'cur', name: 'Current account', group: 'cash' }, { id: 'sav', name: 'Savings account', group: 'cash' }, { id: 'fund', name: 'Index funds', group: 'invest' }],
          snaps: { [prev]: { cur: 1000, sav: 5000, fund: 8000 } } } } })); }, { ck, prev });
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=open]');
  await p.waitForSelector('[data-action="ci-open"]', { timeout: 8000 });
  await shot('checkin-strip');
  console.log('1. a check-in is offered');

  /* two files at once: the bank's (known) and the savings account's (new); the bank's overlaps the salary already saved */
  const csv = (rows, bal) => 'Date,Description,Amount,Balance\n' + rows.map(([d, c, a]) => { bal = Math.round((bal + a) * 100) / 100; return `${d},${c},${a},${bal}`; }).join('\n');
  const bank = csv([[prev + '-27', 'ACME PAYROLL', 2000], [ck + '-03', 'MERCADONA', -60], [ck + '-15', 'ZZ STRANGE SHOP', -25], [ck + '-27', 'ACME PAYROLL', 2000], [cur + '-01', 'MERCADONA', -30]], -1000);
  const sav = 'Fecha;Concepto;Importe;Saldo\n' + [[ck + '-05', 'INTERES', '2,00', '4997,00'], [ck + '-12', 'INTERES', '3,00', '5000,00'], [ck + '-28', 'INTERES', '5,00', '5005,00'], [cur + '-01', 'INTERES', '1,00', '5006,00']].map(r => r.join(';')).join('\n');
  await p.click('[data-action="ci-open"]');
  await p.waitForSelector('#ci-file', { state: 'attached' }); await shot('checkin-0');
  await p.setInputFiles('#ci-file', [{ name: 'bank_20261012.csv', mimeType: 'text/csv', buffer: Buffer.from(bank) }, { name: 'ahorro.csv', mimeType: 'text/csv', buffer: Buffer.from(sav) }]);
  await p.waitForSelector('#imp-acct');
  assert.strictEqual(await p.inputValue('#imp-acct'), 'cur', 'the known file goes to its account by itself');
  assert.ok(/file 1 of 2/.test(await p.innerText('.modal')));
  assert.ok(await p.isChecked('#imp-balfill'), 'its Balance column fills the month-end'); await shot('checkin-review');
  await p.click('[data-action="imp-add"]');
  if (await p.$('[data-action="imp-add-confirm"]')) await p.click('[data-action="imp-add-confirm"]');
  await p.waitForFunction(() => /file 2 of 2/.test((document.querySelector('.modal') || {}).innerText || ''));
  assert.strictEqual(await p.inputValue('#imp-acct'), '', 'a new file asks which account');
  await p.selectOption('#imp-acct', 'sav');
  await p.waitForSelector('#imp-balfill');
  await p.click('[data-action="imp-add"]');
  if (await p.$('[data-action="imp-add-confirm"]')) await p.click('[data-action="imp-add-confirm"]');
  await p.waitForSelector('.wz-body #ci-drop');
  assert.strictEqual((await p.$$('.wz-list .wz-st.ok')).length, 2, 'both accounts are covered');
  /* the new file is remembered for its account */
  await p.waitForFunction(() => { const s = window.__ybtWeb.store.config.settings; return s.stmtFp && s.stmtFp.sav && s.stmtFp.sav.n === 'ahorro'; }, null, { timeout: 5000 });
  const salary = await p.evaluate(m => (window.__ybtWeb.store.months[m] || {}).income || [], prev);
  assert.strictEqual(salary.length, 1, 'the overlapping salary was skipped as a duplicate');
  console.log('2. two files: one recognised, one picked and remembered, overlap skipped');

  /* balances: the two Cash accounts came from the files, the fund is typed */
  await p.click('.m-foot [data-action="wz-next"]');
  assert.ok(/missing/.test(await p.innerText('.wz-list')), 'the fund has no figure yet'); await shot('checkin-1');
  await p.click('.wz-acts [data-action="guide-val"]'); await p.waitForSelector('#nw-snap-form');
  await p.fill('#nwv-fund', '8200');
  await p.click('#nw-snap-form button[type=submit]'); await p.waitForSelector('.wz-body');
  await p.waitForFunction(m => { const s = window.__ybtWeb.store.config.networth.snaps[m]; return s && s.fund === 8200; }, ck, { timeout: 5000 });
  const snap = await p.evaluate(m => window.__ybtWeb.store.config.networth.snaps[m], ck);
  assert.deepStrictEqual(snap, { cur: 2915, sav: 5005, fund: 8200 }, 'month-end figures: ' + JSON.stringify(snap));
  assert.strictEqual((await p.innerText('.m-foot [data-action="wz-next"]')).trim(), 'Next');
  console.log('3. balances: two from the files, one typed');

  /* sort: one of the rows with no category */
  await p.click('.m-foot [data-action="wz-next"]');
  const left = () => p.evaluate(() => +((document.querySelector('.wz-body').innerText.match(/(\d+) rows? ha(?:s|ve) no category/) || [0, 0])[1]));
  await p.waitForFunction(() => /category/.test(document.querySelector('.wz-body').innerText));
  const n0 = await left(); await shot('checkin-2');
  assert.ok(n0 > 0 && await p.$('select[data-action="ci-cat"]'), 'the uncategorised rows are listed: ' + await p.innerText('.wz-body'));
  await p.selectOption('select[data-action="ci-cat"]', { index: 2 });
  await p.waitForFunction(n => +((document.querySelector('.wz-body').innerText.match(/(\d+) rows? ha(?:s|ve) no category/) || [0, 0])[1]) === n - 1 || (n === 1 && /Every row has a category/.test(document.querySelector('.wz-body').innerText)), n0);
  console.log('4. an uncategorised row is sorted in the check-in');

  /* the month's summary closes it, and the strip goes */
  await p.click('.m-foot [data-action="wz-next"]');
  await p.waitForSelector('.ci-big'); await shot('checkin-3');
  assert.ok(/Net worth/.test(await p.innerText('.wz-body')));
  await p.click('[data-action="ci-done"]');
  await p.waitForFunction(m => window.__ybtWeb.store.config.settings.lastCheckin === m, ck);
  assert.ok(!(await p.$('[data-action="ci-open"]')), 'the strip goes once the month is checked');
  console.log('5. the summary closes the check-in');

  /* 6. a month already complete (rows, and every account's month-end figure) offers no check-in */
  const q = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  await q.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await q.goto(START, { waitUntil: 'load' });
  await q.evaluate(async ({ ck }) => { localStorage.setItem('ybt.storage', 'browser');
    await window.__ybtWeb.idb.set('data', JSON.stringify({ app: 'Yearly Budget Tracker', format: 1,
      months: { [ck]: { income: [{ id: 's1', date: ck + '-27', concept: 'ACME PAYROLL', amount: 2000, category: 'Salary' }], expenses: [], investments: [] } },
      config: { settings: { lang: 'en' }, networth: { accounts: [{ id: 'cur', name: 'Current account', group: 'cash' }], snaps: { [ck]: { cur: 3000 } } } } })); }, { ck });
  await q.goto(START, { waitUntil: 'load' });
  await q.click('.web-landing .wl-hero [data-x=open]');
  await q.waitForSelector('#view .page-head'); await q.waitForTimeout(500);
  assert.ok(!(await q.$('[data-action="ci-open"]')), 'a complete month offers no check-in');
  console.log('6. a month already complete offers no check-in');
  await browser.close();
  console.log('check-in e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
