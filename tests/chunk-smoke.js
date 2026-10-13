/* Checks the request-splitting and merging in index.html without a browser: node tests/chunk-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const { aiJobs, aiMerge, aiDate } = new Function('L',grab('aiJobs') + grab('aiMerge') + grab('aiDate') + 'return {aiJobs,aiMerge,aiDate};')((k,...args)=>[k,...args].join('|'));

/* a 40,000-character CSV becomes several requests, each with the header row, nothing lost or repeated */
const rows = Array.from({ length: 800 }, (_, i) => `2026-01-${String(i % 28 + 1).padStart(2, '0')},-${i}.50,Shop number ${i} with a fairly long description`);
const csv = ['date,amount,description', ...rows].join('\n');
assert.ok(csv.length > 35000);
const jobs = aiJobs([{ name: 'jan.csv', text: csv, images: [] }], 15000, 8);
assert.ok(jobs.length >= 3, 'expected several requests, got ' + jobs.length);
assert.ok(jobs.every(j => j.chars <= 15000 + 200), 'a request is too big');
jobs.slice(1).forEach(j => assert.ok(j.files[0].text.includes('date,amount,description'), 'later part lost the header'));
const back = jobs.flatMap(j => j.files.map(f => f.text.split('\n'))).flat().filter(l => /^2026-/.test(l));
assert.strictEqual(back.length, rows.length, 'rows lost or repeated');

/* small inputs stay one request; small files are packed together */
assert.strictEqual(aiJobs([{ name: 'a', text: 'x'.repeat(100), images: [] }, { name: 'b', text: 'y'.repeat(100), images: [] }], 15000, 8).length, 1);
assert.strictEqual(aiJobs([{ name: 'a', text: 'x'.repeat(9000), images: [] }, { name: 'b', text: 'y'.repeat(9000), images: [] }], 15000, 8).length, 2);

/* impossible ISO dates must not silently roll into another month */
assert.strictEqual(aiDate('2026-02-30'), null);
assert.strictEqual(aiDate('2025-02-29'), null);
assert.strictEqual(aiDate('2024-02-29'), '2024-02-29');
assert.strictEqual(aiDate('2026-01-01'), '2026-01-01');
assert.strictEqual(aiDate('2026-13-01'), null);

/* balances reject nonexistent months before they reach import review */
const aiNwData = new Function('nw', 'nowYM', 'ymNow', 'ymAdd', 'aiNum', 'NW_GROUPS',
  grab('aiNwData') + 'return aiNwData;')(
    () => ({accounts: []}), () => ({day: 25}), () => '2026-12', () => '2026-11',
    v => typeof v === 'number' && Number.isFinite(v) ? v : null, ['cash']);
const balances = aiNwData({accounts: [{name: 'Bank', group: 'cash', balances:
  [['2026-00', 10], ['2026-13', 20], ['2026-01', 30], ['2026-12', 40], ['2027-01', 50]]}]});
assert.deepStrictEqual(balances.months.map(m => m.k), ['2026-01', '2026-12']);
assert.deepStrictEqual(balances.future, ['2027-01']);
assert.deepStrictEqual(balances.months.map(m => m.vals[0]), [30, 40]);

/* scanned PDF pages stay with their images; picture numbers restart per request */
const pictures = Array.from({length: 19}, (_, i) => ({page: i + 1}));
const pdf = {name: 'scan.pdf', images: pictures,
  text: pictures.map((_, i) => `[page ${i+1}: scanned, sent as picture ${i+1}]`).join('\n\n')};
const scanned = aiJobs([pdf], 15000, 8);
assert.deepStrictEqual(scanned.map(j => j.images.length), [8, 8, 3]);
assert.deepStrictEqual(scanned.flatMap(j => j.images), pictures);
scanned.forEach(j => j.files.forEach(f => {
  const markers = [...f.text.matchAll(/\[page (\d+): scanned, sent as picture (\d+)\]/g)];
  assert.strictEqual(markers.length, f.images.length);
  markers.forEach(m => assert.strictEqual(f.images[+m[2]-1].page, +m[1]));
}));
const mixed = aiJobs([{name:'mixed.pdf', images:[{page:2}],
  text:'[page 1]\n'+'x'.repeat(9000)+'\n\n[page 2: scanned, sent as picture 1]\n\n[page 3]\n'+'y'.repeat(9000)}],15000,8);
