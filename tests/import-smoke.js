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
/* typed amounts follow the person's number format: the format's lone decimal mark is always the decimal */
assert.strictEqual(parseAmount('12,500'), 12500);            /* bank file: thousands */
assert.strictEqual(parseAmount('12,500', 'eu'), 12.5);
assert.strictEqual(parseAmount('12.500', 'eu'), 12500);
assert.strictEqual(parseAmount('12.50', 'eu'), 12.5);
assert.strictEqual(parseAmount('1.234,56', 'eu'), 1234.56);
assert.strictEqual(parseAmount('1.000', 'en'), 1);
assert.strictEqual(parseAmount('1,000', 'en'), 1000);
assert.strictEqual(parseAmount('12,50', 'en'), 12.5);
assert.strictEqual(parseAmount('1,234,567', 'eu'), 1234567);

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
    line('const CARD_RE=') + line('const REFUND_RE=') + line('const isBizum=') + line('const biggestSpend=') + grab('guessTable') + 'return guessTable;')(loose, KW, ROWS);
  const g = (concept, amount) => guessTable({ concept, amount, category: '' });
  assert.strictEqual(g('PENSION INSS', 1100), 'income');
  assert.strictEqual(g('APORTACION PLAN PENSION', -125), 'investments');
  assert.strictEqual(g('TRANSF SUPERMERCADOS IBERIA S.A.', 1704.51), 'income');
  assert.strictEqual(g('DEVOLUCION IBERIA', 210), 'expenses');
  assert.strictEqual(g('AMAZON', 25), 'expenses');
  assert.strictEqual(g('AMAZON', 400), 'income');
  assert.strictEqual(g('TARJETA AMAZON', 400), 'expenses');
  /* a Bizum received is someone paying you back; one sent is spending, and a Bizum with an income keyword stays income */
  assert.strictEqual(g('BIZUM DE ANA CENA', 15), 'expenses');
  assert.strictEqual(g('BIZUM A ANA', -15), 'expenses');
  assert.strictEqual(g('BIZUM PENSION MAMA', 300), 'income');
}

/* typed amounts: one separator and exactly three digits read as decimals gets a question (amtMeant) */
{
  const amtMeant = new Function(grab('amtMeant') + 'return amtMeant;')();
  assert.strictEqual(amtMeant('8.500', 8.5), 8500);
  assert.strictEqual(amtMeant('1,250', 1.25), 1250);
  assert.strictEqual(amtMeant('0,500', 0.5), null);
  assert.strictEqual(amtMeant('8.500', 8500), null);
  assert.strictEqual(amtMeant('8,50', 8.5), null);
  assert.strictEqual(amtMeant('12.345,67', 12345.67), null);
}

/* review: amounts typed in Spanish keep their sign; the tracker's own symbol is stripped first (impEdit) */
assert.strictEqual(parseAmount('-14,90'), -14.9);
assert.strictEqual(parseAmount('−14,90 €'), -14.9);
assert.strictEqual(parseAmount('14,90'), 14.9);
assert.strictEqual(parseAmount('+0,85'), 0.85);
assert.strictEqual(parseAmount('14,90-'), -14.9);
assert.strictEqual(parseAmount('catorce'), null);
assert.strictEqual(parseAmount('1.234,5'), 1234.5);

