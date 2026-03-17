# NexusOS — AI Handoff Document
**Project:** nexusos-redscar  
**Repo:** https://github.com/blae-code/nexusos  
**Owner:** blae@katrasoluta.com (System Administrator)  
**Org:** Redscar Nomads — Star Citizen industrial org  
**Stack:** Base44 Elite 1 · React · discord.js v14 · Claude API · Deno (Base44 functions)  
**Last updated by:** Claude Sonnet 4.6 (claude.ai session, March 2026)

---

## Purpose of this document

This document is the single source of truth for any AI assistant continuing
work on NexusOS. It captures not just the spec but the reasoning behind every
architectural decision, so that Claude Code, Base44's AI, GitHub Copilot, or
any other assistant can continue without regressing on decisions already made.

If you are an AI reading this: treat every decision in this document as final
unless the human owner explicitly overrides it in the current session. Do not
"improve" things by adding email auth, white card backgrounds, AI labels,
gradients, or any pattern that contradicts the design principles below.

---

## What this project is

NexusOS is a Progressive Web App that functions as an org intranet/OS for
Redscar Nomads. It replaces Regolith.rocks (shutting down) and extends beyond
it with 4.7 crafting economy features. Members use it on a second monitor
during Star Citizen gameplay. The aesthetic is a ship's onboard computer —
mil-spec terminal, not a gaming website.

Core modules (in priority order):
1. Access Gate — full-screen login at /gate
2. Industry Hub — materials, blueprints, craft queue, refinery at /app/industry
3. Op Board — operation creation, live op management at /app/ops
4. Scout Intel — SVG system map, deposit logging at /app/scout
5. Armory — inventory, checkouts, fleet support at /app/armory
6. Commerce — wallet, coffer, trade, contracts at /app/commerce
7. Logistics — cargo jobs, manifests, dispatch at /app/logistics
8. Epic Archive — completed ops, leaderboards at /app/archive
9. Herald Bot — discord.js v14 bot at src/bot/

---

## What is already built and committed

### functions/ocrExtract.ts — COMPLETE, PATCHED
Full OCR pipeline. Takes a file_url, sends to Claude Vision via Base44
InvokeLLM, extracts structured data, writes to appropriate entity tables.

Screen types handled:
- INVENTORY → Material entity (bulk insert, t2_eligible auto-flagged at 80%)
- REFINERY_ORDER → RefineryOrder entity
- TRANSACTION → CofferLog entity
- MINING_SCAN → returns pending_confirmation (user confirms before saving)
- CRAFT_QUEUE → returns pending_confirmation (user confirms before saving)
- SHIP_STATUS → returns pending_confirmation (user confirms before saving)

Patches applied:
- Callsign fallback uses user.callsign NOT user.email (members have no email)
- CRAFT_QUEUE and SHIP_STATUS handlers added after MINING_SCAN block
- All six screen types present in the response_json_schema enum

DO NOT revert the callsign fix. Members authenticate via Discord OAuth2 SSO.
There is no email field for regular users in the system.

### functions/generateInsight.ts — COMPLETE, PATCHED
Reads current org state (Materials, CraftQueue, RefineryOrders, ScoutDeposits)
and generates one actionable insight via Claude InvokeLLM.

Patches applied:
- action_1_prompt and action_2_prompt added to response_json_schema
- LLM prompt instructs Claude to populate those fields with specific follow-up
  questions that fire when users click action buttons in the UI

The insight block in the UI must NOT be labelled "AI" or "Powered by Claude".
It appears as a system alert. This is intentional. See AI visibility rules below.

### functions/heraldBot.ts — STUB, NEEDS BUILDING
Currently minimal. Full Herald Bot spec is in docs/discord-bot.md.

### src/components/shell/NexusSidebar.jsx — BASE SCAFFOLD
Base44-generated sidebar shell. Needs styling updated to match design tokens.

### src/pages/NexusTodo.jsx — PLACEHOLDER
Base44-generated page. Can be removed or repurposed.

### CLAUDE.md — PROJECT MEMORY
Read this file at the start of every Claude Code session. It contains the
condensed version of this document for fast context loading.

---

