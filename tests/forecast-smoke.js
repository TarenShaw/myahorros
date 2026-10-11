/* Checks the Net worth "Over time" forecast (nwForecast in index.html) without a browser: node tests/forecast-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const nwForecast = new Function(grab('nwForecast') + 'return nwForecast;')();
/* month numbers as the page builds them: year*12 + month (0 = January) */
const M = (y, m) => y * 12 + m;
const series = (from, vals) => vals.map((g, j) => ({ i: from + j, g }));

/* 1. a full year of steady saving (+300 cash, +500 invest a month) carries on at the same pace, groups add up */
const full = series(M(2025, 9), Array.from({ length: 12 }, (_, j) => ({ cash: 2000 + 300 * j, invest: 10000 + 500 * j })));
let [oct, dec] = nwForecast(full, [M(2026, 9), M(2026, 11)]);
assert.deepStrictEqual(oct.g, { cash: 2000 + 300 * 12, invest: 10000 + 500 * 12 });
assert.strictEqual(oct.total, oct.g.cash + oct.g.invest);
assert.strictEqual(dec.g.invest, 10000 + 500 * 14);

/* only the last 12 months count: an old slump 2 years earlier doesn't drag the projection */
const long = [{ i: M(2024, 0), g: { cash: 50000 } }, ...series(M(2025, 9), Array.from({ length: 12 }, (_, j) => ({ cash: 1000 + 100 * j })))];
assert.strictEqual(nwForecast(long, [M(2026, 9)])[0].g.cash, 1000 + 100 * 12);

/* 2. fewer than 12 months: uses what there is (Jan-Mar, +200 a month) */
const short = series(M(2026, 0), [{ cash: 1000 }, { cash: 1200 }, { cash: 1400 }]);
assert.strictEqual(nwForecast(short, [M(2026, 11)])[0].g.cash, 1400 + 200 * 9);

/* a missing month counts per month: Jan 1000, Mar 1400 is +200 a month, not +400 */
assert.strictEqual(nwForecast([{ i: M(2026, 0), g: { cash: 1000 } }, { i: M(2026, 2), g: { cash: 1400 } }], [M(2026, 3)])[0].g.cash, 1600);

/* 3. one month: flat; no months: nothing made up */
assert.deepStrictEqual(nwForecast([{ i: M(2026, 0), g: { cash: 900, invest: 100 } }], [M(2026, 5)])[0], { g: { cash: 900, invest: 100 }, total: 1000 });
assert.deepStrictEqual(nwForecast([], [M(2026, 0), M(2026, 1)]), [null, null]);
assert.deepStrictEqual(nwForecast(full, []), []);

/* 4. an outlier month (a 20,000 inheritance in one month) doesn't set the pace: the median change is still +300 */
const spike = series(M(2026, 0), [1000, 1300, 1600, 21600, 21900, 22200].map(cash => ({ cash })));
assert.strictEqual(nwForecast(spike, [M(2026, 6)])[0].g.cash, 22500);
const crash = series(M(2026, 0), [{ invest: 10000 }, { invest: 10400 }, { invest: 6000 }, { invest: 6400 }, { invest: 6800 }]);
assert.strictEqual(nwForecast(crash, [M(2026, 5)])[0].g.invest, 7200);

/* 5. clamping: savings running down stop at 0, a debt paid off stops at 0 too (no group crosses zero) */
const down = series(M(2026, 0), [{ cash: 900, illiquid: -600 }, { cash: 600, illiquid: -400 }, { cash: 300, illiquid: -200 }]);
const far = nwForecast(down, [M(2026, 3), M(2026, 11)]);
assert.deepStrictEqual(far[0].g, { cash: 0, illiquid: 0 });
assert.deepStrictEqual(far[1].g, { cash: 0, illiquid: 0 });
assert.strictEqual(far[1].total, 0);
/* a group that's gone from the last month projects from 0, not from its old figure */
assert.strictEqual(nwForecast(series(M(2026, 0), [{ cash: 100, pension: 500 }, { cash: 200 }]), [M(2026, 2)])[0].g.pension, 0);

console.log('forecast smoke: all passed');
