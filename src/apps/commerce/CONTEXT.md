Purpose: Personal and org financial management.
Inspired by EVE Tycoon and EVE market tools.

Modules:
  Wallet — personal aUEC balance, transaction
    history, pending op payouts from split calc
  Coffer — org treasury, contribution history,
    approved expenditure records (surfaces the
    existing CofferLog entity properly)
  Trade — commodity prices via StarHead and UEX
    APIs, buy/sell route analysis, arbitrage
    finder between systems
  Contracts — item exchange listings, auctions
    with bid history, courier contracts with
    collateral system

Entities owned:
  Wallet: member_id, balance_aUEC, last_updated
  Transaction: wallet_id, type (CREDIT/DEBIT/
    PENDING), amount_aUEC, description,
    reference_id, reference_type, created_at
  Contract: contract_type (EXCHANGE/COURIER/
    AUCTION), status (OPEN/ACTIVE/IN_TRANSIT/
    COMPLETE/FAILED/EXPIRED), issuer_id,
    assignee_id, title, description,
    reward_aUEC, collateral_aUEC,
    cargo_manifest (array), pickup_location,
    delivery_location, expires_at, created_at,
    accepted_at, completed_at

Entities read (not owned):
  NexusUser — callsign, nexus_rank
  CofferLog — existing entity surfaced here
  Material — for cargo appraisal valuations

External integrations:
  StarHead API — live commodity prices (primary)
  UEX API — commodity prices (secondary)
  Reference: docs/integrations.md

Cross-app integrations:
  OPERATIONS — split calculator writes to Wallet
  LOGISTICS — contract fulfilment updates here
  INDUSTRY — material valuations for appraisal

Known issues / next tasks:
  1. StarHead API client to be built in
     src/core/data/starhead.js
  2. UEX API client in src/core/data/uex.js
  3. Wallet entity needs to be added to Base44
     data model
  4. Transaction entity needs to be added
  5. Contract entity needs to be added

What NOT to touch:
  CofferLog entity — owned by INDUSTRY/OPERATIONS
  NexusUser entity — owned by core shell
  Any src/apps/operations/ files
  Any src/apps/industry/ files
