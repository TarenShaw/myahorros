async page => {
 for(const theme of ['light','dark']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),p=await ctx.newPage();
  await p.addInitScript(t=>{localStorage.setItem('ybt.lang','en');localStorage.setItem('ybt.theme',t)},theme);await p.goto('https://myahorros.app/');await p.locator('.wl-hero [data-x=demo]').click();await p.locator('#tour-card [data-tour=free]').click();await p.locator('#tab-overview').click();
  await p.locator('#month-comparison').screenshot({path:`.playwright-cli/palette-current-${theme}.png`});
  await p.addStyleTag({content:theme==='light'?`:root{--good:#087a56!important;--good-ink:#087a56!important;--c-income:#087a56!important;--c-expenses:#b94e25!important;--c-investments:#2868c7!important}input:not([type=checkbox]),select,textarea{border-color:#7b8c84!important}`:`:root{--surface:#191d1e!important;--surface-2:#202729!important;--surface-3:#2a3133!important;--muted:#96969c!important;--line:#383f41!important;--good:#52cfa1!important;--good-ink:#52cfa1!important}input:not([type=checkbox]),select,textarea{border-color:#77777f!important}`});
  await p.locator('#month-comparison').screenshot({path:`.playwright-cli/palette-proposed-${theme}.png`});await p.locator('.tm').screenshot({path:`.playwright-cli/palette-proposed-month-${theme}.png`});
  await ctx.close();
 }
 return 'Candidate previews captured; live site unchanged.';
}
