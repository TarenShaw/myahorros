/* Core simplified journeys, with real browser storage and fictional financial records.
   Serve repo on :8000. NODE_PATH=<Playwright modules> node tests/simplification.e2e.js */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const START=process.env.START_URL||'http://localhost:8000/';
const csv='Date,Description,Amount\n2026-09-28,Salary ACME,2200\n2026-09-02,Rent,-850\n2026-09-11,Unfamiliar shop,-12.50';
(async()=>{
 const browser=await chromium.launch({channel:'msedge'}), errors=[];
 try{
  for(const [lang,width] of [['en',1280],['es',390]]){
   const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   await ctx.addInitScript(lang=>{window.__ybtTest=true;window.showSaveFilePicker=undefined;localStorage.setItem('ybt.lang',lang)},lang);
   await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
   const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(START);await p.click('.wl-hero [data-x=start]');await p.click('[data-m=browser]');
   await p.fill('#ob-account','Everyday');await p.selectOption('#ob-currency','EUR');await p.click('#ob-start');
   const upload=async(text,name='bank.csv')=>{
    await p.setInputFiles('#imp-file',{name,mimeType:'text/csv',buffer:Buffer.from(text)});
    await p.click('[data-action=imp-read]');await p.waitForSelector('.imp tbody tr');
   };
   const save=async()=>{await p.click('[data-action=imp-add]');if(await p.locator('[data-action=imp-add-confirm]').isVisible())await p.click('[data-action=imp-add-confirm]');await p.waitForSelector('#overlay.on',{state:'hidden'});};
   await upload(csv);
   assert.equal(await p.locator('[data-action=imp-amt]').count(),0,'readable review without amount inputs');
   await p.click('[data-action=imp-issue][data-v=category]');
   assert.ok((await p.locator('.imp tbody tr').count())>=1);
   await p.click('[data-action=imp-review-mode][data-v=all]');
   await p.click('[data-action=imp-edit][data-i="2"]');
   await p.fill('#imp-a-2','not money'); await p.locator('#imp-a-2').press('Tab');
   assert.equal(await p.getAttribute('#imp-a-2','aria-invalid'),'true','invalid amount is flagged');
   await p.fill('#imp-a-2','-15');await p.locator('#imp-a-2').press('Tab');
   // Select a real category from the translated starter set.
   const cat=await p.locator('#imp-c-2 option').evaluateAll(os=>os.find(o=>o.value)?.value);
   await p.selectOption('#imp-c-2',cat);await p.click('[data-action=imp-edit][data-i="2"]');
   await save();
   assert.equal(await p.inputValue('#summary-period'),'2026-09');
   const money=await p.locator('.summary-totals .tile-val').allTextContents();
   const expected=await p.evaluate(()=>[2200,865,1335].map(v=>window.__ybt.fmtEUR(v)));
   assert.deepEqual(money,expected);
   assert.equal(await p.locator('.summary-comparison,.health-card,.scenario,#st-born,#st-salary').count(),0);
   assert.equal(await p.evaluate(()=>window.__ybt.S.cats.expenses.length),10);
   const account=await p.evaluate(()=>window.__ybt.S.nw.accounts[0].id);
   assert.ok(await p.evaluate(id=>window.__ybt.allRows().every(r=>r.account===id),account),'import retains source account');
   await p.click('[data-action=summary-transactions]');
   assert.equal(await p.locator('.tx-filter-panel').getAttribute('open'),null);
   assert.equal(await p.locator('[data-action=tx-pick]').count(),0);
   assert.ok(await p.locator('#tx-q').isVisible());
   await p.click('.bulk-tools > summary');await p.waitForSelector('[data-action=tx-pick]');
   await p.click('[data-action=undo-import]');await p.waitForFunction(()=>window.__ybt.allRows().length===0);
   assert.equal(await p.evaluate(()=>window.__ybt.S.nw.accounts.length),1,'Undo keeps the user account');
   await p.click('#tab-overview');await p.click('#view [data-action=import]');await upload(csv);await save();
   await p.click('#view [data-action=import]');await upload(csv);
   assert.equal(await p.evaluate(()=>window.__ybt.S.modal.rows.filter(r=>r.on).length),0,'duplicates are excluded');
   await p.keyboard.press('Escape');await p.click('[data-action=imp-discard]');
   assert.equal(await p.evaluate(()=>window.__ybt.allRows().length),3);
   await p.click('#view [data-action=import]');
   await upload('Date,Description,Amount\n2026-10-01,Salary,2300\n2026-10-02,Rent,-900','october.csv');await save();
   assert.equal(await p.inputValue('#summary-period'),'2026-10');
   await p.selectOption('#summary-period','year:2026');
   assert.equal(await p.locator('.summary-totals .tile-val').first().innerText(),await p.evaluate(()=>window.__ybt.fmtEUR(4500)));
   await p.click('[data-tab=yearly]');assert.ok(await p.locator('#view [data-tab=overview]').isVisible());await p.click('#view [data-tab=overview]');
   await p.click('#tab-settings');
   assert.equal(await p.locator('#st-born,#st-salary,[data-action=audit]').count(),0);
   await p.click('[data-tab=categories]');assert.ok((await p.locator('.simple-cat-list li').count())<10);
   await p.click('[data-action=category-rules]');await p.waitForSelector('#add-kw-form');
   await p.click('[data-action=category-rules]');await p.click('[data-action=show-unused-categories]');
   assert.equal(await p.locator('.simple-cat-list li').count(),10);
   if(process.env.SHOTS){await p.click('#tab-overview');await p.screenshot({path:`${process.env.SHOTS}/summary-${lang}-${width}.png`,fullPage:true});}
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits phone');
   console.log(`${lang}, ${width}px: import editing, exact totals, Undo, duplicate protection, history and category rules passed`);

   if(lang==='en'){
    // Load an existing tracker through the public backup UI, including old settings and investment metadata.
    const fixture={app:'Yearly Budget Tracker',format:1,months:{'2026-09':{income:[{id:'pay',date:'2026-09-28',concept:'Salary',amount:2200,category:'Salary',account:'bank'}],expenses:[{id:'custom',date:'2026-09-02',concept:'Custom expense',amount:-100,category:'My custom category',account:'bank'}],investments:[]}},config:{settings:{lang:'en',currency:'EUR',numFmt:'en',birthYear:1980,salary:55000,guide:{done:true}},categories:{income:[{name:'Salary'}],expenses:[{name:'My custom category',type:'Need'},{name:'Unused legacy category',type:'Want'}],investments:[{name:'Funds'}]},networth:{accounts:[{id:'bank',name:'Bank',group:'cash'},{id:'fund',name:'Fund',group:'invest'}],snaps:{'2026-08':{bank:1000,fund:5000},'2026-09':{bank:1500,fund:5700}},contributions:{'2026-09':{fund:600}},flowDetails:{'2026-09':{fund:{added:700,withdrawn:100}}},flowReviews:{'2026-09':{fund:'legacy-review'}},payouts:{'2026-09':{fund:25}},goal:{amount:12000,month:'2027-09'}}}};
    const restore=async data=>{
     await p.click('#tab-settings');await p.click('[data-action=restore-choices]');
     assert.ok(await p.locator('[data-action=restore-local]').count()>0);
     await p.click('[data-action=restore-file]');await p.setInputFiles('#rs-file',{name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
     await p.waitForSelector('[data-action=restore-yes]');
    };
    await restore(fixture);
    assert.equal(await p.evaluate(()=>window.__ybt.allRows().length),5,'restore waits for confirmation');
    await p.click('[data-action=restore-yes]');await p.waitForFunction(()=>window.__ybt.S.nw.accounts.some(a=>a.id==='fund'));
    await p.click('#tab-networth');await p.click('[data-action=nw-update][data-id=fund]');
    assert.equal(await p.locator('.nwu-account-form').count(),1,'account update is specific');
    assert.equal(await p.locator('[data-field=mode],[data-field=added]').count(),0,'balance update has no investment questions');
    await p.fill('#nwu-balance-fund','5800');await p.locator('#nwu-form-fund').evaluate(f=>f.requestSubmit());
    await p.waitForFunction(()=>window.__ybt.S.nw.snaps['2026-09'].fund===5800);
    const after=await p.evaluate(()=>JSON.parse(JSON.stringify(window.__ybt.S.nw)));
    for(const k of ['contributions','flowDetails','flowReviews','payouts'])assert.deepEqual(after[k],fixture.config.networth[k],`${k} survives balance-only update`);
    await p.keyboard.press('Escape');await p.locator('.account-performance > summary').click();await p.click('[data-action=nw-performance]');
    await p.waitForSelector('[data-field=mode]');
    assert.match(await p.locator('.performance-result').innerText(),/225/,'gain excludes contributions and includes payout');
    await p.keyboard.press('Escape');await p.click('[data-action=nw-goal]');
    await p.fill('#ng-amt','15000');await p.selectOption('#ng-y','2027');await p.selectOption('#ng-m','8');
    await p.locator('#nw-goal-form').evaluate(f=>f.requestSubmit());await p.waitForSelector('.nw-goal');
    assert.ok(!/growth|retire|age|salary/i.test(await p.locator('.nw-goal').innerText()));
    assert.ok(await p.locator('.nw-goal progress').isVisible());
    await p.click('#tab-settings');
    const dl=p.waitForEvent('download');await p.click('[data-action=local-save]');
    const backup=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));
    assert.equal(backup.config.settings.birthYear,1980);assert.equal(backup.config.settings.salary,55000);
    assert.deepEqual(backup.config.categories,fixture.config.categories);
    for(const k of ['contributions','flowDetails','flowReviews','payouts'])assert.deepEqual(backup.config.networth[k],fixture.config.networth[k]);
    await restore(backup);await p.click('[data-action=restore-yes]');await p.waitForFunction(()=>window.__ybt.S.nw.snaps['2026-09'].fund===5800);
    await p.waitForFunction(()=>!window.YBT_BUSY());await p.reload();await p.waitForSelector('#view');
    assert.equal(await p.evaluate(()=>window.__ybt.S.nw.goal.amount),15000);
    console.log('legacy backup restore, optional performance, balance metadata preservation, goal and download/restore passed');
   }
   await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log('simplification: all passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
