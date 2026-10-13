/* Newcomer review flags, transaction filters and financial scenarios without a browser.
   node tests/experience-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => {
  const a = html.indexOf('function ' + name + '(');
  assert.ok(a >= 0, name + ' not found');
  const endLine = html.indexOf('\n', a);
  if (html.slice(a, endLine).trimEnd().endsWith('}')) return html.slice(a, endLine);
  const b = html.indexOf('\n}', a);
  assert.ok(b > a, name + ' end not found');
  return html.slice(a, b + 2);
};
const line = prefix => {
  const a = html.indexOf(prefix);
  assert.ok(a >= 0, prefix + ' not found');
  return html.slice(a, html.indexOf('\n', a) + 1);
};
const { txMatches, impNeedsAttention } = new Function(
  'const wantNum=()=>"en";' + line('const r2=') + line('const WORDCH=') +
  grab('parseAmount') + grab('txMatches') + grab('impNeedsAttention') +
  'return {txMatches,impNeedsAttention};'
)();

// Refunds and charges use their magnitude for amount filters; dates include both endpoints.
const row = { date: '2026-09-10', amount: -30, account: 'bank', source: 'example.csv', batch: 'batch1' };
assert.ok(txMatches(row, {}), 'old rows and empty filters remain usable');
assert.ok(txMatches(row, { from: row.date, to: row.date, min: '30', max: '30', account: 'bank', source: 'example.csv', batch: 'batch1' }));
assert.ok(txMatches({ ...row, amount: 30 }, { min: '30', max: '30' }), 'a refund has the same amount magnitude');
assert.ok(!txMatches(row, { from: '2026-09-11' }));
assert.ok(!txMatches(row, { to: '2026-09-09' }));
assert.ok(!txMatches(row, { min: '30.01' }));
assert.ok(!txMatches(row, { max: '29.99' }));
assert.ok(!txMatches(row, { account: 'other' }));
assert.ok(!txMatches(row, { source: 'other.csv' }));
assert.ok(!txMatches(row, { batch: 'batch2' }));
assert.ok(txMatches(row, { min: 'invalid', max: '' }), 'an incomplete typed bound must not hide all rows');
assert.ok(!txMatches({ date: row.date, amount: -30 }, { account: 'bank' }), 'legacy unlinked rows must not masquerade as a selected account');

// The attention shortcut uses the category filter, including rows with stale categories.
const txState={ui:{year:2026,tx:{table:'expenses',q:'',month:'all',cat:'all',sort:'date-desc'}}};
const txRows=[
  {...row,id:'ready',table:'expenses',category:'Groceries',concept:'Shop',ord:0},
  {...row,id:'blank',table:'expenses',category:'',concept:'Shop',ord:1},
  {...row,id:'stale',table:'expenses',category:'Removed category',concept:'Other',ord:2},
  {...row,id:'income',table:'income',category:'',concept:'Shop',ord:3},
  {...row,id:'old',date:'2025-09-10',table:'expenses',category:'',concept:'Shop',ord:4}
];
const txFiltered=new Function('S','allRows','isKnown','fold','fmtNum','txMatches',
  'const UNCAT="Uncategorised";'+grab('txFiltered')+'return txFiltered;'
)(txState,()=>txRows,(t,c)=>c==='Groceries',s=>String(s||'').toLowerCase(),String,txMatches);
const attention={...txState.ui.tx,cat:'Uncategorised'};
assert.deepStrictEqual(txFiltered(attention).map(r=>r.id),['blank','stale']);
assert.strictEqual(txFiltered().length,3,'All rows restores classified rows');
assert.strictEqual(txState.ui.tx.cat,'all','counting attention must not change the active filters');
assert.deepStrictEqual(txFiltered({...attention,q:'shop',account:'bank'}).map(r=>r.id),['blank']);
txRows[1].category='Groceries';
assert.deepStrictEqual(txFiltered(attention).map(r=>r.id),['stale'],'accepting a category removes the row from attention');
assert.strictEqual(txFiltered({...attention,source:'other.csv'}).length,0);

// A clean row stays out of the attention list; every unresolved warning is surfaced.
const ready = { on: true, category: 'Groceries', concept: 'Example shop' };
assert.strictEqual(impNeedsAttention(ready), false);
for (const flag of ['dup', 'like', 'future', 'balOff', 'fx']) assert.ok(impNeedsAttention({ ...ready, [flag]: true }), flag);
assert.ok(impNeedsAttention({ ...ready, odd: 0 }), 'zero is a valid discrepancy warning');
assert.ok(impNeedsAttention({ ...ready, aiQ: 'Shared expense?' }));
assert.strictEqual(impNeedsAttention({ ...ready, aiQ: 'Shared expense?', aiA: 'Answered' }), false);
assert.ok(impNeedsAttention({ ...ready, category: '' }));
assert.ok(impNeedsAttention({ ...ready, concept: '  ---  ' }));
for (const warning of [{ category: '' }, { dup: true }, { like: 'Saved row' }, { future: true }, { aiQ: 'Shared expense?' }, { odd: 0 }]) {
  assert.ok(impNeedsAttention({ ...ready, ...warning }));
  assert.strictEqual(impNeedsAttention({ ...ready, ...warning, on: false }), false, 'excluded rows belong to All rows');
}
console.log('experience smoke: filters and review passed');

const {monthComparison,scenarioTotal,normRow}=new Function(
  'const ymAdd=(k,n)=>{const d=new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7)-1+n,1));return d.toISOString().slice(0,7)};const newId=()=>"new";'+line('const r2=')+line('const cents=')+line('const finAmt=')+line('const isInternalTransfer=')+line('const isRetained=')+line('const isBudgetRow=')+grab('normRow')+grab('monthComparison')+grab('scenarioTotal')+'return {monthComparison,scenarioTotal,normRow};')();
const history=[{date:'2026-08-01',table:'income',amount:100},{date:'2026-08-02',table:'expenses',amount:-20},{date:'2026-09-01',table:'income',amount:110.25},{date:'2026-09-02',table:'expenses',amount:-30.10},{date:'2026-09-03',table:'expenses',amount:5.05},{date:'2026-09-04',table:'investments',amount:-15}];
const cmp=monthComparison(history,'2026-09','month');
assert.deepStrictEqual(cmp.current,{income:110.25,expenses:25.05,investments:15,saved:85.2,n:4});
assert.deepStrictEqual(cmp.change,{income:10.25,expenses:5.05,investments:15,saved:5.2});
assert.strictEqual(cmp.previousMonth,'2026-08');assert.ok(cmp.complete);
assert.strictEqual(monthComparison(history,'2026-09','year').previousMonth,'2025-09');
assert.ok(!monthComparison(history,'2026-09','year').complete);
assert.strictEqual(scenarioTotal(1000,10.1,0.2,12),1123.6);
assert.strictEqual(scenarioTotal(-100,-10,5,2),-110);
for(const args of [[100,10,-1,12],[100,10,100,0],[100,10,100,1.5],[100,10,100,601],[100,10,NaN,12],[Infinity,10,0,12]]) assert.strictEqual(scenarioTotal(...args),null);
const provenance={id:'row',date:'2026-09-01',amount:1,concept:'Example',category:'Groceries',source:'test.csv',account:'a1',batch:'b1'};
assert.deepStrictEqual(normRow(provenance),provenance);
assert.ok(!('source' in normRow({...provenance,source:{bad:true}})));
console.log('experience smoke: comparisons, scenarios and source normalization passed');

const {coveragePeriods,statementCovered}=new Function('parseDate','ymdAdd','ymAdd','S',grab('coveragePeriods')+grab('statementCovered')+'return {coveragePeriods,statementCovered};',)(
  d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d?d:null,
  (d,n)=>new Date(new Date(d+'T12:00:00Z').getTime()+n*86400000).toISOString().slice(0,10),
  (k,n)=>new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7)-1+n,1)).toISOString().slice(0,7),
  {settings:{guide:{stmts:{a:{periods:[['2026-01-01','2026-01-31'],['2026-03-01','2026-03-31']]}}}}}
);
const gaps={periods:[['2026-01-01','2026-01-31'],['2026-03-01','2026-03-31']]};
assert.deepStrictEqual(coveragePeriods(gaps),gaps.periods);
assert.ok(statementCovered({id:'a'},'2026-01','2026-01'));
assert.ok(!statementCovered({id:'a'},'2026-01','2026-03'),'gaps must not be marked complete');
assert.deepStrictEqual(coveragePeriods(gaps,'2026-02-01','2026-02-28'),[['2026-01-01','2026-03-31']]);
assert.deepStrictEqual(coveragePeriods({coverFrom:'2026-01-01',coverTo:'2026-01-31'},'2026-02-01','2026-02-28'),[['2026-01-01','2026-02-28']]);
console.log('experience smoke: statement coverage and gaps passed');

// Rendered comparison colors reverse for expenses; unchanged totals stay neutral.
const comparisonRender = new Function('change', `
  const S={ui:{year:2026}}, allRows=()=>[{date:'2026-09-01'}], ymNow=()=> '2026-10';
  const esc=x=>x, L=x=>x, TL=x=>x, ymLabel=x=>x, fmtEUR=x=>x, signed=x=>x;
  const monthComparison=()=>({complete:true,previousMonth:'2026-08',current:{},previous:{},change});
  ${grab('comparisonCard')}
  return comparisonCard();
`);
for (const [change, expected] of [
  [{income:1,expenses:1,saved:1,investments:1}, ['good','bad','good','']],
  [{income:-1,expenses:-1,saved:-1,investments:-1}, ['bad','good','bad','']],
  [{income:0,expenses:0,saved:0,investments:0}, ['','','','']]
]) {
  const markup=comparisonRender(change);
  assert.strictEqual((markup.match(/<button type="button" class="nw-change-stat" data-action="compare-rows"/g)||[]).length,4, 'whole comparison cards are keyboard-accessible buttons');
  assert(!markup.includes('class="linkish"'), 'no repeated transaction buttons');
  assert(markup.includes('border-top-color:var(--c-investments)'), 'investment card uses blue');
  assert(markup.includes('data-t="investments"'), 'investment card opens investment rows');
  assert.deepStrictEqual([...markup.matchAll(/<small class="([^"]*)">Δ /g)].map(m=>m[1]), expected);
}
console.log('experience smoke: comparison colors passed');

// Older manual trackers do not have per-account statement metadata.
const reminder = new Function('settings','haveRows','balanceStatus','confirmed','month', `
  const S={canWrite:true,mode:'live',settings}, N={accounts:[{id:'cash',group:'cash'}]};
  const nw=()=>N, wzCover=()=>({have:new Set(haveRows?['2026-09']:[]),balAt:()=>balanceStatus});
  const allRows=()=>[{date:'2026-08-01'}], guideState=()=>null;
  const statementCovered=()=>confirmed, ciMonth=()=>month;
  ${grab('ciState')}
  ${grab('ciDue')}
  return ciDue();
`);
assert.strictEqual(reminder({},true,'ok',false,'2026-09'),false,'legacy completed September must not trigger a reminder');
assert.strictEqual(reminder({},false,'ok',false,'2026-09'),true,'missing transactions still trigger');
assert.strictEqual(reminder({},true,'part',false,'2026-09'),true,'missing balances still trigger');
assert.strictEqual(reminder({guide:{stmts:{cash:{coverageVersion:1}}}},true,'ok',false,'2026-09'),true,'new unconfirmed coverage must not be guessed');
assert.strictEqual(reminder({guide:{stmts:{cash:{coverageVersion:1}}}},false,'ok',true,'2026-09'),false,'confirmed no activity counts');
assert.strictEqual(reminder({guide:{stmts:{cash:{to:'2026-09-27'}}}},true,'ok',false,'2026-09'),false,'legacy statement coverage still counts');
assert.strictEqual(reminder({lastCheckin:'2026-09'},true,'ok',false,'2026-09'),false);
assert.strictEqual(reminder({lastCheckin:'2026-09'},true,'',false,'2026-10'),true,'September completion must not suppress October reminder');
const checkinMonth = new Function('ymNow','ymAdd',line('const ciMonth=')+'return ciMonth();');
const addMonth=(k,n)=>new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7)-1+n,1)).toISOString().slice(0,7);
assert.strictEqual(checkinMonth(()=> '2026-10',addMonth),'2026-09','October dates can only remind about September');
assert.strictEqual(checkinMonth(()=> '2026-11',addMonth),'2026-10','November 1 starts the October reminder');
console.log('experience smoke: legacy completion and reminder month passed');
