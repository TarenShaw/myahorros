/* Checks that Net worth "What changed" reconciles with the Accounts table, to the cent, without a browser:
   change = saved + gains + new accounts + leftover, where gains is the table's Gains total (nwSplit, nwGains,
   nwReconcile in index.html). node tests/reconcile-smoke.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a > -1, name + ' not found');
  const b = html.indexOf('\n}\n', a); return html.slice(a, b + 3); };
const line = start => { const a = html.indexOf(start); assert.ok(a > -1, start + ' not found'); return html.slice(a, html.indexOf('\n', a) + 1); };
const src = ['const r2=', 'const cents=', 'const fold=', 'const loose=', 'const nwBefore=', 'const nwWords=', 'const nwPensionish=', 'function ymAdd'].map(line).join('')
  + ['trackerSaved', 'nwSplit', 'nwReconcile', 'nwGains'].map(grab).join('');
const make = new Function('N', 'months', 'RET', `const memo=(k,f)=>f(), nw=()=>N, nwHoles=()=>[], ymOf=(y,m)=>y+'-'+String(m+1).padStart(2,'0');
  let rows; const allRows=()=>rows||(rows=Object.keys(months).sort().flatMap(mk=>['income','expenses','investments'].flatMap(t=>(months[mk][t]||[]).map(r=>Object.assign({},r,{table:t,mk})))));
  const isReturn=r=>RET.has(r.table+'|'+r.category);
  ${src}
  return {nwSplit,nwGains,nwReconcile};`);

const RET = new Set(['income|Interest', 'income|Dividends']);
/* one step, end of Aug → end of Sep. rows: [table, amount, description, category] */
function run(accounts, s0, s1, rows) {
  const sep = { income: [], expenses: [], investments: [] };
  for (const [t, a, c, cat] of rows) sep[t].push({ date: '2026-09-15', amount: a, concept: c, category: cat || 'Other' });
  const f = make({ accounts, snaps: { '2026-08': s0, '2026-09': s1 } }, { '2026-09': sep }, RET);
  const sp = f.nwSplit('2026-08', '2026-09'), G = f.nwGains('2026-08', '2026-09');
  const c = v => Math.round(v * 100);
  /* the invariant, every time: lines add up to the change, Markets is the table's Gains total, causes make the leftover */
  assert.strictEqual(c(sp.saved) + c(sp.gains) + c(sp.fresh) + c(sp.left), c(sp.change), 'lines add up');
  assert.strictEqual(c(sp.gains), [...G.values()].reduce((s, v) => s + c(v), 0), 'Markets = Gains total');
  assert.strictEqual(c(sp.why.cash) + c(sp.why.ret) + c(sp.why.put), c(sp.left), 'causes = leftover');
  assert.ok(sp.ok, 'nwReconcile passes');
  return { sp, G };
}
const acc = (id, name, group, extra) => Object.assign({ id, name, group }, extra);

