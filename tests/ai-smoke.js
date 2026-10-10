/* Smoke test for js/web-ai.js without a browser: node tests/ai-smoke.js
   Fakes just enough of the page and of fetch to check retries, limits, truncation and that keys never leak into error details. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const store = {};
global.window = global;
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.sessionStorage = global.localStorage;
global.document = { createElement: () => ({ style: {}, select() {}, remove() {} }), body: { appendChild() {} } };
global.navigator = { language: 'en' };
global.location = { origin: 'http://localhost' };
global.FileReader = class { readAsDataURL() { this.result = 'data:;base64,AAAA'; this.onload(); } };
global.CustomEvent = class {};
global.dispatchEvent = () => {};
global.addEventListener = () => {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'models.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'web-ai.js'), 'utf8'));
store['ybt.lang'] = 'en';
const sample = window.YBT_AI.sample;
const KEY = 'AIzaSyFAKEFAKEFAKEFAKEFAKEFAKE1234567';

const sse = evs => ({ ok: true, status: 200, body: { getReader() { const b = Buffer.from(evs.map(e => 'data: ' + JSON.stringify(e) + '\n\n').join('')); let sent = false;
  return { read: async () => sent ? { done: true } : (sent = true, { done: false, value: new Uint8Array(b) }) }; } } });
const fail = (status, body) => ({ ok: false, status, text: async () => body });
const useCfg = (provider, model) => { store['ybt.ai'] = JSON.stringify({ provider, model, key: KEY }); };
const text = t => ({ candidates: [{ content: { parts: [{ text: t }] } }] });
const claudeText = t => [{ type: 'content_block_delta', delta: { type: 'text_delta', text: t } }];

(async () => {
  /* 1. plain success */
  useCfg('gemini', 'gemini-test');
  fetch = async () => sse([text('{"rows":[]}')]);
  assert.deepStrictEqual(await sample.json('p'), { rows: [] });

  /* 2. rate limit then success: retried and reported */
  let n = 0, retried = 0;
  fetch = async () => (++n === 1 ? fail(429, '{"error":{"message":"slow down"}}') : sse([text('{"ok":1}')]));
  assert.deepStrictEqual(await sample.json('p', { onRetry: () => retried++ }), { ok: 1 });
  assert.strictEqual(n, 2); assert.strictEqual(retried, 1);

  /* 3. model's own output limit is lower: asked again within it */
  useCfg('anthropic', 'claude-haiku-5-5');
  const sent = [];
  fetch = async (u, o) => { const mt = JSON.parse(o.body).max_tokens; sent.push(mt);
    return mt > 8192 ? fail(400, '{"error":{"type":"invalid_request_error","message":"max_tokens: 16000 > 8192, which is the maximum allowed number of output tokens for claude-haiku-5-5"}}')
      : sse(claudeText('{"done":true}')); };
  assert.deepStrictEqual(await sample.json('p'), { done: true });
  assert.deepStrictEqual(sent, [16000, 8192]);

  /* 4. answer cut off by the output limit is reported as such, with the status and no key */
  fetch = async () => sse([...claudeText('{"rows":['), { type: 'message_delta', delta: { stop_reason: 'max_tokens' } }]);
  let err; try { await sample.json('p'); } catch (e) { err = e; }
  assert.strictEqual(err.code, 'output_truncated');
  assert.ok(/cut off/.test(sample.explain(err).why));

  /* 5. bad key: plain reason, provider message kept, key scrubbed from the details */
  useCfg('gemini', 'gemini-test');
  fetch = async () => fail(400, `{"error":{"code":400,"message":"API key not valid. ${KEY}","status":"INVALID_ARGUMENT"}}`);
  try { await sample.json('p'); } catch (e) { err = e; }
  const x = sample.explain(err);
  assert.strictEqual(x.code, 'bad_key'); assert.strictEqual(x.status, 400);
  assert.ok(x.details.includes('HTTP status: 400') && !x.details.includes(KEY), x.details);
  console.log('web-ai smoke: all passed');
})().catch(e => { console.error(e); process.exit(1); });
