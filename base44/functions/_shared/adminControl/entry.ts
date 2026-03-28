type GenericRecord = Record<string, unknown>;

type PatchResolver = GenericRecord | ((record: GenericRecord) => GenericRecord | null);

export type AdminEntityConfig = {
  id: string;
  label: string;
  category: string;
  summaryFields: string[];
  searchFields: string[];
  defaultSort?: string;
  protectedFamily?: boolean;
  readOnly?: boolean;
  deactivatePatch?: PatchResolver | null;
  restorePatch?: PatchResolver | null;
  allowDelete?: boolean;
};

type AdminActor = {
  id?: string | null;
  callsign?: string | null;
};

export type AdminActionLogInput = {
  actionType: string;
  entityName?: string | null;
  recordId?: string | null;
  recordLabel?: string | null;
  reason?: string | null;
  strategy?: string | null;
  beforeSnapshot?: GenericRecord | null;
  afterSnapshot?: GenericRecord | null;
};

const PROTECTED_DELETE_ENTITIES = new Set([
  'NexusUser',
  'Wallet',
  'Transaction',
  'CofferLog',
  'CargoLog',
  'Contract',
  'MemberDebt',
  'OrgTransfer',
]);

const TIMESTAMP_FIELDS = [
  'updated_date',
  'updated_at',
  'created_date',
  'created_at',
  'logged_at',
  'reported_at',
  'requested_at',
  'started_at',
  'processed_at',
  'published_at',
  'last_synced',
];

const SENSITIVE_KEY_PATTERN = /(?:auth_key_hash|password|secret|recovery_token|bootstrap_secret)/i;

