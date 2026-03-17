Purpose: Cargo movement, hauling jobs, and
consignment operations. Inspired by EVE
Online's courier contract system and
professional hauling services Push X and
Red Frog.

Modules:
  Cargo Board — post and claim hauling jobs,
    risk-tiered GREEN/AMBER/RED, collateral
    required based on tier and cargo value,
    visible to Scout rank and above
  Manifest — active hauls in progress, pickup
    confirmed, in-transit, delivered, failed.
    Both parties must confirm delivery.
    Failed delivery triggers automatic
    collateral transfer via Commerce Wallet.
  Consignment — member deposits goods with org
    for sale on their behalf, org takes
    configurable commission rate, proceeds
    auto-transferred to member Wallet on sale
  Dispatch — assign org ships and crew to
    active cargo jobs, reads fleet data from
    ARMORY, Pioneer/Founder rank only

Cargo appraisal tool (available in Cargo Board
and Manifest views):
  Paste a cargo manifest of material names and
  quantities, system cross-references Material
  entity and current StarHead/UEX prices,
  returns instant aUEC valuation.

Risk tier system:
  GREEN — safe systems, cargo under 500k aUEC,
    10% collateral required
  AMBER — contested systems or 500k–5M aUEC,
    25% collateral required
  RED — active PvP zones or over 5M aUEC,
    50% collateral, Voyager/Pioneer only

Entities owned:
  CargoJob: job_type (HAUL/COLLECT/DELIVER),
    status (OPEN/CLAIMED/IN_TRANSIT/DELIVERED/
    FAILED/CANCELLED), risk_tier (GREEN/AMBER/
    RED), issuer_id, courier_id,
    cargo_manifest (array), pickup_location,
    delivery_location, reward_aUEC,
    collateral_aUEC, claimed_at, delivered_at,
    confirmed_at, failed_at, notes

Entities read (not owned):
  NexusUser — callsign, rank
  Material — for cargo appraisal
  Contract — from COMMERCE
  FleetBuild — from ARMORY for Dispatch

External integrations:
  StarHead API — cargo appraisal pricing
  UEX API — secondary price source
  Reference: docs/integrations.md

Cross-app integrations:
  COMMERCE — collateral transfers on failure,
    consignment proceeds to Wallet
  ARMORY — Dispatch reads fleet assets
  INDUSTRY — material valuations for appraisal

Known issues / next tasks:
  1. CargoJob entity needs to be added to
     Base44 data model
  2. Collateral transfer logic requires Wallet
     entity (Commerce) to exist first
  3. Dispatch module requires FleetBuild entity
     (ARMORY) to exist first — Phase 2

What NOT to touch:
  Wallet/Transaction — owned by COMMERCE
  FleetBuild — owned by ARMORY
  NexusUser — owned by core shell
