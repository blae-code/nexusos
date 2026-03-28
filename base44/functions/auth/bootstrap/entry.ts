/**
 * POST /auth/bootstrap — SYSTEM-ADMIN repair and recovery.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  AUTH_REGENERATE_REQUIRED_FIELDS,
  findUserById,
  generateAuthKey,
  getSessionSigningSecret,
  hashAuthKey,
  isAdminUser,
  keyPrefixFromAuthKey,
  normalizeLoginName,
  requireAdminSession,
  sessionNoStoreHeaders,
  verifyAuthUserReadback,
} from '../_shared/issuedKey/entry.ts';

const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_LOGIN = 'system-admin';

function readBodyField(body, ...keys) {
  for (const key of keys) {
    const value = body?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readBodyFlag(body, ...keys) {
  for (const key of keys) {
    const value = body?.[key];
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
  }
  return false;
}

function matchesSystemAdmin(candidate) {
  return normalizeLoginName(candidate?.login_name || candidate?.username || '') === SYSTEM_ADMIN_LOGIN
    || String(candidate?.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN;
}

function pickCanonicalAdmin(candidates) {
  return [...(candidates || [])].sort((left, right) => {
    const leftHash = left?.auth_key_hash ? 1 : 0;
    const rightHash = right?.auth_key_hash ? 1 : 0;
    if (leftHash !== rightHash) return rightHash - leftHash;

    const leftActive = left?.key_revoked === true ? 0 : 1;
    const rightActive = right?.key_revoked === true ? 0 : 1;
    if (leftActive !== rightActive) return rightActive - leftActive;

    return new Date(right?.key_issued_at || right?.created_date || 0).getTime()
      - new Date(left?.key_issued_at || left?.created_date || 0).getTime();
  })[0] || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const secret = getSessionSigningSecret();

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const recoveryToken = readBodyField(body, 'recovery_token', 'recoveryToken', 'bootstrap_token', 'bootstrapToken');
  const recoverySecret = String(Deno.env.get('SYSTEM_ADMIN_BOOTSTRAP_SECRET') || '').trim();
  const recoveryAuthorized = Boolean(recoverySecret) && recoveryToken === recoverySecret;
  const resetRequested = readBodyFlag(body, 'reset', 'force_reset', 'hard_reset');
  const adminSession = await requireAdminSession(req);

  if (!adminSession && !recoveryAuthorized) {
    return Response.json({
      error: 'bootstrap_locked',
      message: 'System Admin bootstrap requires Pioneer clearance or the configured recovery token.',
      recovery_enabled: Boolean(recoverySecret),
      login_name: SYSTEM_ADMIN_LOGIN,
      username: SYSTEM_ADMIN_LOGIN,
      callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  const base44 = createClientFromRequest(req);
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const matchingAdmins = (allUsers || []).filter(matchesSystemAdmin);
  let admin = pickCanonicalAdmin(matchingAdmins);
  const now = new Date().toISOString();

  if (resetRequested && !recoveryAuthorized) {
    return Response.json({
      error: 'invalid_recovery_token',
      message: 'Hard reset requires the recovery token.',
      login_name: SYSTEM_ADMIN_LOGIN,
      username: SYSTEM_ADMIN_LOGIN,
      callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 403, headers: sessionNoStoreHeaders() });
  }

  if (resetRequested) {
    for (const candidate of matchingAdmins) {
      await base44.asServiceRole.entities.NexusUser.delete(candidate.id);
    }
    admin = null;
  }

  if (!admin) {
    admin = await base44.asServiceRole.entities.NexusUser.create({
      login_name: SYSTEM_ADMIN_LOGIN,
      username: SYSTEM_ADMIN_LOGIN,
      callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: 'System Admin',
      nexus_rank: 'PIONEER',
      is_admin: true,
      key_revoked: false,
      onboarding_complete: true,
      joined_at: now,
      last_seen_at: now,
      ai_features_enabled: true,
    });
  } else {
    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      login_name: SYSTEM_ADMIN_LOGIN,
      username: SYSTEM_ADMIN_LOGIN,
      callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: admin.full_name || 'System Admin',
      nexus_rank: 'PIONEER',
      is_admin: true,
      key_revoked: false,
      onboarding_complete: true,
      joined_at: admin.joined_at || now,
      last_seen_at: admin.last_seen_at || now,
      ai_features_enabled: admin.ai_features_enabled ?? true,
    });
  }

  if (admin.auth_key_hash) {
    if (!recoveryAuthorized && !adminSession) {
      return Response.json({
        error: 'already_bootstrapped',
        message: 'Bootstrap already completed.',
        login_name: SYSTEM_ADMIN_LOGIN,
        username: SYSTEM_ADMIN_LOGIN,
        callsign: SYSTEM_ADMIN_CALLSIGN,
        recovery_enabled: Boolean(recoverySecret),
        duplicates_detected: matchingAdmins.length > 1,
      }, { headers: sessionNoStoreHeaders() });
    }

    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      key_revoked: false,
      session_invalidated_at: now,
      revoked_at: null,
    });
  }

  const plainKey = generateAuthKey();
  const hash = await hashAuthKey(plainKey, secret);
  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN,
    username: SYSTEM_ADMIN_LOGIN,
    callsign: SYSTEM_ADMIN_CALLSIGN,
    full_name: admin.full_name || 'System Admin',
    auth_key_hash: hash,
    key_prefix: keyPrefixFromAuthKey(plainKey),
    key_issued_by: SYSTEM_ADMIN_CALLSIGN,
    key_issued_at: now,
    is_admin: true,
    nexus_rank: 'PIONEER',
    key_revoked: false,
    onboarding_complete: true,
    joined_at: admin.joined_at || now,
    last_seen_at: now,
    ai_features_enabled: admin.ai_features_enabled ?? true,
    session_invalidated_at: now,
    revoked_at: null,
  });

  const readback = await verifyAuthUserReadback(base44, admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN,
    username: SYSTEM_ADMIN_LOGIN,
    callsign: SYSTEM_ADMIN_CALLSIGN,
    nexus_rank: 'PIONEER',
    auth_key_hash: hash,
    key_prefix: keyPrefixFromAuthKey(plainKey),
    key_issued_at: now,
    key_revoked: false,
    session_invalidated_at: now,
    onboarding_complete: true,
    is_admin: true,
  }, AUTH_REGENERATE_REQUIRED_FIELDS);

  if (!readback.ok) {
    return Response.json({
      error: 'schema_persist_failed',
      field_checks: readback.field_checks,
      login_name: SYSTEM_ADMIN_LOGIN,
      username: SYSTEM_ADMIN_LOGIN,
      callsign: SYSTEM_ADMIN_CALLSIGN,
    }, { status: 500, headers: sessionNoStoreHeaders() });
  }

  return Response.json({
    success: true,
    recovered: recoveryAuthorized,
    reset: resetRequested,
    login_name: SYSTEM_ADMIN_LOGIN,
    username: SYSTEM_ADMIN_LOGIN,
    callsign: SYSTEM_ADMIN_CALLSIGN,
    key: plainKey,
  }, { headers: sessionNoStoreHeaders() });
});