const ADMIN_ENTITY_REGISTRY: AdminEntityConfig[] = [
  { id: 'NexusUser', label: 'Users', category: 'Auth', summaryFields: ['callsign', 'login_name', 'nexus_rank', 'key_prefix'], searchFields: ['callsign', 'login_name', 'username', 'nexus_rank'], defaultSort: '-updated_date', protectedFamily: true },
  { id: 'NexusNotification', label: 'Notifications', category: 'Auth', summaryFields: ['title', 'type', 'severity', 'target_callsign'], searchFields: ['title', 'body', 'type', 'source_module'], defaultSort: '-created_at', allowDelete: true },
  { id: 'AdminActionLog', label: 'Admin Audit Log', category: 'Admin', summaryFields: ['action_type', 'entity_name', 'record_label', 'acted_by_callsign'], searchFields: ['action_type', 'entity_name', 'record_label', 'acted_by_callsign', 'reason'], defaultSort: '-created_at', allowDelete: false },
  { id: 'Material', label: 'Materials', category: 'Industry', summaryFields: ['material_name', 'quantity_scu', 'quality_pct', 'location'], searchFields: ['material_name', 'location', 'container', 'logged_by_callsign', 'notes'], defaultSort: '-logged_at', deactivatePatch: { is_archived: true, archived_at: '__NOW__' }, restorePatch: { is_archived: false } },
  { id: 'Blueprint', label: 'Blueprints', category: 'Industry', summaryFields: ['item_name', 'category', 'tier', 'owned_by_callsign'], searchFields: ['item_name', 'category', 'tier', 'owned_by_callsign'], defaultSort: '-updated_date', allowDelete: true },
  { id: 'BlueprintWishlist', label: 'Blueprint Wishlist', category: 'Industry', summaryFields: ['blueprint_name', 'requested_by_callsign', 'fulfilled'], searchFields: ['blueprint_name', 'requested_by_callsign', 'notes'], defaultSort: '-created_date', allowDelete: true },
  { id: 'CraftQueue', label: 'Craft Queue', category: 'Industry', summaryFields: ['blueprint_name', 'status', 'requested_by_callsign', 'claimed_by_callsign'], searchFields: ['blueprint_name', 'requested_by_callsign', 'claimed_by_callsign', 'status'], defaultSort: '-created_date', deactivatePatch: { status: 'CANCELLED', cancelled_at: '__NOW__' }, restorePatch: { status: 'OPEN' } },
  { id: 'RefineryOrder', label: 'Refinery Orders', category: 'Industry', summaryFields: ['material_name', 'status', 'station', 'method'], searchFields: ['material_name', 'station', 'method', 'status', 'submitted_by_callsign'], defaultSort: '-started_at', allowDelete: true },
  { id: 'FabricationJob', label: 'Fabrication Jobs', category: 'Industry', summaryFields: ['blueprint_name', 'status', 'location', 'requested_by_callsign'], searchFields: ['blueprint_name', 'location', 'requested_by_callsign', 'status'], defaultSort: '-created_at', deactivatePatch: { status: 'CANCELLED', cancelled_at: '__NOW__' } },
  { id: 'PriceSnapshot', label: 'Price Snapshots', category: 'Industry', summaryFields: ['commodity_name', 'station_name', 'price_sell', 'price_buy'], searchFields: ['commodity_name', 'station_name', 'system_name'], defaultSort: '-created_at', allowDelete: true },
  { id: 'GameCacheCommodity', label: 'Commodity Cache', category: 'Reference', summaryFields: ['name', 'type', 'buy_price_uex', 'sell_price_uex'], searchFields: ['name', 'type', 'wiki_id'], defaultSort: '-last_synced', allowDelete: true },
  { id: 'GameCacheItem', label: 'Item Cache', category: 'Reference', summaryFields: ['name', 'type', 'category'], searchFields: ['name', 'type', 'category', 'wiki_id'], defaultSort: '-last_synced', allowDelete: true },
  { id: 'GameCacheVehicle', label: 'Vehicle Cache', category: 'Reference', summaryFields: ['name', 'manufacturer', 'cargo_scu'], searchFields: ['name', 'manufacturer', 'wiki_id'], defaultSort: '-last_synced', allowDelete: true },
  { id: 'ScoutDeposit', label: 'Scout Deposits', category: 'Scout', summaryFields: ['material_name', 'system_name', 'location_detail', 'quality_pct'], searchFields: ['material_name', 'system_name', 'location_detail', 'reported_by_callsign'], defaultSort: '-reported_at', deactivatePatch: { is_stale: true, archived_at: '__NOW__' }, restorePatch: { is_stale: false } },
  { id: 'Op', label: 'Operations', category: 'Ops', summaryFields: ['title', 'status', 'location', 'type'], searchFields: ['title', 'location', 'type', 'status', 'system_name'], defaultSort: '-scheduled_at', deactivatePatch: { status: 'ARCHIVED', archived_at: '__NOW__' } },
  { id: 'OpRsvp', label: 'Op RSVPs', category: 'Ops', summaryFields: ['callsign', 'status', 'role', 'op_id'], searchFields: ['callsign', 'status', 'role', 'op_id'], defaultSort: '-updated_date', allowDelete: true },
  { id: 'RescueCall', label: 'Rescue Calls', category: 'Ops', summaryFields: ['callsign', 'status', 'location', 'responder'], searchFields: ['callsign', 'location', 'responder', 'status'], defaultSort: '-created_at', deactivatePatch: { status: 'RESOLVED', resolved_at: '__NOW__' }, restorePatch: { status: 'OPEN' } },
  { id: 'OrgShip', label: 'Org Ships', category: 'Fleet', summaryFields: ['name', 'model', 'status', 'assigned_to_callsign'], searchFields: ['name', 'model', 'manufacturer', 'assigned_to_callsign', 'status'], defaultSort: '-updated_date', deactivatePatch: { status: 'ARCHIVED', archived_at: '__NOW__' }, restorePatch: { status: 'AVAILABLE' } },
  { id: 'FleetBuild', label: 'Fleet Builds', category: 'Fleet', summaryFields: ['build_name', 'ship_name', 'canonical_level', 'role_tag'], searchFields: ['build_name', 'ship_name', 'role_tag', 'created_by_callsign'], defaultSort: '-created_date', allowDelete: true },
  { id: 'ArmoryItem', label: 'Armory Items', category: 'Fleet', summaryFields: ['name', 'category', 'quantity', 'status'], searchFields: ['name', 'category', 'location', 'status'], defaultSort: '-updated_date', allowDelete: true },
  { id: 'ArmoryCheckout', label: 'Armory Checkouts', category: 'Fleet', summaryFields: ['item_name', 'callsign', 'status', 'quantity'], searchFields: ['item_name', 'callsign', 'status'], defaultSort: '-checked_out_at', deactivatePatch: { status: 'RETURNED', returned_at: '__NOW__' } },
  { id: 'Wallet', label: 'Wallets', category: 'Commerce', summaryFields: ['member_id', 'balance_aUEC', 'last_updated'], searchFields: ['member_id'], defaultSort: '-last_updated', protectedFamily: true },
  { id: 'Transaction', label: 'Transactions', category: 'Commerce', summaryFields: ['member_id', 'type', 'amount_aUEC', 'description'], searchFields: ['member_id', 'type', 'description', 'reference_type'], defaultSort: '-created_at', protectedFamily: true },
  { id: 'Contract', label: 'Contracts', category: 'Commerce', summaryFields: ['title', 'status', 'pickup_location', 'delivery_location'], searchFields: ['title', 'description', 'pickup_location', 'delivery_location', 'status'], defaultSort: '-created_at', protectedFamily: true },
  { id: 'TradePost', label: 'Trade Posts', category: 'Commerce', summaryFields: ['title', 'status', 'poster_callsign', 'created_at'], searchFields: ['title', 'description', 'poster_callsign', 'status'], defaultSort: '-created_at', deactivatePatch: { status: 'CANCELLED', cancelled_at: '__NOW__' }, restorePatch: { status: 'OPEN' } },
  { id: 'CofferLog', label: 'Coffer Ledger', category: 'Commerce', summaryFields: ['entry_type', 'amount_aUEC', 'logged_by_callsign', 'description'], searchFields: ['entry_type', 'logged_by_callsign', 'description'], defaultSort: '-logged_at', protectedFamily: true },
  { id: 'CargoLog', label: 'Cargo Logs', category: 'Commerce', summaryFields: ['commodity', 'origin_station', 'destination_station', 'profit_aUEC'], searchFields: ['commodity', 'origin_station', 'destination_station', 'notes'], defaultSort: '-logged_at', protectedFamily: true },
  { id: 'CargoJob', label: 'Cargo Jobs', category: 'Logistics', summaryFields: ['title', 'status', 'pickup_location', 'delivery_location'], searchFields: ['title', 'pickup_location', 'delivery_location', 'notes', 'status'], defaultSort: '-created_at', deactivatePatch: { status: 'CANCELLED', cancelled_at: '__NOW__' }, restorePatch: { status: 'OPEN' } },
  { id: 'Consignment', label: 'Consignments', category: 'Logistics', summaryFields: ['title', 'status', 'asking_price_aUEC', 'seller_callsign'], searchFields: ['title', 'goods_text', 'seller_callsign', 'notes', 'status'], defaultSort: '-created_at', deactivatePatch: { status: 'RETURNED', returned_at: '__NOW__' } },
  { id: 'Requisition', label: 'Requisitions', category: 'Logistics', summaryFields: ['title', 'status', 'requested_by_callsign', 'requested_at'], searchFields: ['title', 'description', 'requested_by_callsign', 'status'], defaultSort: '-requested_at', deactivatePatch: { status: 'CANCELLED', cancelled_at: '__NOW__' }, restorePatch: { status: 'OPEN' } },
  { id: 'MemberDebt', label: 'Member Debts', category: 'Org', summaryFields: ['callsign', 'status', 'amount_aUEC', 'description'], searchFields: ['callsign', 'description', 'status'], defaultSort: '-issued_at', protectedFamily: true },
  { id: 'PersonalAsset', label: 'Personal Assets', category: 'Org', summaryFields: ['name', 'owner_callsign', 'location', 'value_aUEC'], searchFields: ['name', 'owner_callsign', 'location', 'notes'], defaultSort: '-logged_at', allowDelete: true },
  { id: 'OrgTransfer', label: 'Org Transfers', category: 'Org', summaryFields: ['from_callsign', 'to_callsign', 'amount_aUEC', 'created_at'], searchFields: ['from_callsign', 'to_callsign', 'notes'], defaultSort: '-created_at', protectedFamily: true },
  { id: 'PatchDigest', label: 'Patch Digests', category: 'Reference', summaryFields: ['patch_version', 'branch', 'processed_at'], searchFields: ['patch_version', 'branch', 'industry_summary'], defaultSort: '-processed_at', allowDelete: true },
  { id: 'ComponentHarvest', label: 'Component Harvest', category: 'Industry', summaryFields: ['component_name', 'quality_pct', 'source_ship', 'extracted_at'], searchFields: ['component_name', 'source_ship', 'notes'], defaultSort: '-extracted_at', allowDelete: true },
  { id: 'DismantleLog', label: 'Dismantle Logs', category: 'Industry', summaryFields: ['item_name', 'quantity', 'dismantled_at', 'location'], searchFields: ['item_name', 'location', 'notes'], defaultSort: '-dismantled_at', allowDelete: true },
  { id: 'MissionDrop', label: 'Mission Drops', category: 'Industry', summaryFields: ['mission_name', 'item_name', 'drop_chance_pct', 'location'], searchFields: ['mission_name', 'item_name', 'location', 'notes'], defaultSort: '-drop_chance_pct', allowDelete: true },
];

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value: unknown): value is GenericRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePatchValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePatchValues(item));
  }
  if (isPlainObject(value)) {
    const next: GenericRecord = {};
    for (const [key, nested] of Object.entries(value)) {
      if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      next[key] = normalizePatchValues(nested);
    }
    return next;
  }
  return value;
}

