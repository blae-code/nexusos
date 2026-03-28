# Admin Control Plane

NexusOS v1 keeps `PIONEER || is_admin` as the effective admin model. Canonical admin routes now live under `/app/admin/*`.

## Canonical Routes
- `/app/admin/keys` — issued-key lifecycle, rank repair, system-admin bootstrap
- `/app/admin/settings` — deployment checks, auth health, manual system operations
- `/app/admin/readiness` — release-blocking readiness checks and sample-data audit
- `/app/admin/data` — entity repair console and admin audit log access

`/app/keys` remains as a compatibility redirect only.

## Recovery Policy
- `auth/bootstrap` is the only supported recovery path for the fixed `system-admin` account.
- `SYSTEM_ADMIN_BOOTSTRAP_SECRET` remains the protected non-session recovery secret.
- The old public `resetAdmin` endpoint and legacy alias were removed. There is no unauthenticated admin reset path in the repo.

## Safe Mutation Rules
- Protected identity and finance records are edit-only in the generic data console:
  - `NexusUser`
  - `Wallet`
  - `Transaction`
  - `CofferLog`
  - `CargoLog`
  - `Contract`
  - `MemberDebt`
  - `OrgTransfer`
- When an entity already has a real inactive/archive state, the admin console uses that strategy instead of hard delete.
- Hard delete is reserved for lower-risk records without a valid inactive state.
- Destructive actions require a reason so the audit trail remains usable.

## Audit Trail
- Every admin mutation and manual admin operation writes an `AdminActionLog` record.
- Expected fields:
  - `acted_by_user_id`
  - `acted_by_callsign`
  - `action_type`
  - `entity_name`
  - `record_id`
  - `record_label`
  - `reason`
  - `strategy`
  - `before_snapshot`
  - `after_snapshot`
  - `created_at`

## Manual Operations
Admin Settings exposes these manual operations through `adminOps`:
- `sync_fleetyards_roster`
- `sync_uex_prices`
- `sync_game_data`
- `refresh_patch_digest`
- `run_patch_intelligence_self_test`

These operations are audited through `AdminActionLog`.

FleetYards roster sync additionally requires:
- `FLEETYARDS_HANDLE` set to the FleetYards fleet slug or RSI SID
- `FLEETYARDS_AUTH_COOKIE` set to an authenticated FleetYards Cookie header that can read the fleet vehicle roster
