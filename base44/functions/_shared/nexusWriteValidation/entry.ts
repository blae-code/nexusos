import { resolveIssuedKeySession } from '../../auth/_shared/issuedKey/entry.ts';

export class NexusWriteError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, status = 400, details?: Record<string, unknown>) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const VALID_MATERIAL_TYPES = new Set(['RAW', 'REFINED', 'SALVAGE', 'CRAFTED']);
export const VALID_SOURCE_TYPES = new Set(['MANUAL', 'OCR_UPLOAD', 'OCR_MOBILE', 'REFINERY_ORDER']);
export const VALID_REFINERY_METHODS = new Set([
  'CORMACK',
  'DINYX',
  'ELECTRODES',
  'FERRON',
  'GCCS',
  'GRASE',
  'PYROMETRIC',
  'THERMONITE',
  'XCR',
]);
export const VALID_REFINERY_STATIONS = new Set([
  'ARC-L1',
  'MIC-L1',
  'CRU-L1',
  'HUR-L1',
  'LORVILLE',
  'NEW-BABBAGE',
  'GRIM-HEX',
  'RUIN',
]);
export const VALID_CRAFT_STATUSES = new Set(['OPEN', 'CLAIMED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED']);
export const VALID_RSVP_STATUSES = new Set(['CONFIRMED', 'DECLINED', 'TENTATIVE']);
export const VALID_VOLUME_ESTIMATES = new Set(['SMALL', 'MEDIUM', 'LARGE', 'MASSIVE']);
export const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);
export const LEADER_RANKS = new Set(['PIONEER', 'FOUNDER', 'VOYAGER']);

export function okResponse(payload: Record<string, unknown>, status = 200) {
  return Response.json({ ok: true, ...payload }, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof NexusWriteError) {
    return Response.json({
      error: error.code,
      ...(error.details || {}),
    }, { status: error.status });
  }

  console.error('[nexus-write-error]', error);
  return Response.json({ error: 'internal_error' }, { status: 500 });
}

export async function requirePostJson(req: Request) {
  if (req.method !== 'POST') {
    throw new NexusWriteError('method_not_allowed', 405);
  }

  try {
    return await req.json();
  } catch {
    throw new NexusWriteError('invalid_body', 400);
  }
}

export async function requireSessionUser(req: Request) {
  const resolved = await resolveIssuedKeySession(req).catch(() => null);
  if (!resolved?.user?.id) {
    throw new NexusWriteError('unauthorized', 401);
  }
  return resolved.user;
}

export function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function nullableText(value: unknown) {
  const normalized = textValue(value);
  return normalized || null;
}

export function normalizeLookup(value: unknown) {
  return textValue(value).toLowerCase().replace(/\s+/g, ' ');
}

export function resolveCallsign(user: any, fallback = 'UNKNOWN') {
  return textValue(user?.callsign || user?.username || fallback) || fallback;
}

export function parseNumber(
  value: unknown,
  code: string,
  options: { min?: number; max?: number; allowZero?: boolean } = {},
) {
  const numeric = Number(value);
  const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, allowZero = true } = options;

  if (!Number.isFinite(numeric)) {
    throw new NexusWriteError(code, 400);
  }

  if (numeric < min || numeric > max || (!allowZero && numeric === 0)) {
    throw new NexusWriteError(code, 400);
  }

  return numeric;
}

export function optionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeEnum(value: unknown, valid: Set<string>, code: string) {
  const normalized = textValue(value).toUpperCase();
  if (!normalized || !valid.has(normalized)) {
    throw new NexusWriteError(code, 400);
  }
  return normalized;
}

export function resolveQualityScore(input: Record<string, unknown>, code = 'invalid_quality_score') {
  const rawScore = Number(input?.quality_score);
  const rawPercent = Number(input?.quality_pct);

  let qualityScore = rawScore;
  if (!Number.isFinite(qualityScore) || qualityScore <= 0) {
    if (Number.isFinite(rawPercent)) {
      qualityScore = Math.round(rawPercent * 10);
    }
  }

  if (!Number.isFinite(qualityScore) || qualityScore < 1 || qualityScore > 1000) {
    throw new NexusWriteError(code, 400);
  }

  return Math.round(qualityScore);
}

export function resolveOptionalQualityScore(input: Record<string, unknown>) {
  const rawScore = Number(input?.quality_score);
  if (Number.isFinite(rawScore) && rawScore > 0 && rawScore <= 1000) {
    return Math.round(rawScore);
  }

  const rawPercent = Number(input?.quality_pct);
  if (Number.isFinite(rawPercent) && rawPercent > 0 && rawPercent <= 100) {
    return Math.round(rawPercent * 10);
  }

  return null;
}

export function qualityPercentFromScore(score: number) {
  return Math.max(0, Math.min(100, Number(score) / 10));
}

export function normalizeRoleSlots(roleSlots: unknown) {
  if (!roleSlots) return [];
  if (Array.isArray(roleSlots)) {
    return roleSlots
      .map((slot) => textValue((slot as Record<string, unknown>)?.name))
      .filter(Boolean);
  }

  return Object.keys(roleSlots as Record<string, unknown>).map((slot) => textValue(slot)).filter(Boolean);
}

export async function findEntityById(base44: any, entityName: string, id: string) {
  const items = await base44.asServiceRole.entities[entityName].filter({ id });
  return items?.[0] || null;
}

