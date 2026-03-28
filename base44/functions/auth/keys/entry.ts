/**
 * GET/POST /auth/keys — Admin key management (issue, revoke, regenerate, update rank).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  AUTH_ISSUE_REQUIRED_FIELDS,
  AUTH_REGENERATE_REQUIRED_FIELDS,
  findUserById,
  generateAuthKey,
  getSessionSigningSecret,
  hashAuthKey,
  isAdminUser,
  keyPrefixFromAuthKey,
  listNexusUsers,
  normalizeCallsign,
  normalizeLoginName,
  requireAdminSession,
  resolveUserCallsign,
  serializeManagedUser,
  sessionNoStoreHeaders,
  verifyAuthUserReadback,
} from '../_shared/issuedKey/entry.ts';

const VALID_RANKS = new Set(['PIONEER', 'FOUNDER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE']);

Deno.serve(async (req) => {
  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  const base44 = createClientFromRequest(req);
  const issuedByCallsign = resolveUserCallsign(adminSession.user);

  if (req.method === 'GET') {
    const users = await listNexusUsers(base44);
    const sorted = users.sort((left, right) => {
      const leftTime = new Date(left.key_issued_at || left.last_seen_at || left.joined_at || 0).getTime();
      const rightTime = new Date(right.key_issued_at || right.last_seen_at || right.joined_at || 0).getTime();
      return rightTime - leftTime;
    });

    return Response.json({ users: sorted.map(serializeManagedUser) }, { headers: sessionNoStoreHeaders() });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  const action = String(body?.action || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (action === 'issue') {
    const loginName = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
    const callsign = normalizeCallsign(body?.callsign || body?.username || body?.login_name);
    const rank = String(body?.nexus_rank || '').trim().toUpperCase();

    if (!loginName || !callsign || !VALID_RANKS.has(rank)) {
      return Response.json({ error: 'invalid_issue_request' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    const users = await listNexusUsers(base44);
    if (users.some((candidate) => normalizeLoginName(candidate.login_name || candidate.username || candidate.callsign) === loginName)) {
      return Response.json({ error: 'username_taken' }, { status: 409, headers: sessionNoStoreHeaders() });
    }
    if (users.some((candidate) => normalizeCallsign(candidate.callsign || '') === callsign)) {
      return Response.json({ error: 'callsign_taken' }, { status: 409, headers: sessionNoStoreHeaders() });
    }

    const secret = getSessionSigningSecret();
    const authKey = generateAuthKey();
    const authKeyHash = await hashAuthKey(authKey, secret);
    const created = await base44.asServiceRole.entities.NexusUser.create({
      login_name: loginName,
      username: loginName,
      callsign,
      auth_key_hash: authKeyHash,
      key_prefix: keyPrefixFromAuthKey(authKey),
      nexus_rank: rank,
      key_issued_by: issuedByCallsign,
      key_issued_at: now,
      key_revoked: false,
      onboarding_complete: false,
      is_admin: rank === 'PIONEER',
    });

    const readback = await verifyAuthUserReadback(base44, created.id, {
      login_name: loginName,
      username: loginName,
      callsign,
      nexus_rank: rank,
      auth_key_hash: authKeyHash,
      key_prefix: keyPrefixFromAuthKey(authKey),
      key_issued_at: now,
      key_revoked: false,
      onboarding_complete: false,
      is_admin: rank === 'PIONEER',
    }, AUTH_ISSUE_REQUIRED_FIELDS);

    if (!readback.ok) {
      await base44.asServiceRole.entities.NexusUser.delete(created.id).catch(() => null);
      return Response.json({
        error: 'schema_persist_failed',
        field_checks: readback.field_checks,
      }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    return Response.json({
      key: authKey,
      key_prefix: keyPrefixFromAuthKey(authKey),
      user: readback.user ? serializeManagedUser(readback.user) : null,
    }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'revoke') {
    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) {
      return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    }

    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      key_revoked: true,
      revoked_at: now,
      session_invalidated_at: now,
    });

    return Response.json({ ok: true }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'regenerate') {
    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) {
      return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    }

    const secret = getSessionSigningSecret();
    const authKey = generateAuthKey();
    const authKeyHash = await hashAuthKey(authKey, secret);
    const loginName = normalizeLoginName(target.login_name || target.username || target.callsign);
    const callsign = normalizeCallsign(target.callsign || target.login_name || target.username);
    const rank = String(target.nexus_rank || 'AFFILIATE').trim().toUpperCase();
    const admin = isAdminUser(target);

    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      login_name: loginName,
      username: loginName,
      callsign,
      auth_key_hash: authKeyHash,
      key_prefix: keyPrefixFromAuthKey(authKey),
      key_issued_by: issuedByCallsign,
      key_issued_at: now,
      key_revoked: false,
      session_invalidated_at: now,
      revoked_at: null,
      nexus_rank: rank,
      is_admin: admin,
    });

    const readback = await verifyAuthUserReadback(base44, target.id, {
      login_name: loginName,
      username: loginName,
      callsign,
      nexus_rank: rank,
      auth_key_hash: authKeyHash,
      key_prefix: keyPrefixFromAuthKey(authKey),
      key_issued_at: now,
      key_revoked: false,
      session_invalidated_at: now,
      is_admin: admin,
    }, AUTH_REGENERATE_REQUIRED_FIELDS);

    if (!readback.ok) {
      return Response.json({
        error: 'schema_persist_failed',
        field_checks: readback.field_checks,
      }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    return Response.json({
      key: authKey,
      key_prefix: keyPrefixFromAuthKey(authKey),
      user: readback.user ? serializeManagedUser(readback.user) : null,
    }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'update_rank') {
    const rank = String(body?.nexus_rank || '').trim().toUpperCase();
    if (!VALID_RANKS.has(rank)) {
      return Response.json({ error: 'invalid_rank' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    const target = await findUserById(base44, String(body?.user_id || '').trim());
    if (!target) {
      return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    }

    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      nexus_rank: rank,
      is_admin: rank === 'PIONEER',
      session_invalidated_at: now,
    });

    const refreshed = await findUserById(base44, target.id);
    return Response.json({
      ok: true,
      user: refreshed ? serializeManagedUser(refreshed) : null,
    }, { headers: sessionNoStoreHeaders() });
  }

  return Response.json({ error: 'invalid_action' }, { status: 400, headers: sessionNoStoreHeaders() });
});
