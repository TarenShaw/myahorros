# Transactions, import review and net worth audit

13 October 2026. Caveman crew audit of the current working tree of MyAhorros.

All data is fictional. Application code and existing changes were preserved. Tests used isolated Edge browser profiles and localhost:8000. Fixtures, scripts, screenshots and detailed findings are retained beside this report.

## Assessment

Ordinary transaction entry, signs, refunds and the existing gain/reconciliation scenarios pass. Complex workflows expose accounting-model limitations and import-review validation problems. A correct total net worth does not establish that account-level gains or the explanation of change are correct.

## Priority findings

| Order | Severity | Change needed |
|---|---|---|
| 1 | P1 | Scope duplicate matching to accounts; preserve legitimate cross-account charges. |
| 2 | P1 | Stop whole-bank-file exclusion based on investment keywords. |
| 3 | P1 | Block invalid reviewed amounts at commit. |
| 4 | P1 | Preserve Splitwise currency and require explicit handling. |
| 5 | P1 | Represent internal investment transfers with source and destination. |
| 6 | P2 | Size the transaction warning icon so the ledger remains reachable. |
| 7 | P2 | Recompute transfer decisions after review edits. |
| 8 | P2 | Make contribution coverage and retained-return treatment explicit. |
| 9 | P2 | Guard against importing contribution metadata as asset balances. |
| 10 | P2 | Ask for date order when an import is ambiguous. |

Each reproduction below includes its severity, expected behavior, evidence and recommended change. These are audit findings, not implemented fixes.

### 1. Broker-to-broker transfers need two account legs — P1

A synthetic €500 transfer leaves total wealth and economic gains unchanged. Opening portfolios are €1,000 each; closing values are €500 and €1,500. One Investments row naming both brokers produces account gains of −€500/+€500. Using the offered account-linking correction to select the destination makes total gains −€500 and unmatched change +€500. The review action cannot represent both source and destination.

Recommendation: introduce an explicit transfer operation with source and destination account IDs. Keep bank-to-investment contributions distinct. Each internal transfer should affect both account contribution calculations while remaining neutral in total spending, income and wealth.

Source: index.html:4035–4036, 4167. Evidence: gains/REPORT.md, gains/broker-transfer.json, gains/broker-transfer-linked.png, gains/results.json.

### 2. Invalid amounts in import review do not prevent submission — P1

Editing a reviewed amount from −€32.45 to `nonsense` marks the field invalid, but Add and the subsequent confirmation can still save −€32.45. The visible correction and the committed value disagree.

Recommendation: validate every included row immediately before both submission stages; block invalid, blank and zero amounts with a persistent row error and focus the first invalid field. Excluded invalid rows should not block valid included rows.

Source: index.html:6174–6178, 6990–6991. Evidence: transactions/results.json and transactions/audit.js.

### 3. Contribution coverage uses an all-or-nothing fallback — P2

A July–September portfolio rise of €500 comprises a reviewed August contribution of €300 and a linked September deposit of €200. Because September lacks a statement contribution override, the calculation discards August’s reviewed override and reports €300 of gains instead of €0.

This matches the documented current policy; it is a harmful design limitation rather than a regression against that policy. Missing tracker months can also hide the detailed change breakdown.

Recommendation: choose statement contributions or linked transaction flows separately for each month, with explicit coverage and provenance. At minimum, name the reviewed values ignored by the fallback and mark the result as uncertain.

Source: index.html:4041–4042, 4105. Evidence: gains/partial-contributions.json/png and gains/results.json.

### 4. Retained and paid-out returns need different treatment — P2

A broker grows from €1,000 to €1,100 solely through a retained €100 dividend. Recording that dividend as Income/Dividends produces €200 of gains and −€100 unmatched change. The current formula assumes linked return rows were paid outside the portfolio. Existing help warns about retained dividends, but Add transaction has no field to express the distinction.

Recommendation: ask whether a return stayed in the account or was paid elsewhere, and show that choice during manual entry and import review. Retained returns belong in balance growth, while externally paid returns can be added to gain calculations.

Source: index.html:2201, 4045. Evidence: gains/retained-dividend.json/png. Total net worth remains correct in this scenario.

### 5. Uncategorised-transaction warning pushes the ledger off-screen — P2

The real Transactions screen renders its warning SVG at 1,169 × 1,169 pixels on a 1,280 × 900 viewport. The notice is 1,232.5 pixels tall and ends at vertical position 1,921, forcing users to scroll past a giant icon before reaching transactions. This occurs outside the import dialog too.

Recommendation: size the warning icon explicitly and constrain notice layout. Add a browser assertion for notice height and ledger visibility, since horizontal overflow tests passed despite this defect.

Source: index.html:5583, 2832, 354. Evidence: transactions/transactions-attention-desktop.png and transactions/REPORT.md.

### 6. Balance-import metadata defaults to a new asset — P2

An actual CSV upload with broker balance €1,250, broker net contributions €200, pension €500 and cash €1,000 creates an additional account called “Alpha Broker net contributions”. Applying the review gives net worth €2,950 instead of €2,750; the contribution override remains empty.

