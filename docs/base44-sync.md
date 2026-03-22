# Base44 Sync Rules

## Principle
Base44 is not the source of truth for feature development. GitHub is.

## When To Use Base44
- final UI polish
- editor-only layout refinement
- publish-time checks

## Safe Sequence
1. Start from the latest GitHub `main`.
2. Make the minimum Base44 editor changes needed.
3. Publish only after the GitHub branch is green.
4. Mirror the exact Base44 changes back into the repo immediately.
5. Re-run:
   - `npm run build`
   - `npm run base44:check`

## What Not To Do
- Do not prototype major features only in Base44.
- Do not let Base44 drift from GitHub for more than a single edit session.
- Do not let collaborators without Base44 access depend on editor-only changes.

## Checklist Before Base44 Publish
1. GitHub branch merged or ready.
2. Shared preview verified.
3. Base44 impact noted in the PR.
4. Any editor-side changes copied back into the repo.
5. Repo checks rerun after the sync-back.
