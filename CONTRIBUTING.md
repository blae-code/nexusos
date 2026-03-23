# Contributing

## Source Of Truth
GitHub is the source of truth for all active development. Base44 is downstream and must be synced back into the repo immediately after any editor-side polish.

## Default Workflow
1. Claim work in [TASK_LEDGER.md](./TASK_LEDGER.md) before editing.
2. Work on a Git branch, not in Base44.
3. Keep ownership scoped to a feature slice or support slice.
4. Validate against the real invitation-auth flow and real Base44 data.
5. Open a PR with verification notes and Base44 impact called out explicitly.
6. Merge to GitHub first.
7. Only then apply optional Base44 polish and mirror it back into GitHub the same day.

## Two-Human / Two-AI Rules
1. Each human owns one AI thread and one branch at a time.
2. Do not let two branches edit the same surface unless the task ledger says so.
3. Shared infrastructure edits require an explicit owner in the task ledger.
4. If you need to hand work off, update the task ledger before you stop.

## Ownership Boundaries
- Feature slices:
  - One pair owns the feature surface they are shipping.
  - The other pair owns a different feature surface or a supporting subsystem.
- Shared infrastructure:
  - `src/core/data/*`
  - `src/core/shell/*`
  - docs and repo workflow files
  These require explicit ledger ownership before editing.

## PR Requirements
Each PR must include:
- task ID and owner
- affected surfaces
- verification notes
- Base44 impact:
  - `none`
  - `later sync needed`
  - `editor polish pending`

## Base44 Rule
Never leave Base44-only edits as the latest version of the product. If the editor changes behavior, port that change back to GitHub before more feature work continues.
