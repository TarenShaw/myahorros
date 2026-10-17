/* First visit, optional tips, demo isolation and returning visitors.
   Serve the repo on :8000, then run with Playwright's Edge channel. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const START = process.env.START_URL || 'http://localhost:8000/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const errors = [];
  try {
    for (const [lang, width, scheme] of [['en',1280,'dark'],['es',390,'light']]) {
      const ctx = await browser.newContext({viewport:{width,height:860},colorScheme:scheme,serviceWorkers:'block'});
      await ctx.addInitScript(lang => { window.__ybtTest=true; localStorage.setItem('ybt.lang',lang); },lang);
      await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
      const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
      await p.goto(START);
      const img=p.locator('.wl-pages img'); await img.evaluate(i=>i.decode());
      assert.equal(await img.getAttribute('src'),`images/landing-overview-${scheme}${lang==='es'?'-es':''}.webp`);
      await p.click('.wl-hero [data-x=demo]'); await p.waitForSelector('#demo-bar');
      assert.equal(await p.locator('#tour-card').count(),0,'demo opens without a mandatory tour');
      assert.equal(await p.locator('.summary-totals .tile').count(),3);
      assert.equal(await p.locator('#tab-yearly').count(),0);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'demo horizontal overflow');
      await p.click('#tab-settings');
      await p.evaluate(()=>{window.__ybt.S.local.saveCopy=()=>{window.__demoSaved=true;};});
      await p.click('[data-action=local-save]');
      assert.equal(await p.evaluate(()=>!!window.__demoSaved),false,'demo cannot download a real tracker backup');
      await p.click('#demo-bar [data-tour=again]');
      const steps=await p.evaluate(()=>window.__ybt.TOUR_STEPS.map(s=>s.k));
      assert.equal(steps.length,5,'three tips plus introduction and end');
      for(let i=1;i<steps.length;i++) {
        await p.waitForFunction(i=>{
          const s=window.__ybt.TOUR_STEPS[i],c=document.querySelector('#tour-card');
          return c&&c.style.visibility!=='hidden'&&(!s.el||s.el()?.getClientRects().length);
        },i);
        const rect=await p.locator('#tour-card').boundingBox();
        assert.ok(rect.x>=0&&rect.x+rect.width<=width+1&&rect.y>=0&&rect.y+rect.height<=861,`tip ${steps[i]} fits ${width}px`);
        assert.ok(!/undefined/.test(await p.locator('#tour-card').innerText()));
        if(i<steps.length-1){const title=await p.locator('#tour-title').innerText();await p.click('#tour-card [data-tour=next]');await p.waitForFunction(t=>document.querySelector('#tour-title').textContent!==t,title);}
      }
      await p.click('#tour-card [data-tour=end]'); await p.waitForSelector('[data-m=browser]');
      assert.equal(await p.locator('[data-m=folder]').isVisible(),false,'folder storage is optional');
      for(let i=0;i<12;i++)await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(()=>document.querySelector('.web-panel').contains(document.activeElement)),'storage focus stays inside');
      const saved=await p.evaluate(async()=>JSON.parse(await window.__ybtWeb.idb.get('data')||'{}'));
      assert.deepEqual(saved.months||{},{}); assert.deepEqual(saved.config?.networth?.accounts||[],[]);
      await p.click('[data-m=browser]'); await p.waitForSelector('#simple-start-form');
      await p.fill('#ob-account',lang==='es'?'Mi banco':'Everyday'); await p.selectOption('#ob-currency','EUR');
      await p.click('[data-action=simple-manual]'); await p.waitForSelector('#tx-form');
      assert.equal(await p.locator('.wz-body,#st-born,#st-salary').count(),0);
      await p.selectOption('#f-table','income'); await p.fill('#f-date','2025-01-28');
      await p.fill('#f-concept','Salary'); await p.fill('#f-amount','2100');
      await p.locator('#tx-form').evaluate(f=>f.requestSubmit());
      await p.waitForFunction(()=>window.__ybt.S.settings.start.y===2025);
      await p.click('#tab-overview');
      // A hand-entered historical transaction must be visible without a period correction.
      assert.equal(await p.inputValue('#summary-period'),'2025-01');
      await p.waitForFunction(()=>!window.YBT_BUSY());
      await p.reload(); await p.waitForSelector('#summary-period');
      assert.equal(await p.locator('.web-landing,.wz-body').count(),0);
      assert.equal(await p.evaluate(()=>window.__ybt.allRows().length),1);
      if(process.env.SHOTS)await p.screenshot({path:`${process.env.SHOTS}/onboarding-${lang}-${width}.png`,fullPage:true});
      console.log(`${lang}, ${width}px: demo, tips, storage, manual setup and reload passed`);
      await ctx.close();
    }
    assert.deepEqual(errors,[]); console.log('landing-onboarding: all passed');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
