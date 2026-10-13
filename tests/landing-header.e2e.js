/* Phone landing header: compact controls, readable labels and usable touch targets.
   Serve the repo at localhost:8000; NODE_PATH=<Playwright modules> node tests/landing-header.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
    await page.goto(START);
    await page.waitForSelector('.wl-top');
    for (const returning of [false, true]) {
      if (returning) {
        await page.evaluate(async () => {
          localStorage.setItem('ybt.storage', 'browser');
          await window.__ybtWeb.idb.set('data', JSON.stringify({ app: 'Yearly Budget Tracker', format: 1, months: { '2026-09': { income: [{ date: '2026-09-01', concept: 'Salary', amount: 1000 }], expenses: [], investments: [] } }, config: {} }));
        });
        await page.goto(START + '?header=returning');
        await page.waitForSelector('.wl-top [data-x=open]');
      }
      for (const width of [320, 390, 640]) {
        await page.setViewportSize({ width, height: 800 });
        for (const lang of ['en', 'es']) {
          await page.click('.wl-top [data-lang=' + lang + ']');
          const layout = await page.evaluate(() => {
            const header = document.querySelector('.wl-top').getBoundingClientRect();
            const buttons = [...document.querySelectorAll('.wl-top button')].filter(el => el.getClientRects().length);
            return { height: header.height, fits: buttons.every(el => {
              const r = el.getBoundingClientRect();
              return r.height >= 44 && r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth;
            }) };
          });
          assert.ok(layout.height <= 90, 'header takes more than two compact rows at ' + width + '/' + lang);
          assert.ok(layout.fits, 'header controls clip or lose their touch targets at ' + width + '/' + lang);
          if (process.env.SHOTS && returning && width === 390) await page.screenshot({ path: process.env.SHOTS + '/landing-header-' + lang + '.png' });
        }
      }
      await page.click('.wl-top [data-x=' + (returning ? 'open' : 'start') + ']');
      await page.waitForSelector(returning ? '.web-landing' : '.web-panel', { state: returning ? 'detached' : 'visible' });
      if (!returning) { await page.goto(START); await page.waitForSelector('.wl-top'); }
    }
    console.log('landing header: new/returning visitors EN/ES at 320/390/640px passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
