# PLAN: MyAhorros update

Source: the user's original brief (phases 0-7) plus approved follow-ups. Refreshed 2026-10-12 against `main` at `5699962` (previous published baseline 1.0.56; release 1.0.57 approved for publication). Details are in PROGRESS.md. Older commit references may predate the 2026-10-11 history rewrite.
Ground rules: keep all existing features working; match existing style and UI language (en + es for every new string); small commits per phase; no secrets in the repo; commit to `main`, but ask the user for a yes before each push.

## Done

| # | Section | Status | Commit |
|---|---|---|---|
| 0 | Summary, questions, order of work | Done | (chat) |
| 1.1 | Gemini key recognised, clear message | Done (cause unconfirmed, see 8.2) | `c814aff` |
| 1.2 | Large inputs: chunking, retries, progress | Done (mock-tested) | `c814aff` |
| 1.3 | Error box with copy details | Done | `c814aff` |
| 1.4 | Versioned, conflict-aware sync; no unmount during AI request | Done | `d5b0dbe` |
| 1.5 | Responses cut off | Done as truncated-output handling | `c814aff` |
| 2.1 | Model default (Haiku 5.5) and recommendations | Done | `bdc77ef` |
| 2.2 | Provider badges | Done | `bdc77ef` |
| 2.3 | First-use provider choice | Done | `bdc77ef` |
| 2.4 | Change AI button | Done | `bdc77ef` |
| 2.5 | Gemini file uploads | Done (GIF converted; unverified live) | `c814aff` |
| 2.6 | Clickable answer options | Done (applied locally) | `bdc77ef` |
| 2.7 | Template download button and link | Done | `bdc77ef` |
| 3.1-3.9 | Layout, legend, static buttons, icons, space, action buttons, Gains | Done at 1280 px | `de9b16e` |
| 4.1 | Landing page | Done | `f35a45e` |
| 4.2 | Setup wizard | Done | `f35a45e` |
| 4.3 | Tour review | Done (text level) | `f35a45e` |
| 5 | GoatCounter and privacy policy | Done | `6f3ff66`, `f9b2106` |
| 6 | Name proposals; MyAhorros chosen and applied | Done | `b6b7a96`, `d4462cc` |
| 7 | Drive stability (retries, status, no silent overwrite) | Done | `d5b0dbe` |

## Completed review, release and follow-ups

| Section | Current status | Evidence |
|---|---|---|
| 8.1 User review | Completed; requested fixes and later user audit implemented | `afa80f0`, `9dbe239`, `226bfe0`, `6b23403` |
| 8.3 Mobile and tour pass | Completed in browser checks; real-device coverage remains limited | PROGRESS.md, LAYOUT-CHANGES.md, QA report |
| 8.4 Release | Published to `main`; current workspace tracks `origin/main` | `5699962`, release 1.0.56 |
| Layout and financial follow-ups | Layout consistency, Gains, forecasts, import review and reconciliation implemented | PROGRESS.md completed history |
| AI audit phases 1–3 | Transactions, Net worth and Settings implemented; period selection, review/Undo, answer choices and remembered answers | `7522b87`, `3e8ce91`, `3625567`, `fa3e76b` |
| Drive and SW follow-ups | Hour-long access retention and cache-bypass installation implemented | `8598ae6`, `71009cc` |
| Onboarding and monthly routine | Year-to-date account statements, Cash-only transaction import, monthly check-in implemented | `b4007e5`, `5fbf342`, `d76ee7a`, `1d9e7bf` |
| Navigation and landing follow-ups | Five tabs, Categories in Settings, updated landing and Overview selection behaviour | `bbf9eed`, `1a66332`, `5699962` |

## Newcomer/AI audit: all 17 recommendations implemented in release 1.0.57

| Recommendations | Implementation |
|---|---|
| 1–3 | Nested AI focus, complete audit Undo, accurate mode-specific privacy; remembered answers can be edited/forgotten |
| 4–5 | Quick start with last month or historical setup; optional tour; practical storage choices; optional income/balances |
| 6–8 | Task-first AI connection choices; file-first local reading with AI fallback; guided copy/paste and answer repair |
| 9–10 | Needs-attention review; deliberate duplicate deletions; per-source account mapping and confirmed coverage/no activity |
| 11, 14–15 | Optional source/account/import batch, import history and export; bulk category changes with Undo; date/amount/account/source filters and saved views; readable rule matching with previews |
| 12–13 | Compact phone header/actions/filters, one-month view; summary-first dashboards with expandable analysis |
| 16–17 | Clearer bilingual landing and fresh product shots; month/year comparisons with transaction links; hypothetical savings scenario |

No dependencies or backend added. Saved data format remains 1; new metadata is optional. Existing trackers are supported; the Windows host has not been tested with optional provenance fields. User approved committing and pushing release 1.0.57 on 2026-10-12. Includes extra spacing below the month/year switch and above comparison buttons, plus green/red comparison changes with reversed expense colors and neutral zero changes.

## Pending verification

8.2 **Live-key verification:** test large statements and truncated answers with rotated Claude/Gemini keys; verify all three AI audits, period selection, answers, fixes and Undo. Earlier notes report a successful live Claude import, but not this complete coverage.
8.5 **Post-release checks:** real Drive OAuth/renewal and conflicts; folder storage; offline use and service-worker updates; analytics on the live site; existing-data compatibility. Real Safari, phones, screen-reader and Windows-app coverage remains incomplete.

Local validation: nine smoke suites and eleven browser suites exercised during implementation, including the new experience and newcomer suites; final CSP, precache and version checks. Live-provider and hardware checks below remain separate.

## Earlier possible follow-ups (only if selected; separate from the implemented 17 recommendations)

- Publish only shipped assets through a Pages workflow; review privacy owner/contact information; add a friendly 404 and optional robots/sitemap; improve mobile loading; glossary; import-discard Escape behaviour; QA simplifications. Monthly check-in is already done.
- Recheck historical import, Gains, reconciliation, storage and accessibility findings in PROGRESS.md before fixing them; do not assume the older audit list still reproduces.
- Finish the sensitive-history cleanup noted in PROGRESS.md; reconcile the old quick-wins worktree before removing it. Never force-push its old history.
- Original 9.1: match deposits by amount when the description lacks an account name. 9.2: send answered questions back to AI for a second pass (local answers/fixes and memory are implemented; a second AI pass is not established). 9.3: further handoff integration only if useful; local start/handoff skills already exist.

## Testing rules

- Before each commit: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`, `node tests/experience-smoke.js`, `node tools/update-csp-hash.js`.
- For sync, landing or wizard changes: run the browser tests in `tests/` (Playwright, Edge, server on port 8000).
- Any edit to the inline script in `index.html` needs the CSP hash refreshed; any shipped-file change needs `sw.js` `FILES` and `VERSION` updated.
