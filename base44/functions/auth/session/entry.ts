/**
 * GET /auth/session — Validate session cookie, return user data.
 * Self-contained: no local imports. Each function deploys independently.
 * v2 — entry files removed, standalone deployment.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return acc;
    acc[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    return acc;
  }, {});
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function decodeSessionToken(token, secret) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await signValue(body, secret);
  if (signature !== expected) return null;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch { return null; }
}

function normalizeLoginName(v) { return String(v || '').trim().toLowerCase().replace(/[_\s]+/g, '-'); }
function normalizeCallsign(v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

function resolveUserLoginName(u) { return normalizeLoginName(String(u.login_name || u.username || u.callsign || '')); }
function resolvePersistedLoginName(u) { return normalizeLoginName(String(u.login_name || u.username || '')); }
function resolveUserCallsign(u) { return normalizeCallsign(String(u.callsign || u.login_name || u.username || 'NOMAD')); }
function isAdminUser(u) { return String(u.nexus_rank || '').toUpperCase() === 'PIONEER' || u.is_admin === true; }
function isOnboardingComplete(u) { return u.onboarding_complete === true || u.consent_given === true || Boolean(u.consent_timestamp); }

function dedupeUsers(users) {
  const seen = new Set();
  return (users || []).filter((user) => {
    const id = String(user?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function scoreCandidate(user, normalizedLoginName) {
  const exactLoginName = normalizeLoginName(String(user?.login_name || user?.username || '')) === normalizedLoginName ? 1 : 0;
  const hasActiveKey = user?.key_revoked === true ? 0 : 1;
  const hasKeyHash = String(user?.auth_key_hash || '').trim() ? 1 : 0;
  const freshness = new Date(
    user?.key_issued_at
    || user?.updated_date
    || user?.last_seen_at
    || user?.created_date
    || user?.joined_at
    || 0,
  ).getTime();
  return [exactLoginName, hasActiveKey, hasKeyHash, freshness];
}

function pickBestUser(users, normalizedLoginName) {
  const matches = dedupeUsers(users);
  if (!matches.length) return null;
  matches.sort((left, right) => {
    const leftScore = scoreCandidate(left, normalizedLoginName);
    const rightScore = scoreCandidate(right, normalizedLoginName);
    for (let index = 0; index < leftScore.length; index += 1) {
      if (leftScore[index] !== rightScore[index]) {
        return rightScore[index] - leftScore[index];
      }
    }
    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
  return matches[0] || null;
}

async function safeFilterUsers(base44, filter) {
  try {
    return (await base44.asServiceRole.entities.NexusUser.filter(filter)) || [];
  } catch {
    return [];
  }
}

async function findUserByLoginName(base44, loginName) {
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return null;

  const exactMatches = dedupeUsers([
    ...(await safeFilterUsers(base44, { login_name: normalized })),
    ...(await safeFilterUsers(base44, { username: normalized })),
  ]);

  if (exactMatches.length) {
    return pickBestUser(exactMatches, normalized);
  }

  const allUsers = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
  return pickBestUser((allUsers || []).filter((user) => resolveUserLoginName(user) === normalized), normalized);
}

const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  try {
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    if (!secret) {
      return Response.json({ authenticated: false, error: 'session_secret_missing' }, { status: 500, headers: NO_STORE });
    }

    const cookies = parseCookies(req);
    const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);

    if (!payload?.user_id) {
      return Response.json({ authenticated: false }, { status: 401, headers: NO_STORE });
    }

    const base44 = createClientFromRequest(req);

    // Look up user by ID, then fallback to login_name
    let user = null;
    try {
      const byId = await base44.asServiceRole.entities.NexusUser.filter({ id: payload.user_id });
      user = (byId || [])[0] || null;
    } catch (e) {
      console.error('findUserById failed:', e.message);
    }

    if (!user && payload.login_name) {
      try {
        user = await findUserByLoginName(base44, payload.login_name);
      } catch (e) {
        console.error('findUserByLoginName failed:', e.message);
      }
    }

    if (!user) {
      return Response.json({ authenticated: false, error: 'user_not_found' }, { status: 401, headers: NO_STORE });
    }

    if (user.key_revoked) {
      return Response.json({ authenticated: false, error: 'key_revoked' }, { status: 401, headers: NO_STORE });
    }

    // Check required auth fields
    if (!resolvePersistedLoginName(user) || !String(user.auth_key_hash || '').trim()) {
      return Response.json({ authenticated: false, error: 'missing_auth_fields' }, { status: 401, headers: NO_STORE });
    }

    // Auto-fix onboarding flag
    if (user.onboarding_complete !== true && isOnboardingComplete(user)) {
      try {
        await base44.asServiceRole.entities.NexusUser.update(user.id, { onboarding_complete: true });
        user.onboarding_complete = true;
      } catch { /* non-critical */ }
    }

    // Check session invalidation
    const invalidatedAt = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAt && invalidatedAt > payload.iat) {
      return Response.json({ authenticated: false }, { status: 401, headers: NO_STORE });
    }

    // Build response
    const admin = isAdminUser(user);
    const loginName = resolvePersistedLoginName(user) || resolveUserLoginName(user);

    return Response.json({
      authenticated: true,
      source: 'member',
      is_admin: admin,
      user: {
        id: user.id,
        login_name: loginName,
        username: loginName,
        callsign: resolveUserCallsign(user),
        rank: String(user.nexus_rank || 'AFFILIATE').toUpperCase(),
        nexus_rank: String(user.nexus_rank || 'AFFILIATE').toUpperCase(),
        op_role: String(user.op_role || '').trim() || null,
        aUEC_balance: Number(user.aUEC_balance || 0) || 0,
        joinedAt: user.joined_at || null,
        joined_at: user.joined_at || null,
        onboarding_complete: isOnboardingComplete(user),
        notifications_seen_at: user.notifications_seen_at || null,
        uex_handle: String(user.uex_handle || '').trim() || null,
        is_admin: admin,
      },
    }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error('[session]', error);
    return Response.json({ authenticated: false, error: 'session_unavailable' }, { status: 500, headers: NO_STORE });
  }
});