function applyDynamicValues(patch: GenericRecord | null, record: GenericRecord): GenericRecord | null {
  if (!patch) return null;
  const now = new Date().toISOString();
  const next = cloneJson(patch);
  Object.entries(next).forEach(([key, value]) => {
    if (value === '__NOW__') {
      next[key] = now;
      return;
    }
    if (value === '__CURRENT_STATUS__') {
      next[key] = textValue(record.status);
    }
  });
  return next;
}

function serializeEntityConfig(config: AdminEntityConfig) {
  return {
    id: config.id,
    label: config.label,
    category: config.category,
    summary_fields: config.summaryFields,
    search_fields: config.searchFields,
    default_sort: config.defaultSort || '-updated_date',
    capabilities: {
      edit: config.readOnly !== true,
      deactivate: Boolean(config.deactivatePatch),
      restore: Boolean(config.restorePatch),
      delete: isDeleteAllowed(config),
    },
    protected_family: config.protectedFamily === true,
  };
}

export function listAdminEntityConfigs() {
  return ADMIN_ENTITY_REGISTRY.map((config) => serializeEntityConfig(config));
}

export function getAdminEntityConfig(entityName: string): AdminEntityConfig | null {
  return ADMIN_ENTITY_REGISTRY.find((config) => config.id === entityName) || null;
}

