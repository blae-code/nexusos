# NexusOS Architecture

NexusOS is a Base44-backed operations console for Redscar Nomads. The app is structured around a thin React client, Base44 entities for shared state, and serverless functions for Discord, patch intelligence, and authenticated session work.

## Client Layers

- `src/App.jsx` defines the public gate and authenticated `/app/*` route tree.
- `src/core/data/SessionContext.jsx` owns member/admin session hydration and gate enforcement.
- `src/core/shell/*` provides the persistent shell, nav, topbar, alerts, and session-aware chrome.
- `src/pages/*` contains routed surfaces for commerce, logistics, coffer, roster, archive, settings, admin setup, and shell-owned pages.
- `src/apps/*` contains larger domain modules reused across routed pages, especially Industry Hub, Op Board, and Scout Intel.

## Visual Architecture Direction

The visual direction is now defined in two layers:

- `NEXUSOS_AI_HANDOFF.md` is authoritative for design principles and sequencing.
- `docs/design-system.md` is the implementation summary for the active repo.

Current UI code still lives mainly under `src/core/shell/*`, `src/pages/*`,
and `src/apps/*`, but future shared visual primitives should converge on:

- `src/core/shell/components/AmbientBackground.jsx`
- `src/core/shell/useOperationalState.js`
- `src/core/shell/depth.css`
- `src/core/design/components/MFDPanel.jsx`
- `src/core/design/animations.css`
- `src/core/design/hooks/useCountUp.js`
- `src/core/design/hooks/useAnimatedList.js`

These targets support the current visual roadmap:

1. Living background rendered once at shell level
2. Shell-wide live-op colour temperature shift
3. MFD panel adoption on data-dense surfaces
4. Shared data animation hooks for numeric and list updates
5. Display typography for major headings and large numbers
6. Depth transitions for foreground panels and overlays

## Shared Data Model

- `Op`, `OpRsvp`, `CraftQueue`, `RefineryOrder`, `ScoutDeposit`, `NexusUser`, `Wallet`, `Transaction`, `Contract`, `CargoJob`, and `Consignment` are the main entities surfaced by the current UI.
- Rescue supports a dual-mode path: if a `RescueCall` entity exists, the board behaves as shared org state; otherwise it falls back to browser-backed local state so the page still works in incomplete environments.
- Route surfaces subscribe to entity updates where live state matters, especially Op Board, Coffer, Rescue, and Roster.

## Auth Model

- Member auth uses Discord OAuth and a signed session cookie exposed through `functions/auth/*`.
- Base44 System Admin users bypass the member Discord gate and hydrate through the same session context without onboarding.
- The shell is the authenticated boundary; `/gate` is the only public member entrypoint.

## Simulation / Demo Mode

When local simulation or temporary-access sandboxing is enabled through `VITE_DEMO_MODE`, `VITE_BYPASS_ACCESS_GATE`, `VITE_TEMP_ACCESS_MODE`, or the System Admin sandbox bootstrap, `IS_DEV_MODE` in `src/core/data/dev/index.js` is `true`. In this mode:

- `authApi.getSession/logout/getHealth` short-circuit to in-memory mock responses; no real auth server is contacted.
- `base44Client` returns `createMockBase44Client()` or the shared sandbox client instead of the real SDK client. Local entity CRUD works against an in-memory store (`src/core/data/dev/mockStore.js`) seeded with synthetic data.
- `SessionContext.refreshSession` skips the Base44 admin fallback fetches so the gate loads instantly.
- The Access Gate shows a persona picker (Pioneer → Affiliate) instead of the Discord login button.
- Shell chrome shows four SIMULATION indicators: amber banner above topbar, pulsing `SIM` pill in topbar, `SIM` foot at bottom of sidebar, diagonal watermark in content area.
- To disable: remove the relevant sandbox flag or runtime bypass toggle and redeploy or hard-refresh.

## Discord / Backend Functions

- `functions/heraldBot.ts` is the Discord delivery layer for op publishing, live transitions, debriefs, rescue alerts, deposit alerts, armory notices, and patch notices.
- `functions/setupStatus.ts` audits environment readiness, Discord reachability, guild/channel resolution, and bot capability for the setup dashboard.
- Patch intelligence is handled by `rssCheck.ts`, `patchDigest.ts`, `patchDigestProcessor.ts`, `patchFeedPoller.ts`, and `patchIntelligenceAgent.ts`.
- Auth/session work lives under `functions/auth/`.

## Delivery Path For Rockbreaker

1. Member or admin enters via `/gate`.
2. Industry and Scout surfaces establish deposit, blueprint, and craft readiness.
3. `/app/ops/new` creates a Rockbreaker op using the richer Op Board creator module.
4. Herald publishes to Discord when enabled.
5. `/app/ops/:id` drives phase progression, supply chain logging, threat broadcasts, and wrap-up.

## Runtime Constraints

- The frontend must work both locally under Vite and inside Base44 preview/embed contexts.
- Storage access is guarded through safe wrappers because Base44 preview runtimes can restrict `localStorage`.
- Relative asset paths and mount-aware routing are required because Base44 can mount the app under a subpath.
- Shell-level ambient effects must be rendered once and must not interfere with
  Base44 preview/editor stability or data density during live operations.
