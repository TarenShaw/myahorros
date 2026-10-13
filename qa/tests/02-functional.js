/* Phase 3: calculations, add/edit/delete/undo, input edge cases, settings persistence, backup round trip,
   Excel export, paste import, navigation. Writes qa/results/functional.json */
const L = require('./lib');
const fs = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, '..', '..', 'vendor', 'xlsx.full.min.js'));

const R = {};
const step = async (name, fn) => { if (process.env.QA_ONLY && !process.env.QA_ONLY.split(',').includes(name)) return; try { R[name] = await fn(); console.log('ok  ', name); } catch (e) { R[name] = { ERROR: String(e).slice(0, 400) }; console.log('FAIL', name, String(e).slice(0, 200)); if (global.__p) await L.closeAll(global.__p); } };
const near = (a, b) => Math.abs(a - b) < 0.005;

(async () => {
  await L.launch();
  const { tracker, expect } = L.fakeTracker();
  const ctx = await L.context({ lang: 'en', test: true });
  /* the native save picker can't be driven by Playwright: use the plain download the shim falls back to */
  await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; });
  const p = global.__p = await L.openWith(ctx, tracker);
  const setYear = async y => { await p.selectOption('#year-select', String(y)); await p.waitForTimeout(300); };

  /* 1. Yearly table totals against hand-computed totals */
  await step('calc-yearly', async () => {
    const out = {};
    for (const y of ['2025', '2026']) {
      await L.tab(p, 'yearly'); await setYear(y);
      const rows = await p.evaluate(() => [...document.querySelectorAll('table.grid tr.total, table.grid tr.savings')].map(tr => [...tr.querySelectorAll('th,td')].map(c => c.innerText.trim())));
      const e = expect[y], keys = ['income', 'expenses', 'investments'], bad = [];
      rows.slice(0, 3).forEach((cells, k) => {
        const t = keys[k];
        for (let m = 1; m <= 12; m++) { const ym = y + '-' + String(m).padStart(2, '0'), want = (e.months[ym] || {})[t] || 0, got = cells[m] === '' || cells[m] === '–' ? 0 : L.money(cells[m]); if (!near(got, want)) bad.push(`${t} ${ym}: shown ${cells[m]} expected ${want}`); }
        if (!near(L.money(cells[13]), e[t])) bad.push(`${t} total: shown ${cells[13]} expected ${e[t]}`);
      });
      const sv = rows[3]; if (!near(L.money(sv[13]), e.savings)) bad.push(`savings total: shown ${sv[13]} expected ${e.savings}`);
      out[y] = { expected: { income: e.income, expenses: e.expenses, investments: e.investments, savings: e.savings }, shownTotals: rows.map(r => r[0] + ' = ' + r[13]), mismatches: bad };
      await L.shot(p, `fn-yearly-${y}`, true);
    }
    return out;
  });

  /* 2. Overview hero and tiles */
  await step('calc-overview', async () => {
    const out = {};
    for (const y of ['2025', '2026']) {
      await L.tab(p, 'overview'); await setYear(y);
      const v = await p.evaluate(() => ({ eyebrow: document.querySelector('.hero .eyebrow').innerText, hero: document.querySelector('.hero-num').innerText, sub: document.querySelector('.hero-sub').innerText,
        tiles: [...document.querySelectorAll('.tiles .tile')].map(t => t.innerText.replace(/\s+/g, ' ')) }));
      const e = expect[y], bad = [];
      if (!near(L.money(v.hero), e.savings)) bad.push(`hero ${v.hero} vs savings ${e.savings}`);
      const tv = v.tiles.map(t => L.money(t.split(' ').find(w => /\d/.test(w)) ? t.match(/[−-]?[€$]?\s?[\d.,]+\s?€?/)[0] : '0'));
      const rate = Math.round(e.savings / e.income * 1000) / 10;
      if (!v.sub.includes(String(rate).replace('.', ','))) bad.push(`savings rate: "${v.sub}" expected ${rate}%`);
      out[y] = { ...v, expectedSavings: e.savings, expectedRatePct: rate, expectedLiquid: Math.round((e.savings + e.investments) * 100) / 100, mismatches: bad };
      await L.shot(p, `fn-overview-${y}`, true);
    }
    return out;
  });

  /* 3. parseAmount: what each typed amount turns into */
  await step('parse-amount', async () => p.evaluate(() => {
    const ins = ['12,50', '12.50', '1.234,56', '1,234.56', '1.234', '1,234', '12,500', '0,125', '-5', '0', 'abc', '12,5€', '€ 12,50', '  7,10  ', '1e5', '999999999', '1000000000', '😀', '12,50,1', '(25,00)', '25-', '1 234,56', '١٢', '0x10', '+3', '.5', ',5', '3.', 'Infinity'];
    return Object.fromEntries(ins.map(s => [s, window.__ybt.parseAmount(s)]));
  }));
  await step('rounding', async () => p.evaluate(() => { const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100; return { 'r2(1.005)': r2(1.005), 'r2(-1.005)': r2(-1.005), 'r2(2.675)': r2(2.675), '0.1+0.2 shown': window.__ybt.fmtEUR(0.1 + 0.2) }; }));
  await step('parse-date', async () => p.evaluate(() => {
    const ins = ['2026-02-29', '2028-02-29', '29/02/2028', '31/04/2026', '01/02/2026', '02/01/2026', '13/01/2026', '1/2/26', '2026-12-31', '31.12.2026', 'ayer', 'hoy', '45000', '1899-12-31', '2201-01-01'];
    return Object.fromEntries(ins.map(s => [s, window.__ybt.parseDate(s)]));
  }));

  /* 4. add through the dialog with awkward inputs */
  const addTx = async ({ table = 'expenses', date = '2026-09-20', concept = 'QA row', amount = '10', dir }) => {
    await L.tab(p, 'transactions');
    await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#tx-form');
    await p.selectOption('#f-table', table); await p.fill('#f-date', date); await p.fill('#f-concept', concept); await p.fill('#f-amount', amount);
    if (dir) await p.click('label:has(#f-dir-' + dir + ')');
    await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(250);
    const open = !!(await p.$('#tx-form'));
    const err = open ? await p.evaluate(() => { const e = document.querySelector('#f-err'); return e && !e.hidden ? e.innerText : null; }) : null;
    const errVisible = open && err ? await p.evaluate(() => { const r = document.querySelector('#f-err').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }) : null;
    if (open) await p.click('#overlay .m-foot [data-action="close"]').catch(() => L.closeAll(p));
    const row = await p.evaluate(c => { for (const [k, m] of Object.entries(window.__ybtWeb.store.months)) for (const t of ['income', 'expenses', 'investments']) for (const r of m[t]) if (r.concept === c.trim() || r.concept === c) return { t, ...r }; return null; }, concept);
    return { amountTyped: amount, saved: !!row, stored: row && { table: row.t, amount: row.amount, date: row.date, concept: row.concept.length > 40 ? row.concept.slice(0, 40) + '…(' + row.concept.length + ')' : row.concept, category: row.category }, error: err, errorInView: errVisible };
  };
  await step('add-inputs', async () => {
    const cases = ['12,50', '12.50', '1.234,56', '0', '-5', 'abc', '😀', '  7,10  ', '12,500', '1000000000'];
    const out = [];
    for (let i = 0; i < cases.length; i++) out.push(await addTx({ concept: 'QA amount ' + i, amount: cases[i] }));
    out.push(await addTx({ concept: 'Refund QA', amount: '5', dir: 'in' }));
    out.push(await addTx({ table: 'income', concept: 'QA income typed minus', amount: '-100' }));
    out.push(await addTx({ concept: '   spaces around   ', amount: '3' }));
    out.push(await addTx({ concept: 'Ω emoji 😀 ñandú ' + 'x'.repeat(480), amount: '4' }));
    out.push(await addTx({ concept: '', amount: '6' }));
    out.push(await addTx({ concept: 'QA leap day', amount: '1', date: '2028-02-29' }));
    out.push(await addTx({ concept: 'QA new year eve', amount: '1', date: '2026-12-31' }));
    out.push(await addTx({ concept: 'QA old date', amount: '1', date: '1901-01-01' }));
    return out;
  });
  await step('date-display', async () => { await L.tab(p, 'transactions'); await setYear('2026');
    return p.evaluate(() => [...document.querySelectorAll('#view table tbody tr')].slice(0, 3).map(tr => tr.innerText.replace(/\s+/g, ' '))); });
  await step('start-month-after-old-row', async () => p.evaluate(() => ({ start: window.__ybtWeb.store.config.settings.start, years: [...document.querySelectorAll('#year-select option')].map(o => o.value) })));

  /* 5. edit, delete, undo */
  await step('edit-delete-undo', async () => {
    await L.tab(p, 'transactions'); await setYear('2026');
    await p.fill('#view input[type=search]', 'QA amount 1').catch(() => {});
    await p.waitForTimeout(300);
    const row = await p.$('#view [data-action="edit-tx"]');
    if (!row) return 'no editable row found';
    await row.click(); await p.waitForSelector('#tx-form');
    await p.fill('#f-amount', '99,99'); await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(300);
    const afterEdit = await p.evaluate(() => { for (const m of Object.values(window.__ybtWeb.store.months)) for (const r of m.expenses) if (/QA amount 1$/.test(r.concept)) return r.amount; });
    await p.click('#view [data-action="edit-tx"]'); await p.waitForSelector('#tx-form');
    await p.click('[data-action="tx-del"]'); await p.click('[data-action="tx-del-yes"]'); await p.waitForTimeout(300);
    const toast = await p.evaluate(() => (document.querySelector('#toast') || {}).innerText || '');
    const gone = await p.evaluate(() => !Object.values(window.__ybtWeb.store.months).some(m => m.expenses.some(r => /QA amount 1$/.test(r.concept))));
    const undo = await p.$('#toast button:text-matches("^(Undo|Deshacer)$")'); if (undo) await undo.click(); await p.waitForTimeout(500);
    const back = await p.evaluate(() => Object.values(window.__ybtWeb.store.months).some(m => m.expenses.some(r => /QA amount 1$/.test(r.concept))));
    await p.fill('#view input[type=search]', '').catch(() => {});
    return { afterEdit, toast, deleted: gone, undoButton: !!undo, restoredByUndo: back };
  });

  /* 6. settings persist after reload */
  await step('settings-persist', async () => {
    await L.tab(p, 'settings');
    await p.check('#st-num-en'); await p.waitForTimeout(300);
    await p.selectOption('#st-cur', 'USD').catch(() => {}); await p.waitForTimeout(300);
    await p.fill('#st-born', '1985'); await p.press('#st-born', 'Tab');
    await p.fill('#st-salary', '30000'); await p.press('#st-salary', 'Tab');
    await p.click('label:has(#st-theme-dark)'); await p.waitForTimeout(300);
    await p.waitForTimeout(1500);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1800); await L.tab(p, 'settings');
    const v = await p.evaluate(() => ({ num: (document.querySelector('input[name=st-num]:checked') || {}).value, cur: document.querySelector('#st-cur').value, born: document.querySelector('#st-born').value, salary: document.querySelector('#st-salary').value,
      theme: document.documentElement.getAttribute('data-ybt-theme'), themeRadio: (document.querySelector('input[name=st-theme]:checked') || {}).value, settings: window.__ybtWeb.store.config.settings }));
    await L.shot(p, 'fn-settings-dark-usd', true);
    await L.tab(p, 'overview'); await setYear('2025'); v.heroAfter = await p.innerText('.hero-num');
    await L.tab(p, 'settings'); await p.check('#st-num-eu'); await p.selectOption('#st-cur', 'EUR'); await p.click('label:has(#st-theme-light)'); await p.waitForTimeout(500);
    delete v.settings.limits; return v;
  });
  await step('language-switch', async () => {
    await L.tab(p, 'settings'); await p.check('#st-lang-es'); await p.waitForTimeout(600);
    const toast = await p.evaluate(() => (document.querySelector('#toast') || {}).innerText || '');
    const cats = await p.evaluate(() => window.__ybtWeb.store.config.categories && window.__ybtWeb.store.config.categories.expenses.slice(0, 5).map(c => c.name));
    const tabs = await p.innerText('.tabs');
    await L.shot(p, 'fn-settings-es');
    await p.check('#st-lang-en'); await p.waitForTimeout(600);
    return { toast, catsAfterEs: cats, tabs: tabs.replace(/\s+/g, ' ') };
  });

  /* 7. backup round trip: download, start fresh, restore, compare */
  let backupText;
  await step('backup-roundtrip', async () => {
    const before = await p.evaluate(() => JSON.stringify(window.__ybtWeb.store.months));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-backup')]);
    const f = path.join(L.RESULTS, 'backup-' + dl.suggestedFilename()); await dl.saveAs(f); backupText = fs.readFileSync(f, 'utf8');
    const fresh = p.evaluate(async () => (await window.claude.use('local')).startFresh());
    await p.click('.web-panel [data-x=yes]'); await fresh; await p.waitForTimeout(800);
    const emptyCount = await p.evaluate(() => Object.values(window.__ybtWeb.store.months).reduce((n, m) => n + m.income.length + m.expenses.length + m.investments.length, 0));
    const afterFresh = await p.evaluate(() => ({ panel: !!document.querySelector('.web-panel'), view: document.querySelector('#view').innerText.slice(0, 120) }));
    await L.shot(p, 'fn-after-start-fresh');
    /* restore the way a user would after Start fresh: "Already have a tracker data file, or a backup of one? Open it…" */
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 8000 }), p.click('[data-action="local-open"]')]);
    await fc.setFiles(f); await p.waitForTimeout(1500);
    const panel = await p.evaluate(() => { const e = document.querySelector('.web-panel'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; });
    if (panel) { await L.shot(p, 'fn-restore-panel'); const yes = await p.$('.web-panel [data-x=yes], .web-panel [data-x=open], .web-panel button.primary'); if (yes) await yes.click(); await p.waitForTimeout(1500); }
    await L.closeAll(p);
    const after = await p.evaluate(() => JSON.stringify(window.__ybtWeb.store.months));
    const norm = s => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(s)).filter(([, m]) => m.income.length + m.expenses.length + m.investments.length).sort()));
    return { file: dl.suggestedFilename(), bytes: backupText.length, emptyAfterFresh: emptyCount, afterFresh, restorePanel: panel, identical: norm(before) === norm(after), tabsBack: !!(await p.$('#tab-settings:visible')) };
  });

  /* 8. Excel export: totals, and the formula-injection row */
  await step('export-xlsx', async () => {
    await addTx({ concept: '=HYPERLINK("http://example.com","x")', amount: '1' });
    await addTx({ concept: '+SUM(1,2)', amount: '1' });
    await addTx({ concept: '@cmd', amount: '1' });
    await L.tab(p, 'settings');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#view [data-action="export"]')]);
    const f = path.join(L.RESULTS, 'export-' + dl.suggestedFilename()); await dl.saveAs(f);
    const wb = XLSX.read(fs.readFileSync(f), { cellFormula: true });
    const sheets = wb.SheetNames;
    const inj = []; for (const n of sheets) { const ws = wb.Sheets[n]; for (const k of Object.keys(ws)) { if (k[0] === '!') continue; const c = ws[k]; if (c.f || (typeof c.v === 'string' && /^[=+@-]/.test(c.v) && /HYPERLINK|SUM|cmd/.test(c.v))) inj.push({ sheet: n, cell: k, t: c.t, v: String(c.v).slice(0, 50), formula: c.f || null }); } }
    const summary = {}; for (const n of sheets) summary[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }).length;
    return { file: dl.suggestedFilename(), sheets, rowsPerSheet: summary, injectionCells: inj.slice(0, 10) };
  });

  /* 9. paste import with Spanish formats */
  await step('paste-import', async () => {
    await L.tab(p, 'transactions'); await p.click('#view [data-action="import"]'); await p.waitForSelector('#overlay .modal');
    const ta = await p.$('#overlay textarea');
    const txt = ['Fecha;Concepto;Importe', '03/02/2026;MERCADONA VALENCIA;-45,30', '04/02/2026;NOMINA QA SL;1.850,00', '05/02/2026;BIZUM DE ANA;20', '06/02/2026;Compra 2;-1.234,56', '07/02/2026;Línea con <b>html</b>;-2,00'].join('\n');
    if (!ta) return 'no paste box';
    await ta.fill(txt);
    const read = await p.$('#overlay [data-action="imp-read"]'); if (read) await read.click(); await p.waitForTimeout(1000);
    const review = (await p.innerText('#overlay .modal')).replace(/\s+/g, ' ').slice(0, 1200);
    await L.shot(p, 'fn-import-review');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#overlay tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => { const i = td.querySelector('input:not([type=checkbox]),select'); const c = td.querySelector('input[type=checkbox]'); return c ? (c.checked ? '[x]' : '[ ]') : i ? (i.tagName === 'SELECT' ? i.options[i.selectedIndex].text : i.value) : td.innerText.trim(); }).join(' | ')));
    await L.closeAll(p);
    const stillOpen = await p.evaluate(() => { const o = document.querySelector('#overlay'); return o && !o.hidden && o.innerText ? o.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
    if (stillOpen) { await L.shot(p, 'fn-import-after-escape'); /* Escape toggles the "discard these rows?" bar; the close button asks, a second close discards */
      for (let i = 0; i < 2 && await p.$('#overlay .modal'); i++) { await p.click('#overlay [data-action="close"] >> nth=-1'); await p.waitForTimeout(300); } }
    return { rows, afterEscape: stillOpen };
  });

  /* 10. navigation: hash routes, back/forward */
  await step('navigation', async () => {
    const out = {};
    await L.tab(p, 'overview'); await L.tab(p, 'yearly'); await L.tab(p, 'categories');
    out.hashAfterTabs = await p.evaluate(() => location.hash);
    await p.goBack(); await p.waitForTimeout(400); out.afterBack = await p.evaluate(() => ({ hash: location.hash, tab: (document.querySelector('.tabs [aria-selected=true]') || {}).id || null, url: location.href, landing: !!document.querySelector('.web-landing'), text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120) }));
    await p.goForward(); await p.waitForTimeout(400); out.afterForward = await p.evaluate(() => ({ hash: location.hash, tab: (document.querySelector('.tabs [aria-selected=true]') || {}).id }));
    const p2 = await ctx.newPage(); await p2.goto(L.START + '#transactions', { waitUntil: 'load' }); await p2.waitForTimeout(2500);
    out.deepLinkTyped = await p2.evaluate(() => ({ landing: !!document.querySelector('.web-landing'), tab: (document.querySelector('.tabs [aria-selected=true]') || {}).id }));
    if (out.deepLinkTyped.landing) { await p2.click('.web-landing [data-x=open]').catch(() => {}); await p2.waitForTimeout(2000); out.deepLinkAfterOpen = await p2.evaluate(() => (document.querySelector('.tabs [aria-selected=true]') || {}).id); }
    out.secondTabTookOver = await p.evaluate(() => !!document.querySelector('.web-panel [data-x=here]'));
    await p2.close();
    return out;
  });
  R.consoleErrors = ctx.errors;
  L.save('functional.json', R);
  await L.browser.close();
})().catch(e => { console.error(e); L.save('functional.json', R); process.exit(1); });
