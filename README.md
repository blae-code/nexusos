# NexusOS

NexusOS is the Redscar Nomads operations console for Industry, Scout Intel, Op Board, Rescue, and org readiness workflows, deployed through Base44 and integrated with Discord via Herald Bot.

The UI direction targets an in-verse Star Citizen operations console: ambient
shell depth, restrained color, MFD-style panels, and animated live data rather
than generic web-app chrome.

## Local Development
1. Clone the repository.
2. Run `npm install`.
3. Create `.env.local` with the frontend Base44 variables:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
```

4. Start the client with `npm run dev`.

Any change pushed to the repo is also reflected in the Base44 builder.

## Collaboration Mode
Use GitHub as the source of truth. Base44 is downstream for later polish/publish only.

### Local visual development
1. Set `VITE_DEMO_MODE=true` in `.env.local`.
2. Run `npm run dev`.
3. Use the gate persona buttons or the top-right sandbox switcher to move between ranks.

### Shared Vercel collaboration deployment
1. Create a separate Vercel project for this repo.
2. Set:
   - `VITE_TEMP_ACCESS_MODE=true`
   - `VITE_SANDBOX_MODE=shared`
   - `DEMO_SANDBOX_NAMESPACE=<team-or-branch-name>`
   - `DEMO_SANDBOX_SEED_VERSION=v1`
3. Add Vercel KV credentials. Without KV, the shared sandbox falls back to per-instance memory and is not reliable collaboration infrastructure.
4. Deploy branches to Vercel previews and keep one stable shared demo deployment for team validation.
5. In the shared demo:
   - default access resolves to a Voyager sandbox user
   - use the top-right sandbox menu to switch between `PIONEER`, `FOUNDER`, `SCOUT`, `VOYAGER`, `VAGRANT`, and `AFFILIATE`
   - use `Replay Onboarding` to test onboarding
   - use `Reset Shared Sandbox` to restore the canonical seed

## Operational Docs
- [Architecture](./docs/architecture.md)
- [Collaboration Workflow](./docs/collaboration.md)
- [Base44 Sync Rules](./docs/base44-sync.md)
- [Design System](./docs/design-system.md)
- [AI Handoff](./NEXUSOS_AI_HANDOFF.md)
- [Discord Bot](./docs/discord-bot.md)
- [Rockbreaker Live Runbook](./docs/rockbreaker-live-runbook.md)
- [Versioning](./docs/versioning.md)
- [Contributing](./CONTRIBUTING.md)
- [Task Ledger](./TASK_LEDGER.md)

## Release and Verification
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run base44:check`
- `npm run version:check`

Use `.\version-bump.ps1 patch|minor|major "release note"` for releases. Version metadata is kept in sync automatically from `version.json`.

## Deployment
Publish from Base44 after the branch is green and the required Discord/Base44 environment is configured.

For collaborative feature work, publish the GitHub/Vercel demo deployment first and keep Base44 edits as a later, mirrored step.

Base44 docs: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
