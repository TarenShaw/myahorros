/* Checks the import's number reading, keyword matching and special file shapes in index.html without a browser: node tests/import-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const line = start => { const a = html.indexOf(start); assert.ok(a > -1, start + ' not found'); return html.slice(a, html.indexOf('\n', a) + 1); };
const { parseAmount, hasKw, csvSections, splitwisePeople, loose, CARD_RE, INV_CONCEPT } = new Function(
  line('const r2=') + line('const fold=') + line('const loose=') + line('const WORDCH=') + line('const CARD_RE=') + line('const INV_CONCEPT=') +
  grab('parseAmount') + grab('hasKw') + grab('csvSections') + grab('splitwisePeople') +
  'return {parseAmount,hasKw,csvSections,splitwisePeople,loose,CARD_RE,INV_CONCEPT};')();

/* amounts: Spanish and English formats, thousands with spaces; account numbers and absurd values are not amounts */
assert.strictEqual(parseAmount('-9,70'), -9.7);
assert.strictEqual(parseAmount('1.234,56 €'), 1234.56);
assert.strictEqual(parseAmount('1,234.56'), 1234.56);
assert.strictEqual(parseAmount('1 234,56'), 1234.56);
assert.strictEqual(parseAmount('(23,45)'), -23.45);
assert.strictEqual(parseAmount('49 091 536 01'), null);
assert.strictEqual(parseAmount('4909153601'), null);
assert.strictEqual(parseAmount(4909153601), null);

/* keywords match only at the start of a word */
const kw = (c, k) => hasKw(loose(c), loose(k));
assert.ok(!kw('BIZUM CARGO MARIA LOPEZ DE CARRETOROS', 'etoro'));
assert.ok(kw('TARJETA VISA ETORO EUROPE', 'etoro'));
assert.ok(kw('MCDONALDS ALCALA', 'mcdonald'));
assert.ok(kw('O2 FIBRA', 'o2') && !kw('EXPHIERRO2', 'o2'));

/* Interactive Brokers: sections with their own header rows; totals are dropped */
const ib = csvSections([
  ['Statement', 'Header', 'Field Name', 'Field Value'], ['Statement', 'Data', 'Title', 'Activity'],
  ['Deposits & Withdrawals', 'Header', 'Currency', 'Settle Date', 'Description', 'Amount'],
  ['Deposits & Withdrawals', 'Data', 'EUR', '2026-05-22', 'Electronic Fund Transfer', '10'],
  ['Deposits & Withdrawals', 'Data', 'Total', '', '', '10'],
  ['Trades', 'Header', 'DataDiscriminator', 'Symbol'], ['Trades', 'Data', 'Order', 'HOVR']]);
assert.deepStrictEqual(ib.map(s => [s.name, s.rows.length]), [['Statement', 2], ['Deposits & Withdrawals', 2], ['Trades', 2]]);
assert.strictEqual(csvSections([['date', 'amount'], ['2026-01-01', '5'], ['2026-01-02', '6']]), null);

/* Splitwise: the people are the columns after Currency */
assert.deepStrictEqual(splitwisePeople([['Date', 'Description', 'Category', 'Cost', 'Currency', 'Ana', 'Ben']]), ['Ana', 'Ben']);
assert.strictEqual(splitwisePeople([['Date', 'Amount', 'Description']]), null);

/* money back on a card is a refund; fund buys and pension contributions mark an investment account's file */
assert.ok(CARD_RE.test(loose('TARJETA VISA VENDING GRUPO CPS')) && !CARD_RE.test(loose('TRANSFERENCIA OTRA ENTIDAD')));
assert.ok(INV_CONCEPT.test(loose('SUSCRIPCIÓN FONDO')) && INV_CONCEPT.test(loose('Indexa Más Rentabilidad TU APORTACIÓN')) && !INV_CONCEPT.test(loose('MERCADONA')));

/* money coming in: a pension is income (income keywords come first), a shop's name alone doesn't make a big payment a
   refund, a card refund or one no bigger than past spending there does (audit 2026-10-11) */
{
  const KW = { income: { pension: 'Pension' }, expenses: { iberia: 'Travel', amazon: 'Shopping' }, investments: { pension: 'Pension' } };
  const ROWS = [{ table: 'expenses', category: 'Shopping', amount: -40 }];
  const guessTable = new Function('loose', 'KW', 'ROWS',
    "const TKEYS=['income','expenses','investments'], isKnown=()=>true, memo=(k,f)=>f(), allRows=()=>ROWS;" +
    "const matchKeyword=(t,c)=>{ const k=Object.keys(KW[t]).find(k=>loose(c).includes(k)); return k?{cat:KW[t][k],k}:null; };" +
    line('const CARD_RE=') + line('const REFUND_RE=') + line('const biggestSpend=') + grab('guessTable') + 'return guessTable;')(loose, KW, ROWS);
  const g = (concept, amount) => guessTable({ concept, amount, category: '' });
  assert.strictEqual(g('PENSION INSS', 1100), 'income');
  assert.strictEqual(g('APORTACION PLAN PENSION', -125), 'investments');
  assert.strictEqual(g('TRANSF SUPERMERCADOS IBERIA S.A.', 1704.51), 'income');
  assert.strictEqual(g('DEVOLUCION IBERIA', 210), 'expenses');
  assert.strictEqual(g('AMAZON', 25), 'expenses');
  assert.strictEqual(g('AMAZON', 400), 'income');
  assert.strictEqual(g('TARJETA AMAZON', 400), 'expenses');
}

console.log('import smoke: all passed');