export function isDeleteAllowed(config: AdminEntityConfig): boolean {
  if (config.readOnly) return false;
  if (config.allowDelete === false) return false;
  if (config.allowDelete === true) return true;
  if (config.protectedFamily || PROTECTED_DELETE_ENTITIES.has(config.id)) return false;
  if (config.deactivatePatch) return false;
  return true;
}

function resolvePatchValue(resolver: PatchResolver | null | undefined, record: GenericRecord): GenericRecord | null {
  if (!resolver) return null;
  if (typeof resolver === 'function') {
    return applyDynamicValues(resolver(record), record);
  }
  return applyDynamicValues(resolver, record);
}

function recordTimestamp(record: GenericRecord): number {
  for (const field of TIMESTAMP_FIELDS) {
    const value = textValue(record?.[field]);
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time) && Number.isFinite(time)) {
      return time;
    }
  }
  return 0;
}

function comparableValue(value: unknown): string | number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== '') {
    return numeric;
  }
  return textValue(value).toLowerCase();
}

function compareRecords(left: GenericRecord, right: GenericRecord, sort: string): number {
  const normalizedSort = textValue(sort) || '-updated_date';
  const descending = normalizedSort.startsWith('-');
  const field = normalizedSort.replace(/^-/, '');

  if (!field) {
    return recordTimestamp(right) - recordTimestamp(left);
  }

  const leftValue = comparableValue(left?.[field]);
  const rightValue = comparableValue(right?.[field]);
  const order = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  return descending ? order * -1 : order;
}

