# NexusOS — Redscar Nomads · Project Context for Claude

## What this is
NexusOS is a Star Citizen org intranet/OS PWA for Redscar Nomads.
Stack: Base44 (backend/DB), React (frontend), discord.js v14 (Herald Bot),
Claude API (hidden AI layer), VS Code + Claude Code (this environment).

## Critical architecture decisions
- TWO auth tiers: blae@katrasoluta.com uses Base44 native email auth only.
  All org members use invitation-based auth: issued username + auth key
  (RSN-XXXX-XXXX-XXXX format). No email, no passwords, no Discord OAuth2
  login flow for members. Keys issued by Pioneer+, bcrypt-hashed, never stored plain.
- Discord is the rank authority. Bot syncs roles every 30min. Discord is NOT
  part of the login flow — auth is purely invitation-key-based.
- Claude API is NEVER surfaced to users. All AI outputs appear as system
  features — insights, recommendations, OCR results. No "AI" label anywhere.
- Status colours only: green = live/ready, amber = warn, red = danger.
  All other UI in slate-blue-grey neutral ramp. No decorative colour.
- Font: monospace throughout. Terminal/mil-spec aesthetic.
- Base colours: bg #07080b, text #dde1f0, accent #5a6080.
- Visual ambition: NexusOS should feel like it was built inside Star Citizen,
  not like a generic web app with a dark theme.
- Depth comes from z-layers, scale, and opacity shifts, not decorative shadows.
- The shell should trend toward a single ambient background, subtle live-op
  colour temperature shifts, MFD-style panels, and animated data updates.
- Barlow Condensed is reserved for large numeric values and primary headings
  only; labels, controls, timestamps, and body copy stay on the mono stack.

## Member auth model
Invitation-based auth is the member authentication standard.
Members log in at /gate with an issued username + auth key (RSN-XXXX-XXXX-XXXX).
Keys are issued and revoked by Pioneer+ via Key Management (/app/keys).
Discord roles remain the canonical source of NexusOS rank, synced on login
and every 30 minutes in the background. Discord is not a login step.

## Discord channel bindings
#nexusos-ops   → op embeds, RSVP, phase updates, wrap-up
#nexusos-ocr   → screenshot OCR submissions
#nexusos-intel → scout pings
#nexusos-log   → system log (refinery ready, blueprint drops, etc.)
Existing: #ARMORY #COFFER #INVOICES #INDUSTRY #RANGERS #PTU-CHAT

## Module status

All core frontend modules are built. Remaining work is shell polish and Herald Bot.

Built (routed and live):

1. Access Gate (/gate) — invitation auth, star field bg, verse status bar
2. Industry Hub (/app/industry) — Materials, Blueprints, CraftQueue, RefineryOrders, OCR, Analytics
3. Op Board (/app/ops) — create, live op, phase tracker, readiness gate, crew grid, split calc
4. Scout Intel (/app/scout) — SVG system map, deposit logging, route planner
5. Commerce (/app/industry/commerce) — wallet, trade desk, contracts
6. Logistics (/app/industry/logistics) — cargo board, manifest, consignment, dispatch
7. Armory (/app/armory) — inventory, checkouts, fleet sub-pages
8. Epic Archive (/app/ops/archive) — completed ops, leaderboards, patch history

Not yet built:
9. Herald Bot (functions/heraldBot.ts) — currently a stub; full spec in docs/discord-bot.md

Shell visual design (see NEXUSOS_AI_HANDOFF.md for priority order):

- AmbientBackground, operational colour temperature, data animation hooks,
  Barlow Condensed display font, spatial depth system — all pending

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
See docs/architecture.md for full DB schema, API integration spec, and target
locations for shell/design architecture work.
See NEXUSOS_AI_HANDOFF.md for the authoritative "Visual Design Direction -
Cutting Edge Standard" section and implementation order.
When building any UI component, match the NexusOS shell aesthetic exactly —
no cards with white backgrounds, no rounded hero sections, no gradients.

## What NOT to do
- Do not add email auth for regular users
- Do not expose Claude API calls or label anything as "AI"  
- Do not use colours decoratively — status meaning only
- Do not build separate CSS files — keep styles co-located in components
- Do not access browser storage directly; use the repo's safe wrappers and
  shared session/layout utilities
```

---

## Day-to-day workflow in VS Code

**Starting a session** — open the integrated terminal, `cd` into the repo, run `claude`. It reads `CLAUDE.md` and is immediately context-aware. Then give it a scoped task:
```
Build the Access Gate page at /gate. Match the NexusOS 
design system in CLAUDE.md. Use the auth flow spec in 
docs/architecture.md. No white backgrounds, no gradients.
