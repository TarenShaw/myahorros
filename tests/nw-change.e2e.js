/* Compact Net worth cards and scenario: fictional figures, signed contributions and live what-if controls.
   NODE_PATH=<playwright folder> node tests/nw-change.e2e.js */
const {chromium}=require('playwright'),assert=require('assert');
const START=process.env.START_URL||'http://localhost:8000/';
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try{for(const lang of ['en','es']){
    const ctx=await browser.newContext({viewport:{width:1280,height:860}}),errors=[];
    await ctx.addInitScript(l=>{window.__ybtTest=true;localStorage.setItem('ybt.lang',l);localStorage.setItem('ybt.theme','dark');},lang);
    await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
    const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
    await p.goto(START);await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');await p.click('#tab-networth');
    const load=async(left=0,gains=50,fresh=0,missing=false)=>p.evaluate(({lang,left,gains,fresh,missing})=>{
      const D={app:'Yearly Budget Tracker',format:1,months:{'2026-09':{income:[{id:'salary',date:'2026-09-10',amount:1000,concept:'Example salary',category:'Salary'}],expenses:[{id:'rent',date:'2026-09-11',amount:-800,concept:'Example rent',category:'Rent'}],investments:[]}},
        config:{settings:{lang,start:{y:2026,m:8},guide:{done:true,on:false}},networth:{accounts:[{id:'cash',name:'Example cash',group:'cash'},{id:'fund',name:'Example fund',group:'invest'}],goal:{amount:5000,month:'2027-09'},snaps:{'2026-08':{cash:1000,fund:1000},'2026-09':{cash:1200+left,fund:1000+gains}}}}};
      if(fresh){D.config.networth.accounts.push({id:'new',name:'Example newly tracked fund',group:'invest'});D.config.networth.snaps['2026-09'].new=fresh;}
      if(missing)D.months={};
      window.__ybt.loadDataset(D,false);window.__ybt.S.ui.nw.month='2026-09';window.__ybt.S.ui.analysis={networth:true};window.__ybt.render();
    },{lang,left,gains,fresh,missing});
    for(const width of [1280,390]){
      await p.setViewportSize({width,height:860});await load(10);
      const card=p.locator('.nw-change');assert.strictEqual(await card.locator('.nw-change-stat').count(),3);
      const sums=await card.locator('.nw-change-stat .nw-sval').allTextContents();
      assert(sums[0].includes('260'),'total stays 260');assert(sums[1].includes('50'),'gains stay 50');assert(sums[2].includes('10'),'review stays 10');
      assert.strictEqual(await card.locator('.nw-body>.nw-bar').count(),1,'one combined bar');
      assert.strictEqual(await card.locator('.nw-bar>i').count(),3);assert.strictEqual(await card.locator('.nw-review').count(),1);
      await card.locator('.nw-review>summary').click();assert((await card.locator('.nw-review').innerText()).includes('10'));await card.locator('.nw-review>summary').click();
      assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'no horizontal overflow');
      if(process.env.SHOTS)await card.screenshot({path:process.env.SHOTS+'/change-'+lang+'-'+width+'.png'});
      await load();assert.strictEqual(await card.locator('.nw-change-stat').count(),2);assert.strictEqual(await card.locator('.nw-review').count(),0);assert.strictEqual(await card.locator('.nw-bar>i.left').count(),0);
      await load(0,-50);assert.strictEqual(await card.locator('.nw-bar>i.market.neg').count(),1,'negative gains remain red');assert(/[−-]50/.test(await card.locator('.nw-change-stat.market').innerText()));
      await load(0,50,500);assert((await card.locator('.nw-mix-leg').innerText()).includes('500'),'new-account value remains visible');assert.strictEqual(await card.locator('.nw-bar>i.fresh').count(),1);
      await load(0,50,0,true);assert.strictEqual(await card.locator('.nw-change-stats').count(),0,'missing statements must not pretend to explain changes');
      await load();
      const goal=p.locator('.nw-goal');assert.strictEqual(await goal.locator('.nw-stat').count(),3);
      assert.deepStrictEqual(await goal.locator('.nw-stat-v').allTextContents(),['2.750 €','229 €','200 €']);
      assert.strictEqual(await goal.locator('.nw-body .nw-mix').count(),1);assert.strictEqual(await goal.locator('.nw-mix>i').count(),2);
      const legend=await goal.locator('.nw-mix-leg').innerText();assert(legend.includes('2.400')&&legend.includes('350'),'saving and growth amounts unchanged');
      const rects=await goal.locator('.nw-stat').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().width));assert(rects.every(w=>Math.abs(w-rects[0])<1),'equal goal boxes');
      if(process.env.SHOTS)await goal.screenshot({path:process.env.SHOTS+'/goal-'+lang+'-'+width+'.png'});
      const stored=await p.evaluate(()=>JSON.stringify(window.__ybt.S.nw));
      await p.fill('#scenario-extra','150');await p.fill('#scenario-months','12');
      assert((await p.innerText('#scenario-result')).includes('6.450'),'live hypothetical total');assert((await p.innerText('#scenario-baseline')).includes('4.650'));assert((await p.innerText('#scenario-impact')).includes('1.800'));
      await p.click('[data-action=scenario-period][data-n="6"]');assert.strictEqual(await p.inputValue('#scenario-months'),'6');assert((await p.innerText('#scenario-impact')).includes('900'));
      const goalPreset=p.locator('.scenario-presets button:not([aria-pressed])');await goalPreset.click();assert.strictEqual(await p.inputValue('#scenario-months'),'12','goal date shortcut uses latest recorded month');
      await p.fill('#scenario-extra','-1');assert(await p.isVisible('#scenario-error'));assert.strictEqual(await p.getAttribute('#scenario-extra','aria-invalid'),'true');
      await p.fill('#scenario-extra','150');assert(!(await p.isVisible('#scenario-error')));
      await p.fill('#scenario-months','1.5');assert(await p.isVisible('#scenario-error'));await p.fill('#scenario-months','601');assert(await p.isVisible('#scenario-error'));await p.fill('#scenario-months','12');
      assert.strictEqual(await p.evaluate(()=>JSON.stringify(window.__ybt.S.nw)),stored,'scenario must not alter stored figures or goal');
      assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'scenario must fit phones');
      if(process.env.SHOTS)await p.locator('#savings-scenario').screenshot({path:process.env.SHOTS+'/scenario-'+lang+'-'+width+'.png'});
      await p.evaluate(()=>{const a=window.__ybt;a.S.nw.goal.amount=3000;a.render();});
      assert.strictEqual(await goal.locator('.nw-mix>i').count(),1,'saving alone uses one green segment');assert.strictEqual(await goal.locator('.nw-mix>i.growth').count(),0);
      await p.evaluate(()=>{const a=window.__ybt;a.S.nw.goal.amount=2000;a.render();});assert.strictEqual(await goal.locator('.nw-stats').count(),0,'reached goal keeps its reached state');
      await p.evaluate(()=>{const a=window.__ybt;a.S.nw.goal={amount:5000,month:'2026-08'};a.render();});assert.strictEqual(await goal.locator('.nw-mix').count(),0,'expired goal must not show a future funding plan');
      await p.evaluate(()=>{const a=window.__ybt;a.S.nw.goal=null;a.render();});assert.strictEqual(await goal.locator('.nw-stats').count(),0);assert.strictEqual(await p.locator('.scenario-presets button:not([aria-pressed])').count(),0,'no goal date shortcut without a goal');
      await load(0,50,0,true);await p.evaluate(()=>{const a=window.__ybt; a.S.ui.tab='networth';a.S.ui.analysis={networth:true};a.render();});assert((await p.locator('.scenario-meta').innerText()).includes(lang==='en'?'No saving average':'no hay media'),'explain missing saving average');

    }
    assert.deepStrictEqual(errors,[]);await ctx.close();console.log('Compact cards and live scenario: '+lang+' desktop/phone passed');
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
