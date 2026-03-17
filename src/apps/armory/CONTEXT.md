# Armory — App Context

**Route:** `/app/armory`
**Directory:** `src/apps/armory/`
**Status:** PARTIAL — inventory/checkout/activity complete; fleet fitting planned

---

## Purpose

Redscar Nomads equipment and fleet management hub. Covers:
- Org gear inventory: FPS weapons, ship components, consumables
- Equipment checkout and return tracking
- Checkout activity history
- Fleet fitting: ship loadout planning at single-pilot → squad → wing → fleet scale
- Capability gap analytics: cross-reference fleet builds against op role requirements
- Integration with community sc-data exports for hardpoint/component data

Rank gates: SCOUT+ can view inventory; VOYAGER+ can edit items and check out gear; PIONEER+ for fleet build management and canonical build designation.

---

## Entity Ownership

This app is the **primary owner** of:

| Entity | Operations |
|--------|------------|
| `ArmoryItem` | read (Armory.jsx), update (checkout return — quantity decrement/increment), create (planned: admin item add) |
| `ArmoryCheckout` | create (ArmoryCheckoutForm), read, update (status: CHECKED_OUT → RETURNED) |
| `FleetBuild` | create, read, update (hardpoints, power_allocation, is_org_canonical), delete — **planned, not yet implemented** |

**`ArmoryItem` fields:**
- `item_name`, `category` (FPS / SHIP / CONSUMABLE), `quantity`, `min_threshold`, `rarity` (COMMON / UNCOMMON / RARE / VERY_RARE), `description`, `location`

**`ArmoryCheckout` fields:**
- `item_id` FK, `item_name`, `checked_out_by` (discord_id), `checked_out_by_callsign`, `quantity`, `status` (CHECKED_OUT / RETURNED), `checked_out_at`, `returned_at`, `returned_quantity`, `notes`

**`FleetBuild` fields (schema from NEXUSOS_AI_HANDOFF.md):**
- `ship_name`, `wiki_vehicle_id`, `build_name`, `role_tag`
- `hardpoints` JSON, `power_allocation` JSON, `stats_snapshot` JSON
- `created_by` BIGINT, `op_bundle`, `patch_version`, `patch_locked` BOOLEAN
- `is_org_canonical` BOOLEAN, `build_url`, `created_at`

This app **reads from** (shared data):

| Entity | Context |
|--------|---------|
| `game_cache_items` | Planned: hardpoint/component autocomplete in fleet fitting form |

This app **invokes** (Base44 functions):

| Function | Context |
|----------|---------|
| `heraldBot` | Planned: `armoryDelta` action after checkout — posts summary to `#ARMORY` channel |

---

## Cross-App Data Dependencies

| Dependency | Source | Used In |
|------------|--------|---------|
| Op role requirements | `src/apps/ops-board/OpBoard.jsx` | Planned: capability gap analysis — cross-reference required op roles against org fleet builds |
| Session context | `@/core/data/SessionContext` | `callsign`, `discordId` from `useOutletContext` — passed to `ArmoryCheckoutForm` |

---

## User Flows

**Implemented:**
1. **View inventory** — Three-section layout: FPS WEAPONS & GEAR / SHIP COMPONENTS / CONSUMABLES; each section rendered by `CategorySection`; items show quantity badge with low-stock warning at min_threshold; rarity/category chips
2. **Checkout gear** — CHECKOUT tab → `ArmoryCheckoutForm` → select item from dropdown, set quantity and notes → `ArmoryCheckout.create` → `ArmoryItem.update` (decrements quantity by checkout amount)
3. **Return gear** — CHECKOUT tab → ITEMS IN CIRCULATION section → RETURN button → `ArmoryCheckout.update(status=RETURNED, returned_at)` → `ArmoryItem.update` (increments quantity)
4. **View activity** — ACTIVITY tab → full checkout history list (all statuses) reverse-chronological; shows item, callsign, quantity, status, return date, notes
5. **Real-time sync** — `ArmoryItem.subscribe` fires on create/update → re-runs `load()`; reflects checkout quantity changes live

