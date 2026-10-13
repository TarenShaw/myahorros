const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
assert.ok(process.env.QA_ANTHROPIC_KEY,'Set QA_ANTHROPIC_KEY in the process environment');
const fixture=`SYNTHETIC BANK STATEMENT - QA ONLY
Account: QA Current Account. Currency EUR. Period 01/09/2026 - 30/09/2026
Opening balance: 1.000,00 EUR
01/09/2026 QA SALARY ACME +2.500,00
02/09/2026 QA RENT SEPTEMBER -800,00
03/09/2026 QA MERCADONA GROCERIES -54,32
04/09/2026 QA CLOTHES STORE -60,00
05/09/2026 QA CLOTHES REFUND +20,00 (refund of clothing purchase)
06/09/2026 QA TRANSFER TO OWN SAVINGS -300,00 (internal transfer; my own account)
30/09/2026 QA SAVINGS INTEREST +2,15
Closing balance: 2.307,83 EUR
No other transactions. All names and figures are fictional.`;
fs.writeFileSync('qa/ai-live/synthetic-statement.txt',fixture);
(async()=>{
 const browser=await chromium.launch({channel:'msedge'}); const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const errors=[]; const statuses=[]; const report={checks:[],statuses,errors}; let page;
 try{
 await context.addInitScript(()=>{localStorage.setItem('ybt.lang','en');window.__ybtTest=true;});
 await context.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('https://api.anthropic.com/'))statuses.push({endpoint:new URL(r.url()).pathname,status:r.status()});});
 await page.goto('http://localhost:8000');
 await page.evaluate(async()=>{localStorage.setItem('ybt.storage','browser');await window.__ybtWeb.idb.set('data',JSON.stringify({app:'Yearly Budget Tracker',format:1,months:{'2026-09':{income:[{id:'qa-salary',date:'2026-09-01',concept:'QA SALARY',amount:2500,category:'Salary'}],expenses:[{id:'qa-grocery',date:'2026-09-03',concept:'QA MERCADONA GROCERIES',amount:-54.32,category:'Rent'}],investments:[]}},config:{settings:{lang:'en',startYear:2026,startMonth:0}}}));});
 await page.reload(); if(await page.locator('.wl-hero [data-x=open]').count())await page.click('.wl-hero [data-x=open]'); if(await page.locator('button.web-way[data-m=browser]').count())await page.click('button.web-way[data-m=browser]'); await page.waitForFunction(()=>window.__ybt&&window.__ybtWeb.store);
 if(await page.locator('[data-action=ob-history]').count()){await page.click('[data-action=ob-history]');await page.keyboard.press('Escape');} await page.click('#tab-transactions');await page.click('[data-action=ai-tx]');await page.click('[data-action=ai-setup]');
 await page.click('[data-mode=automatic]');await page.fill('#ai-key',process.env.QA_ANTHROPIC_KEY);await page.uncheck('#ai-remember');await page.click('.ai-panel [data-x=go]');
 await page.waitForFunction(()=>!document.querySelector('.ai-panel #ai-key')||document.querySelector('.ai-panel [data-x=go]')?.disabled===false,{},{timeout:60000});
 if(await page.locator('#ai-key').count()) {report.connection='rejected';report.passed=false;process.exitCode=1;report.message=await page.locator('.ai-panel').innerText(); report.message=report.message.replace(/sk-ant-\S+/g,'[redacted]');console.log('Claude connection failed: '+report.message);return;}
 report.connection='accepted';report.model=await page.evaluate(()=>JSON.parse(localStorage.getItem('ybt.ai')).model);
 assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ybt.ai')).key),false);report.checks.push('API key session-only');
 await page.click('.m-foot button[data-action=close]');
 const before=await page.evaluate(()=>JSON.stringify(window.__ybt.allRows()));
 await page.click('[data-action=audit][data-f=tx]');await page.click('[data-action=au-send]');
 await page.waitForFunction(()=>!window.__ybt.S.modal.busy,{},{timeout:180000});
 report.audit=await page.evaluate(()=>{const m=window.__ybt.S.modal;return {items:m.items?.map(x=>({kind:x.k,concept:x.r?.concept,table:x.t,category:x.cat,why:x.why})),notes:m.notes,message:m.msg};});
 assert.ok(report.audit.items?.some(x=>x.kind==='cat'&&x.concept==='QA MERCADONA GROCERIES'&&x.category==='Groceries'),'Audit missed intentionally misclassified groceries');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__ybt.allRows())),before);report.checks.push('Live audit detects groceries filed as Rent; no data changes before Apply');
 await page.screenshot({path:'qa/ai-live/audit-review.png'});const fixIndex=await page.evaluate(()=>window.__ybt.S.modal.items.findIndex(x=>x.k==='cat'&&x.r?.concept==='QA MERCADONA GROCERIES'));for(const box of await page.locator('#overlay input[type=checkbox]').all())await box.uncheck();await page.check('#au-'+fixIndex);await page.click('[data-action=au-apply]');assert.equal(await page.evaluate(()=>window.__ybt.allRows().find(r=>r.concept==='QA MERCADONA GROCERIES').category),'Groceries');await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(window.__ybt.allRows())),before);report.checks.push('Selected audit correction applies; Undo restores rows exactly');
 const imagePage=await context.newPage();await imagePage.setContent('<html><body style="font:24px monospace;padding:40px;background:white;color:black"><h1>SYNTHETIC BANK STATEMENT</h1><p>Account: QA Current Account</p><p>Currency: EUR</p><p>Statement period: September 2026</p><p>Balance at 30 September 2026: EUR 2,307.83</p><p>All data fictional, QA only.</p></body></html>');await imagePage.screenshot({path:'qa/ai-live/synthetic-balance.png'});await imagePage.close();
 await page.click('#tab-networth');await page.click('[data-action=ai-nw]');await page.setInputFiles('#ai-file','qa/ai-live/synthetic-balance.png');await page.click('[data-action=ai-send]');
 await page.waitForFunction(()=>window.__ybt.S.modal.type==='nwimp'||!window.__ybt.S.modal.busy,{},{timeout:180000});
 report.balance=await page.evaluate(()=>{const m=window.__ybt.S.modal;return {type:m.type,data:m.data,message:m.msg};});
 assert.equal(report.balance.type,'nwimp');assert.equal(report.balance.data.months.find(x=>x.k==='2026-09').vals[0],2307.83);assert.equal(await page.evaluate(()=>JSON.stringify(window.__ybt.allRows())),before);report.checks.push('Live picture OCR produces September balance 2307.83 in review; saved transactions unchanged');
 await page.screenshot({path:'qa/ai-live/balance-review.png'});assert.equal(errors.length,0);report.passed=true;console.log(JSON.stringify({checks:report.checks,statuses,passed:true}));
 }catch(e){report.passed=false;process.exitCode=1;report.failure=e.message;console.log('QA failure: '+e.message);}
 finally{if(page)await page.evaluate(()=>{sessionStorage.removeItem('ybt.ai.key');localStorage.removeItem('ybt.ai');}).catch(()=>{});fs.writeFileSync('qa/ai-live/audit-image-result.json',JSON.stringify(report,null,2));await context.close();await browser.close();}
})();