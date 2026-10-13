const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=__dirname;
const fixtures={
 'localized.csv':'Fecha;Concepto;Importe;Saldo;Moneda\n01/09/2026;Salary;2.000,00;3.000,00;EUR\n02/09/2026;TARJETA AMAZON;-40,00;2.960,00;EUR\n03/09/2026;DEVOLUCION AMAZON;10,00;2.970,00;EUR\n04/09/2026;Indexa Capital;-500,00;2.470,00;EUR\n05/09/2026;USD cafe;-12,50;2.457,50;USD\n06/09/2026;Unicode minus;−23,45;2.434,05;EUR\n07/09/2026;Parentheses;(15,00);2.419,05;EUR\n08/09/2026;BROKEN;banana;;EUR\n',
 'paired-transfers.csv':'Date,Description,Amount\n2026-09-02,Transfer own accounts out,-500\n2026-09-02,Transfer own accounts in,500\n2026-09-03,Coffee,-5\n',
 'cross-account-a.csv':'Date,Description,Amount\n2026-09-09,NETFLIX,-15\n',
 'cross-account-b.csv':'Date,Description,Amount\n2026-09-09,NETFLIX,-15\n',
 'splitwise-usd.csv':'Date,Description,Category,Cost,Currency,Ana,Ben\n2026-09-02,Dinner,Dining,120,USD,-60,60\n2026-09-03,Hotel,Travel,200,EUR,100,-100\n',
 'ibkr.csv':'Statement,Header,Field Name,Field Value\nStatement,Data,Title,Activity\nDeposits & Withdrawals,Header,Currency,Settle Date,Description,Amount\nDeposits & Withdrawals,Data,EUR,2026-09-02,Electronic Fund Transfer,500\nDividends,Header,Currency,Date,Description,Amount\nDividends,Data,EUR,2026-09-05,Global Fund Dividend,10\nTrades,Header,DataDiscriminator,Symbol\nTrades,Data,Order,ABC\n',
 'mixed-investment-words.csv':'Date,Description,Amount\n2026-09-02,APORTACION INDEXA CAPITAL,-500\n2026-09-03,Salary,2000\n2026-09-04,Groceries,-100\n2026-09-05,Electricity,-50\n',
 'ambiguous-us-dates.csv':'Date,Description,Amount\n09/01/2026,Salary,2000\n09/02/2026,Groceries,-100\n09/03/2026,Indexa Capital,-500\n'
};
for(const [n,t] of Object.entries(fixtures))fs.writeFileSync(path.join(dir,n),t);
fixtures['large-405.csv']='Date,Description,Amount\n'+Array.from({length:405},(_,i)=>`2026-09-${String(i%28+1).padStart(2,'0')},Vendor ${i},-${i+1}`).join('\n');
fs.writeFileSync(path.join(dir,'large-405.csv'),fixtures['large-405.csv']);
const seed=()=>({app:'Yearly Budget Tracker',format:1,months:{},config:{settings:{guide:{tourDone:true,wizardDone:true},start:{y:2026,m:0}},networth:{accounts:[{id:'cashA',name:'Bank Alpha',group:'cash'},{id:'cashB',name:'Bank Beta',group:'cash'},{id:'fund',name:'Indexa Capital',group:'invest'}],snaps:{'2026-08':{cashA:1000,cashB:1000,fund:10000},'2026-09':{cashA:2340,cashB:985,fund:10600}}}}});
const evidence={generatedAt:'2026-10-13',tests:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:1500,height:1000},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en');localStorage.setItem('ybt.num','en');});
 await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
 const p=await ctx.newPage();p.on('pageerror',e=>evidence.errors.push(e.message));await p.goto('http://localhost:8000/');
 const reset=async(d=seed())=>{await p.waitForTimeout(500);await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');localStorage.setItem('ybt.picked','1');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},d);await p.reload();await p.waitForFunction(()=>window.__ybt&&window.__ybtWeb.store);};
 const upload=async n=>{await p.locator('#tab-transactions').click();await p.locator('[data-action="import"]').first().click();await p.locator('#imp-file').setInputFiles(path.isAbsolute(n)?n:path.join(dir,n));await p.waitForSelector('#imp-r-0');};
 const state=()=>p.evaluate(()=>({rows:window.__ybt.S.modal?.rows,checks:window.__ybt.S.modal?.checks,bad:window.__ybt.S.modal?.bad,all:window.__ybt.allRows(),nw:window.__ybt.S.nw,modal:window.__ybt.S.modal?.type}));
 const rec=async(name,extra={})=>{evidence.tests.push({name,...await state(),...extra});fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log('DONE',name);};
 const save=async()=>{await p.locator('[data-action="imp-add"]').click();if(await p.locator('[data-action="imp-add-confirm"]').count())await p.locator('[data-action="imp-add-confirm"]').click();};
 console.log('Starting reset');await reset();console.log('Starting upload'); await upload('localized.csv');await rec('Localized formats/refund/fx/bad amount');await p.screenshot({path:path.join(dir,'localized-review.png'),fullPage:true});
 // Correct amount, description, category/table; sign-confirm; include/exclude; cancellation protects work.
 await p.locator('#imp-a-1').fill('-35');await p.locator('#imp-a-1').press('Enter');
 await p.locator('#imp-d-4').fill('Corrected cafe');await p.locator('#imp-d-4').press('Enter');
 await p.locator('[data-action="imp-table"][data-i="3"]').selectOption('investments');
 await p.locator('#imp-on-4').uncheck();await p.locator('#imp-c-1').selectOption({index:1});
 await p.locator('[data-action="imp-review-mode"][data-v="attention"]').click();await rec('Needs attention filtering and edits');
 await p.locator('button[data-action="close"]').first().click();assert(await p.locator('[data-action="imp-keep"]').count());await p.locator('[data-action="imp-keep"]').click();
 await save();await rec('Saved corrected localized import');await p.getByRole('button',{name:'Undo',exact:true}).click();await rec('Undo removes imported rows');
 await reset();await upload('paired-transfers.csv');await rec('Transfer pair default exclusion');
 await p.locator('#imp-a-0').fill('-600');await p.locator('#imp-a-0').press('Enter');await rec('Changed transfer amount -500 to -600');await p.screenshot({path:path.join(dir,'stale-transfer-review.png')});
 await reset();await upload('cross-account-a.csv');await p.locator('#imp-acct').selectOption('cashA');await save();await upload('cross-account-b.csv');await p.locator('#imp-acct').selectOption('cashB');await rec('Identical legitimate charge on distinct cash account');await p.screenshot({path:path.join(dir,'cross-account-duplicate.png')});
 await reset();await upload('splitwise-usd.csv');await rec('Splitwise Ana USD/EUR');await p.locator('#imp-sw-who').selectOption('1');await rec('Splitwise Ben participant switch');
 await reset();await upload('ibkr.csv');await rec('IBKR section reading dividends/deposits');
 await reset();await upload('mixed-investment-words.csv');await rec('Ordinary bank statement 25% contribution descriptions');await p.screenshot({path:path.join(dir,'mixed-investment-excluded.png')});
 await reset();await upload('ambiguous-us-dates.csv');await rec('Ambiguous US dates');
 await reset();await upload('large-405.csv');await rec('405 rows first 200 visible',{visible:await p.locator('tr[id^=imp-r-]').count()});await p.locator('[data-action="imp-more"]').click();await p.locator('[data-action="imp-more"]').click();await rec('Show more all 405 visible',{visible:await p.locator('tr[id^=imp-r-]').count()});
 // Invalid inline review amount then immediate Add: verify unchanged old amount can still be committed.
 await reset();await upload('cross-account-a.csv');await p.locator('#imp-a-0').fill('banana');await save();await rec('Invalid inline amount then Add');
 // Mock ONLY model extraction. Downstream multi-file provenance, answers, review, commit, pending balances are real.
 await reset();const response={rows:[['2026-09-01',2000,'Salary','income','Salary','bank-a.txt','',0,[]],['2026-09-02',-500,'Indexa Capital contribution','investments','','bank-a.txt','Is this a contribution?',0,[['Yes contribution','change','investments',''],['Exclude','exclude','',''],['Keep','keep','','']]],['2026-09-03',-100,'Groceries','expenses','','bank-a.txt','',0,[]],['2026-09-04',-20,'Unknown merchant','expenses','','bank-b.txt','Is this mine?',0,[['Include','include','',''],['Exclude','exclude','',''],['Keep','keep','','']]]],accounts:[{match:'fund',name:'Indexa Capital',group:'invest',balances:[['2026-08',10000,0],['2026-09',10600,500]]}],statements:[{source:'bank-a.txt',opening:1000,closing:2400},{source:'bank-b.txt',opening:1000,closing:980}],notes:'Synthetic extraction mock; verify contribution and ownership.'};
 fs.writeFileSync(path.join(dir,'mock-extraction.json'),JSON.stringify(response,null,2));fs.writeFileSync(path.join(dir,'bank-a.txt'),'Synthetic bank A: September 2026; opening EUR 1000; Salary +2000; Indexa contribution -500; Groceries -100; closing EUR 2400.');fs.writeFileSync(path.join(dir,'bank-b.txt'),'Synthetic bank B: September 2026; opening EUR 1000; Unknown merchant -20; closing EUR 980.');
 await p.evaluate(r=>window.__ybt.aiApply({mode:'statement',files:[],rules:'',lang:'en'},r,3),response);await rec('Mock extraction downstream multi-file questions and balances');
 await p.locator('#imp-source-0').selectOption('cashA');await p.locator('#imp-source-1').selectOption('cashB');await p.locator('[data-action="ai-opt"][data-i="3"][data-j="1"]').click();
 await p.locator('[data-action="ai-opt"][data-i="1"][data-j="0"]').click();await save();await p.waitForSelector('[data-action="nwimp-go"]',{timeout:5000});await rec('Multi-file rows saved, pending net worth review');
 console.log('NW review buttons',await p.locator('#overlay button').evaluateAll(bs=>bs.map(b=>({a:b.dataset.action,t:b.textContent}))));
 await p.screenshot({path:path.join(dir,'pending-networth-review.png'),fullPage:true});
 await p.locator('[data-action="nwimp-go"]').click();await p.waitForTimeout(350);await rec('Applied mocked statement balances/contributions',{gains:await p.evaluate(()=>Object.fromEntries(window.__ybt.nwGains('2026-08','2026-09')))});assert.equal(await p.evaluate(()=>window.__ybt.nwGains('2026-08','2026-09').get('fund')),100);await p.screenshot({path:path.join(dir,'mock-networth-gains.png'),fullPage:true});
 await reset();await upload(path.resolve(dir,'../xlsx/complex-transactions.xlsx'));await rec('Actual XLSX complex transactions');await p.locator('#imp-on-5').uncheck();await p.locator('#imp-t-1').selectOption('investments');await p.locator('#imp-t-3').selectOption('expenses');await save();await rec('Actual XLSX applied with USD excluded');
 fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence.tests.map(x=>({name:x.name,rows:x.rows?.length,on:x.rows?.filter(r=>r.on).length,all:x.all?.length,modal:x.modal})),null,2));
 }finally{fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