export function buildMaterialRecord(input: Record<string, unknown>, user: any, overrides: Record<string, unknown> = {}) {
  const materialName = textValue(input.material_name);
  if (!materialName) {
    throw new NexusWriteError('material_name_required', 400);
  }

  const materialType = normalizeEnum(input.material_type || 'RAW', VALID_MATERIAL_TYPES, 'invalid_material_type');
  const quantityScu = parseNumber(input.quantity_scu ?? 0, 'invalid_material_quantity', { min: 0 });
  const qualityScore = resolveQualityScore(input);

  return {
    material_name: materialName,
    quantity_scu: quantityScu,
    quality_score: qualityScore,
    quality_pct: qualityPercentFromScore(qualityScore),
    material_type: materialType,
    t2_eligible: qualityScore >= 800,
    location: nullableText(input.location),
    container: nullableText(input.container),
    logged_by_user_id: user?.id || null,
    logged_by_callsign: resolveCallsign(user),
    source_type: normalizeEnum(input.source_type || 'MANUAL', VALID_SOURCE_TYPES, 'invalid_source_type'),
    screenshot_ref: nullableText(input.screenshot_ref),
    notes: nullableText(input.notes),
    session_id: nullableText(input.session_id),
    logged_at: nullableText(input.logged_at) || new Date().toISOString(),
    ...overrides,
  };
}

export function buildScoutDepositRecord(input: Record<string, unknown>, user: any) {
  const materialName = textValue(input.material_name);
  const systemName = textValue(input.system_name).toUpperCase();
  const locationDetail = textValue(input.location_detail);

  if (!materialName) {
    throw new NexusWriteError('material_name_required', 400);
  }
  if (!systemName) {
    throw new NexusWriteError('system_name_required', 400);
  }
  if (!locationDetail) {
    throw new NexusWriteError('location_detail_required', 400);
  }

  const qualityScore = resolveQualityScore(input);

  return {
    material_name: materialName,
    system_name: systemName,
    location_detail: locationDetail,
    quality_score: qualityScore,
    quality_pct: qualityPercentFromScore(qualityScore),
    volume_estimate: normalizeEnum(input.volume_estimate || 'MEDIUM', VALID_VOLUME_ESTIMATES, 'invalid_volume_estimate'),
    risk_level: normalizeEnum(input.risk_level || 'MEDIUM', VALID_RISK_LEVELS, 'invalid_risk_level'),
    ship_type: nullableText(input.ship_type),
    notes: nullableText(input.notes),
    reported_by_user_id: user?.id || null,
    reported_by_callsign: resolveCallsign(user),
    reported_at: nullableText(input.reported_at) || new Date().toISOString(),
    is_stale: false,
    confirmed_votes: 0,
    stale_votes: 0,
  };
}

export function buildRefineryOrderRecord(input: Record<string, unknown>, user: any) {
  const materialName = textValue(input.material_name);
  if (!materialName) {
    throw new NexusWriteError('material_name_required', 400);
  }

  const quantityScu = parseNumber(input.quantity_scu, 'invalid_refinery_quantity', { min: 0, allowZero: false });
  const qualityScore = resolveOptionalQualityScore(input);
  const method = normalizeEnum(input.method || input.refinery_method, VALID_REFINERY_METHODS, 'invalid_refinery_method');
  const station = normalizeEnum(input.station, VALID_REFINERY_STATIONS, 'invalid_refinery_station');

  return {
    material_name: materialName,
    quantity_scu: quantityScu,
    quality_score: qualityScore,
    quality_pct: qualityScore ? qualityPercentFromScore(qualityScore) : null,
    method,
    yield_pct: optionalNumber(input.yield_pct),
    cost_aUEC: optionalNumber(input.cost_aUEC),
    station,
    submitted_by_user_id: user?.id || null,
    submitted_by_callsign: resolveCallsign(user),
    started_at: nullableText(input.started_at) || new Date().toISOString(),
    completes_at: nullableText(input.completes_at),
    status: normalizeEnum(input.status || 'ACTIVE', new Set(['ACTIVE', 'READY', 'COLLECTED']), 'invalid_refinery_status'),
    source_type: normalizeEnum(input.source_type || 'MANUAL', VALID_SOURCE_TYPES, 'invalid_source_type'),
  };
}

export function buildCraftQueueRecord(input: Record<string, unknown>, blueprint: any, user: any) {
  const blueprintId = textValue(input.blueprint_id || blueprint?.id);
  if (!blueprintId || !blueprint?.id) {
    throw new NexusWriteError('blueprint_not_found', 404);
  }

  const hasOwner = Boolean(blueprint.owned_by_user_id || blueprint.owned_by || blueprint.owned_by_callsign);
  if (!hasOwner) {
    throw new NexusWriteError('blueprint_unowned', 400);
  }

  const quantity = parseNumber(input.quantity ?? 1, 'invalid_craft_quantity', { min: 0, allowZero: false });

  return {
    blueprint_id: blueprintId,
    blueprint_name: textValue(input.blueprint_name || blueprint.item_name || blueprint.name) || 'Unknown Blueprint',
    quantity,
    status: normalizeEnum(input.status || 'OPEN', VALID_CRAFT_STATUSES, 'invalid_craft_status'),
    priority_flag: Boolean(input.priority_flag),
    op_id: nullableText(input.op_id),
    notes: nullableText(input.notes),
    aUEC_value_est: optionalNumber(input.aUEC_value_est),
    requested_by_user_id: user?.id || null,
    requested_by_callsign: resolveCallsign(user),
  };
}
