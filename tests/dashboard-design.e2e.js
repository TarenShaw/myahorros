/* Northstar layout, theme and navigation checks in an isolated demo.
   python -m http.server 8000; NODE_PATH=<playwright folder> node tests/dashboard-design.e2e.js
   Set SHOTS=<folder> to save desktop/mobile previews. */
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('ybt.lang', 'en'));
    await context.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(START);
    await page.click('.web-landing .wl-hero [data-x=demo]');
    await page.waitForSelector('#tour-card');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#demo-bar');
    await page.click('#tab-overview');
    await page.waitForSelector('.hero-num');
    const amount = await page.innerText('.hero-num');
    if (process.env.SHOTS) fs.mkdirSync(process.env.SHOTS, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await page.click('#tab-settings');
      await page.check('#st-theme-' + theme);
      await page.waitForFunction(t => document.documentElement.dataset.ybtTheme === t, theme);
      await page.click('#tab-overview');
      assert.strictEqual(await page.innerText('.hero-num'), amount, 'theme changed the saved amount');
      for (const width of [1440, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: width > 640 ? 1000 : 844 });
        await page.waitForFunction(vertical => document.querySelector('.tabs').getAttribute('aria-orientation') === (vertical ? 'vertical' : 'horizontal'), width >= 1180);
        for (const tab of ['overview', 'networth', 'transactions', 'yearly', 'settings']) {
          await page.click('#tab-' + tab);
          await page.waitForFunction(t => document.querySelector('#tab-' + t).getAttribute('aria-selected') === 'true', tab);
          assert.ok(await page.locator('.page-title').isVisible(), `${tab} title missing at ${width}`);
          const layout = await page.evaluate(() => ({
            page: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
            nav: document.querySelector('.tabs').getBoundingClientRect().toJSON(),
            view: document.querySelector('#view').getBoundingClientRect().toJSON()
          }));
          assert.ok(layout.content <= layout.page + 1, `${tab} overflows at ${width}: ${JSON.stringify(layout)}`);
          if (width >= 1180) assert.ok(layout.nav.right < layout.view.left, 'sidebar overlaps the content');
          if (tab === 'transactions') {
            const gap = await page.evaluate(() => {
              const notice = document.querySelector('#view>.notice');
              return notice && notice.nextElementSibling.getBoundingClientRect().top - notice.getBoundingClientRect().bottom;
            });
            assert.ok(gap >= 16, 'transaction notice touches the review selector');
          }
        }
        await page.click('#tab-overview');
        if (process.env.SHOTS) await page.waitForSelector('#toast .toast', { state: 'hidden' });
        await page.click('[data-action="import-menu"]');
        await page.waitForSelector('.import-menu');
        const menuLayout = await page.locator('.import-menu').evaluate(e => ({
          rect: e.getBoundingClientRect().toJSON(), width: e.clientWidth, content: e.scrollWidth,
          viewport: innerWidth, height: innerHeight
        }));
        assert.ok(menuLayout.content <= menuLayout.width + 1, 'import choices overflow horizontally');
        assert.ok(menuLayout.rect.x >= 0 && menuLayout.rect.right <= menuLayout.viewport && menuLayout.rect.bottom <= menuLayout.height, 'import dialog clips outside the screen');
        assert.strictEqual(await page.locator('.import-menu .ob-way').count(), 2);
        if (process.env.SHOTS && [1440, 390].includes(width)) {
          const shot = width > 640 ? page.locator('.import-menu') : page;
          await shot.screenshot({ path: `${process.env.SHOTS}/import-C-${theme}-${width}.png` });
        }
        await page.locator('.import-menu .m-foot [data-action="close"]').click();
        await page.waitForSelector('.import-menu', { state: 'detached' });
        if (process.env.SHOTS && [1440, 390].includes(width)) {
          await page.waitForSelector('#toast .toast', { state: 'hidden' });
          await page.screenshot({ path: `${process.env.SHOTS}/${theme}-${width}.png` });
        }
      }
    }
    await page.click('#btn-hide');
    assert.notStrictEqual(await page.innerText('.hero-num'), amount, 'privacy control no longer hides amounts');
    await page.click('#btn-hide');
    assert.strictEqual(await page.innerText('.hero-num'), amount);
    await page.click('#tab-settings');
    await page.check('#st-lang-es');
    await page.setViewportSize({ width: 1440, height: 1000 });
    const sidebarFits = await page.evaluate(() => {
      const tab = document.querySelector('#tab-transactions'), badge = tab.querySelector('.badge'), label = tab.querySelector('.tl');
      badge.textContent = '12345';
      return label.scrollWidth <= label.clientWidth + 1 && badge.getBoundingClientRect().right <= tab.getBoundingClientRect().right - 8;
    });
    assert.ok(sidebarFits, 'Spanish sidebar label or large count is clipped');
    await page.click('#tab-overview');
    assert.strictEqual(await page.getAttribute('html', 'lang'), 'es');
    assert.strictEqual(await page.innerText('.hero-num'), amount);
    await page.click('[data-action="import-menu"]');
    await page.waitForSelector('#overlay .modal');
    assert.ok(await page.locator('#overlay .modal').isVisible(), 'Spanish import dialog missing');
    assert.strictEqual(await page.locator('.modal-eyebrow').textContent(), 'Mantén tu control al día');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 568 });
    for (const [action, target] of [['guide-import', '#imp-text'], ['import-balances', '#nw-snap-form'], ['guide-nwimport', '.nwimp-steps']]) {
      await page.click('#tab-overview');
      await page.click('[data-action="import-menu"]');
      await page.locator('.import-menu [data-action="' + action + '"]').click();
      await page.waitForSelector(target);
      assert.strictEqual(await page.locator('.import-menu').count(), 0, 'chooser styling leaked into another dialog');
      await page.keyboard.press('Escape');
    }
    await page.click('#tab-settings');
    await page.check('#st-theme-system');
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
      assert.strictEqual(bg, theme === 'light' ? '#F3F6FC' : '#0C1424', 'automatic theme ignored device preference');
    }
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    for (const asset of ['northstar.css', 'assets/northstar/background-light-glow.svg', 'assets/northstar/background-dark-glow.svg']) {
      assert.ok(await page.evaluate(async asset => (await fetch(asset)).ok, asset), `asset unavailable offline: ${asset}`);
    }
    assert.deepStrictEqual(errors, [], 'browser errors');
    console.log('dashboard-design: themes, navigation, privacy, Spanish dialogs, responsive layout and offline assets passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
