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
  /* History setup starts directly; the demo still offers its tour. */
  await p.waitForSelector('.wz-body', { timeout: 8000 });
  await shot(p, 'wizard-0');
  assert.ok(/one everyday account/i.test(await p.innerText('.wz-body')), 'quick setup starts with one everyday account');
  await p.fill('#wz-born', '1994'); await p.fill('#wz-salary', '62000');
  await p.click('.wz-body [data-action="about-set"]');
  await p.waitForFunction(() => document.querySelector('#wz-about-status').textContent.includes('saved'));
  assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.config.settings.birthYear), 1994);
  assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.config.settings.salary), 62000);
  /* one way forward: "Skip this step" while a step isn't done, "Next" once it is */
  assert.strictEqual((await p.innerText('.m-foot [data-action="wz-next"]')).trim(), 'Skip this step');
  await p.click('[data-action="wz-next"]');
  assert.ok(/Add a statement|CSV|bank/i.test(await p.innerText('.wz-body')), 'statements step explains file import');
  await p.click('[data-action="wz-next"]');
  await p.click('[data-action="wz-next"]');
  assert.ok(/salary/i.test(await p.innerText('.wz-body')));
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
  await p.click('#tab-settings');
  assert.strictEqual(await p.inputValue('#st-born'), '1994');
  assert.strictEqual(await p.inputValue('#st-salary'), '62000');
  await p.fill('#st-born', '2027'); await p.click('[data-action="about-set"]');
  assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.config.settings.birthYear), 1994, 'invalid birth year saved');
  await p.fill('#st-born', '1993'); await p.fill('#st-salary', '65000');
  assert.ok(await p.evaluate(()=>window.YBT_BUSY()), 'background sync must wait while details are being edited');
  await p.click('[data-action="about-set"]');
  await p.waitForFunction(() => document.querySelector('#st-about-status').textContent.includes('saved'));
  assert.ok(!await p.evaluate(()=>window.YBT_BUSY()), 'Set must release the sync deferral');
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(800); if(await p.$('.wz-body')) await p.keyboard.press('Escape');
  await p.click('#tab-settings');
  assert.strictEqual(await p.inputValue('#st-born'), '1993', 'birth year lost on reload');
  assert.strictEqual(await p.inputValue('#st-salary'), '65000', 'salary lost on reload');
  await p.click('#tab-transactions');
  console.log('3b. Esc closes the wizard for good');

  /* 3c. a row typed by hand for a month before the new tracker's automatic start moves the start back,
     so the Overview shows it instead of "no income yet" */
  await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form');
  await p.selectOption('#f-table', 'income'); await p.fill('#f-date', '2025-01-28');
  await p.fill('#f-concept', 'Salary'); await p.fill('#f-amount', '2100');
  assert.strictEqual(await p.inputValue('#f-cat'), 'Salary', 'keyword category not shown while typing');
  await p.$eval('#tx-form', f => f.requestSubmit());
  await p.waitForFunction(() => { const s = window.__ybtWeb.store.config.settings; return s && s.start && s.start.y === 2025 && s.start.m === 0; }, null, { timeout: 5000 });
  console.log('3c. hand-typed earlier row moves an automatic start back');

  /* Missing age details jump to the exact Settings card and focus its first field. */
  await p.evaluate(async()=>{ const db=await window.claude.use('db');
    await db.doc('config/networth').set({accounts:[{id:'bank',name:'Bank',group:'cash'}],snaps:{'2026-09':{bank:1000}}});
    window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:JSON.parse(JSON.stringify(window.__ybtWeb.store))}));
  });
  await p.click('#tab-settings'); await p.fill('#st-born',''); await p.fill('#st-salary','');
  await p.click('[data-action="about-set"]'); await p.waitForFunction(()=>document.querySelector('#st-about-status').textContent.includes('saved'));
  await p.click('#tab-networth');
  if(!await p.locator('[data-action="goto-about"]').isVisible()) await p.click('[data-action="analysis-toggle"][data-tab="networth"]');
  await p.click('[data-action="goto-about"]');
  assert.strictEqual(await p.evaluate(()=>document.activeElement.id),'st-born', 'Add details did not focus About you');
  assert.ok(await p.locator('#about-card').isVisible());
  await p.fill('#st-born','1993'); await p.fill('#st-salary','65000'); await p.click('[data-action="about-set"]');
  await p.waitForFunction(()=>document.querySelector('#st-about-status').textContent.includes('saved'));
  console.log('3d. Add details opens and focuses About you');

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
  assert.strictEqual(await p.getAttribute('#tab-overview', 'aria-selected'), 'true', 'a tracker with rows and no accounts should open on the Overview');
  console.log('4c. Fixed/Variable migration keeps marks the user changed');

  /* 4d. the year from every account: accounts, a statement for one of them (its Balance column fills the month-ends),
     the month-ends still missing one by one, the salary picked from the imported income */
  p = await newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=start]');
  await p.click('button.web-way[data-m=browser]'); await p.click('[data-action="ob-history"]');
  await p.waitForSelector('.wz-body', { timeout: 8000 });
  await p.click('[data-action="guide-acc"]'); await p.waitForSelector('#nw-acc-form');
  for (const n of ['Current account', 'Savings account']) await p.click(`#nw-acc-form [data-action="na-add"][data-n="${n}"]`);
  await p.click('#nw-acc-form button[type=submit]'); await p.waitForSelector('.wz-body');
  assert.strictEqual((await p.innerText('.m-foot [data-action="wz-next"]')).trim(), 'Next');
  await p.click('[data-action="wz-next"]');
  assert.strictEqual((await p.$$('.wz-list [data-action="guide-import"][data-acc]')).length, 2, 'one Import per account');
  await p.click('.wz-list [data-action="guide-import"][data-acc]');
  await p.waitForSelector('#imp-text');
  assert.ok(/Statement for: Current account/.test(await p.innerText('.modal')));
  /* newest first, from 2 January of the wizard's year to today, with a running balance */
  const stmt = await p.evaluate(() => {
    const now = new Date(), y = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear(), out = []; let bal = 1000;
    const add = (d, a, c) => { bal = Math.round((bal + a) * 100) / 100; out.push([d, c, a, bal]); };
    for (let d = new Date(y, 0, 2); d <= now; d.setDate(d.getDate() + 1)) {
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (d.getDate() === 2) add(iso, -40, 'MERCADONA'); if (d.getDate() === 27) add(iso, 2100, 'TRANSFERENCIA ACME SL'); }
    return { text: 'Date\tDescription\tAmount\tBalance\n' + out.reverse().map(r => r.join('\t')).join('\n'), y };
  });
  await p.fill('#imp-text', stmt.text); await p.click('[data-action="imp-read"]');
  await p.waitForSelector('#imp-balfill');
  assert.ok(await p.isChecked('#imp-balfill'), 'balance fill offered and ticked');
  await p.click('[data-action="imp-add"]');
  if (await p.$('[data-action="imp-add-confirm"]')) await p.click('[data-action="imp-add-confirm"]');
  await p.waitForSelector('.wz-body');
  assert.ok(/rows/.test(await p.innerText('.wz-list li')), 'the account shows its imported dates');
  assert.ok(/Coverage not confirmed/.test(await p.innerText('.wz-body')), 'coverage must be confirmed separately for every account');
  /* December closes on the balance before the first row */
  await p.waitForFunction(k => { const n = window.__ybtWeb.store.config.networth; return n && n.snaps && n.snaps[k] && Object.values(n.snaps[k])[0] === 1000; }, (stmt.y - 1) + '-12', { timeout: 5000 });
  await p.click('[data-action="wz-next"]');
  assert.ok((await p.$$('.wz-year li.part')).length > 0, 'month-ends without the savings account are partial');
  assert.ok(/December/.test(await p.innerText('.wz-acts [data-action="guide-val"]')));
  await p.click('[data-action="guide-val"]'); await p.waitForSelector('#nw-snap-form');
  const ins = await p.$$('#nw-snap-form input[data-acc]'); await ins[1].fill('4000');
  await p.click('#nw-snap-form button[type=submit]'); await p.waitForSelector('.wz-body');
  assert.ok(/January/.test(await p.innerText('.wz-acts [data-action="guide-val"]')), 'the next missing month-end comes next');
  await p.click('[data-action="guide-val"]'); await p.waitForSelector('#nw-snap-form');
  assert.ok(await p.$('#nw-snap-form input.carried'), 'the savings figure is carried from December');
  await p.keyboard.press('Escape'); await p.waitForSelector('.wz-body');
  await p.click('[data-action="wz-next"]');
  await p.click('[data-action="wz-salary"]');
  await p.waitForFunction(() => /Salary found/.test(document.querySelector('.wz-body').innerText));
  await p.click('[data-action="wz-next"]');
  assert.ok(/Almost there/.test(await p.innerText('#m-title')) && /Balances not complete/.test(await p.innerText('.wz-body')), 'summary lists what is missing');
  await shot(p, 'wizard-summary');
  console.log('4d. statements, balances from the statement, salary, summary gaps');

  /* 5. See a demo starts the tour */
  p = await newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.waitForSelector('.web-landing [data-x=demo]');
  await p.click('.web-landing .wl-hero [data-x=demo]');
  await p.waitForSelector('#tour-card', { timeout: 10000 });
  console.log('5. demo opens the tour');

  /* 6. a small phone at 200% zoom (375x667 -> 187x333 CSS px): the where-to-save card fits, and the add dialog's
     sticky title and buttons leave its fields reachable */
  p = await (await browser.newContext({ viewport: { width: 187, height: 333 }, hasTouch: true })).newPage();
  await p.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'es'); } catch (_) {} });
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing .wl-hero [data-x=start]');
  await p.waitForSelector('button.web-way[data-m=browser]');
  assert.ok(await p.evaluate(() => document.querySelector('.web-panel-card').getBoundingClientRect().right <= innerWidth), 'where-to-save card wider than the screen');
  await p.click('button.web-way[data-m=browser]'); await p.click('[data-action="ob-history"]');
  await p.waitForSelector('.wz-body', { timeout: 8000 }); await p.keyboard.press('Escape');
  await p.waitForSelector('#overlay.on', { state: 'detached' }).catch(() => {});
  await p.click('#tab-transactions'); await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#f-amount');
  const reach = await p.evaluate(() => { const f = document.getElementById('f-amount'); f.scrollIntoView({ block: 'center' });
    const r = f.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit === f || f.contains(hit); });
  assert.ok(reach, 'amount field hidden under the dialog title or buttons');
  console.log('6. small phone at 200% zoom: card fits, add dialog fields reachable');
  await browser.close();
  console.log('landing + wizard e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
