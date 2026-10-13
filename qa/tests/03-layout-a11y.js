/* Phases 4-5: every tab at 375/768/1024/1440 (+ phone landscape, dark), axe-core on every screen and main dialogs,
   keyboard walk (focus visible, Escape closes). Uses the made-up tracker from lib.js (the demo can't be used: Escape ends the tour and puts the example away). Writes qa/results/layout-a11y.json */
const L = require('./lib');

const trk = lang => { const t = L.fakeTracker().tracker; t.config.settings.lang = lang; return t; };
const TABS = ['networth', 'overview', 'yearly', 'transactions', 'categories', 'settings'];
const SIZES = [
  { id: 'w375', w: 375, h: 667, mobile: true },
  { id: 'w375land', w: 667, h: 375, mobile: true },
  { id: 'w768', w: 768, h: 1024, mobile: true },
  { id: 'w1024', w: 1024, h: 768 },
  { id: 'w1440', w: 1440, h: 900 }
];

(async () => {
  await L.launch();
  const R = { layout: {}, axe: [], keyboard: {}, dark: {} };

  /* layout at every size */
  for (const s of SIZES) {
    const ctx = await L.context({ ...s, lang: 'es' }), p = await L.openWith(ctx, trk('es'));
    R.layout[s.id] = {};
    for (const t of TABS) {
      await L.tab(p, t);
      R.layout[s.id][t] = await L.layoutCheck(p);
      await L.shot(p, `ly-${s.id}-${t}`, true);
    }
    R.layout[s.id].errors = ctx.errors;
    await ctx.close();
    console.log('layout', s.id);
  }

  /* dark theme, desktop and phone */
  for (const s of [SIZES[0], SIZES[4]]) {
    const ctx = await L.context({ ...s, lang: 'en', scheme: 'dark' }), p = await L.openWith(ctx, trk('en'));
    for (const t of ['networth', 'overview', 'yearly']) { await L.tab(p, t); await L.shot(p, `dark-${s.id}-${t}`, true); }
    R.dark[s.id] = await p.evaluate(() => ({ theme: document.documentElement.getAttribute('data-ybt-theme'), bg: getComputedStyle(document.body).backgroundColor }));
    await ctx.close();
  }

  /* axe: landing, where-to-save, welcome, every tab, main dialogs (CSP bypassed so axe can be injected) */
  {
    const ctx = await L.context({ lang: 'en', bypassCSP: true }), p = await ctx.newPage();
    await p.goto(L.START, { waitUntil: 'load' }); await p.waitForSelector('.web-landing h1');
    R.axe.push(await L.axe(p, 'landing'));
    await p.click('.web-landing .wl-hero [data-x=start]'); await p.waitForSelector('button.web-way');
    R.axe.push(await L.axe(p, 'where-to-save'));
    await p.click('button.web-way[data-m=browser]'); await p.waitForSelector('[data-action="ob-start"]');
    R.axe.push(await L.axe(p, 'welcome'));
    await ctx.close();
  }
  for (const lang of ['en', 'es']) {
    const ctx = await L.context({ lang, bypassCSP: true }), p = await L.openWith(ctx, trk(lang));
    for (const t of TABS) { await L.tab(p, t); R.axe.push(await L.axe(p, lang + ' ' + t)); }
    if (lang === 'en') {
      await L.tab(p, 'transactions');
      const dlg = async (sel, name) => { const b = await p.$(sel); if (!b) { R.axe.push({ screen: name, missing: sel }); return; } await b.click(); await p.waitForSelector('#overlay .modal'); await p.waitForTimeout(300); R.axe.push(await L.axe(p, name)); await L.closeAll(p); };
      await dlg('#view [data-action="add-tx"]', 'dialog add transaction');
      await dlg('#view [data-action="import"]', 'dialog import');
      await L.tab(p, 'networth');
      await dlg('#view [data-action="nw-accounts"]', 'dialog add account');
    }
    await ctx.close();
  }
  console.log('axe done');

  /* keyboard: Tab through the Overview, record focus order and whether focus is visible; Escape closes a dialog */
  {
    const ctx = await L.context({ lang: 'en' }), p = await L.openWith(ctx, trk('en'));
    await L.tab(p, 'overview');
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    const seen = [];
    for (let i = 0; i < 45; i++) {
      await p.keyboard.press('Tab');
      seen.push(await p.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return 'body';
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || /\d+px/.test(s.boxShadow) && s.boxShadow !== 'none';
        return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 22)}" ${ring ? 'ring' : 'NO-RING'}${r.width === 0 ? ' INVISIBLE' : ''}`;
      }));
    }
    R.keyboard.overviewTabOrder = seen;
    R.keyboard.noRing = seen.filter(s => /NO-RING|INVISIBLE/.test(s));
    await L.tab(p, 'transactions');
    await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#overlay .modal');
    R.keyboard.dialogFocus = await p.evaluate(() => { const e = document.activeElement; return e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''); });
    /* focus trap: 30 Tabs must stay inside the dialog */
    let escaped = 0; for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('#overlay')))) escaped++; }
    R.keyboard.focusLeftDialog = escaped;
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    R.keyboard.escapeClosesDialog = !(await p.$('#overlay .modal'));
    R.keyboard.focusAfterClose = await p.evaluate(() => { const e = document.activeElement; return e.tagName.toLowerCase() + (e.dataset.action ? '[' + e.dataset.action + ']' : ''); });
    R.keyboard.errors = ctx.errors;
    await ctx.close();
  }
  /* page semantics */
  {
    const ctx = await L.context({ lang: 'es' }), p = await L.openWith(ctx, trk('es'));
    await L.tab(p, 'overview');
    R.semantics = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, h1: [...document.querySelectorAll('h1')].map(h => h.innerText.slice(0, 40)),
      svgCharts: [...document.querySelectorAll('#view svg')].map(s => ({ role: s.getAttribute('role'), label: (s.getAttribute('aria-label') || '').slice(0, 60), hidden: s.getAttribute('aria-hidden') })).slice(0, 8),
      imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length }));
    await ctx.close();
  }
  L.save('layout-a11y.json', R);
  await L.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
