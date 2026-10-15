/* Setup presentation checks with fictional accounts. Same setup as landing-wizard.e2e.js. */
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    if (process.env.SHOTS) fs.mkdirSync(process.env.SHOTS, { recursive: true });
    for (const lang of ['en', 'es']) for (const theme of ['light', 'dark']) for (const width of [1440, 360, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width < 640 ? 740 : 900 }, serviceWorkers: 'block' });
      await context.addInitScript(({ lang, theme }) => {
        localStorage.setItem('ybt.lang', lang); localStorage.setItem('ybt.theme', theme);
      }, { lang, theme });
      await context.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(START);
      await page.click('.wl-hero [data-x=start]');
      await page.click('.web-way[data-m=browser]');
      assert.ok(await page.locator('.welcome .ob-way').evaluateAll(es => es.every(e => e.querySelector('span').getBoundingClientRect().top >= e.querySelector('b').getBoundingClientRect().bottom)), 'welcome descriptions must sit below titles');
      await page.click('[data-action=ob-start]');
      await page.waitForSelector('.wz-setup');
      assert.ok(!await page.locator('#wz-born').isVisible(), 'personal details should start collapsed');
      assert.strictEqual(await page.locator('.wz-setup .btn.primary:visible').count(), 1, 'optional save competes with account setup');
      await page.locator('.wz-about summary').focus();
      await page.keyboard.press('Enter');
      assert.ok(await page.locator('#wz-born').isVisible(), 'optional details do not open by keyboard');
      assert.ok(!await page.locator('[data-prefix=wz]').evaluate(e => e.classList.contains('primary')));
      await page.locator('.wz-about summary').click();
      await page.click('[data-action=wz-scope][data-v=history]');
      assert.strictEqual(await page.locator('#wz-from').evaluate(e => e.getBoundingClientRect().height), 44);
      const scope = await page.locator('.wz-scope button').evaluateAll(es => es.map(e => e.getBoundingClientRect().width));
      assert.ok(Math.abs(scope[0] - scope[1]) < 1, 'setup choices have unequal widths');
      await page.fill('#wz-from', '2026-01');
      assert.strictEqual(await page.inputValue('#wz-from'), '2026-01', 'native month choice lost on render');
      if (process.env.SHOTS && width !== 320) await page.screenshot({ path: `${process.env.SHOTS}/${lang}-${theme}-${width}-start.png` });
      await page.click('[data-action=guide-acc]');
      await page.locator('#nw-acc-form [data-action=na-add][data-g=cash]').first().click();
      await page.locator('#nw-acc-form [data-action=na-add][data-g=invest]').first().click();
      await page.click('#nw-acc-form button[type=submit]');
      await page.waitForSelector('.wz-setup');
      for (let step = 0; step < 5; step++) {
        const label = `${lang}/${theme}/${width}/step ${step + 1}`;
        assert.ok(await page.locator('#overlay .modal').evaluate(e => e.scrollWidth <= e.clientWidth), `modal overflow: ${label}`);
        assert.ok(await page.locator('.wz-setup .wz-list li').evaluateAll(es => es.every(e => {
          const name = e.querySelector('.wz-n'), status = e.querySelector('.wz-st');
          if (!name || !status) return true;
          const n = name.getBoundingClientRect(), s = status.getBoundingClientRect();
          return n.width > e.clientWidth / 2 && s.top >= n.bottom && status.scrollWidth <= status.clientWidth;
        })), `account text is squeezed or overlaps: ${label}`);
        if (width <= 640) {
          const markers = await page.locator('.wz-dots li>span').evaluateAll(es => es.map(e => e.getBoundingClientRect().top));
          assert.strictEqual(markers.length, 5);
          assert.ok(markers.every(y => Math.abs(y - markers[0]) < 1), `progress markers wrap: ${label}`);
          const current = await page.locator('.wz-current-step').innerText();
          assert.strictEqual(current, await page.locator('.wz-dots [aria-current=step] small').textContent());
          assert.ok(await page.locator('.wz-footer').evaluate(e => {
            const sides = [...e.children].map(x => x.getBoundingClientRect());
            return Math.abs(sides[0].width - sides[1].width) < 1 && sides[0].right <= sides[1].left && e.scrollWidth <= e.clientWidth;
          }), `footer columns do not fit: ${label}`);
        }
        if (step === 1) assert.strictEqual(await page.locator('.wz-setup [data-action=ai-tx]').innerText(), lang === 'en' ? 'Fill in with AI' : 'Rellenar con IA');
        if (step === 2) assert.deepStrictEqual(await page.locator('.wz-setup .wz-acts button').evaluateAll(es => es.map(e => e.dataset.action)), ['ai-nw', 'guide-nwimport', 'guide-val']);
        if (process.env.SHOTS && width !== 320) await page.screenshot({ path: `${process.env.SHOTS}/${lang}-${theme}-${width}-step-${step + 1}.png` });
        if (step < 4) await page.click('[data-action=wz-next]');
      }
      await page.click('[data-action=guide-finish]');
      assert.strictEqual(await page.locator('.wz-setup').count(), 0, 'finish did not close wizard');
      assert.deepStrictEqual(errors, [], 'browser errors');
      await context.close();
    }
    console.log('wizard-presentation: all five steps, account rows, optional details, progress, fields, choices and actions passed in EN/ES, light/dark, desktop/phone');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
