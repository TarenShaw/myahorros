/* Savings-rate and age-benchmark regression checks: node tests/health-smoke.js */
const fs=require('fs'), assert=require('assert'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const grab=name=>{const a=html.indexOf('function '+name+'('), b=html.indexOf('\n}',a); assert.ok(a>=0&&b>a);return html.slice(a,b+2);};
const row=(date,table,amount,category='Salary')=>({date,table,amount,category});
const rows=[row('2026-08-01','income',1000),row('2026-08-02','expenses',-490,'Food'),
  row('2026-09-01','income',1000),row('2026-09-02','expenses',-650,'Food'),row('2026-09-03','expenses',40,'Refund'),
  row('2026-09-04','investments',-200,'Funds'),row('2026-09-05','income',30,'Interest'),
  row('2026-10-01','income',9999),row('2025-09-01','income',9999)];
const settings={birthYear:1994,salary:62000};
const accounting=['isInternalTransfer','isRetained','isBudgetRow'].map(n=>html.split('\n').find(l=>l.startsWith('const '+n+'='))).join('\n');
const {healthMonths,healthCard,agg}=new Function('rows','settings',`
  const S={settings}, allRows=()=>rows, memo=(k,f)=>f(), ymNow=()=> '2026-10';
  const ymAdd=(k,n)=>{const d=new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7)-1+n,1));return d.toISOString().slice(0,7);};
  const r2=n=>Math.round(n*100)/100, sum=a=>a.reduce((x,y)=>x+y,0), isReturn=r=>r.category==='Interest';
  const nw=()=>({accounts:[],snaps:{}}), loose=s=>s, esc=s=>String(s), DASH='—', ICON={ok:'',warn:''};
  const HEALTH={emergencyMonthsTarget:6,fiMultiple:25,withdrawalRate:0.04,savingsRateTarget:0.2,fiGroups:[],emergencyExclude:[]};
  const fmtPct=(n,d=1)=> (n*100).toFixed(d)+'%', fmtEUR=n=>String(n), fmtNum=(n,d)=>n.toFixed(d), info=()=>'', M=()=>Array(12).fill('Month'), ymIn=k=>k;
  const L=(k,...args)=>[k,...args].join('|');
  const TKEYS=['income','expenses','investments'], UNCAT='Uncategorised';
  const ovFirst=()=>settings.startMonth||0, catNames=()=>[], cats=()=>({expenses:[]}), roleName=()=>null;
  ${accounting} ${grab('agg')} ${grab('trackerSaved')} ${grab('healthMonths')} ${grab('healthCard')}
  return {healthMonths,healthCard,agg};
`)(rows,settings);
assert.deepStrictEqual(healthMonths('2026-09'),[{k:'2026-09',inc:1000,exp:610},{k:'2026-08',inc:1000,exp:490}]);
const card=healthCard('2026-09',{g:{},total:198400});
assert.ok(card.includes('90.9%'), 'yearly rate includes recorded current month, matching Overview');
assert.ok(card.includes('fhYearRate|2026'), 'yearly period is labelled');
assert.ok(card.includes('fhMonthRate|Month|40.8%|↓|false'), 'selected month includes all income, matching Overview');
assert.ok(card.includes('fhAgeSub|32|198400')&&card.includes('1.0×'), 'age benchmark uses selected year and annual gross salary');
settings.birthYear=null;
assert.ok(healthCard('2026-09',{g:{},total:198400}).includes('data-action="goto-about"'), 'missing details offer direct navigation');
// Remove the unfinished month: all income (including returns) remains in the Overview calculation.
rows.splice(rows.findIndex(r=>r.date==='2026-10-01'),1);
let yearly=agg(2026,true).Y;
assert.ok(healthCard('2026-09',{g:{},total:0}).includes((yearly.savRate*100).toFixed(1)+'%'), 'health shares actual Overview aggregation');
assert.strictEqual((yearly.savRate*100).toFixed(1),'45.8');
settings.startMonth=8;
yearly=agg(2026,true).Y;
assert.ok(healthCard('2026-09',{g:{},total:0}).includes('40.8%'), 'tracking start matches Overview');
settings.startMonth=0;
rows[0].amount=2000;
assert.ok(healthCard('2026-09',{g:{},total:0}).includes('63.7%'), 'yearly rate is weighted by income');
rows.length=0;
assert.ok(healthCard('2026-09',{g:{},total:0}).includes('fhNoInc'), 'empty year has no savings rate');
rows.push(row('2026-10-01','income',100),row('2026-10-02','expenses',-120,'Food'));
assert.ok(healthCard('2026-10',{g:{},total:0}).includes('-20.0%'), 'current-month-only year and negative savings match Overview');
console.log('health smoke: Overview parity, periods, precision, refunds, investments, returns, tracking start and age benchmark passed');
