/* Browser check: the import review ("Check the rows") fits the screen, and its descriptions and amounts can be edited.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/import-review.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
/* made-up data: one saved vending charge, written the way one bank exports it (trailing backslash) */
const saved = [{ id: 'e1', date: '2026-09-03', amount: -0.85, concept: 'VENDING ACME \\', category: '' }];
const file = JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': { income: [], expenses: saved, investments: [] } },
  config: { settings: { lang: 'en', start: { y: 2026, m: 0 }, fixedVar: 1, numFmt: 'es', currency: 'EUR' } } });
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
    await p.fill('#imp-text', lines.join('\n')); await p.click('[data-action=imp-read]'); await p.waitForSelector('table.imp');
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

  const { p, errs } = await open(1280, 720);
  const row = i => p.evaluate(i => { const tr = document.getElementById('imp-r-' + i);
    return { on: tr.querySelector('[data-action=imp-on]').checked, desc: tr.querySelector('[data-action=imp-desc]').value, amt: tr.querySelector('[data-action=imp-amt]').value, note: tr.querySelector('td.n').innerText }; }, i);
  /* the refund is not taken for the charge; the empty description is pointed out */
  assert.ok(!/Already in tracker|Same date/.test((await row(0)).note), 'refund matched: ' + (await row(0)).note);
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
  await p.waitForFunction(() => /Already in tracker/.test(document.querySelector('#imp-r-1 td.n').innerText));
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
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
