/* Browser check: damaged or hand-edited tracker files load without breaking the app (audit 2026-10-11).
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/bad-data.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const month = (inc, exp) => ({ '2026-09': { income: [{ id: 'i1', date: '2026-09-01', amount: 2000, concept: 'Salary', category: 'Salary' }, ...inc], expenses: [{ id: 'e1', date: '2026-09-03', amount: -500, concept: 'Rent', category: 'Rent' }, ...exp], investments: [] } });
const settings = more => Object.assign({ lang: 'en', start: { y: 2026, m: 0 }, fixedVar: 1, numFmt: 'en', currency: 'EUR' }, more);
const file = (months, cfg) => JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months, config: Object.assign({ settings: settings() }, cfg) });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  /* opens the app on a tracker saved in this browser as `data`, returns the page and the errors it threw */
  const open = async data => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto(START, { waitUntil: 'load' });
    await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, data);
    await p.goto(START, { waitUntil: 'load' });   /* a typed visit: the landing offers Open my tracker */
    return { p, errs };
  };
  const openTracker = async data => { const o = await open(data);
    await o.p.click('.web-landing .wl-hero [data-x=open]');
    await o.p.waitForFunction(() => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09']);
    return o; };
  const tab = async (p, t) => { await p.click('#tab-' + t); await p.waitForTimeout(250); return p.innerText('#view'); };

  /* 1. a null category used to leave "Loading your tracker…" forever */
  let { p, errs } = await openTracker(file(month([], []), { categories: { expenses: [null, { name: 'Rent', type: 'Need' }, { type: 'Want' }] } }));
  assert.ok(/Rent/.test(await tab(p, 'categories')), 'categories screen');
  assert.ok(!/undefined/.test(await tab(p, 'yearly')), 'nameless category shown');
  assert.deepStrictEqual(errs, []);
  console.log('1. bad category entries are skipped');

  /* 2. Infinity / 1e308 amounts and junk dates used to blank every total */
  ({ p, errs } = await openTracker(file(month([{ id: 'x2', date: '2026-09-11', amount: 1e308, concept: 'Big', category: 'Salary' }, { id: 'x4', date: 'yesterday', amount: 5, concept: 'Junk', category: 'Salary' }],
    [{ id: 'x1', date: '2026-09-10', amount: 'Infinity', concept: 'Inf', category: 'Groceries' }]))));
  const y = await tab(p, 'yearly');
  assert.ok(/2,000/.test(y) && !/NaN|Infinity/.test(y), 'yearly totals: ' + y.slice(0, 300));
  assert.deepStrictEqual(errs, []);
  console.log('2. non-finite amounts count as 0, undated rows are skipped');

  /* 3. About you values from a file can't break out of the input, and a wrong-typed health setting can't stop Net worth */
  ({ p, errs } = await openTracker(file(month([], []), { settings: settings({ birthYear: '1990" test', salary: 1985, health: { emergencyExclude: 5, fiGroups: 'invest' } }),
    networth: { accounts: [{ id: 'a1', name: 'Bank', group: 'cash' }], snaps: { '2026-09': { a1: 1000 } } } })));
  await tab(p, 'networth');
  await tab(p, 'settings');
  assert.strictEqual(await p.inputValue('#st-born'), '');
  assert.strictEqual(await p.inputValue('#st-salary'), '1985');
  assert.ok(!(await p.evaluate(() => document.getElementById('st-born').hasAttribute('test"'))), 'attribute added from the file');
  assert.deepStrictEqual(errs, []);
  console.log('3. settings from a file are checked');

  /* 4. stored data that can't be read is kept as a browser backup before anything overwrites it */
  ({ p, errs } = await open('{"months":{"2026-09":'));
  await p.reload({ waitUntil: 'load' });   /* a reload reads the stored data straight away */
  await p.waitForFunction(async () => (await window.__ybtWeb.idb.keys()).map(String).some(k => /^bk:unreadable /.test(k)), null, { timeout: 5000 });
  assert.strictEqual(await p.evaluate(() => window.__ybtWeb.idb.get('data')), '{"months":{"2026-09":', 'stored text overwritten');
  console.log('4. unreadable stored data is kept as a backup');

  /* 5. imports: a 1.5 KB workbook claiming the whole sheet (A1:XFD1048576) used to hang the tab; a long file shows
     200 rows at a time; a file over 20 MB isn't read */
  ({ p, errs } = await openTracker(file(month([], []), {})));
  const importDialog = async () => { await p.click('#tab-transactions'); await p.locator('[data-action="import"]').first().click(); await p.waitForSelector('#imp-file', { state: 'attached' }); };
  await importDialog();
  await p.setInputFiles('#imp-file', require('path').join(__dirname, 'fixtures', 'dimension.xlsx'));
  await p.waitForSelector('#imp-r-0', { timeout: 10000 });
  assert.ok(/CAFE/.test(await p.inputValue('#imp-d-0')));
  await p.keyboard.press('Escape'); await p.locator('[data-action="imp-discard"]').click().catch(() => {});
  await p.waitForSelector('#overlay .modal', { state: 'detached' }).catch(() => {});
  const lines = ['Fecha;Importe;Concepto', ...Array.from({ length: 450 }, (_, i) => `0${1 + i % 9}/03/2025;-${i + 1},00;Shop ${i}`)].join(String.fromCharCode(10));
  await importDialog();
  await p.setInputFiles('#imp-file', { name: 'long.csv', mimeType: 'text/csv', buffer: Buffer.from(lines) });
  await p.waitForSelector('#imp-r-199');
  assert.ok(!(await p.$('#imp-r-200')), 'more than 200 rows drawn');
  await p.click('[data-action="imp-more"]'); await p.waitForSelector('#imp-r-399');
  assert.ok(/450/.test(await p.innerText('[data-action="imp-add"]')), 'all rows still added');
  await p.keyboard.press('Escape'); await p.locator('[data-action="imp-discard"]').click().catch(() => {});
  await p.waitForSelector('#overlay .modal', { state: 'detached' }).catch(() => {});
  await importDialog();
  await p.setInputFiles('#imp-file', { name: 'huge.csv', mimeType: 'text/csv', buffer: Buffer.alloc(21e6, 'a') });
  await p.waitForFunction(() => /20 MB/.test(document.querySelector('#overlay').innerText), null, { timeout: 5000 });
  assert.deepStrictEqual(errs, []);
  console.log('5. imports: inflated sheet range, 200 rows at a time, 20 MB limit');

  await browser.close();
  console.log('bad-data e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
