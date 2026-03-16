# NexusOS

NexusOS is the Redscar Nomads operations console for Industry, Scout Intel, Op Board, Rescue, and org readiness workflows, deployed through Base44 and integrated with Discord via Herald Bot.

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

## Operational Docs
- [Architecture](./docs/architecture.md)
- [Design System](./docs/design-system.md)
- [Discord Bot](./docs/discord-bot.md)
- [Rockbreaker Live Runbook](./docs/rockbreaker-live-runbook.md)
- [Versioning](./docs/versioning.md)

## Release and Verification
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run base44:check`
- `npm run version:check`

Use `.\version-bump.ps1 patch|minor|major "release note"` for releases. Version metadata is kept in sync automatically from `version.json`.

## Deployment
Publish from Base44 after the branch is green and the required Discord/Base44 environment is configured.

Base44 docs: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