## Authentication architecture — CRITICAL, DO NOT CHANGE

### Two tiers — completely separate, never mixed

**TIER 1 — System Administrator only:**
- Account: blae@katrasoluta.com
- Auth: Base44 native email/password (Base44 handles this, no custom code)
- Entry: /admin (Base44 default admin panel)
- Display name: "System Administrator" — hardcoded, not an org rank
- Permissions: sudo all, dev mode, Base44 editor
- This account does NOT appear in the nexus_users table
- Never add email auth for any other user. Never.

**TIER 2 — All org members:**
- Auth: Discord OAuth2 SSO only
- Entry: /gate (the Access Gate page)
- No email stored. No password stored. No Base44 native auth.
- Flow:
  1. Member visits /gate
  2. Discord OAuth2 SSO redirects to Discord
  3. Server reads Discord ID + guild roles
  4. Session created. nexus_users record created or updated.
  5. Discord role sync runs on login + every 30 minutes background

**Discord as rank authority:**
Discord server roles are the ONLY source of truth for org rank.
Bot reads roles on every login + background sync every 30 minutes.
Rank mapping (Discord role → nexus_rank enum):
  "The Pioneer" → PIONEER  (all perms, delete, invite, gate control)
  "Founder"     → FOUNDER  (all perms, invite)
  "Voyager"     → VOYAGER  (invite, create op, scout log, armory edit)
  "Scout"       → SCOUT    (RSVP, scout log, armory view)
  "Vagrant"     → VAGRANT  (RSVP, scout view)
  "Affiliate"   → AFFILIATE (public tabs only)

---

## Database schema

All tables live in Base44. Full schema below.

```
nexus_users
  discord_id        BIGINT PK
  callsign          VARCHAR(40)
  discord_roles     JSON
  nexus_rank        ENUM(PIONEER,FOUNDER,VOYAGER,SCOUT,VAGRANT,AFFILIATE)
  roles_synced_at   TIMESTAMP
  joined_at         TIMESTAMP
  -- NO email. NO password hash. NO Base44 user_id link for members.

ops
  id                UUID PK
  name              VARCHAR(120)
  type              VARCHAR(40)   -- FOCUSED_EVENT, PATROL, SALVAGE, etc.
  system_name       VARCHAR(40)   -- Nyx, Pyro, Stanton
  location          VARCHAR(80)
  access_type       ENUM(EXCLUSIVE, SHARED)
  buy_in_cost       INTEGER
  scheduled_at      TIMESTAMP
  created_by        BIGINT FK nexus_users
  status            ENUM(DRAFT, PUBLISHED, LIVE, COMPLETE, ARCHIVED)
  discord_event_id  VARCHAR(30)
  discord_message_id VARCHAR(30)
  phase_current     INTEGER DEFAULT 0
  phases            JSON
  readiness_gate    JSON
  role_slots        JSON
  reminders_enabled BOOLEAN DEFAULT true
  post_phase_updates BOOLEAN DEFAULT true
  auto_wrap_up      BOOLEAN DEFAULT true
  started_at        TIMESTAMP
  ended_at          TIMESTAMP
  session_log       JSON
  created_at        TIMESTAMP

op_rsvps
  id UUID PK | op_id FK | discord_id FK | role VARCHAR(30)
  ship VARCHAR(60) | status ENUM(CONFIRMED,DECLINED,TENTATIVE) | created_at

Material (Base44 entity name)
  material_name | wiki_commodity_id | material_type ENUM(RAW,REFINED,SALVAGE,CRAFTED)
  quantity_scu DECIMAL | quality_pct DECIMAL | t2_eligible BOOLEAN
  location | container | logged_by BIGINT | logged_by_callsign VARCHAR
  source_type ENUM(MANUAL,OCR_DISCORD,OCR_UPLOAD,OCR_MOBILE)
  screenshot_ref | notes | logged_at | session_id FK ops

ScoutDeposit (Base44 entity name)
  material_name | wiki_commodity_id | system_name | location_detail
  quality_pct | volume_estimate ENUM(SMALL,MEDIUM,LARGE,MASSIVE)
  risk_level ENUM(LOW,MEDIUM,HIGH,EXTREME) | ship_type | notes
  reported_by BIGINT | reported_at | confirmed_votes | stale_votes
  is_stale BOOLEAN | op_id FK | coords_approx

Blueprint (Base44 entity name)
  item_name | wiki_item_id | category ENUM(WEAPON,ARMOR,GEAR,COMPONENT,CONSUMABLE)
  tier ENUM(T1,T2) | owned_by BIGINT FK | is_priority BOOLEAN
  priority_note | recipe_materials JSON | added_at

CraftQueue (Base44 entity name)
  blueprint_id FK | requested_by BIGINT | claimed_by BIGINT
  quantity | priority_flag BOOLEAN | op_id FK
  status ENUM(OPEN,CLAIMED,IN_PROGRESS,COMPLETE,CANCELLED)
  notes | aUEC_value_est | created_at | completed_at

RefineryOrder (Base44 entity name)
  material_name | quantity_scu | method | yield_pct | cost_aUEC
  station | submitted_by BIGINT | submitted_by_callsign
  started_at | completes_at | status ENUM(ACTIVE,READY,COLLECTED)
  source_type

CofferLog (Base44 entity name)
  entry_type ENUM(SALE,CRAFT_SALE,OP_SPLIT,EXPENSE,DEPOSIT)
  amount_aUEC | commodity | quantity_scu | station
  logged_by BIGINT | logged_by_callsign | op_id FK
  source_type | screenshot_ref | logged_at

FleetBuild (Base44 entity name)
  ship_name | wiki_vehicle_id | build_name | role_tag
  hardpoints JSON | power_allocation JSON | stats_snapshot JSON
  created_by BIGINT | op_bundle | patch_version | patch_locked BOOLEAN
  is_org_canonical BOOLEAN | build_url | created_at

patch_digests
  id UUID PK | patch_version | comm_link_url | raw_text
  industry_summary | changes_json JSON | published_at | processed_at

discord_posts_log
  id UUID PK | channel_id | message_id | post_type | op_id FK
  payload_json JSON | posted_at
```

