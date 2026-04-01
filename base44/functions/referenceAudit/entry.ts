import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SC_REFERENCE_PATCH = '4.7.0';
const NO_STORE = { 'Cache-Control': 'no-store' };
const KNOWN_SYSTEMS = new Set(['STANTON', 'PYRO', 'NYX']);
const LEGACY_LOCATION_ALIASES: Record<string, string> = {
  'PORT OLISAR': 'Seraphim Station',
};

const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function parseCookies(req: Request) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce<Record<string, string>>((accumulator, part) => {
    const trimmed = part.trim();
    if (!trimmed) return accumulator;
    const separator = trimmed.indexOf('=');
    if (separator === -1) return accumulator;
    accumulator[trimmed.slice(0, separator)] = decodeURIComponent(trimmed.slice(separator + 1));
    return accumulator;
  }, {});
}

async function signValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function requireAdmin(req: Request) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const token = parseCookies(req).nexus_member_session;
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (signature !== await signValue(body, secret)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!payload?.exp || payload.exp < Date.now() || !payload?.user_id) return null;

    const base44 = createClientFromRequest(req);
    const user = (await base44.asServiceRole.entities.NexusUser.filter({ id: payload.user_id }))?.[0];
    if (!user || user.key_revoked) return null;

    const rank = String(user.nexus_rank || '').toUpperCase();
    if (rank !== 'PIONEER' && user.is_admin !== true) return null;
    return user;
  } catch {
    return null;
  }
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeToken(value: unknown) {
  return textValue(value).toUpperCase();
}