assert.strictEqual(mixed.filter(j=>j.images.length).length,1);
assert.ok(mixed.find(j=>j.images.length).files.some(f=>f.text.includes('[page 2:')));

/* merging: rows add up, a statement's opening comes from its first part and closing from its last */
const m = aiMerge([
  { rows: [['2026-01-01', -5, 'a']], statements: [{ source: 'jan.csv', opening: 100, closing: null }], notes: 'n1' },
  { rows: [['2026-01-20', -7, 'b']], statements: [{ source: 'jan.csv', opening: null, closing: 88 }], notes: 'n1' },
  { rows: [], left_out: [['2026-01-21', 1, 'c', 'jan.csv', 'fee']], accounts: [{ name: 'Bank', balances: [['2026-01', 10]] }], notes: '' }
]);
assert.strictEqual(m.rows.length, 2);
assert.deepStrictEqual(m.statements, [{ source: 'jan.csv', opening: 100, closing: 88 }]);
assert.strictEqual(m.notes, 'n1');
assert.strictEqual(m.left_out.length, 1);
assert.strictEqual(m.accounts.length, 1);
/* Import questions offer three validated, actionable choices for both response shapes. */
const tables=['income','expenses','investments'], catsFor=t=>t==='expenses'?['Transport','Food']:['Other'];
const choices=[['Two trips','include'],['Duplicate','exclude'],['Not sure','keep']];
const api = new Function('TKEYS','catNames','L','setImpTable','aiNum','r2','sum','parseDate','fold','TL',
  ['aiChoiceList','aiOptions','aiRowOptions','aiPickAnswer','aiAnswer','aiTxResult','aiDate','aiPrompt'].map(grab).join('\n')+
  "const LANG='en'; return {aiChoiceList,aiRowOptions,aiPickAnswer,aiTxResult,aiPrompt};")(
  tables,catsFor,k=>k,(r,t)=>{r.table=t;},v=>v, v=>Math.round(v*100)/100,ns=>ns.reduce((a,b)=>a+b,0),()=>null,s=>s.toLowerCase(),s=>s);
assert.strictEqual(api.aiChoiceList(choices,catsFor).length,3);
for(const bad of [null, choices.slice(0,2), [['Bad','delete'],...choices.slice(1)],
  [['Bad','change','expenses','Unknown'],...choices.slice(1)],
  [['Bad','change','invalid','Other'],...choices.slice(1)]]) assert.deepStrictEqual(api.aiChoiceList(bad,catsFor),[]);
const row={date:'2026-09-28',amount:-1.7,description:'TUC PAMPLONA',table:'expenses',category:'Transport',question:'Two trips or a duplicate?',answers:choices};
for(const data of [row,[row.date,row.amount,row.description,row.table,row.category,'',row.question,0,choices]]){
  const r=api.aiTxResult({rows:[data]},catsFor).rows[0]; r.on=false;
  const opts=api.aiRowOptions(r).opts; assert.strictEqual(opts.length,3);
  api.aiPickAnswer(r,opts[0]); assert.strictEqual(r.on,true); assert.strictEqual(r.aiA,'Two trips');
  api.aiPickAnswer(r,opts[1]); assert.strictEqual(r.on,false);
  api.aiPickAnswer(r,opts[2]); assert.strictEqual(r.on,false); assert.strictEqual(r.category,'Transport');
  api.aiPickAnswer(r,{text:'Food purchase',action:'change',table:'expenses',category:'Food'});
  assert.strictEqual(r.category,'Food'); assert.strictEqual(r.manual,true);
  api.aiPickAnswer(r,{text:'Invalid',action:'change',table:'expenses',category:'Unknown'});
  assert.strictEqual(r.category,'Food'); assert.strictEqual(r.aiA,'Food purchase');
}
assert.strictEqual(api.aiRowOptions({aiQ:'Old question with no options'}).opts.length,3);
assert.strictEqual(api.aiRowOptions({aiQ:'Type? A) Food B) Transport C) Other'}).opts.length,3);
assert.ok(api.aiPrompt('tx','',[],{}).includes('exactly 3 choices'));
assert.ok(!html.includes('id="ai-reply-${i}"'));
console.log('chunk smoke: all passed (including AI answer choices)');

