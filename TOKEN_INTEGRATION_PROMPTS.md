# NexusOS Token Integration — Claude Code Prompts
# Complete wiring series for all 8 module integrations
# Run in order. Prerequisites: tokenMap.js and NexusToken.jsx must be placed
# in src/lib/ and src/components/ui/ respectively, and setup-tokens.sh must
# have been run to populate public/tokens/.

---

## BEFORE YOU RUN ANY PROMPT

Verify three things from repo root:
  1. src/lib/tokenMap.js exists
  2. src/components/ui/NexusToken.jsx exists
  3. public/tokens/ contains at least 230 .png files

If any are missing, place them now before proceeding.

---

## PROMPT T-0 — Verify prerequisites and wire component export

```
Read #NEXUSOS_AI_HANDOFF.md and #CLAUDE.md.

Do three verification checks before touching any source files:

1. Confirm src/lib/tokenMap.js exists and exports these named functions:
   depositToken, threatToken, phaseToken, opStatusToken, roleToken, rankToken,
   materialToken, blueprintToken, priorityToken, opTypeToken, heraldTokenUrl,
   HERALD_TOKENS, preloadCriticalTokens, T
   If the file is missing, report an error and stop.

2. Confirm src/components/ui/NexusToken.jsx exists and exports a default
   memoised React component.
   If missing, report an error and stop.

3. Confirm public/tokens/ exists and contains at least 230 files matching
   token-*.png. Run: find public/tokens -name "token-*.png" | wc -l
   If count < 230, report the count and stop — do not proceed until
   setup-tokens.sh has been run.

If all three pass, do two things:

A. Open src/components/ui/index.js. Add NexusToken to the exports:
     export { default as NexusToken } from './NexusToken'
   If index.js does not exist, create it and add all current ui/ components.

B. Open src/app/Shell.jsx. In the top-level component's useEffect (the mount
   effect that already handles badge data, layout mode, etc.), add this call
   after the existing setup logic:
     import { preloadCriticalTokens } from '@/lib/tokenMap'
     // inside useEffect:
     preloadCriticalTokens(currentUser?.nexus_rank, 6)
   This pre-warms the browser image cache for tokens that appear immediately
   on any screen: the rank pip in the user chip, phase nodes, deposit markers.
   Pass currentUser?.nexus_rank — whatever variable currently holds the
   authenticated user's rank string.

Report PASS on all three checks and confirm both changes were made.
Do not commit yet.
```

---

## PROMPT T-1 — Scout Intel SystemMap deposit markers

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/ScoutIntel/SystemMap.jsx completely.
Read src/lib/tokenMap.js.
Read src/components/ui/NexusToken.jsx.

Replace the current deposit marker elements on the SVG system map with
NexusToken-based markers. This is the highest-impact integration in the
entire token library — hex tokens on the star map are what these assets
were designed for.

─── IMPORTS ─────────────────────────────────────────────────────────────────
Add to SystemMap.jsx:
  import NexusToken from '@/components/ui/NexusToken'
  import { depositToken, locationToken } from '@/lib/tokenMap'

─── DEPOSIT MARKERS ─────────────────────────────────────────────────────────
Find every deposit marker rendered on the SVG map. Currently these are
rendered as circles, dots, or small SVG path elements with a colour derived
from quality percentage.

Replace each marker with this pattern:

  // Inside the SVG, use foreignObject to embed the img element
  <foreignObject
    x={markerX - 16}
    y={markerY - 16}
    width={32}
    height={32}
    style={{ overflow: 'visible', cursor: 'pointer' }}
    onClick={() => handleDepositSelect(deposit)}
  >
    <NexusToken
      src={depositToken(deposit.quality_pct, deposit.is_stale, deposit.is_active_target)}
      size={32}
      pulse={deposit.is_active_target ? 'live' : false}
      opacity={deposit.is_stale ? 0.5 : 1}
      alt={`${deposit.material} deposit, ${deposit.quality_pct}% quality`}
      title={`${deposit.material} — ${deposit.quality_pct}%${deposit.is_stale ? ' (stale)' : ''}`}
    />
  </foreignObject>

