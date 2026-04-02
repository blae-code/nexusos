/**
 * POST /entityProxy — Authenticated entity read proxy for member accounts.
 *
 * Member users authenticate via a signed session cookie but have no Base44
 * platform access token, so direct SDK entity calls (base44.entities.X.list)
 * are rejected as unauthenticated by the entity API.
 *
 * This function:
 *   1. Validates the nexus_member_session cookie
 *   2. Uses service-role (auto-injected by the platform) to read entity data
 *   3. Returns the data to the frontend
 *
 * Only read operations (list, filter, get) are proxied.
 * NexusUser is explicitly blocked to prevent exposure of auth fields.
 * Self-contained: no local imports (each function deploys independently).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const SESSION_COOKIE_NAME = 'nexus_member_session';
const NO_STORE = { 'Cache-Control': 'no-store' };

// Entities members may read through the proxy.
// NexusUser is intentionally excluded — it contains auth_key_hash and other
// sensitive fields that must never be returned to the browser.
const READABLE_ENTITIES = new Set([
  'ArmoryCheckout', 'ArmoryItem', 'AssetReservation', 'Blueprint',
  'BlueprintWishlist', 'CargoJob', 'CargoLog', 'CofferLog',
  'ComponentHarvest', 'Consignment', 'Contract', 'CraftQueue',
  'DismantleLog', 'FabricationJob', 'FleetBuild', 'GameCacheCommodity',
  'GameCacheItem', 'GameCacheVehicle', 'MarketSync', 'Material',
  'MaterialListing', 'MaterialTransfer', 'MemberDebt', 'MissionDrop',
  'NexusNotification', 'Op', 'OpDebrief', 'OpEvent', 'OpRsvp',
  'OrgAsset', 'OrgShip', 'OrgTradeOrder', 'OrgTransfer', 'PatchDigest',
  'PersonalAsset', 'PriceAlert', 'PriceHistory', 'PriceSnapshot',
  'RefineryOrder', 'Requisition', 'RescueCall', 'ScoutDeposit',
  'TradePost', 'TradeRoute', 'Transaction', 'UEXListing', 'Wallet',
]);

const ALLOWED_ACTIONS = new Set(['list', 'filter', 'get']);

// ── Cookie / session helpers ──────────────────────────────────────────────

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
    const t = part.trim();
    if (!t) return acc;
    const i = t.indexOf('=');
    if (i === -1) return acc;
    acc[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1));
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

// ── Entry point ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
  }

  // 1. Validate member session cookie
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) {
    return Response.json({ error: 'session_secret_missing' }, { status: 500, headers: NO_STORE });
  }

  const cookies = parseCookies(req);
  const payload = await decodeSessionToken(cookies[SESSION_COOKIE_NAME], secret);
  if (!payload?.user_id) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // 2. Parse and validate request body
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
  }

  const { entity, action, params } = body || {};

  if (!entity || !READABLE_ENTITIES.has(String(entity))) {
    return Response.json({ error: 'invalid_entity' }, { status: 400, headers: NO_STORE });
  }

  if (!action || !ALLOWED_ACTIONS.has(String(action))) {
    return Response.json({ error: 'invalid_action' }, { status: 400, headers: NO_STORE });
  }

  // 3. Fetch via service role
  try {
    const base44 = createClientFromRequest(req);
    const entityRef = base44.asServiceRole.entities[entity];
    const args = Array.isArray(params) ? params : [];

    let data;
    if (action === 'list') {
      const [sort, limit, skip, fields] = args;
      data = await entityRef.list(sort, limit, skip, fields);
    } else if (action === 'filter') {
      const [query, sort, limit, skip, fields] = args;
      data = await entityRef.filter(query, sort, limit, skip, fields);
    } else if (action === 'get') {
      const [id] = args;
      data = await entityRef.get(id);
    }

    return Response.json({ data: data ?? null }, { headers: NO_STORE });
  } catch (err) {
    console.error('[entityProxy]', entity, action, err?.message || err);
    return Response.json({ error: 'proxy_failed', detail: String(err?.message || '') }, { status: 500, headers: NO_STORE });
  }
});
