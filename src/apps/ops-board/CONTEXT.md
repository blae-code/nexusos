# CONTEXT — ops-board

## Purpose
Operation lifecycle management: create, publish, run, and archive org operations.
Route prefix: `/app/ops`

## Module Focus
- `Op Creator` — draft, schedule, publish, and define role slots for new operations
- `Live Op` — active session command view with phase tracker, readiness, crew, threats, loot, and split calculator
- `Session Log` — meaningful op events, decisions, and command notes
- `Split Calc` — payout planning and per-member split amounts for completed runs
- `After Action` — op outcome records, participation history per member, payout history, and engagement logs. This is the org's institutional performance memory, inspired by zKillboard's corporation history function.

## After Action Data Tracked Per Op
- Outcome (`SUCCESS`, `PARTIAL`, `FAILED`, `ABANDONED`)
- Participating members and their roles
- Total haul value in aUEC
- Split amounts per member
- Phase completion record
- Session duration
- Notes from session log

## After Action Views
- Op history list with outcome indicators
- Member participation record (how many ops, roles played, total earnings)
- Org performance over time (ops per week, average haul value, completion rate)

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/app/ops` | `OpBoard.jsx` | List view — all ops grouped by status |
| `/app/ops/new` | `OpCreatorPage.jsx` → `OpCreator.jsx` | Create new op |
| `/app/ops/:id` | `LiveOp.jsx` | Detail / live-op view |

## Entity Ownership
**Entities owned by this app (reads + writes):**
- `Op` — full CRUD: create, update status/phases/session_log/readiness_gate, list/filter
- `OpRsvp` — create, update status, filter by op_id or user_id

**Entities read-only (cross-app):**
- `CofferLog` — SplitCalc creates entries (entry_type: 'OP_SPLIT') — writes to Industry-Hub's ledger
- `game_cache_items` — LootTally reads for material autocomplete

**Functions invoked:**
- `notifyUser` / `sendNexusNotification` — op published, phase advance, threat, and live-op state notifications

## Cross-App Data Dependencies
- **Session context** (`@/core/data/SessionContext`): rank, callsign, user identity via outlet context
- **SplitCalc → CofferLog**: writes to the ledger owned by Industry Hub — callers should be aware
- **LootTally → game_cache_items**: shared cache entity, read-only

## User Flows Implemented
1. **View ops list** — load all ops, group by status, filter active/complete/all, RSVP toggle
2. **Create op** — multi-section form (BASICS, ACCESS, ROLE SLOTS, SETTINGS, PHASES), save as DRAFT or PUBLISHED
3. **RSVP** — role selector grid, ship input, confirm/decline, real-time capacity display
4. **Live op detail** — 2-layout (ALT-TAB / 2ND MONITOR), phase advance, crew grid, session log, readiness gate, threat panel, loot tally, split calc
5. **Phase advance** — confirm → notification + session log entry
6. **Threat alert** — report with severity, notification, resolve
7. **Split payout** — gross haul entry, equal/custom split, log entries to CofferLog
8. **Archive ops** — completed ops table with duration, crew count, pagination

## Component Inventory

### Entry / Container
| File | Status | Notes |
|------|--------|-------|
| `OpBoard.jsx` | Complete | List view with status grouping, RSVP toggle, subscribe |
| `LiveOp.jsx` | Complete | Full op detail; uses `useOutletContext` + `useParams` |
| `OpCreator.jsx` | 85% complete | Props-based form; `error` state initialized but never displayed in error banner — see Known Issues |
| `OpCreatorPage.jsx` | Complete | Thin wrapper; reads outlet context, passes props to OpCreator |
| `index.jsx` | Complete | Alternative op board (tab-based: LIVE/UPCOMING/ARCHIVE) — duplicate of OpBoard.jsx |

### Sub-components — Live Op
| File | Status | Notes |
|------|--------|-------|
| `PhaseTracker.jsx` | Complete | Visual progress, confirm-advance flow, in-app notification |
| `ReadinessGate.jsx` | Complete | Checklist to GO, rank-gated, GO state transition |
| `SessionLog.jsx` | Complete | Type-coloured event feed, manual entry, auto-scroll |
| `ThreatPanel.jsx` | Complete | Report/resolve threats, severity tokens, in-app notification |
| `CrewGrid.jsx` | Complete | Confirmed + empty slot grid, 2/3-col layout modes |
| `LootTally.jsx` | Complete | Phase ≥4 only, material autocomplete, SCOUT+ gate |
| `OpRsvpSection.jsx` | Complete | Role slots, capacity bars, RSVP flow, leave confirmation |
| `SplitCalc.jsx` | Complete | Gross haul → net split, CofferLog write |
| `LiveOpTopbar.jsx` | Complete | Persistent header: op name, phase pill, layout toggle, timer |

### Sub-components — Op Board / Creator
| File | Status | Notes |
|------|--------|-------|
| `UpcomingCard.jsx` | Complete | Card for published ops, RSVP status, role slots |
| `ArchiveTable.jsx` | Complete | Completed ops table with pagination (10 at a time) |
| `RSVPDialog.jsx` | Complete | Quick RSVP modal: role grid + ship input |
| `LiveOpCard.jsx` | Complete | Compact live op card used in index.jsx |
| `LiveOpHeader.jsx` | Legacy | From components/ops — superseded by LiveOpTopbar.jsx |
| `LiveOpCrewTab.jsx` | Legacy | From components/ops — superseded by CrewGrid.jsx |
| `LiveOpSessionLog.jsx` | Legacy | From components/ops — superseded by SessionLog.jsx |
| `OpBoardModule.jsx` | Legacy | From components/ops — original board implementation |
| `PhaseBriefPanel.jsx` | Legacy | From components/ops — phase briefing panel |
| `PhaseBriefModal.jsx` | Legacy | From components/ops — modal wrapper |
| `PhaseTrackerLegacy.jsx` | Legacy | From components/ops — original PhaseTracker |
| `SessionLogLegacy.jsx` | Legacy | From components/ops — original SessionLog |
| `CrewRoster.jsx` | Legacy | From components/ops — original crew view |
| `SupplyChainView.jsx` | Legacy | From components/ops — supply chain view |
| `SupplyChainCards.jsx` | Legacy | From components/ops — supply chain cards |
| `TacticalCommsQuickRef.jsx` | Legacy | From components/ops — comms quick reference |
| `ThreatAlertModal.jsx` | Legacy | From components/ops — superseded by ThreatPanel.jsx |

### Helpers
| File | Status | Notes |
|------|--------|-------|
| `opBoardHelpers.jsx` | Complete | relativeTime, utcString, normalizeRoleSlots, SectionHeader, TypeTag, ElapsedTimer, Overlay, DialogCard |
| `opCreatorHelpers.jsx` | Complete | OP_TYPES, SYSTEMS, RANK_GATES, OP_TYPE_DEFAULTS, getDefaults(), SectionHeader, FormField, SegmentedControl, Toggle, RoleSlotEditor, PhaseEditor |

## Known Issues / Next Tasks
1. **`OpCreator.jsx` bug (line ~204)**: `setError()` is called on creation failure but `error` state is never declared as a `useState`. Error messages from the server are silently discarded. Fix: add `const [error, setError] = useState(null)` and render an error banner.
2. **localStorage violation in `LiveOp.jsx` (lines ~88, ~97)**: Layout mode is persisted to `localStorage` under key `nexus_layout_mode`. CLAUDE.md explicitly forbids localStorage. Fix: remove persistence or use the session context / URL param instead.
3. **Duplicate op list views**: `OpBoard.jsx` (status-grouped cards) and `index.jsx` (tab-based: LIVE/UPCOMING/ARCHIVE) both implement op list views. Only one should be the canonical `/app/ops` route. Current routing uses OpBoard.jsx — index.jsx is orphaned.
4. **Settings toggles not all persisted**: `OpCreator.jsx` shows operator settings toggles but not all are included in the `Op.create()` payload.
5. **Legacy components** (listed above with Legacy status): All `*Legacy.jsx` files and legacy `src/components/ops` survivors are dead code — nothing imports them from the new structure. Candidates for deletion once confirmed.
6. **After Action data model** requires op outcome fields to be added to the `Op` entity or a separate `OpRecord` entity.

## What NOT to Touch
- `op.session_log` structure — array of `{ type, text, t, id? }` objects. Type values are PHASE_ADVANCE, THREAT, THREAT_RESOLVED, MATERIAL, CRAFT, PING, MANUAL. Adding new types requires updating SessionLog.jsx display logic too.
- `op.readiness_gate` structure — array of `{ title, detail, priority, done, locked, assignee }`. Changing shape breaks ReadinessGate.jsx.
- `OpRsvp.status` enum — CONFIRMED/DECLINED/TENTATIVE. Used in multiple filter calls.
- Rank gate constants: `PIONEER_RANKS = ['PIONEER', 'FOUNDER']` and `SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER']`.
