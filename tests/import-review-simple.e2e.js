/* python -m http.server 8000; NODE_PATH=<playwright folder> node tests/import-review-simple.e2e.js */
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

    await p.evaluate(() => {
      window.__ybt.S.nw = { accounts: [{ id: 'bank', name: 'MyInvestor', group: 'cash' }, { id: 'other', name: 'Other bank', group: 'cash' }], snaps: {}, goal: null };
    });
    await p.click('[data-action="import-menu"]');
    await p.click('[data-action="guide-import"]');
    assert.ok(await p.locator('#imp-acct').isVisible(), 'account choice beside upload');
    await p.fill('#imp-text', 'Unfinished pasted statement');
    await p.locator('.imp-src details').filter({ has: p.locator('#imp-table') }).locator('summary').click();
    await p.selectOption('#imp-table', 'expenses');
    await p.selectOption('#imp-acct', 'bank');
    assert.strictEqual(await p.inputValue('#imp-text'), 'Unfinished pasted statement', 'choosing account preserves text');
    assert.strictEqual(await p.inputValue('#imp-table'), 'expenses', 'choosing account preserves import type');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/statement-upload-account.png` });
    await p.setInputFiles('#imp-file', { name: 'MyInvestor.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description\n2026-09-30,-60,Amazon.es') });
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('table.imp');
    assert.strictEqual(await p.inputValue('#imp-account-0'), 'bank', 'uploaded file inherits account chosen before upload');
    assert.strictEqual(await p.locator('#imp-acct').isVisible(), false, 'review collapses account choice');
    assert.ok((await p.innerText('.imp-account-change summary')).includes('MyInvestor'));
    await p.locator('.imp-account-change summary').click();
    await p.selectOption('#imp-acct', 'other');
    assert.strictEqual(await p.inputValue('#imp-account-0'), 'other', 'review account can be corrected');
    await p.locator('.imp-account-change summary').click();
    await p.selectOption('#imp-acct', 'bank');
    await p.evaluate(() => {
      window.__ybt.finishImport([
        { date: '2026-09-30', amount: -60, concept: 'Amazon.es', table: 'expenses' },
        { date: '2026-09-29', amount: -10, concept: 'Amazon excluded', table: 'expenses' },
        { date: '2026-09-28', amount: -34, concept: 'Fuel', table: 'expenses', account: 'other' }
      ], [], 'MyInvestor.csv');
    });
    assert.strictEqual(await p.locator('table.imp td.on input').count(), 3, 'one import checkbox per row');
    assert.strictEqual(await p.textContent('table.imp th:first-child'), 'Import');
    assert.strictEqual(await p.locator('[data-action="imp-select"]').count(), 0);
    assert.strictEqual(await p.locator('[data-action="imp-bulk-apply"]').isVisible(), false, 'bulk tools collapsed');
    assert.strictEqual(await p.inputValue('#imp-account-0'), 'bank', 'row inherits statement account');
    assert.strictEqual(await p.inputValue('#imp-account-2'), 'other', 'explicit row account preserved');
    await p.uncheck('#imp-on-1');
    await p.fill('#imp-search', 'Amazon');
    await p.locator('summary').filter({ hasText: 'Edit several rows' }).click();
    const category = await p.locator('#imp-bulk-category option').evaluateAll(os => os.find(o => o.value.startsWith('expenses|')).value);
    await p.selectOption('#imp-bulk-category', category);
    await p.click('[data-action="imp-bulk-apply"]');
    const rows = await p.evaluate(() => window.__ybt.S.modal.rows);
    assert.strictEqual(rows[0].category, category.split('|')[1], 'checked filtered row changed');
    assert.strictEqual(rows[1].manual, false, 'excluded row unchanged');
    assert.strictEqual(rows[2].manual, false, 'filtered-out row unchanged');
    await p.fill('#imp-search', '');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/import-review-simple.png` });
    await p.click('[data-action="imp-add"]');
    if (await p.locator('[data-action="imp-add-confirm"]').count()) await p.click('[data-action="imp-add-confirm"]');
    const saved = await p.evaluate(() => window.__ybt.allRows().filter(r => r.source === 'MyInvestor.csv').map(r => [r.concept, r.account]));
    assert.deepStrictEqual(saved.sort(), [['Amazon.es', 'bank'], ['Fuel', 'other']], 'account applied once, overrides preserved, unchecked omitted');
    await p.evaluate(() => { window.__ybt.S.ui.langLocal = 'es'; window.__ybt.render(); });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click('#tab-overview');
    await p.click('[data-action="import-menu"]');
    await p.click('[data-action="guide-import"]');
    await p.fill('#imp-text', '2026-09-30\t-5\tCafe');
    await p.click('[data-action="imp-read"]');
    assert.strictEqual(await p.textContent('table.imp th:first-child'), 'Importar');
    assert.ok((await p.innerText('#overlay')).includes('Cuenta del extracto (para todas las filas)'));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow on mobile');
    const wizardContext = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
    await wizardContext.addInitScript(() => { window.__ybtTest = true; localStorage.setItem('ybt.lang', 'en'); });
    await wizardContext.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    const wp = await wizardContext.newPage();
    wp.on('pageerror', e => errors.push(String(e)));
    await wp.goto(START);
    await wp.click('.wl-hero [data-x=start]');
    await wp.click('[data-m=browser]');
    await wp.click('[data-action=ob-start]');
    await wp.click('[data-action=guide-acc]');
    for (const name of ['Cash account', 'Savings account']) await wp.getByRole('button', { name, exact: true }).click();
    await wp.locator('#nw-acc-form button[type=submit]').click();
    const wizardAccount = await wp.locator('.wz-list [data-action=guide-import][data-acc]').first().getAttribute('data-acc');
    await wp.locator('.wz-list [data-action=guide-import][data-acc]').first().click();
    assert.strictEqual(await wp.locator('#imp-acct').count(), 0, 'wizard retains its chosen account');
    await wp.setInputFiles('#imp-file', { name: 'wizard-savings.csv', mimeType: 'text/csv', buffer: Buffer.from(`Date,Amount,Description
2026-09-30,5,Interest`) });
    await wp.setInputFiles('#imp-file', { name: 'wizard-bank.csv', mimeType: 'text/csv', buffer: Buffer.from(`Date,Amount,Description
2026-09-29,7,Interest`) });
    assert.strictEqual(await wp.locator('[data-action=imp-file-account]').count(), 0, 'both files inherit the wizard account');
    await wp.click('[data-action=imp-read]');
    await wp.waitForSelector('table.imp');
    assert.strictEqual(await wp.inputValue('#imp-account-0'), wizardAccount, 'wizard upload inherits its account');
    assert.strictEqual(await wp.locator('table.imp td.on input').count(), 1, 'wizard review has one checkbox');
    await wp.click('[data-action=imp-add]');
    if (await wp.locator('[data-action=imp-add-confirm]').count()) await wp.click('[data-action=imp-add-confirm]');
    await wp.waitForFunction(() => window.__ybt.S.modal?.fileName === 'wizard-bank.csv' && window.__ybt.S.modal.step === 'preview');
    assert.strictEqual(await wp.inputValue('#imp-account-0'), wizardAccount, 'next wizard file uses its own account');
    await wp.click('[data-action=imp-add]');
    if (await wp.locator('[data-action=imp-add-confirm]').count()) await wp.click('[data-action=imp-add-confirm]');
    await wp.waitForSelector('.wz-body');
    assert.strictEqual(await wp.evaluate(() => window.__ybt.allRows().find(r => r.source === 'wizard-savings.csv').account), wizardAccount, 'wizard saves account and returns to setup');
    await wizardContext.close();
    assert.deepStrictEqual(errors, []);
    console.log('Import review: single checkbox, inherited accounts, overrides, filtered bulk edits, exclusions, persistence, Spanish/mobile, setup wizard upload passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
