/**
 * GET /auth/bootstrap — One-time SYSTEM-ADMIN key generator.
 * No auth required. Returns plaintext key ONCE, then refuses.
 * DELETE THIS FUNCTION after first login.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateKey() {
  const block = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return s;
  };
  return `RSN-${block()}-${block()}-${block()}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  // Find the SYSTEM-ADMIN user
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

  // Already bootstrapped?
  if (admin.auth_key_hash) {
    return Response.json({
      error: 'already_bootstrapped',
      message: 'Bootstrap already completed. Delete this function after first login.',
    });
  }

  // Generate and hash the key
  const plainKey = generateKey();
  const hash = await bcrypt.hash(plainKey, 10);
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