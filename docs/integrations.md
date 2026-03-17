# NexusOS External Integrations

## Priority Order
1. Discord API / Herald Bot — CRITICAL (auth)
2. StarHead — HIGH (COMMERCE, LOGISTICS)
3. Fleetyards API — HIGH (ARMORY)
4. sc-data exports — HIGH (ARMORY)
5. UEX API — MEDIUM (COMMERCE)
6. RSI verification — MEDIUM (security)

## Discord API (Herald Bot)
Auth method: Discord OAuth2 SSO exclusively.
No keys, no passwords, no manual entry.
Capabilities:
  - OAuth2 SSO (sole authentication method)
  - Role sync: nexus_rank from Discord roles,
    refreshed every 30 minutes
  - Op publish notification to #ops-board
  - RSVP confirmation DM to member
  - Refinery ready alert to member
  - Split results posted to channel
  - Member RSI verification on first login
Used by: Shell (auth), all apps (notifications)
Env vars: DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
Docs: docs/herald-bot.md

## StarHead
Purpose: Live commodity prices, trade routes,
ship metrics.
Used by: COMMERCE (Trade), LOGISTICS
  (appraisal), ARMORY (ship stats)
Method: REST API, cached every 5 minutes
Client: src/core/data/starhead.js (to build)
Priority: HIGH

## Fleetyards API
Purpose: Member ship ownership, fleet
availability, vehicle loadouts.
Used by: ARMORY
Method: REST API, member authorises via OAuth2
  on first ARMORY visit
Client: src/core/data/fleetyards.js (to build)
Priority: HIGH

## RSI Public Organisation Page
Purpose: Lightweight membership verification.
On first Discord SSO login, Herald Bot checks
the RSI handle against the public Redscar org
member list before granting access.
Method: Single read-only HTTP lookup only.
No broad scraping. Respectful of rate limits.
Fallback: Discord role sync if RSI lookup fails.
Priority: MEDIUM

## UEX (Universal Commodity Exchange)
Purpose: Secondary commodity price source.
Used by: COMMERCE (Trade), LOGISTICS
Method: REST API polling
Client: src/core/data/uex.js (to build)
Priority: MEDIUM

## sc-data Community Exports
Purpose: Ship manifest, component stats,
hardpoint data, FPS gear database.
Used by: ARMORY
Method: Periodic JSON ingestion via
  scripts/ingest-ship-data.js (to build)
Source: community sc-data GitHub exports
Priority: HIGH
