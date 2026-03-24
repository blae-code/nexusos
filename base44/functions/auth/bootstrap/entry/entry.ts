import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';
const SYSTEM_ADMIN_LOGIN = 'system-admin';
const enc = new TextEncoder();

function randomBlock(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < len; i++) result += CHARS[bytes[i] % CHARS.length];
  return result;
}

function generateKey() { return `RSN-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`; }

async function hmacHash(key, secret) {
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(key));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeLoginName(value) { return String(value || '').trim().toLowerCase(); }

function readBodyField(body, ...keys) {
  for (const key of keys) { const v = body?.[key]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  return '';
}

function readBodyFlag(body, ...keys) {
  for (const key of keys) { const v = body?.[key]; if (v === true || v === 'true' || v === 1 || v === '1') return true; }
  return false;
}

function matchesSystemAdmin(c) {
  return normalizeLoginName(c?.login_name || c?.username || '') === SYSTEM_ADMIN_LOGIN
    || String(c?.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN;
}

function candidateFreshness(c) {
  return new Date(c?.key_issued_at || c?.updated_date || c?.created_date || c?.last_seen_at || c?.joined_at || 0).getTime();
}

function pickCanonicalAdmin(candidates) {
  return [...(candidates || [])].sort((a, b) => {
    const ah = a?.auth_key_hash ? 1 : 0, bh = b?.auth_key_hash ? 1 : 0;
    if (ah !== bh) return bh - ah;
    const aa = a?.key_revoked === true ? 0 : 1, ba = b?.key_revoked === true ? 0 : 1;
    if (aa !== ba) return ba - aa;
    return candidateFreshness(b) - candidateFreshness(a);
  })[0] || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });

  let body = {};
  if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }

  const recoveryToken = readBodyField(body, 'recovery_token', 'recoveryToken', 'bootstrap_token', 'bootstrapToken');
  const recoverySecret = String(Deno.env.get('SYSTEM_ADMIN_BOOTSTRAP_SECRET') || '').trim();
  const isRecoveryRequest = Boolean(recoveryToken);
  const recoveryAuthorized = Boolean(recoverySecret) && recoveryToken === recoverySecret;
  const resetRequested = readBodyFlag(body, 'reset', 'force_reset', 'hard_reset');

  const base44 = createClientFromRequest(req);
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const matchingAdmins = (allUsers || []).filter(matchesSystemAdmin);
  let admin = pickCanonicalAdmin(matchingAdmins);
  const now = new Date().toISOString();

  if (resetRequested && !recoveryAuthorized) {
    return Response.json({ error: 'invalid_recovery_token', message: 'Hard reset requires the recovery token.', login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN }, { status: 403 });
  }

  if (resetRequested) {
    for (const c of matchingAdmins) await base44.asServiceRole.entities.NexusUser.delete(c.id);
    admin = null;
  }

  if (!admin) {
    admin = await base44.asServiceRole.entities.NexusUser.create({
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: 'System Admin', nexus_rank: 'PIONEER', is_admin: true, key_revoked: false,
      onboarding_complete: true, joined_at: now, last_seen_at: now, ai_features_enabled: true,
    });
  } else {
    await base44.asServiceRole.entities.NexusUser.update(admin.id, {
      login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
      full_name: admin.full_name || 'System Admin', nexus_rank: 'PIONEER', is_admin: true, key_revoked: false,
      onboarding_complete: true, joined_at: admin.joined_at || now, last_seen_at: admin.last_seen_at || now,
      ai_features_enabled: admin.ai_features_enabled ?? true,
    });
  }

  if (admin.auth_key_hash) {
    if (isRecoveryRequest && !recoveryAuthorized) {
      return Response.json({ error: 'invalid_recovery_token', message: 'The recovery token was rejected.', login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN }, { status: 403 });
    }
    if (!recoveryAuthorized) {
      return Response.json({
        error: 'already_bootstrapped',
        message: 'Bootstrap already completed. Use the issued username at the Access Gate or regenerate the key from Key Management.',
        login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
        recovery_enabled: Boolean(recoverySecret), duplicates_detected: matchingAdmins.length > 1,
      });
    }
    await base44.asServiceRole.entities.NexusUser.update(admin.id, { key_revoked: false, session_invalidated_at: now, revoked_at: null });
  }

  const plainKey = generateKey();
  const hash = await hmacHash(plainKey, secret);

  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN,
    full_name: admin.full_name || 'System Admin', auth_key_hash: hash, key_prefix: plainKey.slice(0, 8),
    key_issued_by: SYSTEM_ADMIN_CALLSIGN, key_issued_at: now, is_admin: true, nexus_rank: 'PIONEER',
    key_revoked: false, onboarding_complete: true, joined_at: admin.joined_at || now, last_seen_at: now,
    ai_features_enabled: admin.ai_features_enabled ?? true, session_invalidated_at: now, revoked_at: null,
  });

  return Response.json({ success: true, recovered: recoveryAuthorized, reset: resetRequested, login_name: SYSTEM_ADMIN_LOGIN, username: SYSTEM_ADMIN_LOGIN, callsign: SYSTEM_ADMIN_CALLSIGN, key: plainKey });
});