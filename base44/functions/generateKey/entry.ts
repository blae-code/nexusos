/**
 * generateKey — Creates a new NexusUser with a hashed auth key.
 * Called by Pioneers from the Key Management UI.
 * Body: { callsign, nexus_rank, issued_by_callsign }
 * Returns: { key, key_prefix, user_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { hash } from 'npm:bcrypt@0.4.1';

function randomBlock(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let result = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function generateAuthKey() {
  return `RSN-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
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

  // Generate key and hash
  const authKey = generateAuthKey();
  const authKeyHash = await hash(authKey, 10);
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