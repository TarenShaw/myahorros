/* Dates follow the browser region, independent of UI language and bank-file order.
   NODE_PATH=<playwright folder> node tests/date-format.e2e.js */
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const X=require('../vendor/xlsx.full.min.js');
const START=process.env.START_URL||'http://localhost:8000/';
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{
 for(const locale of ['en-GB','es-ES','en-CA','ja-JP','en-IN','en','en-US','es-US']){
  const us=locale.endsWith('-US'),shown=us?'03/04/2026':'04/03/2026',order=us?'mm/dd/yyyy':'dd/mm/yyyy';
  const ctx=await browser.newContext({locale,viewport:{width:1280,height:900},serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
  await ctx.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en')});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(START);await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');
  const result=await p.evaluate(({shown})=>{const a=window.__ybt;return {display:a.fmtDate('2026-03-04'),format:a.dateFormat(),parsed:a.parseUiDate(shown),bad:a.parseUiDate('31/02/2026'),leap:a.parseUiDate(a.fmtDate('2024-02-29')),ambiguous:a.parseUiDate('04/05/2026'),iso:a.parseUiDate('2026-03-04')};},{shown});
  assert.equal(result.display,shown);assert.equal(result.format,order);assert.equal(result.parsed,'2026-03-04');assert.equal(result.bad,null);assert.equal(result.leap,'2024-02-29');assert.equal(result.ambiguous,us?'2026-04-05':'2026-05-04');assert.equal(result.iso,'2026-03-04');
  await p.click('#tab-transactions');await p.click('[data-action=add-tx]');assert.equal(await p.locator('#f-date').getAttribute('placeholder'),order);
  await p.fill('#f-date','31/02/2026');await p.fill('#f-concept','Date format regression');await p.fill('#f-amount','12');await p.click('#tx-form button[type=submit]');assert(await p.locator('#f-err').isVisible(),'invalid date rejected');
  await p.fill('#f-date',shown);await p.click('#tx-form button[type=submit]');await p.waitForSelector('#tx-form',{state:'hidden'});
  assert.equal(await p.evaluate(()=>window.__ybt.allRows().find(r=>r.concept==='Date format regression').date),'2026-03-04','saved date stays ISO');
  if(!await p.locator('.tx-filter-panel').evaluate(el=>el.open))await p.locator('.tx-filter-panel>summary').click();await p.fill('#tx-from',shown);await p.locator('#tx-from').dispatchEvent('change');assert.equal(await p.evaluate(()=>window.__ybt.S.ui.tx.from),'2026-03-04');assert.equal(await p.locator('#tx-from').inputValue(),shown);
  await p.locator('#tx-from').locator('..').locator('[data-date-picker]').fill('2026-05-06');await p.locator('#tx-from').locator('..').locator('[data-date-picker]').dispatchEvent('change');assert.equal(await p.evaluate(()=>window.__ybt.S.ui.tx.from),'2026-05-06');assert.equal(await p.locator('#tx-from').inputValue(),us?'05/06/2026':'06/05/2026');
  await p.fill('#tx-from','');await p.locator('#tx-from').dispatchEvent('change');assert.equal(await p.evaluate(()=>window.__ybt.S.ui.tx.from),'');
  for(const width of [1280,390]){await p.setViewportSize({width,height:900});assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));if(process.env.SHOTS)await p.screenshot({path:path.join(process.env.SHOTS,`dates-${locale}-${width}.png`)});}
  await p.click('#tab-settings');await p.evaluate(()=>{window.__ybt.S.downloads={save:async({data})=>{window.__dateExport=[...new Uint8Array(await data.arrayBuffer())]}}});await p.click('[data-action=export]');await p.waitForFunction(()=>window.__dateExport);const bytes=await p.evaluate(()=>window.__dateExport);const wb=X.read(Buffer.from(bytes),{type:'buffer',cellNF:true});assert.equal(wb.Sheets[wb.SheetNames[0]].A2.z,order,'Excel date display follows region');assert.equal(wb.Sheets[wb.SheetNames[0]].A2.t,'n','Excel dates remain numeric');
  assert.deepEqual(errors,[]);await ctx.close();console.log(locale+': display, parsing, validation, save/filter/calendar and Excel dates passed');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
