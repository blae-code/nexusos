# NexusUser Auth Contract

This document is the current source of truth for issued-key authentication. `NEXUSOS_AI_HANDOFF.md` contains historical context, but the live auth contract is defined here and in `base44/functions/auth/_shared/issuedKey/entry.ts`.

## Source Of Truth

- `NexusUser` is the only member identity store for issued-key auth.
- Base44 native `User` records are not part of the regular member login flow.
- `src/core/data/SessionContext.jsx` is the frontend session boundary.
- `base44/functions/auth/_shared/issuedKey/entry.ts` is the shared backend auth implementation.

## Auth-Critical Fields

These fields must persist correctly for login, session hydration, onboarding, and admin key management to work:

- `id`
- `login_name` or `username`
- `callsign`
- `nexus_rank`
- `auth_key_hash`
- `key_prefix`
- `key_issued_at`
- `key_revoked`
- `session_invalidated_at`
- `onboarding_complete`
- `consent_given`
- `consent_timestamp`
- `is_admin`

## Secret Handling

- `SESSION_SIGNING_SECRET` signs member session cookies.
- Issued auth keys are HMAC-hashed before storage in `NexusUser.auth_key_hash`.
- If `AUTH_KEY_HASH_SECRET` is configured, it is the primary secret for key hashing.
- If `AUTH_KEY_HASH_SECRET` is not configured, key hashing falls back to `SESSION_SIGNING_SECRET`.
- `AUTH_KEY_HASH_FALLBACK_SECRETS` may contain comma- or newline-separated legacy hash secrets to verify older issued keys during migration.

Rotating `SESSION_SIGNING_SECRET` without a dedicated `AUTH_KEY_HASH_SECRET` can invalidate every previously issued auth key. Rotating key-hash secrets safely requires keeping the prior hash secret in `AUTH_KEY_HASH_FALLBACK_SECRETS` until members have logged in and their hashes have been migrated.

## Endpoint Contract

- `auth/login`
- `auth/register`
- `auth/session`
- `auth/logout`
- `auth/keys`
- `auth/bootstrap`
- `auth/roundtrip`
- `completeOnboarding`

`auth/login` and `auth/register` return stable failure codes:

- `user_not_found`
- `key_revoked`
- `missing_auth_fields`
- `hash_mismatch`
- `schema_persist_failed`
- `session_secret_missing`
- `login_failed`

## Admin Diagnostic

Run `auth/roundtrip` before issuing real keys in a deployment.

The roundtrip check:

- creates a temporary `NexusUser`
- writes all auth-critical fields
- reads the record back
- verifies the stored key hash matches the generated key
- deletes the temporary record

Expected response fields:

- `ok`
- `secret_present`
- `schema_fields_present`
- `create_ok`
- `readback_ok`
- `hash_match_ok`
- `cleanup_ok`
- `details`

`details` is field-presence telemetry only. It must never expose plaintext keys or stored hashes.

## Local Dev Contract

- `src/core/data/auth-api.js` must call same-origin `/api/functions/*`.
- `src/core/data/base44Client.js` must use the local Vite origin on `localhost` and `127.0.0.1`.
- Vite must proxy `/api` to `VITE_BASE44_APP_BASE_URL` so issued-key cookies work during `npm run dev`.

## Verification

Before a live deploy is considered auth-ready:

1. Run the admin auth roundtrip and require `ok: true`.
2. Issue a fresh key.
3. Log in from `/`.
4. Complete onboarding.
5. Refresh the session.
6. Revoke and verify the old key is denied.
7. Regenerate and verify the new key is accepted.