---

## Design system — ENFORCED

These rules were established through multiple iteration rounds and are final.

### Colour
Status colours ONLY for semantic meaning. Never decorative.
  --live  : #27c96a  (green)  → server online, ready, craft-ready, confirmed
  --warn  : #e8a020  (amber)  → below threshold, timer counting, pending
  --danger: #e04848  (red)    → threat, error, danger
  --info  : #4a8fd0  (blue)   → informational, links, Discord-related

Everything else uses the neutral slate-blue-grey ramp:
  --bg0: #07080b   --bg1: #0c0e13   --bg2: #10121a
  --bg3: #161921   --bg4: #1c1f2a   --bg5: #222535
  --b0:  #161820   --b1:  #1e2130   --b2:  #272b3c   --b3: #323648
  --t0:  #dde1f0   --t1:  #8890a8   --t2:  #4a5068   --t3: #2a2e40
  --acc: #5a6080   --acc2: #7a8098

### Typography
Font: 'SF Mono', ui-monospace, monospace — ALL UI text, everywhere.
No serif. No system sans-serif. The terminal aesthetic is non-negotiable.
Border width: 0.5px solid throughout (never 1px for structural borders).
Border radius: 6–8px tags/buttons, 8–12px cards, 50% avatars.

### Components
- No white card backgrounds. Cards use --bg1 or --bg2.
- No gradients anywhere. Flat solid fills only.
- No drop shadows. Depth is created with background steps, not shadows.
- No rounded corners on single-sided borders.
- Quality bars: neutral grey ramp only (brightness encodes quality, not colour).
  CRAFT-READY status flag (green) does the semantic work, not the bar colour.
- Stat card micro-bars: 2px height, --b1 background, --acc fill.
  Warning state only: fill switches to --warn.
- Sidebar: 46–50px wide, icon-only, 34–36px icon buttons.
- Topbar: 44px height, logo left, status pills centre, user chip right.
- Tabs: 10–11px, letter-spacing .1em, active = --t0 + 1.5px bottom border --acc2.
- Section headers: 9px, --t3, letter-spacing .15em, ::after line fills remaining width.