function matchesSearch(record: GenericRecord, config: AdminEntityConfig, query: string): boolean {
  const normalized = textValue(query).toLowerCase();
  if (!normalized) return true;

  if (textValue(record.id).toLowerCase().includes(normalized)) {
    return true;
  }

  return [...new Set([...config.searchFields, ...config.summaryFields])].some((field) => {
    const value = record?.[field];
    if (Array.isArray(value) || isPlainObject(value)) {
      try {
        return JSON.stringify(value).toLowerCase().includes(normalized);
      } catch {
        return false;
      }
    }
    return textValue(value).toLowerCase().includes(normalized);
  });
}

function resolveRecentSince(recentWindow: unknown): number {
  const normalized = textValue(recentWindow).toLowerCase();
  if (!normalized || normalized === 'all') return 0;
  if (normalized === '24h') return Date.now() - (24 * 60 * 60 * 1000);
  if (normalized === '7d') return Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (normalized === '30d') return Date.now() - (30 * 24 * 60 * 60 * 1000);

  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Date.now() - (numeric * 1000);
  }

  const explicit = new Date(normalized).getTime();
  return Number.isFinite(explicit) ? explicit : 0;
}

function summarizeRecord(config: AdminEntityConfig, record: GenericRecord) {
  const summary: Record<string, unknown> = {};
  config.summaryFields.forEach((field) => {
    summary[field] = record?.[field] ?? null;
  });
  return summary;
}

function resolveRecordLabel(config: AdminEntityConfig, record: GenericRecord): string {
  for (const field of config.summaryFields) {
    const value = record?.[field];
    if (Array.isArray(value) || isPlainObject(value)) {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '[]' && serialized !== '{}') {
        return serialized.slice(0, 160);
      }
      continue;
    }
    const text = textValue(value);
    if (text) {
      return text;
    }
  }
  return textValue(record.id) || config.id;
}

async function listEntity(base44: any, entityName: string, sort: string, limit: number) {
  const entity = base44.asServiceRole.entities?.[entityName];
  if (!entity || typeof entity.list !== 'function') {
    throw new Error('entity_not_available');
  }

  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const normalizedSort = textValue(sort) || '-updated_date';

  return await entity.list(normalizedSort, safeLimit).catch(async () => {
    return await entity.list().catch(() => {
      throw new Error('entity_unreadable');
    });
  });
}

export async function findAdminRecordById(base44: any, entityName: string, id: string) {
  const entity = base44.asServiceRole.entities?.[entityName];
  if (!entity) {
    throw new Error('entity_not_available');
  }

  if (typeof entity.filter === 'function') {
    const filtered = await entity.filter({ id }).catch(() => null);
    if (Array.isArray(filtered) && filtered[0]) {
      return filtered[0];
    }
  }

  const listed = await listEntity(base44, entityName, '-updated_date', 500);
  return toArray(listed).find((record) => textValue(record?.id) === id) || null;
}

