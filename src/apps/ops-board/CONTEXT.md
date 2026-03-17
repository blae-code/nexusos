# Op Board — App Context

**Route:** `/app/ops` (list) · `/app/ops/new` (create) · `/app/ops/:id` (live detail)
**Directory:** `src/apps/ops-board/`
**Status:** COMPLETE — production-ready

---

## Purpose

End-to-end operation lifecycle management for Redscar Nomads.
Covers creation, pre-op readiness, live execution (phase tracking, crew, threats, loot, session log),
and post-op split calculation. Connects to Herald Bot for all Discord embeds and role pings.

---

## Entity Ownership

This app is the **primary owner** of:

| Entity | Operations |
|--------|-----------|
| `Op` | create, read, update (status, phase, session_log, readiness_gate, started_at, ended_at) |
| `OpRsvp` | create, read, update (status, role, ship) |

This app **writes to** (secondary):

| Entity | Context |
|--------|---------|
| `CofferLog` | SplitCalc writes `OP_SPLIT` entries after post-op haul logging |

This app **reads from** (shared data):

| Entity | Context |
|--------|---------|
| `game_cache_items` | LootTally material autocomplete |

---

## Cross-App Data Dependencies

| Dependency | Source | Used In |
|------------|--------|---------|
| Scout deposits | `src/apps/scout-intel/` | Not currently read; ops are created independently |
| Materials | `src/apps/industry-hub/` | Not currently read in Op Board |
| CofferLog | shared | SplitCalc writes split entries to ledger |
| `heraldBot` function | Base44 function | Publish op, phase advance, threat alert, op start/end, scout ping |

---

## User Flows

1. **Create op** — SCOUT+ navigates to `/app/ops/new` → fills BASICS / ACCESS / ROLE SLOTS / SETTINGS / PHASES → publishes or saves draft → Herald Bot DMs Discord event if `createDiscordEvent` toggle is on
2. **RSVP to op** — Any rank views op list → clicks RSVP button → selects role + ship in RSVPDialog → status set to CONFIRMED
3. **Activate op** — PIONEER/FOUNDER/VOYAGER clicks ACTIVATE on op detail → status → LIVE, `started_at` set, Herald Bot fires `opActivate`
4. **Advance phase** — SCOUT+ clicks ADVANCE in PhaseTracker → confirmation required → phase_current incremented, Herald Bot fires `phaseAdvance`
5. **Report threat** — Any crew member in ThreatPanel → fills threat form (severity, description, location) → appended to session_log, Herald Bot fires `threatAlert`
6. **Log loot** — SCOUT+ uses LootTally (visible at phase ≥ 4) → adds material + qty + quality → appended to session_log
7. **Log session entry** — SCOUT+ types in SessionLog input → Enter submits → entry appended with timestamp
8. **Readiness gate** — SCOUT+ checks items in ReadinessGate → all checked → GO button available → Herald Bot fires `opGo`
9. **End op** — PIONEER/FOUNDER/VOYAGER clicks END → status → COMPLETE, `ended_at` set
10. **Split payout** — SplitCalc → enter gross haul → equal split or custom per-member → EXCLUSIVE ops deduct buy-ins → "Log Split to Coffer" creates CofferLog entries per crew member

---

## Component Inventory

