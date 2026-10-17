MyAhorros audit — 17 October 2026

The everyday app works well in the tested flows, and the simpler navigation is a reasonable direction. Fix import Undo before release: an older notification can undo the wrong import. Three smaller presentation issues and a stale regression test also need attention. No application files were changed during this audit.

Audited `codex/simplify-everyday-app` at `e92953b16d387f2fa1ae1a5541df9407bb0adde9`. GitHub remote checks confirmed that commit is pushed; `main` remains at `f3b35b9d59f8a703a5da7520e8757d6fdc65b2de`. This is a local audit of that branch, not the deployed production site.

| Priority | Finding | Impact and recommended change |
| --- | --- | --- |
| High | An older import's Undo removes the newest import | Two import notifications can coexist for 15 seconds. Both callbacks read the single mutable `S.lastImport`. Disable/remove the previous Undo when another import completes, or implement independent batch-specific reversal with safe metadata handling. Add a two-import regression test. This bug also exists on `main`. |
| Medium | Spanish transaction controls overflow at 320px | “Todos los movimientos” extends to x=351 in a 320px viewport. Stack the review buttons or allow their text to wrap. The import dialog itself fits; the underlying Transactions page is what overflows. |
| Low | Category spending and limits run together | The demo displays `35,79 €180,00 €/month` without separation. Put the limit on its own line and label it clearly in both languages. |
| Low | Settings language subtitle has insufficient contrast | Axe reports 4.44:1, just below the 4.5:1 minimum for the 12px subtitle on the selected language card. Darken this text or lighten the selected background. Reproduced in English and Spanish. |
| Test maintenance | Original crew regression suite fails | It fills `#imp-text` while the new Paste section is closed. Update it to open the section and follow the current Edit/optional-details flows. Its full suite did not run successfully, so it must not be counted as passed. |

The Undo reproduction is concrete: import one transaction called FIRST IMPORT, then two called SECOND IMPORT A/B. Click the first notification's Undo. The observed result retains FIRST IMPORT and deletes both SECOND IMPORT transactions. The expected result is the reverse. See [before](evidence/undo-before.png), [after](evidence/undo-after.png), and the [browser trace](evidence/undo-trace.zip). The relevant code is [the toast callback](../../index.html#L6733) and [undoImport](../../index.html#L6737).

The other visual findings have [320px evidence](evidence/transactions-320.png) and [category-limit evidence](evidence/cli/category-limits.png). Relevant source: [transaction review controls](../../index.html#L5805), [category amount markup](../../index.html#L3159), [subtitle text style](../../index.html#L666), and [selected-card background](../../northstar.css#L70).

Validation results:

- **11/11 Node smoke suites passed:** AI, audit, chunking, date/template, experience, forecast, formatting, health, import, merge, reconciliation.
- **7/7 maintained browser suites passed:** landing/setup, simplification, import review, account monthly update, transactions needing attention, simulated Drive synchronization, tabs/restore.
- **Original crew-audit-fixes browser suite failed** at its first hidden Paste-field interaction. The failure is a stale UI assumption, not evidence that CSV parsing failed. Later cases in that suite remain unverified by that run.
- **Six independent edge probes passed:** duplicates scoped to account; foreign-currency confirmation; ambiguous-date confirmation and editing; invalid amount on row 205 blocking save even when filtered away; real XLSX upload retaining purchase/refund signs; internal transfers excluded from spending and investment gains.
- **Additional checks passed:** malformed backup rejection without changing existing rows; HTML-like transaction descriptions rendered as text; hiding summary amounts; import modal keyboard focus containment; saving and reopening browser data offline with the service worker.
- **9,600-transaction fixture:** independently calculated integer-cent totals matched the displayed income (€2,062.44), expenses (€12,292.92), and remainder (−€10,230.48). Browser loading, seeding and rendering took approximately 1.8 seconds; opening Transactions took approximately 179 ms and rendered its first 150 rows. These are single-run observations in this environment, not production performance guarantees.
- **Ten axe screen scans:** Summary, Transactions, Accounts, Settings and Categories in English at 1280px and Spanish at 390px. Eight screens had no definite violations; Settings had the contrast finding in both languages. All scans included unresolved contrast checks that require manual assessment. All ten tested layouts fit their page width; the separate 320px check exposed the overflow above.
- No browser page errors were captured by the exploratory runner. The CLI console showed no errors and one expected warning because service workers were deliberately blocked in that test context. The separate offline test enabled and exercised the service worker.

Tools and limits:

Playwright CLI was used for interactive demo navigation, viewport changes, snapshots, screenshots and console inspection. Playwright browser scripts ran against Microsoft Edge, with axe-core for automated accessibility checks. Caveman/Caveman Crew was not installed or exposed as a callable tool, so it was not used. The repository's similarly named crew test is a separate script, not a Caveman execution.

Tests used fictional data. Drive and AI integrations used mocks; live OAuth, real Drive synchronization, actual AI statement extraction, Safari/Firefox, physical phones, screen readers and a complete security review were not covered. The description-escaping probe is only one security check. Automated accessibility results do not establish WCAG compliance.

One optional usability improvement: the demo opens the latest month even when it is incomplete, which can show expenses without payday income and a misleading first impression. Consider defaulting demo visitors to its latest completed month, or clearly marking the current month as partial.

All [evidence and scripts](evidence/) are included in this directory for review on GitHub. Machine-readable results: [suites](evidence/suite-results.json), [exploratory checks](evidence/exploratory-results.json), [edge probes](evidence/edge-results.json). Scripts preserve the paths used during this run and may require path changes elsewhere. The application working tree remained clean during the audit; this documentation commit adds only its report and evidence.