The advertised balance-import format requires one column per account; it does not promise contribution-column support. This is a schema and review-default hazard, not failure of advertised contribution import.

Recommendation: recognize contribution/return/fee/percentage metadata headings, offer a contribution mapping or default them to skipped, and make every proposed new account require explicit confirmation. Preview the total net worth before applying.

Source: index.html:4644 onward. Evidence: gains/balances-with-contributions.csv, gains/nw-csv-results.json, gains/csv-contributions-as-account.png. Standard balances-only CSV overwrite, new account, gains calculation and reload passed.

### 7. Duplicate matching ignores the selected account — P1

Saving a NETFLIX charge of −€15 from cash account A, then uploading a separate account B statement containing the same merchant/date/amount, marks B’s legitimate charge as an exact duplicate and excludes it. Account provenance is recorded on imported rows but is not used in duplicate matching.

Recommendation: compare duplicates within the known source account. For unknown/legacy account metadata, show a possible duplicate requiring review rather than silently excluding a cross-account match.

Source: index.html:6256–6262. Evidence: import/cross-account-a.csv, import/cross-account-b.csv, import/cross-account-duplicate.png, import/evidence.json.

### 8. Investment-file heuristic excludes ordinary bank transactions — P1

A four-row bank CSV containing one `APORTACION INDEXA` row crosses the 25% investment-keyword threshold. All four rows, including salary, groceries and electricity, arrive excluded with the investment-file reason.

Recommendation: use explicit account/file context and recognised investment-statement structure to identify broker files. A keyword proportion should trigger a question, not exclude every row. Preview exclusions by reason and require confirmation of whole-file exclusion.

Source: index.html:6276–6283. Evidence: import/mixed-investment-words.csv, import/mixed-investment-excluded.png, import/evidence.json.

### 9. Review edits leave transfer decisions stale — P2

A detected −€500/+€500 pair is excluded as an internal transfer. Editing the outgoing amount to −€600 leaves both rows flagged and excluded as a matching transfer even though the amounts no longer match.

Recommendation: rerun transfer, balance, sign and other derived checks after amount/description/type changes. Preserve explicit user choices separately from automatic exclusion decisions.

Source: index.html:6173–6188. Evidence: import/paired-transfers.csv, import/stale-transfer-review.png, import/evidence.json.

### 10. Splitwise import drops currency — P1

The Splitwise adapter rebuilds rows with Date, Description and Amount but discards the source Currency column. A USD amount enters a EUR tracker without the foreign-currency warning that normal bank imports show. This audit establishes missing currency provenance/warning, not a particular exchange-rate conversion.

Recommendation: preserve currency per row, flag non-base-currency amounts, and require an explicit base-currency amount or conversion before saving. Do not treat a foreign nominal amount as the base currency.

Source: index.html:6101–6104. Evidence: import/splitwise-usd.csv and import/evidence.json.

### 11. Ambiguous dates are presented as certain — P2

A US-format fixture has September 1/2/3 written `09/01`, `09/02`, `09/03`. The importer interprets these as January/February/March 9. Either date convention is plausible from those strings, but review gives no ambiguity warning or date-order override, and dates are not editable there. Contributions can therefore fall into the wrong gain-comparison month.

Recommendation: offer day/month versus month/day selection with examples before review, remember it per source when confirmed, and allow row-level date repair. Show ISO dates or a spelled-out month in the preview.

Source: index.html:1348, 5924. Evidence: import/ambiguous-us-dates.csv and import/evidence.json.

## UI improvements and proposed changes

Fix the P1 import integrity and two-sided transfer problems first. Then fix warning layout and uncertainty/coverage handling. Broader review controls follow once committing reviewed data is reliable. P1 means a normal workflow can silently omit legitimate money or misstate accounting; P2 means a supported workflow is misleading or a documented limitation needs stronger handling; P3 denotes convenience/polish.

- Give manual Add/Edit an optional account picker and display import source/account provenance. Imported account and batch metadata already survive editing; manual rows cannot set it through the editor.
- Allow date correction inside import review. Dates currently render as text, even though descriptions, amounts, types and categories are editable.
- Add review search, sorting, select-visible and bulk category/type actions for large files. Reuse conventions from the Transactions list.
- Explain an empty Needs attention view when all rows are excluded as duplicates or transfers; offer Show all rows directly.
- Collapse mobile filters when inactive and keep validation/toasts clear of modal actions.
- Preview the final signed amount and treatment before committing a manual transaction.
- Change the accounting representation for internal transfers and retained returns. These need explicit semantics; description matching and explanatory copy alone cannot resolve the reproduced cases.

## Validation

Root checks passed: ai-smoke, chunk-smoke, merge-smoke, import-smoke, reconcile-smoke, experience-smoke and health-smoke. transactions-attention.e2e passed at 1280px and 390px, including Spanish and classification/filter behavior. The current inline script CSP hash matches its content.