/* All import modes share the structured instructions and keep the source text intact. */
for(const mode of ['tx','nw','start']){
  const prompt=api.aiPrompt(mode,'CUSTOM RULE',[{name:'bank.csv',text:'2026-01-01,-5,Shop',images:[]}],{today:'2026-01-31'});
  for(const section of ['TASK','1. ACCOUNTING RULES','2. EXTRACTION REQUIREMENTS','3. OUTPUT SCHEMA','4. MY SETUP (JSON)','5. CHECK BEFORE REPLYING','6. SOURCE FILES']) assert.ok(prompt.includes(section));
  assert.ok(prompt.includes('CUSTOM RULE'));
  assert.ok(prompt.endsWith('===== FILE: bank.csv =====\n2026-01-01,-5,Shop'));
  assert.ok(prompt.includes('Do not invent'));
  assert.strictEqual(prompt.includes('"rows": every movement'),mode!=='nw');
  assert.ok(prompt.includes('"accounts": [{'), 'investment balances are extracted in every mode');
  assert.ok(prompt.includes('Net contributions = external capital deposits minus external capital withdrawals'));
  assert.ok(prompt.includes('Gains = change minus net contributions'));
}
// Repeated month summaries never add contributions twice; a later partial chunk preserves evidence.
const account=(flow)=>({name:'Broker',group:'invest',balances:[['2026-09',1250,flow]]});
assert.strictEqual(aiMerge([{accounts:[account(200)]},{accounts:[account(null)]}]).accounts[0].balances[0][2],200);
assert.strictEqual(aiMerge([{accounts:[account(200)]},{accounts:[account(200)]}]).accounts[0].balances[0][2],200);
const conflict=aiMerge([{accounts:[account(200)]},{accounts:[account(300)]},{accounts:[account(200)]}]);
assert.strictEqual(conflict.accounts[0].balances[0][2],null);
assert.match(conflict.notes,/nwAiFlowConflict/);
const investData=new Function('nw','nowYM','ymNow','ymAdd','aiNum','NW_GROUPS',grab('aiNwData')+'return aiNwData;')(
  ()=>({accounts:[]}),()=>({day:13}),()=> '2026-10',()=> '2026-09',v=>typeof v==='number'&&Number.isFinite(v)?v:null,['cash','invest']);
const investment=investData({accounts:[{name:'Broker',group:'invest',balances:[['2026-08',1000,null],['2026-09',1250,200],['2026-10',1400,300]]}]});
assert.deepStrictEqual(investment.months.map(x=>x.flows),[undefined,{0:200}]);
assert.deepStrictEqual(investment.future,['2026-10']);
const normNw=new Function('NW_GROUPS','newId','r2',grab('normNw')+'return normNw;')(['cash','invest'],()=> 'new',n=>Math.round(n*100)/100);
assert.deepStrictEqual(normNw({accounts:[{id:'fund',name:'Broker',group:'invest'}],contributions:{'2026-09':{fund:0,unknown:20},'2026-13':{fund:10},'2026-08':{fund:'200'}}}).contributions,{'2026-09':{fund:0}});
/* Copy and the manual-selection fallback use the same request with a JSON fence instruction. */
const aiJs=fs.readFileSync(path.join(__dirname,'..','js','web-ai.js'),'utf8');
const pasteStart=aiJs.indexOf('function pasteRound('), pasteEnd=aiJs.indexOf('\n}\n',pasteStart)+3;
let click, copied; const request={value:''};
const paste=new Function('panel','t','esc','lang','copyText','parseAnswer','setTimeout',aiJs.slice(pasteStart,pasteEnd)+'return pasteRound;')(
  ()=>({querySelector:()=>request,addEventListener:(type,fn)=>{click=fn;},close(){}}),k=>k,s=>s,()=> 'en',async s=>{copied=s;return true;},JSON.parse,()=>{});
(async()=>{
  const result=paste('Original request');
  const button={dataset:{x:'copy'}};
  await click({target:{closest:()=>button}});
  assert.strictEqual(copied,request.value);
  assert.ok(copied.startsWith('CHAT OUTPUT FORMAT'));
  assert.ok(copied.includes('```json'));
  assert.ok(copied.endsWith('Original request'));
  request.value='{"rows":[]}'; button.dataset.x='read';
  await click({target:{closest:()=>button}});
  assert.deepStrictEqual(await result,{rows:[]});
  console.log('structured prompt and copied code block: all passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