/* 1. the reported shape (made-up figures): the card used to show the remainder 160,20 while the table's Gains total
   was 156,00. Now Markets = 156,00 and the 4,20 € of cash movement no transaction explains is its own line */
{
  const accounts = [acc('main', 'Main Bank', 'cash', { words: 'interest promo' }), acc('side', 'Side Bank', 'cash'), acc('card', 'Card Bank', 'cash'),
    acc('app', 'App Wallet', 'cash'), acc('meal', 'Meal Card', 'cash'), acc('owed', 'Owed by flatmates', 'cash'),
    acc('alpha', 'Alpha Fund', 'invest'), acc('beta', 'Beta Funds', 'invest'), acc('gamma', 'Gamma Broker', 'invest'),
    acc('omega', 'Omega Broker', 'invest'), acc('tiny', 'Tiny Broker', 'invest'),
    acc('pen', 'Zeta Pension', 'pension'), acc('lend', 'Lendco Notes', 'illiquid')];
  const s0 = { main: 5000, side: 40, card: 10, app: 20, meal: 300, owed: -30, alpha: 20000, beta: 1000, gamma: 1500, omega: 200, tiny: 5, pen: 3000 };
  const s1 = { main: 4700, side: 0, card: 8, app: 19, meal: 290, owed: 70, alpha: 20550, beta: 1610, gamma: 1460, omega: 206, tiny: 5, pen: 3125, lend: 120 };
  const { sp, G } = run(accounts, s0, s1, [
    ['income', 2500, 'PAYROLL', 'Salary'], ['expenses', -1542.2, 'Everything else', 'Groceries'], ['income', 5, 'interest promo august', 'Interest'],
    ['investments', -400, 'Alpha Fund monthly', 'Funds/ETFs'], ['investments', -350, 'Beta Funds buy', 'Funds/ETFs'], ['investments', -250, 'Beta Funds buy', 'Funds/ETFs'],
    ['investments', -100, 'Zeta Pension contribution', 'Pension'],
    ['investments', -40, 'Lendco 1', 'Other'], ['investments', -40, 'Lendco 2', 'Other'], ['investments', -40, 'Lendco 3', 'Other']]);
  assert.deepStrictEqual([sp.change, sp.saved, sp.gains, sp.fresh, sp.left, sp.moved], [1118, 957.8, 156, 0, 4.2, 120]);
  assert.deepStrictEqual([sp.why.cash, sp.why.ret, sp.why.put], [4.2, 0, 0]);
  assert.deepStrictEqual([G.get('main'), G.get('alpha'), G.get('beta'), G.get('gamma'), G.get('omega'), G.get('tiny'), G.get('pen')], [5, 150, 10, -40, 6, 0, 25]);
  assert.strictEqual(sp.returns, 5);
  /* the old remainder: change − saved + moved, what the card used to show */
  assert.strictEqual(Math.round((sp.lfl - sp.saved + sp.moved) * 100) / 100, 160.2);
}

/* 2. a newly tracked account with money you already had: New accounts, nothing to review */
{
  const { sp } = run([acc('cash', 'Main Bank', 'cash'), acc('old', 'Old Savings', 'invest')], { cash: 1000 }, { cash: 1400, old: 5000 },
    [['income', 2000, 'PAYROLL', 'Salary'], ['expenses', -1600, 'Rent', 'Rent']]);
  assert.deepStrictEqual([sp.change, sp.saved, sp.gains, sp.fresh, sp.left], [5400, 400, 0, 5000, 0]);
}

/* 3. a row that matches no account: the account shows it as gain, and the leftover takes it back, with the row listed */
{
  const { sp, G } = run([acc('cash', 'Main Bank', 'cash'), acc('alpha', 'Alpha Fund', 'invest')], { cash: 1000, alpha: 3000 }, { cash: 800, alpha: 3200 },
    [['investments', -200, 'TRANSFER 4411', 'Funds/ETFs']]);
  assert.strictEqual(G.get('alpha'), 200);
  assert.deepStrictEqual([sp.gains, sp.left, sp.why.put, sp.why.cash], [200, -200, -200, 0]);
  assert.strictEqual(sp.why.putRows.length, 1);
  assert.strictEqual(G.unlinked.length, 1);
}

/* 4. a row that fits two accounts equally: goes to neither, same as unmatched */
{
  const { sp, G } = run([acc('cash', 'Main Bank', 'cash'), acc('a1', 'Alpha One', 'invest'), acc('a2', 'Alpha Two', 'invest')],
    { cash: 1000, a1: 500, a2: 500 }, { cash: 700, a1: 800, a2: 500 }, [['investments', -300, 'ALPHA deposit', 'Funds/ETFs']]);
  assert.strictEqual(G.unlinked.length, 1);
  assert.deepStrictEqual([sp.gains, sp.left, sp.why.put], [300, -300, -300]);
}

/* 5. a dividend kept inside the account (no income row): a gain, nothing to review */
{
  const { sp, G } = run([acc('cash', 'Main Bank', 'cash'), acc('beta', 'Beta Funds', 'invest')], { cash: 1000, beta: 4000 }, { cash: 1000, beta: 4040 }, []);
  assert.strictEqual(G.get('beta'), 40);
  assert.deepStrictEqual([sp.gains, sp.left], [40, 0]);
}

