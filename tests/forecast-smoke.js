/* Checks the forecasts in index.html without a browser: Net worth "Over time" (nwForecast) and Overview "Month by month"
   (flowForecast, findRecurring, dayProfile, monthDays). node tests/forecast-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const fns = new Function(['median', 'nwForecast', 'flowForecast', 'recKey', 'findRecurring', 'dayProfile', 'monthDays'].map(grab).join('')
  + 'return {nwForecast, flowForecast, findRecurring, dayProfile, monthDays};')();
const { nwForecast, flowForecast, findRecurring, dayProfile, monthDays } = fns;
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

/* ── Month by month (flows) ── */
const hist = (from, vals) => vals.map((v, j) => ({ i: from + j, v }));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ': ' + a + ' vs ' + b);

/* 6. a full flat year: next months stay at that level */
const flat = hist(M(2025, 9), Array(12).fill(1200));
assert.deepStrictEqual(flowForecast(flat, [M(2026, 9), M(2026, 11)]), [1200, 1200]);

/* a steady rise (+50 a month) carries on but levels off (damped): above the last month, below the straight line */
const rise = hist(M(2026, 0), [1000, 1050, 1100, 1150, 1200, 1250]);
const [jul, dec2] = flowForecast(rise, [M(2026, 6), M(2026, 11)]);
near(jul, 1250 + 50 * 0.7, 0.01, 'one month ahead');
assert.ok(dec2 > jul && dec2 < 1250 + 50 * 6, 'damped: ' + dec2);
assert.ok(dec2 <= 1250 + 50 * 0.7 / 0.3 + 0.01, 'never more than 2.3 slopes past the last month');

/* 7. fewer than 12 months, and 1 month: the median of what there is, flat */
assert.deepStrictEqual(flowForecast(hist(M(2026, 6), [800, 900, 850]), [M(2026, 9)]), [850]);
assert.deepStrictEqual(flowForecast(hist(M(2026, 8), [640]), [M(2026, 9), M(2026, 11)]), [640, 640]);
assert.deepStrictEqual(flowForecast([], [M(2026, 9)]), [null]);

/* 8. an outlier month (a 1.400 € laptop on top of 1.200) doesn't move the projection */
const out = hist(M(2025, 9), [1200, 1200, 1200, 1200, 1200, 2600, 1200, 1200, 1200, 1200, 1200, 1200]);
assert.deepStrictEqual(flowForecast(out, [M(2026, 9)]), [1200]);
/* nor does a single refund-heavy month send it below 0 */
assert.ok(flowForecast(hist(M(2026, 0), [-300, -300, -300, -300]), [M(2026, 5)])[0] === 0, 'clamped at 0');

/* 9. seasonality: with 12+ months, last December (1.600 vs 1.200 normally) lifts this December by a quarter of the gap */
const yr = hist(M(2024, 11), [1600, ...Array(12).fill(1200)]);  /* Dec 2024 .. Dec 2025 */
const s2 = flowForecast(yr, [M(2026, 0), M(2026, 11)]);          /* Jan 2026 has Jan 2025 = 1200 behind it */
assert.strictEqual(s2[0], 1200);
const yr2 = hist(M(2025, 0), [...Array(11).fill(1200), 1600]);   /* Jan .. Dec 2025, December high */
near(flowForecast(yr2, [M(2026, 11)])[0], 0.75 * 1200 + 0.25 * 1600, 0.01, 'December blend');
/* capped: a one-off 10.000 € month a year ago adds at most a quarter of a normal month */
near(flowForecast(hist(M(2025, 0), [10000, ...Array(11).fill(1000)]), [M(2026, 0)])[0], 0.75 * 1000 + 0.25 * 2000, 0.01, 'season cap');

