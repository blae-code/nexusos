# Commerce — App Context

**Route:** `/app/industry/commerce`
**Directory:** `src/apps/commerce/` plus [Commerce.jsx](/C:/Users/Owner/Desktop/NexusOS/nexusos/src/pages/Commerce.jsx)
**Status:** COMPLETE for sandbox-backed use; graceful read-only fallback when wallet/contract entities are missing in a non-sandbox deployment

## Purpose

Commerce is the finance layer of NexusOS. It owns:
- Personal wallet visibility and transaction logging
- Org treasury handoff into the Coffer ledger
- Trade planning visibility and cargo-profit snapshots
- Contract issuance for courier, exchange, and auction flows

## Active Modules

- `Wallet` — active member balance, pending entries, manual credits/debits
- `Coffer` — deep link into the dedicated coffer ledger route
- `Trade Desk` — route map plus logged cargo-profit context
- `Contracts` — issue, accept, complete, and expire finance work orders

## Entities

Primary owned entities:
- `Wallet`
- `Transaction`
- `Contract`

Read dependencies:
- `NexusUser`
- `CofferLog`
- `CargoLog`

## Cross-App Links

- `OPERATIONS` writes split outcomes that can be reflected in wallet activity and the coffer
- `LOGISTICS` consumes courier contracts and handles fulfilment / dispatch
- `INDUSTRY` continues to own the coffer ledger and material-value context

## Current Implementation Notes

- The routed page lives in [Commerce.jsx](/C:/Users/Owner/Desktop/NexusOS/nexusos/src/pages/Commerce.jsx); `src/apps/commerce/components/TradeRouteMap.jsx` is now actively used there.
- In sandbox mode, wallet/transaction/contract CRUD is fully backed by the generic entity client.
- In deployments where those entities are unavailable, the page shows a warning and degrades to read-only behavior instead of crashing.

## Remaining External Work

- StarHead / UEX live market clients are still optional follow-on work.
- Real non-sandbox deployments still require the corresponding Base44 entity schema to exist if write access is desired.
