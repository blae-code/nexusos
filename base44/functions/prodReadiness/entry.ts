/**
 * prodReadiness — Self-contained production readiness audit.
 * All shared dependencies inlined for deployment stability.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { fetchFleetYardsFleetVehicles, resolveFleetYardsFleet } from '../_shared/fleetyards/entry.ts';
import { fetchUexData } from '../_shared/uexRetry/entry.ts';

const enc = new TextEncoder();
const NO_STORE = { 'Cache-Control': 'no-store' };
function toBase64Url(bytes) { return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function fromBase64Url(v) { const p = v.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(v.length / 4) * 4, '='); return Uint8Array.from(atob(p), c => c.charCodeAt(0)); }
function parseCookies(req) { const raw = req.headers.get('cookie') || ''; return raw.split(';').reduce((a, p) => { const t = p.trim(); if (!t) return a; const i = t.indexOf('='); if (i === -1) return a; a[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1)); return a; }, {}); }
async function signValue(v, s) { const k = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const sig = await crypto.subtle.sign('HMAC', k, enc.encode(v)); return toBase64Url(new Uint8Array(sig)); }
async function requireAdmin(req) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET'); if (!secret) return null;
  const token = parseCookies(req)['nexus_member_session']; if (!token) return null;
  const [body, sig] = token.split('.'); if (!body || !sig) return null;
  if (sig !== await signValue(body, secret)) return null;
  try { const d = JSON.parse(new TextDecoder().decode(fromBase64Url(body))); if (!d.exp || d.exp < Date.now() || !d.user_id) return null;
    const b = createClientFromRequest(req); const u = (await b.asServiceRole.entities.NexusUser.filter({ id: d.user_id }))?.[0];
    if (!u || u.key_revoked) return null; const rank = String(u.nexus_rank || '').toUpperCase();
    if (rank !== 'PIONEER' && u.is_admin !== true) return null; return u;
  } catch { return null; }
}

function tv(v) { return typeof v === 'string' ? v.trim() : ''; }
function toArray(v) { return Array.isArray(v) ? v : []; }

const ENTITIES = ['NexusUser','Material','Blueprint','CraftQueue','RefineryOrder','CofferLog','PriceSnapshot','GameCacheCommodity','ScoutDeposit','Op','OpRsvp','OrgShip','ArmoryItem','MemberDebt'];

async function runEntityAudit(b44) {
  const checks = [];
  for (const name of ENTITIES) {
    try {
      const e = b44.asServiceRole.entities[name];
      const records = await e.list('-created_date', 5).catch(() => e.list().catch(() => { throw new Error('unreadable'); }));
      checks.push({ id: name, label: name, ok: true, severity: 'critical', detail: `${toArray(records).length} records readable.` });
    } catch (e) {
      checks.push({ id: name, label: name, ok: false, severity: 'critical', detail: `${name} unavailable: ${e.message}` });
    }
  }
  return checks;
}

async function runIntegrationAudit() {
  const checks = [];
  const uexKey = tv(Deno.env.get('UEX_API_KEY'));
  if (!uexKey) checks.push({ id: 'uex_api', label: 'UEX', ok: false, severity: 'critical', detail: 'UEX_API_KEY not configured.' });
  else {
    try {
      await fetchUexData('https://uexcorp.space/api/2.0/commodities', {
        timeoutMs: 10000,
        maxAttempts: 2,
        headers: { Authorization: `Bearer ${uexKey}` },
      });
      checks.push({ id: 'uex_api', label: 'UEX', ok: true, severity: 'critical', detail: 'UEX OK.' });
    } catch (e) {
      checks.push({ id: 'uex_api', label: 'UEX', ok: false, severity: 'critical', detail: e.message });
    }
  }

  const ftHandle = tv(Deno.env.get('FLEETYARDS_HANDLE'));
  if (!ftHandle) {
    checks.push({ id: 'fleetyards', label: 'FleetYards', ok: false, severity: 'critical', detail: 'FLEETYARDS_HANDLE not configured.' });
    checks.push({ id: 'fleetyards_roster', label: 'FleetYards Roster', ok: false, severity: 'critical', detail: 'FLEETYARDS_HANDLE not configured.' });
  }
  else {
    try {
      const resolved = await resolveFleetYardsFleet(ftHandle, 10000);
      const fleetName = tv(resolved?.fleet?.name);
      const fleetSlug = tv(resolved?.slug);
      checks.push({
        id: 'fleetyards',
        label: 'FleetYards',
        ok: true,
        severity: 'critical',
        detail: fleetName
          ? `FleetYards fleet "${fleetName}" reachable via ${fleetSlug || ftHandle}.`
          : `FleetYards ${fleetSlug || ftHandle} reachable.`,
      });
    } catch (e) {
      checks.push({ id: 'fleetyards', label: 'FleetYards', ok: false, severity: 'critical', detail: e.message });
    }

    try {
      const resolved = await fetchFleetYardsFleetVehicles(ftHandle, 10000);
      checks.push({
        id: 'fleetyards_roster',
        label: 'FleetYards Roster',
        ok: true,
        severity: 'critical',
        detail: `${resolved.vehicles.length} FleetYards vehicle records readable for ${resolved.slug}.`,
      });
    } catch (e) {
      checks.push({
        id: 'fleetyards_roster',
        label: 'FleetYards Roster',
        ok: false,
        severity: 'critical',
        detail: e.message,
      });
    }
  }

  return checks;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    const base44 = createClientFromRequest(req);
    let body = {}; try { body = await req.json(); } catch {}
    const action = tv(body.action) || 'full_audit';

    const entityChecks = await runEntityAudit(base44);
    const integrationChecks = action === 'entity_audit' ? [] : await runIntegrationAudit();
    const checks = [...entityChecks, ...integrationChecks];
    const allOk = checks.every(c => c.ok);
    const failures = checks.filter(c => !c.ok).map(c => ({ id: c.id, severity: c.severity, detail: c.detail }));

    return Response.json({ ok: allOk, action, checks, failures }, { headers: NO_STORE });
  } catch (error) {
    console.error('[prodReadiness]', error);
    return Response.json({ error: error.message || 'unknown_error' }, { status: 500, headers: NO_STORE });
  }
});
