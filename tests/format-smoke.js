/* Display formatting in index.html (fmtNum, fmtEUR, fmtCompact, fmtPct): compact chart figures, tiny shares, the
   no-figure dash, hidden amounts. node tests/format-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  return html.slice(a, html.indexOf('\n}\n', a) + 3); };
const line = start => { const a = html.indexOf(start); assert.ok(a > -1, start + ' not found'); return html.slice(a, html.indexOf('\n', a) + 1); };
const make = new Function('hide', 'cur', `let NF={t:'.',d:','}, HIDE=hide, CUR=cur; const MASK='••••';
  ${line('const DASH=')}${line('const CURRENCIES=')}
  ${['fmtNum', 'fmtEUR', 'withCur', 'fmtCompact', 'fmtPct'].map(grab).join('')}
  return {fmtNum,fmtEUR,fmtCompact,fmtPct,DASH};`);

const f = make(false, 'EUR');
assert.strictEqual(f.fmtEUR(63309.88), '63.309,88 €');
assert.strictEqual(f.fmtEUR(6722.4, 0), '6.722 €');
assert.strictEqual(f.fmtEUR(-5.5), '−5,50 €', 'real minus');
assert.strictEqual(f.fmtCompact(63309.88), '63,3 k €');
assert.strictEqual(f.fmtCompact(80000), '80 k €', 'ticks drop ,0');
assert.strictEqual(f.fmtCompact(38000, 1), '38,0 k €', 'bar labels keep one decimal');
assert.strictEqual(f.fmtCompact(125400), '125 k €');
assert.strictEqual(f.fmtCompact(-2500), '−2,5 k €');
assert.strictEqual(f.fmtCompact(500), '500 €');
assert.strictEqual(f.fmtCompact(0), '0');
assert.strictEqual(f.fmtPct(0.0004), '<0,1%', 'tiny share');
assert.strictEqual(f.fmtPct(0.0004, 0), '<1%');
assert.strictEqual(f.fmtPct(0), '0,0%');
assert.strictEqual(f.fmtPct(0.4987), '49,9%');
assert.strictEqual(f.fmtPct(NaN), '—');
assert.strictEqual(f.fmtNum(Infinity), '—');
assert.strictEqual(make(false, 'USD').fmtCompact(-63309), '−$63,3 k');
const h = make(true, 'EUR');
assert.strictEqual(h.fmtCompact(63309), '', 'hidden amounts: no chart figures');
assert.strictEqual(h.fmtCompact(0), '0');
console.log('format smoke: all passed');