### AI visibility rule — CRITICAL
Claude API is invisible to users. Every AI output appears as a system feature.
- The insight strip is labelled "OP READINESS" or similar — never "AI Insight"
- Action buttons say "Plan run", "Full costing" — never "Ask AI"
- OCR results appear as extracted data — never "AI extracted"
- No Claude logo, no "Powered by" attribution, no model names in UI

---

## Visual Design Direction — Cutting Edge Standard

This section defines the visual and experiential
ambition for NexusOS. Every implementation decision
should be evaluated against these principles. The
target is an interface that feels like it was built
inside the Star Citizen universe — not a web app
that Star Citizen players happen to use.

---

### Principle 1 — Spatial Depth

The interface must have perceivable depth. Elements
are not all equidistant from the viewer. Foreground
elements feel physically closer, background elements
recede. This is achieved through:

- A z-index depth system with three layers:
  background (ambient), surface (content), and
  foreground (active panels, drawers, modals)
- Surface panels that open over list views use a
  very subtle scale shift (1.00 → 1.01) and a
  1px upward translate to suggest physical proximity
- Background content behind an active panel dims
  to 60% opacity rather than being overlaid with
  a flat colour
- No decorative box-shadows. Depth is communicated
  through opacity, scale, and z-position only.

Implementation location: src/core/shell/depth.css

---

### Principle 2 — Living Background

The main app shell background must feel like it
exists in space rather than on a static surface.
This is ambient — it should only be noticed when
content is absent.

Specification:
- A canvas or SVG layer rendered behind all app
  content at z-index -1
- 60–80 particles distributed across the viewport,
  three size classes (1px, 1.5px, 2px), avoiding
  a 120px margin around the content area
- Particle opacity: 0.03 to 0.08 only
- Each particle has an independent slow drift
  animation: 80–140s duration, randomised direction,
  looping seamlessly
- A very subtle radial gradient centred on the
  viewport at 4% opacity using var(--acc-rgb) —
  this creates the impression of a distant light
  source without being visible as a gradient
- The background does not respond to cursor
  movement (parallax is too distracting in a
  data-dense environment)
- Particle canvas fades out to opacity 0 when
  a modal overlay is active

Implementation location:
  src/core/shell/components/AmbientBackground.jsx
  Rendered once in Shell.jsx, never in individual
  app pages.

---

### Principle 3 — Operational Colour Temperature

When a live op is active anywhere in the org,
the entire shell subtly shifts from cool to warm.
This is the single most powerful way to make the
interface feel responsive to real-world events.

Specification:
- Default state (no live op): cool palette as
  currently defined in tokens.css
- Live op active state: three CSS variable
  overrides applied to :root over 400ms ease:
    --acc shifts 8 degrees warmer on the hue wheel
    --bg0 gains rgba(var(--warn-rgb), 0.012) tint
    --b1 gains rgba(var(--warn-rgb), 0.04) tint
- The shift is subtle enough that most users
  will not consciously notice it — but its
  absence would make the interface feel flat
- The shift reverses when no live op is active
- Implemented as a global state listener in
  Shell.jsx that watches for any Op with
  status === 'LIVE' in the org

Implementation location:
  src/core/shell/useOperationalState.js
  Applied via a CSS class on the root element:
  document.documentElement.classList.toggle(
    'op-live', hasLiveOp
  )
  With corresponding :root.op-live overrides
  in tokens.css

---

### Principle 4 — Data as Spectacle

Every data change visible to the user must be
animated. Static data updates are not acceptable
in NexusOS. The interface must feel alive.

Rules:
- All numeric values that update in real time
  use a count-up animation from previous value
  to new value over 600ms ease-out. Use
  font-variant-numeric: tabular-nums throughout
  to prevent layout shift.
- New rows arriving in any table or list
  materialise from opacity 0, translateY(-4px)
  to opacity 1, translateY(0) over 200ms ease-out
- Rows being removed collapse their height to 0
  and fade to opacity 0 over 150ms before removal
- Progress bars and quality bars draw from their
  current width to their new width over 600ms
  ease-out on every update, not just on mount
- Status badge colour transitions use 300ms ease
  when status changes (e.g. DRAFT → PUBLISHED)
