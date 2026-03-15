# NexusOS — Redscar Nomads · Project Context for Claude

## What this is
NexusOS is a Star Citizen org intranet/OS PWA for Redscar Nomads.
Stack: Base44 (backend/DB), React (frontend), discord.js v14 (Herald Bot),
Claude API (hidden AI layer), VS Code + Claude Code (this environment).

## Critical architecture decisions
- TWO auth tiers: blae@katrasoluta.com uses Base44 native email auth only.
  All org members use callsign + permanent auth key (RSN-XXXX-XXXX-XXXX
  format, bcrypt stored) + Discord OAuth2. No passwords for members ever.
- Discord is the SINGLE source of truth for rank. Bot syncs roles every 30min.
- Claude API is NEVER surfaced to users. All AI outputs appear as system
  features — insights, recommendations, OCR results. No "AI" label anywhere.
- Status colours only: green = live/ready, amber = warn, red = danger.
  All other UI in slate-blue-grey neutral ramp. No decorative colour.
- Font: monospace throughout. Terminal/mil-spec aesthetic.
- Base colours: bg #07080b, text #dde1f0, accent #5a6080.

## Auth key format
RSN-XXXX-XXXX-XXXX · bcrypt hash stored · never expires unless revoked
key_prefix (RSN-XXXX) stored separately for display in Key Management

## Discord channel bindings
#nexusos-ops   → op embeds, RSVP, phase updates, wrap-up
#nexusos-ocr   → screenshot OCR submissions
#nexusos-intel → scout pings
#nexusos-log   → system log (refinery ready, blueprint drops, etc.)
Existing: #ARMORY #COFFER #INVOICES #INDUSTRY #RANGERS #PTU-CHAT

## Modules to build (priority order)
1. Access Gate (/gate) — login page with star field bg
2. Key Management (/app/admin/keys) — Pioneer+ only
3. Industry Hub (/app/industry) — Overview, Materials, Blueprints, Queue
4. Op Board (/app/ops) — create, live op, phase tracker, readiness gate
5. Scout Intel (/app/scout) — SVG system map, deposit logging
6. Fleet Forge (/app/fleet) — ship fitting, Erkul-style
7. Profit Calc (/app/profit)
8. Herald Bot (src/bot/) — discord.js v14, slash commands, OCR listener

## OCR pipeline
Discord attachment → Herald Bot → Base44 OCR endpoint → Claude Vision API
→ structured JSON → appropriate table. Three paths: Discord drop / NexusOS
upload / mobile Discord. Preview embed with Confirm/Edit/Discard buttons.

## External APIs
- starcitizen-api.com (SC_API_KEY) — roster, ships, roadmap
- api.star-citizen.wiki/api/v2 — items, vehicles, commodities, starmap
- UEX Corp — commodity prices every 15min
- RSI Comm-Link RSS via leonick.se/feeds/rsi/atom
- RSI server status — every 60s

## Design reference
See docs/design-system.md for full token values and component patterns.
See docs/architecture.md for full DB schema and API integration spec.
When building any UI component, match the NexusOS shell aesthetic exactly —
no cards with white backgrounds, no rounded hero sections, no gradients.

## What NOT to do
- Do not add email auth for regular users
- Do not expose Claude API calls or label anything as "AI"  
- Do not use colours decoratively — status meaning only
- Do not build separate CSS files — keep styles co-located in components
- Do not use localStorage in any artifact or component
```

---

## Day-to-day workflow in VS Code

**Starting a session** — open the integrated terminal, `cd` into the repo, run `claude`. It reads `CLAUDE.md` and is immediately context-aware. Then give it a scoped task:
```
Build the Access Gate page at /gate. Match the NexusOS 
design system in CLAUDE.md. Use the auth flow spec in 
docs/architecture.md. No white backgrounds, no gradients.