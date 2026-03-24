/**
 * GET /auth/bootstrap — One-time SYSTEM-ADMIN key generator.
 * No auth required. Creates or repairs the SYSTEM-ADMIN record, then
 * returns the plaintext key ONCE. If SYSTEM_ADMIN_BOOTSTRAP_SECRET is set,
 * POST callers may regenerate the key by presenting that recovery token.
 * DELETE THIS FUNCTION after first login.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { normalizeLoginName } from '../_shared/issuedKey.ts';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_LOGIN = 'system-admin';
const enc = new TextEncoder();

function randomBlock(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[bytes[i] % CHARS.length];
  return s;
}

function generateKey() {
  return `RSN-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

async function hmacHash(key, secret) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(key));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function readBodyField(body, ...keys) {
  for (const key of keys) {
    const value = body?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  let body = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const recoveryToken = readBodyField(body, 'recovery_token', 'recoveryToken', 'bootstrap_token', 'bootstrapToken');
  const recoverySecret = String(Deno.env.get('SYSTEM_ADMIN_BOOTSTRAP_SECRET') || '').trim();
  const isRecoveryRequest = Boolean(recoveryToken);
  const recoveryAuthorized = Boolean(recoverySecret) && recoveryToken === recoverySecret;

  const base44 = createClientFromRequest(req);

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  let admin = (allUsers || []).find((candidate) =>
    normalizeLoginName(candidate.login_name || candidate.username || '') === SYSTEM_ADMIN_LOGIN
    || String(candidate.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN,
  );
  const now = new Date().toISOString();

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
    if (isRecoveryRequest && !recoveryAuthorized) {
      return Response.json({
        error: 'invalid_recovery_token',
        message: 'The recovery token was rejected.',
        login_name: SYSTEM_ADMIN_LOGIN,
        username: SYSTEM_ADMIN_LOGIN,
        callsign: SYSTEM_ADMIN_CALLSIGN,
      }, { status: 403 });
    }

    if (!recoveryAuthorized) {
      return Response.json({
        error: 'already_bootstrapped',
        message: 'Bootstrap already completed. Use the issued username at the Access Gate or regenerate the key from Key Management.',
        login_name: SYSTEM_ADMIN_LOGIN,
        username: SYSTEM_ADMIN_LOGIN,
        callsign: SYSTEM_ADMIN_CALLSIGN,
        recovery_enabled: Boolean(recoverySecret),
      });
    }

    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      key_revoked: false,
      session_invalidated_at: now,
      revoked_at: null,
    });
  }

  const plainKey = generateKey();
  const hash = await hmacHash(plainKey, secret);

  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN,
    username: SYSTEM_ADMIN_LOGIN,
    callsign: SYSTEM_ADMIN_CALLSIGN,
    full_name: admin.full_name || 'System Admin',
    auth_key_hash: hash,
    key_prefix: plainKey.slice(0, 8),
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

  return Response.json({
    success: true,
    recovered: recoveryAuthorized,
    login_name: SYSTEM_ADMIN_LOGIN,
    username: SYSTEM_ADMIN_LOGIN,
    callsign: SYSTEM_ADMIN_CALLSIGN,
    key: plainKey,
  });
});
