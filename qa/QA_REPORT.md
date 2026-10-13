# QA report: myahorros.app

Date: 2026-10-11. Code tested: `overhaul` at `9fb0c71`. Its `index.html` is identical to the live site (SW/config 1.0.32).
Setup: local server (`python -m http.server`) plus the live site. Tests ran in Playwright with Microsoft Edge, using made-up data only. No application code was changed.

---

## Fixes applied (same day, SW 1.0.33)

| Bug | Fix | Check |
|---|---|---|
| B1 | `parseAmount(v, fmt)`: in typed amounts the chosen format's lone decimal mark is always the decimal (`12,500` in 1.234,56 → 12,50). Bank files keep the old reading. Used in the add dialog, import review edits, net worth figures, goal, limits, targets | `tests/import-smoke.js`, `tests/qa-fixes.e2e.js` 1 |
| B2 | `setTab` adds a history entry (the tour replaces instead); Back/Forward switch tabs; Back closes an open dialog first (an import review with rows stays put) | e2e 3 |
| B3 | `.info-btn::after` hit area 25 px everywhere (41 px on touch, as before) | e2e 5 |
| B4 | Indicators status column `minmax(128px,max-content)` | e2e 5 |
| B5, B6 | Amount 0 refused. A future date, a date before 1990 or no description: one warning, a second press keeps it | e2e 2 |
| B7 | Export has one Yearly sheet per year with transactions, newest first | e2e 4 |
| Q1 | A place to save the person picked stays picked (`ybt.picked`); the demo's automatic choice is still asked again | e2e 6 |
| Q2–Q4 | No change: negative income stays allowed (corrections); Escape ends the demo tour; Safari has no folder picker, so iPad needs nothing | — |

C1 is now covered by Q1. The other C items and the proposals in sections 5–8 are not done.

## 1. Executive summary

- **Overall, the app is solid.** Every calculation checked by hand matched to the cent: Yearly totals per month and per year, Overview hero, savings rate, tiles, and "not spent or invested". The backup → Start fresh → restore round trip gave back identical data. No console errors appeared on any screen.
- **Security is good.** No markup payload ran anywhere: in a loaded data file, typed fields, category names, pasted imports or chart tooltips. The Excel export writes formula-like text as plain text. No API keys or tokens were found in the repo or its git history.
- **Accessibility is good.** Lighthouse gives 100. axe-core finds only "moderate" landmark and heading-order items. Focus is visible on every stop, dialogs trap focus, and Escape closes them and puts focus back on the button that opened them.
- **Biggest money risk:** an amount typed as `12,500` is saved as **12.500,00 €** (twelve thousand five hundred), even with "1.234,56" chosen as the number format. Any comma or point followed by exactly 3 digits is read as a thousands separator.
- **Biggest mobile risk:** switching tabs doesn't add browser history, so the phone's Back button leaves the site instead of going to the previous tab.
- **Beginners will stumble on wording, not bugs.** Examples: "Ritmo FIRE", "Independencia financiera", "Ganancias", and "your figures always run one month behind, by design". The tour has 17 steps.
- **Housekeeping:** internal docs (`PLAN.md`, `PROGRESS.md`, `CLAUDE.md`, `tests/`) are publicly served on myahorros.app. The privacy page names no owner or contact.
- **Top 3 this week:**
  1. Read typed amounts using the chosen number format, or show what the amount was read as before saving.
  2. Make Back move between tabs.
  3. Stop serving internal docs, and add an owner/contact line to the privacy page.

## 2. Scorecard

| Area | Score | Why |
|---|---|---|
| First-time UX | 7 | The landing page is clear within 5 seconds. Where-to-save is well explained. Setup is long, and a refresh mid-setup asks where-to-save again |
| Tutorial / onboarding | 6 | Exists, skippable, can be replayed, and matches the UI. But it has 17 steps, and some steps use jargon |
| Functionality | 8 | Everything tested works. Issues: amount parsing edge case, odd dates accepted |
| Calculation accuracy | 9 | Every total matched. The one point lost is the `12,500` parsing issue |
| Visual design | 8 | Consistent and calm. One overlap in Spanish (Indicators) |
| Mobile | 7 | No sideways scroll at 375/390/667/768. Back leaves the app. Many tap targets are 32–40 px |
| Accessibility | 8 | Lighthouse 100; axe moderate items only. Info buttons are 17 px |
| Performance | 8 | Lighthouse mobile 89 (LCP 3.1 s), desktop 98 (LCP 0.8 s). 489 KiB transferred |
| Security / privacy | 8 | Output escaping works and the CSP is strict. Weak points: public internal docs, no controller identity |
| Code health | 6 | The 670 KB single-file `index.html` is the main cost of change. 12 existing test suites all pass |