- Charts and data visualisations draw themselves
  in on first render — strokes draw, bars grow,
  values count up. Subsequent updates animate
  between states rather than re-drawing.

Implementation location:
  src/core/design/animations.css — keyframe
  definitions
  src/core/design/hooks/useCountUp.js — numeric
  count-up hook
  src/core/design/hooks/useAnimatedList.js —
  list materialise/remove hook

---

### Principle 5 — MFD Panel Architecture

NexusOS uses Multi-Function Display panels as its
primary layout metaphor, especially on data-dense
views (dashboard, live op, industry, intel).

An MFD panel is a self-contained unit with:
- A machined-corner aesthetic: border-radius 2px
  on the outer container, 0px on inner elements
- A top-edge inner highlight: a 1px line at the
  top of the panel interior using var(--b3) at
  60% opacity, created via box-shadow inset
  0 1px 0 rgba(var(--b3-rgb), 0.6)
- A header strip: 32px tall, var(--bg2) background,
  0.5px bottom border var(--b1), padding 0 12px,
  flex row with label on left and status/action
  on right
- Header label: 9px var(--t3) uppercase
  letter-spacing 0.18em var(--font)
- A subtle scan-line texture on the panel interior:
  repeating-linear-gradient of transparent and
  rgba(0,0,0,0.015) at 2px intervals, pointer-
  events none, position absolute inset 0
- Panel content sits above the scan-line via
  position relative z-index 1

The MFDPanel component is defined at:
  src/core/design/components/MFDPanel.jsx

It accepts: label (string), action (node, optional),
statusDot (colour string, optional), children.

Use MFDPanel for: all dashboard stat sections,
the live op crew grid, phase tracker, session log,
loot tally, split calculator, and intel deposit
panel.

---

### Principle 6 — Typography Hierarchy

SF Mono remains the data and label typeface
throughout. A condensed display typeface is
added for large numeric values and primary
headings only.

Specification:
- Import 'Barlow Condensed' weight 600 and 700
  from Google Fonts
- Apply to: stat card large numbers (28px+),
  phase names in the phase tracker, op names
  in list and live views, section titles that
  are 16px or larger
- All data values, timestamps, labels, body text,
  and UI controls remain in var(--font) (SF Mono)
- The contrast between condensed display and
  monospace data creates visual hierarchy without
  adding colour
- CSS variable: --font-display: 'Barlow Condensed',
  sans-serif
  Added to tokens.css and applied via
  font-family: var(--font-display) wherever
  specified above

---

### Principle 7 — Tactical Amber

In operational contexts (live op view, threat
panel, readiness gate approaching 100%), amber
is used as a secondary tactical accent in
addition to the primary cyan/blue accent.

Rules:
- Amber (var(--warn)) is used for: countdowns,
  phase advancement prompts, readiness gate
  below 100%, buy-in deduction lines, threat
  severity medium, EXCLUSIVE op indicators
- Amber is never used decoratively — only when
  the semantic meaning is caution, urgency, or
  pending action
- In the live op view specifically, amber
  elements carry slightly more visual weight
  (font-weight 500 instead of 400) to ensure
  they read clearly under the operational
  colour temperature shift

---

### Implementation Priority

Apply these in this sequence to maximise visual
impact per unit of effort:

1. Living background (AmbientBackground.jsx) —
   affects every page simultaneously
2. Operational colour temperature shift —
   single shell-level state change, high impact
3. MFDPanel component — replace existing card
   usage on dashboard and live op view
4. Data animation hooks — useCountUp and
   useAnimatedList applied to live data views
5. Barlow Condensed display typeface — stat
   cards and op names
6. Spatial depth system — depth.css and
   panel open/close transitions

Do not implement all six simultaneously.
Implement in order, confirm build passes,
commit, then proceed to the next.

---

### What This Must Never Become

- Gradients on surfaces (already prohibited)
- Animations that delay access to information
- Visual effects that compete with content
  for attention
- A design that looks impressive in a screenshot
  but feels noisy in daily use
- Anything that increases cognitive load during
  a live op when decisions are time-critical

