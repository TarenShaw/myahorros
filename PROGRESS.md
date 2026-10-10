# PROGRESS

Branch: `overhaul` (local only, not pushed). `main` untouched. Last handoff: 2026-10-10.
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

## In progress

Nothing uncommitted in application code. Untracked: `.claude/skills/handoff`, `.claude/skills/start` (new skills, not yet committed), `.graphifyignore`, `graphify-out/`.

## Pending

- User reviews the site at http://localhost:8000 (branch `overhaul`) and says whether to push to GitHub.
- Decide: push the `overhaul` branch for review, or merge into `main` (merging publishes the live site via GitHub Pages).
- No PLAN.md exists; the `start` skill needs one (could be written from the phase list in the original brief).

## Decisions

- 2026-10-10: Name is **MyAhorros**.
- 2026-10-10: Gains = change since last month minus money put in. "Put in" = Investments rows that name the account. Cash accounts show none. A deposit that doesn't name the account counts as a gain (the account's own value rising, not recorded in the tracker).
- 2026-10-10: Work on a local branch `overhaul`; do not push or merge without the user's say-so.
- 2026-10-10: Default AI model Claude Haiku 5.5; names, guidance and limits live in `js/models.js`.
- 2026-10-10: Copy and paste column is labelled "API (your own key)" (Gemini is free); card keeps the name "ChatGPT".
- 2026-10-10: Overview order: This month (with Do it with AI), Month by month, By category, Share of income, Indicators. Chart legends removed.
- 2026-10-10: Answer buttons (2.6) apply to the review row locally; they are not sent back to the AI (no conversation in this app).
- 2026-10-10: Keep "Yearly Budget Tracker" only where it identifies stored data: Drive/Documents folder name, `app` field in the data file, Windows-app folder text.
- 2026-10-10: Wizard is the default for new trackers and runs after the tour; returning users skip the landing page.
- 2026-10-10: Setup/skills: new skills are `handoff` and `start` (project level, `.claude/skills/`).

## Known issues

- Rotate the Google/Gemini API key the user pasted into an earlier chat (treated as exposed; never used).
- Gemini rejection and the large-input failure (Haiku 5.5) were not reproduced without a live key; fixes are tested against mocks only. Real cause will show in the new error box (`js/web-ai.js`, `index.html` aiRun).
- Only 1280 px desktop checked visually (Edge). Mobile widths and every tour step not reviewed (`index.html`, `web.css`).
- Gains: a deposit whose description doesn't name the account is counted as a gain (`nwGains` in `index.html`).
- Line endings: Windows checkouts must stay LF or the CSP hash breaks locally (`.gitattributes`, `tools/update-csp-hash.js`).
- `config.js` and `manifest.webmanifest` show as modified in `git status` after line-ending normalisation, with no content diff.

## Commands

- Serve: `python -m http.server 8000` then open http://localhost:8000
- After editing index.html's inline script: `node tools/update-csp-hash.js`
- Tests: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`
- Browser tests (need Playwright, Edge channel, server running): `NODE_PATH=<dir with playwright> node tests/drive-sync.e2e.js` and `tests/landing-wizard.e2e.js`
- Bump `VERSION` in `sw.js` and update its `FILES` list when shipped files change.
