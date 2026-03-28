/**
 * adminData — Self-contained admin data console backend.
 * All shared dependencies inlined for deployment stability.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Inlined session auth ────────────────────────────────────────────────────
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

// ── Inlined admin control ───────────────────────────────────────────────────
function tv(v) { return typeof v === 'string' ? v.trim() : ''; }
function toArray(v) { return Array.isArray(v) ? v : []; }
function isPlainObject(v) { return Boolean(v) && typeof v === 'object' && !Array.isArray(v); }
const SENSITIVE = /(?:auth_key_hash|password|secret|recovery_token|bootstrap_secret)/i;
const TS_FIELDS = ['updated_date','updated_at','created_date','created_at','logged_at','reported_at','requested_at','started_at','processed_at','published_at','last_synced'];
const PROTECTED_DELETE = new Set(['NexusUser','Wallet','Transaction','CofferLog','CargoLog','Contract','MemberDebt','OrgTransfer']);

const REGISTRY = [
  { id: 'NexusUser', label: 'Users', cat: 'Auth', sum: ['callsign','login_name','nexus_rank','key_prefix'], search: ['callsign','login_name','username','nexus_rank'], sort: '-updated_date', prot: true },
  { id: 'NexusNotification', label: 'Notifications', cat: 'Auth', sum: ['title','type','severity','target_callsign'], search: ['title','body','type','source_module'], sort: '-created_at', del: true },
  { id: 'AdminActionLog', label: 'Audit Log', cat: 'Admin', sum: ['action_type','entity_name','record_label','acted_by_callsign'], search: ['action_type','entity_name','record_label','acted_by_callsign','reason'], sort: '-created_at', del: false },
  { id: 'Material', label: 'Materials', cat: 'Industry', sum: ['material_name','quantity_scu','quality_pct','location'], search: ['material_name','location','container','logged_by_callsign','notes'], sort: '-logged_at', deact: { is_archived: true }, rest: { is_archived: false } },
  { id: 'Blueprint', label: 'Blueprints', cat: 'Industry', sum: ['item_name','category','tier','owned_by_callsign'], search: ['item_name','category','tier','owned_by_callsign'], sort: '-updated_date', del: true },
  { id: 'CraftQueue', label: 'Craft Queue', cat: 'Industry', sum: ['blueprint_name','status','requested_by_callsign','claimed_by_callsign'], search: ['blueprint_name','requested_by_callsign','claimed_by_callsign','status'], sort: '-created_date', deact: { status: 'CANCELLED' }, rest: { status: 'OPEN' } },
  { id: 'RefineryOrder', label: 'Refinery Orders', cat: 'Industry', sum: ['material_name','status','station','method'], search: ['material_name','station','method','status','submitted_by_callsign'], sort: '-started_at', del: true },
  { id: 'PriceSnapshot', label: 'Price Snapshots', cat: 'Industry', sum: ['commodity_name','station_name','price_sell','price_buy'], search: ['commodity_name','station_name'], sort: '-created_at', del: true },
  { id: 'GameCacheCommodity', label: 'Commodity Cache', cat: 'Reference', sum: ['name','type','buy_price_uex','sell_price_uex'], search: ['name','type','wiki_id'], sort: '-last_synced', del: true },
  { id: 'ScoutDeposit', label: 'Scout Deposits', cat: 'Scout', sum: ['material_name','system_name','location_detail','quality_pct'], search: ['material_name','system_name','location_detail','reported_by_callsign'], sort: '-reported_at', deact: { is_stale: true }, rest: { is_stale: false } },
  { id: 'Op', label: 'Operations', cat: 'Ops', sum: ['name','status','location','type'], search: ['name','location','type','status'], sort: '-scheduled_at', deact: { status: 'ARCHIVED' } },
  { id: 'OpRsvp', label: 'Op RSVPs', cat: 'Ops', sum: ['callsign','status','role','op_id'], search: ['callsign','status','role','op_id'], sort: '-updated_date', del: true },
  { id: 'OrgShip', label: 'Org Ships', cat: 'Fleet', sum: ['name','model','status','assigned_to_callsign'], search: ['name','model','manufacturer','assigned_to_callsign','status'], sort: '-updated_date', deact: { status: 'ARCHIVED' }, rest: { status: 'AVAILABLE' } },
  { id: 'ArmoryItem', label: 'Armory Items', cat: 'Fleet', sum: ['item_name','category','quantity'], search: ['item_name','category','location'], sort: '-updated_date', del: true },
  { id: 'CofferLog', label: 'Coffer Ledger', cat: 'Commerce', sum: ['entry_type','amount_aUEC','logged_by_callsign','description'], search: ['entry_type','logged_by_callsign','description'], sort: '-logged_at', prot: true },
  { id: 'MemberDebt', label: 'Member Debts', cat: 'Org', sum: ['debtor_callsign','status','amount_aUEC','description'], search: ['debtor_callsign','description','status'], sort: '-issued_at', prot: true },
  { id: 'PersonalAsset', label: 'Personal Assets', cat: 'Org', sum: ['item_name','owner_callsign','location'], search: ['item_name','owner_callsign','location','notes'], sort: '-logged_at', del: true },
  { id: 'PatchDigest', label: 'Patch Digests', cat: 'Reference', sum: ['patch_version','branch','processed_at'], search: ['patch_version','branch'], sort: '-processed_at', del: true },
];

function getConfig(name) { return REGISTRY.find(c => c.id === name) || null; }
function canDelete(c) { if (c.del === false) return false; if (c.del === true) return true; if (c.prot || PROTECTED_DELETE.has(c.id)) return false; if (c.deact) return false; return true; }
function serializeConfig(c) { return { id: c.id, label: c.label, category: c.cat, summary_fields: c.sum, search_fields: c.search, default_sort: c.sort || '-updated_date', capabilities: { edit: true, deactivate: Boolean(c.deact), restore: Boolean(c.rest), delete: canDelete(c) }, protected_family: c.prot === true }; }

async function listEntity(b44, name, sort, limit) {
  const e = b44.asServiceRole.entities?.[name]; if (!e) throw new Error('entity_not_available');
  return await e.list(sort || '-updated_date', Math.max(1, Math.min(500, limit || 50))).catch(() => e.list().catch(() => { throw new Error('entity_unreadable'); }));
}
async function findById(b44, name, id) { const e = b44.asServiceRole.entities?.[name]; if (!e) throw new Error('entity_not_available'); const r = await e.filter({ id }).catch(() => null); return r?.[0] || null; }

function recordTs(r) { for (const f of TS_FIELDS) { const v = tv(r?.[f]); if (!v) continue; const t = new Date(v).getTime(); if (Number.isFinite(t)) return t; } return 0; }
function matchSearch(r, c, q) { const n = tv(q).toLowerCase(); if (!n) return true; if (tv(r.id).toLowerCase().includes(n)) return true; return [...new Set([...c.search, ...c.sum])].some(f => { const v = r?.[f]; if (typeof v === 'object') { try { return JSON.stringify(v).toLowerCase().includes(n); } catch { return false; } } return tv(v).toLowerCase().includes(n); }); }
function resolveLabel(c, r) { for (const f of c.sum) { const v = r?.[f]; if (typeof v === 'object') { const s = JSON.stringify(v); if (s && s !== '[]' && s !== '{}') return s.slice(0, 160); continue; } const t = tv(v); if (t) return t; } return tv(r.id) || c.id; }
function summarize(c, r) { const s = {}; c.sum.forEach(f => { s[f] = r?.[f] ?? null; }); return s; }
function sanitizeSnapshot(v) { if (Array.isArray(v)) return v.map(sanitizeSnapshot); if (!isPlainObject(v)) return v; const n = {}; Object.entries(v).forEach(([k, nv]) => { if (SENSITIVE.test(k)) return; n[k] = sanitizeSnapshot(nv); }); return n; }

async function writeActionLog(b44, actor, input) {
  const e = b44.asServiceRole.entities?.AdminActionLog; if (!e) return;
  await e.create({ acted_by_user_id: tv(actor?.id) || null, acted_by_callsign: tv(actor?.callsign) || null, action_type: tv(input.actionType) || 'ADMIN_ACTION', entity_name: tv(input.entityName) || null, record_id: tv(input.recordId) || null, record_label: tv(input.recordLabel) || null, reason: tv(input.reason) || null, strategy: tv(input.strategy) || null, before_snapshot: sanitizeSnapshot(input.beforeSnapshot || null), after_snapshot: sanitizeSnapshot(input.afterSnapshot || null), created_at: new Date().toISOString() });
}

function jsonError(code) { const s = { forbidden: 403, record_not_found: 404, method_not_allowed: 405, unknown_entity: 400, invalid_action: 400, invalid_patch: 400, empty_patch: 400, reason_required: 400, entity_read_only: 409, delete_not_supported: 409, deactivate_not_supported: 409, restore_not_supported: 409 }; return Response.json({ error: code }, { status: s[code] || 500, headers: NO_STORE }); }
function recentSince(w) { const n = tv(w).toLowerCase(); if (!n || n === 'all') return 0; if (n === '24h') return Date.now() - 86400000; if (n === '7d') return Date.now() - 7*86400000; if (n === '30d') return Date.now() - 30*86400000; return 0; }

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return jsonError('method_not_allowed');
    const admin = await requireAdmin(req);
    if (!admin) return jsonError('forbidden');
    let body = {}; try { body = await req.json(); } catch {}
    const action = tv(body.action) || 'list_entities';
    const base44 = createClientFromRequest(req);
    const actor = { id: admin.id, callsign: admin.callsign || admin.login_name || null };

    if (action === 'list_entities') return Response.json({ ok: true, action, entities: REGISTRY.map(serializeConfig) }, { headers: NO_STORE });

    if (action === 'list_records') {
      const c = getConfig(tv(body.entity)); if (!c) throw new Error('unknown_entity');
      const pageSize = Math.max(1, Math.min(100, Number(body.limit) || 25));
      const page = Math.max(1, Number(body.page) || 1);
      const explicitId = tv(body.id);
      let records = [];
      if (explicitId) { const r = await findById(base44, c.id, explicitId); records = r ? [r] : []; }
      else { records = toArray(await listEntity(base44, c.id, tv(body.sort) || c.sort, Math.max(pageSize * 6, 120))); }
      const since = recentSince(body.recent_window);
      const filtered = records.filter(r => matchSearch(r, c, tv(body.query))).filter(r => since > 0 ? recordTs(r) >= since : true);
      const total = filtered.length;
      const sliceStart = (page - 1) * pageSize;
      return Response.json({ ok: true, action, entity: serializeConfig(c), total, page, page_size: pageSize, records: filtered.slice(sliceStart, sliceStart + pageSize).map(r => ({ id: tv(r.id), label: resolveLabel(c, r), summary: summarize(c, r), timestamps: { updated: TS_FIELDS.map(f => tv(r?.[f])).find(Boolean) || null }, record: r })) }, { headers: NO_STORE });
    }

    if (action === 'get_record') {
      const c = getConfig(tv(body.entity)); if (!c) throw new Error('unknown_entity');
      const r = await findById(base44, c.id, tv(body.id)); if (!r) throw new Error('record_not_found');
      return Response.json({ ok: true, action, entity: serializeConfig(c), record: r, label: resolveLabel(c, r) }, { headers: NO_STORE });
    }

    if (action === 'update_record') {
      const c = getConfig(tv(body.entity)); if (!c) throw new Error('unknown_entity');
      const existing = await findById(base44, c.id, tv(body.id)); if (!existing) throw new Error('record_not_found');
      const patch = isPlainObject(body.patch) ? { ...body.patch } : null; if (!patch || Object.keys(patch).length === 0) throw new Error('empty_patch');
      delete patch.id;
      const updated = await base44.asServiceRole.entities[c.id].update(tv(body.id), patch);
      await writeActionLog(base44, actor, { actionType: 'UPDATE_RECORD', entityName: c.id, recordId: tv(body.id), recordLabel: resolveLabel(c, updated || existing), reason: tv(body.reason), strategy: 'edit', beforeSnapshot: existing, afterSnapshot: updated });
      return Response.json({ ok: true, action, record: updated }, { headers: NO_STORE });
    }

    if (action === 'deactivate_record') {
      const c = getConfig(tv(body.entity)); if (!c || !c.deact) throw new Error('deactivate_not_supported');
      const existing = await findById(base44, c.id, tv(body.id)); if (!existing) throw new Error('record_not_found');
      if (!tv(body.reason)) throw new Error('reason_required');
      const updated = await base44.asServiceRole.entities[c.id].update(tv(body.id), c.deact);
      await writeActionLog(base44, actor, { actionType: 'DEACTIVATE_RECORD', entityName: c.id, recordId: tv(body.id), recordLabel: resolveLabel(c, updated || existing), reason: tv(body.reason), strategy: 'deactivate', beforeSnapshot: existing, afterSnapshot: updated });
      return Response.json({ ok: true, action, record: updated }, { headers: NO_STORE });
    }

    if (action === 'restore_record') {
      const c = getConfig(tv(body.entity)); if (!c || !c.rest) throw new Error('restore_not_supported');
      const existing = await findById(base44, c.id, tv(body.id)); if (!existing) throw new Error('record_not_found');
      if (!tv(body.reason)) throw new Error('reason_required');
      const updated = await base44.asServiceRole.entities[c.id].update(tv(body.id), c.rest);
      await writeActionLog(base44, actor, { actionType: 'RESTORE_RECORD', entityName: c.id, recordId: tv(body.id), recordLabel: resolveLabel(c, updated || existing), reason: tv(body.reason), strategy: 'restore', beforeSnapshot: existing, afterSnapshot: updated });
      return Response.json({ ok: true, action, record: updated }, { headers: NO_STORE });
    }

    if (action === 'delete_record') {
      const c = getConfig(tv(body.entity)); if (!c || !canDelete(c)) throw new Error('delete_not_supported');
      const existing = await findById(base44, c.id, tv(body.id)); if (!existing) throw new Error('record_not_found');
      if (!tv(body.reason)) throw new Error('reason_required');
      await base44.asServiceRole.entities[c.id].delete(tv(body.id));
      await writeActionLog(base44, actor, { actionType: 'DELETE_RECORD', entityName: c.id, recordId: tv(body.id), recordLabel: resolveLabel(c, existing), reason: tv(body.reason), strategy: 'delete', beforeSnapshot: existing, afterSnapshot: null });
      return Response.json({ ok: true, action, id: tv(body.id), deleted: true }, { headers: NO_STORE });
    }

    if (action === 'get_action_log') {
      const limit = Math.max(1, Math.min(100, Number(body.limit) || 20));
      const records = toArray(await listEntity(base44, 'AdminActionLog', '-created_at', limit));
      return Response.json({ ok: true, action, records }, { headers: NO_STORE });
    }

    return jsonError('invalid_action');
  } catch (error) {
    const code = error instanceof Error ? error.message : 'internal_error';
    console.error('[adminData]', error);
    return jsonError(code);
  }
});