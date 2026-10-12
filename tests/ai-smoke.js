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
/* Expose the existing panel constructor only in this test to exercise focus without a browser. */
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'web-ai.js'), 'utf8').replace('window.YBT_AI={sample};','sample._panel=panel; window.YBT_AI={sample};'));
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
  const sent = [], bodies = [];
  fetch = async (u, o) => { const b = JSON.parse(o.body), mt = b.max_tokens; sent.push(mt); bodies.push(b);
    return mt > 8192 ? fail(400, '{"error":{"type":"invalid_request_error","message":"max_tokens: 64000 > 8192, which is the maximum allowed number of output tokens for claude-haiku-5-5"}}')
      : sse(claudeText('{"done":true}')); };
  assert.deepStrictEqual(await sample.json('p'), { done: true });
  assert.deepStrictEqual(sent, [64000, 8192]);
  /* every Claude request, retries included, carries the chosen model and effort: Haiku 5.5 at high unless the person picked others */
  const claude = async (model, effort) => { store['ybt.ai'] = JSON.stringify({ provider: 'anthropic', model, effort, key: KEY }); bodies.length = 0;
    assert.deepStrictEqual(await sample.json('p'), { done: true }); assert.ok(bodies.length);
    return [...new Set(bodies.map(b => b.model + ' ' + (b.output_config ? b.output_config.effort : '-')))]; };
  assert.deepStrictEqual(await claude('claude-haiku-5-5'), ['claude-haiku-5-5 high']);
  assert.deepStrictEqual(await claude('', undefined), ['claude-haiku-5-5 high']);
  assert.deepStrictEqual(await claude('claude-opus-5-5', 'max'), ['claude-opus-5-5 max']);
  assert.deepStrictEqual(await claude('claude-sonnet-5-5', 'low'), ['claude-sonnet-5-5 low']);
  assert.deepStrictEqual(await claude('claude-haiku-5-5', 'turbo'), ['claude-haiku-5-5 high']);   /* unknown level: the default */
  assert.deepStrictEqual(await claude('claude-haiku-4-5', 'high'), ['claude-haiku-4-5 -']);       /* older models reject the field */
  useCfg('anthropic', 'claude-haiku-5-5');

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

  /* Copy/paste disclosure never claims a key or automatic upload; pictures cannot be silently lost. */
  useCfg('paste', '');
  assert.strictEqual(sample.current().images, false);
  assert.ok(!/own key/.test(sample.text('aiAuditPrivacy', 'en')));
  assert.ok(/choose whether/.test(sample.text('aiAuditPrivacy', 'en')));
  assert.ok(/Tú decides/.test(sample.text('aiAuditPrivacy', 'es')));
  assert.ok(/Scans and pictures/.test(sample.text('aiFileHelp', 'en')));
  await assert.rejects(sample.json('p', { images: [{}] }), e => e.code === 'bad_request');
  const stopped = new AbortController(); stopped.abort();
  await assert.rejects(sample.json('p', { signal: stopped.signal }), e => e.code === 'cancelled');
  useCfg('gemini', 'gemini-test');
  assert.strictEqual(sample.current().images, true);
  assert.ok(/Gemini.*own key/.test(sample.text('aiAuditPrivacy', 'en')));

  /* The top AI dialog handles Tab before the wizard and restores its launching button. */
  const oldDocument = document, oldAdd = addEventListener, listeners = {}, panels = [];
  global.addEventListener = (type, fn, capture) => { assert.strictEqual(capture, true); (listeners[type] ||= []).push(fn); };
  global.removeEventListener = (type, fn) => { listeners[type] = listeners[type].filter(x => x !== fn); };
  const focusNode = visible => ({ isConnected: true, getClientRects: () => visible ? [{}] : [], focus() { document.activeElement = this; } });
  const opener = focusNode(true), first = focusNode(true), hidden = focusNode(false), last = focusNode(true);
  global.document = {
    activeElement: opener,
    querySelectorAll: () => panels.filter(p => p.isConnected),
    createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, focus() { document.activeElement = this; },
      querySelectorAll: () => [first, hidden, last], contains: node => [first, hidden, last].includes(node),
      remove() { this.isConnected = false; } }),
    body: { appendChild(el) { el.isConnected = true; panels.push(el); } }
  };
  const panel = sample._panel('test');
  const tab = shiftKey => { let prevented = 0, stopped = 0; listeners.keydown[0]({ key: 'Tab', shiftKey, preventDefault() { prevented++; }, stopImmediatePropagation() { stopped++; } }); assert.strictEqual(prevented, 1); assert.strictEqual(stopped, 1); };
  last.focus(); tab(false); assert.strictEqual(document.activeElement, first);
  first.focus(); tab(true); assert.strictEqual(document.activeElement, last);
  opener.focus(); listeners.focusin[0]({ target: opener }); assert.strictEqual(document.activeElement, first);
  panel.close(); assert.strictEqual(document.activeElement, opener);
  assert.strictEqual(listeners.keydown.length, 0); assert.strictEqual(listeners.focusin.length, 0);
  global.document = oldDocument; global.addEventListener = oldAdd;
  console.log('web-ai smoke: all passed');
})().catch(e => { console.error(e); process.exit(1); });
