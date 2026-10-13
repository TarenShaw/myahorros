/* Cash money in/out stays separate from interest and unexplained balance changes.
   NODE_PATH=<Playwright modules> node tests/nw-cash-flows.e2e.js */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const START=process.env.START_URL||'http://localhost:8000/';
const data=lang=>({app:'Yearly Budget Tracker',format:1,months:{'2026-09':{
  income:[{id:'salary',date:'2026-09-01',amount:2000,concept:'Salary',category:'Salary',account:'bank'},
    {id:'interest',date:'2026-09-30',amount:6.37,concept:'Main Bank interest',category:'Interest',account:'bank'},
    {id:'other',date:'2026-09-05',amount:50,concept:'Other income',category:'Salary',account:'side'}],
  expenses:[{id:'spending',date:'2026-09-10',amount:-1985.15,concept:'Recorded spending',category:'Rent',account:'bank'},
    {id:'refund',date:'2026-09-11',amount:20,concept:'Refund',category:'Rent',account:'bank'}],
  investments:[{id:'deposit',date:'2026-09-15',amount:-400,concept:'Broker deposit',category:'Funds',account:'bank',investmentAccount:'fund'}]
}},config:{categories:{income:[{name:'Salary'},{name:'Interest'}],expenses:[{name:'Rent'}],investments:[{name:'Funds'}]},
  settings:{lang,numFmt:'en',currency:'EUR',start:{y:2026,m:8},guide:{on:false,done:true,stmts:{quiet:{periods:[['2026-09-01','2026-09-30']]}}}},
  networth:{accounts:[{id:'bank',name:'Main Bank',group:'cash'},{id:'side',name:'Side Bank',group:'cash'},
    {id:'quiet',name:'Confirmed no activity',group:'cash'},{id:'unknown',name:'No linked statement',group:'cash'},
    {id:'fund',name:'Broker',group:'invest'}],
    snaps:{'2026-08':{bank:6628.24,side:200,quiet:10,unknown:40,fund:1000},'2026-09':{bank:6269.46,side:250,quiet:10,unknown:40,fund:1410}}}}});
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try{for(const lang of ['en','es'])for(const width of [1280,390]){
    const context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'block'}),p=await context.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(String(e)));
    await context.addInitScript(l=>{window.__ybtTest=true;localStorage.setItem('ybt.lang',l);localStorage.setItem('ybt.theme','dark');},lang);
    await context.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
    await p.goto(START);
    await p.evaluate(async d=>{localStorage.setItem('ybt.storage','browser');localStorage.setItem('ybt.picked','1');await window.__ybtWeb.idb.set('data',JSON.stringify(d));},data(lang));
    await p.reload();await p.waitForFunction(()=>window.__ybt?.S.gotMonths);await p.click('#tab-networth');
    const table=p.locator('.nwt'), row=name=>table.locator('tbody tr').filter({has:p.locator('td.an',{hasText:name})});
    assert.equal((await table.locator('thead th').nth(3).textContent()).trim(),lang==='en'?'Net money in/out':'Entradas/salidas netas');
    assert.equal(await row('Main Bank').locator('td').nth(3).innerText(),'−365.15 €');
    assert.equal(await row('Main Bank').locator('td').nth(4).innerText(),'+6.37 €');
    assert.equal(await row('Side Bank').locator('td').nth(3).innerText(),'+50.00 €');
    assert.equal(await row('Confirmed no activity').locator('td').nth(3).innerText(),'0.00 €');
    assert.equal(await row('No linked statement').locator('td').nth(3).innerText(),lang==='en'?'No linked data':'Sin datos vinculados');
    assert.ok(await row('No linked statement').locator('td').nth(3).isVisible(),'unknown movement is visible on desktop and phone');
    assert.equal(await row('Broker').locator('td').nth(3).innerText(),'+400.00 €');
    assert.equal(await row('Broker').locator('td').nth(4).innerText(),'+10.00 €');
    assert.equal(await table.locator('tbody tr.grp').first().locator('td').nth(3).innerText(),'−315.15 €');
    assert.equal(await table.locator('tfoot td').nth(3).innerText(),'+84.85 €');
    assert.equal(await p.evaluate(()=>window.__ybt.nwSplit('2026-08','2026-09').left),0);
    if(process.env.SHOTS){fs.mkdirSync(process.env.SHOTS,{recursive:true});await table.locator('..').locator('..').screenshot({path:process.env.SHOTS+`/cash-${lang}-${width}.png`});}
    // A balance mismatch stays unexplained; it must not become a salary contribution.
    await p.evaluate(()=>{const a=window.__ybt;a.S.nw.snaps['2026-09'].bank+=8.7;a.saveNw();a.render();});
    assert.equal(await row('Main Bank').locator('td').nth(3).innerText(),'−365.15 €');
    assert.equal(await p.evaluate(()=>window.__ybt.nwSplit('2026-08','2026-09').left),8.7);
    // An older unlinked salary can be found and linked through the existing editor.
    await p.evaluate(()=>{const a=window.__ybt;a.upsertTx(null,{table:'income',date:'2026-09-20',amount:100,concept:'Legacy unlinked salary',category:'Salary'});a.render();});
    await p.click('[data-action=nw-cash-transactions]');
    assert.equal(await p.inputValue('#tx-account'),'__unlinked__');
    assert.equal(await p.locator('[data-action=edit-tx]').count(),1,'review filters out already-linked rows');
    await p.click('[data-action=edit-tx]');await p.selectOption('#f-account','bank');await p.locator('#tx-form button[type=submit]').click();
    await p.click('#tab-networth');
    assert.equal(await row('Main Bank').locator('td').nth(3).innerText(),'−265.15 €');
    assert.equal(await p.locator('[data-action=nw-cash-transactions]').count(),0,'warning disappears after linking');
    assert.ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'cash table does not overflow the page');
    assert.deepEqual(errors,[]);await context.close();console.log(`${lang} ${width}px: cash flows, gains, unknown activity and account correction passed`);
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