The depositToken function handles all colour logic:
  quality >= 80 → hex-green (T2 eligible)
  quality 60-79 → hex-yellow (T1 borderline)
  quality < 60  → hex-red (below threshold)
  is_stale      → hex-grey (overrides quality, needs re-verify)
  is_active     → hex-cyan (org running it this session)

─── STATION AND OUTPOST MARKERS ─────────────────────────────────────────────
Find any station, outpost, or named location markers on the map. Replace them:

  <foreignObject x={x - 14} y={y - 14} width={28} height={28}>
    <NexusToken
      src={locationToken(location.type, location.is_active)}
      size={28}
      alt={location.name}
      title={location.name}
    />
  </foreignObject>

locationToken maps:
  station   → shelter-blue
  outpost   → shelter-cyan
  hostile   → target-alt-red
  objective → objective-cyan (active) or objective-blue (inactive)
  waypoint  → triangle-blue

─── OP OVERLAY THREAT MARKERS ───────────────────────────────────────────────
When the op overlay is toggled active, any hostile zone markers should use:
  <NexusToken src={locationToken('hostile')} size={28} pulse="warn" />

─── HOVER SCALE ANIMATION ───────────────────────────────────────────────────
On hover of each foreignObject, scale the NexusToken's size from 32 to 40px.
Implement via React state (hoveredDepositId) on the foreignObject
onMouseEnter/onMouseLeave. Do not use CSS transforms on foreignObject
elements — they cause inconsistent cross-browser rendering inside SVG.
Instead, conditionally pass size={hoveredDepositId === deposit.id ? 40 : 32}.

─── DO NOT CHANGE ────────────────────────────────────────────────────────────
Do not change the SVG viewBox, map dimensions, coordinate calculations,
filter logic, quality threshold slider, or any data fetching. Only the
marker rendering elements change.

After changes verify:
  - depositToken is imported from tokenMap, not hardcoded
  - Stale deposits render at opacity 0.5
  - Active target deposits have pulse="live"
  - foreignObject elements do not use CSS transform
  - No hardcoded hex colour values in this file
  - No white backgrounds on any wrapper element

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-2 — Op Board PhaseTracker nodes

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/OpBoard/PhaseTracker.jsx completely.
Read src/lib/tokenMap.js.

Replace the circular phase node elements in PhaseTracker.jsx with numbered
cube tokens. The isometric numbered cube communicates mission sequence in a
way that an abstract coloured circle does not — it has tactical weight.

─── IMPORTS ─────────────────────────────────────────────────────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { phaseToken } from '@/lib/tokenMap'

─── NODE REPLACEMENT ────────────────────────────────────────────────────────
Find the phase node circle elements (currently 36×36px circles with state-
based background and border colours).

Determine each phase's state from the existing state logic:
  phase.index < currentPhaseIndex  → 'DONE'
  phase.index === currentPhaseIndex → 'ACTIVE'
  phase.index > currentPhaseIndex  → 'LOCKED'

Replace the circle element with:

  <NexusToken
    src={phaseToken(phase.index + 1, phaseState)}
    size={36}
    opacity={phaseState === 'LOCKED' ? 0.35 : 1}
    pulse={phaseState === 'ACTIVE' ? 'live' : false}
    alt={`Phase ${phase.index + 1}: ${phase.name}`}
    title={phase.name}
    onClick={canAdvance ? () => handlePhaseClick(phase) : undefined}
  />

phaseToken maps:
  DONE   → number-N-green.png
  ACTIVE → number-N-cyan.png
  LOCKED → number-N-blue.png  ← NOTE: grey number variants do not exist in the
                                 token library. tokenMap.js returns blue for
                                 LOCKED state. The opacity={0.35} prop above
                                 is what creates the dim, inactive appearance.
                                 Do not change opacity for locked phases —
                                 it is the only mechanism producing the grey effect.

