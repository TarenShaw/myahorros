const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({channel:'msedge'});try{for(const lang of ['en','es']){
const c=await b.newContext({viewport:{width:1280,height:900}});await c.addInitScript(l=>{localStorage.setItem('ybt.lang',l);localStorage.setItem('ybt.theme','dark')},lang);
await c.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
const p=await c.newPage(), errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://localhost:8000/');await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');await p.click('#tab-transactions');
for(const width of [1280,800,390]){await p.setViewportSize({width,height:900});if(await p.locator('.tx-filter-panel').evaluate(el=>el.open))await p.click('.tx-filter-panel>summary');await p.click('.tx-filter-panel>summary');
const layout=await p.locator('.tx-filter-panel .filters').evaluate(el=>({cols:getComputedStyle(el).gridTemplateColumns.split(' ').length,fields:[...el.querySelectorAll('input:not([type=checkbox]),select')].map(x=>{const r=x.getBoundingClientRect();return {h:r.height,w:r.width,x:r.x,y:r.y};}),overflow:document.documentElement.scrollWidth>innerWidth+1}));
assert.strictEqual(layout.cols,width===1280?5:width===800?2:1);assert.strictEqual(layout.fields.length,10);assert(!layout.overflow,'page overflow '+lang+width);
for(const f of layout.fields)assert(Math.abs(f.h-44)<1,'field height '+JSON.stringify(f));
for(const f of layout.fields)assert(Math.abs(f.w-layout.fields[0].w)<1,'field width mismatch');
for(const f of layout.fields){const same=layout.fields.filter(x=>Math.abs(x.y-f.y)<2);for(const x of same)assert(Math.abs(x.y-f.y)<1,'row misalignment');}
await p.locator('.tx-filter-panel').screenshot({path:'qa/filters-'+lang+'-'+width+'.png'});
await p.fill('#tx-q','ACME');await p.waitForSelector('#tx-ally');assert(await p.locator('#tx-ally').isVisible());await p.click('[data-action=tx-clear]');}
assert.deepStrictEqual(errors,[]);await c.close();console.log('Filter layout: '+lang+' desktop/tablet/phone passed');
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