The test: if a crew member is mid-extraction
in the Aaron Halo and needs to check the
split calculator, every visual element in
NexusOS must serve that task or get out of
the way.

---

## External API integrations

```
starcitizen-api.com     SC_API_KEY env       roster, ships, roadmap
                                             GET /auto/organization_members/RSNM
                                             Org tag: RSNM
                                             1000 live req/day, cache unlimited

api.star-citizen.wiki   No auth              items, vehicles, commodities, starmap
                                             Base URL: https://api.star-citizen.wiki/api/v2
                                             Daily sync

UEX Corp                No auth              Commodity prices
                                             Base URL: https://uexcorp.space/api/2.0
                                             Sync every 15 minutes

RSI Comm-Link RSS        No auth             https://leonick.se/feeds/rsi/atom
                                             Sync every 5 minutes
                                             New patch → Claude digest → patch_digests table

RSI Server Status        No auth             https://status.robertsspaceindustries.com
                                             Sync every 60 seconds
```

All external calls are server-side only (Base44 functions or background jobs).
No API keys in frontend code. No raw external responses reach the browser.

---

## Claude API usage (server-side only)

Model: claude-sonnet-4-20250514 (or latest Sonnet available)
All calls via Base44 InvokeLLM or direct Anthropic SDK in functions/.
ANTHROPIC_API_KEY env var.

Use cases:
1. OCR extraction — functions/ocrExtract.ts (DONE)
2. Org insight generation — functions/generateInsight.ts (DONE)
3. Comm-Link patch digest — parse new patch notes, extract industry changes
4. Op wrap-up report — end-of-session summary from session_log
5. Route planning — on-demand from Scout Intel action buttons
6. Crafting optimisation — on-demand from Industry Hub action buttons

Pattern for all Claude calls:
- Input: structured org data (never raw user content without sanitisation)
- System prompt: role as "Redscar Nomads operations system" — never "AI assistant"
- Output: structured JSON via response_json_schema — never free text to UI
- Frontend receives processed data objects — never raw LLM responses

---

## Discord server channel bindings

Redscar Nomads Discord server. Herald Bot (Nexus-Herald) env vars:

NEW channels to create under "| NexusOS | 🖥️" category:
  NEXUSOS_OPS_CHANNEL_ID     #nexusos-ops   op embeds, RSVP, phase updates
  NEXUSOS_OCR_CHANNEL_ID     #nexusos-ocr   screenshot OCR drop zone
  NEXUSOS_INTEL_CHANNEL_ID   #nexusos-intel scout pings, deposit alerts
  NEXUSOS_LOG_CHANNEL_ID     #nexusos-log   system log (refinery, blueprints)

Existing channels:
  ARMORY_CHANNEL_ID          #ARMORY        armory delta posts after OCR
  COFFER_CHANNEL_ID          #COFFER        aUEC split embeds, transactions
  INVOICES_CHANNEL_ID        #INVOICES      craft job completion invoices
  INDUSTRY_CHANNEL_ID        #INDUSTRY      patch digests, high-quality deposits
  RANGERS_CHANNEL_ID         #RANGERS       ranger op readiness pings
  ANNOUNCEMENTS_CHANNEL_ID   #! ANNOUNCEMENTS  major patches, NexusOS updates
  PTU_CHANNEL_ID             #PTU-CHAT      full patch digest on new patch
  BONFIRE_CHANNEL_ID         #BONFIRE-CHAT-🔥  monthly Bonfire reminder
  REDSCAR_ONLY_CHANNEL_ID    #REDSCAR-ONLY-🚩  new member join notifications

Voice channels:
  VOICE_INDUSTRY_ID          Industry Bonfire  (Focused Voice category)
  VOICE_RANGERS_ID           Rangers Bonfire   (Focused Voice category)
  VOICE_EMERGENCY_ID         ! Responding      (Emergency Comms category)
  VOICE_CASUAL_ID            Redscar Only      (Casual Voice category)

Bot permissions required:
  GUILDS, GUILD_MEMBERS (privileged), GUILD_VOICE_STATES, GUILD_MESSAGES,
  MESSAGE_CONTENT (privileged), Manage Events
  Send Messages in announcement channels (explicit permission needed)

