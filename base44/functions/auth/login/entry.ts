/**
 * POST /auth/login — Issued username + auth key login.
 * Self-contained: no local imports (each function deploys independently).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 24;
const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30;

function toBase64Url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
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

async function getSigningKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signValue(value, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function hashAuthKey(authKey, secret) {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(authKey));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseSecretList(value) {
  return String(value || '').split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
}

function dedupeSecrets(secrets) {
  const seen = new Set();
  return (secrets || []).filter((secret) => {
    if (!secret || seen.has(secret)) return false;
    seen.add(secret);
    return true;
  });
}

function getAuthKeySecrets() {
  const explicitSecret = String(Deno.env.get('AUTH_KEY_HASH_SECRET') || '').trim();
  const sessionSecret = String(Deno.env.get('SESSION_SIGNING_SECRET') || '').trim();
  const primary = explicitSecret || sessionSecret;
  if (!primary) {
    throw new Error('AUTH_KEY_HASH_SECRET or SESSION_SIGNING_SECRET not configured');
  }
  const fallbacks = dedupeSecrets([
    ...(explicitSecret && sessionSecret && explicitSecret !== sessionSecret ? [sessionSecret] : []),
    ...parseSecretList(Deno.env.get('AUTH_KEY_HASH_FALLBACK_SECRETS')),
  ]).filter((secret) => secret !== primary);
  return { primary, fallbacks };
}

async function matchAuthKeySecret(authKey, storedHash, secrets) {
  for (const secret of dedupeSecrets([secrets.primary, ...secrets.fallbacks])) {
    if ((await hashAuthKey(authKey, secret)) === storedHash) {
      return secret;
    }
  }
  return null;
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getRequestHostname(req) {
  const fwd = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
  const host = (req.headers.get('host') || '').split(',')[0]?.trim();
  return (fwd || host || new URL(req.url).hostname || '').split(':')[0].replace(/^www\./, '').toLowerCase();
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configured = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const requestHost = getRequestHostname(req);
    if (!configured || !requestHost) return null;
    if (requestHost === configured || requestHost.endsWith(`.${configured}`)) return configured;
    return null;
  } catch { return null; }
}

function appendSessionCookie(headers, token, req, rememberMe) {
  const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Lax', 'HttpOnly'];
  const domain = getCookieDomain(req);
  if (domain) parts.push(`Domain=.${domain}`);
  if (isSecure(req)) parts.push('Secure');
  if (rememberMe) parts.push(`Max-Age=${REMEMBER_ME_TTL_SECONDS}`);
  headers.append('Set-Cookie', parts.join('; '));
}

const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
  }

  const username = normalizeLoginName(String(body?.username || body?.login_name || body?.callsign || ''));
  const authKey = String(body?.key || '').trim();
  const rememberMe = body?.remember_me === true;

  if (!username || !authKey) {
    return Response.json({ error: 'invalid_credentials' }, { status: 400, headers: NO_STORE });
  }

  try {
    const secret = Deno.env.get('SESSION_SIGNING_SECRET');
    if (!secret) {
      return Response.json({ error: 'session_secret_missing' }, { status: 500, headers: NO_STORE });
    }
    const authKeySecrets = getAuthKeySecrets();

    const base44 = createClientFromRequest(req);

    const user = await findUserByLoginName(base44, username);

    if (!user) {
      return Response.json({ error: 'user_not_found' }, { status: 401, headers: NO_STORE });
    }

    if (user.key_revoked) {
      return Response.json({ error: 'key_revoked' }, { status: 403, headers: NO_STORE });
    }

    if (!resolvePersistedLoginName(user) || !String(user.auth_key_hash || '').trim()) {
      return Response.json({ error: 'missing_auth_fields' }, { status: 401, headers: NO_STORE });
    }

    // Verify key hash
    const matchedSecret = await matchAuthKeySecret(authKey, String(user.auth_key_hash || ''), authKeySecrets);
    if (!matchedSecret) {
      return Response.json({ error: 'hash_mismatch' }, { status: 401, headers: NO_STORE });
    }

    // Hydrate user
    const now = new Date().toISOString();
    const isNew = !user.joined_at;
    const loginName = resolvePersistedLoginName(user) || username;
    const callsign = resolveUserCallsign(user);
    const onboardingComplete = isOnboardingComplete(user);
    const admin = isAdminUser(user);
    const nextAuthKeyHash = matchedSecret === authKeySecrets.primary
      ? String(user.auth_key_hash || '')
      : await hashAuthKey(authKey, authKeySecrets.primary);

    await base44.asServiceRole.entities.NexusUser.update(user.id, {
      login_name: loginName,
      username: loginName,
      callsign,
      auth_key_hash: nextAuthKeyHash,
      joined_at: user.joined_at || now,
      last_seen_at: now,
      is_admin: admin,
      key_revoked: false,
      ...(onboardingComplete ? { onboarding_complete: true } : {}),
    });

    // Create session token
    const ttl = rememberMe ? REMEMBER_ME_TTL_SECONDS : BROWSER_SESSION_TTL_SECONDS;
    const tokenPayload = {
      user_id: user.id,
      login_name: loginName,
      is_admin: admin,
      iat: Date.now(),
      exp: Date.now() + ttl * 1000,
    };
    const tokenBody = toBase64Url(enc.encode(JSON.stringify(tokenPayload)));
    const tokenSig = await signValue(tokenBody, secret);
    const sessionToken = `${tokenBody}.${tokenSig}`;

    const headers = new Headers(NO_STORE);
    appendSessionCookie(headers, sessionToken, req, rememberMe);

    return Response.json({
      success: true,
      isNew,
      onboarding_complete: onboardingComplete,
      nexus_rank: user.nexus_rank || 'AFFILIATE',
      is_admin: admin,
      login_name: loginName,
      username: loginName,
      callsign,
    }, { headers });
  } catch (error) {
    console.error('[login]', error);
    return Response.json({ error: 'login_failed' }, { status: 500, headers: NO_STORE });
  }
});
