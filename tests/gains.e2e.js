/* Browser check of the Gains column on Net worth: accounts, figures and transactions entered through the UI.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/gains.e2e.js
   gain = change since the previous month with figures - money put in (Investments rows that name the account)
   + interest, dividends and gains paid out (income rows in a returns category that name the account). */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
  await p.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await p.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
  const closeExtra = async () => { if (await p.$('#overlay .modal')) await p.keyboard.press('Escape'); };

  /* new tracker in the browser, skip tour, wizard and setup strip */
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=start]');
  await p.click('button.web-way[data-m=browser]');
  await p.click('[data-action="ob-start"]');
  await p.waitForSelector('#tour-card', { timeout: 8000 });
  await p.keyboard.press('Escape');
  await p.waitForSelector('.wz-body', { timeout: 8000 });
  await p.click('[data-action="wz-later"]');
  await p.click('[data-action="guide-hide"]');

  /* 1. accounts: a 3-letter name, two sharing a word, one with no earlier figure */
  await p.click('[data-action="nw-accounts"]');
  for (const [n, g] of [['Current account', 'cash'], ['Indexa Capital', 'invest'], ['Trade Republic', 'invest'], ['ING', 'invest'],
    ['MyInvestor Fund', 'invest'], ['MyInvestor Pension', 'pension'], ['Flat Madrid', 'illiquid'], ['New Broker', 'invest'], ['Civislend', 'invest']]) {
    await p.click('#nw-acc-form [data-action="na-add"]:not([data-n])');
    const last = p.locator('#nw-acc-form .acc-row').last();
    await last.locator('input[data-f=name]').fill(n);
    await last.locator('select[data-f=group]').selectOption(g);
  }
  await p.click('#nw-acc-form button[type=submit]');

  /* 2. figures for June, July and September; August left out on purpose */
  const F = {
    '2026-06': { 'Current account': 3000, 'Indexa Capital': 10000, 'Trade Republic': 5000, 'ING': 2000, 'MyInvestor Fund': 4000, 'MyInvestor Pension': 8000, 'Flat Madrid': 200000, 'Civislend': 1000 },
    '2026-07': { 'Current account': 3400, 'Indexa Capital': 10650, 'Trade Republic': 4750, 'ING': 2310, 'MyInvestor Fund': 4300, 'MyInvestor Pension': 8100, 'Flat Madrid': 200000, 'Civislend': 1000 },
    '2026-09': { 'Current account': 3900, 'Indexa Capital': 11500, 'Trade Republic': 4900, 'ING': 2620, 'MyInvestor Fund': 4750, 'MyInvestor Pension': 8400, 'Flat Madrid': 201000, 'New Broker': 1000, 'Civislend': 0 },
  };
  for (const [k, vals] of Object.entries(F)) {
    await p.click('[data-action="nw-snap"] >> nth=0');
    await p.selectOption('#nw-k', k);
    for (const inp of await p.$$('#nw-snap-form input[data-acc]')) await inp.fill('');
    for (const [n, v] of Object.entries(vals)) await p.locator('#nw-snap-form').getByLabel(n, { exact: true }).fill(String(v));
    await p.click('#nw-snap-form button[type=submit]');
    await p.waitForSelector('#nw-snap-form', { state: 'detached' });
  }
  const gains = async k => {
    await p.click('[data-action=tab][data-tab=networth]');
    await p.selectOption('#nw-month', k);
    return p.evaluate(() => Object.fromEntries([...document.querySelectorAll('table.nwt tbody tr:not(.grp), table.nwt tfoot tr')]
      .map(tr => [tr.children[0].innerText.trim().replace(/,.*/, ''), tr.children[3].innerText.trim().replace(/[^\d.,–−+-]/g, '')])));
  };
  /* no transactions yet: gain = change */
  assert.strictEqual((await gains('2026-09')).ING, '+310.00');
  console.log('1. accounts and figures; no transactions -> gain = change');

  /* 3. transactions through the Add dialog */
  const add = async (t, d, c, a, dir, cat) => {
    await p.click('[data-action=tab][data-tab=transactions]');
    await p.click('[data-action="add-tx"] >> nth=0');
    await p.selectOption('#f-table', t);
    if (cat) await p.selectOption('#f-cat', { label: cat });
    await p.fill('#f-date', d); await p.fill('#f-concept', c); await p.fill('#f-amount', String(a));
    await p.check('#f-dir-' + dir, { force: true });
    await p.click('#tx-form button[type=submit]');
    await p.waitForSelector('#tx-form', { state: 'detached' });
    await closeExtra();
  };
  for (const r of [
    ['investments', '2026-07-05', 'Transfer to Indexa Capital', 500, 'out'],
    ['investments', '2026-07-12', 'Withdrawal Trade Republic', 300, 'in'],        // money back out: added back to the gain
    ['investments', '2026-07-20', 'MyInvestor Fund monthly', 200, 'out'],         // Fund, not Pension
    ['investments', '2026-07-22', 'ING Naranja deposit', 300, 'out'],             // 3-letter name
    ['investments', '2026-07-28', 'Aportación plan MyInvestor Pension', 50, 'out'],
    ['investments', '2026-08-10', 'Buy ETF', 100, 'out'],                         // names no account: counts as a gain
    ['investments', '2026-09-02', 'New Broker initial deposit', 1000, 'out'],     // account had no July figure
    ['investments', '2026-09-05', 'TRANSFER INDEXA CAPITAL', 400, 'out'],
    ['investments', '2026-09-10', 'ING', 250, 'out'],
    ['investments', '2026-08-20', 'MyInvestor Fund', 200, 'out'],                 // August: no figures, counts toward September
    ['investments', '2026-09-20', 'myinvestor fund', 200, 'out'],
    ['investments', '2026-09-25', 'Broker fee refund', 10, 'in'],                 // "refund" is not "Fund"
    ['income', '2026-07-15', 'Dividend Trade Republic', 20, 'in', 'Dividends'],  // paid out to you: part of the gain
    ['income', '2026-07-16', 'Trade Republic cashback', 5, 'in', 'Other'],       // not a returns category: not counted
    ['income', '2026-09-30', 'Interest Indexa Capital', 15, 'in', 'Interest'],
    ['investments', '2026-08-15', 'Civislend loan repaid', 1000, 'in'],          // loan paid back: 1,000 out ...
    ['income', '2026-08-15', 'Civislend interest', 80, 'in', 'Interest'],         // ... plus 80 interest = +80 gain
  ]) await add(...r);

  /* 4. pasted import: everyday rows sorted automatically, plus one investment row with an accent */
  const imp = async (text, table) => {
    await p.click('[data-action="import"] >> nth=0');
    await p.fill('#imp-text', text); await p.selectOption('#imp-table', table);
    await p.click('[data-action="imp-read"]'); await p.click('[data-action="imp-add"]');
    if (await p.$('[data-action="imp-add-confirm"]')) await p.click('[data-action="imp-add-confirm"]');
    await p.waitForTimeout(300); await closeExtra();
  };
  const L = [];
  for (const m of ['06', '07', '08', '09']) L.push(`28/${m}/2026\t2500,00\tNOMINA ACME SL`, `01/${m}/2026\t-900,00\tAlquiler piso`, `03/${m}/2026\t-12,99\tNetflix`,
    `10/${m}/2026\t-64,30\tIberdrola luz`, `14/${m}/2026\t-38,50\tRestaurante La Tasca`, `07/${m}/2026\t-82,15\tMercadona`, `21/${m}/2026\t-54,90\tMercadona`);
  await imp(L.join('\n'), 'auto');
  await imp('05/08/2026\t-400,00\tAportación Indexa', 'investments');

  const expect = async (k, want) => { const g = await gains(k); for (const [n, v] of Object.entries(want)) assert.strictEqual(g[n], v, `${k} ${n}: got ${g[n]}, want ${v}`); };
  const JUL = { 'Indexa Capital': '+150.00', 'Trade Republic': '+70.00', 'ING': '+10.00', 'MyInvestor Fund': '+100.00', 'MyInvestor Pension': '+50.00', 'Flat Madrid': '–', 'Civislend': '–', 'Current account': '', 'Total': '+380.00' };
  const SEP = { 'Indexa Capital': '+65.00', 'Trade Republic': '+150.00', 'ING': '+60.00', 'MyInvestor Fund': '+50.00', 'MyInvestor Pension': '+300.00', 'Flat Madrid': '+1,000.00', 'New Broker': '', 'Civislend': '+80.00', 'Total': '+1,705.00' };
  await expect('2026-07', JUL); await expect('2026-09', SEP);
  console.log('2. gains after dialog + import rows: July and September (across the August gap)');

  /* 5. figures and rows survive a reload */
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#nw-month');
  await expect('2026-07', JUL); await expect('2026-09', SEP);
  console.log('3. same gains after reload');

  /* 6. editing rows updates the gains */
  const open = async c => { await p.click('[data-action=tab][data-tab=transactions]'); await p.click('[data-action=tx-table][data-t=investments]');
    await p.locator('[data-action=edit-tx][data-t=investments]', { hasText: c }).first().click(); await p.waitForSelector('#tx-form'); };
  const save = async () => { await p.click('#tx-form button[type=submit]'); await p.waitForSelector('#tx-form', { state: 'detached' }); await closeExtra(); };
  await open('Transfer to Indexa Capital'); await p.fill('#f-amount', '600'); await save();
  await expect('2026-07', { 'Indexa Capital': '+50.00', 'Total': '+280.00' });
  await open('Withdrawal Trade Republic'); await p.click('[data-action=tx-del]'); await p.click('[data-action=tx-del-yes]'); await p.waitForSelector('#tx-form', { state: 'detached' });
  await expect('2026-07', { 'Trade Republic': '−230.00', 'Total': '−20.00' });
  await add('investments', '2026-09-15', 'MyInvestor deposit', 100, 'out');   // fits both MyInvestor accounts: neither
  await expect('2026-09', SEP);
  console.log('4. edit, delete and an ambiguous row');

  /* 6b. statement words: rows that don't name the account, or whose words fit two accounts */
  await add('investments', '2026-09-12', 'GAMMA GLOBAL FI @ 35.538006', 150, 'out');   // fund name only: a gain until words are set
  await add('investments', '2026-09-14', 'INDEXA MAS RENTABILIDAD ACCION', 25, 'out'); // name rule sends it to Indexa Capital
  await expect('2026-09', { 'Indexa Capital': '+40.00', 'MyInvestor Fund': '+50.00' });
  const unlinked = () => p.locator('.warn-text', { hasText: 'no account' }).allTextContents().then(t => t.join(' '));
  assert.ok((await unlinked()).includes('“GAMMA GLOBAL FI”'), 'no warning for the unlinked Gamma row');
  const words = async w => {
    await p.click('[data-action=tab][data-tab=networth]'); await p.click('[data-action="nw-accounts"]');
    for (const [n, v] of Object.entries(w)) await p.locator('#nw-acc-form .acc-row').filter({ has: p.locator(`input[data-f=name][value="${n}"]`) }).locator('input[data-f=words]').fill(v);
    await p.click('#nw-acc-form button[type=submit]'); await p.waitForSelector('#nw-acc-form', { state: 'detached' });
  };
  await words({ 'MyInvestor Fund': 'Gamma Global', 'Indexa Capital': 'Indexa', 'MyInvestor Pension': 'Indexa mas rentabilidad, MyInvestor deposit' });
  /* Gamma -> Fund; the longer "Indexa mas rentabilidad" beats "Indexa"; "MyInvestor deposit" (a tie by name) -> Pension */
  const SEPW = { 'Indexa Capital': '+65.00', 'MyInvestor Fund': '−100.00', 'MyInvestor Pension': '+175.00', 'Total': '+1,430.00' };
  await expect('2026-09', SEPW);
  assert.ok(!(await unlinked()).includes('GAMMA'), 'Gamma still listed as unlinked after adding its words');
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#nw-month');
  await expect('2026-09', SEPW);
  console.log('4b. statement words: unnamed fund rows, longest phrase wins, saved across reload, unlinked-rows warning');

  /* 7. phones show Gains too */
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click('[data-action=tab][data-tab=networth]');
  const td = p.locator('table.nwt tbody tr:not(.grp)', { hasText: 'Indexa Capital' }).locator('td').nth(3);
  assert.ok(await td.isVisible(), 'Gains hidden at 390 px');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'page scrolls sideways at 390 px');
  console.log('5. Gains visible at 390 px');
  await browser.close();
  console.log('gains e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
