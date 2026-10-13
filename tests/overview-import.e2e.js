/* python -m http.server 8000; NODE_PATH=<playwright folder> node tests/overview-import.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const TRACKER = { app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': {
  income: [{ id: 'a1', date: '2026-09-01', desc: 'Salary', amount: 2000, cat: 'Salary' }], expenses: [], investments: []
} }, config: { settings: { lang: 'en' } } };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { window.__ybtTest = true; localStorage.setItem('ybt.lang', 'en'); });
    await context.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(String(e)));
    await p.goto(START);
    await p.evaluate(async data => {
      localStorage.setItem('ybt.storage', 'browser');
      await window.__ybtWeb.idb.set('data', JSON.stringify(data));
    }, TRACKER);
    await p.reload();
    await p.waitForFunction(() => window.__ybt && window.__ybt.S.gotConfig);
    for (let i = 0; i < 3; i++) await p.keyboard.press('Escape');
    const overview = async () => { await p.click('#tab-overview'); await p.waitForSelector('[data-action="import-menu"]'); };
    const menu = async () => { await overview(); await p.click('[data-action="import-menu"]'); await p.waitForSelector('#overlay [data-action="import-balances"]'); };
    await overview();
    assert.strictEqual(await p.innerText('[data-action="import-menu"]'), 'Import new data');
    const size = await p.locator('[data-action="import-menu"]').boundingBox();
    assert.ok(size.height >= 44, 'prominent, touch-friendly button');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/overview.png` });
    await menu();
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/import-menu.png` });
    for (let i = 0; i < 8; i++) await p.keyboard.press('Tab');
    assert.ok(await p.evaluate(() => document.querySelector('#overlay').contains(document.activeElement)), 'focus stays in menu');
    await p.keyboard.press('Escape');
    assert.strictEqual(await p.evaluate(() => document.activeElement.dataset.action), 'import-menu', 'focus returns to button');
    await menu();
    await p.click('#overlay [data-action="guide-import"]');
    await p.waitForSelector('#imp-text');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.ui.tab), 'transactions');
    await p.keyboard.press('Escape');
    await menu();
    await p.click('#overlay [data-action="import-balances"]');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.modal.type), 'nwacc', 'no accounts: start by adding accounts');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { window.__ybt.S.nw = { accounts: [{ id: 'cash', name: 'Bank', group: 'cash' }], snaps: {}, goal: null }; });
    await menu();
    await p.click('#overlay [data-action="import-balances"]');
    await p.waitForSelector('#nw-snap-form');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.ui.tab), 'networth');
    const previousMonth = await p.evaluate(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
    assert.strictEqual(await p.inputValue('#nw-k'), previousMonth, 'default is last completed month');
    await p.keyboard.press('Escape');
    await menu();
    await p.click('#overlay [data-action="guide-nwimport"]');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.modal.type), 'nwimp');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { window.__ybt.S.ui.langLocal = 'es'; window.__ybt.render(); });
    await p.setViewportSize({ width: 390, height: 844 });
    await menu();
    assert.strictEqual(await p.innerText('#m-title'), 'Importar nuevos datos');
    assert.ok((await p.innerText('#overlay')).includes('Saldos de cuentas a final de mes'));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no mobile horizontal overflow');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/import-mobile-es.png` });
    await p.keyboard.press('Escape');
    await p.evaluate(() => { window.__ybt.S.canWrite = false; window.__ybt.render(); });
    assert.strictEqual(await p.locator('[data-action="import-menu"]').count(), 0, 'read-only trackers have no import button');
    assert.deepStrictEqual(errors, []);
    console.log('Overview import: statements, balances, account setup, Excel, focus, Spanish/mobile, read-only passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
