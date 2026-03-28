/**
 * adminOps — Self-contained admin operations runner.
 * All shared dependencies inlined for deployment stability.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
const SENSITIVE = /(?:auth_key_hash|password|secret|recovery_token|bootstrap_secret)/i;
function isPlainObject(v) { return Boolean(v) && typeof v === 'object' && !Array.isArray(v); }
function sanitizeSnapshot(v) { if (Array.isArray(v)) return v.map(sanitizeSnapshot); if (!isPlainObject(v)) return v; const n = {}; Object.entries(v).forEach(([k, nv]) => { if (SENSITIVE.test(k)) return; n[k] = sanitizeSnapshot(nv); }); return n; }

async function writeActionLog(b44, actor, input) {
  const e = b44.asServiceRole.entities?.AdminActionLog; if (!e) return;
  await e.create({ acted_by_user_id: tv(actor?.id) || null, acted_by_callsign: tv(actor?.callsign) || null, action_type: tv(input.actionType) || 'ADMIN_ACTION', entity_name: tv(input.entityName) || null, record_id: tv(input.recordId) || null, record_label: tv(input.recordLabel) || null, reason: tv(input.reason) || null, strategy: tv(input.strategy) || null, before_snapshot: sanitizeSnapshot(input.beforeSnapshot || null), after_snapshot: sanitizeSnapshot(input.afterSnapshot || null), created_at: new Date().toISOString() });
}

async function runAdminOperation(b44, action) {
  if (action === 'sync_uex_prices') { const r = await b44.asServiceRole.functions.invoke('commodityPriceSync', {}); return r?.data || r; }
  if (action === 'sync_fleetyards_roster') { if (!tv(Deno.env.get('FLEETYARDS_HANDLE'))) throw new Error('FLEETYARDS_HANDLE not configured'); const r = await b44.asServiceRole.functions.invoke('fleetyardsRosterSync', {}); return r?.data || r; }
  if (action === 'sync_game_data') { const r = await b44.asServiceRole.functions.invoke('gameDataSync', {}); return r?.data || r; }
  if (action === 'refresh_patch_digest') { const r = await b44.asServiceRole.functions.invoke('rssCheck', {}); return r?.data || r; }
  if (action === 'run_patch_intelligence_self_test') { const r = await b44.asServiceRole.functions.invoke('patchIntelligenceAgent', { mode: 'self_test' }); return r?.data || r; }
  throw new Error('invalid_action');
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    let body = {}; try { body = await req.json(); } catch {}
    const action = tv(body.action); if (!action) return Response.json({ error: 'invalid_action' }, { status: 400, headers: NO_STORE });

    const base44 = createClientFromRequest(req);
    const startedAt = new Date().toISOString();
    const actor = { id: admin.id, callsign: admin.callsign || admin.login_name || null };

    try {
      const result = await runAdminOperation(base44, action);
      const endedAt = new Date().toISOString();
      await writeActionLog(base44, actor, { actionType: 'RUN_ADMIN_OP', entityName: 'SYSTEM', recordId: action, recordLabel: action, reason: tv(body.reason), strategy: action, beforeSnapshot: { action, started_at: startedAt }, afterSnapshot: { action, started_at: startedAt, completed_at: endedAt, result } });
      return Response.json({ ok: true, action, started_at: startedAt, completed_at: endedAt, result }, { headers: NO_STORE });
    } catch (error) {
      const endedAt = new Date().toISOString();
      await writeActionLog(base44, actor, { actionType: 'RUN_ADMIN_OP_FAILED', entityName: 'SYSTEM', recordId: action, recordLabel: action, reason: tv(body.reason), strategy: action, beforeSnapshot: { action, started_at: startedAt }, afterSnapshot: { action, started_at: startedAt, failed_at: endedAt, error: error.message || 'unknown' } }).catch(() => {});
      throw error;
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'internal_error';
    console.error('[adminOps]', error);
    const s = code === 'forbidden' ? 403 : code === 'method_not_allowed' ? 405 : code === 'invalid_action' ? 400 : 500;
    return Response.json({ error: code }, { status: s, headers: NO_STORE });
  }
});