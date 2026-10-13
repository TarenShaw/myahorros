/* python -m http.server 8000; NODE_PATH=<playwright folder> node tests/statement-files.e2e.js */
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



    await p.evaluate(() => { window.__ybt.S.nw = { accounts: [{ id: 'bank', name: 'MyInvestor', group: 'cash' }, { id: 'other', name: 'Savings account', group: 'cash' }], snaps: {}, goal: null }; });
    await p.click('#tab-transactions');
    const open = async () => { await p.click('#view [data-action=import]'); await p.waitForSelector('#imp-text'); };
    const csv = name => ({ name, mimeType: 'text/csv', buffer: Buffer.from(`Date,Amount,Description
2026-09-30,-12,Shop`) });
    const save = async () => { await p.click('[data-action=imp-add]'); if (await p.locator('[data-action=imp-add-confirm]').count()) await p.click('[data-action=imp-add-confirm]'); };
    await open();
    assert.ok(await p.locator('#imp-file').getAttribute('multiple') !== null, 'file chooser supports multiple statements');
    await p.selectOption('#imp-acct', 'bank');
    const XLSX = require('../vendor/xlsx.full.min.js'), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Date', 'Amount', 'Description'], ['2026-09-30', -12, 'Shop']]), 'Statement');
    await p.setInputFiles('#imp-file', [csv('bank.csv'), { name: 'savings.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })) }]);
    assert.strictEqual(await p.locator('.ai-files li').count(), 2);
    assert.strictEqual(await p.inputValue('#imp-acct-0'), 'bank', 'files inherit wizard/default account');
    await p.selectOption('#imp-acct-1', 'other');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/statement-multiple-files.png` });
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('table.imp');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.modal.fileName), 'bank.csv');
    assert.strictEqual(await p.inputValue('#imp-account-0'), 'bank');
    await save();
    await p.waitForFunction(() => window.__ybt.S.modal?.fileName === 'savings.xlsx' && window.__ybt.S.modal?.step === 'preview');
    assert.strictEqual(await p.inputValue('#imp-account-0'), 'other');
    assert.ok(await p.isChecked('#imp-on-0'), 'matching rows from different accounts are not excluded');
    await p.locator('.imp-account-change summary').click();
    await p.selectOption('#imp-acct', 'bank');
    await p.click('[data-action=imp-back]');
    assert.strictEqual(await p.inputValue('#imp-acct-0'), 'bank', 'review account corrections survive Back');
    await p.selectOption('#imp-acct-0', 'other');
    assert.strictEqual(await p.locator('.ai-files li').count(), 1, 'back keeps only unfinished files');
    assert.strictEqual(await p.inputValue('#imp-acct-0'), 'other', 'back preserves unfinished account');
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('table.imp');
    await save();
    const rows = await p.evaluate(() => window.__ybt.allRows().filter(r => r.source === 'bank.csv' || r.source === 'savings.xlsx').map(r => [r.source, r.account]));
    assert.deepStrictEqual(rows.sort(), [['bank.csv', 'bank'], ['savings.xlsx', 'other']]);
    await p.waitForSelector('#overlay .modal', { state: 'detached' });
    await open();
    await p.setInputFiles('#imp-file', [csv('cancel-one.csv'), csv('cancel-two.csv')]);
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('table.imp');
    await p.click('button[data-action=close]');
    await p.click('[data-action=imp-discard]');
    await p.waitForSelector('#overlay .modal', { state: 'detached' });
    assert.strictEqual(await p.evaluate(() => window.__ybt.allRows().filter(r => /cancel-/.test(r.source)).length), 0, 'cancel imports neither current nor queued files');
    await open();
    await p.setInputFiles('#imp-file', [{ name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('not a statement') }, csv('after-error.csv')]);
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('.imp-src .err');
    await p.click('[data-action=imp-file-del]');
    assert.strictEqual(await p.locator('.ai-files li').count(), 1, 'removing failed file preserves pending file');
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('table.imp');
    assert.strictEqual(await p.evaluate(() => window.__ybt.S.modal.fileName), 'after-error.csv');
    await p.click('[data-action=imp-back]');
    await p.selectOption('#imp-acct-0', 'other');
    await p.setInputFiles('#imp-file', { name: 'picture.png', mimeType: 'image/png', buffer: Buffer.from('mock image') });
    await p.selectOption('#imp-acct-1', 'bank');
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('#ai-file');
    assert.strictEqual(await p.locator('.ai-files li').count(), 2, 'mixed local/image batch opens AI with every file');
    assert.strictEqual(await p.inputValue('#ai-acct-0'), 'other');
    assert.strictEqual(await p.inputValue('#ai-acct-1'), 'bank');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { window.__ybt.S.ui.langLocal = 'es'; window.__ybt.render(); });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click('[data-action=page-actions]');
    await open();
    await p.evaluate(() => {
      const dt = new DataTransfer();
      for (const name of ['drop-one.csv', 'drop-two.csv']) dt.items.add(new File(['Date,Amount,Description'], name, { type: 'text/csv' }));
      document.querySelector('#imp-drop').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });
    assert.strictEqual(await p.locator('.ai-files li').count(), 2, 'drag and drop keeps all files');
    await p.selectOption('#imp-acct-0', 'bank');
    await p.selectOption('#imp-acct-1', 'other');
    assert.ok((await p.innerText('.imp-src')).includes('Elige una cuenta para cada archivo'));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Spanish mobile has no page overflow');
    assert.deepStrictEqual(errors, []);
    console.log('Statement files: CSV/XLSX queue, individual accounts, back, cancellation, failed-file recovery, mixed AI handoff, drag/drop, Spanish/mobile passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
