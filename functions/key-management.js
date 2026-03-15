/**
 * key-management — NexusOS auth key operations
 * Pioneer+ only. Handles: generate, reissue (POST), revoke (PATCH).
 *
 * Security model:
 *   - assertCaller reads nexus_rank from NexusUser entity — never from request body
 *   - Plaintext key is returned ONCE from generate/reissue and never persisted
 *   - bcrypt cost 12, charset strips ambiguous chars (I, O, 0, 1)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as bcryptjs from 'npm:bcryptjs@2.4.3';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Ranks permitted to call this endpoint */
const ALLOWED_RANKS = ['PIONEER', 'FOUNDER'];

/** Ranks that can be assigned via the generate form (not Pioneer/Founder — those come from Discord) */
const ALLOWED_STARTING_RANKS = ['VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];

/** Unambiguous charset: no I, O, 0, 1 */
const KEY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const BCRYPT_COST = 12;

// ─── Key helpers ──────────────────────────────────────────────────────────────

function generateAuthKey() {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      KEY_CHARSET[Math.floor(Math.random() * KEY_CHARSET.length)]
    ).join('');
  return `RSN-${seg()}-${seg()}-${seg()}`;
}

/**
 * Returns the first 8 characters of the plaintext key: "RSN-XXXX"
 * Used for display in Key Management without exposing the full key.
 */
function keyPrefix(plaintext) {
  return plaintext.slice(0, 8);
}

// ─── Caller auth + rank gate ──────────────────────────────────────────────────

/**
 * assertCaller — authenticates the request and checks org rank.
 * Rank is read from the NexusUser entity in the DB; it is NEVER trusted
 * from the request body or headers.
 *
 * Returns the NexusUser record if the caller is Pioneer+, or null otherwise.
 * Admin account (blae@katrasoluta.com, role=admin) always passes.
 */
async function assertCaller(base44) {
  const user = await base44.auth.me();
  if (!user) return null;

  // System administrator — Base44 native auth, no NexusUser record
  if (user.role === 'admin') {
    return { nexus_rank: 'PIONEER', discord_id: null, callsign: 'ADMIN' };
  }

  // Member session — look up NexusUser by discord_id, then fall back to callsign
  let records;
  if (user.discord_id) {
    records = await base44.asServiceRole.entities.NexusUser.filter({
      discord_id: String(user.discord_id),
    });
  } else if (user.callsign) {
    records = await base44.asServiceRole.entities.NexusUser.filter({
      callsign: user.callsign,
    });
  } else {
    return null;
  }

  const caller = records?.[0];
  if (!caller) return null;
  if (!ALLOWED_RANKS.includes(caller.nexus_rank)) return null;
  return caller;
}

// ─── Action: generate ─────────────────────────────────────────────────────────

async function handleGenerate(base44, caller, body) {
  const { callsign, nexus_rank, discord_id } = body;

  // Field validation
  if (!callsign || !nexus_rank) {
    return Response.json(
      { error: 'callsign and nexus_rank are required' },
      { status: 400 }
    );
  }

  // Rank validation — Pioneer/Founder only granted via Discord role sync, not this form
  if (!ALLOWED_STARTING_RANKS.includes(nexus_rank)) {
    return Response.json(
      { error: `nexus_rank must be one of: ${ALLOWED_STARTING_RANKS.join(', ')}` },
      { status: 400 }
    );
  }

  const normCallsign = callsign.toUpperCase().trim();

  // Duplicate callsign check — 409 if exists
  const existing = await base44.asServiceRole.entities.NexusUser.filter({
    callsign: normCallsign,
  });
  if (existing?.length > 0) {
    return Response.json(
      { error: `Callsign ${normCallsign} already exists` },
      { status: 409 }
    );
  }

  // Generate key — plaintext never persisted after this function returns
  const plaintext     = generateAuthKey();
  const auth_key_hash = await bcryptjs.hash(plaintext, BCRYPT_COST);
  const now           = new Date().toISOString();

  await base44.asServiceRole.entities.NexusUser.create({
    callsign:       normCallsign,
    nexus_rank,
    auth_key_hash,                      // bcrypt hash only
    key_prefix:     keyPrefix(plaintext), // "RSN-XXXX" (8 chars)
    key_issued_by:  caller.discord_id,
    key_issued_at:  now,
    key_revoked:    false,
    discord_id:     discord_id || null,
    discord_roles:  [],
    joined_at:      now,
  });

  // Herald Bot DM delivery — non-fatal: DM failure must not fail the request
  if (discord_id) {
    base44.asServiceRole.functions
      .invoke('heraldBot', {
        action: 'deliverKey',
        payload: {
          discord_id,
          callsign:   normCallsign,
          nexus_rank,
          auth_key:   plaintext,
        },
      })
      .catch((e) => console.warn('[key-management] heraldBot deliverKey failed:', e.message));
  }

  // Audit log event — non-fatal
  base44.asServiceRole.functions
    .invoke('heraldBot', {
      action: 'keyEvent',
      payload: {
        event_type: 'ISSUED',
        callsign:   normCallsign,
        issued_by:  caller.callsign || caller.discord_id || 'ADMIN',
        nexus_rank,
      },
    })
    .catch((e) => console.warn('[key-management] heraldBot keyEvent failed:', e.message));

  // Plaintext returned once — never stored
  return Response.json({ success: true, auth_key: plaintext });
}

