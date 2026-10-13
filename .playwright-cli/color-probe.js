async page => {
 const results=[];
 const probe=async()=>page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const cx=canvas.getContext('2d'),cache=new Map();
  const rgb=s=>{if(cache.has(s))return cache.get(s);cx.clearRect(0,0,1,1);cx.fillStyle=s;cx.fillRect(0,0,1,1);const v=[...cx.getImageData(0,0,1,1).data];v[3]/=255;cache.set(s,v);return v;};
  const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
  const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const hex=c=>'#'+c.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  function bg(el){let chain=[];for(let n=el;n;n=n.parentElement)chain.unshift(n);let b=[255,255,255];for(const n of chain)b=blend(rgb(getComputedStyle(n).backgroundColor),b);return b;}
  const root=getComputedStyle(document.documentElement),tokens={};
  for(const name of ['bg','surface','surface-2','surface-3','ink','ink-2','muted','line','line-2','accent','accent-ink','accent-soft','good','good-ink','bad','bad-ink','warn','warn-ink','c-income','c-expenses','c-investments','g-cash','g-invest','g-illiquid','g-pension'])tokens[name]=root.getPropertyValue('--'+name).trim();
  const texts=[];
  for(const el of document.querySelectorAll('h1,h2,h3,p,span,small,b,strong,label,button,a,summary,td,th')){
   if(!el.getBoundingClientRect().width||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||el.closest('[aria-hidden=true]'))continue;
   const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();if(!text)continue;
   const s=getComputedStyle(el),back=bg(el),front=blend(rgb(s.color),back),size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight),threshold=size>=24||(size>=18.66&&weight>=700)?3:4.5;
   texts.push({text:text.slice(0,90),tag:el.tagName,cls:el.className,fg:hex(front),bg:hex(back),size,ratio:+ratio(front,back).toFixed(2),threshold,disabled:el.matches(':disabled'),gradient:!!el.closest('.wl-hero')});
  }
  const failures=texts.filter(x=>x.ratio<x.threshold&&!x.disabled),unique=[...new Map(failures.map(x=>[x.fg+x.bg+x.cls,x])).values()];
  const mainPairs=[...new Map(texts.filter(x=>/hint|sub|nw-stat|nw-sval|good|bad|warn|primary|linkish|kicker|ph-meta/.test(x.cls)).map(x=>[x.fg+x.bg,x])).values()];
  const controls=[...document.querySelectorAll('input:not([type=checkbox]),select,.btn,.info-btn')].filter(x=>x.getBoundingClientRect().width).slice(0,20).map(el=>{const s=getComputedStyle(el),b=bg(el);return {text:el.getAttribute('aria-label')||el.textContent.trim().slice(0,30),border:s.borderColor,bg:hex(b),borderContrast:+ratio(rgb(s.borderTopColor),b).toFixed(2),fg:s.color}});
  return {theme:document.documentElement.getAttribute('data-ybt-theme'),tokens,textCount:texts.length,failures:unique,pairs:mainPairs,controls};
 });
 for(const theme of ['light','dark']){
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  page=await ctx.newPage();await page.addInitScript(t=>{localStorage.setItem('ybt.theme',t);localStorage.setItem('ybt.lang','en')},theme);
  await page.goto('https://myahorros.app/');
  await page.locator('.wl-hero').waitFor();await page.screenshot({path:`.playwright-cli/colors-${theme}-landing.png`});results.push({theme,view:'landing',...await probe()});
  await page.locator('.wl-hero [data-x=demo]').click();await page.locator('#tour-card [data-tour=free]').click();
  for(const tab of ['overview','networth','transactions','yearly','settings']){
   await page.locator('#tab-'+tab).click();
   if(['overview','networth'].includes(tab))await page.getByRole('button',{name:'More analysis',exact:true}).click();
   await page.screenshot({path:`.playwright-cli/colors-${theme}-${tab}.png`});
   const data=await probe();results.push({theme,view:tab,...data});
   if(tab==='overview'){await page.locator('#month-comparison').screenshot({path:`.playwright-cli/colors-${theme}-compare.png`});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`.playwright-cli/colors-${theme}-mobile.png`});await page.setViewportSize({width:1440,height:1000});}
  }
  await ctx.close();
 }
 return JSON.stringify(results);
}
