# PROGRESS

Branch: `worktree-quick-wins` (worktree `.claude/worktrees/quick-wins`, local only, not pushed), based on `main` at `baf2f60` (PR #1 `overhaul` already merged). Last handoff: 2026-10-10.
Product name: **MyAhorros** (site at myahorros.app).

## Completed

| Phase | Commit | Summary |
|---|---|---|
| Setup | `6f3ff66` | GoatCounter + privacy policy, CLAUDE.md |
| 1.1-1.3, 1.5 | `c814aff` | AI error box with copy details, request chunking/merge, retries, timeouts, truncation handling, Gemini GIF conversion, `js/models.js`, CSP hash tool, `.gitattributes` (LF) |
| 1.4 + 7 | `d5b0dbe` | Drive/folder sync waits while a dialog is open or edits in flight, "Merge both", version re-check before upload, retry/backoff, sync status line |
| 2.x | `bdc77ef` | Haiku 5.5 default, model guidance, Paid/Free badges, first-use picker, Change AI, clickable answer options, template button/link |
| 3.x | `b222477` | Overview order, no chart legends, fixed-width selectors, tab icons, wrapped review notes, bigger type, action buttons, Gains column |
| 4.x | `523c194` | Landing page, setup wizard (net worth, earlier months, transactions, salary, summary), tour refresh |
| 5, docs | `2a2a787` | GoatCounter privacy link, README/CLAUDE.md updates |
| Rename | `978013a`, `133d267` | Renamed to MyAhorros; Gains tooltip explains value rising beyond tracked deposits |
| 6 | (chat only) | Name proposals delivered; MyAhorros chosen |
| Merge | `baf2f60` | PR #1 `overhaul` merged into `main` |
| Audit quick wins | `58be1db` | Newcomer audit (Playwright, 390/768/1280 px) then 5 fixes: empty-state actions on Overview/Transactions, "add at least one account" validation, setup strip "step N of 5", paste/import recommended + API key not remembered by default, new title/description/og/twitter tags, `sw.js` VERSION 1.0.7, CSP hash refreshed |

## In progress

Nothing uncommitted in application code. Untracked in the worktree: `.playwright-cli/` (Playwright logs, safe to delete). In the main checkout: `.graphifyignore`, `graphify-out/`.

## Pending

- Push `worktree-quick-wins` for review, or merge into `main` (merging publishes the live site via GitHub Pages). Needs the user's say-so.
- 8.2 Live-key verification (rotated Gemini key + real Claude key, large statement on Haiku 5.5 and Gemini).
- 8.3 Mobile and tour pass: landing page and import review at 390 px not yet checked; keyboard and screen-reader checks not done.
- 8.5 Post-release: GoatCounter counts a visit, existing users update cleanly (SW `VERSION`, CSP hash).
- Remaining audit items, only if the user asks (see Known issues): P1 #5-#10, P2 list.
- 9.x follow-ups from PLAN.md (deposit-to-account matching, send answers back to the AI).

## Decisions

- 2026-10-10: Name is **MyAhorros**.
- 2026-10-10: Gains = change since last month minus money put in. "Put in" = Investments rows that name the account. Cash accounts show none. A deposit that doesn't name the account counts as a gain.
- 2026-10-10: Do not push or merge without the user's say-so.
- 2026-10-10: Default AI model Claude Haiku 5.5; names, guidance and limits live in `js/models.js`.
- 2026-10-10: Copy and paste column is labelled "API (your own key)" (Gemini is free); card keeps the name "ChatGPT".
- 2026-10-10: Overview order: This month (with Do it with AI), Month by month, By category, Share of income, Indicators. Chart legends removed.
- 2026-10-10: Answer buttons (2.6) apply to the review row locally; they are not sent back to the AI.
- 2026-10-10: Keep "Yearly Budget Tracker" only where it identifies stored data: Drive/Documents folder name, `app` field in the data file, Windows-app folder text.
- 2026-10-10: Wizard is the default for new trackers and runs after the tour; returning users skip the landing page.
- 2026-10-10: Project skills `handoff` and `start` live in `.claude/skills/`.
- 2026-10-10: User asked for a first-time-user site audit and the 5 quick wins only; other audit findings are not approved work.
- 2026-10-10: Setup strip counts wizard steps (acc and figures = 1, transactions = 3, of 5); wizard step 3 recommends paste/import, not AI.

## Known issues

- Rotate the Google/Gemini API key pasted into an earlier chat (treated as exposed; never used).
- Gemini rejection and the large-input failure (Haiku 5.5) not reproduced without a live key; mocks only (`js/web-ai.js`, `index.html` aiRun).
- Audit, not yet fixed:
  - Demo → "Set up my tracker" silently sets `ybt.storage=browser` and skips the where-to-save chooser (`js/web-shim.js`, `index.html`).
  - "Setup done" card appears after one transaction and repeats on every tab, about 40% of a 390 px screen (`guideCard` in `index.html`).
  - "No keyword matches this concept" jargon shown before typing; amount error not cleared on input; example `1.234,56` ignores the chosen number format (`index.html` add-transaction dialog).
  - Demo Overview shows an empty current month and a "no backup yet" warning (`backupNudge`, `index.html`).
  - Contrast below 4.5:1 for 11 px grey labels; 18-30 tap targets under 36 px per tab, about 175 on Categories (`web.css`).
  - Spanish "tu control" wording; category defaults are Spanish-personal ("Lottery", "Gym", "Tickets Comida", "Flex"); currency list lacks JPY/COP/ARS/BRL.
  - `og:image` is the square `icons/icon-512.png`; a 1200x630 image would preview better. No custom 404.
  - Footer credit reads "Claude Opus 5.5" (`index.html`, `js/web-shim.js`); check it is still wanted.
- Not tested: Firefox/Safari, offline/service-worker update, real Drive OAuth, import review at 390 px.
- Gains: a deposit whose description doesn't name the account counts as a gain (`nwGains` in `index.html`).
- Line endings: checkouts must stay LF or the CSP hash breaks locally (`.gitattributes`, `tools/update-csp-hash.js`).
- Worktree sessions refuse compound git commands and `eval` strings; run git as plain separate commands.

## Commands

- Serve: `python -m http.server 8000` then open http://localhost:8000
- After editing index.html's inline script: `node tools/update-csp-hash.js`
- Tests: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`
- Browser tests (Playwright, Edge channel, server running): `NODE_PATH=<dir with playwright> node tests/drive-sync.e2e.js` and `tests/landing-wizard.e2e.js`
- Bump `VERSION` in `sw.js` and update its `FILES` list when shipped files change.
- Audit/verification driving: `playwright-cli -s=<name> open http://localhost:<port>`, scripts via `run-code --filename=<file>`.
