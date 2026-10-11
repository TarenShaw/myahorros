/* Browser check of the first-visit path: landing page -> where to save -> setup wizard.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/landing-wizard.e2e.js
   Set SHOTS=<folder> to also save screenshots there. */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
const SHOTS = process.env.SHOTS;
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const shot = async (page, n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false }); };
  const newPage = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
    await p.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
    await p.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    return p; };

  /* 1. landing, then Get started -> the where-to-save choice */
  let p = await newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.waitForSelector('.web-landing h1');
  assert.ok((await p.innerText('.web-landing h1')).length > 10);
  await shot(p, 'landing');
  assert.ok(await p.$('.web-landing [data-x=demo]') && await p.$('.web-landing [data-x=start]'));
  await p.click('.web-landing .wl-hero [data-x=start]');
  await p.waitForSelector('button.web-way[data-m=browser]');
  for (let i = 0; i < 12; i++) await p.keyboard.press('Tab');
  assert.ok(await p.evaluate(() => document.querySelector('.web-panel').contains(document.activeElement)), 'Tab left the where-to-save panel');
  console.log('1. landing -> where to save (Tab stays inside)');

  /* 2. pick the browser, set up from scratch -> the wizard opens by itself */
  await p.click('button.web-way[data-m=browser]');
  await p.waitForSelector('[data-action="ob-start"]');
  await shot(p, 'welcome');
  await p.click('[data-action="ob-start"]');
  /* a new tracker gets the tour first; when it ends, the wizard follows */
  await p.waitForSelector('#tour-card', { timeout: 8000 });
  await p.keyboard.press('Escape');
  await p.waitForSelector('.wz-body', { timeout: 8000 });
  await shot(p, 'wizard-0');
  assert.ok(/last month/i.test(await p.innerText('.wz-body')), 'step 1 should explain last month’s balances');
  await p.click('[data-action="wz-next"]'); await p.click('[data-action="wz-next"]');   /* skip optional earlier months */
  assert.ok(/three|By hand/i.test(await p.innerText('.wz-body')));
  await shot(p, 'wizard-2');
  await p.click('[data-action="wz-next"]');
  assert.ok(/behind|lag|previous month/i.test(await p.innerText('.wz-body')), 'salary step should explain the lag');
  await shot(p, 'wizard-3');
  await p.click('[data-action="wz-next"]');
  await p.waitForSelector('[data-action="guide-finish"]');
  await shot(p, 'wizard-4');
  console.log('2. wizard steps work');

  /* 3. a dialog the wizard opens brings the wizard back when it closes */
  await p.click('[data-action="wz-back"]'); await p.click('[data-action="wz-back"]'); await p.click('[data-action="wz-back"]'); await p.click('[data-action="wz-back"]');
  await p.click('[data-action="guide-acc"]');
  await p.waitForSelector('#overlay .modal:not(:has(.wz-body))');
  await p.keyboard.press('Escape');
  await p.waitForSelector('.wz-body', { timeout: 5000 });
  console.log('3. wizard returns after a dialog closes');

  /* 3b. Esc on the wizard itself counts as "Finish later": the next dialog doesn't bring it back */
  await p.keyboard.press('Escape');
  await p.waitForSelector('#overlay.on', { state: 'detached' }).catch(() => {});
  await p.click('#tab-transactions'); await p.click('#view [data-action="add-tx"]');
  await p.waitForSelector('#overlay .modal'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  assert.ok(!(await p.$('.wz-body')), 'wizard came back after Esc');
  console.log('3b. Esc closes the wizard for good');

  /* 3c. a row typed by hand for a month before the new tracker's automatic start moves the start back,
     so the Overview shows it instead of "no income yet" */
  await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form');
  await p.selectOption('#f-table', 'income'); await p.fill('#f-date', '2025-01-28');
  await p.fill('#f-concept', 'Salary'); await p.fill('#f-amount', '2100');
  await p.$eval('#tx-form', f => f.requestSubmit());
  await p.waitForFunction(() => { const s = window.__ybtWeb.store.config.settings; return s && s.start && s.start.y === 2025 && s.start.m === 0; }, null, { timeout: 5000 });
  console.log('3c. hand-typed earlier row moves an automatic start back');

  /* 4. returning visitors don't see the landing again */
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(1500);
  assert.ok(!(await p.$('.web-landing')), 'landing shown again to a returning visitor');
  console.log('4. returning visit goes straight to the app');

  /* 4b. typing the address again shows the landing; with a tracker saved here it offers only "Open my tracker".
     The tracker predates Fixed/Variable: Gym still has its old default mark (moves to Fixed), Groceries was
     changed by the user (kept) */
  await p.evaluate(async () => { localStorage.setItem('ybt.storage', 'browser');
    await window.__ybtWeb.idb.set('data', JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': { income: [{ id: 'a1', date: '2026-09-01', desc: 'Salary', amount: 2000, cat: 'Salary' }], expenses: [], investments: [] } },
      config: { categories: { expenses: [{ name: 'Groceries', type: 'Want' }, { name: 'Gym', type: 'Want' }] }, settings: { lang: 'en' } } })); });
  await p.goto(START, { waitUntil: 'load' });
  await p.waitForSelector('.web-landing [data-x=open]');
  assert.ok(!(await p.$('.web-landing [data-x=demo]')) && !(await p.$('.web-landing [data-x=start]')), 'returning visitor offered demo/start');
  await p.click('.web-landing .wl-hero [data-x=open]');
  await p.waitForFunction(() => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09']);
  assert.ok(!(await p.$('.web-panel')), 'where-to-save asked again');
  console.log('4b. typed visit: landing, then Open my tracker');
  await p.waitForFunction(() => { const s = window.__ybtWeb.store.config.settings; return s && s.fixedVar; }, null, { timeout: 5000 });
  const marks = await p.evaluate(() => Object.fromEntries(window.__ybtWeb.store.config.categories.expenses.map(c => [c.name, c.type])));
  assert.deepStrictEqual(marks, { Groceries: 'Want', Gym: 'Need' }, 'Fixed/Variable migration: ' + JSON.stringify(marks));
  console.log('4c. Fixed/Variable migration keeps marks the user changed');

  /* 5. See a demo starts the tour */
  p = await newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.waitForSelector('.web-landing [data-x=demo]');
  await p.click('.web-landing .wl-hero [data-x=demo]');
  await p.waitForSelector('#tour-card', { timeout: 10000 });
  console.log('5. demo opens the tour');
  await browser.close();
  console.log('landing + wizard e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
