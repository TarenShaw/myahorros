/* Recomputes the sha256 of index.html's inline <script> and writes it into the page's CSP.
   Run after every edit to that script:  node tools/update-csp-hash.js
   Hashes the script with LF line endings, as GitHub Pages serves it (the repo is LF; .gitattributes keeps checkouts LF too).
   Exits non-zero if the page doesn't have exactly one inline script. */
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (inline.length !== 1) { console.error('expected exactly 1 inline <script>, found ' + inline.length); process.exit(1); }
const script = inline[0][1].split('\r\n').join('\n');
const hash = 'sha256-' + crypto.createHash('sha256').update(script, 'utf8').digest('base64');
const m = html.match(/'sha256-[A-Za-z0-9+/=]+'/);
if (!m) { console.error('no sha256 in the CSP'); process.exit(1); }
if (m[0] === `'${hash}'`) { console.log('CSP hash already current'); process.exit(0); }
fs.writeFileSync(file, html.replace(m[0], `'${hash}'`));
console.log('CSP hash updated: ' + hash);
