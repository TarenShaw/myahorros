/* First useful result, review/Undo, source history and advanced controls, using fictional data.
   python -m http.server 8000; NODE_PATH=<playwright folder> node tests/newcomer.e2e.js */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const errors = [];
    const fresh = async (width = 1280) => {
      const ctx = await browser.newContext({ viewport: { width, height: 860 } });
      await ctx.addInitScript(() => { window.__ybtTest=true; localStorage.setItem('ybt.lang', 'en'); });
      await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{oauth2:{}}};' }));
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(String(e)));
      await p.goto(START, { waitUntil: 'load' });
      return p;
    };
    const saved = async (p, predicate) => p.waitForFunction(predicate, null, { timeout: 5000 });
    const undo = async p => {
      const b = p.locator('#toast button').filter({ hasText: /^Undo$/ }).last();
      await b.waitFor();
      await b.click();
    };
    let p = await fresh();
    await p.click('.web-landing .wl-hero [data-x=start]');
    await p.click('button.web-way[data-m=browser]');
    await p.click('[data-action=ob-start]');
    await p.waitForSelector('.wz-body');
    assert.strictEqual(await p.locator('#tour-card').count(), 0, 'quick start must reach setup without a tour');
    assert.ok(/last month/i.test(await p.innerText('.wz-body')), 'quick start should explain its short time period');
    await p.click('[data-action=wz-next]');
    await p.click('[data-action=ai-tx]');
    await p.click('[data-action=ai-setup]');
    await p.waitForSelector('.ai-panel');
    assert.ok(await p.isHidden('#ai-keybox'), 'new AI setup should start with the no-key route');
    for (let i = 0; i < 16; i++) {
      await p.keyboard.press(i % 3 ? 'Tab' : 'Shift+Tab');
      assert.ok(await p.evaluate(() => document.querySelector('.ai-panel').contains(document.activeElement)), 'keyboard focus escaped AI setup into the wizard');
    }
    await p.keyboard.press('Escape');
    await p.waitForSelector('.ai-panel', { state: 'detached' });
    assert.ok(await p.isVisible('.ai-body'), 'closing AI setup must preserve statement intake');
    await p.setInputFiles('#ai-file',{name:'cancel-example.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Description,Amount\n2026-09-10,Example,-1')}); await p.click('[data-action=ai-send]'); await p.waitForSelector('.ai-panel'); await p.keyboard.press('Escape');
    await p.waitForFunction(()=>!document.querySelector('.ai-panel')&&!window.__ybt.S.modal.busy); assert.ok(await p.isVisible('.ai-body'),'cancelled setup must keep files and avoid reopening the picker');
    await p.keyboard.press('Escape');
    await p.waitForSelector('.wz-body');
    await p.keyboard.press('Escape');
    console.log('1. quick start, no required tour, nested AI keyboard focus');

    const tracker = {
      app: 'Yearly Budget Tracker', format: 1,
      months: {
        '2026-08': { income: [{ id: 'oldpay', date: '2026-08-25', concept: 'Example pay', amount: 2000, category: 'Salary' }], expenses: [{ id: 'oldshop', date: '2026-08-10', concept: 'Example shop', amount: -20, category: 'Groceries' }], investments: [] },
        '2026-09': { income: [{ id: 'pay', date: '2026-09-25', concept: 'Example pay', amount: 2100, category: 'Salary' }], expenses: [
          { id: 'shop', date: '2026-09-10', concept: 'Example shop', amount: -30, category: 'Groceries', source: 'example.csv', account: 'bank', batch: 'seed' },
          { id: 'cafe', date: '2026-09-12', concept: 'Example cafe', amount: -5, category: '', source: 'other.csv', account: 'bank', batch: 'seed' }
        ], investments: [] }
      },
      config: {
        settings: { lang: 'en', start: { y: 2026, m: 7 }, guideDone: true, auditAnswers: [{ q: 'Existing question', a: 'Existing answer' }] },
        categories: { income: [{ name: 'Salary' }], expenses: [{ name: 'Groceries', type: 'Need' }, { name: 'Restaurants', type: 'Want' }], investments: [{ name: 'Funds' }] },
        networth: { accounts: [{ id: 'bank', name: 'Example account', group: 'cash' }], snaps: { '2026-08': { bank: 1000 }, '2026-09': { bank: 1100 } } }
      }
    };
    await p.evaluate(async t => { localStorage.setItem('ybt.storage', 'browser'); await window.__ybtWeb.idb.set('data', JSON.stringify(t)); }, tracker);
    await p.reload({ waitUntil: 'load' });
    await saved(p, () => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09']);
    await p.click('#tab-transactions');
    await p.click('[data-action=tx-table][data-t=expenses]');
    await p.fill('#tx-from', '2026-09-11');
    await p.locator('#tx-from').dispatchEvent('change');
    assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(), 1, 'date filter should isolate cafe');
    await p.fill('#tx-from', '');
    await p.locator('#tx-from').dispatchEvent('change');
    await p.fill('#tx-min', '10');
    await p.locator('#tx-min').dispatchEvent('change');
    assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(), 2, 'magnitude minimum should retain both large expenses');
    await p.fill('#tx-min', '');
    await p.locator('#tx-min').dispatchEvent('change');
    await p.selectOption('#tx-source', 'example.csv');
    assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(), 1, 'source filter should isolate source statement');
    await p.click('[data-action=tx-save-view]'); await p.fill('#view-name','Example source view'); await p.locator('#save-view-form button[type=submit]').click();
    await saved(p,()=>window.__ybtWeb.store.config.settings.txViews?.length===1);
    const savedId=await p.evaluate(()=>window.__ybtWeb.store.config.settings.txViews[0].id); await p.selectOption('#tx-source',''); await p.selectOption('#tx-saved-view',savedId);
    assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(),1,'saved custom view restores its source filter');
    await p.selectOption('#tx-source', '');
    await p.selectOption('#tx-saved-view', 'uncat');
    assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(), 1, 'uncategorised saved view should isolate cafe');
    await p.click('[data-action=tx-clear]');
    await p.locator('#txr-cafe [data-action=tx-pick]').check();
    await p.click('[data-action=tx-bulk]');
    await p.selectOption('#bulk-cat', 'Restaurants');
    await p.click('[data-action=bulk-apply]');
    await saved(p, () => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.id === 'cafe').category === 'Restaurants');
    await undo(p);
    await saved(p, () => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.id === 'cafe').category === '');
    assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.id === 'shop').source), 'example.csv');
    console.log('2. dates, magnitude, source and saved filters; bulk category Undo');

    // Return a question plus a deterministic valid correction, without calling an AI service.
    await p.evaluate(async () => {
      const ai = await window.claude.use('sample');
      ai.limits = async () => ({images:null});
      ai.json = async prompt => {
        const cafe = prompt.split('\n').map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).find(r => Array.isArray(r) && r[3] === 'Example cafe');
        if (!cafe) throw new Error('Fictional cafe row missing from audit request');
        return { changes: [[cafe[0], 'expenses', 'Restaurants', 'Fictional correction']], questions: [[null, 'Fictional general question?', [['Fictional answer', null]]]] };
      };
    });
    await p.click('[data-action=audit][data-f=tx]');
    await p.click('[data-action=au-send]');
    await p.waitForSelector('[data-action=au-ans]');
    await p.click('[data-action=au-ans]');
    await p.click('[data-action=au-apply]');
    await saved(p, () => window.__ybtWeb.store.config.settings.auditAnswers.length === 2);
    await undo(p);
    await saved(p, () => window.__ybtWeb.store.config.settings.auditAnswers.length === 1);
    assert.deepStrictEqual(await p.evaluate(() => window.__ybtWeb.store.config.settings.auditAnswers), tracker.config.settings.auditAnswers);
    await saved(p, () => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.id === 'cafe').category === '');
    console.log('3. audit Undo restores transactions and remembered answers');

    await p.click('[data-action=import]');
    await p.waitForSelector('#imp-text');
    await p.fill('#imp-text', 'Date\tDescription\tAmount\n2026-09-14\tExample lunch\t-8');
    await p.click('[data-action=imp-read]');
    await p.waitForSelector('[data-action=imp-add]');
    await p.click('[data-action=imp-add]');
    if (await p.locator('[data-action=imp-add-confirm]').count()) await p.click('[data-action=imp-add-confirm]');
    await saved(p, () => window.__ybtWeb.store.months['2026-09'].expenses.some(r => r.concept === 'Example lunch'));
    assert.ok(await p.evaluate(() => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.concept === 'Example lunch').batch), 'import must retain its batch');
    await p.click('[data-action=import-history]');
    assert.ok(/Example lunch|1 transaction|1 row/i.test(await p.innerText('.modal')), 'history should list the new import');
    await p.locator('[data-action=import-view][data-t=expenses]').first().click(); assert.strictEqual(await p.locator('tbody [data-action=tx-pick]').count(),1,'import history opens exactly that batch and type'); await p.click('[data-action=tx-clear]');
    await p.reload({ waitUntil: 'load' });
    await saved(p, () => window.__ybtWeb.store && window.__ybtWeb.store.months['2026-09'].expenses.some(r => r.concept === 'Example lunch' && r.batch));
    assert.strictEqual(await p.evaluate(() => window.__ybtWeb.store.months['2026-09'].expenses.find(r => r.id === 'shop').source), 'example.csv', 'saved rows must retain source after reload');
    console.log('4. import batch/history and source survive save/reload');

    await p.click('#tab-overview');
    await p.selectOption('#compare-month', '2026-09');
    await p.selectOption('#compare-base', 'month');
    assert.ok(/100/.test(await p.innerText('#view')), 'comparison should show income change');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click('#tab-networth');
    assert.ok(await p.isHidden('.more-analysis'), 'advanced analysis should start collapsed on phones');
    await p.click('[data-action=analysis-toggle]');
    assert.ok(await p.isVisible('.more-analysis'), 'advanced analysis should expand on request');
    await p.click('[data-action=page-actions]'); assert.ok(await p.isVisible('[data-action=ai-nw]'),'AI balances remain reachable on phones'); await p.click('[data-action=page-actions]');
    const before = await p.evaluate(() => JSON.stringify(window.__ybtWeb.store.config.networth));
    await p.fill('#scenario-extra', '100');
    await p.fill('#scenario-months', '12');
    await p.locator('#scenario-months').dispatchEvent('change');
    assert.strictEqual(await p.evaluate(() => JSON.stringify(window.__ybtWeb.store.config.networth)), before, 'scenario inputs must not change recorded balances');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone page overflowed horizontally');
    await p.setViewportSize({width:1280,height:860});
    await p.evaluate(()=>{ const n=window.__ybt.ensureNw(); n.accounts.push({id:'savings',name:'Example savings',group:'cash'}); window.__ybt.saveNw(); });
    await p.click('#tab-transactions'); await p.click('[data-action=ai-tx]');
    await p.evaluate(async()=>{ const ai=await window.claude.use('sample'); ai.limits=async()=>({images:null}); ai.json=async()=>({rows:[['2026-10-01',-12,'Example one','expenses','Groceries','one.csv','',0],['2026-10-02',-8,'Example two','expenses','Groceries','two.csv','',0]],accounts:[{name:'Example savings',group:'cash',match:'savings',balances:[['2026-09',999]]}],statements:[],left_out:[]}); });
    await p.setInputFiles('#ai-file',[{name:'one.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Description,Amount\n2026-10-01,Example one,-12')},{name:'two.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Description,Amount\n2026-10-02,Example two,-8')}]);
    await p.click('[data-action=ai-send]'); await p.waitForSelector('#imp-source-0');
    await p.selectOption('#imp-source-0','bank'); await p.selectOption('#imp-source-1','savings'); await p.click('[data-action=imp-add]');
    await saved(p,()=>window.__ybtWeb.store.months['2026-10']?.expenses?.length===2);
    assert.deepStrictEqual(await p.evaluate(()=>window.__ybtWeb.store.months['2026-10'].expenses.map(r=>[r.source,r.account]).sort()),[['one.csv','bank'],['two.csv','savings']]);
    await p.waitForSelector('[data-action=nwimp-go]'); await p.click('[data-action=nwimp-go]'); await saved(p,()=>window.__ybtWeb.store.config.networth.snaps['2026-09'].savings===999);
    assert.strictEqual(await p.evaluate(()=>window.__ybtWeb.store.config.settings.guide.stmts.bank.coverageVersion),1,'new imports require explicit coverage instead of the legacy date shortcut');
    console.log('6. multiple AI statements keep separate source accounts and review extracted balances');
    await p.click('#tab-transactions');
    await p.evaluate(()=>{window.__ybt.upsertTx(null,{table:'expenses',date:'2026-09-11',amount:-30,concept:'Example shop copy',category:'Groceries'});window.__ybt.render();});
    await p.evaluate(async()=>{const ai=await window.claude.use('sample');ai.json=async prompt=>{const rows=prompt.split('\n').map(l=>{try{return JSON.parse(l)}catch(_){return null}}).filter(Array.isArray);const a=rows.find(r=>r[3]==='Example shop'&&r[1]==='2026-09-10'),b=rows.find(r=>r[3]==='Example shop copy');return {duplicates:[[b[0],a[0],'Fictional duplicate']]};};});
    await p.click('[data-action=audit][data-f=tx]');await p.click('[data-action=au-send]');await p.waitForSelector('#au-0');
    assert.ok(!await p.isChecked('#au-0'),'AI duplicate deletions require an explicit tick');await p.check('#au-0');await p.click('[data-action=au-apply]');
    await saved(p,()=>!window.__ybtWeb.store.months['2026-09'].expenses.some(r=>r.concept==='Example shop copy'));await undo(p);
    await saved(p,()=>window.__ybtWeb.store.months['2026-09'].expenses.some(r=>r.concept==='Example shop copy'));
    console.log('7. duplicate deletion is opt-in and reversible');
    const quick=await fresh(); await quick.click('.wl-hero [data-x=start]');await quick.click('[data-m=browser]');await quick.click('[data-action=ob-start]');await quick.click('[data-action=guide-acc]');await quick.getByRole('button',{name:'Current account',exact:true}).click();await quick.locator('#nw-acc-form button[type=submit]').click();await quick.click('[data-action=wz-next]');await quick.click('[data-action=guide-import]');
    await quick.setInputFiles('#imp-file',{name:'oversized.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(20*1024*1024+1)});await quick.waitForFunction(()=>document.querySelector('.modal').innerText.includes('20 MB'));assert.strictEqual(await quick.locator('.ai-body').count(),0,'unified PDF input keeps the file-size limit');
    await quick.fill('#imp-text','Date\tDescription\tAmount\n2026-09-05\tExample groceries\t-12');await quick.click('[data-action=imp-read]');await quick.selectOption('#imp-c-0','Groceries');await quick.fill('#imp-period-from','2026-09-30');await quick.fill('#imp-period-to','2026-09-01');await quick.check('#imp-period-confirm');await quick.click('[data-action=imp-add]');assert.ok(await quick.isVisible('[data-action=imp-add]'),'invalid coverage period must stop before writing');await quick.fill('#imp-period-from','2026-09-01');await quick.fill('#imp-period-to','2026-09-30');await quick.click('[data-action=imp-add]');await quick.waitForSelector('[data-action=guide-finish]');assert.match(await quick.innerText('[data-action=guide-finish]'),/See my summary/);await quick.click('[data-action=guide-finish]');
    assert.strictEqual(await quick.getAttribute('#tab-overview','aria-selected'),'true');assert.strictEqual(await quick.locator('.wz-body').count(),0);console.log('8. one account and one local statement lead straight to a summary');
    const quiet=await fresh();await quiet.click('.wl-hero [data-x=start]');await quiet.click('[data-m=browser]');await quiet.click('[data-action=ob-start]');await quiet.click('[data-action=guide-acc]');await quiet.getByRole('button',{name:'Current account',exact:true}).click();await quiet.locator('#nw-acc-form button[type=submit]').click();await quiet.click('[data-action=wz-next]');await quiet.click('[data-action=wz-noactivity]');
    assert.ok(!/undefined|NaN/.test(await quiet.innerText('.wz-body')));assert.match(await quiet.innerText('[data-action=wz-next]'),/^Next$/);console.log('9. an empty account period is explicitly confirmed without fake rows');
    assert.deepStrictEqual(errors, [], 'browser errors');
    console.log('5. comparisons, expandable phone analysis, hypothetical scenario');
    console.log('newcomer e2e: all passed');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