function newestTimestamp(records: any[], fields: string[]) {
  return records.reduce<string | null>((latest, record) => {
    const candidate = fields.map((field) => textValue(record?.[field])).find(Boolean) || null;
    if (!candidate) return latest;
    if (!latest) return candidate;
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, null);
}

async function safeListEntity(base44: any, entityName: string, sort = '-created_date', limit = 500) {
  const entity = base44?.asServiceRole?.entities?.[entityName];
  if (!entity) return [];

  try {
    const records = await entity.list(sort, limit);
    return Array.isArray(records) ? records : [];
  } catch {
    try {
      const records = await entity.filter({}, sort, limit);
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }
}

function datasetStatus(datasetId: string, sourceType: string, records: any[], syncedAt: string | null, staleAfterHours: number, livePatch: string) {
  const stale = !syncedAt || (Date.now() - new Date(syncedAt).getTime()) > staleAfterHours * 60 * 60 * 1000;
  return {
    datasetId,
    sourceType,
    syncedAt,
    livePatch,
    registryPatch: SC_REFERENCE_PATCH,
    stale,
    count: records.length,
  };
}

function countUnknownSystems(records: any[], fields: string[]) {
  return records.reduce((count, record) => {
    const raw = fields.map((field) => textValue(record?.[field])).find(Boolean);
    if (!raw) return count;
    return KNOWN_SYSTEMS.has(normalizeToken(raw)) ? count : count + 1;
  }, 0);
}

function countLegacyAliases(records: any[], field: string) {
  return records.reduce((count, record) => {
    const value = normalizeToken(record?.[field]);
    return value && LEGACY_LOCATION_ALIASES[value] ? count + 1 : count;
  }, 0);
}

const FIELD_AUDIT_BASE = [
  { fieldId: 'ops.mission_create.type', surface: 'Ops', domain: 'op-types', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'low' },
  { fieldId: 'ops.mission_create.system', surface: 'Ops', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'ops.mission_create.location', surface: 'Ops', domain: 'locations', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high' },
  { fieldId: 'ops.rescue.system', surface: 'Ops', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'ops.rescue.location', surface: 'Ops', domain: 'locations', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high' },
  { fieldId: 'scout.deposit_log.system', surface: 'Scout', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'scout.deposit_log.location', surface: 'Scout', domain: 'locations', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high' },
  { fieldId: 'scout.mining.origin_station', surface: 'Scout', domain: 'stations', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'scout.mining.system_filter', surface: 'Scout', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'low' },
  { fieldId: 'assets.register.asset_name', surface: 'Assets', domain: 'asset-names', sourceKind: 'LIVE_CACHE', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high' },
  { fieldId: 'assets.register.manufacturer', surface: 'Assets', domain: 'manufacturers', sourceKind: 'LIVE_CACHE', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'medium' },
  { fieldId: 'assets.register.location_system', surface: 'Assets', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'assets.register.location_detail', surface: 'Assets', domain: 'locations', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'high' },
  { fieldId: 'assets.register.linked_ship_id', surface: 'Assets', domain: 'org-ships', sourceKind: 'ENTITY_RELATION', patchSensitive: false, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'medium' },
  { fieldId: 'commerce.trade_board.item_name', surface: 'Commerce', domain: 'tradeable-items', sourceKind: 'LIVE_CACHE', patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high' },
  { fieldId: 'commerce.trade_board.system_location', surface: 'Commerce', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'ops.op_creator.system', surface: 'Ops', domain: 'systems', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: false, status: 'planned', migrationPriority: 'P0', legacyRisk: 'medium' },
  { fieldId: 'ops.rep_grind.faction', surface: 'Ops', domain: 'factions', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'medium' },
  { fieldId: 'ops.rep_grind.mission_type', surface: 'Ops', domain: 'mission-types', sourceKind: 'PATCH_REGISTRY', patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'medium' },
  { fieldId: 'industry.blueprint.material', surface: 'Industry', domain: 'tradeable-items', sourceKind: 'LIVE_CACHE', patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'high' },
];

async function buildFieldAudit(base44: any) {
  const [ops, rescueCalls, deposits, assets, tradeOrders] = await Promise.all([
    safeListEntity(base44, 'Op', '-scheduled_at', 400),
    safeListEntity(base44, 'RescueCall', '-created_date', 400),
    safeListEntity(base44, 'ScoutDeposit', '-reported_at', 400),
    safeListEntity(base44, 'OrgAsset', '-created_date', 400),
    safeListEntity(base44, 'OrgTradeOrder', '-created_date', 400),
  ]);

  const legacyCounts: Record<string, number> = {
    'ops.mission_create.system': countUnknownSystems(ops, ['system_name', 'system']),
    'ops.mission_create.location': countLegacyAliases(ops, 'location'),
    'ops.rescue.system': countUnknownSystems(rescueCalls, ['system']),
    'ops.rescue.location': countLegacyAliases(rescueCalls, 'location'),
    'scout.deposit_log.system': countUnknownSystems(deposits, ['system_name']),
    'scout.deposit_log.location': countLegacyAliases(deposits, 'location_detail'),
    'assets.register.location_system': countUnknownSystems(assets, ['location_system']),
    'assets.register.location_detail': countLegacyAliases(assets, 'location_detail'),
    'commerce.trade_board.system_location': countUnknownSystems(tradeOrders, ['system_location']),
  };

  return FIELD_AUDIT_BASE.map((field) => ({
    ...field,
    legacyCount: legacyCounts[field.fieldId] || 0,
  }));
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: NO_STORE });
    }

    const admin = await requireAdmin(req);
    if (!admin) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
    }

    const base44 = createClientFromRequest(req);
    const [vehicles, items, commodities, digests, fields] = await Promise.all([
      safeListEntity(base44, 'GameCacheVehicle', 'name', 2500),
      safeListEntity(base44, 'GameCacheItem', 'name', 6000),
      safeListEntity(base44, 'GameCacheCommodity', 'name', 2500),
      safeListEntity(base44, 'PatchDigest', '-processed_at', 100),
      buildFieldAudit(base44),
    ]);

    const latestDigest = digests[0] || null;
    const livePatch = textValue(latestDigest?.patch_version) || textValue(latestDigest?.title) || SC_REFERENCE_PATCH;

    const datasets = [
      datasetStatus('GameCacheVehicle', 'LIVE_CACHE', vehicles, newestTimestamp(vehicles, ['last_synced']), 168, livePatch),
      datasetStatus('GameCacheItem', 'LIVE_CACHE', items, newestTimestamp(items, ['last_synced']), 168, livePatch),
      datasetStatus('GameCacheCommodity', 'LIVE_CACHE', commodities, newestTimestamp(commodities, ['last_synced', 'price_synced_at']), 48, livePatch),
      datasetStatus('PatchDigest', 'PATCH_REGISTRY', digests, newestTimestamp(digests, ['processed_at', 'published_at']), 168, livePatch),
    ];

    const deprecatedValues = fields.reduce((total, field) => total + Number(field.legacyCount || 0), 0);
    const remainingHardcoded = fields.filter((field) => field.status !== 'migrated').length;
    const staleDatasets = datasets.filter((dataset) => dataset.stale).length;

    return Response.json({
      ok: staleDatasets === 0 && deprecatedValues === 0,
      livePatch,
      registryPatch: SC_REFERENCE_PATCH,
      datasets,
      fields,
      summary: {
        datasetsTotal: datasets.length,
        staleDatasets,
        migratedFields: fields.filter((field) => field.status === 'migrated').length,
        plannedFields: fields.filter((field) => field.status === 'planned').length,
        remainingHardcoded,
        deprecatedValues,
      },
    }, { headers: NO_STORE });
  } catch (error) {
    console.error('[referenceAudit]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'internal_error' }, { status: 500, headers: NO_STORE });
  }
});