/* 5b. a dividend paid out as income that names the account: a gain of that account, not saving */
{
  const { sp, G } = run([acc('cash', 'Main Bank', 'cash'), acc('beta', 'Beta Funds', 'invest')], { cash: 1000, beta: 4000 }, { cash: 1040, beta: 4000 },
    [['income', 40, 'Beta Funds dividend', 'Dividends']]);
  assert.strictEqual(G.get('beta'), 40);
  assert.deepStrictEqual([sp.saved, sp.gains, sp.left, sp.returns], [0, 40, 0, 40]);
}

/* 5c. interest naming an account that has no figure this month: not in any gain, so it is listed for review */
{
  const { sp } = run([acc('cash', 'Main Bank', 'cash'), acc('lend', 'Lendco Notes', 'illiquid')], { cash: 1000, lend: 2000 }, { cash: 1012.5 },
    [['income', 12.5, 'Lendco Notes interest', 'Interest']]);
  assert.deepStrictEqual([sp.gains, sp.left, sp.why.ret], [0, 12.5, 12.5]);
  assert.strictEqual(sp.why.retRows.length, 1);
}

/* 6. moving money between your own accounts: between two cash accounts (no row), and selling an investment to cash */
{
  const { sp, G } = run([acc('c1', 'Main Bank', 'cash'), acc('c2', 'Side Bank', 'cash'), acc('alpha', 'Alpha Fund', 'invest')],
    { c1: 2000, c2: 100, alpha: 5000 }, { c1: 2500, c2: 600, alpha: 4000 }, [['investments', 1000, 'Alpha Fund sale', 'Funds/ETFs']]);
  assert.strictEqual(G.get('alpha'), 0);
  assert.deepStrictEqual([sp.change, sp.saved, sp.gains, sp.left], [0, 0, 0, 0]);
}

/* 7. pension rows go to the Retirement account even when another account shares a word */
{
  const { sp, G } = run([acc('cash', 'Main Bank', 'cash'), acc('fund', 'Zeta Fund', 'invest'), acc('pen', 'Zeta Pension', 'pension')],
    { cash: 1000, fund: 3000, pen: 2000 }, { cash: 875, fund: 3000, pen: 2130 }, [['investments', -125, 'ZETA plan pensiones', 'Pension']]);
  assert.deepStrictEqual([G.get('pen'), G.get('fund')], [5, 0]);
  assert.deepStrictEqual([sp.gains, sp.left], [5, 0]);
}

/* 8. negative gains stay negative and still add up */
{
  const { sp } = run([acc('cash', 'Main Bank', 'cash'), acc('gamma', 'Gamma Broker', 'invest')], { cash: 500, gamma: 1800 }, { cash: 500, gamma: 1745.5 }, []);
  assert.deepStrictEqual([sp.change, sp.gains, sp.left], [-54.5, -54.5, 0]);
}

/* 9. cents: amounts whose float sums drift (0.1 + 0.2) still add up exactly */
{
  const { sp } = run([acc('cash', 'Main Bank', 'cash')], { cash: 0.1 }, { cash: 0.3 }, [['income', 0.1, 'a', 'Salary'], ['income', 0.1, 'b', 'Salary']]);
  assert.deepStrictEqual([sp.change, sp.saved, sp.left], [0.2, 0.2, 0]);
}

/* 10. the check itself fails when the numbers don't add up */
{
  const f = make({ accounts: [], snaps: {} }, {}, RET);
  assert.strictEqual(f.nwReconcile({ change: 100, saved: 50, gains: 40, fresh: 0, left: 10, why: { cash: 10, ret: 0, put: 0 }, grp: {} }), true);
  assert.strictEqual(f.nwReconcile({ change: 100, saved: 50, gains: 40, fresh: 0, left: 10, why: { cash: 9, ret: 0, put: 0 }, grp: {} }), false);
  assert.strictEqual(f.nwReconcile({ change: 100, saved: 50, gains: 40, fresh: 0, left: 10, why: { cash: 10, ret: 0, put: 0 }, grp: { invest: { change: 500, gains: 40, flow: 400 } } }), false);
}

console.log('reconcile-smoke: all checks passed');
