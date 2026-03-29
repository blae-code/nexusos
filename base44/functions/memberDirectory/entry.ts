import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  isAdminUser,
  isOnboardingComplete,
  resolveIssuedKeySession,
  resolvePersistedLoginName,
  resolveUserCallsign,
  type NexusUserRecord,
} from '../auth/_shared/issuedKey/entry.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const ALLOWED_SORTS = new Set(['-joined_at', '-last_seen_at', '-created_date', 'callsign', 'login_name']);

function clampLimit(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function resolveSort(value: unknown): string {
  const raw = String(value ?? '').trim();
  return ALLOWED_SORTS.has(raw) ? raw : '-joined_at';
}

function serializeMember(user: NexusUserRecord) {
  const loginName = resolvePersistedLoginName(user);
  const rank = String(user.nexus_rank || 'AFFILIATE').toUpperCase();

  return {
    id: user.id,
    login_name: loginName,
    username: loginName,
    callsign: resolveUserCallsign(user),
    nexus_rank: rank,
    op_role: String(user.op_role || '').trim() || null,
    specialization: String(user.specialization || '').trim() || null,
    intel_access: String(user.intel_access || '').trim() || null,
    joined_at: user.joined_at || null,
    last_seen_at: user.last_seen_at || null,
    onboarding_complete: isOnboardingComplete(user),
    is_admin: isAdminUser(user),
  };
}

Deno.serve(async (req) => {
  try {
    const session = await resolveIssuedKeySession(req);
    if (!session?.user?.id) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    }

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    }

    const limit = clampLimit(body.limit);
    const sort = resolveSort(body.sort);
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.NexusUser.list(sort, limit);
    const members = Array.isArray(users) ? users.map(serializeMember) : [];

    return Response.json({ members, sort, limit }, { headers: NO_STORE });
  } catch (error) {
    console.error('[memberDirectory]', error);
    return Response.json({ error: error?.message || 'member_directory_failed' }, { status: 500, headers: NO_STORE });
  }
});
