/* Approved presentation fixes, using isolated demo data. Same setup as dashboard-design.e2e.js. */
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('ybt.lang', 'en'));
    await context.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(START);
    await page.click('.wl-hero [data-x=demo]');
    await page.waitForSelector('#tour-card');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#demo-bar');
    if (process.env.SHOTS) fs.mkdirSync(process.env.SHOTS, { recursive: true });
    for (const lang of ['es', 'en']) {
      await page.click('#tab-settings');
      await page.check('#st-lang-' + lang);
      assert.strictEqual(await page.locator('#demo-bar [data-tour=again]').innerText(), lang === 'es' ? 'Hacer el recorrido' : 'Take the tour');
      assert.strictEqual(await page.locator('#demo-bar [data-tour=end]').innerText(), lang === 'es' ? 'Configurar mi control' : 'Set up my tracker');
      assert.ok((await page.locator('#demo-bar').innerText()).startsWith(lang === 'es' ? 'Datos de ejemplo' : 'Example data'));
      for (const theme of ['light', 'dark']) {
        await page.click('#tab-settings');
        await page.check('#st-theme-' + theme);
        for (const width of [1440, 1024, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          const auditStyles = [];
          for (const tab of ['overview', 'networth', 'transactions', 'yearly', 'settings']) {
            await page.click('#tab-' + tab);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} overflow: ${lang}/${theme}/${width}`);
            const header = await page.locator('.page-head').evaluate(e => {
              const period = e.querySelector('.ph-period'), end = e.querySelector('.ph-end');
              if (!period || !end) return true;
              const title = e.firstElementChild.getBoundingClientRect(), r = end.getBoundingClientRect();
              return r.top < title.bottom || Math.abs(period.getBoundingClientRect().left - e.getBoundingClientRect().left) < 1;
            });
            assert.ok(header, `wrapped header period not left aligned: ${tab}/${width}`);
            if (['networth', 'transactions', 'settings'].includes(tab)) {
              auditStyles.push(await page.locator('[data-action=audit]').evaluate(e => {
                const s = getComputedStyle(e); return [s.backgroundColor, s.fontSize, s.borderRadius, s.minHeight];
              }));
            }
            if (tab === 'transactions' && width <= 640) {
              assert.ok(await page.locator('.tx-types').evaluate(e => {
                const buttons = [...e.querySelectorAll('[data-action=tx-table]')];
                const rects = buttons.map(b => b.getBoundingClientRect());
                const info = e.querySelector('.info-btn').getBoundingClientRect();
                return rects.every(r => Math.abs(r.top - rects[0].top) < 1 && Math.abs(r.width - rects[0].width) < 1 && r.height >= 40)
                  && buttons.every(b => b.querySelector('.ct').getBoundingClientRect().top >= b.querySelector('.tx-type-label').getBoundingClientRect().bottom)
                  && info.top >= rects[0].top && info.bottom <= rects[0].bottom;
              }), `phone type selector: ${lang}/${width}`);
              await page.click('[data-action=tx-table][data-t=investments]');
              assert.strictEqual(await page.getAttribute('[data-action=tx-table][data-t=investments]', 'aria-pressed'), 'true');
              await page.click('[data-action=tx-table][data-t=expenses]');
              if (process.env.SHOTS && width === 390) await page.screenshot({ path: `${process.env.SHOTS}/transactions-${lang}-${theme}.png` });
            }
          }
          assert.deepStrictEqual(auditStyles[0], auditStyles[1], 'Net worth and Transactions AI buttons differ');
          assert.deepStrictEqual(auditStyles[0], auditStyles[2], 'Settings AI button differs');
          await page.click('.st-sub [data-tab=categories]');
          const heights = await page.locator('[data-action=add-cat], #add-kw-form button[type=submit]').evaluateAll(es => es.map(e => e.getBoundingClientRect().height));
          assert.strictEqual(heights.length, 2);
          assert.strictEqual(heights[0], heights[1], 'category and keyword actions differ in height');
          await page.click('#tab-settings');
          await page.click('[data-fn=aiSetup]');
          await page.mouse.move(0, 0);
          const selected = page.locator('.web-way.current:visible').first();
          const before = await selected.evaluate(e => getComputedStyle(e).backgroundColor);
          await selected.hover();
          assert.strictEqual(await selected.evaluate(e => getComputedStyle(e).backgroundColor), before, 'hover erased selected fill');
          assert.deepStrictEqual(await page.locator('.ai-footer button').evaluateAll(es => es.map(e => e.dataset.x)), ['cancel', 'go']);
          assert.ok(await page.locator('.ai-footer').evaluate(e => e.scrollWidth <= e.clientWidth), 'AI footer overflow');
          if (process.env.SHOTS && width === 390) await page.screenshot({ path: `${process.env.SHOTS}/ai-${lang}-${theme}.png` });
          await page.click('.ai-footer [data-x=cancel]');
        }
      }
    }
    await page.click('#demo-bar [data-tour=again]');
    await page.waitForSelector('#tour-card');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#demo-bar');
    assert.deepStrictEqual(errors, [], 'browser errors');
    console.log('presentation: shared buttons, headers, mobile choices, AI selection/footer and demo translations passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
