# NexusOS External Integrations

## Priority Order
1. Base44 auth/runtime configuration — CRITICAL
2. StarHead — HIGH (COMMERCE, LOGISTICS)
3. Fleetyards API — HIGH (ARMORY)
4. sc-data exports — HIGH (ARMORY)
5. UEX API — MEDIUM (COMMERCE)
6. Discord / Herald Bot — OPTIONAL BACKLOG

## Base44 Auth / Runtime
Auth method: invitation-based login with issued usernames and auth keys.
Capabilities:
  - issued-key login
  - one-time onboarding
  - Pioneer-managed key issuance, revocation, and regeneration
  - persistent session cookies with optional remember-me lifetime
Used by: Shell auth, all app surfaces
Env vars: `SESSION_SIGNING_SECRET`, `APP_URL`, frontend Base44 app variables

## StarHead
Purpose: Live commodity prices, trade routes, ship metrics.
Used by: COMMERCE (Trade), LOGISTICS (appraisal), ARMORY (ship stats)
Method: REST API, cached every 5 minutes
Priority: HIGH

## Fleetyards API
Purpose: Member ship ownership, fleet availability, vehicle loadouts.
Used by: ARMORY
Method: REST API, member authorises via OAuth2 on first ARMORY visit
Priority: HIGH

## UEX (Universal Commodity Exchange)
Purpose: Secondary commodity price source.
Used by: COMMERCE (Trade), LOGISTICS
Method: REST API polling
Priority: MEDIUM

## sc-data Community Exports
Purpose: Ship manifest, component stats, hardpoint data, FPS gear database.
Used by: ARMORY
Method: Periodic JSON ingestion
Source: community sc-data GitHub exports
Priority: HIGH

## Discord / Herald Bot
Purpose: Optional outbound notifications and Discord-side workflow automation.
Status: not part of the active login path.
Used by: Operations notifications, rescue alerts, refinery alerts, patch alerts