| File | Role | Status |
|------|------|--------|
| `OpBoard.jsx` | Route component — op list grouped by status, RSVP toggle | **Complete** |
| `index.jsx` | Alternative list view with LIVE/UPCOMING/ARCHIVE tabs | **Complete** (duplicate; may deprecate one) |
| `LiveOp.jsx` | Route component — full op detail with all sub-panels | **Complete** |
| `OpCreator.jsx` | Op creation form (BASICS→ACCESS→ROLES→SETTINGS→PHASES) | **Complete** (minor bug: see Known Issues) |
| `OpCreatorPage.jsx` | Thin wrapper — reads outlet context, passes props to OpCreator | **Complete** |
| `PhaseTracker.jsx` | Visual phase progress bar with advance + confirm flow | **Complete** |
| `ReadinessGate.jsx` | Checklist with GO button; percent-complete badge | **Complete** |
| `SessionLog.jsx` | Scrollable event feed; manual entry for SCOUT+ | **Complete** |
| `SplitCalc.jsx` | Post-op payout calculator; logs to CofferLog | **Complete** |
| `ThreatPanel.jsx` | Threat reporting with severity; resolve flow | **Complete** |
| `CrewGrid.jsx` | Responsive crew roster (confirmed + empty slots) | **Complete** |
| `LootTally.jsx` | Material harvest logger; visible at phase ≥ 4 | **Complete** |
| `OpRsvpSection.jsx` | Role slot grid + RSVP form + confirmed crew list | **Complete** |
| `RSVPDialog.jsx` | Quick RSVP modal with role grid + ship input | **Complete** |
| `LiveOpTopbar.jsx` | Persistent header: op name, phase pill, elapsed timer, layout toggle | **Complete** |
| `LiveOpCard.jsx` | Compact op card for LIVE ops | **Complete** |
| `UpcomingCard.jsx` | Card for upcoming (PUBLISHED) ops with RSVP action | **Complete** |
| `ArchiveTable.jsx` | Table view of COMPLETE/ARCHIVED ops with pagination | **Complete** |
| `LootTally.jsx` | Material haul logger (session_log append) | **Complete** |
| `opBoardHelpers.jsx` | Shared atoms: relativeTime, SectionHeader, TypeTag, ElapsedTimer, Overlay, DialogCard | **Complete** |
| `opCreatorHelpers.jsx` | Creator atoms: OP_TYPES, SYSTEMS, RANK_GATES, getDefaults, RoleSlotEditor, PhaseEditor | **Complete** |
| `LiveOpCrewTab.jsx` | Legacy crew tab component from old components/ops/ | **Legacy** |
| `LiveOpHeader.jsx` | Legacy op header component from old components/ops/ | **Legacy** |
| `LiveOpSessionLog.jsx` | Legacy session log from old components/ops/ | **Legacy** |
| `OpBoardModule.jsx` | Legacy full module wrapper from old components/ops/ | **Legacy** |
| `PhaseBriefModal.jsx` | Legacy phase brief modal from old components/ops/ | **Legacy** |
| `PhaseBriefPanel.jsx` | Legacy phase brief panel from old components/ops/ | **Legacy** |
| `PhaseTrackerLegacy.jsx` | Legacy phase tracker (renamed to avoid conflict with active version) | **Legacy** |
| `SessionLogLegacy.jsx` | Legacy session log (renamed to avoid conflict with active version) | **Legacy** |
| `SupplyChainCards.jsx` | Legacy supply chain cards | **Legacy** |
| `SupplyChainView.jsx` | Legacy supply chain view | **Legacy** |
| `TacticalCommsQuickRef.jsx` | Legacy comms quick reference | **Legacy** |
| `ThreatAlertModal.jsx` | Legacy threat alert modal | **Legacy** |
| `CrewRoster.jsx` | Legacy crew roster | **Legacy** |

---

## Known Issues / Next Tasks

1. **`OpCreator.jsx` — undeclared `error` state (line ~204)**: `setError()` is called on op creation failure but `const [error, setError] = useState(null)` was never added. Error messages on creation failure are silently swallowed. Fix: add the state declaration and render `error` near the submit button.

2. **localStorage usage in `LiveOp.jsx`**: Layout mode (`nexus_layout_mode`) is persisted via `localStorage`. CLAUDE.md explicitly forbids localStorage in any component. Fix: move to `src/core/data/safe-storage.js` or derive from URL params/outlet context.

3. **Duplicate op list views**: `OpBoard.jsx` and `index.jsx` both render op lists with slightly different UX (grouped by status vs. tabbed by lifecycle stage). The active route (`/app/ops`) uses `OpBoard.jsx`. `index.jsx` is unused at the route level — consider deprecating or consolidating.

4. **Settings fields not persisted**: Several `OpCreator.jsx` toggle fields (`reminder24h`, `reminder1h`, `atHereOnGo`, `createDiscordEvent`) are rendered in UI but not yet written to the Op payload. These need backend integration via Herald Bot before they have effect.

5. **Legacy components**: All files ending in `Legacy` and the old `src/components/ops/` copies were moved here during restructure. They are not imported anywhere in the active codebase. Audit and delete in a follow-up pass.

---

## What NOT to Touch

- **Do not** change `Op.status` enum values — they are used in Herald Bot routing (`heraldBot.ts`) and any change breaks Discord channel posting logic.
- **Do not** change `session_log` array schema — entries use `{ type, text, t }` and are directly read by `SessionLog.jsx`, `ThreatPanel.jsx`, and `LootTally.jsx`. Any field rename breaks multiple components simultaneously.
- **Do not** move `opBoardHelpers.jsx` or `opCreatorHelpers.jsx` out of this directory — they are imported with relative paths (`./opBoardHelpers`) throughout the module.
- **Do not** rename `PhaseTracker.jsx` (the active module version) — it is the one actively used by `LiveOp.jsx`. The legacy version is `PhaseTrackerLegacy.jsx`.
- **Do not** add email auth or expose Discord IDs in session log display — member identity is callsign only in UI.
