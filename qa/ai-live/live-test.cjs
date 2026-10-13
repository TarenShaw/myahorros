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
 await page.evaluate(async()=>{localStorage.setItem('ybt.storage','browser');await window.__ybtWeb.idb.set('data',JSON.stringify({app:'Yearly Budget Tracker',format:1,months:{},config:{settings:{lang:'en',startYear:2026,startMonth:0}}}));});
 await page.reload(); if(await page.locator('.wl-hero [data-x=open]').count())await page.click('.wl-hero [data-x=open]'); if(await page.locator('button.web-way[data-m=browser]').count())await page.click('button.web-way[data-m=browser]'); await page.waitForFunction(()=>window.__ybt&&window.__ybtWeb.store);
 if(await page.locator('[data-action=ob-history]').count()){await page.click('[data-action=ob-history]');await page.keyboard.press('Escape');} await page.click('#tab-transactions');await page.click('[data-action=ai-tx]');await page.click('[data-action=ai-setup]');
 await page.click('[data-mode=automatic]');await page.fill('#ai-key',process.env.QA_ANTHROPIC_KEY);await page.uncheck('#ai-remember');await page.click('.ai-panel [data-x=go]');
 await page.waitForFunction(()=>!document.querySelector('.ai-panel #ai-key')||document.querySelector('.ai-panel [data-x=go]')?.disabled===false,{},{timeout:60000});
 if(await page.locator('#ai-key').count()) {report.connection='rejected';report.passed=false;process.exitCode=1;report.message=await page.locator('.ai-panel').innerText(); report.message=report.message.replace(/sk-ant-\S+/g,'[redacted]');console.log('Claude connection failed: '+report.message);return;}
 report.connection='accepted';report.model=await page.evaluate(()=>JSON.parse(localStorage.getItem('ybt.ai')).model);
 assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ybt.ai')).key),false);report.checks.push('API key session-only');
 await page.evaluate(()=>{const ai=window.__ybt.S.ai,original=ai.json;ai.json=async(...args)=>{const result=await original(...args);window.__qaRaw=result;return result;};}); await page.setInputFiles('#ai-file','qa/ai-live/synthetic-statement.txt');await page.click('[data-action=ai-send]');
 await page.waitForFunction(()=>window.__ybt.S.modal?.type==='import'||(window.__ybt.S.modal?.type==='ai'&&!window.__ybt.S.modal.busy),{},{timeout:180000});
 report.raw=await page.evaluate(()=>window.__qaRaw); report.review=await page.evaluate(()=>{const m=window.__ybt.S.modal;return m.type==='import'?{type:m.type,rows:m.rows.map(({date,concept,amount,table,category,on,aiQ})=>({date,concept,amount,table,category,on,aiQ})),ai:m.ai}:{type:m.type,message:m.msg};});
 if(report.review.type!=='import')throw Error('AI did not produce import review: '+report.review.message);
 await page.screenshot({path:'qa/ai-live/review.png'});
 const rows=report.review.rows;assert.equal(rows.length,6);assert.equal(rows.find(r=>r.concept.includes('SALARY')).amount,2500);assert.equal(rows.find(r=>r.concept.includes('MERCADONA')).amount,-54.32);assert.equal(rows.find(r=>r.concept.includes('REFUND')).table,'expenses');assert.equal(rows.find(r=>r.concept.includes('REFUND')).amount,20);assert.equal(rows.find(r=>r.concept.includes('INTEREST')).table,'income');assert.ok(!rows.some(r=>r.concept.includes('TRANSFER')));assert.ok(rows.every(r=>r.date.startsWith('2026-09-')));assert.equal(await page.evaluate(()=>window.__ybt.allRows().length),0);report.checks.push('Six rows; correct dates, salary, decimal, refund, interest; own transfer excluded; no save before review');
 await page.click('[data-action=imp-add]');if(await page.locator('[data-action=imp-add-confirm]').count())await page.click('[data-action=imp-add-confirm]');
 await page.waitForFunction(()=>window.__ybt.allRows().length===6);report.checks.push('Review save commits six rows');
 await page.reload();await page.waitForFunction(()=>window.__ybt?.allRows().length===6);if(await page.locator('.wz-body').count())await page.keyboard.press('Escape');report.checks.push('Six rows persist after reload');
 await page.click('#tab-transactions');await page.click('[data-action=ai-tx]');await page.evaluate(()=>{const ai=window.__ybt.S.ai,original=ai.json;ai.json=async(...args)=>{const result=await original(...args);window.__qaRaw=result;return result;};}); await page.setInputFiles('#ai-file','qa/ai-live/synthetic-statement.txt');await page.click('[data-action=ai-send]');
 await page.waitForFunction(()=>window.__ybt.S.modal?.type==='import'||(window.__ybt.S.modal?.type==='ai'&&!window.__ybt.S.modal.busy),{},{timeout:180000});
 report.repeat=await page.evaluate(()=>({type:window.__ybt.S.modal.type,selected:window.__ybt.S.modal.rows?.filter(r=>r.on).length,saved:window.__ybt.allRows().length}));assert.equal(report.repeat.selected,0);assert.equal(report.repeat.saved,6);report.checks.push('Reimport duplicates deselected');
 assert.equal(errors.length,0);report.passed=true;console.log(JSON.stringify(report,null,2));
 }catch(e){report.passed=false;process.exitCode=1;report.failure=e.message;report.screen=await page.locator('body').innerText();console.log('QA failure: '+e.message);}
 finally{if(page)await page.evaluate(()=>{sessionStorage.removeItem('ybt.ai.key');localStorage.removeItem('ybt.ai');}).catch(()=>{});fs.writeFileSync('qa/ai-live/result.json',JSON.stringify(report,null,2));await context.close();await browser.close();}
})();