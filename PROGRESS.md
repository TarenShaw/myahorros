# PROGRESS

Branch: `worktree-quick-wins` (worktree `.claude/worktrees/quick-wins`), based on `main` at `baf2f60` (PR #1 `overhaul` merged). Pushed to `origin/worktree-quick-wins` up to `9f3e05e`; `56b1a99` and `7b4b8ad` plus this handoff are local only (push needs the user's say-so). Not merged. Last handoff: 2026-10-10.
Product name: **MyAhorros** (site at myahorros.app).

## Completed

| Phase | Commit | Summary |
|---|---|---|
| 0-7, rename, merge | `6f3ff66`…`baf2f60` | GoatCounter/privacy; AI errors, chunking, retries, `js/models.js`; Drive/folder sync safety; Haiku 5.5 default, badges, Change AI; layout/Gains column; landing, wizard, tour; renamed MyAhorros; PR #1 merged |
| Audit quick wins | `58be1db` | Empty-state actions, account validation, "step N of 5", paste/import recommended, share tags |
| Gains | `cbd7963`, `2f844ba` | Whole-word matching, best account wins, Gains on phones, payouts count (interest/dividends); `tests/gains.e2e.js` |
| Repo files | `517f37a`, `9f3e05e`, `56b1a99` | Claude files kept in repo; PROGRESS.md handoffs |
| 8.3 Mobile + tour pass | `7b4b8ad` | Checked 390/768 px (mouse + touch): landing, where-to-save, wizard, all 17 tour steps, all tabs, accounts table, add dialog, import review (fits). Fixed: 36-40 px touch targets on phones/`pointer:coarse` (Categories 176/183 under 36 px → 0); `--muted` light → `#5c6a65` (≥4.5:1 everywhere; web.css and privacy.html greys too); "You're set up" card on Overview only, no eyebrow/step list, Got it beside title (46% → 40% of 390 px screen), Transactions shows one-line "Go to Overview" bar; phone accounts table labels Change and Share; tour card at bottom for tall targets on phones; tabs fit 641-900 px; where-to-save panel traps Tab; Esc on wizard = Finish later (no longer reopens). Two new checks in `tests/landing-wizard.e2e.js`. SW 1.0.10 |

## In progress

Nothing uncommitted. Untracked: `.playwright-cli/` (Playwright logs, safe to delete). Main checkout: `.graphifyignore`, `graphify-out/`. Audit scripts used for 8.3 lived in the job tmp folder (not kept).

## Pending

- 8.4 Merge `worktree-quick-wins` into `main` (publishes via GitHub Pages). Needs the user's say-so; push the 2 local commits first. PR link: https://github.com/TarenShaw/myahorros/pull/new/worktree-quick-wins
- 8.2 Live-key verification (rotated Gemini key + real Claude key, large statement on Haiku 5.5 and Gemini).
- 8.5 Post-release: GoatCounter counts a visit, existing users update cleanly (SW `VERSION`, CSP hash).
- Remaining audit items, only if the user asks (see Known issues).
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
- 2026-10-10: Gains bugs found by tests may be fixed directly; Gains scenario kept as `tests/gains.e2e.js`.
- 2026-10-10: Gains matching: whole words ≥3 letters, best-matching account wins, tie counts for neither (shown as gain). Tip text updated en+es.
- 2026-10-10: Gains means what the account earned you: price change plus payouts (interest, dividends, capital gains, rent if its category is ticked as a return). Supersedes the 2026-10-10 Gains formula above where they differ. A dividend that stayed inside the account must not also be recorded as income (double count; stated in tooltip).
- 2026-10-10: Keep everything in the repo, including CLAUDE.md, PLAN.md, PROGRESS.md and `.claude/skills/`; delete nothing. Only `.playwright-cli/` logs stay untracked.
- 2026-10-10: User approved pushing `worktree-quick-wins` (done once). Merge into `main` still needs approval.
- 2026-10-10: Setup strip counts wizard steps (acc and figures = 1, transactions = 3, of 5); wizard step 3 recommends paste/import, not AI.
- 2026-10-10: 8.3 scope (user: "complete all open questions 1 and 2"): fix every audit layout item inside 8.3 (setup-done card, tap targets, contrast, phone accounts-table labels), and run keyboard/screen-reader checks on landing, where-to-save, wizard, tour and add/import dialogs, fixing real problems found.

## Known issues

- Rotate the Google/Gemini API key pasted into an earlier chat (treated as exposed; never used).
- Gemini rejection and the large-input failure (Haiku 5.5) not reproduced without a live key; mocks only (`js/web-ai.js`, `index.html` aiRun).
- Audit, not yet fixed:
  - Demo → tour end opens the setup wizard and silently sets `ybt.storage=browser`, skipping the where-to-save chooser (`js/web-shim.js`, `index.html`).
  - "No keyword matches this concept" jargon shown before typing; amount error not cleared on input; example `1.234,56` ignores the chosen number format (`index.html` add-transaction dialog).
  - Demo Overview shows an empty current month and a "no backup yet" warning (`backupNudge`, `index.html`).
  - Spanish "tu control" wording; category defaults are Spanish-personal ("Lottery", "Gym", "Tickets Comida", "Flex"); currency list lacks JPY/COP/ARS/BRL.
  - `og:image` is the square `icons/icon-512.png`; a 1200x630 image would preview better. No custom 404.
  - Footer credit reads "Claude Opus 5.5" (`index.html`, `js/web-shim.js`); check it is still wanted.
- Found in 8.3, logged only (minor):
  - Focus lands on BODY on the welcome screen after choosing where to save, and after Esc closes the auto-opened wizard (no opener to return to) (`index.html` `closeModal`, `viewWelcome`).
  - "You're set up" card is still ~40% of a 390 px screen; the rest is copy length (`gDoneText`, `gSafeWeb`).
  - Tour step 5 says "Hover Gains", meaningless on touch (`tour_nwAccounts`, en+es).
  - `guideCard` acc/val/tx branches are unreachable (those states use `guideStrip`); strings `gEyebrowDone`, `gStep_*`, `gSkipped`, `gDoneSr` now unused.
  - Landing is `role=dialog` without `aria-modal`; harmless because the app behind it is `display:none`.
  - `.info-btn` is drawn 17 px (hit area 41 px via `::after`); inline footer links are 14 px tall.
- Not tested: Firefox/Safari, offline/service-worker update, real Drive OAuth, a real screen reader (checks were DOM-level: names, labels, dialog roles, focus order).
- Gains: a deposit whose description doesn't name the account, or fits two accounts equally, counts for no account, so it shows as gain (`nwGains` in `index.html`). Fix would be 9.1.
- No default "Rent" income category; rent counts in a flat's Gains only if the user adds one and ticks it as a return.
- Gains blank for an account missing a figure in the previous month with figures, even if an earlier month has one.
- Switching language to Spanish auto-translates category names; expected, but worth knowing when testing.
- Port 8000 is often in use; tests run on 8123 via `START_URL=http://localhost:8123/`.
- Line endings: checkouts must stay LF or the CSP hash breaks locally (`.gitattributes`, `tools/update-csp-hash.js`).
- GitHub says the repo moved to `https://github.com/TarenShaw/myahorros.git`; update with `git remote set-url origin https://github.com/TarenShaw/myahorros.git`.
- Worktree sessions refuse compound shell commands that mix `cd`/heredocs with other steps; run them as separate commands.

## Commands

- Serve: `python -m http.server 8000` then open http://localhost:8000
- After editing index.html's inline script: `node tools/update-csp-hash.js`
- Tests: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`
- Browser tests (Playwright, Edge channel, server running): `NODE_PATH=<dir with playwright> node tests/drive-sync.e2e.js`, `tests/landing-wizard.e2e.js`, `tests/gains.e2e.js` (playwright module: `C:/Users/taren/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules`; other port via `START_URL`)
- Bump `VERSION` in `sw.js` and update its `FILES` list when shipped files change.
- playwright-cli: put multi-step code in a file and run `playwright-cli -s=<name> run-code --filename=<file>`; app internals like `nw()` are not global, so read the DOM.
