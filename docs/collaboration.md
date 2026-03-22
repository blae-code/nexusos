# Collaboration Workflow

## Goal
Support two humans and two AI agents working in parallel from GitHub, without requiring Base44 access for every collaborator.

## Environments
### Local simulation
- Use `VITE_DEMO_MODE=true`.
- Data is in-browser and resets on tab close.
- Best for fast iteration and risky UI experiments.

### Fastest local bypass
- Use `VITE_BYPASS_ACCESS_GATE=true`.
- The app auto-enters as the default Voyager sandbox user.
- Use this when you want to work visually without touching Discord auth or the gate flow.
- State remains local to your own browser.
- If you need to test real login or signed-out behavior, remove the flag and restart the app.

### Fastest deployed bypass
- Open the deployed app once with `?bypass_access_gate=1`.
- The app persists the bypass in local storage and enters as the default Voyager sandbox user.
- This avoids live auth and live Base44 calls for that browser session.
- Turn it off with `?bypass_access_gate=0`.

### Shared collaboration deployment
- Use a dedicated Vercel deployment.
- Set `VITE_TEMP_ACCESS_MODE=true`.
- Set `VITE_SANDBOX_MODE=shared`.
- Back `/api/demo/*` with Vercel KV for durable shared state.
- If KV is missing, the sandbox falls back to in-memory state and can split across cold starts or instances. Do not treat that as reliable shared collaboration.
- This is the team preview surface for branch reviews and integration checks.

## Sandbox Behavior
- Default session resolves to a Voyager sandbox user.
- The top-right user menu exposes a sandbox role switcher for:
  - `PIONEER`
  - `FOUNDER`
  - `SCOUT`
  - `VOYAGER`
  - `VAGRANT`
  - `AFFILIATE`
- `Replay Onboarding` sends the current sandbox user back through onboarding.
- `Reset Shared Sandbox` restores the canonical seeded state for the whole preview.

## Operating Model
1. Human A + AI A claim one scoped task.
2. Human B + AI B claim a different scoped task.
3. Both pairs validate in the Vercel collaboration deployment.
4. Both pairs merge through GitHub PRs.
5. One human with Base44 access applies optional polish later and mirrors the result back into GitHub.

## Recommended Split
- Pair 1:
  - feature delivery in a bounded product surface
- Pair 2:
  - adjacent feature slice, shared UI polish in-repo, or integration support
- Shared infra:
  - `src/core/data/*`
  - `src/core/shell/*`
  - `api/demo/*`
  - repo docs/templates
  Claim these explicitly before editing.

## Daily Loop
1. Pull latest `main`.
2. Claim or update a task in `TASK_LEDGER.md`.
3. Create a branch.
4. Build and test in local sim or the shared preview.
5. Open a PR with demo verification notes.
6. Merge to GitHub.
7. Only then consider Base44 polish, followed by an immediate GitHub sync-back.
