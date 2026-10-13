/* python -m http.server 8000; NODE_PATH=<playwright folder> node tests/ai-account.e2e.js */
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
      const { S } = window.__ybt;
      S.nw = { accounts: [{ id: 'bank', name: 'MyInvestor', group: 'cash' }, { id: 'other', name: 'Savings account', group: 'cash' }], snaps: {}, goal: null };
      S.ai.limits = async () => ({ images: null });
      S.ai.json = async prompt => {
        window.__aiPrompt = prompt;
        await new Promise(resolve => { window.__resolveAi = resolve; });
        return { rows: [['2026-09-30', -12, 'Shop one', 'expenses', '', 'one.csv', '', 0], ['2026-09-29', -8, 'Shop two', 'expenses', '', 'two.csv', '', 0]], accounts: [], statements: [], left_out: [], notes: '' };
      };
    });
    await p.click('#tab-transactions');
    await p.click('[data-action=ai-tx]');
    assert.strictEqual(await p.locator('#ai-acct').count(), 0, 'no global AI account choice');
    await p.setInputFiles('#ai-file', [
      { name: 'one.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description') },
      { name: 'two.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description') }
    ]);
    await p.locator('.ai-rules summary').click();
    await p.fill('#ai-rules', 'Custom accounting rule');
    await p.selectOption('#ai-acct-0', 'bank');
    await p.selectOption('#ai-acct-1', 'other');
    assert.strictEqual(await p.inputValue('#ai-rules'), 'Custom accounting rule', 'account choice preserves rules');
    assert.strictEqual(await p.locator('.ai-files li').count(), 2, 'account choice preserves files');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/ai-statement-account.png` });
    await p.click('[data-action=ai-send]');
    await p.waitForFunction(() => !!window.__resolveAi);
    assert.ok(await p.locator('#ai-acct-0').isDisabled(), 'account cannot change while reading');
    assert.ok(await p.evaluate(() => window.__aiPrompt.includes('"one.csv":{"id":"bank"') && window.__aiPrompt.includes('"two.csv":{"id":"other"')), 'chosen account reaches actual request');
    await p.evaluate(() => window.__resolveAi());
    await p.waitForSelector('#imp-source-0');
    assert.strictEqual(await p.inputValue('#imp-source-0'), 'bank');
    assert.strictEqual(await p.inputValue('#imp-source-1'), 'other', 'each file inherits its own account');
    await p.click('[data-action=imp-back]');
    assert.strictEqual(await p.inputValue('#ai-acct-0'), 'bank', 'back preserves first account');
    assert.strictEqual(await p.locator('.ai-files li').count(), 2);
    assert.strictEqual(await p.inputValue('#ai-acct-1'), 'other', 'back preserves second account');
    await p.selectOption('#ai-acct-0', 'other');
    await p.selectOption('#ai-acct-1', 'bank');
    await p.evaluate(() => { window.__resolveAi = null; });
    await p.click('[data-action=ai-send]');
    await p.waitForFunction(() => !!window.__resolveAi);
    assert.ok(await p.evaluate(() => window.__aiPrompt.includes('"one.csv":{"id":"other"') && window.__aiPrompt.includes('"two.csv":{"id":"bank"')), 'changed account reaches next request');
    await p.evaluate(() => window.__resolveAi());
    await p.waitForSelector('#imp-source-0');
    await p.click('[data-action=imp-add]');
    if (await p.locator('[data-action=imp-add-confirm]').count()) await p.click('[data-action=imp-add-confirm]');
    assert.deepStrictEqual(await p.evaluate(() => window.__ybt.allRows().filter(r => r.source === 'one.csv' || r.source === 'two.csv').map(r => r.account)), ['other', 'bank'], 'multiple AI files save their own accounts');
    await p.evaluate(() => { window.__ybt.S.ui.langLocal = 'es'; window.__ybt.render(); });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click('[data-action=page-actions]');
    await p.click('[data-action=ai-tx]');
    assert.ok((await p.innerText('.ai-body')).includes('Elige la cuenta junto a cada archivo'));
    await p.setInputFiles('#ai-file', [
      { name: 'mobile-one.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description') },
      { name: 'mobile-two.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description') }
    ]);
    await p.selectOption('#ai-acct-0', 'bank');
    await p.selectOption('#ai-acct-1', 'other');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Spanish mobile has no page overflow');
    assert.deepStrictEqual(errors, []);
    console.log('AI per-file statement accounts: pickers, request context, rules/files, busy lock, back, multiple file persistence, Spanish/mobile passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
