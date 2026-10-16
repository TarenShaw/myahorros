/* Setup, refunds, live review filters, period selection and forecast readiness. */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const SHOTS = process.env.SHOTS;
const row = (id, date, amount, category = '', concept = id) => ({ id, date, amount, category, concept });
function dataset(lang, count = 1, incomplete = false) {
  const months = {}, snaps = {};
  for (let m = 9 - count; m < 9; m++) {
    const k = `2026-${String(m + 1).padStart(2, '0')}`;
    months[k] = { income: [row('pay' + m, k + '-01', 2000, 'Salary')], expenses: [row('shop' + m, k + '-03', -100, 'Groceries')], investments: [] };
    snaps[k] = { bank: 1000 + m * 100, fund: 2000 + m * 200 };
  }
  months['2026-09'].income.push(row('inc-review', '2026-09-15', 50));
  months['2026-09'].expenses.push(row('exp-review', '2026-09-16', -20));
  months['2026-09'].investments.push(row('inv-review', '2026-09-17', -200));
  if (incomplete) delete snaps['2026-08'].fund;
  return { months, config: {
    categories: { income: [{ name: 'Salary' }], expenses: [{ name: 'Groceries', type: 'Need' }], investments: [{ name: 'Funds' }] },
    settings: { lang, currency: 'EUR', numFmt: 'en', fixedVar: 1, start: { y: 2026, m: 0 }, guide: { on: false } },
    networth: { accounts: [{ id: 'bank', name: 'Bank', group: 'cash' }, { id: 'fund', name: 'Index funds', group: 'invest' }], snaps }
  } };
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const [lang, width, colorScheme] of [['en', 1280, 'dark'], ['es', 390, 'light']]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, serviceWorkers: 'block' });
      await context.addInitScript(lang => { window.__ybtTest = true; localStorage.setItem('ybt.lang', lang); }, lang);
      await context.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
      await page.goto(START);
      await page.click('.wl-hero [data-x=start]');
      await page.click('.web-way[data-m=browser]');
      await page.click('[data-action=ob-history]');
      await page.click('[data-action=guide-acc]');
      const cash = lang === 'en' ? 'Cash account' : 'Cuenta de efectivo';
      const broker = lang === 'en' ? 'Brokerage account' : 'Cuenta de bróker';
      for (const name of [cash, cash, broker, broker, 'Robo-advisor']) await page.locator(`[data-action=na-add][data-n="${name}"]`).click();
      assert.deepStrictEqual(await page.locator('#nw-acc-form input[data-f=name]').evaluateAll(es => es.map(e => e.value)), [cash + ' 1', cash + ' 2', broker + ' 1', broker + ' 2', 'Robo-advisor 1']);
      assert.strictEqual(await page.locator('[data-action=na-add][data-n="Robo-advisor"]').count(), 1, 'template remains after adding');
      assert.strictEqual(await page.locator('#na-w-0, [data-action=na-adv]').count(), 0, 'setup omits advanced matching rules');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/accounts-${lang}-${width}.png` });
      await page.click('#nw-acc-form button[type=submit]');
      await page.waitForSelector('[data-action=guide-import][data-acc]');
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.wizard.step), 1, 'save advances to statements');
      const account = await page.locator('[data-action=guide-import][data-acc]').first().getAttribute('data-acc');
      await page.locator('[data-action=guide-import][data-acc]').first().click();
      assert.strictEqual(await page.locator('#imp-acct').count(), 0, 'does not ask which account again');
      await page.setInputFiles('#imp-file', { name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Amount,Description\n11/09/2026,-1800,Alquiler casa\n07/10/2026,650,Pago alquiler Carlos\n13/09/2026,-48,Shop') });
      assert.strictEqual(await page.locator('[data-action=imp-file-account]').count(), 0, 'file inherits the chosen account');
      await page.click('[data-action=imp-read]');
      await page.waitForSelector('#imp-a-0');
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.modal.acct), account);
      assert.match(await page.locator('.imp-date-range').innerText(), lang === 'en' ? /11 September 2026.*7 October 2026/ : /11 septiembre 2026.*7 octubre 2026/);
      assert.strictEqual(await page.locator('#imp-period-confirm').count(), 0, 'no unexplained coverage checkbox');
      assert.strictEqual(await page.locator('#imp-period-from').isVisible(), false, 'reminder settings stay optional');
      await page.locator('.imp-coverage summary').click();
      await page.click('[data-action=imp-confirm-coverage]');
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.modal.coverConfirmed), true);
      await page.locator('.imp-coverage summary').click();
      await page.locator('#imp-period-from').evaluate(el => { el.value = '2026-09-01'; el.dispatchEvent(new Event('change', { bubbles: true })); });
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.modal.coverConfirmed), false, 'changing reminder dates requires a new confirmation');
      assert.strictEqual(await page.locator('[data-action=imp-confirm-coverage]').innerText(), lang === 'en' ? 'Confirm these statement dates' : 'Confirmar estas fechas del extracto');
      await page.click('[data-action=imp-confirm-coverage]');
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.modal.rows[0].date), '2026-09-11', 'reminder dates never change transaction dates');
      assert.ok(await page.locator('#imp-a-0').evaluate(e => getComputedStyle(e).borderTopColor !== 'rgba(0, 0, 0, 0)'), 'amount looks editable');
      for (let i = 0; i < 3; i++) {
        await page.selectOption('#imp-c-' + i, { index: 1 });
      }
      await page.selectOption('#imp-t-1', 'expenses');
      await page.selectOption('#imp-c-1', { index: 1 });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-${lang}-${width}.png` });
      await page.click('[data-action=imp-add]');
      await page.waitForSelector('[data-action=imp-add-confirm]');
      await page.fill('#imp-a-1', '600');
      await page.press('#imp-a-1', 'Enter');
      assert.strictEqual(await page.evaluate(() => window.__ybt.S.modal.rows[1].table), 'expenses', 'editing a refund preserves its type');
      await page.click('[data-action=imp-add-confirm]');
      await page.waitForSelector('.wz-setup');
      assert.strictEqual(await page.evaluate(() => window.__ybt.allRows().find(r => r.concept === 'Pago alquiler Carlos').amount), 600, 'edited refund is imported');
      assert.strictEqual(await page.evaluate(() => window.__ybt.agg(2026).Y.exp), -1248, 'refund reduces total spending');
      await page.keyboard.press('Escape');

      // A new fixture checks counts and filters across transaction types.
      const load = async data => page.evaluate(data => {
        const { S, loadDataset, render } = window.__ybt;
        S.wizard = null; S.wizardShown = true; S.ui.tab = 'overview';
        S.ui.overviewMonth = 'all'; S.ui.analysis = { overview: true, networth: true };
        loadDataset(data, false); render();
      }, data);
      await load(dataset(lang));
      assert.strictEqual(await page.locator('#tab-transactions .badge').innerText(), '3');
      await page.click('[data-action=goto-uncat]');
      assert.strictEqual(await page.locator('table.tx tr[data-action=edit-tx]').count(), 3, 'one live review contains all types');
      await page.selectOption('#cs-inc-review', 'Salary');
      assert.strictEqual(await page.locator('#tab-transactions .badge').innerText(), '2');
      await page.selectOption('#cs-exp-review', 'Groceries');
      assert.strictEqual(await page.locator('#tab-transactions .badge').innerText(), '1');
      await page.selectOption('#cs-inv-review', 'Funds');
      assert.strictEqual(await page.locator('table.tx tr[data-action=edit-tx]').count(), 0);
      assert.strictEqual(await page.locator('#tab-transactions .badge, #view>.notice').count(), 0, 'last fix clears both advisories');
      await page.click('#tab-overview');
      assert.strictEqual(await page.locator('[data-action=goto-uncat]').count(), 0);
      await page.selectOption('#summary-month', '8');
      assert.match(await page.locator('.hero-num').innerText(), /1,930/, 'selected month summary');
      await page.selectOption('#summary-month', '7');
      assert.match(await page.locator('.hero-num').innerText(), /0\.00/, 'empty month does not show annual totals');
      await page.selectOption('#summary-month', 'all');
      assert.strictEqual(await page.locator('#ch-monthly path.fc').count(), 0, 'one month cannot produce a forecast');
      await page.click('#tab-networth');
      assert.strictEqual(await page.locator('#ch-nw g.nw-fc').count(), 0);
      assert.match(await page.locator('.forecast-wait').innerText(), /3/);
      await page.selectOption('#summary-month', '6');
      assert.strictEqual(await page.locator('.hero-num').count(), 0, 'missing month does not fall back to the latest figures');
      assert.match(await page.locator('#view').innerText(), lang === 'en' ? /No balances recorded/ : /No hay saldos registrados/);
      await load(dataset(lang, 3));
      assert.ok(await page.locator('#ch-monthly path.fc').count() > 0, 'three completed months unlock flow forecasts');
      await page.click('#tab-networth');
      assert.ok(await page.locator('#ch-nw g.nw-fc').count() > 0, 'three complete balances unlock net worth forecast');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/periods-${lang}-${width}.png` });
      await load(dataset(lang, 3, true));
      await page.click('#tab-networth');
      assert.strictEqual(await page.locator('#ch-nw g.nw-fc').count(), 0, 'partial balances do not count toward the minimum');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page fits viewport');
      assert.deepStrictEqual(errors, []);
      console.log(`${lang}/${width}: repeatable accounts, inherited import account, file dates, editable refunds, live alerts, periods and forecast threshold passed`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
