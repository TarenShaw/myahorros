/* Checks "Merge both" (mergeData in js/web-shim.js) without a browser: node tests/merge-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'web-shim.js'), 'utf8');
const grab = name => { const a = src.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = src.indexOf('\n}\n', a); return src.slice(a, b + 3); };
const { mergeData } = new Function('const clone=o=>JSON.parse(JSON.stringify(o));' + grab('mergeVal') + grab('mergeData') + 'return {mergeData};')();

const row = (id, amount, concept) => ({ id, date: '2026-10-01', amount, concept, category: 'Food' });
const mine = {
  months: { '2026-10': { income: [], expenses: [row('a', 10, 'mine edit'), row('m', 5, 'only here')], investments: [] },
            '2026-08': { income: [row('x', 1, 'old')], expenses: [], investments: [] } },
  config: { settings: { lang: 'es' }, networth: { accounts: [{ id: 'acc1', name: 'Bank' }], snaps: { '2026-09': { acc1: 100 } } } }
};
const theirs = {
  months: { '2026-10': { income: [row('t', 2000, 'salary')], expenses: [row('a', 9, 'their edit'), row('o', 7, 'only there')], investments: [] },
            '2026-07': { income: [row('y', 3, 'july')], expenses: [], investments: [] } },
  config: { settings: { lang: 'en', currency: 'EUR' }, categories: ['Food', 'Fun'],
            networth: { accounts: [{ id: 'acc1', name: 'Bank' }, { id: 'acc2', name: 'Broker' }], snaps: { '2026-09': { acc2: 50 }, '2026-08': { acc1: 90 } } } }
};
const out = mergeData(mine, theirs);
const m10 = out.months['2026-10'];

/* the same month on both sides: rows from both, the shared row as it is on this screen */
assert.deepStrictEqual(m10.income.map(r => r.id), ['t']);
assert.deepStrictEqual(m10.expenses.map(r => r.id).sort(), ['a', 'm', 'o']);
assert.strictEqual(m10.expenses.find(r => r.id === 'a').concept, 'mine edit');
/* months only one side has are kept */
assert.ok(out.months['2026-07'] && out.months['2026-08']);
/* settings: this screen wins where both have one, the other side's extras stay */
assert.deepStrictEqual(out.config.settings, { lang: 'es', currency: 'EUR' });
assert.deepStrictEqual(out.config.categories, ['Food', 'Fun']);
/* net worth: accounts and balances from both */
assert.deepStrictEqual(out.config.networth.accounts.map(a => a.id), ['acc1', 'acc2']);
assert.deepStrictEqual(out.config.networth.snaps, { '2026-09': { acc1: 100, acc2: 50 }, '2026-08': { acc1: 90 } });
/* the inputs are left alone */
assert.strictEqual(theirs.months['2026-10'].expenses[0].concept, 'their edit');
console.log('merge smoke: all passed');

const {sameData}=new Function(grab('normalise')+grab('parseData')+grab('sameData')+'return {sameData};')();
const text=JSON.stringify(mine);
assert.ok(sameData(text,JSON.stringify({savedAt:'later',config:mine.config,months:mine.months})), 'timestamp/key order causes a false conflict');
assert.ok(!sameData(text,JSON.stringify(theirs)), 'real edits must be detected');
assert.ok(!sameData(text,'broken JSON'), 'unreadable data cannot count as synced');
assert.ok(!sameData(text,null), 'unknown baseline cannot suppress a conflict');
const reversed=JSON.parse(text); reversed.months['2026-10'].expenses.reverse();
assert.ok(!sameData(text,JSON.stringify(reversed)), 'ordered rows must remain meaningful');
console.log('sync content smoke: timestamps, key order, real edits, invalid data and ordered rows passed');
