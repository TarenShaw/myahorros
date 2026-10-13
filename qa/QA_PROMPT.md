# QA Audit Prompt — myahorros.app

You are a senior QA engineer, UX researcher, and front-end reviewer doing a full audit of this repository: **myahorros.app**, a personal budget-tracker web app served as a static site on GitHub Pages (custom domain via Namecheap).

**Target audience:** people with *zero* financial knowledge and *zero* technical knowledge. Judge everything — wording, flow, layout, error messages — against that person, not a developer.

Your job is to **test the entire app end to end and produce a prioritized report** of what is broken, what should change, what should be added, and what should be removed. Proposals and bold ideas are welcome, but keep them clearly separated from bugs.

---

## Ground rules

1. **Do not modify application code** during the audit. Only create files inside a new `qa/` folder (report, screenshots, test scripts). If a fix is trivial and you're confident, describe it as a suggested diff in the report instead of applying it.
2. Never commit, push, or touch the `gh-pages` branch, `CNAME`, or DNS-related files.
3. Never enter real personal or financial data. Use obviously fake test data.
4. If something blocks you (missing dependency, can't run a browser), say so in the report and continue with what you can test — don't stop.
5. Be evidence-based: every finding needs reproduction steps and, for visual issues, a screenshot in `qa/screenshots/`.

---

## Phase 0 — Reconnaissance

- Map the repo: framework (or vanilla), entry points, pages/routes, where state is stored (localStorage, IndexedDB, files, remote API?), build step (if any), assets.
- Read the README and any in-app help/tutorial text.
- Produce a short **feature inventory**: every screen, button, form, setting, and flow you find. This becomes your test checklist — every item must end up tested or explicitly marked "not tested + why".

## Phase 1 — Run it

- Serve the site locally exactly as GitHub Pages would (e.g. `npx serve` or `python -m http.server` from the published folder; run the build first if there is one).
- Install Playwright (`npx playwright install chromium`) and use it to drive a real browser. Write your test scripts to `qa/tests/` so they can be re-run later as a regression suite.
- Also check the live site at https://myahorros.app if reachable, and note any differences from local.

## Phase 2 — First-time user experience (most important)

Role-play three personas, writing down every moment of confusion:

1. **"Total beginner"** — never made a budget, doesn't know what "categoría", "ahorro", "gasto fijo" etc. mean in this context, not comfortable with computers.
2. **"Mobile-only user"** — uses a phone (test at 375×667 and 390×844), touch only.
3. **"Returning power user"** — has months of data, wants speed.

For each, test:
- Landing page: is it clear within 5 seconds what the app does and why to use it?
- **Onboarding / setup**: every step, skipping steps, going back, refreshing mid-setup, abandoning and returning.
- **Tutorial**: does it exist where needed, is it skippable, can it be replayed, does it match the current UI, is every term explained in plain language, is it too long?
- Empty states: what does each screen show with no data? Does it guide the user to the next action?
- Language: consistency (no mixed Spanish/English unless intended), tone, spelling, jargon, ambiguous labels.

## Phase 3 — Functional testing (every feature)

For every item in your inventory: create, read, edit, delete, undo/cancel. Specifically:

- **Calculations**: verify totals, balances, percentages, averages, monthly/yearly roll-ups by hand. Rounding. Results must be exactly right — this is a money app.
- **Inputs & edge cases**: empty fields, 0, negative numbers, decimals with comma *and* dot (`12,50` vs `12.50` — Spanish users will type commas), thousands separators, very large numbers, letters in number fields, emoji, very long text, leading/trailing spaces, pasted values.
- **Dates**: month/year boundaries, leap years, February, time-zone shifts, DD/MM vs MM/DD display.
- **Currency**: € formatting and placement consistent with Spanish conventions.
- **Persistence**: refresh, close/reopen, multiple tabs open at once, private/incognito mode, cleared storage. What happens to the user's data? Is the user warned that data lives only in this browser (if true)?
- **Import / export / backup** (if present): round-trip test — export, wipe, import, compare. If missing, flag it as a high-priority proposal.
- **Settings**: every toggle actually takes effect and persists.
- **Navigation**: back/forward buttons, deep links, direct URL access to every route, 404 page on GitHub Pages.

## Phase 4 — UI / visual / responsive

- Test at 375, 768, 1024, 1440 px widths, portrait and landscape. Screenshot each main screen at each size.
- Look for overflow, clipped text, overlapping elements, tiny tap targets (<44px), inconsistent spacing, fonts, colors, button styles, icons.
- Dark mode / system theme, if supported (or propose it).
- Loading, success, and error feedback for every action.

## Phase 5 — Accessibility

- Run axe-core via Playwright (`@axe-core/playwright`) on every screen; include violation counts.
- Keyboard-only walkthrough of every flow (tab order, visible focus, no traps, Escape closes modals).
- Color contrast, alt text, form labels, `lang` attribute, screen-reader semantics for charts and numbers.

## Phase 6 — Performance, SEO, PWA

- Run Lighthouse (`npx lighthouse`) on desktop and mobile; record scores and the top recommendations.
- Bundle/asset sizes, unused code, unoptimized images, render-blocking resources.
- Page title, meta description, Open Graph tags, favicon/app icons, `robots.txt`, `sitemap.xml`.
- Installable as a PWA / works offline? If not, evaluate whether it should be.

## Phase 7 — Security, privacy, legal

- XSS: try `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` and similar in every text input; check how user data is rendered (innerHTML vs textContent).
- Secrets: scan the repo and git history for API keys, tokens, personal data.
- Third-party scripts/CDNs: list them, check versions for known vulnerabilities (`npm audit` if applicable), check for Subresource Integrity.
- HTTPS enforcement, Content-Security-Policy feasibility on GitHub Pages (meta tag).
- **EU/GDPR**: the site is public and in Spain — is there a privacy policy, aviso legal, cookie notice (only if cookies/analytics are used), clear statement of where data is stored? Flag what's missing.

## Phase 8 — Code quality (light pass)

- Console errors/warnings on every screen.
- Dead code, duplicated logic, unused files/assets, commented-out blocks.
- Hard-coded strings that block future translation.
- Anything fragile that's likely to break the next time a feature is added.

---

## Deliverable: `qa/QA_REPORT.md`

Structure it exactly like this:

1. **Executive summary** — 5–10 bullets: overall state, biggest risks, top 3 things to do this week.
2. **Scorecard** — table rating 1–10: First-time UX, Tutorial/Onboarding, Functionality, Calculation accuracy, Visual design, Mobile, Accessibility, Performance, Security/Privacy, Code health.
3. **Coverage** — the feature inventory with ✅ tested / ⚠️ partially / ❌ not tested (+ reason).
4. **Bugs** — table with: ID, Severity (Critical / High / Medium / Low), Area, Description, Steps to reproduce, Expected vs actual, Screenshot, Suggested fix.
5. **Changes / updates** — things that work but should be improved (UX, wording, layout), each with *why* and *effort* (S/M/L).
6. **Proposed additions** — new features or content, each with: user value for a non-expert, effort (S/M/L), priority.
7. **Proposed deletions / simplifications** — features, screens, settings, text, or code that add confusion or weight without value. Be honest — less is often better for this audience.
8. **Bold ideas** — bigger proposals worth considering later.
9. **Prioritized roadmap** — "Now / Next / Later" combining all of the above.
10. **How to re-run** — commands to run the Playwright suite in `qa/tests/`.

Rules for the report:
- Plain, direct language. No padding.
- Every bug must be reproducible from the steps given.
- Separate facts (observed) from opinions (recommended).
- If you're unsure whether something is a bug or intended behaviour, list it under "Questions for the owner" at the end.

Start with Phase 0 and post the feature inventory before moving on. Work through every phase without waiting for confirmation unless you are genuinely blocked.
