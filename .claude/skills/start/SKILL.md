---
name: start
description: Start a fresh session from the saved handoff (PROGRESS.md and PLAN.md). Use when the user says "start", "start from handoff", "resume from handoff", or begins a session on an existing multi-step plan.
---

# Start from handoff

Restore working context from the repo files and propose the next step. Do not start editing until the user confirms.

## Steps

1. Read, in this order: `CLAUDE.md`, `PROGRESS.md`, `PLAN.md`. If `PROGRESS.md` or `PLAN.md` is missing, say so and stop.
2. Run `git status` and `git log --oneline -5` to confirm the state matches PROGRESS.md. If they disagree, report the mismatch and ask which is correct.
3. Reply with a short briefing:
   - What is already done (one or two lines).
   - The next pending section, with its number and title from PLAN.md.
   - Your understanding of what that section requires, in your own words.
   - The files you expect to touch.
   - Any open questions, numbered.
4. Wait for the user's go-ahead. Do not edit files yet.

## After the user confirms

- Work only on the agreed section.
- Follow the commit and testing rules in CLAUDE.md.
- When the section is done, run the build and tests, then use the `handoff` skill before the user clears context.

## Do not

- Do not re-do completed sections.
- Do not change decisions recorded in PROGRESS.md without asking the user first.
