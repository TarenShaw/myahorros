# Layout and visual consistency pass

A presentation-only pass over the whole tracker (branch `overhaul`, commits `fef1908`…`bfaf3ba`, SW 1.0.36). No calculation, data model, storage, import or categorisation logic changed. Every figure on every tab was compared before and after on the same made-up demo data. No figure changed value. The only differences are formatting (listed below) and three new display-only figures: the Goal card's current amount with 2 decimals, the group rows' Change, and shares with one decimal.

## Across the app

- **Tokens.** One token block in `index.html` `:root` holds all of these:
  - spacing on a 4-pt scale (`--s4` … `--s48`)
  - radii (card 12, inner 8, pill, mark 2)
  - the type scale: page 24, section 18, hero 48, KPI 28, body 14, meta 13, small 12, eyebrow 11
  - colour roles, including a status `--warn`

  Hard-coded font sizes, radii, paddings, margins, gaps and colours now use them.
- **Type sizes.**
  - Captions are 13 px at every width.
  - Nothing is under 12 px except the mono eyebrow labels and the phone tab bar (11 px).
  - Figures use tabular numbers everywhere.
- **Colour.**
  - The Investments group is the same blue as the Investments flow.
  - The long-term amber moved away from the expenses red-orange.
  - Muted text measures at least 4.5:1 on every card surface, in both themes.
- **Formatting.** One set of helpers: `fmtEUR`, `fmtCompact`, `fmtPct`, `DASH`, tested by `tests/format-smoke.js`.
  - Charts use `63,3 k €` on both axes and bar labels.
  - A tiny share shows `<0,1%`.
  - Every "no figure" mark is a muted `—`.
  - Ranges use an en dash (`Jan–Aug`).
- **Page header.** Every tab has the same header:
  - left: the page title (h1) and one line of description
  - right: the period control and the page's buttons, in the same spot on every tab
  - the year stepper moved here from the masthead
  - content is 1280 px wide on every tab
- **Buttons.**
  - One filled primary per page, always right-most.
  - Every group reads [Fill in with AI] [Paste or import] [primary].
  - One label per action in English and Spanish ("Fill in with AI" / "Rellenar con IA", "Paste or import", "Add transaction").
- **Charts.**
  - Every chart has a legend in its top-right corner.
  - One caption for estimates: "Shaded months are estimates based on your last N months".
  - The selected month has the same look everywhere.
  - The trend line is fainter and sits under the value labels.
- **Touch and keyboard.**
  - Every control on a phone or touch screen is at least 40 px tall.
  - The phone tab bar fits every label in English and Spanish at 390 and 360 px.
  - Every focused element shows a focus ring.
  - Status is never shown by colour alone.

## Per tab

**Net worth**
- New header layout. The month picker is the period control. Order: Fill in with AI, Import from Excel, Edit, then Enter next month (primary). Edit becomes the primary when no month is due.
- Over time:
  - a legend for the groups and the trend line
  - short month names for a single year
  - total labels in `k €`
  - no year buttons when there is only one year
- Financial health cards:
  - all cards share one layout: label, value, meta, footer
  - the footers line up along the bottom
  - no colour squares
  - only the badge carries a status colour
  - the empty age card shows `—` and an "Add details in Settings" button
- What changed and Goal:
  - both keep their natural height
  - the What changed bars compare on one scale without a "full" track
  - explanations fold under "How is this calculated?"
  - Goal repeats the headline figure with the same 2 decimals
  - Change goal is outlined
- Accounts:
  - group rows show Change as well as Gains
  - shares have one decimal on every row
  - a missing figure shows a muted `—`
  - the Gains explanation folds under "How is this calculated?"

**Overview**
- New header with the year stepper.
- This month: buttons reordered. Where it went: each bar is the category's share of the month's spending.
- Month by month: legend plus the trend key, the shared caption, and the same selected-month look as Over time.
- Share of income ends at the last month with a figure.
- Indicators: badges read On target / Over target / Under target.

**Yearly tracking**
- The header holds the year. The old "2026, month by month" heading is gone.
- The grid stays at 12 px and scrolls inside its frame below 1200 px.
- Zero cells show a muted `—`.
- An over-limit cell is bold as well as red-underlined.

**Transactions**
- The header holds the year and the buttons.
- The category menu is a quiet chip until you point at it or tab to it. It is still a native select.
- "Show 150 more" was already there.

**Categories**
- New header. There is no year control, because the list doesn't depend on the year.
- Rename and Delete appear on row hover or focus, and stay visible on touch. Delete is muted and turns red on hover; it already asked for confirmation.
- Fixed/Variable use the chip style.
- Add category and Add keyword are both outlined.
- Keyword rows use the category chip.

**Settings**
- New header.
- Action buttons are 40 px tall.

## Needs a decision

Decided 2026-10-11: the user chose to keep all eight as they are.

1. **Account names as "Provider · Product".** Names are the user's own data, stored as typed. Relabelling them would change stored data, and real provider names must not go in the repo. Rename them in Edit accounts (each account keeps its figures and links).
2. **Net worth import label.** It stays "Import from Excel". That dialog only takes a file, so "Paste or import" would promise a paste box it doesn't have. The options are to rename it anyway or to add a paste box (a new feature).
3. **Landing page captions.** They still say "Import from Excel" and "Read statements with AI". They describe features, not buttons.
4. **Four KPI cards.** Net worth shows one card per group that has money in it (three in the demo), not always four.
5. **Phone tab bar at 11 px.** The labels are at the eyebrow size, not the 12 px minimum, so all six fit on a 360–390 px phone.
6. **Values under 4 px.** Hairlines, the 2–3 px chip padding and optical nudges are not on the 4-pt scale. Rounding them to 4 px would visibly change the chips.
7. **Theme pictures in Settings.** They keep literal colours, because each one shows the other theme.
8. **Trend key in Month by month.** It appears only when a single type is picked and Months is on, which is the only time the chart draws a trend line.

## Not checked

- A real phone, real iOS text scaling, a real screen reader, real Safari.
- "Where it went" with real rows: the demo has none for the current month.
- The Windows app, which shares this code and has not been run with these changes.
