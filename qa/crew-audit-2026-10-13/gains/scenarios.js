const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const out = __dirname;
const base = (months, snaps, extra={}) => ({app:'Yearly Budget Tracker',format:1,months,
 config:{settings:{lang:'en',numFmt:'en',currency:'EUR',start:{y:2026,m:7},guide:{on:false,done:true}},
 categories:{income:[{name:'Salary'},{name:'Dividends'},{name:'Interest'}],expenses:[{name:'Rent'}],investments:[{name:'Funds'}]},
 networth:{accounts:[{id:'cash',name:'Main Bank',group:'cash'},{id:'alpha',name:'Alpha Broker',group:'invest'},{id:'beta',name:'Beta Broker',group:'invest'}],snaps,...extra}}});
const row=(id,date,amount,concept,category)=>({id,date,amount,concept,category});
(async()=>{
 const b=await chromium.launch({channel:'msedge'});
 try{
 const c=await b.newContext({viewport:{width:1280,height:900},locale:'en-GB'});
 await c.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en');});
 await c.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
 const p=await c.newPage();await p.goto('http://localhost:8000/');await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');
 const findings=[];
 const run=async(name,d,prev,k,expected)=>{
  const seed=JSON.parse(JSON.stringify(d));
  if(name==='retained-dividend')seed.months['2026-09'].income=[];
  await p.evaluate(d=>{const a=window.__ybt;a.loadDataset(d,false);a.S.ui.tab='networth';a.S.ui.nw.month=Object.keys(d.config.networth.snaps).sort().at(-1);a.S.ui.analysis={networth:true};a.render();},seed);
  if(name==='retained-dividend'){
   await p.click('#tab-transactions');await p.locator('[data-action=add-tx]').first().click();
   await p.selectOption('#f-table','income');await p.selectOption('#f-cat',{label:'Dividends'});
   await p.fill('#f-date','2026-09-15');await p.fill('#f-concept','Alpha Broker dividend retained');await p.fill('#f-amount','100');await p.check('#f-dir-in',{force:true});
   await p.click('#tx-form button[type=submit]');await p.waitForSelector('#tx-form',{state:'detached'});
   if(await p.locator('#overlay .modal').count())await p.keyboard.press('Escape');
   await p.click('#tab-networth');
  }
  const got=await p.evaluate(({prev,k})=>({gains:Object.fromEntries(window.__ybt.nwGains(prev,k)),split:window.__ybt.nwSplit(prev,k)}),{prev,k});
  findings.push({name,expected,actual:got,ui:{reviewButtons:await p.locator('button.nw-review').count(),unlinkedWarning:await p.locator('.warn-text').allTextContents(),accounts:await p.locator('table.nwt').innerText()}});await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(d,null,2));
  return got;
 };
 const noRows={income:[],expenses:[],investments:[]};
 let d=base({'2026-09':{...noRows,income:[row('div','2026-09-15',100,'Alpha Broker dividend retained','Dividends')]}},{'2026-08':{cash:1000,alpha:1000,beta:0},'2026-09':{cash:1000,alpha:1100,beta:0}});
 let got=await run('retained-dividend',d,'2026-08','2026-09',{alphaGain:100,totalGain:100,totalChange:100});
 assert.equal(got.gains.alpha,200,'Reproduce retained dividend double counting');
 d=base({'2026-09':{...noRows,investments:[row('transfer','2026-09-15',-500,'Transfer from Alpha Broker to Beta Broker','Funds')]}},{'2026-08':{cash:1000,alpha:1000,beta:1000},'2026-09':{cash:1000,alpha:500,beta:1500}});
 got=await run('broker-transfer',d,'2026-08','2026-09',{alphaGain:0,betaGain:0,totalGain:0,totalChange:0});
 assert.equal(got.gains.alpha,-500);assert.equal(got.gains.beta,500);
 await p.click('[data-action=nw-link]');
 await p.locator('#nw-link-form .link-row select').selectOption('beta');
 await p.click('#nw-link-form button[type=submit]');
 const transferLinked=await p.evaluate(()=>({gains:Object.fromEntries(window.__ybt.nwGains('2026-08','2026-09')),split:window.__ybt.nwSplit('2026-08','2026-09')}));
 assert.equal(transferLinked.gains.alpha,-500);assert.equal(transferLinked.gains.beta,0);assert.equal(transferLinked.split.gains,-500);
 findings.push({name:'broker-transfer-linked-through-UI',expected:{alphaGain:0,betaGain:0,totalGain:0},actual:transferLinked,ui:{reviewButtons:await p.locator('button.nw-review').count(),accounts:await p.locator('table.nwt').innerText()}});
 await p.screenshot({path:path.join(out,'broker-transfer-linked.png'),fullPage:true});
 d=base({'2026-08':{...noRows},'2026-09':{...noRows,investments:[row('dep','2026-09-15',-200,'Alpha Broker deposit','Funds')]}},{'2026-07':{cash:1000,alpha:1000,beta:0},'2026-09':{cash:500,alpha:1500,beta:0}},{contributions:{'2026-08':{alpha:300}}});
 got=await run('partial-contributions',d,'2026-07','2026-09',{alphaGain:0,explanation:'Use reviewed August contribution 300 plus September linked deposit 200.'});
 assert.equal(got.gains.alpha,300,'Reproduce all-or-nothing contribution override');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(findings,null,2));
 console.log(JSON.stringify(findings.map(f=>({name:f.name,expected:f.expected,gains:f.actual.gains,left:f.actual.split.left,why:f.actual.split.why})),null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
