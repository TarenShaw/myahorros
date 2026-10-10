# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Yearly Budget Tracker" (myahorros.app): a static, no-build, no-backend web app deployed straight from `main` to GitHub Pages (`.nojekyll`, `CNAME`). All user data stays in the visitor's browser/folder/Google Drive. There is no package.json, bundler or linter.

## Run locally

```
python -m http.server 8000      # then open http://localhost:8000
```

Must be served over `localhost` or https: the service worker only registers there (`js/web-boot.js`). After changing cached files, hard-reload or unregister the SW, or you will see stale assets.

## Checks

```
node tests/ai-smoke.js          # AI layer: retries, limits, truncation, key scrubbing (no browser)
node tests/chunk-smoke.js       # request splitting and merging pulled out of index.html
node tools/update-csp-hash.js   # after ANY edit to index.html's inline <script>
```

Browser tests need Playwright (Edge channel) and the server above: `NODE_PATH=<dir with playwright> node tests/drive-sync.e2e.js` (fake Drive: deferral, conflict, merge) and `tests/landing-wizard.e2e.js` (landing, wizard, tour hand-off).

## Line endings

The repo is LF (`.gitattributes`). The CSP hash is computed on the LF text, which is what GitHub Pages serves; a CRLF checkout would make the page silently fail locally. Do not convert files to CRLF.

## Architecture

- `index.html` (~570 KB, ~5,300 lines) is the whole app: inline CSS plus one inline `<script>` (UI, ledger, charts, i18n en/es). It was generated from the Windows (Neutralino) version of the tracker, which is not in this repo, so the same code runs in both. It talks to storage and AI through `window.claude`-style APIs.
- `js/web-shim.js` stands in for the Windows app's `window.claude` layer. Three storage modes (`ybt.storage` in localStorage): `folder` (File System Access API, Chrome/Edge), `drive` (Google Drive `drive.file` scope, local copy + upload when online, conflict prompt), `browser` (IndexedDB). Data format is `tracker-data.json` + daily `Backups/`, identical to the Windows app, so it must stay backward compatible.
- `js/web-ai.js` provides `sample.json(prompt, opts)` for statement reading: direct browser-to-vendor calls with the visitor's own Anthropic/OpenAI/Gemini key, or a copy-paste flow. Keys live only in localStorage/sessionStorage. It retries 429/5xx/network with backoff, stops a silent stream, reports truncation, and `explain(err)` gives the plain-language reason plus copyable details (keys are scrubbed).
- `js/models.js` is the one place for model names, defaults, per-model guidance and request limits (chunk size, max output).
- The page splits big statement text into several requests (`aiJobs`/`aiMerge`/`aiRunJob` in `index.html`), reuses finished requests on retry and re-splits a request whose answer was cut off.
- First visit: `landing()` in `web-shim.js` (See a demo / Get started) then the where-to-save choice; a new tracker gets the tour, then the setup wizard (`modalWizard`, `maybeWizard`). Background syncs wait while a dialog is open or edits are in flight (`window.YBT_BUSY`) and arrive through the soft `ybt-sync-data` event, never `ybt-replace-data` (that one closes dialogs and resets filters).
- `js/web-boot.js` registers `sw.js` and sets the footer year. `config.js` sets `window.YBT_CONFIG` (Google OAuth client ID, version).
- `vendor/` holds pdf.js and SheetJS, self-hosted to satisfy the CSP. Do not edit.

## Things that break easily

- **CSP lives in a `<meta>` in `index.html`.** The inline script is allowed by a `sha256-...` hash in `script-src`. Any edit to that inline `<script>` changes the hash; the page then silently fails to run until the hash is updated. Run `node tools/update-csp-hash.js` after every edit.
- New external hosts (APIs, scripts) must be added to the CSP `connect-src`/`script-src`, and to the README's privacy statement and `privacy.html`.
- `sw.js` has a hard-coded `FILES` precache list and a `VERSION`. Adding/removing/renaming a shipped file means updating `FILES`; bump `VERSION` so clients drop the old `ybt-*` cache. A missing file in `FILES` makes SW install fail (`addAll`).
- `config.js` is fetched fresh by the SW so the Client ID can be changed on its own; keep it a plain `window.YBT_CONFIG = {...}` assignment.
- GoatCounter (`myahorrosapp.goatcounter.com`, script from `gc.zgo.at`) is the only analytics. It is whitelisted in the CSP of `index.html` only; `privacy.html` has `script-src 'none'` so that page is not counted. Any new third party needs a CSP entry plus an update to `privacy.html` (both languages) and the README.
- Bilingual (en/es): UI strings exist in both languages in `index.html`, `web-shim.js` (`TX`) and `web-ai.js`; `privacy.html` is also bilingual. Update both.

## Deploy

Push to `main`; GitHub Pages publishes from the repo root. `README.md` documents Pages/domain/Google Cloud OAuth setup (parts 1-4).

## Codebase navigation

Before grepping or reading many files, query the knowledge graph in graphify-out/
(use /graphify query "...", /graphify path "A" "B", or /graphify explain "X").