/* 10. recurring rows: salary on the 1st, rent ~2nd, a subscription; groceries (many a month, varied) are not */
const rows = [];
for (let j = 0; j < 6; j++) {
  const i = M(2026, 3) + j;
  rows.push({ k: 'Salary ' + (j + 4), i, d: 1, v: 2400 }, { k: 'Rent', i, d: j % 2 ? 3 : 2, v: 850 }, { k: 'Streaming', i, d: 14, v: 12.99 });
  for (let d = 2; d < 28; d += 3) rows.push({ k: 'Shop', i, d, v: 10 + d * 3 });
}
rows.push({ k: 'Dentist', i: M(2026, 5), d: 9, v: 90 });  /* a one-off */
const rec = findRecurring(rows, M(2026, 8), 6), byK = Object.fromEntries(rec.map(r => [r.k, r]));
assert.deepStrictEqual(Object.keys(byK).sort(), ['rent', 'salary', 'streaming']);
assert.strictEqual(byK.salary.day, 1); assert.strictEqual(byK.salary.v, 2400);
assert.ok([2, 3].includes(byK.rent.day), 'rent day ' + byK.rent.day);
/* stopped two months ago: not recurring any more; amounts all over the place: not recurring */
assert.strictEqual(findRecurring(rows.filter(r => r.k !== 'Rent' || r.i < M(2026, 7)), M(2026, 8), 6).some(r => r.k === 'rent'), false);
assert.deepStrictEqual(findRecurring([10, 300, 45, 900].map((v, j) => ({ k: 'Transfer', i: M(2026, j), d: 5, v })), M(2026, 3), 4), []);
/* too little history to tell */
assert.deepStrictEqual(findRecurring(rows.filter(r => r.i >= M(2026, 7)), M(2026, 8), 2), []);

/* 11. weekday profile: weekends weigh more; under 4 weeks of history it's flat; refunds don't make a day negative */
const pd = []; for (let d = 0; d < 56; d++) pd.push({ w: d % 7, v: d % 7 === 5 || d % 7 === 6 ? 60 : 10 });
const prof = dayProfile(pd);
assert.deepStrictEqual(prof, [10, 10, 10, 10, 10, 60, 60]);
assert.deepStrictEqual(dayProfile(pd.slice(0, 20)), [1, 1, 1, 1, 1, 1, 1]);
assert.strictEqual(dayProfile(pd.map(x => x.w === 2 ? { w: 2, v: -40 } : x))[2], 0);

/* 12. a month's days add up to its forecast: recurring items on their day, the rest by weekday (Fri/Sat get more) */
const nov = monthDays(2000, 2026, 10, 1, 0, [{ k: 'rent', name: 'Rent', day: 2, v: 850 }], prof);
assert.strictEqual(nov.total, 2000);
near(nov.days.reduce((a, x) => a + x.v, 0), 2000, 0.001, 'days sum to the month');
assert.strictEqual(nov.days.length, 30);
assert.ok(nov.days[1].rec.length && nov.days[1].v > 850, 'rent on the 2nd');
const fri = nov.days.find(x => new Date(2026, 10, x.d).getDay() === 5), mon = nov.days.find(x => new Date(2026, 10, x.d).getDay() === 1);
near(fri.est / mon.est, 6, 0.05, 'Friday six times a Monday');
/* the month in progress: from tomorrow, what's in already counts, a recurring day that has passed is left out */
const octD = monthDays(1500, 2026, 9, 12, 600, [{ k: 'x', name: 'X', day: 5, v: 100 }, { k: 'y', name: 'Y', day: 31, v: 50 }], prof);
assert.strictEqual(octD.days[0].d, 12); assert.strictEqual(octD.days.length, 20);
near(600 + octD.days.reduce((a, x) => a + x.v, 0), 1500, 0.001, 'actual + projected = month');
assert.strictEqual(octD.total, 1500);
/* February (28 days): a 30th-of-the-month item lands on the 28th; all-zero weights spread evenly */
const feb = monthDays(280, 2026, 1, 1, 0, [{ k: 'z', name: 'Z', day: 30, v: 0 }], [0, 0, 0, 0, 0, 0, 0]);
assert.strictEqual(feb.days.length, 28); assert.ok(feb.days[27].rec.length, 'moved to the 28th');
assert.ok(feb.days.every(x => Math.abs(x.v - 10) < 0.01), 'even spread');
/* recurring items bigger than the forecast win: the month comes out at least their sum, never a negative day */
const big = monthDays(500, 2026, 10, 1, 0, [{ k: 'r', name: 'R', day: 1, v: 850 }], prof);
assert.strictEqual(big.total, 850); assert.ok(big.days.every(x => x.v >= 0));
/* last day of the month: nothing left to project */
assert.deepStrictEqual(monthDays(900, 2026, 9, 32, 700, [], prof), { total: 700, days: [] });

console.log('forecast smoke: all passed');
