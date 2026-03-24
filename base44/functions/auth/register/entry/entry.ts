/**
 * POST /auth/register — Legacy alias for first-use issued-key login.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  appendSessionCookie,
  createSessionToken,
  findUserByLoginName,
  getSessionSigningSecret,
  hashAuthKey,
  isAdminUser,
  normalizeLoginName,
  resolveUserCallsign,
  sessionNoStoreHeaders,
} from '../_shared/issuedKey.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  const username = normalizeLoginName(body?.username || body?.login_name || body?.callsign);
  const authKey = String(body?.key || '').trim();
  const rememberMe = body?.remember_me === true;

  if (!username || !authKey) {
    return Response.json({ error: 'invalid_key' }, { status: 400, headers: sessionNoStoreHeaders() });
  }

  try {
    const secret = getSessionSigningSecret();
    const base44 = createClientFromRequest(req);
    const user = await findUserByLoginName(base44, username);

    if (!user) {
      return Response.json({ error: 'invalid_key' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    if (user.key_revoked) {
      return Response.json({ error: 'key_revoked' }, { status: 403, headers: sessionNoStoreHeaders() });
    }

    if (!user.auth_key_hash) {
      return Response.json({ error: 'invalid_key' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const presentedHash = await hashAuthKey(authKey, secret);
    if (presentedHash !== user.auth_key_hash) {
      return Response.json({ error: 'invalid_key' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    const now = new Date().toISOString();
    const firstLogin = !user.joined_at;
    const nextCallsign = resolveUserCallsign(user);
    const loginName = user.login_name || username;
    const isAdmin = isAdminUser(user);

    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      login_name: loginName,
      username: loginName,
      callsign: nextCallsign,
      joined_at: user.joined_at || now,
      last_seen_at: now,
      is_admin: isAdmin,
      key_revoked: false,
    });

    const nextUser = {
      ...user,
      login_name: loginName,
      callsign: nextCallsign,
      joined_at: user.joined_at || now,
      last_seen_at: now,
      is_admin: isAdmin,
    };

    const token = await createSessionToken(nextUser, secret, rememberMe);
    const headers = new Headers(sessionNoStoreHeaders());
    appendSessionCookie(headers, token, req, rememberMe);

    return Response.json({
      success: true,
      isNew: firstLogin,
      onboarding_complete: nextUser.onboarding_complete ?? false,
      nexus_rank: nextUser.nexus_rank || 'AFFILIATE',
      is_admin: isAdmin,
      login_name: loginName,
      username: loginName,
      callsign: nextCallsign,
    }, { headers });
  } catch (error) {
    console.error('[auth/register]', error);
    return Response.json({ error: 'registration_failed' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
