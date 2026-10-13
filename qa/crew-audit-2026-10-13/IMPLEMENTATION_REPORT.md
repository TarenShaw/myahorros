# Audit fixes implemented

The 13 October 2026 audit findings are addressed in the local working tree. Existing user changes were preserved. No deployment, commit, real financial-account action or paid AI request was performed.

## Findings

| Finding | Implemented behavior |
|---|---|
| Broker-to-broker transfers | Add/Edit, import review and Net worth linking accept both source and destination investment accounts. Both contribution legs are calculated; the movement is excluded from budget investment totals. |
| Invalid reviewed amounts | Commit checks included rows, including invalid edits hidden by filters or pagination. Invalid/blank/zero amounts block submission and keep the typed value visible; excluded invalid rows do not block. |
| Partial contribution history | Each month uses its reviewed contribution when present and linked flows otherwise. One missing override no longer discards other reviewed months. |
| Retained returns | Entry/review offers paid-out versus retained treatment. Retained rows are excluded from cash income and gain payout additions. Existing unmarked returns retain their prior paid-out behavior. |
| Giant warning icon | Notice SVGs have fixed dimensions. Regression checks verify warning-icon geometry. |
| Balance-import metadata | Contribution/return/fee/percentage headings default to skipped columns. New accounts require confirmation. The total preview includes existing balances retained by a partial import. |
| Cross-account duplicates | Exact duplicates require matching known account IDs. Different known accounts remain separate; unknown/legacy identities produce possible-match warnings instead of automatic exclusion. Source changes rerun matching. AI duplicate proposals also reject distinct known accounts. |
| Whole-bank-file exclusion | Investment wording alone no longer excludes a file. Structured investment-statement headings still provide the existing exclusion safeguard. |
| Stale transfer exclusions | Amount, description, date, type, category and account changes recompute derived review checks while preserving explicit user include/exclude decisions. Matching against saved transfer rows now requires transfer wording on both sides and excludes investment contributions. |
| Splitwise currency | The adapter preserves Currency. Foreign rows require a confirmed amount in the tracker currency or exclusion; the original currency is retained in stored provenance. No exchange rate is guessed. |
| Ambiguous dates | Review asks for date order when evidence is ambiguous, previews ISO dates, allows per-row correction and remembers the chosen order in account statement fingerprints. |

## Review and entry improvements

- Optional source/account and investment links in manual Add/Edit; imported source details remain visible.
- Final signed-amount preview before saving a manual entry.
- Import review search, sorting, visible-row selection, bulk inclusion/exclusion, category and type actions.
- An Excluded rows view and an explanatory empty state with Show all rows.
- Account details stay expanded when changing transfer controls.
- Explicit transfer/retained-return labels on the Transactions list.
- Toasts move above open dialogs to clear footer actions.
- Mobile filters already collapsed by default; that behavior was retained.
- Excel export/reimport preserves account names, source filenames, transfer endpoints and retained-return treatment. JSON storage preserves the new optional fields. Legacy description-based account matching remains available.
- AI review receives accounting metadata so it can distinguish retained returns and internal transfers. Moving a row to a different table clears incompatible accounting flags.

## Verification

Passed smoke suites: `ai`, `chunk`, `merge`, `import`, `reconcile`, `experience`, `health`, `format`.

Passed browser suites: `gains.e2e.js`, `nw-change.e2e.js`, `nw-review.e2e.js`, `import-review.e2e.js`, `transactions-attention.e2e.js`, the existing `audit-fixes.e2e.js`, and new `crew-audit-fixes.e2e.js`.

The new regression suite exercises actual CSV/paste and XLSX paths, invalid edits outside the filtered view in a 205-row import, currency decisions, source-aware duplicates, date order and repair, bulk review, retained returns, transfers through entry/import/linking, reload persistence, and Excel export/reimport. English/Spanish transfer entry is checked at 1280px and 390px. The suite completed without page errors.

Independent accounting expectations passed:

- €500 internal transfer: zero gain on both accounts and zero total change.
- €100 retained dividend on €100 balance growth: €100 gain, zero additional cash income/payout.
- €300 reviewed contribution plus €200 linked contribution on €500 growth: zero gain.
- Balance metadata does not become a new asset without an explicit choice.

Inline JavaScript syntax, CSP hash, LF line endings and `git diff --check` passed. Service-worker cache and Settings version were bumped together to **1.0.70**.

Screenshots are in `verification/`; the repeatable regression suite is `tests/crew-audit-fixes.e2e.js`. The original audit evidence remains unchanged as a record of the reproduced issues.

## Limits

Live PDF/image/OCR vendor extraction was not tested. Foreign-currency conversion remains a user-entered, explicitly confirmed amount; there is no automatic rate service. Contribution columns in balance spreadsheets are safely skipped rather than automatically interpreted as contribution overrides; overrides remain available through figure editing and statement review.

The new optional transaction fields require this version to retain their semantics when editing data. Older clients may ignore those fields. No historical transaction is automatically reclassified as a transfer or retained return: users can make those choices through entry/edit/review.
