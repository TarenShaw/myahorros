/* Browser check for the 2026-10-11 QA fixes: typed amounts follow the number format, Back moves between tabs,
   0 / odd dates / no description in the add dialog, one Yearly sheet per year in the export, Indicators don't overlap in Spanish,
   and a place to save picked by the person isn't asked again after a refresh.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/qa-fixes.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const START = process.env.START_URL || 'http://localhost:8000/';
const XLSX = require(path.join(__dirname, '..', 'vendor', 'xlsx.full.min.js'));
const row = (ym, d, a, c, cat) => ({ id: ym + d + c, date: ym + '-' + d, concept: c, amount: a, category: cat });
const TRACKER = lang => JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: {
  '2025-11': { income: [row('2025-11', '28', 2000, 'ACME PAYROLL', 'Salary')], expenses: [row('2025-11', '03', -900, 'RENT FLAT', 'Rent')], investments: [] },
  '2026-09': { income: [row('2026-09', '28', 2000, 'ACME PAYROLL', 'Salary')], expenses: [row('2026-09', '03', -900, 'RENT FLAT', 'Rent'), row('2026-09', '05', -400, 'SHOP', 'Groceries')], investments: [row('2026-09', '06', -100, 'FUND', 'Funds/ETFs')] } },
  config: { settings: { lang, numFmt: 'eu', currency: 'EUR', start: { y: 2025, m: 10 } } } });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} window.showSaveFilePicker = undefined; });
  await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
  const open = async lang => { const p = await ctx.newPage(); p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
    await p.goto(START, { waitUntil: 'load' });
    await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, TRACKER(lang));
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__ybtWeb && window.__ybtWeb.store && document.querySelector('#tab-overview'));
    await p.waitForTimeout(300); return p; };
  const p = await open('en');
  /* saving reaches the store a moment later: wait up to 3 s for the row */
  const find = c => p.waitForFunction(c => { for (const m of Object.values(window.__ybtWeb.store.months)) for (const t of ['income', 'expenses', 'investments']) for (const r of m[t]) if (r.concept === c) return { a: r.amount }; return null; }, c, { timeout: 3000 }).then(h => h.jsonValue()).then(v => v.a).catch(() => null);
  const add = async (concept, amount, date = '2026-09-20') => {
    await p.click('#tab-transactions'); await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form');
    await p.selectOption('#f-table', 'expenses'); await p.fill('#f-date', date); await p.fill('#f-concept', concept); await p.fill('#f-amount', amount);
    await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(200);
    return p.evaluate(() => { const e = document.querySelector('#f-err'); return document.querySelector('#tx-form') && e && !e.hidden ? e.innerText : null; });
  };
  const submit = async () => { await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(200); };

  /* 1. "12,500" typed with 1.234,56 chosen is 12,50, not twelve thousand: the field says so as you type, the first
     press asks once, the second keeps 12,50 (audit 2026-10-12) */
  const asked = await add('QA comma', '12,500');
  assert.ok(/12,50 €.*12\.500,00 €/.test(asked), 'ambiguous amount should ask once: ' + asked);
  assert.ok(/12,50 €/.test(await p.innerText('.amt-read')), 'the amount field shows what it was read as');
  await submit();
  assert.strictEqual(await find('QA comma'), -12.5);
  console.log('1. 12,500 typed in 1.234,56 format is 12,50, after one question');

  /* 2. 0 is refused; a future date, a very old date and a missing description warn once, a second press keeps them */
  assert.ok(/other than 0/.test(await add('QA zero', '0')));
  await p.keyboard.press('Escape');
  assert.ok(/future/.test(await add('QA future', '5', '2028-02-29')));
  await submit(); assert.strictEqual(await find('QA future'), -5);
  assert.ok(/long time ago/.test(await add('QA old', '5', '1901-01-01')));
  await submit(); assert.strictEqual(await find('QA old'), -5);
  assert.ok(/no description/.test(await add('', '7')));
  await submit(); assert.ok(!(await p.$('#tx-form')));
  console.log('2. 0 refused; future, old date and no description warn once');

  /* 3. Back and Forward move between tabs and stay on the site */
  await p.click('#tab-overview'); await p.click('#tab-yearly'); await p.click('#tab-settings');
  const tab = () => p.evaluate(() => ({ url: location.href, tab: (document.querySelector('.tabs [aria-selected=true]') || {}).id }));
  await p.goBack(); await p.waitForTimeout(250); assert.deepStrictEqual((await tab()).tab, 'tab-yearly');
  await p.goBack(); await p.waitForTimeout(250); assert.deepStrictEqual((await tab()).tab, 'tab-overview');
  await p.goForward(); await p.waitForTimeout(250); assert.deepStrictEqual((await tab()).tab, 'tab-yearly');
  assert.ok((await tab()).url.startsWith(START));
  /* an open dialog closes on Back instead of the tab changing behind it */
  await p.click('#tab-transactions'); await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form');
  await p.goBack(); await p.waitForTimeout(250);
  assert.ok(!(await p.$('#tx-form'))); assert.strictEqual((await tab()).tab, 'tab-yearly');
  console.log('3. Back/Forward move between tabs; Back closes an open dialog');

  /* 4. the export has a Yearly sheet for every year with transactions */
  await p.click('#tab-settings');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#view [data-action="export"]')]);
  const names = XLSX.read(require('fs').readFileSync(await dl.path())).SheetNames.filter(n => /^YEARLY/.test(n));
  assert.deepStrictEqual(names, ['YEARLY TRACKING 2028', 'YEARLY TRACKING 2026', 'YEARLY TRACKING 2025', 'YEARLY TRACKING 1901']);
  console.log('4. export: one Yearly sheet per year');
  await p.close();

  /* 5. Spanish Indicators at 1440 px: the status pill doesn't cover the target button */
  const es = await open('es');
  await es.click('#tab-overview'); await es.click('[data-action=analysis-toggle]'); await es.waitForSelector('.ind .ind-target');
  const overlap = await es.evaluate(() => [...document.querySelectorAll('.ind')].some(r => { const t = r.querySelector('.ind-target'), s = r.querySelector('.pill'); return t && s && t.getBoundingClientRect().right > s.getBoundingClientRect().left; }));
  assert.ok(!overlap, 'pill overlaps the target');
  /* the info buttons are at least 24 px to click (the ::after hit area) */
  const hit = await es.evaluate(() => { const b = document.querySelector('.info-btn'), a = getComputedStyle(b, '::after'); return b.getBoundingClientRect().width - 2 * parseFloat(a.top); });
  assert.ok(hit >= 24, 'info button hit area ' + hit);
  console.log('5. Indicators: no overlap in Spanish; info buttons 24 px+ to click');
  await es.close();

  /* 6. a place picked by the person stays picked after a refresh with nothing added yet */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx2.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await ctx2.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
  const q = await ctx2.newPage();
  await q.goto(START, { waitUntil: 'load' });
  await q.click('.web-landing .wl-hero [data-x=start]');
  await q.click('button.web-way[data-m=browser]');
  await q.waitForSelector('[data-action="ob-start"]');
  await q.reload({ waitUntil: 'load' }); await q.waitForTimeout(1500);
  assert.ok(!(await q.$('button.web-way')), 'asked where to save again');
  console.log('6. picked storage is not asked again after a refresh');

  await browser.close();
  console.log('qa-fixes e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
