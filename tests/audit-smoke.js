/* Checks the AI audit's answer checks in index.html without a browser: node tests/audit-smoke.js
   Whatever the AI answers, only fixes that point at rows, categories and accounts that exist reach the review. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const line = name => { const a = html.indexOf('const ' + name + '='); assert.ok(a > -1, name + ' not found'); return html.slice(a, html.indexOf('\n', a) + 1); };
const CATS = { income: ['Salary'], expenses: ['Groceries', 'Restaurants'], investments: ['Funds'] };
const env = {
  TKEYS: ['income', 'expenses', 'investments'],
  isKnown: (t, n) => !!n && CATS[t].includes(n),
  kws: () => ({ income: [], expenses: [['mercadona', 'Groceries']], investments: [] }),
  nw: () => ({ accounts: [{ id: 'a1', name: 'Broker', words: 'old' }] }),
  loose: s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
};
const { auditItems, auditMerge, auditHistory, auIn } = new Function(...Object.keys(env),
  line('auDay') + line('auIn') + grab('auditHistory') + grab('auditMerge') + grab('auditItems') + 'return {auditItems,auditMerge,auditHistory,auIn};')(...Object.values(env));

const row = (id, date, amount, table, category) => ({ id, date, amount, concept: id, table, category, mk: date.slice(0, 7) });
const ref = new Map([
  [1, row('r1', '2026-01-05', -20, 'expenses', 'Groceries')],
  [2, row('r2', '2026-01-06', -20, 'expenses', 'Groceries')],
  [3, row('r3', '2026-03-01', -20, 'expenses', 'Groceries')],
  [4, row('r4', '2026-01-10', 15, 'income', 'Salary')],
  [5, row('r5', '2026-01-11', -9, 'expenses', '')]
]);
const res = auditMerge([{
  changes: [[5, 'expenses', 'Restaurants', 'cafe'], [5, 'expenses', 'Groceries', 'second fix for one row'], [4, 'expenses', 'Groceries', 'refund'],
    [1, 'expenses', 'Made up', 'unknown category'], [99, 'expenses', 'Groceries', 'no such row'], [3, 'expenses', 'Groceries', 'no change'],
    [3, 'expenses', '', 'would clear a category']],
  duplicates: [[2, 1, 'same day'], [3, 1, 'two months apart'], [4, 1, 'other table']],
  notes: 'one'
}, {
  changes: [{ row: 2, table: 'expenses', category: 'Restaurants', why: 'deleted row' }],
  keywords: [['expenses', 'cafe bar', 'Restaurants', 'ok'], ['expenses', 'MERCADONA', 'Groceries', 'already there'], ['expenses', 'ab', 'Groceries', 'too short'], ['oops', 'thing', 'Groceries', 'bad table']],
  statement_words: [['a1', 'Broker, BRK', 'ok'], ['zz', 'x', 'no such account'], ['a1', 'again', 'second for one account']],
  questions: [[5, 'Shared?'], [null, 'General question'], [1, '']],
  notes: 'two'
}, 'not an object']);

const items = auditItems(res, ref), by = k => items.filter(x => x.k === k);
assert.deepStrictEqual(by('dup').map(x => [x.r.id, x.o.id]), [['r2', 'r1']], 'only the real duplicate pair');
assert.deepStrictEqual(by('cat').map(x => [x.r.id, x.t, x.cat]), [['r5', 'expenses', 'Restaurants'], ['r4', 'expenses', 'Groceries']], 'only valid category/table changes, one per row, none for a deleted row');
assert.deepStrictEqual(by('kw').map(x => x.kw), ['cafe bar'], 'only new keywords for known categories');
assert.deepStrictEqual(by('words').map(x => [x.acc.id, x.words]), [['a1', 'Broker, BRK']], 'only known accounts, once each');
assert.deepStrictEqual(by('q').map(x => [x.r && x.r.id, x.text]), [['r5', 'Shared?'], [null, 'General question']]);
assert.strictEqual(res.notes, 'one two');

/* months to check: from and to are inclusive; the other months become one summary line per description, most used first */
assert.ok(auIn({ date: '2026-01-31' }, '2026-01', '2026-02') && auIn({ date: '2026-02-01' }, '2026-01', '2026-02'));
assert.ok(!auIn({ date: '2025-12-31' }, '2026-01', '2026-02') && !auIn({ date: '2026-03-01' }, '2026-01', '2026-02'));
const hist = auditHistory([row('MERCADONA', '2025-01-01', -5, 'expenses', 'Groceries'), row('Mercadona', '2025-02-01', -6, 'expenses', 'Groceries'),
  row('MERCADONA', '2025-03-01', -7, 'expenses', 'Restaurants'), row('Cafe', '2025-03-02', -2, 'expenses', '')]).split('\n').map(l => JSON.parse(l));
assert.deepStrictEqual(hist, [['MERCADONA', 'expenses', 3, { Groceries: 2, Restaurants: 1 }], ['Cafe', 'expenses', 1, { '': 1 }]]);
console.log('audit smoke: all passed');