─── CONNECTOR LINE ──────────────────────────────────────────────────────────
The connector line (::before pseudo or first-child div) stays unchanged in
structure. Add one visual enhancement: for phases that are DONE, the
connector segment between the previous node and this one should transition
its background-color to var(--live-b). This creates a progressive fill
left-to-right as phases complete.

Implement by deriving the completed fraction from currentPhaseIndex:
  style={{ background: `linear-gradient(
    to right,
    var(--live-b) ${completedFraction * 100}%,
    var(--b0) ${completedFraction * 100}%
  )` }}

This is the only gradient permitted in NexusOS — it is a data visualisation
element on the connector line, not a decorative surface treatment.

─── LOCKED STATE INTERACTION ────────────────────────────────────────────────
When a non-Pioneer user clicks a locked node, fire the shake animation.
The existing shake logic should remain — only the visual element changes.
The shake class applies to the wrapper div around NexusToken, not the
NexusToken itself.

─── SIZE PRESERVATION ───────────────────────────────────────────────────────
The overall strip height and flex layout must not change. Ensure the NexusToken
at 36px (the circle's existing size) fits within the same space. The token
image includes its own visual frame, so no additional padding or border is
needed on the node wrapper.

After changes verify:
  - DONE phases show green number cubes
  - ACTIVE phase shows cyan number cube with live pulse ring
  - LOCKED phases show grey number cubes at opacity 0.35
  - Connector line fills progressively green as phases complete
  - Shake animation still fires on locked node click (non-Pioneer)
  - Strip height unchanged
  - phaseToken imported from tokenMap, no hardcoded colour names

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-3 — Op Board ThreatPanel severity markers

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/OpBoard/ThreatPanel.jsx completely.
Read src/lib/tokenMap.js.

Replace the severity indicator elements in ThreatPanel.jsx with target tokens.
The crosshair target reticle is immediately recognisable as a threat marker
to any player with tactical game experience — it removes the cognitive step
of reading the severity text label.

─── IMPORTS ─────────────────────────────────────────────────────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { threatToken } from '@/lib/tokenMap'

─── THREAT ROW MARKER ───────────────────────────────────────────────────────
Find the severity indicator in each threat row. Currently an 8px pulsing dot.

Replace with:

  <NexusToken
    src={threatToken(threat.severity, threat.is_resolved)}
    size={32}
    pulse={!threat.is_resolved && threat.severity === 'HIGH' ? 'warn' : false}
    opacity={threat.is_resolved ? 0.35 : 1}
    alt={`${threat.severity} threat${threat.is_resolved ? ' (resolved)' : ''}`}
  />

threatToken maps:
  HIGH + active    → target-red        (with warn pulse)
  MED  + active    → target-alt-orange (no pulse)
  LOW  + active    → target-alt-grey   (no pulse)
  any  + resolved  → target-grey       (opacity 0.35)

Note: target (crosshair) = confirmed/known threat.
      target-alt (X-mark) = unconfirmed/secondary threat.
This distinction intentionally communicates threat certainty.

─── LAYOUT ADJUSTMENT ───────────────────────────────────────────────────────
The 32px token is larger than the current 8px dot. The threat row flex
container must accommodate this. Update the row to:
  display: flex, align-items: flex-start, gap: 10px
The token sits in the leftmost column at 32px width (flex-shrink: 0).
The threat detail (name, description, reported-by) sits in flex: 1 to the
right. This mirrors the ReadinessGate item layout pattern.

─── REPORT THREAT BUTTON ────────────────────────────────────────────────────
The "Report threat" button uses <NexusButton variant="danger"> — no change
needed. Do not touch the button.

─── RESOLVE ACTION ──────────────────────────────────────────────────────────
The resolve text link ("Resolved" or "×") stays as-is. When a threat
transitions to resolved, the token's src prop will update via the existing
state — the component re-renders with threatToken(severity, true) automatically.
No explicit transition logic needed; the opacity: 0.35 handles it.

After changes verify:
  - HIGH active threats show target-red with warn pulse ring
  - MED threats show target-alt-orange with no pulse
  - Resolved threats show grey token at opacity 0.35
  - Row layout uses flex-start not centre (tokens may differ in apparent height)
  - threatToken imported from tokenMap, no hardcoded names
  - No change to button styles or resolve interaction

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-4 — Op Board CrewGrid role indicators

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/OpBoard/LiveOp.jsx and any CrewGrid subcomponent.
Read src/lib/tokenMap.js.

Replace the 8px role colour dots in the crew grid with 22px circle tokens.
The framed circle token communicates designated role marker; the plain dot
communicates only colour. The upgrade is purely visual — no logic changes.

─── IMPORTS ─────────────────────────────────────────────────────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { roleToken } from '@/lib/tokenMap'

─── CREW CARD ROLE INDICATOR ────────────────────────────────────────────────
Find the role colour dot in each crew card. Currently an 8px circle with
background-color set to a hardcoded or role-derived colour.

Replace with:

  <NexusToken
    src={roleToken(crewMember.role)}
    size={22}
    alt={crewMember.role.toLowerCase()}
    title={crewMember.role}
  />

roleToken maps:
  MINING      → circle-cyan
  ESCORT      → circle-red
  FABRICATOR  → circle-orange
  SCOUT       → circle-green
  COMMAND     → circle-blue
  MEDICAL     → circle-violet
  UNASSIGNED  → circle-grey

─── CARD LAYOUT ─────────────────────────────────────────────────────────────
The 22px token is larger than the 8px dot. The crew card flex row must
accommodate this. The token should sit left-aligned, vertically centred
with the callsign text:
  display: flex, align-items: center, gap: 8px

The token's own dark frame provides visual separation from the callsign.
Do not add a background, border, or padding wrapper around the NexusToken.

─── ONLINE BORDER INTERACTION ───────────────────────────────────────────────
Currently online members have a var(--live) coloured border on their avatar.
The NexusToken does not have a border prop. If the online indicator is
separate from the role dot (an avatar + role dot), keep the online border
on the avatar element and use NexusToken only for the role dot.

If the role dot currently doubles as the online indicator (green = online),
do NOT conflate the two — keep a separate 5px pulsing dot for online status
and use NexusToken for role only. Online state and role are different data.

─── RSVP SLOT DISPLAY ───────────────────────────────────────────────────────
In the Op Board list (before op goes LIVE), RSVP role slots are displayed
as chip/tags. Add the roleToken as a 16px token to the left of each slot
chip label:

  <NexusToken src={roleToken(slot.role)} size={16} alt="" />
  <span>{slot.role}</span>

This makes slot type scannable at a glance on the op list card.

After changes verify:
  - Each crew card shows a 22px circle token not an 8px dot
  - Online indicator (if separate) is unchanged
  - roleToken imported from tokenMap, no hardcoded role→colour mapping
  - RSVP slot chips have 16px role tokens
  - No background added behind any NexusToken element

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-5 — Rank indicators across all surfaces

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/Shell.jsx (NexusTopbar section), src/app/ProfileSettings.jsx,
and any roster/member-list component.
Read src/lib/tokenMap.js.

Replace rank text labels and rank pip elements with penta tokens across all
surfaces. The pentagon has five sides; the org has five active rank tiers.
This is a direct correspondence that creates a legible visual shorthand for
rank without requiring the member to read a label.

─── IMPORTS (add to each file that currently displays rank) ─────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { rankToken } from '@/lib/tokenMap'

─── 1. USER CHIP (topbar) ───────────────────────────────────────────────────
Find the rank pip in the user chip. Currently a 6×6px div with
background: var(--acc) and border-radius: 1px.

Replace with:
  <NexusToken src={rankToken(currentUser.nexus_rank)} size={16} alt={currentUser.nexus_rank} />

At 16px the penta token fits within the chip without changing its height
(chip height is set by the callsign text, not the pip).

─── 2. USER CHIP DROPDOWN ───────────────────────────────────────────────────
In the dropdown menu below the callsign header, the rank is shown as a pill.
Replace the pill with:
  <NexusToken src={rankToken(currentUser.nexus_rank)} size={22} />
  <span style={{ fontSize: 10, color: 'var(--t1)' }}>{currentUser.nexus_rank}</span>

Show both token and label here — the dropdown is large enough for both,
and the label reinforces the visual for members learning the system.

─── 3. MEMBER TABLES / DENSE LISTS ──────────────────────────────────────────
In any dense member table, find the rank column. If it currently
shows text or a pill, replace with:
  <NexusToken src={rankToken(row.nexus_rank)} size={18} title={row.nexus_rank} alt={row.nexus_rank} />

The title tooltip shows the text rank on hover, so the text label is not
needed inline. This tightens the table column significantly.

─── 4. PROFILE SETTINGS PAGE ────────────────────────────────────────────────
In ProfileSettings.jsx, the displayed rank should show:
  <NexusToken src={rankToken(currentUser.nexus_rank)} size={48} />
  
At 48px this is a feature-level display — large enough for the inner penta
detail to read clearly. Place it in the profile header section next to
the callsign.

─── 5. ROSTER (if module exists) ────────────────────────────────────────────
If a roster or member list module exists, apply the same 22px pattern as
the crew card role indicator: token left-aligned, text to the right.

─── RANK COLOUR SEMANTICS ───────────────────────────────────────────────────
rankToken maps:
  PIONEER   → penta-cyan      (highest active rank)
  FOUNDER   → penta-violet    (founding tier — violet reserved for rare use)
  VOYAGER   → penta-blue      (full member)
  SCOUT     → penta-green     (active operator)
  VAGRANT   → penta-grey      (new / probationary)
  AFFILIATE → penta-orange    (external / allied)

Do not add a new colour mapping for SYSTEM_ADMIN — that account never
appears in member-facing UI.

After changes verify:
  - User chip shows 16px penta token (not coloured pip square)
  - Dropdown shows 22px penta token + text label
  - Dense member tables show 18px token with title tooltip
  - Profile settings shows 48px token
  - rankToken imported from tokenMap in every modified file
  - Violet token appears only for FOUNDER rank, nowhere else

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-6 — Industry Hub material table and blueprint registry

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/IndustryHub/Overview.jsx,
     src/app/modules/IndustryHub/Materials.jsx (if separate),
     src/app/modules/IndustryHub/Blueprints.jsx.
Read src/lib/tokenMap.js.

Replace the generic geometric SVG icons in material rows and blueprint
registry with resource tokens. The token's shape communicates material
category; the token's colour simultaneously communicates T2 status.
Two data points from one element.

─── IMPORTS ─────────────────────────────────────────────────────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { materialToken, blueprintToken } from '@/lib/tokenMap'

─── MATERIAL TABLE ROWS ─────────────────────────────────────────────────────
Find the 24×24px icon box in each material row. Currently a div with a
custom inline SVG (triangle, hexagon, diamond, etc.) inside.

Replace the entire icon box div with:
  <NexusToken
    src={materialToken(material.category, material.status)}
    size={24}
    alt={material.category}
    title={`${material.name} — ${material.status}`}
  />

materialToken shape mapping:
  ore      → hex       (crystalline ore structure)
  salvage  → mechanics (wrench = salvage operation)
  fuel     → fuel      (lightning bolt = fuel)
  energy   → energy    (energy cell)
  ammo     → ammunition (three rods = ammunition stack)
  food     → food      (fork/knife = consumables)
  medical  → hospital  (cross = medical)
  general  → square    (neutral diamond = unclassified)

materialToken colour mapping:
  CRAFT-READY  → green   (T2 eligible, ready to use)
  BELOW T2     → yellow  (T1 borderline)
  REFINE FIRST → orange  (needs processing)
  T1 ONLY      → grey    (standard quality ceiling)
  neutral      → cyan    (no status applied)

This means the existing status column chip is now redundant for the material
type information, but keep it — it carries the text label that confirms the
colour meaning for members learning the system.

─── BLUEPRINT REGISTRY ──────────────────────────────────────────────────────
Find the 6px status dot on each blueprint item. Currently a coloured circle
(amber for priority, acc2 for owned, t3 for unowned).

Replace with:
  <NexusToken
    src={blueprintToken(blueprint.is_owned, blueprint.is_priority)}
    size={18}
    alt={blueprint.is_owned ? 'owned' : 'unowned'}
    title={blueprint.is_priority ? 'Priority acquisition' : blueprint.is_owned ? 'Owned' : 'Not owned'}
  />

blueprintToken maps:
  owned + priority   → square-orange  (have it, need it urgently)
  owned              → square-cyan    (have it, covered)
  unowned + priority → square-red     (don't have it, critical gap)
  unowned            → square-grey    (not owned, not urgent)

The 18px token is larger than the 6px dot but fits within the item row
height without overflow. The row padding is already 6px 7px — sufficient.

─── CRAFT QUEUE JOB PRIORITY BADGES ─────────────────────────────────────────
Read src/app/modules/IndustryHub/CraftQueue.jsx.

On each job card, add a priority number badge using the priorityToken.
Position it at top-left of the card, overlapping the card corner:

  // In the job card wrapper div (position: relative):
  <NexusToken
    src={priorityToken(job.priority_num, job.priority_level)}
    size={20}
    alt={`Priority ${job.priority_num}`}
    style={{ position: 'absolute', top: -6, left: -6, zIndex: 1 }}
  />

priorityToken maps priority_level:
  critical → red number cube
  high     → orange number cube
  normal   → cyan number cube
  low      → grey number cube

Only render this badge if job.priority_num is set (not null/undefined).

After changes verify:
  - Material icons are 24px NexusTokens not inline SVGs
  - materialToken derives both shape and colour — no hardcoded values
  - Blueprint dots are 18px NexusTokens
  - blueprintToken maps all four owned/priority combinations
  - Priority badges appear only when priority_num is set
  - No hardcoded hex colours in any modified file
  - No background added behind any NexusToken

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-7 — Op Creator op type selector

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read src/app/modules/OpBoard/OpCreator.jsx completely.
Read src/lib/tokenMap.js.

Add token icons to the op type segmented control in OpCreator.jsx.
This makes op categories visually distinct before the member reads the label,
which is particularly useful on the 2ND MONITOR layout where glanceable
identification matters.

─── IMPORTS ─────────────────────────────────────────────────────────────────
  import NexusToken from '@/components/ui/NexusToken'
  import { opTypeToken } from '@/lib/tokenMap'

─── OP TYPE SELECTOR ────────────────────────────────────────────────────────
Find the op type segmented control. Currently flex-row pills with text labels.

Update each pill to include a 24px token to the left of the label:

  <button
    key={type}
    className={`op-type-pill ${selected === type ? 'active' : ''}`}
    onClick={() => setOpType(type)}
  >
    <NexusToken src={opTypeToken(type)} size={24} alt="" />
    <span>{type}</span>
  </button>

The pill flex layout: display flex, align-items center, gap 6px.
Do not change existing active/inactive pill styling — only add the token.

opTypeToken maps:
  MINING      → hex-cyan         (ore hexagon)
  SALVAGE     → mechanics-orange (wrench = recovery op)
  COMBAT      → target-red       (crosshair = engagement)
  ESCORT      → target-alt-blue  (X-mark blue = protective)
  RESCUE      → hospital-green   (cross = medical/recovery)
  EXPLORATION → objective-blue   (bullseye = find/survey)
  DELIVERY    → fuel-yellow      (fuel bolt = logistics)

If the op type list differs from the above (different values in your data),
extend the opTypeToken function in tokenMap.js to match your actual values,
then re-run this prompt.

─── OP TYPE SYSTEM INDICATOR IN SELECTOR ────────────────────────────────────
The system selector (Stanton / Pyro / Nyx) has its own active border colour
as established in the UI spec. Do not add tokens to the system selector —
it already has a colour-coded identity system.

After changes verify:
  - Each op type pill contains a 24px NexusToken left of the label
  - opTypeToken imported from tokenMap
  - Active/inactive pill styling unchanged
  - System selector pills unchanged
  - No background added behind any NexusToken

Do not commit. Report PASS/FAIL per check.
```

---

## PROMPT T-8 — Herald Bot Discord embed tokens

```
Read #NEXUSOS_AI_HANDOFF.md, #CLAUDE.md.
Read functions/heraldBot.ts completely.
Read src/lib/tokenMap.js — specifically the heraldTokenUrl function and
HERALD_TOKENS export.

Add token thumbnail images to Herald Bot Discord embeds. Tokens at Discord
embed thumbnail scale (the source is 280×280px — Discord downsamples it
automatically to ~80px). This upgrade requires no frontend React changes —
it is pure heraldBot.ts server-side work.

─── SETUP ───────────────────────────────────────────────────────────────────
The tokens must be accessible as public URLs for Discord to fetch them.
They are served from your deployment at /tokens/token-*.png.

The base URL comes from process.env.NEXUSOS_PUBLIC_URL.
Ensure this env var is set in your Deno deployment environment.
If it is not yet set, add a TODO comment and use a placeholder for now:
  const BASE_URL = Deno.env.get('NEXUSOS_PUBLIC_URL') || 'https://TODO_SET_THIS'

─── IMPORT ──────────────────────────────────────────────────────────────────
heraldBot.ts is a Deno edge function. The tokenMap.js exports are not
directly importable as ES modules from Deno without adaptation.

Instead, inline the token URL helper directly in heraldBot.ts:

  const BASE_URL = Deno.env.get('NEXUSOS_PUBLIC_URL') || ''
  const tokenUrl = (name: string) =>
    `${BASE_URL.replace(/\/$/, '')}/tokens/token-${name}.png`

  // Named constants matching the HERALD_TOKENS export
  const TOKENS = {
    opAnnounce:    tokenUrl('objective-blue'),
    opLive:        tokenUrl('objective-cyan'),
    opStoodDown:   tokenUrl('objective-green'),
    opCancelled:   tokenUrl('objective-red'),
    keyDelivered:  tokenUrl('square-cyan'),
    keyRevoked:    tokenUrl('square-red'),
    threatHigh:    tokenUrl('target-red'),
    threatMed:     tokenUrl('target-alt-orange'),
    depositStale:  tokenUrl('hex-grey'),
    depositReady:  tokenUrl('hex-green'),
    armoryUpdate:  tokenUrl('mechanics-blue'),
    patchDigest:   tokenUrl('energy-blue'),
    craftComplete: tokenUrl('square-green'),
    craftPending:  tokenUrl('square-orange'),
    rescueActive:  tokenUrl('hospital-red'),
  }

─── EMBED THUMBNAIL APPLICATION ─────────────────────────────────────────────
For each herald action that builds a Discord embed, add a thumbnail field.
Find the embed builder calls (EmbedBuilder or equivalent) in each action
handler and add:

  publishOp:
    embed.setThumbnail(TOKENS.opAnnounce)

  opGo (op transitions to LIVE):
    embed.setThumbnail(TOKENS.opLive)

  opWrapUp:
    embed.setThumbnail(TOKENS.opStoodDown)

  phaseAdvance:
    // Phase number token — use the phase index
    embed.setThumbnail(tokenUrl(`number-${phaseIndex}-cyan`))

  threatAlert (severity HIGH):
    embed.setThumbnail(TOKENS.threatHigh)

  threatAlert (severity MED):
    embed.setThumbnail(TOKENS.threatMed)

  armoryUpdate:
    embed.setThumbnail(TOKENS.armoryUpdate)

  patchDigest:
    embed.setThumbnail(TOKENS.patchDigest)

  depositStaleAlert:
    embed.setThumbnail(TOKENS.depositStale)

  scoutPing (deposit confirmed high quality):
    embed.setThumbnail(TOKENS.depositReady)

─── DO NOT CHANGE ────────────────────────────────────────────────────────────
Do not change any embed field values, button definitions, RSVP interaction
handlers, Scheduled Event logic, or Discord API calls. Only setThumbnail
additions are in scope.

After changes verify:
  - NEXUSOS_PUBLIC_URL env var is referenced (even if value is TODO)
  - tokenUrl helper function defined locally in heraldBot.ts
  - setThumbnail called in every action handler listed above
  - No import of tokenMap.js (Deno compatibility — inline only)
  - No other logic changed

Commit all token integration work:
  git add public/tokens src/lib/tokenMap.js src/components/ui/NexusToken.jsx
  git add src/components/ui/index.js src/app/Shell.jsx
  git add src/app/modules/ScoutIntel/SystemMap.jsx
  git add src/app/modules/OpBoard/PhaseTracker.jsx
  git add src/app/modules/OpBoard/ThreatPanel.jsx
  git add src/app/modules/OpBoard/LiveOp.jsx
  git add src/app/modules/IndustryHub/
  git add src/app/modules/OpBoard/OpCreator.jsx
  git add src/app/ProfileSettings.jsx src/app/Shell.jsx
  git add functions/heraldBot.ts
  git commit -m "feat: tactical token library integration — SystemMap deposits, phase nodes, threat markers, crew roles, rank indicators, material icons, op types, herald embeds"

Then version bump:
  .\version-bump.ps1 minor "Tactical token library — 232-token integration across all modules"
  git push origin main

Report the commit hash.
```

---

## VERIFICATION CHECKLIST (run after all prompts complete)

```
Read all files modified across prompts T-0 through T-8.

Run the following checks and report results:

1. IMPORT CONSISTENCY
   Every modified component imports NexusToken from '@/components/ui/NexusToken'
   (not a relative path). Every modified component imports token functions
   from '@/lib/tokenMap' (not hardcoded).

2. NO HARDCODED TOKEN COLOURS
   Search all modified files for any string matching:
   '-red.png', '-green.png', '-blue.png', '-cyan.png', '-grey.png',
   '-orange.png', '-violet.png', '-yellow.png', '-purple.png'
   that does NOT come from a tokenMap function call.
   Expected result: zero violations.

3. NO BACKGROUNDS ON TOKENS
   Search for any element that wraps a NexusToken and has a style containing
   background, backgroundColor, or bg.
   Expected result: zero violations (tokens render directly on surface).

4. SEMANTIC COLOUR ENFORCEMENT
   Check every tokenMap function call site. Verify that:
   - Red tokens appear only in threat/danger/error contexts
   - Green tokens appear only in ready/complete/T2-eligible contexts
   - Grey tokens appear only in stale/locked/inactive contexts
   - Violet tokens appear only for FOUNDER rank

5. SIZE APPROPRIATENESS
   Check that no NexusToken is rendered below size={16} (inner icon detail
   is lost below this threshold). Check that tokens in table rows use
   size={24}, phase nodes use size={36}, profile features use size={48}.

6. HERALD BOT ENV VAR
   Confirm heraldBot.ts references NEXUSOS_PUBLIC_URL.
   If the env var is not yet configured, add it to your deployment config
   and note it in the NEXUSOS_AI_HANDOFF.md pending items.

Report PASS or FAIL per check with file and line for any failures.
```
