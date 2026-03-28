/**
 * GET /resetAdmin?target=SYSTEM-ADMIN|BLAE
 * One-time endpoint to reset auth keys for SYSTEM-ADMIN or BLAE.
 * No auth required — designed for emergency recovery.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

const ALLOWED_TARGETS = ['SYSTEM-ADMIN', 'BLAE'];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const target = (url.searchParams.get('target') || 'SYSTEM-ADMIN').toUpperCase().trim();

  if (!ALLOWED_TARGETS.includes(target)) {
    return Response.json({ error: 'invalid_target', allowed: ALLOWED_TARGETS }, { status: 400 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);

  const users = (await base44.asServiceRole.entities.NexusUser.list('-created_date', 500)) || [];
  const user = users.find(u =>
    (u.callsign || '').toUpperCase().trim() === target,
  );

  if (!user) {
    return Response.json({ error: 'no_admin_record', target }, { status: 404 });
  }

  const authKey = generateAuthKey();
  const authKeyHash = await hmacHex(authKey, secret);
  const now = new Date().toISOString();

  await base44.asServiceRole.entities.NexusUser.update(user.id, {
    auth_key_hash: authKeyHash,
    key_prefix: authKey.slice(0, 8),
    is_admin: true,
    nexus_rank: 'PIONEER',
    onboarding_complete: true,
    joined_at: user.joined_at || now,
    last_seen_at: now,
    key_revoked: false,
  });

  return Response.json({
    success: true,
    callsign: target,
    key: authKey,
    key_prefix: authKey.slice(0, 8),
    user_id: user.id,
  });
});