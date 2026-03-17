Purpose: Org equipment, fleet availability,
and vehicle/component reference data for
combat, escort, and support readiness.

Modules:
  Inventory — tracked org-owned gear, issue
    status, and member checkout history
  Checkout — claim and return workflow for
    shared items and loadout kits
  Fleet Registry — member and org ship records,
    loadout references, and availability view
  Dispatch Support — fleet data surfaces used by
    LOGISTICS and OPERATIONS when assigning ships
    and crew to active work

Entities owned:
  ArmoryItem — tracked gear and item quantities
  ArmoryCheckout — checkout, return, and holder
    state for issued items
  FleetBuild — ship/loadout record, role tag,
    hardpoints, and canonical org builds

Entities read (not owned):
  NexusUser — callsign, nexus_rank

External integrations:
  Fleetyards API — fleet data, member ship
    ownership, and loadout reference
  sc-data community exports — ship manifest,
    component stats, hardpoint data, FPS gear
  Reference: docs/integrations.md

Cross-app integrations:
  LOGISTICS — Dispatch reads fleet assets and
    ship availability from here
  OPERATIONS — live ops depend on fleet and gear
    readiness surfaced here

Known issues / next tasks:
  1. Fleetyards API client to be built in
     src/core/data/fleetyards.js
  2. sc-data ingestion pipeline to be built in
     scripts/ingest-ship-data.js
  3. Fleet ownership auth flow still needs a
     member-authorized Fleetyards OAuth layer

What NOT to touch:
  Wallet/Transaction — owned by COMMERCE
  CargoJob — owned by LOGISTICS
  NexusUser — owned by core shell
