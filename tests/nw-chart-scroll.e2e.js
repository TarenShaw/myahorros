/* Picking a historical Net worth bar must keep the chart under the pointer.
   NODE_PATH=<playwright folder> node tests/nw-chart-scroll.e2e.js */
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({channel:'msedge'});try{for(const width of [1280,390]){
  const c=await b.newContext({viewport:{width,height:860}}),errors=[];
  await c.addInitScript(()=>{window.__ybtTest=true;localStorage.setItem('ybt.lang','en');});
  await c.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:'window.google={accounts:{oauth2:{}}};'}));
  const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(process.env.START_URL||'http://localhost:8000/');
  await p.click('.wl-hero [data-x=demo]');await p.click('#tour-card [data-tour=free]');await p.click('#tab-networth');
  await p.evaluate(()=>{const a=window.__ybt, month=k=>({income:[{id:k,date:k+'-10',amount:1000,concept:'Example salary',category:'Salary'}],expenses:[{id:k+'e',date:k+'-11',amount:-800,concept:'Example rent',category:'Rent'}],investments:[]});
    a.loadDataset({months:{'2026-08':month('2026-08'),'2026-09':month('2026-09')},config:{settings:{lang:'en',start:{y:2026,m:7},guide:{done:true,on:false}},networth:{accounts:[{id:'cash',name:'Example cash',group:'cash'},{id:'fund',name:'Example fund',group:'invest'}],snaps:{'2026-08':{cash:1000,fund:1000},'2026-09':{cash:1200,fund:1050}},goal:{amount:5000,month:'2027-09'}}}},false);
    a.S.ui.analysis={networth:true};a.S.ui.nw.month='2026-09';a.render();});
  await p.locator('#ch-nw').scrollIntoViewIfNeeded();
  const click=async(label,month)=>{
    const box=await p.locator('#ch-nw').boundingBox(),svg=await p.locator('#ch-nw svg').boundingBox(),W=+(await p.locator('#ch-nw svg').getAttribute('width'));
    const i={Aug:7,Sep:8,Oct:9}[label],x=svg.x+(58+(W-66)/12*(i+0.5))*svg.width/W;
    await p.mouse.click(x,box.y+130);
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.strictEqual(await p.inputValue('#nw-month'),month,'selected month updates');
    const after=await p.locator('#ch-nw').boundingBox();assert(Math.abs(after.y-box.y)<2,'chart jumped '+(after.y-box.y)+'px at '+width+'px');
  };
  await click('Aug','2026-08');await click('Sep','2026-09');await click('Sep','2026-09');await click('Oct','2026-09');
  assert.deepStrictEqual(errors,[]);await c.close();console.log('Net worth chart stays in place: '+width+'px passed');
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
