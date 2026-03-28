# Scout Intel — App Context

**Route:** `/app/scout`
**Directory:** `src/apps/scout-intel/`
**Status:** COMPLETE — production-ready

---

## Purpose

Org-wide deposit tracking and route planning for Redscar Nomads mining/salvage operations.
Covers:
- Interactive SVG system map (Stanton, Pyro, Nyx) with deposit markers, filters, and overlays
- Deposit logging (from field scouts or OCR)
- Deposit voting (confirm fresh / mark stale)
- Crafting gap analysis — cross-references priority blueprints against deposit locations
- Scout leaderboard (deposit count per callsign)
- AI-powered route optimisation ("Plan Run" → `generateInsight`, "Generate Route" → `routePlanner`)
- Live op overlay (highlights craft-target deposits when an op is LIVE)

---

## Entity Ownership

This app is the **primary owner** of:

| Entity | Operations |
|--------|-----------|
| `ScoutDeposit` | create (LogForm), read, update (confirmed_votes, stale_votes, is_stale) |

This app **reads from** (shared data):

| Entity | Context |
|--------|---------|
| `Material` | index.jsx — loaded for crafting gap cross-reference |
| `Blueprint` | index.jsx — loaded with `is_priority: true` filter for gap analysis |
| `Op` | index.jsx — loaded with `status: 'LIVE'` filter for op overlay |
| `game_cache_commodities` | LogForm — material name autocomplete (list, filter by substring) |

This app **invokes** (Base44 functions):

| Function | Context |
|----------|---------|
| `generateInsight` | DepositPanelModes DetailMode "Plan Run" — route recommendation for selected deposit |
| `routePlanner` | RoutePlannerPanel "Generate Route" — full multi-deposit optimised route plan |

---

## Cross-App Data Dependencies

| Dependency | Source | Used In |
|------------|--------|---------|
| Priority blueprints | `src/apps/industry-hub/Blueprints.jsx` | GapRow in DepositPanelModes — shows missing materials per blueprint |
| Materials stock | `src/apps/industry-hub/Materials.jsx` | Gap analysis cross-reference — compares deposit material to org stock |
| Live op | `src/apps/ops-board/LiveOp.jsx` | SVG map op overlay; "Log to Op" session_log append |

---

## User Flows

1. **View map** — Navigate to `/app/scout`; SVG map loads with all fresh deposits plotted by system + scatter position; quality colour-coded (green ≥80%, amber 60–79%, grey <60%); stale at 35% opacity
2. **Filter deposits** — Toolbar chips: filter by system (ALL/STANTON/PYRO/NYX), material type, quality threshold slider (0–100%), staleness (ALL/FRESH/WEEK); heatmap toggle; op overlay toggle
3. **Select deposit** — Click marker on SVG map → DepositPanel switches to detail mode → shows quality, volume, risk, ship type, votes, scout callsign, timestamp
4. **Vote on deposit** — CONFIRM button increments `confirmed_votes`; MARK STALE increments `stale_votes`; auto-sets `is_stale=true` when `stale_votes >= 3`
5. **Plan route (single deposit)** — Detail mode "Plan Run" → calls `generateInsight` with `context: 'scout_route'` → displays recommendation inline
6. **Log new deposit** — DepositPanel "+ LOG DEPOSIT" → LogForm → material (autocomplete), system, location, quality slider, volume, risk, ship type, notes → ScoutDeposit.create → live map state updates for all active users
7. **View crafting gaps** — Default mode DepositPanel shows GapRow list: priority blueprints → missing ingredients → best available deposit shown per gap
8. **Generate route plan** — ScoutIntelModule or RoutePlannerPanel → select target material, quality threshold, risk tolerance → `routePlanner` function → RouteOverlay shows waypoint sequence + yield/time stats
9. **Log to op** — Detail mode "Log to Op" (only when live op exists) → appends scout ping entry to `Op.session_log`
10. **View leaderboard** — Default mode DepositPanel bottom section → counts deposits per scout → top 5 ranked by submission count

---

## Component Inventory

| File | Role | Status |
|------|------|--------|
| `index.jsx` | Route component — loads all data, manages map/panel state, orchestrates layout | **Complete** |
| `ScoutIntel.jsx` | Re-export shim pointing to `index.jsx` (used by App.jsx route) | **Complete** |
| `SystemMap.jsx` | Full SVG interactive map — deposit markers, filters toolbar, heatmap overlay, op overlay | **Complete** |
| `SystemMapControls.jsx` | Chip + IconBtn UI atoms for SystemMap toolbar | **Complete** |
| `DepositPanel.jsx` | 260px right rail — routes between default/detail/log mode | **Complete** |
| `DepositPanelModes.jsx` | DefaultMode (top deposits, gap rows, leaderboard) + DetailMode (votes, plan run, log to op) | **Complete** |
| `LogForm.jsx` | New deposit submission form: autocomplete, quality slider, volume/risk enums | **Complete** |
| `RoutePlannerPanel.jsx` | Route generation UI: material, quality threshold, risk tolerance → `routePlanner` function | **Complete** |
| `RouteOverlay.jsx` | Fullscreen route display: SVG waypoint map + ordered deposit list + yield/time stats | **Complete** |
| `ScoutMap.jsx` | Alternative simplified map with zoom controls + route line visualisation | **Complete** |
| `ScoutIntelModule.jsx` | Alternative standalone container: ScoutMap + RoutePlannerPanel split pane | **Complete** |

---

## Known Issues / Next Tasks

1. **Random deposit scatter on re-render (`ScoutMap.jsx`)**: Deposit positions are computed using `Math.random()` at render time. This means each re-render moves markers. Fix: seed the offset from deposit ID or coords_approx to make positions stable.

2. **Unused variables in `ScoutIntelModule.jsx`**: `systemColors` and `riskColor` objects are declared but never used in the component render. Clean up.

4. **`generateInsight` called with ad hoc `context` param**: The "Plan Run" call in `DepositPanelModes.jsx` passes `{ context: 'scout_route', ... }` but the current `generateInsight` function may not have a scout-route-specific prompt branch. Verify the function handles this context key and returns meaningful data, or implement `scoutRoute` as its own Base44 function.

5. **`SYSTEM_COORDS` hardcoded in `RouteOverlay.jsx`**: Stanton at (50,50), Pyro at (75,30), Nyx at (25,70). If the starmap data source changes, this won't auto-update. Not critical for current scope.

6. **Dual map implementations**: `SystemMap.jsx` (full-featured, used by `index.jsx`) and `ScoutMap.jsx` (zoom-enabled, used by `ScoutIntelModule.jsx`) are parallel. The active route uses `index.jsx` → `SystemMap.jsx`. Decide whether to unify or keep both for different contexts.

---

## What NOT to Touch

- **Do not** change the `ScoutDeposit` vote logic threshold — `is_stale = true` when `stale_votes >= 3`. This is consistent across `DepositPanelModes.jsx` and `NEXUSOS_AI_HANDOFF.md`.
- **Do not** add the T2 eligibility logic here — that belongs in Industry Hub. Scout Intel shows raw quality numbers only.
- **Do not** expose the `generateInsight` call as an "AI" feature — route recommendations must appear as system-generated data with no AI attribution in the UI.
- **Do not** remove the `liveOp` prop thread through `index.jsx → SystemMap → DepositPanel → DepositPanelModes` — the op overlay and "Log to Op" functionality depend on it. The liveOp filter (`status: 'LIVE'`) must stay in `index.jsx`.
