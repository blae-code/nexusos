/**
 * generateKey — Creates a new NexusUser with a hashed auth key.
 * Called by Pioneers from the Key Management UI.
 * Body: { callsign, nexus_rank, issued_by_callsign }
 * Returns: { key, key_prefix, user_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();

function randomBlock(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < len; i++) result += CHARS[bytes[i] % CHARS.length];
  return result;
}

function generateAuthKey() {
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
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'SESSION_SIGNING_SECRET not configured' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  const { callsign, nexus_rank, issued_by_callsign } = body;
  if (!callsign || !nexus_rank) {
    return Response.json({ error: 'callsign and nexus_rank are required' }, { status: 400 });
  }

  // Check callsign uniqueness
  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  const existing = (allUsers || []).find(u => u.callsign && u.callsign.toLowerCase() === callsign.trim().toLowerCase());
  if (existing) {
    return Response.json({ error: 'callsign_taken' }, { status: 409 });
  }

  // Generate key and hash with HMAC-SHA256
  const authKey = generateAuthKey();
  const authKeyHash = await hmacHash(authKey, secret);
  const keyPrefix = authKey.slice(0, 8);

  // Create NexusUser
  const newUser = await base44.asServiceRole.entities.NexusUser.create({
    callsign: callsign.trim(),
    auth_key_hash: authKeyHash,
    key_prefix: keyPrefix,
    nexus_rank,
    key_issued_by: issued_by_callsign || 'SYSTEM',
    key_issued_at: new Date().toISOString(),
    key_revoked: false,
    onboarding_complete: false,
  });

  return Response.json({
    key: authKey,
    key_prefix: keyPrefix,
    user_id: newUser?.id || null,
  });
});