Op type → channel routing:
  INDUSTRY/MINING/ROCKBREAKER/SALVAGE → #nexusos-ops + #INDUSTRY
  PATROL/COMBAT/ESCORT/S17            → #nexusos-ops + #RANGERS
  RESCUE/EMERGENCY                    → #nexusos-ops + #nexusos-log + voice move
  RACING                              → #nexusos-ops only (no profession channel yet)

---

## PWA configuration

manifest.json:
  display: fullscreen | orientation: landscape | start_url: /gate
  background_color: #07080b | theme_color: #07080b

Service worker cache strategy:
  CACHE_FIRST:             / /app /icons/* /fonts/* CSS JS bundles
  NETWORK_FIRST:           /api/*
  STALE_WHILE_REVALIDATE:  /api/wiki/* /api/status
  NEVER CACHE:             /auth/* /api/auth/*

Session: encrypted IndexedDB. Re-auth only on key revocation.

---

## Directory structure

```
nexusos-redscar/
├── CLAUDE.md                        ← AI session context (read first)
├── NEXUSOS_AI_HANDOFF.md            ← this file
├── .env.example                     ← all env vars with descriptions
├── docs/
│   ├── architecture.md              ← full Base44 plan prompt
│   ├── discord-bot.md               ← full Discord channel mapping prompt
│   └── design-system.md            ← design token reference
├── functions/                       ← Base44 Deno edge functions
│   ├── ocrExtract.ts               ← DONE + PATCHED
│   ├── generateInsight.ts          ← DONE + PATCHED
│   └── heraldBot.ts                ← STUB — needs full implementation
├── src/
│   ├── App.jsx
│   ├── app/
│   │   ├── Shell.jsx               ← topbar + sidebar + layout modes
│   │   ├── AccessGate.jsx          ← /gate login page — BUILD NEXT
│   │   └── modules/
│   │       ├── IndustryHub/        ← Overview, Materials, Blueprints, Queue
│   │       ├── ScoutIntel/         ← SVG system map + deposit panel
│   │       ├── OpBoard/            ← create + live op + phase tracker
│   │       ├── FleetForge/         ← ship fitting
│   │       ├── ProfitCalc/
│   │       └── EpicArchive/
│   ├── bot/                        ← Herald Bot (discord.js v14)
│   │   ├── index.js
│   │   ├── commands/
│   │   ├── events/
│   │   ├── embeds/
│   │   └── jobs/
│   ├── api/                        ← Base44 API routes
│   │   ├── auth/
│   │   ├── ocr/
│   │   ├── sync/
│   │   └── webhooks/
│   ├── jobs/                       ← Base44 background jobs
│   └── styles/
│       ├── tokens.css              ← CSS custom properties
│       └── global.css
└── scripts/
    └── create-nexusos-channels.js  ← one-time Discord channel setup
```

---

## Immediate next build tasks

### NEXT: AccessGate.jsx (/gate)
Full-screen login. Spec:
- Background: #07080b with 80-point animated star field (CSS only, no canvas)
- Centred card (~360px): NexusOS compass SVG emblem (slate-grey, no status colour),
  "REDSCAR NOMADS" label (9px, --t3, letter-spacing .2em),
  "NEXUSOS" title (22px, --t0, font-weight 500, letter-spacing .2em),
  "ACCESS GATE" subtitle (10px, --t2, letter-spacing .15em),
  Discord SSO launcher button (full width, --bg3 bg, --b2 border),
  "Request access via #nexusos-ops" link (--acc, 10px)
- Inline error: amber border + warning text on SSO failure states
- Bottom status bar (fixed, 32px): live verse status dot + version + org name
- On success: redirect to /app (or last visited module)
- Submit to Base44 auth endpoint via Discord OAuth2 SSO start/callback handlers

### THEN: Industry Hub Overview tab
See design reference in docs/architecture.md.
The insight strip data comes from functions/generateInsight.ts — no AI label.

---

## Design decisions log
(Why we built it this way — for any AI continuing this work)

**Why no email for members?**
Voice-first org. Members are gamers, not enterprise users. Email creates
friction and a GDPR surface. Discord identity is canonical and already trusted.
Discord SSO keeps identity and access control aligned with the org's live role
structure without introducing a second credential system.

**Why is AI hidden?**
Members should feel like the system is smart, not that they're being assisted
by a chatbot. "AI Insight" labels break immersion. When the insight strip says
"Laranite quality is limiting T2 production" it should feel like the OS knows
this — not like ChatGPT is telling them. This is a design philosophy, not a
technical constraint.

**Why monospace for all UI text?**
Every other Star Citizen third-party tool uses system sans-serif. NexusOS
should feel like it lives inside the verse. Monospace is the only font choice
that achieves that without screenshots or custom fonts. It also aligns with
the mil-spec terminal aesthetic established in the infobook.

**Why 0.5px borders?**
Standard 1px borders look thick on high-DPI displays and push the aesthetic
toward "website" rather than "interface". 0.5px borders on 2x displays render
as thin as physically possible, which creates the precision instrument feel.

**Why status colours only, not decorative?**
When everything is coloured, nothing means anything. When green only appears
on CRAFT-READY and READY timers, it immediately communicates state without
reading the label. This was iterated to across three design rounds.

**Why exclusive access model for Rockbreaker?**
The buy-in model prevents freeloaders and creates shared investment in op
success. It also makes the aUEC split calculation meaningful — members who
paid in get proportional return. NexusOS tracks buy-in per op and factors
it into the split calculator.

---

## Environment variables (.env.example)

```
SC_API_KEY=                    # starcitizen-api.com key
ANTHROPIC_API_KEY=             # Claude API key
HERALD_BOT_TOKEN=              # Discord bot token (Nexus-Herald)
DISCORD_CLIENT_ID=             # OAuth2 app client ID
DISCORD_CLIENT_SECRET=         # OAuth2 app client secret
APP_URL=                       # Deployed app base URL (e.g. https://nexusos.redscar.gg)
ADMIN_EMAIL=blae@katrasoluta.com

REDSCAR_GUILD_ID=              # Redscar Nomads server ID

# New NexusOS channels (create via scripts/create-nexusos-channels.js)
NEXUSOS_OPS_CHANNEL_ID=
NEXUSOS_OCR_CHANNEL_ID=
NEXUSOS_INTEL_CHANNEL_ID=
NEXUSOS_LOG_CHANNEL_ID=

# Existing channels
ARMORY_CHANNEL_ID=
COFFER_CHANNEL_ID=
INVOICES_CHANNEL_ID=
INDUSTRY_CHANNEL_ID=
RANGERS_CHANNEL_ID=
ANNOUNCEMENTS_CHANNEL_ID=
PTU_CHANNEL_ID=
BONFIRE_CHANNEL_ID=
REDSCAR_ONLY_CHANNEL_ID=

# Voice channels
VOICE_INDUSTRY_ID=
VOICE_RANGERS_ID=
VOICE_EMERGENCY_ID=
VOICE_CASUAL_ID=
```

---

## Rules for any AI continuing this work

1. Read this file and CLAUDE.md before writing any code.
2. Read the existing file before editing it. Never rewrite from memory.
3. Do not add email authentication for regular users. Ever.
4. Do not expose Claude API attribution in any user-facing UI element.
5. Do not use colours decoratively. Status meaning only.
6. Do not use white card backgrounds. Use --bg1 or --bg2.
7. Do not use gradients, drop shadows, or blur effects.
8. Do not use sans-serif or serif fonts. Monospace throughout.
9. Do not use 1px borders for structural UI. Use 0.5px.
10. Do not auto-commit without running verification checks.
11. Do not change files that are marked DONE + PATCHED without explicit instruction.
12. When in doubt about a design decision, refer to the Design decisions log above.
13. All Claude API calls are server-side only. No API keys in frontend code.
14. The org tag for starcitizen-api.com roster calls is RSNM.
15. T2 eligibility threshold is quality_pct >= 80. This is a hard game mechanic.

---

*This document was authored by Claude Sonnet 4.6 in a claude.ai session,
March 2026. It represents the complete design intent and architectural
decisions for NexusOS as of the handoff date. Any AI reading this should
treat it as the authoritative project brief.*
