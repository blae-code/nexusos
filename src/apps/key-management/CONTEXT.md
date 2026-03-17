# Key Management — App Context

**Route:** `/app/admin/keys`
**Directory:** `src/apps/key-management/`
**Status:** COMPLETE — production-ready

---

## Purpose

Auth key lifecycle management for Redscar Nomads org members.
Only accessible to PIONEER / FOUNDER / SYSTEM_ADMIN ranks.

Covers:
- Listing all members with their current auth key state
- Generating first-time keys for new members
- Reissuing keys (invalidates old key, preserves Discord ID + callsign)
- Revoking keys (marks key_revoked = true, invalidates any active session)

This module is the UI surface for the `keyManagement` Base44 function.
All actual key generation and hashing happens server-side — the frontend never handles key cryptography.

---

## Entity Ownership

This app **does not own any Base44 entity directly**. All state is managed through the `keyManagement` server function.

This app **invokes** (Base44 functions):

| Function | Action | Result |
|----------|--------|--------|
| `keyManagement` | `list` | Returns `{ users: [...] }` — all nexus_users with key state |
| `keyManagement` | `generate` | Returns `{ raw_key }` — first-time key for member (display once) |
| `keyManagement` | `reissue` | Returns `{ raw_key }` — new key, old key immediately invalidated |
| `keyManagement` | `revoke` | Returns `{}` — sets key_revoked = true, invalidates sessions |

**nexus_users fields visible to this module** (read-only, returned by list action):
- `id`, `callsign`, `key_prefix` (RSN-XXXX portion only), `key_revoked`, `key_issued_at`, `rank`, `discord_id`
- `auth_key_hash` is **never returned** to the frontend

---

## Cross-App Data Dependencies

None. Key Management is fully isolated — it has no read dependencies on other apps.
The module reads member list from `keyManagement` server function only.

---

## User Flows

1. **View key list** — Load `/app/admin/keys`; rank guard redirects non-elevated users to `/app/industry`; table loads via `keyManagement` action `list`
2. **Filter members** — Filter chips: ALL / ACTIVE / REVOKED / NO KEY; filters the in-memory users array
3. **Generate key** — For members with no key_prefix: GENERATE button → `keyManagement` action `generate` → NewKeyBanner shows raw key with copy button; "display once" warning; DISMISS clears it
4. **Reissue key** — For members with active key: REISSUE button → confirmation inline (CONFIRM / CANCEL); on confirm: `keyManagement` action `reissue` → NewKeyBanner with new raw key
5. **Revoke key** — For members with active key: REVOKE button → inline confirmation (danger styling); on confirm: `keyManagement` action `revoke` → member row updates to REVOKED status
6. **Refresh list** — Refresh button (RefreshCw icon) in header → re-runs `keyManagement` action `list`
7. **View key prefix** — Key prefix column shows `RSN-XXXX-····-····` — actual key suffix never exposed; copy button copies full raw_key only after generation

---

## Component Inventory

| File | Role | Status |
|------|------|--------|
| `KeyManagement.jsx` | Route component — full key management UI (single file, all helpers inline) | **Complete** |

### Inline helpers (defined inside `KeyManagement.jsx`):

| Helper | Role |
|--------|------|
| `RankBadge` | Colour-coded rank label (PIONEER=warn, FOUNDER=acc2, VOYAGER=info, SCOUT=live, VAGRANT=t1, AFFILIATE=t2) |
| `StatusDot` | Coloured status dot + label (ACTIVE=live, REVOKED=danger, NO KEY=t3) |
| `CopyButton` | Clipboard copy with 1.6s "COPIED" confirmation flash |
| `NewKeyBanner` | One-time raw key display with copy + dismiss; warns key not shown again |

---

## Known Issues / Next Tasks

1. **Error state persists across re-loads**: `actionError` is set on failure but not cleared on unmount. If the user navigates away and returns, a stale error string can remain if the component re-mounts. Fix: clear `actionError` in a `useEffect` cleanup or clear on successful `load()` call (already done via `setActionError('')` at start of load).

2. **No pre-action validation**: Before calling `generate` / `reissue` / `revoke`, the component does not verify the user still exists in the current loaded list. If the list is stale and a user was deleted server-side, the action will fail with a server-side error. Acceptable for current usage; add `load()` before action if it becomes a UX issue.

3. **No "Generate key" from scratch for new members not yet in list**: There is no "Add Member" dialog. New members must first exist in `nexus_users` (created on first Discord OAuth2 login) before a key can be generated for them. This is by design — see `NEXUSOS_AI_HANDOFF.md` auth flow.

4. **Herald Bot DM not confirmed in UI**: When a key is generated or reissued, the intended flow is for Herald Bot to DM the raw key to the member. There is no confirmation in the UI that the DM succeeded. The raw key is shown once to the admin as a fallback. Consider adding a "DM sent" status or a manual "Send via Bot" button.

5. **`key_issued_by` not displayed**: The `nexus_users` schema includes `key_issued_by` (who generated the key) but this is not shown in the table. Could be added as a tooltip or extra column.

---

## What NOT to Touch

- **Do not** handle raw keys in this file beyond displaying them once — all key generation and hashing is server-side in `functions/keyManagement.ts`. The frontend receives `raw_key` only in the generate/reissue response, and only displays it; it is never stored in component state beyond the current render cycle.
- **Do not** expand access beyond PIONEER / FOUNDER / SYSTEM_ADMIN (`ELEVATED_RANKS` constant). Rank gate is the only access control.
- **Do not** add email fields or email-based lookup — members have no email field. Identity is `callsign` + `discord_id`.
- **Do not** expose `auth_key_hash` — this is never returned by the server function and must never be surfaced anywhere in the UI.
- **Do not** remove the inline confirmation step (CONFIRM/CANCEL) before `revoke` or `reissue` — key operations are irreversible from the member's perspective.
