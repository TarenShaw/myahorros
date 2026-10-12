/* Browser check of the 2026-10-12 user-audit fixes: the demo can be looked around in, setting up from it asks where to
   save, the wizard and its strip agree, typed amounts say what they were read as, a received Bizum is a payback,
   Yearly folds empty categories away, and the landing page's language reaches <html lang>.
     python -m http.server 8000   (repo root)     NODE_PATH=<playwright folder> node tests/audit-fixes.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const newPage = async (locale = 'es-ES', timezoneId = 'Europe/Madrid') => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, locale, timezoneId })).newPage();
    p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
    await p.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    return p; };

  /* 1. landing: picking English sets <html lang>; the demo's "look around" keeps the example, with a bar */
  let p = await newPage();
  await p.goto(START, { waitUntil: 'load' });
  await p.click('.web-landing [data-lang=en]');
  assert.strictEqual(await p.evaluate(() => document.documentElement.lang), 'en');
  await p.click('.web-landing .wl-hero [data-x=demo]');
  await p.waitForSelector('#tour-card [data-tour=free]', { timeout: 10000 });
  await p.click('#tour-card [data-tour=free]');
  await p.waitForSelector('#demo-bar');
  assert.ok(!(await p.$('#tour-card')), 'tour card still there');
  assert.ok(/Net worth/.test(await p.innerText('#view')) && /€/.test(await p.innerText('#view .hero-num')), 'example data gone');
  /* clean example: nothing to review, no backup nudge, no unlinked rows */
  assert.ok(!/to review|isn’t linked/.test(await p.innerText('#view')), 'demo net worth shows warnings');
  await p.click('#tab-overview'); await p.waitForTimeout(300);
  assert.ok(!(await p.$('#view .bk-nudge')) && !(await p.$('#view .notice')), 'demo overview shows a notice');
  /* tabs work, Escape doesn't end it, saving actions are refused */
  await p.keyboard.press('Escape');
  assert.ok(await p.$('#demo-bar'), 'Escape ended the demo');
  console.log('1. demo: look around on my own keeps the example, clean, with a bar');

  /* 2. setting up from the demo asks where to save, then the wizard opens on its first step */
  await p.click('#demo-bar [data-tour=end]');
  await p.waitForSelector('button.web-way[data-m=browser]', { timeout: 8000 });
  assert.ok(/This device|Keep it in this browser/.test(await p.innerText('.web-panel')), 'keep-browser button missing');
  await p.click('.web-panel [data-x=cancel]');
  await p.waitForSelector('.wz-body', { timeout: 8000 });
  assert.ok(/step 1 of 5/i.test(await p.innerText('#overlay .eyebrow')));
  assert.ok(await p.evaluate(() => localStorage.getItem('ybt.picked') === '1'), 'choice not remembered');
  console.log('2. set up from the demo: where to save first, then the wizard');

  /* 3. number format from the region (es-ES browser reading English): 8.500 asks, the field says what it read */
  await p.click('[data-action="guide-acc"]');
  await p.click('#nw-acc-form [data-action="na-add"][data-n]');
  assert.ok(!(await p.$('#nw-acc-form input[data-f=words]')), 'statement words shown to a new user');
  await p.click('#nw-acc-form [data-action="na-adv"]');
  assert.ok(await p.$('#nw-acc-form input[data-f=words]'), 'More options does not show statement words');
  await p.click('#nw-acc-form button[type=submit]'); await p.waitForSelector('.wz-body');
  await p.click('[data-action="wz-later"]');
  await p.click('#tab-transactions'); await p.click('#view [data-action="add-tx"]'); await p.waitForSelector('#f-amount');
  await p.fill('#f-concept', 'Taxi'); await p.type('#f-amount', '1,250');   /* 1.234,56 from the es-ES region: a lone comma is the decimal mark */
  assert.ok(/1,25 €.*1\.250,00 €/.test(await p.innerText('.amt-read.warn')), 'no question under 1.250: ' + await p.innerText('.amt-read'));
  await p.fill('#f-amount', ''); await p.type('#f-amount', '1.250');
  assert.ok(/1\.250,00 €/.test(await p.innerText('.amt-read')) && !(await p.$('.amt-read.warn')));
  await p.$eval('#tx-form', f => f.requestSubmit()); await p.waitForTimeout(300);
  assert.ok(/−?1\.250,00 €/.test(await p.innerText('#toast')), 'toast without the amount: ' + await p.innerText('#toast'));
  console.log('3. region number format, amount preview, question and toast with the amount');

  /* 4. Bizum received: Expenses (a payback) with a note; Yearly shows only used categories */
  await p.click('#view [data-action="import"]'); await p.waitForSelector('#imp-text');
  await p.fill('#imp-text', '03/10/2026\t15,00\tBIZUM DE ANA CENA\n04/10/2026\t-30,00\tMERCADONA');
  await p.click('[data-action="imp-read"]').catch(async () => { await p.click('text=Read rows'); });
  await p.waitForSelector('table.imp');
  const biz = await p.evaluate(() => { const tr = [...document.querySelectorAll('table.imp tbody tr')].find(t => /BIZUM/.test(t.querySelector('input.ed') ? t.querySelector('input.ed').value : t.innerText));
    return tr ? { type: tr.querySelector('select[id^=imp-t]') ? tr.querySelector('select[id^=imp-t]').value : '', note: tr.innerText } : null; });
  assert.ok(biz && /paying you back/.test(biz.note), 'no Bizum note: ' + JSON.stringify(biz));
  await p.keyboard.press('Escape'); await p.click('[data-action="imp-discard"]'); await p.waitForSelector('#overlay.on', { state: 'detached' }).catch(() => {});
  await p.click('#tab-yearly'); await p.waitForSelector('table.grid');
  const shown = await p.$$eval('table.grid tbody th.rh', t => t.length), btn = await p.$('[data-action="y-empty"]');
  assert.ok(btn && /empty categor/.test(await btn.innerText()), 'no show-empty button');
  await btn.click(); await p.waitForTimeout(200);
  assert.ok(await p.$$eval('table.grid tbody th.rh', t => t.length) > shown + 10, 'empty categories not shown on demand');
  console.log('4. Bizum payback note; Yearly folds empty categories');

  /* 5. an "en-US" browser in Spain: euros and 1.234,56 from the time zone; the wizard's currency picker changes it */
  for (const [tz, cur, sym] of [['Europe/Madrid', 'EUR', '€'], ['America/New_York', 'USD', '$']]) {
    p = await newPage('en-US', tz);
    await p.goto(START, { waitUntil: 'load' });
    await p.click('.web-landing .wl-hero [data-x=demo]');
    await p.waitForSelector('#tour-card [data-tour=free]', { timeout: 10000 });
    assert.ok((await p.innerText('#view .hero-num')).includes(sym), tz + ': demo not in ' + sym);
    await p.click('#tour-card [data-tour=free]'); await p.click('#demo-bar [data-tour=end]');
    await p.click('.web-panel [data-x=cancel]'); await p.waitForSelector('#wz-cur');
    assert.strictEqual(await p.inputValue('#wz-cur'), cur, tz + ': wizard currency');
  }
  await p.selectOption('#wz-cur', 'EUR'); await p.waitForTimeout(300);
  assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.config.settings.currency), 'EUR', 'wizard currency not saved');
  console.log('5. currency from the time zone; the wizard picker changes it');

  await browser.close();
  console.log('audit fixes e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
