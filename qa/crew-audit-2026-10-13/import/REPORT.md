# Import audit — 13 October 2026

Isolated headless Microsoft Edge, current working tree, local server, fresh synthetic browser trackers. Actual CSV/XLSX file uploads and real review UI actions. `tests/import-smoke.js` passed. No production data, external writes, or paid AI calls. Model extraction alone was mocked using `mock-extraction.json`; downstream normalization, multi-file account attribution, question buttons, transaction save, pending Net worth review, balances/contributions apply, and gains calculation were real.

## Confirmed findings

| Priority | Code | Reproduction and expected/actual | Improvement |
|---|---|---|---|
| P1 | `index.html:6256` | Upload `cross-account-a.csv`, select Bank Alpha, save NETFLIX -15 on 9 Sep; upload identical `cross-account-b.csv`, select Bank Beta. Expected independent Bank Beta charge selected; actual `dup:true`, `why:exact_duplicate`, off, Add disabled. One legitimate expense disappears unless manually restored. | Compare known account identity during duplicate matching; rerun checks when source account changes. Same account reimports should still be excluded. |
| P1 | `index.html:6276` | `mixed-investment-words.csv` is ordinary bank salary +2000, investment contribution -500, groceries -100, electricity -50. One of four descriptions says APORTACION. Expected mixed normal statement, contribution reviewed as investment; actual every row excluded as `investment_file`, including salary and spending. | Require stronger file-level evidence, show classification override, and avoid suppressing unrelated rows by a 25% substring heuristic. |
| P1 | `index.html:6102` | Upload `splitwise-usd.csv`, select Ana. USD dinner share -60 and EUR hotel share +100. Expected USD preserved with foreign-currency review warning like ordinary CSV/XLSX; actual USD column discarded, `fx:null`, `checks.fx:0`; -60 ready to book in EUR. Ben selection changes signs but also loses currency. No exchange-rate conversion was attempted; defect is loss of supplied currency metadata. | Carry each row's Currency into normalized Splitwise rows; require conversion/exclusion decision for foreign amounts. |
| P2 | `index.html:6173` | Upload `paired-transfers.csv`: +/-500 transfer pair correctly off. Edit outgoing amount to -600 and press Enter. Expected pair invalidated/rechecked; actual +/- unequal pair retains `xfer:true`, `why:transfer`, off, `checks.xfer:2`. | Clear/recompute transfer, balance, unusual-amount, and other derived review checks after changes; preserve explicit user include decisions separately. |
| P2 | `index.html:1348`, `index.html:5924` | `ambiguous-us-dates.csv` has US dates Sep 1/2/3 written 09/01,09/02,09/03. Actual imports Jan/Feb/Mar 9, no date ambiguity warning and no date editing control in review. This is an unavoidable inference ambiguity presented as certainty. | Offer date-order choice with parsed examples and date editing; remember format by account/file fingerprint. |
| P1 | `index.html:6177`, `index.html:6990` | Replace review amount -15 with `banana`, immediately click Add. Actual original -15 saved despite invalid visible input. Independently reproduced by main UI crew. | Block commit while displayed review edits are invalid; focus the failing cell. |

Screenshots: `cross-account-duplicate.png`, `mixed-investment-excluded.png`, `stale-transfer-review.png`. All row-level expected/actual state is in `evidence.json`.

## Proven working and oracle

| Scenario | Evidence/outcome |
|---|---|
| Localized semicolon bank CSV | 7 of 8 rows read; `banana` row shown unreadable. Salary 2000; charge -40; refund +10 as Expenses; contribution -500; USD -12.50 flagged; Unicode minus -23.45; parentheses -15. |
| Review editing/cancel/include/category/type | Charge corrected -40→-35 with Enter; description edited; contribution switched to Investments; category assigned; USD excluded; Needs attention filter used; close prompted discard, Keep checking preserved edits. 6 rows saved. |
| Undo | All 6 imported rows removed; existing synthetic account snapshots retained. |
| Transfer detection | Equal signed pair excluded initially; stale-after-edit defect above. |
| Cross-account duplicate | False-positive exclusion confirmed, account identities recorded in saved row. |
| Splitwise people | Ana/Ben participant switch changed individual amounts correctly; currency defect above. |
| IBKR sections | Deposits and dividends sections read, Trades section lacking date/amount skipped. Both read rows excluded because investment file recognized. Dividend exclusion needs an explicit payout/reinvested decision to avoid missing paid-out returns. |
| Large file review | 405 parsed rows; initial visible 200; two Show more clicks produced all 405. No commit of all 405 in this run. |
| Actual XLSX | Root-created `../xlsx/complex-transactions.xlsx` uploaded. Exactly 6 signed rows [2000,-500,-40,40,25,-15], USD warning present. Investment type corrected, USD excluded, 5 rows saved. |
| Mocked multi-file statement | Source accounts selected independently for bank A/B. Ownership question excluded Bank B's -20. Contribution question answered. 3 saved rows [+2000,-500,-100], all source/account fields correct. |
| Mocked statement → Net worth | Pending balance review opened after transaction commit. Import 2 months applied balances 10000→10600 and reviewed September contribution500. Expected gain =10600−10000−500=100; actual `nwGains('2026-08','2026-09').get('fund')===100`, asserted. `mock-networth-gains.png` records screen. |

## Limits and UX follow-ups

Local CSV import recognizes headers automatically; there is no manual column-mapping workflow in the inspected review. Unsupported schemas need an actionable mapping path before offering paid AI. Date correction and import-wide include/type/category decisions would reduce repetitive repair for long statements. Needs attention excludes automatically omitted rows; in the mixed-investment defect it can appear empty while every legitimate row is excluded. Include an Excluded rows review view and explicit override.

This audit exercised CSV, XLSX, statement section parsing, Splitwise, large reviews, edits, source accounts, questions, cancellation protection, save, Undo, and pending Net worth integration. It did not exercise live vendor extraction from PDF/image, real bank exports, actual OCR, TSV/ODS/XLS/XLSM, malformed workbook ranges, 20MB limits, browser/mobile accessibility, all keyboard combinations, drag-and-drop queues, keyword suggestions/learning persistence, or import-history UI. Main crews cover other Add transaction and gains functionality. Findings describe tested behavior, not a claim that every supported format or every action passed.

Rerun in PowerShell: set `NODE_PATH` to the bundled runtime `dependencies/node/node_modules`; serve root at port 8000; `node qa/crew-audit-2026-10-13/import/audit.cjs`. Run outside the restricted browser sandbox when Edge launch is blocked. Script writes only this audit directory, and uses a fresh browser context each time. Fixtures and mock files are intentionally synthetic.
