/**
 * POST /auth/bootstrap?target=SYSTEM-ADMIN&force=true
 *
 * If force=true OR the target user has no auth_key_hash → generate a new key.
 * Otherwise return { error: 'already_bootstrapped' }.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const enc = new TextEncoder();
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBlock(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => KEY_CHARS[b % KEY_CHARS.length]).join('');
}

function generateAuthKey() {
  return `RSN-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const target = (url.searchParams.get('target') || 'SYSTEM-ADMIN').toUpperCase().trim();
  const force = url.searchParams.get('force') === 'true';

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);
  const allUsers = (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
  const user = allUsers.find(u => (u.callsign || '').toUpperCase().trim() === target);

  if (!user) {
    return Response.json({ error: 'user_not_found', target }, { status: 404 });
  }

  if (!force && user.auth_key_hash) {
    return Response.json({ error: 'already_bootstrapped', target, user_id: user.id });
  }

  const authKey = generateAuthKey();
  const authKeyHash = await hmacHex(authKey, secret);
  const keyPrefix = authKey.slice(0, 8);
  const now = new Date().toISOString();

  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefix,
    is_admin: true,
    nexus_rank: 'PIONEER',
    onboarding_complete: true,
    joined_at: now,
    last_seen_at: now,
    key_revoked: false,
  });

  return Response.json({
    success: true,
    callsign: target,
    key: authKey,
    key_prefix: keyPrefix,
  });
});