# Logistics — App Context

**Route:** `/app/industry/logistics`
**Directory:** `src/apps/logistics/` plus [Logistics.jsx](/C:/Users/Owner/Desktop/NexusOS/nexusos/src/pages/Logistics.jsx)
**Status:** COMPLETE for live Base44 use; graceful read-only fallback when logistics entities are missing in a deployment

## Purpose

Logistics is the cargo-movement workspace for NexusOS. It now covers:
- Cargo job posting and claiming
- Manifest progression from claim to delivery confirmation
- Consignment intake, listing, sale, and return handling
- Dispatch planning against available org haulers

## Active Modules

- `Cargo Board` — post open haul / collect / deliver work with auto collateral guidance
- `Manifest` — advance jobs through claimed, in-transit, delivered, and confirmed states
- `Consignment` — track seller goods, commission rate, and payout value
- `Dispatch` — assign available ships from org fleet into active cargo jobs

## Entities

Primary owned entities:
- `CargoJob`
- `Consignment`

Read dependencies:
- `OrgShip`
- `Material`
- `GameCacheCommodity`

## Cross-App Links

- `COMMERCE` issues courier contracts and owns wallet-side finance state
- `ARMORY` supplies org ship availability and capacity data
- `INDUSTRY` contributes material and commodity value context for manifest appraisal

## Current Implementation Notes

- The routed page lives in [Logistics.jsx](/C:/Users/Owner/Desktop/NexusOS/nexusos/src/pages/Logistics.jsx).
- Manifest values are derived from material / commodity lookup data when available; missing pricing data degrades to ad hoc manifests instead of failing.
- Dispatch assignments persist ship name / id directly onto the job record so the workflow remains testable without waiting on a separate FleetBuild surface.

## Remaining External Work

- `CargoJob` and `Consignment` entity schema must exist if write access is desired.
- Commerce-side automated collateral transfer and seller wallet settlement remain deeper finance integrations beyond the current routed workflow.
