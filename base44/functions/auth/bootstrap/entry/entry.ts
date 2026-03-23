/**
 * GET /auth/bootstrap — One-time SYSTEM-ADMIN key generator.
 * No auth required. Returns plaintext key ONCE, then refuses.
 * DELETE THIS FUNCTION after first login.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const admin = (allUsers || []).find(
    u => u.callsign && u.callsign.toUpperCase() === 'SYSTEM-ADMIN'
  );

  if (!admin) {
    return Response.json({
      error: 'no_admin_record',
      message: 'No NexusUser with callsign SYSTEM-ADMIN exists. Create the record first with callsign=SYSTEM-ADMIN, nexus_rank=PIONEER.',
    }, { status: 404 });
  }

  if (admin.auth_key_hash) {
    return Response.json({
      error: 'already_bootstrapped',
      message: 'Bootstrap already completed. Delete this function after first login.',
    });
  }

  const plainKey = generateKey();
  const hash = await hmacHash(plainKey, secret);
  const now = new Date().toISOString();

  await base44.asServiceRole.entities.NexusUser.update(admin.id, {
    auth_key_hash: hash,
    key_prefix: plainKey.slice(0, 8),
    is_admin: true,
    nexus_rank: 'PIONEER',
    onboarding_complete: true,
    joined_at: now,
    last_seen_at: now,
  });

  return Response.json({
    success: true,
    callsign: 'SYSTEM-ADMIN',
    key: plainKey,
  });
});