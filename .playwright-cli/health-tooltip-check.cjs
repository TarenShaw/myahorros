const {chromium}=require('playwright');
const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 for(const lang of ['en','es']) {
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(l=>localStorage.setItem('ybt.lang',l),lang);
  await page.goto('http://localhost:8000');
  await page.locator('.wl-hero [data-x=demo]').click();
  await page.locator('#tour-card [data-tour=free]').click();
  await page.locator('#tab-networth').click();
  await page.evaluate(()=>{document.querySelector('#analysis-networth').hidden=false});
  for(const width of [1280,390]) {
   await page.setViewportSize({width,height:844});
   for(const key of ['emerg','fi','save','passive','age']) {
    const btn=page.locator(`[data-info=fh_${key}]`); await btn.scrollIntoViewIfNeeded();await btn.click();
    const tip=page.locator('#infotip');assert.ok((await tip.innerText()).length>100);
    const b=await tip.boundingBox(); assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=845,JSON.stringify({lang,width,key,b}));
    await btn.click();
   }
  }
  assert.deepStrictEqual(errors,[]);
  console.log(lang+': all five tooltips fit desktop and mobile, no page errors');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