export async function listAdminRecords(
  base44: any,
  options: {
    entity: string;
    query?: unknown;
    id?: unknown;
    sort?: unknown;
    limit?: unknown;
    page?: unknown;
    recent_window?: unknown;
  },
) {
  const config = getAdminEntityConfig(textValue(options.entity));
  if (!config) {
    throw new Error('unknown_entity');
  }

  const pageSize = Math.max(1, Math.min(100, Number(options.limit) || 25));
  const page = Math.max(1, Number(options.page) || 1);
  const explicitId = textValue(options.id);

  let records = [];
  if (explicitId) {
    const record = await findAdminRecordById(base44, config.id, explicitId);
    records = record ? [record] : [];
  } else {
    const raw = await listEntity(base44, config.id, textValue(options.sort) || config.defaultSort || '-updated_date', Math.max(pageSize * 6, 120));
    records = toArray(raw);
  }

  const recentSince = resolveRecentSince(options.recent_window);
  const filtered = records
    .filter((record) => matchesSearch(record, config, textValue(options.query)))
    .filter((record) => (recentSince > 0 ? recordTimestamp(record) >= recentSince : true))
    .sort((left, right) => compareRecords(left, right, textValue(options.sort) || config.defaultSort || '-updated_date'));

  const total = filtered.length;
  const sliceStart = (page - 1) * pageSize;
  const pageItems = filtered.slice(sliceStart, sliceStart + pageSize);

  return {
    entity: serializeEntityConfig(config),
    total,
    page,
    page_size: pageSize,
    records: pageItems.map((record) => ({
      id: textValue(record.id),
      label: resolveRecordLabel(config, record),
      summary: summarizeRecord(config, record),
      timestamps: {
        updated: TIMESTAMP_FIELDS.map((field) => textValue(record?.[field])).find(Boolean) || null,
      },
      record,
    })),
  };
}

export async function getAdminRecord(base44: any, entityName: string, id: string) {
  const config = getAdminEntityConfig(entityName);
  if (!config) {
    throw new Error('unknown_entity');
  }
  const record = await findAdminRecordById(base44, entityName, id);
  if (!record) {
    throw new Error('record_not_found');
  }
  return {
    entity: serializeEntityConfig(config),
    record,
    label: resolveRecordLabel(config, record),
  };
}

export function sanitizePatch(input: unknown): GenericRecord {
  if (!isPlainObject(input)) {
    throw new Error('invalid_patch');
  }

  const cleaned = normalizePatchValues(input) as GenericRecord;
  delete cleaned.id;

  if (Object.keys(cleaned).length === 0) {
    throw new Error('empty_patch');
  }

  return cleaned;
}

export function sanitizeAuditSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditSnapshot(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const next: GenericRecord = {};
  Object.entries(value).forEach(([key, nested]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return;
    }
    next[key] = sanitizeAuditSnapshot(nested);
  });
  return next;
}

export async function writeAdminActionLog(base44: any, actor: AdminActor, input: AdminActionLogInput) {
  const entity = base44.asServiceRole.entities?.AdminActionLog;
  if (!entity || typeof entity.create !== 'function') {
    throw new Error('admin_action_log_unavailable');
  }

  const payload = {
    acted_by_user_id: textValue(actor?.id) || null,
    acted_by_callsign: textValue(actor?.callsign) || null,
    action_type: textValue(input.actionType) || 'ADMIN_ACTION',
    entity_name: textValue(input.entityName) || null,
    record_id: textValue(input.recordId) || null,
    record_label: textValue(input.recordLabel) || null,
    reason: textValue(input.reason) || null,
    strategy: textValue(input.strategy) || null,
    before_snapshot: sanitizeAuditSnapshot(input.beforeSnapshot || null),
    after_snapshot: sanitizeAuditSnapshot(input.afterSnapshot || null),
    created_at: new Date().toISOString(),
  };

  return await entity.create(payload);
}

export async function listAdminActionLog(base44: any, limit = 25) {
  const records = await listEntity(base44, 'AdminActionLog', '-created_at', limit);
  return toArray(records);
}

function requireEntityHandle(base44: any, entityName: string) {
  const entity = base44.asServiceRole.entities?.[entityName];
  if (!entity) {
    throw new Error('entity_not_available');
  }
  return entity;
}

function requireReason(reason: unknown) {
  const normalized = textValue(reason);
  if (!normalized) {
    throw new Error('reason_required');
  }
  return normalized;
}