Gains crew checks passed: gains.e2e, nw-change.e2e and nw-review.e2e, including English/Spanish and desktop/mobile where provided by those suites. Detailed coverage and independent expectations are in gains/REPORT.md.

Complex import harness completed with exit code 0 and no browser page errors. It recorded 20 checkpoints: localized numbers, malformed input, review corrections and filtering, save/undo, transfer detection and stale edits, cross-account duplicates, Splitwise participant switching, IBKR sections, mixed investment keywords, ambiguous dates, 405-row pagination, invalid inline amounts, mocked multi-file questions and pending balance review, and actual XLSX review/application.

The actual XLSX contained six signed rows. USD was flagged correctly in the standard spreadsheet path; after type corrections and exclusion of the USD fee, five rows saved. This contrasts with the Splitwise adapter’s missing currency warning.

The mocked multi-file result saved three reviewed rows, opened the pending net-worth review, and applied two months of balances and a €500 contribution. Broker value €10,000 → €10,600 produced the asserted €100 gain. This validates the downstream integration using a known response; it does not validate model extraction.

Follow-up checks passed for import history and keyword learning: accepting a merchant keyword categorized both reviewed rows, history showed batch counts and filtered to the selected import, Undo removed the new batch, and reload retained the accepted keyword while keeping undone rows absent. The keyword is a separate explicitly accepted settings change; Undo import removes the imported rows.

## Scope and limits

Custom gain scenarios seed synthetic tracker JSON and then exercise rendered screens and account-linking UI. Existing gain tests enter transactions and pasted imports through the UI. Mocked AI responses test downstream interpretation and review; they do not prove extraction accuracy of a real model. No real financial account, API key or paid AI request was used.

Real PDF/image/OCR extraction and paid model responses are untested. A format appearing in the file picker does not mean it was verified in this audit. See the coverage table and each crew report for the precise boundary.

Additional untested boundaries include TSV/ODS/XLS/XLSM variants, malformed workbook ranges, file-size limits, drag-and-drop queues, a complete accessibility/keyboard audit and saving all 405 rows in one operation. The 405-row test verifies parsing and progressive review display. No claim of exhaustive coverage is made.

## Coverage and regression targets

| Area | Evidence/coverage | Acceptance for improvements |
|---|---|---|
| Manual Add | Income, expense, refund, deposit, withdrawal; zero and missing-date validation; EN/ES; mobile; edit/delete/undo | Preserve signed amounts and metadata; allow explicit account and return treatment. |
| CSV and paste | Localised numbers, malformed rows, corrections, type/category choices, exclusions, cancellation, duplicate reimport and undo | Two accounts’ identical charges remain separate; invalid included amounts cannot commit. |
| Excel transaction file | Actual six-row XLSX upload; signed values, foreign-currency warning, type corrections, five-row save | Retain currency warning behavior and prevent unsupported currency from silently saving as base currency. |
| Large/special statements | 405 rows with Show more; IBKR section parsing; Splitwise participant switching; ambiguous date fixture | Add independent fixtures for each accepted schema and retain currency and date provenance. |
| Transaction review/list | Needs attention/All rows, duplicate/transfer exclusion, refund sign confirmation, bulk categories and sorting in Transactions | Changing a transfer amount recomputes automatic decisions; notice does not push ledger off-screen. |
| Import history/learning | History batch counts/filtering; accepted keyword categorizes repeated merchant; import Undo and reload persistence | Keep history status, batch rows and learned-rule state consistent with the scope of Undo. |
| Gain calculations | UI-entered deposits/withdrawals/paid-out returns; custom internal transfer, retained return and incomplete contribution cases | Internal €500 transfer gives zero gains for both accounts; retained €100 dividend gives €100 gain; known €300 + €200 contributions give zero gain on €500 growth. |
| Net worth CSV | Actual upload, mapping/overwrite, unchanged balance, new pension account, contribution-column hazard, reload | Metadata does not become an asset without explicit intent; balance-only imports remain compatible. |
| AI downstream review | Synthetic results in existing review suite; pending balance and contribution review | Reviewed balances and contribution overrides persist and feed correct gains; distinguish downstream test from live extraction. |
| PDF/image/live AI | Not exercised | Future separate extraction audit needs genuine synthetic documents and controlled vendor responses. |

Detailed final CSV/XLSX, pagination, IBKR, Splitwise and mocked multi-file results are recorded in import/REPORT.md and import/evidence.json.

## Reproduce

From the repository root, serve the app with `python -m http.server 8000`. Set `NODE_PATH` to the installed Playwright package directory (this audit used `C:\Users\taren\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules`). Run:

```powershell
node qa/crew-audit-2026-10-13/transactions/audit.js
node qa/crew-audit-2026-10-13/gains/scenarios.js
node qa/crew-audit-2026-10-13/gains/nw-csv-upload.js
node qa/crew-audit-2026-10-13/import/audit.cjs
```

The audit scripts write evidence in their own folders and use disposable browser profiles. Some scripts deliberately assert the currently observed bad result to preserve a reproduction; a passing harness is not a clean bill of health. Regression fixes should replace those observed-error assertions with the independent expected result.
