# Collaboration Workflow

## Goal
Support multiple humans and AI agents working in parallel from GitHub without letting Base44 editor changes drift from the repository.

## Environments

### Local development
- Use `npm run dev`.
- Point the client at the real Base44 app for the target environment.
- Sign in with a real issued username and auth key.

### Shared validation environment
- Use a real staging or preview deployment backed by Base44.
- Keep invitation auth enabled.
- Do not introduce local-only auth bypasses or synthetic entity state in shared environments.

## Operating Model
1. Human A + AI A claim one scoped task.
2. Human B + AI B claim a different scoped task.
3. Both pairs validate against the real staging or preview environment.
4. Both pairs merge through GitHub PRs.
5. One human with Base44 access applies optional polish later and mirrors the result back into GitHub immediately.

## Recommended Split
- Pair 1:
  - feature delivery in a bounded product surface
- Pair 2:
  - adjacent feature slice, shared UI polish in-repo, or integration support
- Shared infra:
  - `src/core/data/*`
  - `src/core/shell/*`
  - docs and repo workflow files
  Claim these explicitly before editing.

## Daily Loop
1. Pull latest `main`.
2. Claim or update a task in `TASK_LEDGER.md`.
3. Create a branch.
4. Build and test against the real invitation-auth flow.
5. Open a PR with verification notes.
6. Merge to GitHub.
7. Only then consider Base44 polish, followed by an immediate GitHub sync-back.