## 3. Coverage (feature inventory)

✅ tested · ⚠️ partly · ❌ not tested (reason)

| Area | Feature | Status |
|---|---|---|
| Landing | Text, See a demo, Get started, EN/ES switch, privacy link, hero image | ✅ desktop + 375/390 |
| Where to save | Folder / Google Drive / Only in this browser | ⚠️ only "browser" saved data. Folder needs the native picker. Drive needs real Google sign-in ❌ |
| Welcome | Language, Import / AI / Start empty, earlier start month, "Open it…" | ✅ (Open it… used for restore) |
| Tour | All 19 cards (17 numbered), spotlight, Next/End, Escape, replay from Settings | ✅ en/es, desktop + phone |
| Wizard | 5 steps, Back, Skip, Finish later, refresh mid-setup | ✅ |
| Empty states | All 6 tabs | ✅ |
| Net worth | Accounts, month figures, Over time, forecast, Financial health, What changed, Goal, Accounts table, Gains | ⚠️ shown with data and screenshotted. Editing covered by repo e2e `gains`. Excel import of figures not run |
| Overview | This month, Month by month (Months/Days, forecast), By category, Share of income, Indicators, Year by year | ✅ totals; ✅ visual |
| Yearly | Grid totals, heat map | ✅ totals; ⚠️ cell click-through not run |
| Transactions | Add, edit, delete, Undo, search, direction, edge-case inputs | ✅ |
| Import | Paste rows (Spanish format), review dialog, keyword match, discard confirm | ✅. File import covered by repo `import-review` e2e |
| AI import | Provider choice, key, chunking, errors | ⚠️ repo `ai-smoke` (mocked) passes. Live keys ❌ (none used) |
| Categories | Add (with markup name), Fixed/Variable, limits, keywords, test box | ⚠️ add + render only |
| Settings | Language, number format, currency, theme, birth year, salary: all persist after reload | ✅ |
| Backup | Download, Start fresh, restore, compare | ✅ identical |
| Excel export | Sheets, formula injection | ✅ |
| Two tabs | Second tab takes over | ✅ |
| Navigation | Hash deep link, Back/Forward, 404 | ✅ |
| Hide amounts (eye), backup nudge, "N to sort" badge | Seen on screen | ⚠️ not clicked |
| Offline / service-worker update | — | ❌ needs a real network switch and version bump |
| Safari, Firefox, real phones, screen reader | — | ❌ only Edge (Chromium) was available |
| Windows app | — | ❌ not in this repo |

Repo suites run as part of this QA, all passing: `ai`, `chunk`, `merge`, `import`, `forecast` smoke tests; e2e `drive-sync`, `landing-wizard`, `gains`, `tabs-restore`, `bad-data`, `overview-days`, `import-review`.

## 4. Bugs

