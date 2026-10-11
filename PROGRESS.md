# PROGRESS

Branch: main checkout on `overhaul`, identical to `origin/main` at `505e8c8` (live site, SW 1.0.28). Worktree `worktree-quick-wins` (`.claude/worktrees/quick-wins`, locked by another session) still has the OLD history: never force-push from it; recreate it from `main`. Last handoff: 2026-10-11.
Product name: **MyAhorros** (myahorros.app). Remote: `https://github.com/TarenShaw/myahorros.git` (public; Pages serves the repo root).
History rewritten 2026-10-11 to remove personal data: commit ids from before that date (in older notes) refer to the old history. Never put bank names, balances, people's names or local paths in committed files or commit messages; they go in `PRIVATE_NOTES.md` (git-ignored).

## Completed

| Phase | Commit | Summary |
|---|---|---|
| 0-9d5c54c (pre-rewrite ids) | up to `b51c798` | Phases 0-7, rename, release (PRs #1, #2), audit quick wins, Gains, 8.3, review council + fixes, real-data import fixes, CLS/layout/default tab Net worth, Days view, Financial health (`HEALTH`, About you), Fixed/Variable (stored Need/Want). Details in git log |
| Full audit (`AUDIT_PROMPT.md`) | (not committed) | 4 agents (new user, analyst, red team, low-literacy). `audit/AUDIT_REPORT.md` + agent reports, git-ignored, local only (holds real data). Real workbook reconciles 561/563 (2 = Need/Want vs Fixed/Variable definition) |
| P0 fixes | `f963ca1` | Hand-typed rows before the start month: automatic start moves back (`coverStart`), chosen start gets a toast offer. `fixedVarOnce` changes only categories still at the old default mark (`OLD_NEED`). e2e landing-wizard 3c/4c. SW 1.0.27 |
| Personal data out | `132faf0`, `505e8c8` + history rewrite | PROGRESS.md personal lines → `PRIVATE_NOTES.md`; `audit/` + `PRIVATE_NOTES.md` git-ignored. git filter-repo: PROGRESS.md removed from all old commits, real names/defaults in code+tests replaced, 2 messages scrubbed, CSP hash recomputed per commit; force-pushed main/overhaul/worktree-quick-wins |
| Audit top-10 fixes | `3830236` `07552d1` `44d8fc3` `dc3f700` `48600e2` `64a149e` `5331539` | Load checks (`finAmt`, `normSettings`, `normCats` filter, `readStored` keeps unreadable data as `bk:unreadable`); imports (`readBook` trims sheet range, review 200 rows + Show more, 20 MB cap `tooBig`); Pension income category + refund rule (`REFUND_RE`, `biggestSpend`); dialog head/foot capped 24vh/30vh, where-to-save card fits 375 px; GoatCounter = image from `js/web-boot.js`; tab takeover flushes first; ES/EN keywords (dia, consum, metro, paga extra, alquiler), category shown while typing, no accounts + rows → Overview. `tests/bad-data.e2e.js`, `tests/fixtures/dimension.xlsx`. SW 1.0.28 `2f6b474`. Pushed |

## In progress

Nothing uncommitted. Untracked: `.agents/`, `.codex/`, `AGENTS.md` (appeared 10:33, not created by Claude), `.claude/worktrees/`, `.graphifyignore`, `graphify-out/`.
Personal-data notes, local paths, real figures: `PRIVATE_NOTES.md` (git-ignored).

## Pending

- User: GitHub Support "Remove sensitive data" request (delete PRs #1/#2 refs, purge cached commits such as old `0b4a9f3`); PR #2's head still has an old PROGRESS.md. Text was given in chat.
- User: delete the backup `myahorros-before-rewrite.bundle` (session scratchpad, holds old data) when happy; recreate the quick-wins worktree from new `main`.
- Offered, not answered: audit fix #7, publish only shipped files via a GitHub Actions Pages workflow (user switches Pages source); until then PLAN.md, CLAUDE.md, tests/, .claude/ are served.
- 8.2 Live-key verification: AI import with a rotated Claude key on Haiku 5.5 (confirm low-effort fix), then Gemini.
- Remaining audit findings (Known issues), only as the user picks them.
- User checks the Gains link dialog on their live tracker (details in `PRIVATE_NOTES.md`).
- 8.5 Post-release checks; 9.x follow-ups only if asked. Offered, not answered: list unlinked interest/dividend rows in the "not linked" warning.

## Decisions

- 2026-10-10: Name **MyAhorros**; "Yearly Budget Tracker" only where it identifies stored data. Default AI Claude Haiku 5.5 (`js/models.js`); copy-paste column "API (your own key)", card keeps "ChatGPT".
- 2026-10-10: Overview order: This month, Month by month, By category, Share of income, Indicators; no chart legends. Answer buttons (2.6) apply locally.
- 2026-10-10: Wizard default for new trackers, after the tour; setup strip steps of 5; wizard step 3 recommends paste/import.
- 2026-10-10: Skills `handoff`/`start` in `.claude/skills/`; keep CLAUDE.md, PLAN.md, PROGRESS.md, `.claude/` in the repo (PROGRESS.md without personal data, see 2026-10-11).
- 2026-10-10: First-time-user audit: only the 5 quick wins approved then.
- 2026-10-10: Gains = price change plus payouts; a dividend kept inside the account is not also income. Matching: whole words ≥3 letters, best account wins, tie = neither; Statement words win; longest phrase wins. Gains bugs found by tests may be fixed directly.
- 2026-10-10: Net worth linking "super easy": dialog suggests, never saves without Link; "Not sure yet"; non-pension ties to the non-Retirement account.
- 2026-10-10: 8.3 scope: every audit layout item + keyboard/screen-reader checks.
- 2026-10-10: Push rule: **commit to `main`, ask the user for a yes before every push** (`git push origin overhaul:main`, fast-forward only, checks first).
- 2026-10-10: Review council: 5 read-only advisors + Chairman report; changes only after approval.
- 2026-10-11: "fix the critical first, disagreements go with the evidence": two-tab overwrite Critical; monolith Important; `sk-ant-` to OpenAI fixed; keep Drive's offline copy.
- 2026-10-11: Real bank data stays outside the repo (path in `PRIVATE_NOTES.md`); test logs to the scratchpad. Exception: the audit's `audit/` folder (git-ignored) holds real data by the user's audit prompt.
- 2026-10-11: Investment/pension files arrive unticked with a note; wizard keeps asking last month's balances.
- 2026-10-11: Cash-account interest goes in its Gains column; Statement words pick-list, typing allowed.
- 2026-10-11: No fake 0 € for new accounts: `account.from` ("It didn't exist before") makes the previous month 0.
- 2026-10-11: Every typed visit lands on the landing ("Open my tracker" when data saved here); reload goes straight to the tracker.
- 2026-10-11: All 8 desktop layout items approved; default tab Net worth; Yearly must not resize the page. Days view = whole year; Net worth top block stays above Over time.
- 2026-10-11: Financial health per user spec: exclusion list = whole words of account names, year of birth, "so far" for the current month; no sparkline.
- 2026-10-11: Need/Want → Fixed/Variable, re-sort default-named categories once; targets Fixed ≤50%, Variable ≤30%. Later: only categories still at the old default mark are re-sorted (the user's own marks equal the old defaults).
- 2026-10-11: User ran their `AUDIT_PROMPT.md` (4 agents). Injection tests (XSS, formula, prompt) not run: a safety filter stopped that red-team step; left for the user. User: "start with the fixes", then approved pushes of the P0 batch and the top-10 batch.
- 2026-10-11: Claude's calls in the fixes: refund only with card/refund wording or ≤ biggest past spend in that category, else income; Pension/Pensión income category; review 200 rows at a time; 20 MB file cap; GoatCounter counted by an image on myahorros.app only, skipped with Do Not Track/GPC; a tracker with rows and no accounts opens on Overview; Financial health defaults Pluxee, Edenred, Owed.
- 2026-10-11: User: "i dont want my bank info to ever be on the public repo, get rid of it" → history rewritten and force-pushed; tests use made-up names (Crowdlend, Ben).

## Known issues

- Rotate the Gemini API key pasted into an earlier chat and the Anthropic key pasted into a 2026-10-11 chat. Use a new key for 8.2.
- Audit open items (details, P-numbers in `audit/AUDIT_REPORT.md`): 7-day Safari warning jargon (#12); learned guess matches place words (#16); indicators ignore Uncategorised (#18); currency from browser language (#19); bad-date rows with heading words vanish (`parseRowsCore` HEADER_RE, #20); no month-over-month (#21); non-JSON AI answer re-sent 4× and called truncated (#22); API key unexplained, paid option preselected (#23); date "ayer"/Hoy-Ayer (#25); Seguimiento opens on current month, dimmed contrast (#26); large-text list wrapping (#27); help hidden (#28); 4.7 MB first load on 3G (#29); Drive "Recomendado" needs Google login (#30); storage-full message never shown (shim `save()` maps all to unavailable, #33); Back right after an edit loses it (#35); clearing site data → dead IndexedDB (#36); axe label-in-name (#37); P3 #38-59.
- Refund rule trade-off: on a new tracker with no history a small positive shop row with no refund wording lands in Income.
- Not verified: opening-tab test can't be shown failing on old code; dialog fix tested at 200% browser zoom, not real iOS text scaling.
- Council, not fixed: folder saves wait ≥4 s and while dialogs are open; tour doesn't pause sync (`endTour`); Drive token in memory, no `login_hint`, `keepCopy` failures swallowed, 403 not retried; SW new HTML with old JS, `addAll` without `cache:'reload'`; page normalisers drop unknown fields (shim keeps them); account ids unescaped (`normNw`); SheetJS 0.18.5 CVEs (upgrade to 0.20.3), pdf.js 3.11.174 (mitigated); `window.__ybtWeb` exposes Drive token; UX/AI/maintainability items as before (blocked pop-up message, silent Sync now, Undo toasts under the strip, scanned PDF >8 pages, OpenAI `-pro` pick, 3 i18n/dialog systems).
- Not covered by automated tests: start-up failure panel, unreadable Drive file path, import review notes UI. Not tested: real Safari, offline/SW update, real Drive OAuth, real screen reader, folder mode.
- Earlier items: demo → wizard skips where-to-save; demo shows "no backup yet"; few currencies; square `og:image`; no 404; tour step 5 "Hover Gains"; `.tile-label` overflow at 390 px; Emergency fund 1 decimal; Windows app still shows Need/Want.
- Gains: unmatched/tied rows show as gain (`nwGains`); old Windows builds drop `words`/`untracked`; blank Gains if previous month lacks a figure and no `from`; unmatched interest/dividend rows not listed.
- Local `vendor/*.js` are CRLF in this checkout (prod LF; harmless for the CSP hash).
- Auto mode once blocked `git push` as "Production Deploy"; user can allow `Bash(git push origin overhaul:main)` via `/permissions`.

## Commands

- Serve: `python -m http.server 8000` (8000 often busy: use 8080 or 8123 and `START_URL=http://localhost:8080/`)
- After editing index.html's inline script: `node tools/update-csp-hash.js`
- Tests: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`, `node tests/merge-smoke.js`, `node tests/import-smoke.js`
- Browser tests (Playwright, Edge, server running): `NODE_PATH=$APPDATA/npm/node_modules/@playwright/cli/node_modules node tests/<name>.e2e.js` for `drive-sync`, `landing-wizard`, `gains`, `tabs-restore`, `bad-data`
- Bump `VERSION` in `sw.js` (now 1.0.28) and `config.js` `version` to match; update `FILES` when shipped files change.
- `gh` installed, logged in as TarenShaw; call as `"C:\Program Files\GitHub CLI\gh.exe"` until a restart. `git filter-repo` installed (pip).
- playwright-cli: run from the scratchpad so `.playwright-cli/` logs stay out of the repo; debug inline functions by routing the page, stripping the CSP `<meta>` and injecting `window.__dbg` after `(function(){`.
