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
Method: REST API. Public fleet metadata reads use the FleetYards fleet slug/RSI SID. Live vehicle roster reads require an authenticated FleetYards session cookie configured as `FLEETYARDS_AUTH_COOKIE`.
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
Status: legacy compatibility path only, not part of the active login flow or the release-blocking production path.
Used by: Optional operations mirroring, rescue alerts, refinery alerts, patch alerts
