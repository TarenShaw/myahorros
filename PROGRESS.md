# PROGRESS

Branch: main checkout on `overhaul`, identical to `origin/main` at `9d5c54c` (live site, SW 1.0.26). Worktree `worktree-quick-wins` (`.claude/worktrees/quick-wins`) also pushes to `main`. Last handoff: 2026-10-11.
Product name: **MyAhorros** (myahorros.app). Remote: `https://github.com/TarenShaw/myahorros.git`.
History rewritten 2026-10-11 to remove personal data (PROGRESS.md was in every commit): commit ids in this file from before that date refer to the old history. Never put bank names, balances, people's names or local paths in committed files; they go in `PRIVATE_NOTES.md` (git-ignored).

## Completed

| Phase | Commit | Summary |
|---|---|---|
| 0-7, rename, release | `6f3ff66`…`baf2f60`, `afdd2dd` | GoatCounter/privacy; AI errors, chunking, retries, `js/models.js`; sync safety; Haiku 5.5 default, badges; layout; landing, wizard, tour; MyAhorros; PRs #1, #2 merged (8.4) |
| Audit quick wins, Gains, 8.3 | `58be1db`, `cbd7963`…`c7843fa`, `7b4b8ad` | Empty states, account validation; Gains (whole words, payouts, Statement words, link dialog, `tests/gains.e2e.js`); 390/768 px + all 17 tour steps |
| Review council | `f64eeb4` | 5 read-only advisors in `.claude/agents/` (security, correctness, maintainability, user, skeptic); they load only after a session restart |
| Council fixes, merge main | `f64eeb4`, `7ead822`, `a0d8d08` | One tab at a time (Web Lock + BroadcastChannel); browser-mode backup restore; safe Start fresh; Safari 7-day warning; `sk-ant-` key check; merged 18 `main` commits; Merge both by id; failed folder/Drive start-up asks Try again / Use this browser; unreadable Drive file kept as backup. `tests/tabs-restore.e2e.js`, `tests/merge-smoke.js` |
| Real-data audit + import fixes | `4a2de9c` | New-user walk-through (playwright-cli, browser storage) with the user's real files, then fixes: spaces/≥1e9 not amounts; HTML `.xls` decoded as text (dates, decimals, two-cell heading); IBKR sectioned CSV; Splitwise uses your column (picker); fee columns; Indexa pension description; investment/pension files, future dates and re-exports arrive unticked; transfers (both sides in one file, or other half already saved); card refunds stay Expenses; keywords match word starts only; ML guess must share the payee word; Spanish starter keywords + income "Alquileres cobrados"/"Rent received"; start month stays auto when the earlier-month box is only opened, import/Settings offer to move it; Claude 5 `effort:'low'`, 32k output, re-split progress text; footer i18n. `tests/import-smoke.js`. SW 1.0.16. Pushed |
| Layout shift … default tab | `9d874df`, `4e72f3b`, `4a80535`, `7050868`, `e3a161b`, `424396f` | CLS fix (loader while `S.tourPending`, ≤0.034); Cash accounts' Gains = interest rows, statement-word pick-list; `account.from` makes the month before 0 (`nwBefore`); landing on every typed visit ("Open my tracker" when data saved here, reload skips it); ≥1200 px desktop layout block; default tab Net worth, no `.app.wide`. `tests/gains.e2e.js` 4d/4e, `tests/landing-wizard.e2e.js` 4b. Pushed |
| Days view | `2d7f225`, `aa24559` | Overview Month by month: Months/Days switch (`S.ui.mm.days`, `mmDaily`, `drawColumns` `sparse` labels), whole year one bar per day, "All" shows Expenses with a note. Net worth order change from `2d7f225` reverted in `aa24559` (hero above Over time again). SW 1.0.24. Pushed |
| Financial health | `7010117` | Net worth: section below Over time, 5 cards (Emergency fund, Financial independence, Savings rate, Passive income coverage, Net worth for your age), as of the selected month. `HEALTH` defaults (overridable via `settings.health`), `healthMonths` (up to 12 finished months with transactions, via `trackerSaved`), `healthCard`; Settings "About you" (`birthYear`, `salary`); `.pill.warn`. Checked on the user's real data (figures in `PRIVATE_NOTES.md`). SW 1.0.25. Pushed |
| Fixed / Variable | `9d5c54c` | Categories show Fixed/Variable instead of Need/Want; stored values stay `Need`/`Want` (Need = Fixed) for the Windows app. Fixed defaults: Rent, Utilities, Subscriptions, Phone, Insurance, Education, Taxes, Gym (ES equivalents). Targets Fixed ≤50%, Variable ≤30%. `fixedVarOnce()` re-sorts default-named categories once per tracker (`settings.fixedVar`), moves 30/20 targets to 50/30; new trackers start flagged. AI prompt sends `(fixed)`/`(variable)`. SW 1.0.26. Pushed |

