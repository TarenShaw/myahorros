async page => {
 for(const locale of ['en-GB','en-US']){
  const ctx=await page.context().browser().newContext({locale,viewport:{width:1280,height:900},serviceWorkers:'block'}),p=await ctx.newPage();
  await p.addInitScript(()=>localStorage.setItem('ybt.lang','en'));await p.goto('http://localhost:8000/');await p.locator('.wl-hero [data-x=demo]').click();await p.locator('#tour-card [data-tour=free]').click();await p.locator('#tab-transactions').click();await p.locator('[data-action=add-tx]').click();
  await p.locator('#f-date').fill(locale==='en-US'?'03/04/2026':'04/03/2026');await p.locator('#f-concept').fill('Example transaction');
  for(const width of [1280,390]){await p.setViewportSize({width,height:900});await p.locator('#overlay').screenshot({path:`.playwright-cli/date-form-${locale}-${width}.png`});}
  await ctx.close();
 }
 return 'Regional date previews captured';
}
