# PLAN: MyAhorros update

Source: the user's brief (phases 0-7). Status as of 2026-10-10. Details of what was built are in PROGRESS.md.
Ground rules: keep all existing features working; match existing style and UI language (en + es for every new string); small commits per phase; no secrets in the repo; never push or merge without the user's say-so.

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
| 3.1-3.9 | Layout, legend, static buttons, icons, space, action buttons, Gains | Done at 1280 px | `b222477` |
| 4.1 | Landing page | Done | `523c194` |
| 4.2 | Setup wizard | Done | `523c194` |
| 4.3 | Tour review | Done (text level) | `523c194` |
| 5 | GoatCounter and privacy policy | Done | `6f3ff66`, `2a2a787` |
| 6 | Name proposals; MyAhorros chosen and applied | Done | `978013a`, `133d267` |
| 7 | Drive stability (retries, status, no silent overwrite) | Done | `d5b0dbe` |

## Pending

### 8. Review and release

8.1 **User review** of the site at http://localhost:8000 (branch `overhaul`). Collect change requests.
8.2 **Live-key verification**: with a rotated Gemini key and a real Claude key, test a large statement on Haiku 5.5 and on Gemini; confirm the error box shows the true cause if anything fails. Fix what it reveals.
8.3 **Mobile and tour pass**: check 390 px and 768 px widths for the landing page, wizard, overview, accounts table and import review; walk every tour step and fix any that point at a missing element.
8.4 **Release decision**: push the `overhaul` branch for review, or merge into `main` (publishes via GitHub Pages). Needs explicit user approval.
8.5 **Post-release**: confirm GoatCounter counts a visit on the live site and that existing users' data and installed copies update cleanly (service worker `VERSION` bump, CSP hash).

### 9. Possible follow-ups (only if the user asks)

9.1 Match deposits to accounts by amount when the description does not name the account (Gains).
9.2 Send answered questions back to the AI for a second pass (2.6).
9.3 Add `PROGRESS.md` / `PLAN.md` handling to CLAUDE.md if the handoff skills become routine.

## Testing rules

- Before each commit: `node tests/ai-smoke.js`, `node tests/chunk-smoke.js`, `node tools/update-csp-hash.js`.
- For sync, landing or wizard changes: run the browser tests in `tests/` (Playwright, Edge, server on port 8000).
- Any edit to the inline script in `index.html` needs the CSP hash refreshed; any shipped-file change needs `sw.js` `FILES` and `VERSION` updated.
