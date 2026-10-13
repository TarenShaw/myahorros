/* Browser check: the import review ("Check the rows") fits the screen, and its descriptions and amounts can be edited.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/import-review.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
/* made-up data: one saved vending charge, written the way one bank exports it (trailing backslash) */
const saved = [{ id: 'e1', date: '2026-09-03', amount: -0.85, concept: 'VENDING ACME \\', category: '', account: 'main' }];
const file = JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': { income: [], expenses: saved, investments: [] } },
  config: { networth:{accounts:[{id:'main',name:'Main bank',group:'cash'}],snaps:{}},settings: { lang: 'en', start: { y: 2026, m: 0 }, fixedVar: 1, numFmt: 'es', currency: 'EUR' } } });
const lines = ['03/09/2026\t0,85\tVENDING ACME', '03/09/2026\t-0,90\tVENDING ACME', '04/09/2026\t-3,00\t.'];
for (let i = 0; i < 40; i++) lines.push(`${String(1 + (i % 28)).padStart(2, '0')}/08/2026\t-${10 + i},50\tSHOP ${i}`);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const open = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto(START); await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, file);
    await p.goto(START); await p.click('.web-landing .wl-hero [data-x=open]');
    await p.waitForFunction(() => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09']);
    await p.evaluate(() => document.querySelector('[data-action=import]').click());
    await p.fill('#imp-text', lines.join('\n')); await p.click('[data-action=imp-read]'); await p.waitForSelector('table.imp');await p.selectOption('#imp-acct','main');
    return { p, errs };
  };
  /* title and buttons are never squeezed by a long table, nor does the table scroll sideways */
  const fits = p => p.evaluate(() => { const h = document.querySelector('.m-head'), f = document.querySelector('.m-foot'), w = document.querySelector('.imp-table-wrap');
    return { head: h.clientHeight >= h.scrollHeight - 1, foot: f.clientHeight >= f.scrollHeight - 1, wide: w.scrollWidth <= w.clientWidth + 1 }; });

  for (const [w, h] of [[1280, 720], [1024, 640], [390, 740]]) {
    const { p, errs } = await open(w, h);
    assert.deepStrictEqual(await fits(p), { head: true, foot: true, wide: true }, w + 'px review');
    await p.keyboard.press('Escape');   /* the "Discard these rows?" bar */
    assert.deepStrictEqual(await fits(p), { head: true, foot: true, wide: true }, w + 'px discard bar');
    assert.deepStrictEqual(errs, []);
    await p.context().close();
  }
  console.log('1. title, buttons and table fit at 1280, 1024 and 390 px');

  /* Excluded rows belong to All rows; they must not inflate the review count. */
  {
    const { p, errs } = await open(1280, 720);
    await p.selectOption('#imp-c-0', { index: 1 });
    await p.click('#imp-on-2');
    const allIds = () => p.locator('table.imp tbody tr').evaluateAll(rs => rs.map(r => r.id));
    const before = await allIds();
    await p.click('[data-action=imp-review-mode][data-v=attention]');
    const attention = await allIds();
    assert.strictEqual(await p.innerText('.m-body > p.notice'), '1 ready · 41 to review · 1 left out');
    assert.ok(!attention.includes('imp-r-0'), 'a categorized clean row is ready');
    assert.ok(!attention.includes('imp-r-2'), 'an excluded row does not need review');
    assert.ok(attention.includes('imp-r-1'), 'an included uncategorized row needs review');
    assert.strictEqual(await p.getAttribute('[data-v=attention][data-action=imp-review-mode]', 'aria-pressed'), 'true');
    await p.click('[data-action=imp-review-mode][data-v=all]');
    assert.deepStrictEqual(await allIds(), before, 'All rows restores the original rows and indexes');
    assert.strictEqual(await p.isChecked('#imp-on-2'), false, 'switching filters preserves exclusions');
    assert.deepStrictEqual(errs, []);
    await p.context().close();
    console.log('2. attention excludes ready and left-out rows; All rows restores them without changing selections');
  }

  const { p, errs } = await open(1280, 720);
  const row = i => p.evaluate(i => { const tr = document.getElementById('imp-r-' + i);
    return { on: tr.querySelector('[data-action=imp-on]').checked, desc: tr.querySelector('[data-action=imp-desc]').value, amt: tr.querySelector('[data-action=imp-amt]').value, note: tr.querySelector('td.n').innerText }; }, i);
  /* the refund is not taken for the charge; the empty description is pointed out */
  assert.ok(!/Already in your tracker|Same date/.test((await row(0)).note), 'refund matched: ' + (await row(0)).note);
  assert.ok(/No description/.test((await row(2)).note));
  /* Esc puts the text back and leaves the review open */
  await p.fill('#imp-d-2', 'typo'); await p.press('#imp-d-2', 'Escape');
  assert.strictEqual(await p.inputValue('#imp-d-2'), '.'); assert.ok(await p.isVisible('table.imp'));
  assert.ok(!(await p.isVisible('.confirm-inline')), 'Esc in a box asked to discard');
  /* Enter saves a description and keeps the focus there */
  await p.fill('#imp-d-2', 'Bakery'); await p.press('#imp-d-2', 'Enter');
  assert.strictEqual(await p.evaluate(() => document.activeElement.id), 'imp-d-2');
  assert.ok(!/No description/.test((await row(2)).note));
  /* a Spanish amount with its sign; shown back with the currency */
  await p.fill('#imp-a-2', '-14,90'); await p.press('#imp-a-2', 'Enter');
  assert.strictEqual((await row(2)).amt, '−14,90 €');
  /* not a number: marked, nothing changed */
  await p.fill('#imp-a-2', 'abc'); await p.press('#imp-a-2', 'Enter');
  assert.strictEqual(await p.getAttribute('#imp-a-2', 'aria-invalid'), 'true');
  await p.press('#imp-a-2', 'Escape'); assert.strictEqual((await row(2)).amt, '−14,90 €');
  /* changing −0,90 to −0,85 makes it the saved charge: checked again, unticked as a duplicate */
  assert.strictEqual((await row(1)).on, true);
  await p.fill('#imp-a-1', '-0,85'); await p.click('table.imp thead');   /* leaving the box saves too */
  await p.waitForFunction(() => /Already in your tracker/.test(document.querySelector('#imp-r-1 td.n').innerText));
  assert.strictEqual((await row(1)).on, false);
  /* the edits are what gets saved */
  await p.click('[data-action=imp-add]');
  if (await p.isVisible('[data-action=imp-add-confirm]')) await p.click('[data-action=imp-add-confirm]');
  await p.waitForFunction(() => window.__ybtWeb.store.months['2026-09'].expenses.length > 1, null, { timeout: 8000 }).catch(() => {});
  const sep = await p.evaluate(() => window.__ybtWeb.store.months['2026-09'].expenses.map(r => [r.concept, r.amount]));
  assert.ok(sep.some(([c, a]) => c === 'Bakery' && a === -14.9), JSON.stringify(sep));
  assert.strictEqual(sep.filter(([c]) => /VENDING/.test(c)).length, 1, 'the duplicate was imported');
  assert.deepStrictEqual(errs, []);
  console.log('2. descriptions and amounts edit inline, are checked again and are saved');
  await p.context().close();

  /* 3. a bank statement and an investment statement read by AI together (made-up rows; Claude's answer is faked):
     the investment rule applies to that file's rows only, and every greyed row says why */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en');
      localStorage.setItem('ybt.ai', JSON.stringify({ provider: 'anthropic', model: 'claude-haiku-5-5', key: 'sk-ant-test-not-a-real-key' })); } catch (_) {} });
    const bank = 'bank.csv', fund = 'fund-statement.csv';
    const answer = { rows: [
      { date: '2026-09-05', amount: -30, description: 'HOME FIBRE', table: 'expenses', source: bank },
      { date: '2026-09-06', amount: -12.5, description: 'WEB HOSTING', table: 'expenses', source: bank },
      { date: '2026-09-07', amount: -20, description: 'AI SUBSCRIPTION', table: 'expenses', source: bank },
      { date: '2026-09-08', amount: -10, description: 'MOBILE LINE', table: 'expenses', source: bank },
      { date: '2026-09-03', amount: -0.85, description: 'VENDING ACME', table: 'expenses', source: bank, question: 'Another purchase or a duplicate?', answers: [['Another purchase', 'include'], ['Duplicate', 'exclude'], ['Not sure', 'keep']] },
      { date: '2026-09-10', amount: -300, description: 'SUSCRIPCION FONDO INDEXADO', table: 'investments', source: fund },
      { date: '2026-09-11', amount: -100, description: 'APORTACION PLAN PENSIONES', table: 'investments', source: fund },
      { date: '2026-09-12', amount: -200, description: 'SUSCRIPCION FONDO GLOBAL', table: 'investments', source: fund }],
      left_out: [], statements: [], notes: '' };
    await ctx.route('https://api.anthropic.com/v1/messages', r => r.fulfill({ status: 200, contentType: 'text/event-stream',
      body: 'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: JSON.stringify(answer) } }) + '\n\n' }));
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto(START); await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', t); }, file);
    await p.goto(START); await p.click('.web-landing .wl-hero [data-x=open]');
    await p.waitForFunction(() => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09']);
    await p.click('#tab-transactions'); await p.click('[data-action=ai-tx]');
    await p.setInputFiles('#ai-file', [{ name: bank, mimeType: 'text/csv', buffer: Buffer.from('date;amount;concept\n05/09/2026;-30;HOME FIBRE\n') },
      { name: fund, mimeType: 'text/csv', buffer: Buffer.from('fecha;importe;concepto\n10/09/2026;-300;SUSCRIPCION FONDO INDEXADO\n') }]);
    await p.click('[data-action=ai-send]'); await p.waitForSelector('table.imp');await p.selectOption('#imp-source-0','main');
    const rows = () => p.evaluate(() => [...document.querySelectorAll('table.imp tbody tr')].map(tr => ({
      desc: tr.querySelector('[data-action=imp-desc]').value, on: tr.querySelector('[data-action=imp-on]').checked,
      grey: tr.classList.contains('off'), why: (tr.querySelector('.note.why') || {}).innerText || '' })));
    const by = async () => Object.fromEntries((await rows()).map(r => [r.desc, r]));
    let r = await by();
    for (const d of ['HOME FIBRE', 'WEB HOSTING', 'AI SUBSCRIPTION', 'MOBILE LINE']) assert.ok(r[d].on && !r[d].grey && !r[d].why, d + ' ' + JSON.stringify(r[d]));
    assert.ok(!r['VENDING ACME'].on && r['VENDING ACME'].grey && /Already in your tracker/.test(r['VENDING ACME'].why));
    const answerButtons=p.locator('#imp-r-4 [data-action=ai-opt]');
    assert.strictEqual(await answerButtons.count(),3);
    assert.strictEqual(await p.locator('.ai-reply input').count(),0);
    await answerButtons.nth(0).click(); assert.ok((await by())['VENDING ACME'].on);
    await answerButtons.nth(1).click(); assert.ok(!(await by())['VENDING ACME'].on);
    await answerButtons.nth(2).click(); assert.ok(!(await by())['VENDING ACME'].on);
    assert.ok((await p.innerText('#imp-r-4')).includes('Your answer: Not sure'));

    for (const d of ['SUSCRIPCION FONDO INDEXADO', 'APORTACION PLAN PENSIONES', 'SUSCRIPCION FONDO GLOBAL'])
      assert.ok(r[d].on && !r[d].grey, 'investment wording alone must not exclude a source: ' + d);
    assert.ok(/Greyed rows won’t be/.test(await p.innerText('.imp-key')));
    /* never greyed without a reason, never unticked by the app without one */
    const noReason = rs => rs.filter(x => (x.grey && !x.why) || (!x.on && !x.grey && x.why));
    assert.deepStrictEqual(noReason(await rows()), []);
    assert.ok((await rows()).every(x => x.on || x.grey), 'unticked by the app but not greyed');
    /* unticked by the person: not greyed, no note; ticked again: imported */
    await p.click('#imp-on-0'); r = await by();
    assert.ok(!r['HOME FIBRE'].on && !r['HOME FIBRE'].grey && !r['HOME FIBRE'].why);
    /* ticking a greyed row takes the grey and the reason away */
    await p.click('#imp-on-5'); await p.click('#imp-on-5'); r = await by();
    assert.ok(r['SUSCRIPCION FONDO INDEXADO'].on && !r['SUSCRIPCION FONDO INDEXADO'].grey && !r['SUSCRIPCION FONDO INDEXADO'].why);
    assert.deepStrictEqual(noReason(await rows()), []);
    assert.deepStrictEqual(errs, []);
  console.log('3. multi-file review preserves investment wording without blanket exclusions; greyed rows have reasons');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