// ─── Action: reissue ──────────────────────────────────────────────────────────

async function handleReissue(base44, caller, body) {
  const { callsign, discord_id } = body;

  if (!callsign) {
    return Response.json({ error: 'callsign is required' }, { status: 400 });
  }

  const records = await base44.asServiceRole.entities.NexusUser.filter({
    callsign: callsign.toUpperCase().trim(),
  });
  const target = records?.[0];
  if (!target) {
    return Response.json(
      { error: `User ${callsign} not found` },
      { status: 404 }
    );
  }

  const plaintext     = generateAuthKey();
  const auth_key_hash = await bcryptjs.hash(plaintext, BCRYPT_COST);
  const now           = new Date().toISOString();

  // Core key fields — always updated
  await base44.asServiceRole.entities.NexusUser.update(target.id, {
    auth_key_hash,
    key_prefix:    keyPrefix(plaintext), // "RSN-XXXX" (8 chars)
    key_issued_at: now,
    key_issued_by: caller.discord_id,
    key_revoked:   false,
  });

  // Session invalidation — wrapped separately: field may not exist in schema yet
  try {
    await base44.asServiceRole.entities.NexusUser.update(target.id, {
      session_invalidated_at: now,
    });
  } catch (e) {
    console.warn('[key-management] session_invalidated_at not in schema yet:', e.message);
  }

  // Herald Bot DM — use body discord_id, fall back to user record's discord_id
  const effectiveDiscordId = discord_id || target.discord_id;
  if (effectiveDiscordId) {
    base44.asServiceRole.functions
      .invoke('heraldBot', {
        action: 'deliverKey',
        payload: {
          discord_id:  effectiveDiscordId,
          callsign:    target.callsign,
          nexus_rank:  target.nexus_rank,
          auth_key:    plaintext,
        },
      })
      .catch((e) => console.warn('[key-management] heraldBot deliverKey failed:', e.message));
  }

  // Plaintext returned once — never stored
  return Response.json({ success: true, auth_key: plaintext });
}

// ─── PATCH: revoke ────────────────────────────────────────────────────────────

async function handleRevoke(base44, caller, body) {
  const { user_id } = body;

  if (!user_id) {
    return Response.json({ error: 'user_id is required' }, { status: 400 });
  }

  // Verify the user exists before revoking
  const records = await base44.asServiceRole.entities.NexusUser.filter({ id: user_id });
  const target  = records?.[0];
  if (!target) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  await base44.asServiceRole.entities.NexusUser.update(user_id, { key_revoked: true });

  // Session invalidation — non-fatal
  try {
    await base44.asServiceRole.entities.NexusUser.update(user_id, {
      session_invalidated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[key-management] session_invalidated_at not in schema yet:', e.message);
  }

  // Audit log — non-fatal
  base44.asServiceRole.functions
    .invoke('heraldBot', {
      action: 'keyEvent',
      payload: {
        event_type: 'REVOKED',
        callsign:   target.callsign,
        issued_by:  caller.callsign || caller.discord_id || 'ADMIN',
      },
    })
    .catch((e) => console.warn('[key-management] heraldBot keyEvent failed:', e.message));

  return Response.json({ success: true, revoked: target.callsign });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const method = req.method.toUpperCase();

    // Auth + rank gate — enforced on all methods
    const caller = await assertCaller(base44);
    if (!caller) {
      return Response.json(
        { error: 'Forbidden — Pioneer+ rank required' },
        { status: 403 }
      );
    }

    if (method === 'POST') {
      const body   = await req.json();
      const action = body?.action;

      if (action === 'generate') return handleGenerate(base44, caller, body);
      if (action === 'reissue')  return handleReissue(base44, caller, body);

      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (method === 'PATCH') {
      const body = await req.json();
      return handleRevoke(base44, caller, body);
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('[key-management] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
