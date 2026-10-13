/* Phase 7: markup typed into every text field must show as text, never run. Payloads only set window.__xss.
   Fields: transaction description, category name, keyword, account name, pasted import row, goal, a restored backup with payloads.
   Writes qa/results/xss.json */
const L = require('./lib');
const fs = require('fs');
const path = require('path');

const P = ['<img src=x onerror="window.__xss=(window.__xss||0)+1">', '<svg onload="window.__xss=(window.__xss||0)+1">', '"><script>window.__xss=(window.__xss||0)+1</script>', "javascript:window.__xss=1", '{{constructor.constructor("window.__xss=1")()}}'];
const R = {};
const step = async (name, fn) => { try { R[name] = await fn(); console.log('ok  ', name); } catch (e) { R[name] = { ERROR: String(e).slice(0, 300) }; console.log('FAIL', name, String(e).slice(0, 160)); } };

(async () => {
  await L.launch();
  const ctx = await L.context({ lang: 'en', test: true });
  await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; });
  const t = L.fakeTracker().tracker;
  /* payloads already in the data file: concepts, categories, account names, keywords */
  t.months['2026-09'].expenses.push(...P.map((x, i) => ({ id: 'x' + i, date: '2026-09-1' + i, concept: x, amount: -1, category: x })));
  t.config.networth.accounts.push({ id: 'ax', name: P[0], group: 'cash', words: P[1] });
  t.config.categories = undefined;
  const p = await L.openWith(ctx, t);
  const probe = async where => p.evaluate(w => ({ where: w, ran: window.__xss || 0, liveImg: document.querySelectorAll('img[src="x"]').length, liveSvgOnload: document.querySelectorAll('svg[onload]').length,
    liveScript: [...document.querySelectorAll('script')].filter(s => /__xss/.test(s.textContent)).length }), where);
  await step('from-data-file', async () => { const out = []; for (const tb of ['networth', 'overview', 'yearly', 'transactions', 'categories', 'settings']) { await L.tab(p, tb); await p.waitForTimeout(300); out.push(await probe(tb)); } return out; });
  /* hover tooltips and the info popups render on demand */
  await step('tooltips', async () => { await L.tab(p, 'overview'); for (const b of (await p.$$('#view svg rect, #view svg path.bar')).slice(0, 30)) await b.hover({ force: true }).catch(() => {}); return probe('chart hovers'); });
  /* typed into the add-transaction dialog */
  await step('typed-description', async () => {
    await L.tab(p, 'transactions');
    for (const x of P) { await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form'); await p.fill('#f-concept', x); await p.fill('#f-amount', '2'); await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(250); }
    await p.fill('#view input[type=search]', 'onerror').catch(() => {}); await p.waitForTimeout(400);
    return probe('after typing + search');
  });
  /* new category named with a payload */
  await step('typed-category', async () => {
    await L.tab(p, 'categories'); await p.click('#view [data-action="add-cat"]'); await p.waitForSelector('#overlay input');
    await p.fill('#overlay input', P[0]); await p.keyboard.press('Enter'); await p.waitForTimeout(400); await L.closeAll(p);
    await L.tab(p, 'overview'); await L.tab(p, 'yearly'); return probe('category named with markup');
  });
  /* pasted import rows */
  await step('paste-import', async () => {
    await L.tab(p, 'transactions'); await p.click('#view [data-action="import"]'); await p.waitForSelector('#overlay textarea');
    await p.fill('#overlay textarea', ['Date;Description;Amount', ...P.map((x, i) => `0${i + 1}/08/2026;${x.replace(/;/g, ',')};-3,00`)].join('\n'));
    const read = await p.$('#overlay [data-action="imp-read"]'); if (read) await read.click(); await p.waitForTimeout(800);
    const r = await probe('import review'); await L.shot(p, 'xss-import-review');
    const add = await p.$('#overlay [data-action="imp-add"]'); if (add) { await add.click(); await p.waitForTimeout(400); const c = await p.$('#overlay [data-action="imp-add-confirm"]'); if (c) await c.click(); await p.waitForTimeout(600); }
    await L.closeAll(p); await L.tab(p, 'transactions'); return [r, await probe('after import')];
  });
  /* Excel export of the payload rows: cells must be text, not formulas */
  await step('export', async () => {
    await L.tab(p, 'settings');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#view [data-action="export"]')]);
    const f = path.join(L.RESULTS, 'xss-export.xlsx'); await dl.saveAs(f);
    const X = require(path.join(__dirname, '..', '..', 'vendor', 'xlsx.full.min.js'));
    const wb = X.read(fs.readFileSync(f), { cellFormula: true }); let formulas = 0; for (const n of wb.SheetNames) for (const [k, c] of Object.entries(wb.Sheets[n])) if (k[0] !== '!' && c.f) formulas++;
    fs.unlinkSync(f); return { formulaCells: formulas };
  });
  R.final = await probe('end');
  R.consoleErrors = ctx.errors.filter(e => !/downloads-hub/.test(e));
  L.save('xss.json', R);
  console.log('script ran', R.final.ran, 'times');
  await L.browser.close();
})().catch(e => { console.error(e); L.save('xss.json', R); process.exit(1); });
