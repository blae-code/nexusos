/**
 * POST /auth/roundtrip — Admin-only auth schema/persistence diagnostic.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  AUTH_CRITICAL_FIELDS,
  buildAuthFieldChecks,
  generateAuthKey,
  getSessionSigningSecret,
  hashAuthKey,
  keyPrefixFromAuthKey,
  requireAdminSession,
  sessionNoStoreHeaders,
  verifyAuthUserReadback,
} from '../_shared/issuedKey/entry.ts';

function detailsFromChecks(checks, fields = AUTH_CRITICAL_FIELDS) {
  return Object.fromEntries(fields.map((field) => [field, checks[field] === true]));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  const secretPresent = Boolean(Deno.env.get('SESSION_SIGNING_SECRET')?.trim());
  if (!secretPresent) {
    return Response.json({
      ok: false,
      secret_present: false,
      schema_fields_present: false,
      create_ok: false,
      readback_ok: false,
      hash_match_ok: false,
      cleanup_ok: false,
      details: {},
    }, { headers: sessionNoStoreHeaders() });
  }

  const secret = getSessionSigningSecret();
  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const suffix = crypto.randomUUID().slice(0, 8);
  const loginName = `diag-${suffix}`;
  const callsign = `DIAG-${suffix}`.toUpperCase();
  const plainKey = generateAuthKey();
  const authKeyHash = await hashAuthKey(plainKey, secret);

  const expected = {
    login_name: loginName,
    username: loginName,
    callsign,
    nexus_rank: 'SCOUT',
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefixFromAuthKey(plainKey),
    key_issued_at: now,
    key_revoked: false,
    session_invalidated_at: now,
    onboarding_complete: true,
    consent_given: true,
    consent_timestamp: now,
    is_admin: false,
  };

  let created = null;
  let createOk = false;
  let readbackOk = false;
  let hashMatchOk = false;
  let cleanupOk = false;
  let checks = buildAuthFieldChecks(null, expected);

  try {
    created = await base44.asServiceRole.entities.NexusUser.create({
      ...expected,
      key_issued_by: adminSession.user.callsign || adminSession.user.login_name || 'SYSTEM',
      joined_at: now,
      last_seen_at: now,
    });
    createOk = Boolean(created?.id);

    if (created?.id) {
      const readback = await verifyAuthUserReadback(base44, created.id, expected, AUTH_CRITICAL_FIELDS);
      checks = readback.field_checks;
      readbackOk = readback.ok;
      hashMatchOk = readback.user?.auth_key_hash === authKeyHash;
    }
  } catch (error) {
    console.error('[auth/roundtrip]', error);
  } finally {
    if (created?.id) {
      cleanupOk = await base44.asServiceRole.entities.NexusUser.delete(created.id)
        .then(() => true)
        .catch(() => false);
    }
  }

  const schemaFieldsPresent = Object.values(detailsFromChecks(checks)).every(Boolean);

  return Response.json({
    ok: secretPresent && createOk && readbackOk && hashMatchOk && cleanupOk,
    secret_present: secretPresent,
    schema_fields_present: schemaFieldsPresent,
    create_ok: createOk,
    readback_ok: readbackOk,
    hash_match_ok: hashMatchOk,
    cleanup_ok: cleanupOk,
    details: detailsFromChecks(checks),
  }, { headers: sessionNoStoreHeaders() });
});
