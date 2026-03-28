/**
 * generateKey — Legacy admin-only invite issuance endpoint.
 * Prefer auth/keys, but keep this path functional for older callers.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  AUTH_ISSUE_REQUIRED_FIELDS,
  generateAuthKey,
  getSessionSigningSecret,
  hashAuthKey,
  keyPrefixFromAuthKey,
  normalizeCallsign,
  normalizeLoginName,
  requireAdminSession,
  verifyAuthUserReadback,
} from '../auth/_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  const loginName = normalizeLoginName(body.username || body.login_name || body.callsign);
  const callsign = normalizeCallsign(body.callsign || body.username || body.login_name);
  const nexusRank = String(body.nexus_rank || '').trim().toUpperCase();
  if (!loginName || !callsign || !nexusRank) {
    return Response.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const existing = (allUsers || []).find((user) =>
    normalizeLoginName(user.login_name || user.username || user.callsign) === loginName
    || normalizeCallsign(user.callsign || '') === callsign
  );
  if (existing) {
    return Response.json({ error: 'callsign_taken' }, { status: 409 });
  }

  let secret = '';
  try {
    secret = getSessionSigningSecret();
  } catch {
    return Response.json({ error: 'session_secret_missing' }, { status: 500 });
  }

  const authKey = generateAuthKey();
  const authKeyHash = await hashAuthKey(authKey, secret);
  const keyPrefix = keyPrefixFromAuthKey(authKey);
  const now = new Date().toISOString();
  const issuedBy = normalizeCallsign(body.issued_by_callsign || adminSession.user.callsign || adminSession.user.login_name || 'SYSTEM');

  const created = await base44.asServiceRole.entities.NexusUser.create({
    login_name: loginName,
    username: loginName,
    callsign,
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefix,
    nexus_rank: nexusRank,
    key_issued_by: issuedBy,
    key_issued_at: now,
    key_revoked: false,
    onboarding_complete: false,
    is_admin: nexusRank === 'PIONEER' && callsign === 'SYSTEM-ADMIN',
  });

  const readback = await verifyAuthUserReadback(base44, created?.id, {
    login_name: loginName,
    username: loginName,
    callsign,
    nexus_rank: nexusRank,
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefix,
    key_issued_at: now,
    key_revoked: false,
    onboarding_complete: false,
  }, AUTH_ISSUE_REQUIRED_FIELDS);

  if (!readback.ok) {
    if (created?.id) {
      await base44.asServiceRole.entities.NexusUser.delete(created.id).catch(() => {});
    }
    return Response.json({
      error: 'schema_persist_failed',
      field_checks: readback.field_checks,
    }, { status: 500 });
  }

  return Response.json({
    key: authKey,
    key_prefix: keyPrefix,
    user_id: created?.id || null,
  });
});