| ID | Sev | Area | Description | Steps | Expected vs actual | Evidence | Suggested fix |
|---|---|---|---|---|---|---|---|
| B1 | **High** | Add transaction | One separator followed by exactly 3 digits is always read as thousands, whatever the number format | Settings → Number format "1.234,56". Transactions → Add → amount `12,500` → Save | Expected −12,50 € (or a question). Actual **−12.500,00 €**. Also: "1.000" with "1,234.56" format → 1000 | `qa/results/functional.json` → `add-inputs`, `parse-amount` | `parseAmount` (`index.html:1189`) ignores the setting. In the dialog (`submitEdit`, `index.html:4788`), let the chosen format decide: in "eu" mode a lone `,` is decimal and a lone `.` is thousands. Keep the guesswork for bank files |
| B2 | Medium | Navigation (mobile) | Back button leaves the site | Open the tracker, click Overview → Yearly → Categories, press browser/phone Back | Expected: previous tab. Actual: previous page (about:blank in the test) | `functional.json` → `navigation` | `setTab` uses `history.replaceState` (`index.html:5765`). Use `pushState` plus a `popstate` listener that calls `setTab(location.hash.slice(1))` |
| B3 | Medium | Accessibility | "i" info buttons are 17×17 px, below WCAG 2.2 AA 2.5.8 (24×24) | Any tab, measure `button.info-btn` | ≥24×24 hit area. Actual 17×17 | `layout-a11y.json` → `layout.*.small` | Add `position:relative` and `::after{content:'';position:absolute;inset:-4px}`. The look doesn't change |
| B4 | Low | Overview, Spanish | Indicators: the status pill overlaps the target button ("≤ 30%" hidden under "Por encima del objetivo") | Spanish UI, 1440 px, Overview → Indicators, any row over/under target | No overlap. Actual: overlap | `qa/screenshots/ly-w1440-overview.png` | Grid column 5 is a fixed `128px` (`index.html:313`). Use `max-content` or `minmax(128px,auto)` |
| B5 | Low | Add transaction | Dates far in the past or future are accepted without a word. The toast then offers "Start the tracker in January 1901" | Add with date 1901-01-01, or 2028-02-29 | A check like the import's `future_date`. Actual: saved; year list gains 2028 | `functional.json` → `add-inputs`, `edit-delete-undo.toast` | Warn (not block) in `submitEdit` when the date is after today or before ~1990 |
| B6 | Low | Add transaction | Empty description and amount `0` are accepted | Add with blank description, or amount 0 | At least a gentle "add a description?". Actual: saved silently | `add-inputs` | Optional: require amount ≠ 0 |
| B7 | Low | Excel export | The "Yearly tracking" sheet covers only the year selected on screen. After B5 the file was named "YEARLY TRACKING 2028" | Select a year, Settings → Download everything | All years, or say "for 2026" in the button. Actual: one year, silently | `functional.json` → `export-xlsx` | `exportXlsx` uses `S.ui.year` (`index.html:5474`). Add one sheet per year, or say so in the help text |

No Critical bugs were found.

## 5. Changes / updates (work, but could be better)

