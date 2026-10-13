---
name: new-feature
description: Guide a MyAhorros feature from an approved implementation plan through testing, a feature branch, and a draft pull request. Use when invoked as $new-feature in Codex or /new-feature in Claude Code, or when asked to develop a MyAhorros feature using this workflow.
---

# New MyAhorros feature

Use clear, beginner-friendly language. Explain Git actions by their purpose, ask only for information you cannot safely determine from the repository, and report major milestones and blockers. Keep the work within the approved feature scope.

This file and the other entrypoint at `.agents/skills/new-feature/SKILL.md` or `.claude/skills/new-feature/SKILL.md`, relative to the repository root, must remain identical. When updating this skill, update both in the current worktree. Do not edit another AI's worktree to synchronize them.

## Discover and plan

1. Ask what feature the user wants to implement. If they already described it with the invocation, acknowledge that description instead of asking them to repeat it.
2. Confirm the repository root and assigned worktree using `git rev-parse --show-toplevel` and `git worktree list`: Codex works in `MyAhorros-Codex`; Claude works in `MyAhorros-Claude`. If the worktree is wrong, stop and explain where the user should start the session. Read `AGENTS.md`; Claude must also read `CLAUDE.md`. Follow applicable instructions, including any nested instructions for files in scope.
3. Inspect Git status, relevant architecture, existing code, callers, tests, and documentation without editing. Query the existing knowledge graph before broad searches as required by repository instructions; if unavailable or stale, explain that and use focused source inspection. Identify interactions with storage, imports, AI, sync, dialogs, onboarding, and translations where relevant. Reuse existing patterns.
4. Ask necessary follow-up questions, preferably one or two at a time. Resolve repository facts yourself. Identify what successful behavior and meaningful tests would look like.
5. Present a concise implementation plan: expected behavior, likely files, interactions with existing features, testing strategy, risks, and manual checks. Explain that the workflow will create a feature branch, commit and push it, and open a draft PR into `main` for review.
6. Ask for explicit approval of the plan and wait. Do not edit files, create a branch, or start implementation before approval. If the scope materially changes later, revise the plan and obtain approval for that change.

## Prepare Git after approval

1. Reconfirm the assigned worktree, reread `AGENTS.md` (and `CLAUDE.md` for Claude), and run `git status --short --branch`.
2. Never discard existing uncommitted work. If the tree is dirty, explain the affected files and ask how to preserve or finish that work before switching branches. Do not automatically stash, commit unrelated work, reset, clean, or overwrite files.
3. Check the existing branch for unpublished or unfinished commits so they are not silently abandoned. Explain any overlap with the planned feature. Preserve that branch; ask for direction when the overlap changes the plan.
4. Verify `origin` points to the intended MyAhorros repository and run `git fetch origin`. Require a successful fetch and a valid `origin/main` before proceeding. Do not use an outdated local `main` as the base.
5. Generate a short, descriptive branch name with lowercase words separated by hyphens: `codex/<feature-name>` for Codex or `claude/<feature-name>` for Claude. Check local and remote names and worktree assignments; choose an unused suffix if needed. Never replace an existing branch. Create it from `origin/main`, for example `git switch --no-track -c codex/add-savings-goal origin/main` (use `claude/` for Claude).
6. Inspect `git worktree list` and existing branch diffs for overlapping changes to likely files. Read-only status or diffs from another worktree are allowed; do not switch, edit, stash, commit, or otherwise mutate it. Explain conflicts, including relevant uncommitted changes, and agree on a safe approach before touching overlapping work. Preserve audit and quick-wins worktrees.
7. Read the instructions on the new branch too. If switching from a local branch left unpublished instructions behind, retain the session's applicable rules and flag the difference; do not silently copy unrelated commits into this feature.

## Implement and verify

Implement the smallest complete approved change. Preserve error handling, accessibility, and existing user data. Apply these MyAhorros requirements when relevant:

- Keep LF line endings. After any change to the inline script in `index.html`, run `node tools/update-csp-hash.js` and include the updated CSP hash.
- For changes to cached application assets, bump `sw.js` `VERSION` and keep `config.js` `version` equal. When adding, removing, or renaming shipped assets, update the service worker `FILES` list and verify every listed file exists. Development skill files are not precached app assets and do not require a version bump.
- Update both English and Spanish UI strings wherever affected, including `index.html`, `js/web-shim.js`, `js/web-ai.js`, and `privacy.html` as applicable.
- Preserve compatibility with `tracker-data.json`, daily backups, and folder, browser, and Google Drive storage. Preserve sync deferral during dialogs or edits and the soft `ybt-sync-data` event for background updates.
- New external hosts or third parties require the appropriate CSP entries, README privacy statement, and both languages in `privacy.html`. Do not edit `vendor/`.
- Keep `config.js` a plain `window.YBT_CONFIG = {...}` assignment. This app has no build system or backend; do not introduce one unless explicitly approved.

Run checks appropriate to the changed behavior, following the current repository instructions. Available checks include:

- `node tests/ai-smoke.js`: AI retries, limits, truncation, and key scrubbing.
- `node tests/chunk-smoke.js`: statement splitting and merging.
- `node tests/merge-smoke.js`: storage data merge.
- `node tests/import-smoke.js`: import parsing and accounting cases.
- Browser tests: `tests/drive-sync.e2e.js`, `tests/landing-wizard.e2e.js`, and `tests/tabs-restore.e2e.js`, using Playwright's Edge channel and a local HTTP server as documented in `AGENTS.md`.

For browser checks, serve over localhost, account for stale service worker caches, and use test data. Never delete real user data to make a test pass. Add a small regression check for non-trivial new logic. For documentation or skill-only changes, validate the changed files instead of running unrelated app tests. Report skipped or unavailable checks honestly.

## Commit, push, and open a draft PR

1. Review the diff and Git status. Confirm the current branch has the correct AI prefix and contains only the approved feature's changes. Stage specific files; inspect the staged diff for unrelated edits or secrets.
2. Commit on the feature branch using the configured Git author and repository attribution rules. Codex commits must include a blank line followed by `Co-authored-by: Codex <codex@openai.com>`.
3. Push only the feature branch and configure upstream tracking: `git push --set-upstream origin <feature-branch>`. Never push directly to `main`. Never force-push, delete branches, or perform destructive Git operations without specific user approval. Plan approval does not authorize those operations.
4. Open a draft pull request with the feature branch as head and `main` as base, using an available GitHub client such as `gh pr create --draft --base main --head <feature-branch>`. Describe the resulting behavior, validation, risks, and manual checks. Inspect an existing PR before retrying so you do not create duplicates. Never merge automatically or deploy production changes.
5. Verify the PR URL, head, base, and draft status, and check the final working tree. Stop at review; do not wait for or assume merge approval.

If a command fails, explain what failed and propose the safest fix. Stop dependent steps when a fetch, test, commit, push, or PR creation fails. Do not bypass failing checks, rewrite shared history, or use destructive recovery. Resolve routine reversible issues within the approved scope; ask only when user input or additional authorization is necessary. If remote access is unavailable, preserve local work and report the exact remaining step instead of claiming completion.

## Completion report

Report the feature summary, branch name, draft PR URL, tests and results (including skipped checks), potential risks, and suggested manual checks before merging. Say clearly that the PR is ready for review and has not been merged.
