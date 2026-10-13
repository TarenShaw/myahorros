/* Guided reconciliation and investment statement imports, using fictional data.
   NODE_PATH=<playwright folder> node tests/nw-review.e2e.js */
const {chromium}=require('playwright'),assert=require('assert');
const START=process.env.START_URL||'http://localhost:8000/';
const data=lang=>({app:'Yearly Budget Tracker',format:1,months:{'2026-09':{
  income:[{id:'salary',date:'2026-09-01',amount:1000,concept:'Salary',category:'Salary'}],
  expenses:[{id:'rent',date:'2026-09-02',amount:-800,concept:'Rent',category:'Rent'}],
  investments:[{id:'deposit',date:'2026-09-03',amount:-200,concept:'Unknown platform transfer',category:'Funds'}]
}},config:{categories:{income:[{name:'Salary'},{name:'Interest'}],expenses:[{name:'Rent',type:'fixed'}],investments:[{name:'Funds'}]},
  settings:{lang,numFmt:'en',currency:'EUR',start:{y:2026,m:8},guide:{on:false,done:true}},
  networth:{accounts:[{id:'cash',name:'Main Bank',group:'cash'},{id:'fund',name:'Broker',group:'invest'}],
    snaps:{'2026-08':{cash:1000,fund:1000},'2026-09':{cash:1008.7,fund:1250}}}}});
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try{for(const lang of ['en','es'])for(const width of [1280,390]){
    const context=await browser.newContext({viewport:{width,height:860}}),p=await context.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(String(e)));
    await context.addInitScript(l=>{window.__ybtTest=true;localStorage.setItem('ybt.lang',l);localStorage.setItem('ybt.theme','dark');},lang);
    await context.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
    await p.goto(START);
    await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},data(lang));
    await p.reload();await p.waitForFunction(()=>window.__ybtWeb.store||document.querySelector('.wl-hero [data-x=open]'));
    if(await p.locator('.wl-hero [data-x=open]').count())await p.click('.wl-hero [data-x=open]');
    await p.waitForFunction(()=>window.__ybt?.S.months['2026-09']);
    await p.click('#tab-networth');
    assert.equal(await p.locator('button.nw-review').evaluate(el=>getComputedStyle(el).backgroundColor),await p.evaluate(()=>{
      const x=document.createElement('span');x.style.background='var(--warn)';document.body.append(x);const c=getComputedStyle(x).backgroundColor;x.remove();return c;
    }));
    await p.click('button.nw-review');
    assert.equal(await p.locator('.nw-review-item').count(),1);
    assert.match(await p.locator('.nw-review-item').innerText(),/Unknown platform transfer/);
    await p.selectOption('#nr-0','fund');await p.click('[data-action=nw-review-link]');
    assert.equal(await p.evaluate(()=>window.__ybt.nwGains('2026-08','2026-09').get('fund')),50);
    assert.equal(await p.evaluate(()=>window.__ybt.nwSplit('2026-08','2026-09').left),8.7);
    await p.click('[data-action=nw-review-step][data-i="1"]');
    assert.match(await p.locator('.m-body').innerText(),lang==='en'?/not tied to a specific transaction/:/no corresponde a un movimiento concreto/);
    assert.ok(await p.locator('#overlay .modal').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
    assert.ok(await p.locator('.nw-review-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'review contents fit the dialog');
    if(process.env.SHOTS)await p.locator('#overlay .modal').screenshot({path:process.env.SHOTS+`/review-${lang}-${width}.png`});
    await p.click('[data-action=nw-review-balance][data-k="2026-09"]');
    await p.fill('#nwv-cash','1000');await p.click('#nw-snap-form button[type=submit]');
    await p.waitForSelector('.nw-review-status');assert.equal(await p.evaluate(()=>window.__ybt.nwSplit('2026-08','2026-09').left),0);
    await p.locator('#overlay button[data-action=close]').first().click();
    // Transactions-only AI mode must still open balance review when no budget rows exist.
    await p.evaluate(()=>window.__ybt.aiApply({mode:'tx',files:[],rules:'',lang:'en'},
      {rows:[],accounts:[{name:'Broker',group:'invest',match:'fund',balances:[['2026-09',1250,150]]}],notes:'Fictional statement'},1));
    assert.ok(await p.isEnabled('[data-action=nwimp-go]'),'contribution-only change is importable with an unchanged balance');
    assert.match(await p.locator('.nw-review-item').innerText(),/150/);
    await p.click('[data-action=nwimp-go]');
    assert.equal(await p.evaluate(()=>window.__ybt.S.nw.contributions['2026-09'].fund),150);
    assert.equal(await p.evaluate(()=>window.__ybt.nwGains('2026-08','2026-09').get('fund')),100);
    await p.waitForFunction(()=>window.__ybtWeb.store.config.networth.contributions?.['2026-09']?.fund===150);
    await p.reload();await p.waitForFunction(()=>window.__ybt?.S.nw?.contributions?.['2026-09']?.fund===150);
    await p.click('#tab-networth');
    assert.equal(await p.evaluate(()=>window.__ybt.nwGains('2026-08','2026-09').get('fund')),100,'statement contributions survive reload');
    // Contribution overrides are editable and clearing one restores linked transactions.
    await p.locator('[data-action=nw-snap][data-k="2026-09"]').first().click();
    assert.equal(await p.inputValue('#nwf-fund'),'150.00');
    await p.fill('#nwf-fund','');await p.click('#nw-snap-form button[type=submit]');
    assert.equal(await p.evaluate(()=>window.__ybt.nwGains('2026-08','2026-09').get('fund')),50);
    assert.equal(await p.locator('button.nw-review').count(),0);
    if(lang==='en'&&width===1280){
      await p.evaluate(()=>{const a=window.__ybt;a.S.nw.snaps['2026-09'].cash=1008.7;a.saveNw();a.render();});
      await p.click('button.nw-review');await p.click('[data-action=nw-review-step][data-i="1"]');await p.click('[data-action=nw-review-import]');
      await p.evaluate(()=>window.__ybt.aiApply({mode:'tx',files:[],rules:'',lang:'en'},
        {rows:[['2026-09-04',1,'Another salary','income','Salary','broker.csv','',0,[]]],accounts:[{name:'Broker',group:'invest',match:'fund',balances:[['2026-09',1250,200]]}]},1));
      await p.click('[data-action=imp-add]');await p.waitForSelector('[data-action=nwimp-go]');
      await p.click('[data-action=nwimp-go]');await p.waitForSelector('.nw-review-status');
      assert.equal(await p.evaluate(()=>window.__ybt.S.nw.contributions['2026-09'].fund),200,'transaction import from Review continues to its pending balance review');
      await p.locator('#overlay button[data-action=close]').first().click();
    }
    assert.ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));
    assert.deepEqual(errors,[]);
    console.log(`${lang} ${width}px: yellow, link, reconcile, edit/return, balance-only AI import and contribution correction passed`);
    await context.close();
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