## In progress

Nothing uncommitted. Untracked: `.claude/worktrees/`, `.graphifyignore`, `graphify-out/` (user not asked to commit them).
User's edited backup and other personal-data notes: `PRIVATE_NOTES.md` (git-ignored, local only; PROGRESS.md is public on myahorros.app).

## Pending

- 8.2 Live-key verification: rerun the AI import ("Crearlo con mis extractos", all real files) with a rotated Claude key on Haiku 5.5 to confirm the low-effort fix (before: every part hit `max_tokens` from thinking, ~70 s per try, 15 parts ≈ 1 h). Then Gemini.
- Remaining real-data audit items and council findings (Known issues), only as the user picks them.
- User checks the Gains link dialog on their live tracker and reports wrong suggestions (details in `PRIVATE_NOTES.md`).
- 8.5 Post-release: GoatCounter counts a visit; existing users update cleanly (SW `VERSION`, CSP hash).
- 9.x follow-ups from PLAN.md, only if asked.
- Offered, not answered: list interest/dividend rows that match no account in the "not linked" warning, so a Markets vs Gains gap always has a visible fix.

## Decisions

- 2026-10-10: Name is **MyAhorros**. Keep "Yearly Budget Tracker" only where it identifies stored data (Drive/Documents folder, `app` field, Windows-app folder text).
- 2026-10-10: Default AI model Claude Haiku 5.5; names, guidance, limits in `js/models.js`. Copy-paste column "API (your own key)"; card keeps "ChatGPT".
- 2026-10-10: Overview order: This month, Month by month, By category, Share of income, Indicators. No chart legends.
- 2026-10-10: Answer buttons (2.6) apply locally; not sent back to the AI.
- 2026-10-10: Wizard is default for new trackers, after the tour; returning users skip the landing page (superseded 2026-10-11, see below). Setup strip counts steps of 5; wizard step 3 recommends paste/import.
- 2026-10-10: Project skills `handoff` and `start` in `.claude/skills/`. Keep everything in the repo (CLAUDE.md, PLAN.md, PROGRESS.md, `.claude/`); only `.playwright-cli/` logs untracked.
- 2026-10-10: First-time-user audit: only the 5 quick wins approved; other audit findings are not approved work.
- 2026-10-10: Gains = what the account earned: price change plus payouts (interest, dividends, capital gains, rent if ticked as a return). Supersedes the earlier "change minus money put in" formula. A dividend kept inside the account must not also be income.
- 2026-10-10: Gains matching: whole words ≥3 letters, best account wins, tie = neither. Per-account "Statement words" win over the name rule; longest phrase wins. Gains bugs found by tests may be fixed directly.
- 2026-10-10: Net worth linking must be "super easy"; link dialog suggests but never saves without Link; unclear rows show "Not sure yet"; non-pension ties go to the non-Retirement account.
- 2026-10-10: 8.3 scope: fix every audit layout item inside 8.3 and run keyboard/screen-reader checks on landing, where-to-save, wizard, tour, add/import dialogs.
- 2026-10-10: Push rule history: "do not push without say-so" → "always commit and push to main" → **current: commit to `main`, but ask the user for a yes before every push** (`git push origin overhaul:main` or `HEAD:main`, fast-forward only, checks first; `main` is the live site).
- 2026-10-10: Review council: user asked for 5 read-only advisors and a Chairman report; changes only after the user approves.
- 2026-10-11: User: "fix the critical first, and for the disagreements go with the evidence". Evidence verdicts: two-tab overwrite is Critical; `index.html` monolith is Important, not Critical; `sk-ant-` to OpenAI is a key leak (Minor, fixed); keep Drive's offline local copy (add "remove from this device" later instead).
- 2026-10-11: User approved the three Important sync fixes ("go") and both pushes to `main`.
- 2026-10-11: Real bank data stays outside the repo (local folder, path in `PRIVATE_NOTES.md`); never copy it into the repo or commit it. Test logs go to the session scratchpad.
- 2026-10-11: Audit "as a totally new user" through playwright-cli. AI import skipped for now ("we'll do this later"). Then "fix everything you can"; push of `4a2de9c` to `main` approved.
- 2026-10-11: Investment/pension account files are not spending: their rows arrive unticked with a note (not blocked). The wizard keeps asking for last month's balances (unchanged).
- 2026-10-11: Interest paid by a Cash account belongs in its Gains column (only the interest, not the balance change). Statement words get a pick-list from the user's statements; typing still allowed.
- 2026-10-11: User rejected fake 0 € figures for new accounts and wanted app logic instead. Chosen: the existing "It didn't exist before" answer (`account.from`) makes the previous month 0. No automatic detection (the app can't tell new money from an untracked account).
- 2026-10-11: Every typed visit to myahorros.app lands on the landing page; with data saved here it offers "Open my tracker", new visitors keep See a demo / Get started. A reload goes straight back to the tracker (Claude's call, user not asked to change it).
- 2026-10-11: Desktop looked too small: user approved all 8 layout items ("implement the layout fixes, all of them"). Default tab is Net worth (setup-guide finish still opens Overview; offered, not answered). Yearly tracking must not resize the page.
- 2026-10-11: Days view covers the whole year (user's pick over one month or last 30/90 days). User then asked to put the Net worth page back as it was: the top block stays above Over time.
- 2026-10-11: User approved pushes of `9d874df`, `4e72f3b`, `4a80535`, `7050868`, `e3a161b`, `424396f`, `2d7f225`, `1e9ba91`, `aa24559`, `7010117`, `9d5c54c`. Reading the user's real files (locations in `PRIVATE_NOTES.md`) to answer their questions is fine; outputs stay in the scratchpad and are deleted after.
- 2026-10-11: Financial health spec from the user; on "go" Claude's defaults: exclusion list matched as whole words of account names (defaults: meal-card brands and "Owed"), year of birth instead of age, Claude's Spanish, current month's own rate marked "so far". Sparkline skipped (spec allowed); Passive coverage has no blue pill below 100%.
- 2026-10-11: Need/Want → Fixed/Variable: re-sort default-named categories once; targets Fixed ≤50%, Variable ≤30%.

## Known issues

- Rotate the Google/Gemini API key pasted into an earlier chat, and the Anthropic API key pasted into the 2026-10-11 chat (also in that session's playwright-cli logs in the scratchpad). Use a new key for 8.2.
- Real-data audit, not fixed: own-name transfers only caught when the other half is already saved (the app doesn't know the user's name); a cross-file transfer can pair a shop payment with a same-amount transfer within 3 days (a small card payment; arrives unticked with a note); ~68% of spending still uncategorized (Bizum to people, small shops); a meal-voucher top-up not mapped to Tickets comida; wizard asks for September balances though history starts in January; investment detection is heuristic (`index.html` INV_HDR, INV_CONCEPT, INV_SECTIONS).
- Gemini rejection and large-input failure tested with mocks only (`js/web-ai.js`, `index.html` aiRun).
- Council reviewed `overhaul` before `main`'s 18 commits were merged; re-check each finding against current code before fixing.
- Council, Important, not fixed:
  - Folder saves always wait ≥4 s and wait while any dialog is open; no unload warning meanwhile (`js/web-shim.js` flushFolder/deferIfBusy, `index.html` YBT_BUSY).
  - Tour doesn't pause sync; `endTour` restores pre-tour data over synced data (`index.html` YBT_BUSY, endTour).
  - Drive: token in memory only, "Connect" every visit/hour; different Google account silently becomes the target (no `login_hint`); `keepCopy` failures swallowed before overwrite; 403 rate limits not retried (`js/web-shim.js`).
  - SW: new HTML runs with old cached JS after a deploy; `addAll` may precache stale files (no `cache:'reload'`) (`sw.js`).
  - `normalise`/`normRow` drop unknown fields (Windows-app forward compat) (`js/web-shim.js:219`, `index.html` normRow).
  - Security: GoatCounter script without SRI can read AI keys ("Remember" on by default), Drive token via `window.__ybtWeb`, all data; README's "couldn't send figures anywhere else" overstated. Account ids from imported files go unescaped into HTML (`index.html` normNw + sinks). Vendored SheetJS 0.18.5 has CVE-2023-30533/CVE-2024-22363.
  - UX: blocked pop-up reported as connection error; Sync now/bar button fail silently; demo silently creates a browser tracker; Undo toasts hidden under the bottom strip; form errors not announced; some AI errors give no next step.
  - AI: scanned PDF >8 pages not split, >20 fails (`index.html` aiJobs); OpenAI default pick may be an expensive `-pro` model (`js/web-ai.js` pick).
  - Maintainability: data format read/written in 3 places, no format test; duplicated conflict code, 3 i18n and 3 dialog systems; drive-sync test's fake folder is named `MyAhorros`.
- Not covered by automated tests: start-up failure panel, unreadable Drive file path, the import review UI (Splitwise picker, invest/future/same-account notes). Safari 7-day warning has no reminder change (`index.html` backupNudge).
- Earlier audit items not fixed: demo → wizard skips where-to-save; add-dialog jargon/number-format example; demo shows "no backup yet"; few currencies; square `og:image`; no 404; footer credit "Claude Opus 5.5".
- 8.3 minor: focus on BODY after choosing where to save/after Esc on auto wizard; setup card ~40% of 390 px; tour step 5 says "Hover Gains"; unreachable `guideCard` branches; `.info-btn` drawn 17 px.
- Gains: unmatched or tied rows show as gain (`nwGains`); one crowdlending account's Mar/Apr timing; old Windows builds drop `words`/`untracked`; one account has no Aug figure; blank Gains if previous month lacks a figure and the account has no `from`; unmatched interest/dividend rows count in Markets but not Gains, and nothing lists them.
- User's data, Markets vs Gains: unexplained gaps in Mar/Apr, Jun and Sep (details in `PRIVATE_NOTES.md`). Share moves between brokers have no money rows.
- Layout: leaving the tour jumps the page (follows a click, not counted). At 1280 px "Not spent or invested" wraps, so its figure sits one line lower; at 390 px that label overflows its tile (`.tile-label`, pre-existing). A chosen folder always counts as "has data" on the landing (can't read it before permission).
- Financial health: Emergency fund shows 1 decimal, so 2,96 months reads "3,0" with a Low pill; `settings.health` overrides have no screen; age is year-based (`birthYear`). Days view: summary line still gives the monthly average/trend; month labels tight at 390 px. Windows app still shows Need/Want for the same data.
- Auto mode once blocked `git push` and then Bash calls as "Production Deploy"; the push worked after the user's explicit "push". Fix is the user's to make (Claude editing permissions is blocked as Self-Modification): allow `Bash(git push origin overhaul:main)` and `Bash(git push origin HEAD:main)` via `/permissions` or `.claude/settings.local.json`. The ask-before-push rule still applies.
- Not tested: Firefox/Safari, offline/SW update, real Drive OAuth, real screen reader.
- Port 8000 often in use; tests accept `START_URL=http://localhost:8123/`. Checkouts must stay LF (CSP hash). The Edit tool writes `\uFEFF` as a literal BOM character (harmless; line 5097 already had one).

## Commands

- Serve: `python -m http.server 8000` then open http://localhost:8000
- After editing index.html's inline script: `node tools/update-csp-hash.js`
- Tests: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`, `node tests/merge-smoke.js`, `node tests/import-smoke.js`
- Browser tests (Playwright, Edge, server running): `NODE_PATH=$APPDATA/npm/node_modules/@playwright/cli/node_modules node tests/<name>.e2e.js` for `drive-sync`, `landing-wizard`, `gains`, `tabs-restore`
- Bump `VERSION` in `sw.js` (now 1.0.26) and `config.js` `version` to match; update `FILES` when shipped files change.
- `gh` 2.102.0 installed, logged in as TarenShaw; until a restart call it as `"C:\Program Files\GitHub CLI\gh.exe"`.
- playwright-cli: run it from the scratchpad so `.playwright-cli/` logs (may hold real data) stay out of the repo; multi-step code in a file, `playwright-cli -s=<name> run-code --filename=<file>`; load user data via Settings → `[data-action=local-open]` (set `window.showOpenFilePicker=undefined` first), then `playwright-cli upload <file>`. To call inline functions while debugging: `page.route` the page, strip the CSP `<meta>`, inject `window.__dbg=()=>({nwGains,nwSplit,...})` after `(function(){`. CLS: `addInitScript` a `layout-shift` PerformanceObserver.
