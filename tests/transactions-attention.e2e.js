/* node tests/transactions-attention.e2e.js (Playwright + localhost:8000) */
const {chromium}=require('playwright'), assert=require('assert');
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try { for(const width of [1280,390]) {
    const context=await browser.newContext({viewport:{width,height:860}}), page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en');});
    await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
    await page.goto(process.env.START_URL||'http://localhost:8000');
    await page.evaluate(async()=>{
      localStorage.setItem('ybt.storage','browser');
      await window.__ybtWeb.idb.set('data',JSON.stringify({app:'Yearly Budget Tracker',format:1,
        months:{'2026-09':{income:[],expenses:[
          {id:'ready',date:'2026-09-01',concept:'Known shop',amount:-20,category:'Groceries'},
          {id:'blank',date:'2026-09-02',concept:'Unknown shop',amount:-30,category:''}
        ],investments:[]}},config:{categories:{income:[],expenses:[{name:'Groceries',type:'variable'}],investments:[]},
          settings:{lang:'en',start:{y:2026,m:0},fixedVar:1,currency:'EUR'}}}));
    });
    await page.reload();
    await page.waitForFunction(()=>window.__ybtWeb.store||document.querySelector('.web-landing .wl-hero [data-x=open]'));
    const open=page.locator('.web-landing .wl-hero [data-x=open]');
    if(await open.count()) await open.click();
    await page.waitForFunction(()=>window.__ybt&&window.__ybt.S.months['2026-09']);
    await page.evaluate(()=>{const {S,render}=window.__ybt;S.ui.tab='transactions';S.ui.year=2026;render();});
    await page.locator('.seg [data-action=tx-review-mode][data-v=attention]').click();
    assert.equal(await page.locator('table.tx tr[data-action=edit-tx]').count(),1);
    assert.equal(await page.locator('.seg [data-v=attention][data-action=tx-review-mode]').getAttribute('aria-pressed'),'true');
    await page.locator('#cs-blank').selectOption('Groceries');
    assert.equal(await page.locator('table.tx tr[data-action=edit-tx]').count(),0);
    await page.locator('[data-action=tx-review-mode][data-v=all]').click();
    assert.equal(await page.locator('table.tx tr[data-action=edit-tx]').count(),2);
    assert.equal(await page.locator('.notice').count(),0);
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ybt-lang',{detail:'es'})));
    assert.match(await page.locator('.seg [data-action=tx-review-mode][data-v=attention]').innerText(),/Necesita revisión/);
    assert.ok(await page.locator('.seg:has([data-action=tx-review-mode])').evaluate(el=>{
      const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;
    }),'filter fits viewport');
    assert.deepEqual(errors,[]);
    console.log(width+'px: attention, classify, All rows, Spanish and layout passed');
    await context.close();
  }} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
