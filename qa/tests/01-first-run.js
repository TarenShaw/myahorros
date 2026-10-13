/* Phase 2: first visit. Landing -> where to save -> welcome -> tour -> wizard -> empty tabs, for several personas.
   Writes qa/results/first-run.json and screenshots fr-*.png */
const L = require('./lib');
const assert = require('assert');

const SETUPS = [
  { id: 'desk-en', w: 1440, h: 900, lang: 'en' },
  { id: 'desk-es', w: 1440, h: 900, lang: 'es' },
  { id: 'm375-es', w: 375, h: 667, lang: 'es', mobile: true },
  { id: 'm390-en', w: 390, h: 844, lang: 'en', mobile: true }
];

(async () => {
  await L.launch();
  const out = {};
  for (const s of SETUPS) {
    const ctx = await L.context(s), p = await ctx.newPage(), r = out[s.id] = { steps: [] };
    const t0 = Date.now();
    await p.goto(L.START, { waitUntil: 'load' });
    await p.waitForSelector('.web-landing h1');
    r.landingMs = Date.now() - t0;
    r.landing = await p.evaluate(() => ({ title: document.title, h1: document.querySelector('.web-landing h1').innerText, lead: document.querySelector('.wl-lead').innerText,
      chip: document.querySelector('.wl-chip').innerText, fine: document.querySelector('.wl-fine').innerText,
      buttons: [...document.querySelectorAll('.web-landing .wl-hero button')].map(b => b.innerText), docLang: document.documentElement.lang }));
    r.landingLayout = await L.layoutCheck(p);
    await L.shot(p, `fr-${s.id}-01-landing`); await L.shot(p, `fr-${s.id}-01-landing-full`, true);

    await p.click('.web-landing .wl-hero [data-x=start]');
    await p.waitForSelector('button.web-way[data-m=browser]');
    r.choose = await p.evaluate(() => [...document.querySelectorAll('button.web-way')].map(b => ({ m: b.dataset.m, text: b.innerText.replace(/\s+/g, ' '), disabled: b.disabled })));
    r.chooseLayout = await L.layoutCheck(p);
    await L.shot(p, `fr-${s.id}-02-where-to-save`);

    await p.click('button.web-way[data-m=browser]');
    await p.waitForSelector('[data-action="ob-start"]');
    r.welcome = (await p.innerText('#view')).replace(/\s+/g, ' ').slice(0, 900);
    r.welcomeLayout = await L.layoutCheck(p);
    await L.shot(p, `fr-${s.id}-03-welcome`, true);

    /* the tour: walk every step with Next */
    await p.click('[data-action="ob-start"]');
    await p.waitForSelector('#tour-card', { timeout: 8000 });
    for (let i = 0; i < 25; i++) {
      await p.waitForTimeout(250);
      const st = await p.evaluate(() => { const c = document.querySelector('#tour-card'); if (!c) return null; const r = c.getBoundingClientRect(), sp = document.querySelector('#tour-spot');
        return { title: c.querySelector('h3').innerText, text: c.querySelector('p').innerText, eyebrow: c.querySelector('.tour-eyebrow').innerText.replace(/\s+/g, ' '),
          buttons: [...c.querySelectorAll('button')].map(b => b.innerText), spotHidden: sp ? sp.hidden : true,
          offscreen: r.top < 0 || r.left < 0 || r.bottom > innerHeight + 1 || r.right > document.documentElement.clientWidth + 1, cardH: Math.round(r.height) }; });
      if (!st) break;
      r.steps.push(st);
      if (s.mobile || i < 3) await L.shot(p, `fr-${s.id}-04-tour-${String(i).padStart(2, '0')}`);
      const next = await p.$('#tour-card [data-tour=next]');
      if (!next) { await p.click('#tour-card [data-tour=end]'); break; }
      await next.click();
    }
    /* the wizard follows the tour */
    r.wizard = [];
    await p.waitForSelector('.wz-body', { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 7 && await p.$('.wz-body'); i++) {
      r.wizard.push({ text: (await p.innerText('#overlay .modal')).replace(/\s+/g, ' ').slice(0, 700), layout: await L.layoutCheck(p) });
      await L.shot(p, `fr-${s.id}-05-wizard-${i}`);
      const nx = await p.$('[data-action="wz-next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(250);
    }
    /* Finish later, then reload (refresh in the middle of setting up) */
    const later = await p.$('[data-action="wz-later"]');
    if (later) { await later.click(); await p.waitForTimeout(300); } else await L.closeAll(p);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2000);
    r.afterReload = { wizard: !!(await p.$('.wz-body')), panel: await p.evaluate(() => { const e = document.querySelector('.web-panel'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 120) : null; }) };
    if (r.afterReload.panel) { /* asked again where to save: go through it again */
      await L.shot(p, `fr-${s.id}-05b-after-reload`);
      await p.click('button.web-way[data-m=browser]'); await p.waitForTimeout(2000);
      r.afterReload.next = (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 300);
      r.afterReload.welcomeAgain = !!(await p.$('[data-action="ob-start"]'));
      r.afterReload.wizardAgain = !!(await p.$('.wz-body'));
      await L.shot(p, `fr-${s.id}-05c-after-reload-2`);
      if (r.afterReload.welcomeAgain) { await p.click('[data-action="ob-start"]'); await p.waitForSelector('#tour-card', { timeout: 8000 }).catch(() => {}); await p.keyboard.press('Escape'); await p.waitForTimeout(800); }
    }
    await L.closeAll(p);

    /* empty states of every tab */
    r.empty = {};
    for (const t of ['networth', 'overview', 'yearly', 'transactions', 'categories', 'settings']) {
      await L.tab(p, t);
      r.empty[t] = { text: (await p.innerText('#view')).replace(/\s+/g, ' ').slice(0, 500), layout: await L.layoutCheck(p) };
      await L.shot(p, `fr-${s.id}-06-empty-${t}`, !s.mobile);
    }
    /* the tour can be replayed from Settings */
    await L.tab(p, 'settings');
    await p.click('#view [data-action="tour"]');
    r.tourReplay = !!(await p.waitForSelector('#tour-card', { timeout: 5000 }).catch(() => null));
    await p.keyboard.press('Escape');
    r.errors = ctx.errors;
    await ctx.close();
    console.log(s.id, 'landing', r.landingMs + 'ms', 'tour steps', r.steps.length, 'wizard steps', r.wizard.length, 'errors', r.errors.length);
  }
  L.save('first-run.json', out);
  await L.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
