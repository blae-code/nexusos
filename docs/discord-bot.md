# Herald Bot Integration

Herald Bot is the Discord delivery layer for NexusOS. The implementation lives primarily in `functions/heraldBot.ts` and is designed to degrade safely when Discord has not been fully configured yet.

## Implemented Flows
- Publish op announcements and RSVP embeds
- Transition ops to live and complete states
- Post phase briefings and debrief summaries
- Broadcast rescue alerts
- Post refinery, armory, deposit, and patch notifications
- Sync Discord scheduled events for live operations where supported
- Validate Discord setup and reachability through `functions/setupStatus.ts`

## Auth Relationship
- Member auth uses Discord OAuth through `functions/auth/*`.
- Herald Bot and OAuth are separate concerns:
  - OAuth proves member identity and rank access
  - Herald handles outbound Discord comms and interaction plumbing

## Required Environment
- `HERALD_BOT_TOKEN`
- `REDSCAR_GUILD_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_PUBLIC_KEY`
- `SESSION_SIGNING_SECRET`
- `APP_URL`
- `NEXUSOS_PUBLIC_URL`

## Channel Expectations
- `NEXUSOS_OPS_CHANNEL_ID`
- `NEXUSOS_OCR_CHANNEL_ID`
- `NEXUSOS_INTEL_CHANNEL_ID`
- `NEXUSOS_LOG_CHANNEL_ID`
- legacy org channels such as `INDUSTRY_CHANNEL_ID`, `ARMORY_CHANNEL_ID`, `COFFER_CHANNEL_ID`, and `ANNOUNCEMENTS_CHANNEL_ID` where relevant

## What Still Depends On External Setup
- Inviting the bot to the guild with the right permissions
- Creating the Discord category and channels
- Registering the Discord interactions endpoint in the Developer Portal
- Enabling scheduled jobs in Base44 for patch watchers
- Any future voice-state sync, which requires infrastructure beyond the current serverless functions

## Recommended Validation Order
1. Run `/app/admin/todo` and refresh setup status.
2. Confirm guild and channel resolution are green.
3. Publish a test op from `/app/ops/new`.
4. Move the op live and confirm Herald posts the live notice.
5. End the op and confirm debrief generation.