| # | Change | Why | Effort |
|---|---|---|---|
| C1 | After picking "Only in this browser", a refresh before adding anything asks "where to save" again. Then it skips the welcome screen and opens the wizard | This is deliberate (`nothingAdded` in `web-shim.js` `start()`), but a beginner already answered once. Keep the choice once `ybt.storage` is set, and ask again only if they never picked | S |
| C2 | Wizard step 4: "your figures always run one month behind. That is by design." Step 1: "when you start recording this month…" | These two lines are hard to square for someone new to budgeting. Say it once: "At the start of each month, add the month that just ended" | S |
| C3 | Jargon visible to beginners: "Ritmo FIRE" pill, "Independencia financiera", "Cobertura con rentas pasivas", "Ganancias", "Patrimonio neto" | The target user doesn't know these. Use plain labels ("On track to stop working at 65"), and keep the term in the "i" | S |
| C4 | Tour is 17 steps (+2 cards) | Too long for a beginner. Show 5–6 core steps, with "Show me more" for the rest | M |
| C5 | Phone tap targets of 32–40 px: year arrows, eye button 32×36, Connect Google Drive 36 px high, Revisarlos/Más tarde links | Recommended 44 px on touch | S |
| C6 | Overview on a phone opens with two yellow banners stacked (uncategorised + no backup) before any figure | Show one at a time; the backup nudge can wait | S |
| C7 | Internal docs are publicly served: `/PLAN.md`, `/PROGRESS.md`, `/CLAUDE.md`, `/tests/` all return 200 | Not secret, but they leak working notes. Publish only shipped files (audit #7: Actions Pages workflow) | M |
| C8 | Privacy page: no controller identity or contact, no aviso legal | GDPR Art. 13 asks for identity and contact when personal data is processed (GoatCounter: referrer, browser, country). Spain's LSSI may require an aviso legal. Check with a professional | S |
| C9 | No `404.html`, `robots.txt`, `sitemap.xml`. Mistyped URLs show GitHub's generic 404 | A friendly 404 with a link home helps lost visitors. SEO is already 100 | S |
| C10 | Mobile LCP 3.1 s (Lighthouse 89). 116 KiB unused JS, 68 KiB image savings, 234 KiB "cache" (GitHub Pages `max-age=600`, not changeable) | Inline the landing above-the-fold CSS; serve a smaller hero to phones (`srcset`) | M |
| C11 | Import review: Escape toggles the "discard these rows?" bar, so a second Escape hides it again | Intentional, but pressing Escape twice to leave feels stuck. Make the second Escape confirm the discard, or say "Esc again to keep" | S |

## 6. Proposed additions

| # | Addition | Value for a non-expert | Effort | Priority |
|---|---|---|---|---|
| A1 | Live "read as −12,50 €" under the Amount field | Catches B1-type mistakes before they hit totals | S | Now |
| A2 | A short glossary ("What do these words mean?") linked from the "i" popups and Settings | Explains net worth, gains, fixed/variable and FIRE in one place | M | Next |
| A3 | Friendly 404 page | Lost visitors find their way back | S | Next |
| A4 | Monthly check-in: one button "Add last month" that walks through balances, then the import | Turns the monthly routine into a single guided task | M | Later |

## 7. Proposed deletions / simplifications

- **Overview "Year by year" chart:** it repeats Yearly tracking and the tiles. For a beginner, six sections on Overview is a lot. Consider dropping it, or keeping it only when there are 2+ full years.
- **"Recommended" on "A folder on this computer":** a beginner has to understand folders, file pickers and permissions. Recommend "Only in this browser" (plus backup) or Drive for beginners, and keep folder for people who already use the Windows app.
- **Tour steps 12–16** (import, AI, guessed categories, keywords, categories) explain features the person hasn't met yet. Move them into the wizard step or the empty states where they apply.

## 8. Bold ideas

- **Plain-language "money health" summary** at the top of Overview, one sentence: "You kept 51% of what you earned this year. That's more than enough for an emergency fund in 6 months."
- **Bank presets:** recognise the export layout of the 10 most common Spanish banks, so import needs zero column mapping.
- **Installable app prompt** after the second visit (the manifest and service worker are already there).

## 9. Roadmap

- **Now:** B1 + A1 (amount parsing and preview), B2 (Back), C7 (stop serving internal docs), C8 (owner/contact in privacy page).
- **Next:** B3, B4, C1, C2, C3, C5, C6, A3/C9, B5–B7.
- **Later:** C4 (shorter tour), A2 (glossary), C10 (mobile LCP), A4, the bold ideas, the simplifications in section 7.

## 10. How to re-run

```
python -m http.server 8131                        # from the repo root
# a folder with playwright + @axe-core/playwright installed (npm i playwright @axe-core/playwright)
NODE_PATH=<that folder>/node_modules START_URL=http://localhost:8131/ node qa/tests/01-first-run.js     # landing, where to save, tour, wizard, empty tabs (4 setups)
NODE_PATH=... START_URL=... node qa/tests/02-functional.js    # totals by hand, inputs, edit/undo, settings, backup round trip, export, paste import, navigation
NODE_PATH=... START_URL=... node qa/tests/03-layout-a11y.js   # 5 sizes × 6 tabs, dark theme, axe on every screen and dialog, keyboard walk
NODE_PATH=... START_URL=... node qa/tests/04-xss.js           # markup in every text field must not run
npx lighthouse https://myahorros.app/ [--preset=desktop]      # CHROME_PATH=<msedge.exe> if Chrome isn't installed
```

Results go to `qa/results/*.json` and screenshots to `qa/screenshots/`. The tests use Edge (`channel: 'msedge'`). They replace the native save/open pickers with plain downloads and file inputs, because Playwright can't drive those pickers.

## Questions for the owner

1. C1: is asking "where to save" again after a refresh (nothing added yet) wanted?
2. Typing `-100` on an Income row saves a negative income. Is that intended (e.g. a salary correction), or should it switch to Expenses?
3. Should Escape while the demo tour is running end the demo and clear its example (current behaviour), or just close the card?
4. Phone detection uses the user-agent string (`isMobile`). An iPad in desktop mode reports itself as a Mac. Is the folder option correctly hidden there? Not testable here.
