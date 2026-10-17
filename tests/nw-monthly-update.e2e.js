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
 try{for(const [lang,width,theme] of [['en',1280,'dark'],['es',390,'light']]){
  const context=await browser.newContext({viewport:{width,height:920},serviceWorkers:'block',locale:'en-GB'}),p=await context.newPage(),errors=[];
  await p.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
  p.on('pageerror',e=>{errors.push(e.message);console.log('pageerror:',e.message);});
  await context.addInitScript(({lang,theme})=>{window.__ybtTest=true;localStorage.setItem('ybt.lang',lang);localStorage.setItem('ybt.theme',theme);},{lang,theme});
  await context.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
  await p.goto(START);
  await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');localStorage.setItem('ybt.picked','1');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},data(lang));
  await p.reload();await p.waitForFunction(()=>window.__ybt?.S.gotMonths||document.querySelector('.wl-hero [data-x=open]'));if(await p.locator('.web-landing [data-x=open]').count()) await p.locator('.wl-hero [data-x=open]').click();await p.waitForFunction(()=>window.__ybt?.S.gotMonths);await p.click('#tab-networth');
  const row=id=>p.locator('.nwt tbody tr').filter({has:p.locator('td.an',{hasText:id})});
  const gain=name=>row(name).locator('td').nth(4);
  const open=async()=>{await p.locator('.page-head [data-action=nw-update]').first().click();await p.waitForSelector('.nwu-body');};
  const save=async id=>{await p.locator('#nwu-form-'+id+' button[type=submit]').click();assert.equal(await p.locator('#nwu-form-'+id+' .err').innerText(),'');};
  assert.match(await gain('Indexa portfolio').innerText(),lang==='en'?/Confirm money/:/Confirmar aportaciones/);
  assert.equal(await p.locator('.nw-change-stats').count(),0,'no fabricated gain breakdown');
  await row('Indexa portfolio').locator('td').nth(1).locator('button').click();
  assert.equal(await p.evaluate(()=>document.activeElement.id),'nwu-balance-fund');
  await p.keyboard.press('Escape');
  await open();
  assert.match(await p.locator('#overlay .nwu-progress').innerText(),/4/);
  await p.fill('#nwu-balance-fund','10820');await save('fund');
  assert.equal(await p.evaluate(()=>window.__ybt.S.nw.snaps['2026-09'].fund),10820,'can save a balance without contribution data');
  await p.fill('#nwu-balance-fund','10800');await save('fund');
  // One grouped confirmation links two transfers and remembers the source, description and direction.
  await p.locator('.nwu-groups summary').first().click();
  let group=p.locator('.nwu-group').filter({has:p.locator('b',{hasText:'Transfer 884'})});
  await group.locator('select').selectOption('fund');await group.locator('[data-action=nwu-link]').click();
  assert.deepEqual(await p.evaluate(()=>window.__ybt.allRows().filter(r=>r.table==='investments').map(r=>r.investmentAccount)),['fund','fund']);
  await p.click('[data-action=nwu-undo]');
  assert.equal(await p.evaluate(()=>window.__ybt.allRows().filter(r=>r.investmentAccount).length),0);
  await group.locator('select').selectOption('fund');await group.locator('[data-action=nwu-link]').click();
  assert.deepEqual(await p.evaluate(()=>{const f=window.__ybt.nwRemembered;return ['bank','other',''].map(account=>f({account,table:'investments',concept:'Transfer 884',amount:-40})).concat(f({account:'bank',table:'investments',concept:'Transfer 884',amount:40}));}),['fund',null,null,null]);
  await p.selectOption('#nwu-mode-fund','transactions');
  assert.match(await p.locator('#nwu-form-fund .nwu-transactions summary').innerText(),/500\.00/);
  await save('fund');
  await p.locator('#nwu-form-fund .nwu-transactions summary').click();
  await p.locator('#nwu-form-fund [data-action=nwu-edit]').first().click();
  await p.fill('#f-amount','255');await p.locator('#tx-form button[type=submit]').click();
  await p.waitForSelector('#nwu-mode-fund');assert.equal(await p.inputValue('#nwu-mode-fund'),'later','editing from the panel invalidates confirmation');
  await p.selectOption('#nwu-mode-fund','transactions');
  await p.locator('#nwu-form-fund .nwu-transactions summary').click();
  await p.locator('#nwu-form-fund [data-action=nwu-edit]').first().click();
  await p.fill('#f-amount','250');await p.locator('#tx-form button[type=submit]').click();
  await p.waitForSelector('#nwu-mode-fund');await p.selectOption('#nwu-mode-fund','transactions');await save('fund');
  // Explicit zero is different from unknown; no fake zero from blank input.
  await p.selectOption('#nwu-mode-pension','summary');
  await p.fill('#nwu-added-pension','0');await p.locator('#nwu-form-pension button[type=submit]').click();
  assert.notEqual(await p.locator('#nwu-form-pension .err').innerText(),'');
  await p.fill('#nwu-withdrawn-pension','0');await save('pension');
  await p.keyboard.press('Escape');
  assert.match(await gain('Indexa portfolio').innerText(),/300\.00/);
  assert.match(await gain('Pension').innerText(),/50\.00/);
  // A new transfer invalidates confirmation but never changes a saved monthly summary.
  await p.evaluate(()=>{const a=window.__ybt;a.upsertTx(null,{table:'investments',date:'2026-09-20',amount:-100,concept:'Transfer 884',category:'Funds',account:'bank'});a.render();});
  assert.match(await gain('Indexa portfolio').innerText(),lang==='en'?/Confirm money/:/Confirmar aportaciones/);
  assert.match(await gain('Pension').innerText(),/50\.00/);
  await open();await p.selectOption('#nwu-mode-fund','summary');
  await p.fill('#nwu-added-fund','650');await p.fill('#nwu-withdrawn-fund','50');await save('fund');
  await p.keyboard.press('Escape');assert.match(await gain('Indexa portfolio').innerText(),/200\.00/,'summary replaces transaction total, not added again');
  await open();
  assert.equal(Number(await p.inputValue('#nwu-added-fund')),650);assert.equal(Number(await p.inputValue('#nwu-withdrawn-fund')),50);
  await p.locator('#nwu-form-fund .nwu-payout summary').click();await p.fill('#nwu-payout-fund','20');await save('fund');
  await p.keyboard.press('Escape');assert.match(await gain('Indexa portfolio').innerText(),/220\.00/);
  // Assign a legacy statement in place, without going back to Transactions.
  await open();await p.locator('.nwu-groups summary').first().click();
  const legacy=p.locator('.nwu-group').filter({has:p.locator('b',{hasText:'legacy.csv'})});
  await legacy.locator('select').selectOption('bank');await legacy.locator('[data-action=nwu-link]').click();
  assert.equal(await p.evaluate(()=>window.__ybt.allRows().find(r=>r.id==='shop').account),'bank');
  // Upload/cancel returns to this month's update, preserving an unsaved balance.
  await p.fill('#nwu-balance-other','123');
  await p.locator('#nwu-form-bank [data-action=nwu-upload]').click();
  assert.equal(await p.locator('#imp-acct').count(),0);
  await p.keyboard.press('Escape');await p.waitForSelector('#nwu-balance-other');
  assert.equal(await p.inputValue('#nwu-balance-other'),'123');
  // The next statement uses the remembered destination and returns to the update dialog after saving.
  await p.locator('#nwu-form-bank [data-action=nwu-upload]').click();
  await p.setInputFiles('#imp-file',{name:'new.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Amount,Description,Category\n2026-09-23,-25,Transfer 884,Funds')});
  await p.click('[data-action=imp-read]');await p.waitForSelector('#imp-a-0');
  assert.equal(await p.evaluate(()=>window.__ybt.S.modal.rows[0].investmentAccount),'fund');
  assert.deepEqual(await p.evaluate(()=>{const a=window.__ybt,r={table:'investments',amount:-50,concept:'Transfer 884'};a.applyRememberedInvestment(r,'bank');const first=r.investmentAccount;a.applyRememberedInvestment(r,'other');return [first,r.investmentAccount];}),['fund','']);

  await p.click('[data-action=imp-add]');await p.waitForSelector('#nwu-balance-other');
  assert.equal(await p.inputValue('#nwu-balance-other'),'123');
  assert.equal(await p.evaluate(()=>window.__ybt.S.ui.tab),'networth');

  if(process.env.SHOTS){fs.mkdirSync(process.env.SHOTS,{recursive:true});await p.screenshot({path:process.env.SHOTS+`/nw-update-${lang}-${width}.png`});}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits');
  assert.ok(await p.locator('.modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog fits');
  await p.keyboard.press('Escape');
  await p.waitForFunction(async()=>{const raw=await window.__ybtWeb.idb.get('data');return raw&&JSON.parse(raw).config.networth.payouts?.['2026-09']?.fund===20;});
  await p.reload();await p.waitForFunction(()=>window.__ybt?.S.gotMonths||document.querySelector('.wl-hero [data-x=open]'));if(await p.locator('.web-landing [data-x=open]').count()) await p.locator('.wl-hero [data-x=open]').click();await p.waitForFunction(()=>window.__ybt?.S.gotMonths);await p.click('#tab-networth');
  assert.match(await gain('Indexa portfolio').innerText(),/220\.00/);
  await open();assert.equal(Number(await p.inputValue('#nwu-added-fund')),650);assert.equal(Number(await p.inputValue('#nwu-withdrawn-fund')),50);
  assert.deepEqual(errors,[]);
  console.log(`${lang}/${width}: independent balances, grouped matching, scoped rules, zero vs unknown, changed transactions, summary overrides, payouts, import return and reload passed`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
