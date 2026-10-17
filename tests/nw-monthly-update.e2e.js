/* Monthly account updates: independent balances, explicit zero, scoped group links,
   saved summaries, invalidated confirmations, payouts, reload and mobile EN/ES. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const START=process.env.START_URL||'http://localhost:8000/';
const data=lang=>({app:'Yearly Budget Tracker',format:1,months:{'2026-09':{
  income:[{id:'pay',date:'2026-09-01',amount:1000,concept:'Salary',category:'Salary',account:'bank'}],
  expenses:[{id:'shop',date:'2026-09-03',amount:-100,concept:'Shop',category:'Food',source:'legacy.csv'}],
  investments:[{id:'one',date:'2026-09-05',amount:-250,concept:'Transfer 884',category:'Funds',account:'bank'},
    {id:'two',date:'2026-09-12',amount:-250,concept:'Transfer 884',category:'Funds',account:'bank'}]
}},config:{categories:{income:[{name:'Salary'},{name:'Dividends'}],expenses:[{name:'Food'}],investments:[{name:'Funds'}]},settings:{lang,numFmt:'en',currency:'EUR',start:{y:2026,m:8},guide:{on:false,done:true}},
networth:{accounts:[{id:'bank',name:'BBVA',group:'cash'},{id:'other',name:'Other bank',group:'cash'},{id:'fund',name:'Indexa portfolio',group:'invest'},{id:'pension',name:'Pension',group:'pension'}],snaps:{'2026-08':{bank:1000,other:100,fund:10000,pension:5000},'2026-09':{bank:1400,other:100,fund:10800,pension:5050}}}}});
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const [lang,width] of [['en',1280],['es',390]]){
  const ctx=await browser.newContext({viewport:{width,height:920},serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
  await ctx.addInitScript(lang=>{window.__ybtTest=true;localStorage.setItem('ybt.lang',lang)},lang);
  await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(START);await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},data(lang));
  await p.reload();await p.waitForFunction(()=>window.__ybt?.S.gotConfig);await p.click('#tab-networth');
  const balance=async id=>{await p.click(`[data-action=nw-update][data-id=${id}]`);await p.waitForSelector('#nwu-balance-'+id);};
  const performance=async id=>{
   const card=p.locator('.simple-account').filter({has:p.locator(`[data-action=nw-performance][data-id=${id}]`)});
   if(!await card.locator('[data-action=nw-performance]').isVisible())await card.locator('summary').click();
   await card.locator('[data-action=nw-performance]').click();await p.waitForSelector('#nwu-mode-'+id);
  };
  const save=async id=>{await p.locator('#nwu-form-'+id+' button[type=submit]').click();assert.equal(await p.locator('#nwu-form-'+id+' .err').innerText(),'');};
  await balance('fund');assert.equal(await p.locator('[data-field=mode]').count(),0);
  await p.fill('#nwu-balance-fund','10800');await save('fund');await p.keyboard.press('Escape');
  await performance('fund');assert.match(await p.locator('.performance-result').innerText(),/—/,'unconfirmed movements are unknown');
  await p.locator('.nwu-groups > summary').click();
  let group=p.locator('.nwu-group').filter({has:p.locator('b',{hasText:'Transfer 884'})});
  await group.locator('select').selectOption('fund');await group.locator('[data-action=nwu-link]').click();
  assert.deepEqual(await p.evaluate(()=>window.__ybt.allRows().filter(r=>r.table==='investments').map(r=>r.investmentAccount)),['fund','fund']);
  await p.click('[data-action=nwu-undo]');assert.equal(await p.evaluate(()=>window.__ybt.allRows().filter(r=>r.investmentAccount).length),0);
  await group.locator('select').selectOption('fund');await group.locator('[data-action=nwu-link]').click();
  assert.deepEqual(await p.evaluate(()=>['bank','other',''].map(account=>window.__ybt.nwRemembered({account,table:'investments',concept:'Transfer 884',amount:-40}))),['fund',null,null]);
  await p.selectOption('#nwu-mode-fund','transactions');await save('fund');
  assert.match(await p.locator('.performance-result').innerText(),/300\.00/);
  await p.locator('.nwu-transactions > summary').click();await p.locator('[data-action=nwu-edit]').first().click();
  await p.fill('#f-amount','255');await p.locator('#tx-form button[type=submit]').click();
  await p.waitForSelector('#nwu-mode-fund');assert.equal(await p.inputValue('#nwu-mode-fund'),'later','edited transfer invalidates confirmation');
  await p.selectOption('#nwu-mode-fund','summary');await p.fill('#nwu-added-fund','650');await p.fill('#nwu-withdrawn-fund','50');await save('fund');
  assert.match(await p.locator('.performance-result').innerText(),/200\.00/,'summary replaces linked contribution totals');
  await p.locator('.nwu-payout > summary').click();await p.fill('#nwu-payout-fund','20');await save('fund');
  assert.match(await p.locator('.performance-result').innerText(),/220\.00/);await p.keyboard.press('Escape');
  await performance('pension');await p.selectOption('#nwu-mode-pension','summary');await p.fill('#nwu-added-pension','0');
  await p.locator('#nwu-form-pension button[type=submit]').click();assert.notEqual(await p.locator('#nwu-form-pension .err').innerText(),'');
  await p.fill('#nwu-withdrawn-pension','0');await save('pension');assert.match(await p.locator('.performance-result').innerText(),/50\.00/);await p.keyboard.press('Escape');
  // A statement launched from an account returns there and keeps the unsaved balance.
  await balance('bank');await p.fill('#nwu-balance-bank','1450');await p.locator('#nwu-form-bank [data-action=nwu-upload]').click();
  await p.keyboard.press('Escape');await p.waitForSelector('#nwu-balance-bank');assert.equal(await p.inputValue('#nwu-balance-bank'),'1450');
  await p.locator('#nwu-form-bank [data-action=nwu-upload]').click();
  await p.setInputFiles('#imp-file',{name:'new.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Amount,Description,Category\n2026-09-23,-25,Transfer 884,Funds')});
  await p.click('[data-action=imp-read]');await p.waitForSelector('#imp-r-0');
  assert.equal(await p.evaluate(()=>window.__ybt.S.modal.rows[0].investmentAccount),'fund');
  await p.click('[data-action=imp-add]');await p.waitForSelector('#nwu-balance-bank');
  assert.equal(await p.inputValue('#nwu-balance-bank'),'1450');assert.equal(await p.evaluate(()=>window.__ybt.S.ui.tab),'networth');
  assert.ok(await p.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'account dialog fits phone');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!window.YBT_BUSY());await p.reload();await p.waitForFunction(()=>window.__ybt?.S.gotConfig);
  await p.click('#tab-networth');await performance('fund');assert.match(await p.locator('.performance-result').innerText(),/220\.00/);
  assert.equal(Number(await p.inputValue('#nwu-added-fund')),650);assert.equal(Number(await p.inputValue('#nwu-withdrawn-fund')),50);
  if(process.env.SHOTS)await p.screenshot({path:`${process.env.SHOTS}/accounts-performance-${lang}-${width}.png`});
  assert.deepEqual(errors,[]);console.log(`${lang}/${width}: balance-only updates, optional performance, unknown vs zero, grouping/Undo, corrections, payouts, account import and reload passed`);
  await ctx.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
