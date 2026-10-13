const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const dir=__dirname;
const seed={app:'Yearly Budget Tracker',format:1,months:{},config:{settings:{guide:{tourDone:true,wizardDone:true},start:{y:2026,m:0}}}};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const ctx=await browser.newContext({viewport:{width:1500,height:1000},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en');localStorage.setItem('ybt.num','en');});
 await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
 const p=await ctx.newPage();p.on('pageerror',e=>console.log('pageerror',e.message));
 await p.goto('http://localhost:8000/');
 await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');localStorage.setItem('ybt.picked','1');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},seed);
 await p.reload(); console.log('after reload', (await p.locator('body').innerText()).slice(-3000));
 await p.waitForFunction(()=>window.__ybt&&window.__ybtWeb.store,{},{timeout:12000});
 console.log(await p.evaluate(()=>({modal:window.__ybt.S.modal,keys:Object.keys(window.__ybt.S),store:window.__ybtWeb.store})));
 await p.screenshot({path:path.join(dir,'initial.png')});
 console.log((await p.locator('body').innerText()).slice(-4000));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
