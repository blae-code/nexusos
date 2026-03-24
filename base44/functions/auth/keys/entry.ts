import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  findUserById,
  generateAuthKey,
  getSessionSigningSecret,
  hashAuthKey,
  keyPrefixFromAuthKey,
  listNexusUsers,
  normalizeCallsign,
  normalizeLoginName,
  requireAdminSession,
  resolveUserCallsign,
  serializeManagedUser,
  sessionNoStoreHeaders,
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

    return Response.json({
      users: sorted.map(serializeManagedUser),
    }, { headers: sessionNoStoreHeaders() });
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
    const createdUser = await base44.asServiceRole.entities.NexusUser.create({
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

    return Response.json({
      key: authKey,
      key_prefix: keyPrefixFromAuthKey(authKey),
      user: serializeManagedUser(createdUser),
    }, { headers: sessionNoStoreHeaders() });
  }

  if (action === 'revoke') {
    const userId = String(body?.user_id || '').trim();
    const target = await findUserById(base44, userId);
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
    const userId = String(body?.user_id || '').trim();
    const target = await findUserById(base44, userId);
    if (!target) {
      return Response.json({ error: 'not_found' }, { status: 404, headers: sessionNoStoreHeaders() });
    }

    const secret = getSessionSigningSecret();
    const authKey = generateAuthKey();
    const authKeyHash = await hashAuthKey(authKey, secret);

    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      login_name: normalizeLoginName(target.login_name || target.username || target.callsign),
      username: normalizeLoginName(target.login_name || target.username || target.callsign),
      auth_key_hash: authKeyHash,
      key_prefix: keyPrefixFromAuthKey(authKey),
      key_issued_by: issuedByCallsign,
      key_issued_at: now,
      key_revoked: false,
      session_invalidated_at: now,
      revoked_at: null,
    });

    const refreshed = await findUserById(base44, target.id);
    return Response.json({
      key: authKey,
      key_prefix: keyPrefixFromAuthKey(authKey),
      user: refreshed ? serializeManagedUser(refreshed) : null,
    }, { headers: sessionNoStoreHeaders() });
  }

  return Response.json({ error: 'invalid_action' }, { status: 400, headers: sessionNoStoreHeaders() });
});
