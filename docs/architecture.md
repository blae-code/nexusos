# NexusOS Architecture

NexusOS is a Base44-backed operations console for Redscar Nomads. The app is structured around a thin React client, Base44 entities for shared state, and serverless functions for Discord, patch intelligence, and authenticated session work.

## Client Layers
- `src/App.jsx` defines the public gate and authenticated `/app/*` route tree.
- `src/lib/SessionContext.jsx` owns member/admin session hydration and gate enforcement.
- `src/components/shell/*` provides the persistent shell, nav, topbar, alerts, and session-aware chrome.
- `src/pages/*` contains routed surfaces for Industry, Op Board, Scout, Rescue, Coffer, Roster, Archive, Settings, and admin setup.
- `src/app/modules/*` contains larger domain modules reused across routed pages, especially Op Board and Scout Intel.

## Shared Data Model
- `Op`, `OpRsvp`, `CraftQueue`, `RefineryOrder`, `ScoutDeposit`, and `NexusUser` are the primary Base44 entities used by the UI.
- Rescue supports a dual-mode path: if a `RescueCall` entity exists, the board behaves as shared org state; otherwise it falls back to browser-backed local state so the page still works in incomplete environments.
- Route surfaces subscribe to entity updates where live state matters, especially Op Board, Coffer, Rescue, and Roster.

## Auth Model
- Member auth uses Discord OAuth and a signed session cookie exposed through `functions/auth/*`.
- Base44 System Admin users bypass the member Discord gate and hydrate through the same session context without onboarding.
- The shell is the authenticated boundary; `/gate` is the only public member entrypoint.

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