**Planned:**
6. **Fleet fitting — single pilot** — ship search → select hardpoint slots from sc-data → choose components → save as `FleetBuild`; stats_snapshot auto-calculated from components
7. **Fleet fitting — squad/wing/fleet** — compose multiple builds into bundle; `op_bundle` field links builds to specific op type
8. **Org canonical build** — PIONEER+ can mark `is_org_canonical=true` on a build; canonical builds surface in Op Board crew briefing
9. **Capability gap analysis** — compare required roles for a planned op against available fleet builds; surface missing hull types or component gaps
10. **sc-data export integration** — pull component/hardpoint data from community exports via `game_cache_items`; keep builds patched via `patch_version` + `patch_locked` flags

---

## Component Inventory

| File | Role | Status |
|------|------|--------|
| `src/pages/Armory.jsx` | Route component — 3-tab layout (INVENTORY/CHECKOUT/ACTIVITY), data load, subscribe | **Complete** (not yet moved to `src/apps/armory/`) |
| `src/pages/ArmoryWidgets.jsx` | `ArmoryItemCard` (quantity badge, rarity/category chips) + `CategorySection` (groups by category, renders cards, inline return) | **Complete** (not yet moved) |
| `src/components/armory/ArmoryCheckoutForm.jsx` | Checkout form: item select, quantity, notes; writes `ArmoryCheckout.create` + `ArmoryItem.update` | **Complete** (not yet moved) |
| `FleetFitting.jsx` | Ship loadout builder: hardpoint grid, component selection, stats preview | **Planned** |
| `FleetBuildCard.jsx` | Fleet build summary card: ship name, role tag, patch version, canonical badge | **Planned** |
| `CapabilityGap.jsx` | Gap analysis panel: op role requirements vs available fleet builds | **Planned** |

---

## Known Issues / Next Tasks

1. **Files not yet moved to `src/apps/armory/`**: `Armory.jsx`, `ArmoryWidgets.jsx`, `ArmoryCheckoutForm.jsx` still live in `src/pages/` and `src/components/armory/`. Move to `src/apps/armory/` when transitioning the route in `App.jsx`.

2. **No ACTIVITY tab pagination**: Checkout history loads all `CHECKED_OUT` statuses only (`ArmoryCheckout.filter({ status: 'CHECKED_OUT' })`). The ACTIVITY tab renders `[...checkouts].reverse()` — but the initial load only fetches currently checked-out items, not returned ones. To show full history, `load()` must fetch without status filter and paginate.

3. **No low-stock alert channel post**: `ArmoryItem.min_threshold` is checked visually in `ArmoryItemCard` (colour warning) but never triggers a `heraldBot` call to `#ARMORY`. Add a check in `load()` or subscribe handler.

4. **No item add/edit UI**: `Armory.jsx` renders no add-item flow for PIONEER/VOYAGER ranks. Requires a new `AddItemDialog` or inline form wired to `ArmoryItem.create` / `ArmoryItem.update`.

5. **ArmoryCheckoutForm error state**: Form uses `useState` for `error` (verified in source) but the error renders correctly — not a bug. Checkout validation relies on server-side error returns from `ArmoryCheckout.create`.

6. **FleetBuild entity not yet used**: Schema defined in NEXUSOS_AI_HANDOFF.md. No frontend components or data access exist yet. Entire fleet fitting flow is planned scope.

---

## What NOT to Touch

- **Do not** remove `ArmoryItem.subscribe` in `Armory.jsx` — real-time sync is the only mechanism for reflecting concurrent checkouts by other members.
- **Do not** change `ArmoryCheckout.status` enum values (CHECKED_OUT / RETURNED) — used in filter calls and the ITEMS IN CIRCULATION section.
- **Do not** change `ArmoryItem.category` enum (FPS / SHIP / CONSUMABLE) — `CategorySection` in `ArmoryWidgets.jsx` renders sections in this specific order; changing values breaks grouping.
- **Do not** expose `patch_locked` as user-editable from the fitting UI — it is set when a build is marked as canonical to prevent unreviewed patch changes from silently altering loadout stats.
- **Do not** add email or password fields anywhere — auth context is `callsign` + `discordId` from outlet context only.