/* duplicates: matched by signed amount, description by letters and digits only, each saved row once */
{
  const { markDups, shortDesc } = new Function(line('const r2=') + line('const fold=') + line('const loose=') + grab('markDups') + line('function shortDesc(') +
    'return {markDups,shortDesc};')();
  const saved = [{ date: '2026-09-03', amount: -0.85, concept: 'VENDING ACME \\' }, { date: '2026-09-04', amount: -3, concept: 'BAR PEPE' }];
  let rows = [{ date: '2026-09-03', amount: 0.85, concept: 'VENDING ACME' }, { date: '2026-09-03', amount: -0.85, concept: 'VENDING ACME' },
    { date: '2026-09-03', amount: -0.85, concept: 'VENDING ACME' }, { date: '2026-09-04', amount: -3, concept: 'CAFE' }];
  markDups(rows, saved);
  assert.deepStrictEqual(rows.map(r => [r.dup, r.like]), [[false, null], [true, null], [false, null], [false, 'BAR PEPE']]);
  /* a refund is never matched to the charge it undoes, even with the same date and description */
  markDups(rows = [{ date: '2026-09-03', amount: 0.85, concept: 'VENDING ACME \\' }], saved);
  assert.deepStrictEqual([rows[0].dup, rows[0].like], [false, null]);
  /* an edit is checked again: the amount changed back to the charge's makes it a duplicate */
  rows[0].amount = -0.85; markDups(rows, saved); assert.strictEqual(rows[0].dup, true);
  /* notes: no stray backslash before the closing quote, long text cut with … */
  assert.strictEqual(shortDesc('VENDING ACME \\', 30), 'VENDING ACME');
  assert.strictEqual(shortDesc('PAGO / ', 30), 'PAGO');
  assert.strictEqual(shortDesc('A'.repeat(40), 30), 'A'.repeat(29) + '…');
  assert.strictEqual(shortDesc(null, 30), '');
}

console.log('import smoke: all passed');

/* a new tracker's currency and number format come from the device's time zone (user report 2026-10-12: an
   "en-US" browser in Spain showed dollars); a zone not listed returns null and the browser language decides */
{
  const a = html.indexOf('const TZ_REGION='), b = html.indexOf('\nconst langRegion=');
  const tzRegion = new Function(html.slice(a, b) + 'return tzRegion;')();
  const t = z => { const r = tzRegion(z); return r ? r.cur + ' ' + r.num : null; };
  assert.strictEqual(t('Europe/Madrid'), 'EUR eu');
  assert.strictEqual(t('Atlantic/Canary'), 'EUR eu');
  assert.strictEqual(t('Europe/Berlin'), 'EUR eu');
  assert.strictEqual(t('Europe/Dublin'), 'EUR en');
  assert.strictEqual(t('Europe/London'), 'GBP en');
  assert.strictEqual(t('Europe/Zurich'), 'CHF en');
  assert.strictEqual(t('Europe/Stockholm'), 'SEK eu');
  assert.strictEqual(t('Europe/Warsaw'), 'PLN eu');
  assert.strictEqual(t('America/New_York'), 'USD en');
  assert.strictEqual(t('America/Indiana/Indianapolis'), 'USD en');
  assert.strictEqual(t('Pacific/Honolulu'), 'USD en');
  assert.strictEqual(t('America/Toronto'), 'CAD en');
  assert.strictEqual(t('America/Mexico_City'), 'MXN en');
  assert.strictEqual(t('Australia/Sydney'), 'AUD en');
  assert.strictEqual(t('America/Bogota'), null);
  assert.strictEqual(t('Asia/Tokyo'), null);
  assert.strictEqual(t(''), null);
  console.log('time-zone region: all passed');
}

/* month-end balances from a statement's Balance column (wizard import for one account) */
{
  const balMonthEnds = new Function(line('const r2=') + line('const ymOf=') + line('function ymAdd(') + grab('balMonthEnds') + 'return balMonthEnds;')();
  /* newest first, as most banks export; opens on 2 January, so the balance before it closes December */
  const rows = [
    { date: '2026-03-02', amount: -10, bal: 1190 },
    { date: '2026-02-27', amount: 200, bal: 1200 },
    { date: '2026-02-03', amount: -50, bal: 1000 },
    { date: '2026-01-31', amount: 1000, bal: 1050 },
    { date: '2026-01-02', amount: -20, bal: 50 },
    { date: '2026-01-02', amount: 5, bal: 70 },   /* same day, earlier in time: listed below */
  ];
  const e = balMonthEnds(rows, false);
  assert.deepStrictEqual(e, { '2025-12': 65, '2026-01': 1050, '2026-02': 1200 });   /* March is the file's last month: left out */
  /* oldest first, starting mid-month: no December figure */
  const up = [{ date: '2026-01-15', amount: 5, bal: 105 }, { date: '2026-02-01', amount: 10, bal: 115 }];
  assert.deepStrictEqual(balMonthEnds(up, true), { '2026-01': 105 });
  assert.deepStrictEqual(balMonthEnds([{ date: '2026-01-15', amount: 5, bal: null }], true), {});
  console.log('statement month-end balances: all passed');
}
