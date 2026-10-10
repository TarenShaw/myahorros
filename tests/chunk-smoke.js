/* Checks the request-splitting and merging in index.html without a browser: node tests/chunk-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const { aiJobs, aiMerge } = new Function(grab('aiJobs') + grab('aiMerge') + 'return {aiJobs,aiMerge};')();

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
console.log('chunk smoke: all passed');
