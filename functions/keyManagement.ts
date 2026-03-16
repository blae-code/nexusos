/**
 * keyManagement — NexusOS Auth Key CRUD
 *
 * Actions: generate · revoke · reissue · list
 * Auth gate: PIONEER or FOUNDER rank only (or Base44 admin)
 *
 * Key format: RSN-XXXX-XXXX-XXXX  (uppercase alphanumeric segments)
 * Storage: auth_key_hash (bcrypt), key_prefix (RSN-XXXX for display)
 * Revocation: sets key_revoked=true + session_invalidated_at to kick active sessions
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as bcrypt from 'npm:bcryptjs@2.4.3';
import { resolveMemberSession } from './auth/_shared/auth.ts';

const ELEVATED_RANKS = ['PIONEER', 'FOUNDER'];
const APP_URL = (Deno.env.get('NEXUSOS_PUBLIC_URL') || Deno.env.get('APP_URL') || '').replace(/\/$/, '');

function randomSegment(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) {
    out += chars[b % chars.length];
  }
  return out;
}

function generateRawKey(): string {
  return `RSN-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

async function hashKey(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10);
}

async function resolveCallerRank(req: Request): Promise<{ rank: string | null; isAdmin: boolean }> {
  // Try Base44 native admin first
  try {
    const b44 = createClientFromRequest(req);
    const me = await b44.auth.me();
    if (me?.email) {
      return { rank: 'PIONEER', isAdmin: true };
    }
  } catch {
    // not a Base44 native session
  }

  // Try member cookie session
  const session = await resolveMemberSession(req);
  if (session?.user?.rank) {
    return { rank: session.user.rank, isAdmin: false };
  }

  return { rank: null, isAdmin: false };
}

async function callHeraldBot(req: Request, action: string, payload: Record<string, unknown>) {
  try {
    const b44 = createClientFromRequest(req);
    await b44.functions.invoke('heraldBot', { action, payload });
  } catch (e) {
    console.warn(`[keyManagement] heraldBot ${action} failed:`, (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
  const caller = await resolveCallerRank(req);
  if (!caller.isAdmin && !ELEVATED_RANKS.includes(caller.rank || '')) {
    return Response.json({ error: 'Forbidden — PIONEER or FOUNDER rank required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, user_id } = body as { action: string; user_id?: string };
  const b44 = createClientFromRequest(req);

  // ── LIST ───────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const users = await b44.asServiceRole.entities.NexusUser.list('-joined_at', 200);
    return Response.json({
      users: (users || []).map((u: Record<string, unknown>) => ({
        id: u.id,
        callsign: u.callsign,
        rank: u.nexus_rank || 'AFFILIATE',
        discord_id: u.discord_id,
        key_prefix: u.key_prefix || null,
        key_revoked: u.key_revoked || false,
        key_issued_at: u.key_issued_at || null,
        joined_at: u.joined_at || null,
      })),
    });
  }

  // ── GENERATE ───────────────────────────────────────────────────────────────
  if (action === 'generate') {
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 });
    }

    const user = (await b44.asServiceRole.entities.NexusUser.filter({ id: user_id }))?.[0];
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const raw = generateRawKey();
    const hash = await hashKey(raw);
    const prefix = raw.slice(0, 8); // "RSN-XXXX"
    const now = new Date().toISOString();

    await b44.asServiceRole.entities.NexusUser.update(user_id, {
      auth_key_hash: hash,
      key_prefix: prefix,
      key_issued_at: now,
      key_revoked: false,
      session_invalidated_at: null,
    });

    // DM the key to the member via Herald Bot (non-fatal)
    if (user.discord_id) {
      callHeraldBot(req, 'deliverKey', {
        discord_id: String(user.discord_id),
        callsign: user.callsign || 'OPERATIVE',
        auth_key: raw,
        rank: user.nexus_rank || 'AFFILIATE',
      });
    }

    return Response.json({
      success: true,
      raw_key: raw,
      key_prefix: prefix,
      key_issued_at: now,
      note: 'Display this key once — it cannot be retrieved after this response.',
    });
  }

  // ── REISSUE ────────────────────────────────────────────────────────────────
  if (action === 'reissue') {
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 });
    }

    const user = (await b44.asServiceRole.entities.NexusUser.filter({ id: user_id }))?.[0];
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const raw = generateRawKey();
    const hash = await hashKey(raw);
    const prefix = raw.slice(0, 8);
    const now = new Date().toISOString();

    await b44.asServiceRole.entities.NexusUser.update(user_id, {
      auth_key_hash: hash,
      key_prefix: prefix,
      key_issued_at: now,
      key_revoked: false,
      session_invalidated_at: now, // invalidate old sessions
    });

    if (user.discord_id) {
      callHeraldBot(req, 'deliverKey', {
        discord_id: String(user.discord_id),
        callsign: user.callsign || 'OPERATIVE',
        auth_key: raw,
        rank: user.nexus_rank || 'AFFILIATE',
      });
    }

    return Response.json({
      success: true,
      raw_key: raw,
      key_prefix: prefix,
      key_issued_at: now,
      note: 'Display this key once — it cannot be retrieved after this response.',
    });
  }

  // ── REVOKE ─────────────────────────────────────────────────────────────────
  if (action === 'revoke') {
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 });
    }

    const user = (await b44.asServiceRole.entities.NexusUser.filter({ id: user_id }))?.[0];
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await b44.asServiceRole.entities.NexusUser.update(user_id, {
      key_revoked: true,
      session_invalidated_at: now,
    });

    callHeraldBot(req, 'keyEvent', {
      discord_id: user.discord_id ? String(user.discord_id) : null,
      callsign: user.callsign || 'UNKNOWN',
      event: 'REVOKED',
      revoked_by: caller.isAdmin ? 'System Administrator' : 'Pioneer',
    });

    return Response.json({ success: true });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
});
