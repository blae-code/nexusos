# NexusOS

NexusOS is the Redscar Nomads second-monitor operations OS for Star Citizen. It runs on Base44, uses Discord SSO for member access, and keeps live org operations, industry, intel, fleet readiness, commerce, and logistics in one shell.

## Apps
- `OPERATIONS` — create, publish, run, and wrap live org operations.
- `INTEL` — log deposits, track freshness, and support route decisions.
- `ARCHIVE` — preserve completed-op history, outcomes, and leaderboards.
- `INDUSTRY` — manage materials, blueprints, craft queue, and refinery flow.
- `ARMORY` — track gear, ship support inventory, checkouts, and dispatch readiness.
- `COMMERCE` — manage wallets, coffer visibility, trade tooling, and contracts.
- `LOGISTICS` — coordinate cargo jobs, manifests, consignment, and dispatch handoff.

## Local Development
1. Run `npm install`.
2. Create `.env.local` from [`.env.example`](./.env.example).
3. Set the frontend Base44 values:

```env
VITE_BASE44_APP_ID=
VITE_BASE44_APP_BASE_URL=
VITE_BASE44_FUNCTIONS_VERSION=
```

4. Make sure the Discord auth variables in `.env.example` are configured in the Base44 function environment for local or preview testing.
5. Start the app with `npm run dev`.
6. Open `/gate` and authenticate through Discord SSO. Member access is Discord-only. The Base44 System Admin path remains separate for the owner account.

## Docs
- [Architecture](./docs/architecture.md)
- [Integrations](./docs/integrations.md)
- [Herald Bot](./docs/herald-bot.md)
- [Rockbreaker Live Runbook](./docs/rockbreaker-live-runbook.md)
- [Design System](./docs/design-system.md)
- [AI Handoff](./NEXUSOS_AI_HANDOFF.md)
- [Versioning](./docs/versioning.md)

## Available npm Scripts
- `npm run dev` — start the Vite development server
- `npm run build` — produce a production build
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint with zero-warning enforcement in CI-style flows
- `npm run lint:fix` — apply automatic ESLint fixes
- `npm run typecheck` — run the TypeScript checker against `jsconfig.json`
- `npm run armory:ingest` — ingest community sc-data into ARMORY JSON datasets
- `npm run base44:check` — audit the repo for Base44-editor-hostile patterns
- `npm run version:sync` — regenerate versioning metadata from the canonical version source
- `npm run version:check` — verify version docs and generated metadata are in sync
- `npm run prepare` — install the repo-managed git hooks

## Release
Run `npm run lint`, `npm run build`, `npm run typecheck`, and `npm run version:check` before release. Use `.\version-bump.ps1 patch|minor|major "release note"` to cut a version and sync changelog metadata.

## Deployment
Deploy through Base44 after the branch is green and the Discord/Base44 environment is configured correctly.
