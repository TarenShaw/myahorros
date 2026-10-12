/* Palette checks: automatic/explicit themes, contrast, focus and validation states.
   NODE_PATH=<playwright folder> node tests/palette.e2e.js */
const {chromium}=require('playwright'),assert=require('assert');
const START=process.env.START_URL||'http://localhost:8000/';
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const [theme,scheme,lang] of [['light','dark','en'],['dark','light','en'],['light','dark','es'],['dark','light','es'],['auto','light','en'],['auto','dark','en']]){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},colorScheme:scheme,serviceWorkers:'block'}),errors=[];
  await ctx.addInitScript(({theme,lang})=>{localStorage.setItem('ybt.theme',theme);localStorage.setItem('ybt.lang',lang)}, {theme,lang});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(START);
  const palette=await p.evaluate(()=>{
   const root=getComputedStyle(document.documentElement),get=n=>root.getPropertyValue('--'+n).trim(),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const cx=canvas.getContext('2d');
   const rgb=s=>{cx.fillStyle=s;cx.fillRect(0,0,1,1);return [...cx.getImageData(0,0,1,1).data].slice(0,3)};
   const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>{const x=lum(rgb(get(a))),y=lum(rgb(get(b)));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   return {surface:get('surface'),text:['surface','surface-2','surface-3','accent-soft'].map(n=>ratio('muted',n)),positive:['surface','good-soft','accent-soft'].map(n=>ratio('good-ink',n)),controls:['bg','surface','surface-2'].map(n=>ratio('control-line',n)),charts:['c-income','c-expenses','c-investments'].map(n=>ratio(n,'surface-3'))};
  });
  assert.equal(palette.surface,(theme==='auto'?scheme:theme)==='dark'?'#191d1e':'#fcfdfc','explicit theme beats system');
  for(const r of [...palette.text,...palette.positive])assert(r>=4.5,'text contrast '+r);
  for(const r of [...palette.controls,...palette.charts])assert(r>=3,'control/chart contrast '+r);
  await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');await p.click('#tab-networth');await p.click('[data-action=analysis-toggle]');
  const input=p.locator('#scenario-extra');await input.focus();assert.equal(await input.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  await input.fill('-1');assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert(await input.evaluate(e=>getComputedStyle(e).borderTopColor===getComputedStyle(document.querySelector('#scenario-error')).color),'invalid border stays red');
  await input.fill('100');assert.equal(await input.getAttribute('aria-invalid'),'false');
  for(const width of [1280,390]){await p.setViewportSize({width,height:900});for(const tab of ['overview','networth','transactions','yearly','settings']){await p.click('#tab-'+tab);assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),tab+' overflow');}}
  assert.deepEqual(errors,[]);await ctx.close();console.log(`${theme}/${scheme}/${lang}: contrast, focus, error state and responsive tabs passed`);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
