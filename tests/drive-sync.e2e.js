/* End-to-end check of Google Drive sync with a fake Drive, in a real browser.
     python -m http.server 8000      (in the repo root, in another terminal)
     NODE_PATH=<folder with playwright installed> node tests/drive-sync.e2e.js
   Checks: a newer remote copy never changes data or closes a dialog while one is open; it loads by itself afterwards;
   a real conflict offers "Merge both", and the merged file in Drive has the months from both sides. */
const { chromium } = require('playwright');
const assert = require('assert');
const START = process.env.START_URL || 'http://localhost:8000/';

/* ---- a tiny fake of the parts of Drive v3 the site uses ---- */
const files = []; let nextId = 1;
const now = () => new Date().toISOString();
const add = (o) => { const f = Object.assign({ id: 'f' + nextId++, parents: [], version: 1, modifiedTime: now(), content: '' }, o); files.push(f); return f; };
const root = add({ name: 'Yearly Budget Tracker', mime: 'application/vnd.google-apps.folder' });
const matches = q => files.filter(f => { const n = q.match(/name='([^']*)'/), p = q.match(/'([^']+)' in parents/), m = q.match(/mimeType='([^']*)'/);
  return (!n || f.name === n[1]) && (!p || f.parents.includes(p[1])) && (!m || f.mime === m[1]); });
const pub = f => ({ id: f.id, name: f.name, version: String(f.version), modifiedTime: f.modifiedTime, trashed: false });
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function routeDrive(page) {
  await page.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body:
    `window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken(){setTimeout(()=>o.callback({access_token:'TEST',expires_in:3600}),0)}}),hasGrantedAllScopes:()=>true,revoke(){}}}};` }));
  await page.route('https://www.googleapis.com/**', async route => {
    const req = route.request(), u = new URL(req.url()), p = u.pathname, m = req.method();
    if (p === '/drive/v3/files' && m === 'GET') return json(route, { files: matches(u.searchParams.get('q') || '').map(pub) });
    if (p === '/drive/v3/files' && m === 'POST') { const b = JSON.parse(req.postData()); const f = add({ name: b.name, mime: b.mimeType, parents: b.parents || [] }); return json(route, { id: f.id }); }
    let mm = p.match(/^\/drive\/v3\/files\/([^/]+)\/copy$/);
    if (mm && m === 'POST') { const s = files.find(f => f.id === mm[1]), b = JSON.parse(req.postData()); const f = add({ name: b.name, parents: b.parents, content: s.content }); return json(route, { id: f.id }); }
    mm = p.match(/^\/drive\/v3\/files\/([^/]+)$/);
    if (mm && m === 'GET') { const f = files.find(x => x.id === mm[1]); if (!f) return json(route, {}, 404);
      return u.searchParams.get('alt') === 'media' ? route.fulfill({ status: 200, contentType: 'application/json', body: f.content }) : json(route, pub(f)); }
    if (mm && m === 'DELETE') { files.splice(files.findIndex(x => x.id === mm[1]), 1); return route.fulfill({ status: 204, body: '' }); }
    if (p === '/upload/drive/v3/files' && m === 'POST') {
      const body = req.postData(), parts = body.split(/--ybt\w+/).filter(s => s.includes('Content-Type'));
      const meta = JSON.parse(parts[0].split(/\r\n\r\n/)[1].trim()), text = parts[1].split(/\r\n\r\n/).slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
      const f = add({ name: meta.name, parents: meta.parents || [], content: text }); return json(route, pub(f));
    }
    mm = p.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);
    if (mm && m === 'PATCH') { const f = files.find(x => x.id === mm[1]); f.content = req.postData(); f.version++; f.modifiedTime = now(); return json(route, pub(f)); }
    return json(route, { error: 'unmocked ' + m + ' ' + p }, 500);
  });
}
const trackerFile = () => files.find(f => f.name === 'tracker-data.json');
const month = amt => ({ income: [{ date: '2026-03-05', amount: amt, concept: 'Pay', category: '' }], expenses: [], investments: [] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, what) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timed out: ' + what); await sleep(150); } }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));
  await routeDrive(page);
  await page.addInitScript(() => { try { localStorage.setItem('ybt.lang', 'en'); } catch (_) {} });
  await page.goto(START, { waitUntil: 'load' });
  await page.click('button.web-way[data-m=drive]');
  await page.waitForSelector('.web-panel', { state: 'detached', timeout: 10000 });
  await page.evaluate(() => { window.__synced = 0; window.addEventListener('ybt-sync-data', () => window.__synced++); });
  console.log('1. connected to the fake Drive');

  /* first save creates the file */
  await page.evaluate(async m => { const db = await window.claude.use('db'); await db.doc('months/2026-03').set(m); }, month(100));
  await until(() => trackerFile(), 15000, 'tracker-data.json created in Drive');
  const v1 = trackerFile().version;
  console.log('2. first save reached Drive (version ' + v1 + ')');

  /* 3. a dialog is open when a newer copy appears elsewhere: nothing may change until it's closed */
  const other = JSON.parse(trackerFile().content); other.months['2026-06'] = month(250);
  const opened = await page.evaluate(() => { const b = document.querySelector('[data-action="ob-ai"],[data-action="ai-tx"]'); if (b) { b.click(); return true; } return false; });
  if (opened) {
    await page.waitForSelector('#overlay.on', { timeout: 5000 });
    const f = trackerFile(); f.content = JSON.stringify(other); f.version += 1;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await sleep(6500);
    assert.strictEqual(await page.evaluate(() => window.__synced), 0, 'data was swapped while a dialog was open');
    assert.ok(await page.evaluate(() => document.querySelector('#overlay').classList.contains('on')), 'the dialog was closed');
    console.log('3. newer copy waited while the dialog was open; dialog untouched');
    await page.keyboard.press('Escape');
    await until(async () => (await page.evaluate(() => window.__synced)) > 0, 20000, 'newer copy loaded after the dialog closed');
    console.log('   ...and loaded by itself after it was closed');
  } else console.log('3. (no AI button on this screen: skipped the open-dialog check)');

  /* 4. a real conflict: edit here while Drive has a newer copy with another month */
  const f = trackerFile(); const remote = JSON.parse(f.content); remote.months['2026-07'] = month(999);
  f.content = JSON.stringify(remote); f.version += 1;
  await page.evaluate(async m => { const db = await window.claude.use('db'); await db.doc('months/2026-04').set(m); }, month(40));
  await page.waitForSelector('button[data-x=merge]', { timeout: 15000 });
  console.log('4. conflict dialog shows "Merge both"');
  await page.click('button[data-x=merge]');
  const merged = await until(() => { const d = JSON.parse(trackerFile().content); return d.months['2026-04'] && d.months['2026-07'] ? d : null; }, 15000, 'merged file uploaded');
  assert.ok(merged.months['2026-03'], 'month from the first save lost');
  assert.ok(files.some(x => /changed elsewhere|before merging/.test(x.name)), 'no backup of the other version was kept');
  console.log('5. merged file has 2026-03, 2026-04 (mine) and 2026-07 (theirs); the other version was kept as a backup');
  await browser.close();
  console.log('drive sync e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
