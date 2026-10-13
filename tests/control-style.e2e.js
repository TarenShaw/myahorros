/* Shared control styles and their behavior, using isolated example data.
   python -m http.server 8000; NODE_PATH=<playwright folder> node tests/control-style.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const theme of ['light', 'dark']) for (const lang of ['en', 'es']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
      await ctx.addInitScript(({ theme, lang }) => {
        window.__ybtTest = true;
        localStorage.setItem('ybt.theme', theme);
        localStorage.setItem('ybt.lang', lang);
      }, { theme, lang });
      await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const style = selector => page.locator(selector).first().evaluate(e => {
        const s = getComputedStyle(e);
        return { radius: s.borderRadius, height: e.getBoundingClientRect().height, bg: s.backgroundColor, color: s.color, arrow: s.backgroundImage, outline: s.outlineStyle };
      });
      const selected = async selector => {
        const actual = await style(selector);
        const expected = await style('.seg button[aria-pressed=true]');
        assert.strictEqual(actual.bg, expected.bg, `${selector}: selection fill`);
        assert.strictEqual(actual.color, expected.color, `${selector}: selection text`);
      };
      await page.goto(START);
      assert.strictEqual((await style('.wl-hero .btn')).radius, '999px', 'landing button keeps the pill style');
      await page.locator('.web-lang button[aria-pressed=true]').focus();
      assert.strictEqual((await style('.web-lang button[aria-pressed=true]')).outline, 'solid', 'language focus is visible');
      await page.click('.wl-hero [data-x=demo]');
      await page.waitForSelector('#tour-card');
      await page.keyboard.press('Escape');
      for (const width of [1440, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: width > 640 ? 1000 : 844 });
        for (const tab of ['overview', 'networth', 'transactions', 'yearly', 'settings', 'categories']) {
          if (tab === 'categories') await page.click('.st-sub [data-tab=categories]');
          else await page.click('#tab-' + tab);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 ? [...document.querySelectorAll('#view *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ tag: e.tagName, id: e.id, cls: e.className, text: e.textContent.slice(0, 80), right: e.getBoundingClientRect().right })).slice(0, 8) : []);
          assert.deepStrictEqual(overflow, [], `${tab}/${width}: page overflow`);
          if (width <= 640) {
            const small = await page.locator('.btn.sm:visible').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height < 40).map(e => e.textContent.trim()));
            assert.deepStrictEqual(small, [], `${tab}/${width}: small touch buttons`);
          }
          if (tab === 'settings') {
            const choice = await style('.radio-card:has(input:checked)');
            const segment = await style('.seg button[aria-pressed=true]');
            assert.strictEqual(choice.bg, segment.bg, 'radio cards share the selection fill');
          }
          if (tab === 'categories') {
            assert.notStrictEqual((await style('.kw-row select')).arrow, 'none', 'keyword categories show a dropdown arrow');
            assert.strictEqual((await style('.lim-btn')).radius, '999px', 'budget control shape');
          }
          if (tab === 'transactions') {
            if (!await page.locator('.tx-filter-panel').evaluate(e => e.open)) await page.locator('.tx-filter-panel>summary').click();
            assert.ok(await page.locator('.tx-filter-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'expanded filter overflow');
            await page.fill('#tx-q', 'Groceries');
            assert.strictEqual(await page.inputValue('#tx-q'), 'Groceries');
            await page.selectOption('#tx-month', '0');
            assert.strictEqual(await page.inputValue('#tx-month'), '0');
            await page.click('[data-action=tx-clear]');
            assert.notStrictEqual((await style('.tx td.k select')).arrow, 'none', 'ledger categories show a dropdown arrow');
            await page.click('[data-action=tx-save-view]');
            assert.strictEqual((await style('#view-name')).radius, '999px');
            assert.ok((await style('#view-name')).height >= 44, 'saved-view field size');
            await page.fill('#view-name', `Controls ${width}`);
            await page.locator('#view-name').press('Enter');
            await page.waitForSelector('#save-view-form', { state: 'detached' });
            await page.waitForFunction(name => [...document.querySelector('#tx-saved-view').options].some(o => o.textContent === name), `Controls ${width}`);
            const saved = await page.locator('#tx-saved-view option').filter({ hasText: `Controls ${width}` }).getAttribute('value');
            await page.selectOption('#tx-saved-view', saved);
            assert.strictEqual(await page.inputValue('#tx-saved-view'), saved, 'saved view can be selected');
            await page.locator('#btn-hide').focus();
            await page.keyboard.press('Space');
            assert.strictEqual(await page.getAttribute('#btn-hide', 'aria-pressed'), 'true');
            await selected('#btn-hide');
            await page.keyboard.press('Space');
            assert.strictEqual(await page.getAttribute('#btn-hide', 'aria-pressed'), 'false');
            await page.click('#view [data-action=add-tx]');
            await page.selectOption('#f-table', 'expenses');
            await page.fill('#f-concept', 'Control check');
            await page.fill('#f-amount', '0');
            await page.locator('#tx-form button[type=submit]').click();
            assert.ok(await page.locator('#f-err').isVisible(), 'zero amount validation remains visible');
            const dialog = await page.locator('#overlay .modal').evaluate(e => ({ width: e.clientWidth, content: e.scrollWidth, rect: e.getBoundingClientRect().toJSON() }));
            assert.ok(dialog.content <= dialog.width + 1 && dialog.rect.x >= 0 && dialog.rect.right <= width, 'transaction dialog fits');
            await page.keyboard.press('Escape');
          }
        }
      }
      await page.click('#tab-transactions');
      await page.click('#view [data-action=import]');
      await page.evaluate(() => window.__ybt.finishImport([{ date: '2026-09-28', amount: -20, concept: 'Control choice', table: 'expenses', aiQ: 'Which purchase? A) Groceries for the household across several shops B) A restaurant meal shared with friends C) Something else to review' }], [], 'control-check.csv'));
      const answer = page.locator('[data-action=ai-opt]').first();
      await answer.click();
      assert.strictEqual(await answer.getAttribute('aria-pressed'), 'true', 'chosen AI answer is announced');
      const choice = await answer.evaluate(e => ({ height: e.clientHeight, content: e.scrollHeight, radius: getComputedStyle(e).borderRadius }));
      assert.ok(choice.height >= 40 && choice.content <= choice.height + 1, 'long answer fits its touch control');
      assert.strictEqual(choice.radius, '999px');
      assert.deepStrictEqual(errors, [], 'browser errors');
      await ctx.close();
      console.log(`${theme}/${lang}: shapes, selection states, dropdown cues, touch sizes, filters, saved views, keyboard privacy and validation passed`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
