---
name: handoff
description: Save progress before clearing context. Use when the user says "handoff", "save progress", "wrap up this phase", or is about to run /clear on a multi-step task.
---

# Handoff

Write the state of the current work so a fresh session can pick it up without the conversation history.

## Steps

1. Check `git status` and `git log --oneline -10` to see what was actually changed and committed. Trust git over memory.
2. Update `PROGRESS.md` at the repo root (create it if missing) with these sections:
   - **Completed**: sections or phases done, with commit hashes.
   - **In progress**: anything started but not committed. State exactly where it stopped.
   - **Pending**: remaining sections from PLAN.md, in order.
   - **Decisions**: every choice the user made (answers to questions, naming, model defaults, scope changes). Include the date.
   - **Known issues**: problems found but not fixed, with file paths.
   - **Commands**: build, test, and dev commands, copied from CLAUDE.md.
3. Keep `PROGRESS.md` under 100 lines. If it is longer, condense older completed items into one summary line and keep all decisions.
4. Do not include secrets, API keys, or tokens in any file. If one appears in the conversation, note in Known issues that it should be rotated, without repeating the value.
5. Show the user the final `PROGRESS.md` and ask them to confirm before committing.
6. After confirmation, commit with the message `docs: update PROGRESS.md handoff`.
7. Tell the user: "Handoff saved. Run `/clear`, then use `/start` to resume."

## Do not

- Do not edit application code during a handoff.
- Do not delete previous decisions.