export async function updateAdminRecord(
  base44: any,
  actor: AdminActor,
  entityName: string,
  id: string,
  patchInput: unknown,
  reason?: unknown,
) {
  const config = getAdminEntityConfig(entityName);
  if (!config) {
    throw new Error('unknown_entity');
  }
  if (config.readOnly) {
    throw new Error('entity_read_only');
  }

  const entity = requireEntityHandle(base44, entityName);
  const existing = await findAdminRecordById(base44, entityName, id);
  if (!existing) {
    throw new Error('record_not_found');
  }

  const patch = sanitizePatch(patchInput);
  const updated = await entity.update(id, patch);
  await writeAdminActionLog(base44, actor, {
    actionType: 'UPDATE_RECORD',
    entityName,
    recordId: id,
    recordLabel: resolveRecordLabel(config, updated || existing),
    reason: textValue(reason) || null,
    strategy: 'edit',
    beforeSnapshot: existing,
    afterSnapshot: updated,
  });

  return updated;
}

export async function deactivateAdminRecord(
  base44: any,
  actor: AdminActor,
  entityName: string,
  id: string,
  reason?: unknown,
) {
  const config = getAdminEntityConfig(entityName);
  if (!config) {
    throw new Error('unknown_entity');
  }
  const strategy = resolvePatchValue(config.deactivatePatch, {});
  if (!config.deactivatePatch || !strategy) {
    throw new Error('deactivate_not_supported');
  }

  const entity = requireEntityHandle(base44, entityName);
  const existing = await findAdminRecordById(base44, entityName, id);
  if (!existing) {
    throw new Error('record_not_found');
  }

  const patch = resolvePatchValue(config.deactivatePatch, existing);
  if (!patch) {
    throw new Error('deactivate_not_supported');
  }

  const updated = await entity.update(id, patch);
  await writeAdminActionLog(base44, actor, {
    actionType: 'DEACTIVATE_RECORD',
    entityName,
    recordId: id,
    recordLabel: resolveRecordLabel(config, updated || existing),
    reason: requireReason(reason),
    strategy: 'deactivate',
    beforeSnapshot: existing,
    afterSnapshot: updated,
  });

  return updated;
}

export async function restoreAdminRecord(
  base44: any,
  actor: AdminActor,
  entityName: string,
  id: string,
  reason?: unknown,
) {
  const config = getAdminEntityConfig(entityName);
  if (!config) {
    throw new Error('unknown_entity');
  }
  if (!config.restorePatch) {
    throw new Error('restore_not_supported');
  }

  const entity = requireEntityHandle(base44, entityName);
  const existing = await findAdminRecordById(base44, entityName, id);
  if (!existing) {
    throw new Error('record_not_found');
  }

  const patch = resolvePatchValue(config.restorePatch, existing);
  if (!patch) {
    throw new Error('restore_not_supported');
  }

  const updated = await entity.update(id, patch);
  await writeAdminActionLog(base44, actor, {
    actionType: 'RESTORE_RECORD',
    entityName,
    recordId: id,
    recordLabel: resolveRecordLabel(config, updated || existing),
    reason: requireReason(reason),
    strategy: 'restore',
    beforeSnapshot: existing,
    afterSnapshot: updated,
  });

  return updated;
}

export async function deleteAdminRecord(
  base44: any,
  actor: AdminActor,
  entityName: string,
  id: string,
  reason?: unknown,
) {
  const config = getAdminEntityConfig(entityName);
  if (!config) {
    throw new Error('unknown_entity');
  }
  if (!isDeleteAllowed(config)) {
    throw new Error('delete_not_supported');
  }

  const entity = requireEntityHandle(base44, entityName);
  if (typeof entity.delete !== 'function') {
    throw new Error('entity_not_deletable');
  }

  const existing = await findAdminRecordById(base44, entityName, id);
  if (!existing) {
    throw new Error('record_not_found');
  }

  await entity.delete(id);
  await writeAdminActionLog(base44, actor, {
    actionType: 'DELETE_RECORD',
    entityName,
    recordId: id,
    recordLabel: resolveRecordLabel(config, existing),
    reason: requireReason(reason),
    strategy: 'delete',
    beforeSnapshot: existing,
    afterSnapshot: null,
  });

  return { id, deleted: true };
}
