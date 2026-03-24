import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createNotification } from '../nexusNotification/entry.ts';
import { buildFleetPlanningSnapshot } from '../fleetPlanning/entry.ts';
import {
  errorResponse,
  findEntityById,
  NexusWriteError,
  okResponse,
  requireSessionUser,
  textValue,
  nullableText,
  resolveCallsign,
} from '../nexusWriteValidation/entry.ts';

type Base44Client = ReturnType<typeof createClientFromRequest>;
type GenericRecord = Record<string, unknown>;

export const OPS_TEMPLATE_VERSION = '2026.03-ops-v1';

const COMMAND_RANKS = new Set(['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER']);
const PHASE_ACTION_TYPES = new Set([
  'PHASE_ADVANCE',
  'THREAT',
  'THREAT_RESOLVED',
  'MATERIAL',
  'CRAFT',
  'PING',
  'MANUAL',
  'COMMAND',
  'WRAP_UP',
]);
const LIVE_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'LIVE', 'COMPLETE', 'ARCHIVED']);
const WRAP_UP_OUTCOMES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'ABORTED']);

function numberValue(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeArray<T = GenericRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function safeRecord(value: unknown): GenericRecord {
  return value && typeof value === 'object' ? value as GenericRecord : {};
}

function safeDate(value: unknown): string | null {
  const normalized = textValue(value);
  return normalized || null;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeRoleSlotsDetailed(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) {
    return input
      .map((slot, index) => {
        const record = safeRecord(slot);
        const name = textValue(record.name || record.label);
        if (!name) return null;
        return {
          id: textValue(record.id) || `role_${index + 1}`,
          name,
          capacity: Math.max(1, Math.round(numberValue(record.capacity, 1))),
          role_tag: textValue(record.role_tag || name).toLowerCase(),
          ship_tags: safeArray<string>(record.ship_tags || []),
          notes: nullableText(record.notes),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
  }

  return Object.entries(safeRecord(input)).map(([name, value], index) => {
    const record = safeRecord(value);
    return {
      id: textValue(record.id) || `role_${index + 1}`,
      name: textValue(name),
      capacity: Math.max(1, Math.round(numberValue(record.capacity ?? value, 1))),
      role_tag: textValue(record.role_tag || name).toLowerCase(),
      ship_tags: safeArray<string>(record.ship_tags || []),
      notes: nullableText(record.notes),
    };
  });
}

function normalizeReadinessItems(input: unknown, templateItems: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  const items = safeArray<GenericRecord>(input);
  const source = items.length ? items : templateItems;
  return source.map((item, index) => ({
    id: textValue(item.id) || `gate_${index + 1}`,
    title: textValue(item.title),
    detail: nullableText(item.detail),
    priority: textValue(item.priority || 'warn').toLowerCase(),
    done: item.done === true,
    locked: item.locked === true,
    assignee: nullableText(item.assignee),
  }));
}

function aggregateByLabel(items: Array<Record<string, unknown>>, labelKey: string, valueKey = 'value') {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const label = textValue(item[labelKey] || 'UNKNOWN') || 'UNKNOWN';
    const next = counts.get(label) || 0;
    counts.set(label, next + Math.max(1, Math.round(numberValue(item[valueKey], 1))));
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

function deriveTemplateRecommendationKey(templateKey: string): string {
  return textValue(templateKey).toUpperCase() || 'GENERIC_INDUSTRIAL';
}

const OP_TEMPLATES: Array<Record<string, unknown>> = [
  {
    key: 'OP_BREAKER_STATIONS',
    name: 'Operation Breaker Stations',
    short_label: 'Breaker Stations',
    redscar_alias: 'Rockbreaker',
    op_type: 'BREAKER_STATIONS',
    description: 'Nyx industrial sandbox event around QV Breaker Stations. Heavy emphasis on mining, fabrication, escort, hauling, and convoy discipline.',
    systems: ['Nyx', 'Stanton'],
    phases: ['Staging', 'Transit', 'Breach & Clear', 'Restore Power', 'Fabricate Lens', 'Align & Fire', 'Harvest & Extract', 'Convoy & Refinery', 'Debrief'],
    roles: [
      { id: 'command', name: 'Command', capacity: 1, role_tag: 'support', ship_tags: ['support', 'exploration'] },
      { id: 'mining', name: 'Mining', capacity: 3, role_tag: 'mining', ship_tags: ['mining', 'industrial'] },
      { id: 'escort', name: 'Escort', capacity: 3, role_tag: 'combat', ship_tags: ['combat', 'escort'] },
      { id: 'fabricator', name: 'Fabricator', capacity: 1, role_tag: 'refining', ship_tags: ['support', 'industrial'] },
      { id: 'scout', name: 'Scout', capacity: 1, role_tag: 'scouting', ship_tags: ['scouting', 'exploration'] },
      { id: 'hauler', name: 'Hauler', capacity: 2, role_tag: 'hauling', ship_tags: ['hauling', 'support'] },
      { id: 'medical', name: 'Medical/Recovery', capacity: 1, role_tag: 'support', ship_tags: ['support', 'medical'] },
      { id: 'reserve', name: 'Reserve', capacity: 2, role_tag: 'support', ship_tags: ['support'] },
    ],
    readiness_items: [
      { id: 'gate_access', title: 'Station access and route confirmed', detail: 'Validate insertion route, QV station status, and fallback extraction corridor.', priority: 'high' },
      { id: 'gate_fleet', title: 'Primary mining and escort ships green', detail: 'Fleet scenario linked and readiness above threshold for core roles.', priority: 'high' },
      { id: 'gate_fabrication', title: 'Lens fabrication materials ready', detail: 'Fabrication queue and T2/T3 material stock confirmed.', priority: 'high' },
      { id: 'gate_hauling', title: 'Hauling chain and refinery handoff ready', detail: 'Convoy, cargo throughput, and refinery destination confirmed.', priority: 'warn' },
      { id: 'gate_medical', title: 'Recovery and med support assigned', detail: 'Medical standby or rescue support confirmed.', priority: 'warn' },
      { id: 'gate_comms', title: 'Command brief issued', detail: 'Roles, phase intent, and fallback triggers reviewed before launch.', priority: 'warn' },
    ],
    support_requirements: [
      { key: 'scout', label: 'Scout Intel', module: 'SCOUT', priority: 'high', target: 'Fresh deposit or station intel in target system.' },
      { key: 'fleet', label: 'Fleet Readiness', module: 'FLEET', priority: 'high', target: 'Mining, escort, and hauling assignments above 70 readiness.' },
      { key: 'fabrication', label: 'Fabrication', module: 'INDUSTRY', priority: 'high', target: 'Lens fabrication inputs and active craft queue confirmed.' },
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'warn', target: 'Hauler coverage and cargo movement capacity confirmed.' },
      { key: 'refinery', label: 'Refinery', module: 'INDUSTRY', priority: 'warn', target: 'Refinery throughput or delivery destination identified.' },
      { key: 'armory', label: 'Armory', module: 'ARMORY', priority: 'warn', target: 'Critical mining, escort, and med items not below threshold.' },
    ],
    recommended_fleet: [
      { role: 'Mining', ship_tags: ['mining'], count: 3 },
      { role: 'Escort', ship_tags: ['combat', 'escort'], count: 3 },
      { role: 'Hauler', ship_tags: ['hauling'], count: 2 },
      { role: 'Support', ship_tags: ['support'], count: 1 },
    ],
  },
  {
    key: 'GENERIC_INDUSTRIAL',
    name: 'Generic Industrial Push',
    short_label: 'Industrial',
    op_type: 'INDUSTRIAL',
    description: 'Flexible industrial operation template for mixed production, hauling, and support workflows.',
    systems: ['Stanton', 'Pyro', 'Nyx'],
    phases: ['Staging', 'Transit', 'Primary Work', 'Extraction', 'Debrief'],
    roles: [
      { id: 'lead', name: 'Lead', capacity: 1, role_tag: 'support', ship_tags: ['support'] },
      { id: 'operators', name: 'Operators', capacity: 3, role_tag: 'mining', ship_tags: ['mining', 'salvage', 'hauling'] },
      { id: 'escort', name: 'Escort', capacity: 2, role_tag: 'combat', ship_tags: ['combat', 'escort'] },
      { id: 'hauler', name: 'Hauler', capacity: 2, role_tag: 'hauling', ship_tags: ['hauling'] },
    ],
    readiness_items: [
      { id: 'gate_route', title: 'Route and destination confirmed', detail: 'Travel, extraction, and fallback path reviewed.', priority: 'warn' },
      { id: 'gate_ships', title: 'Assigned ships checked', detail: 'Required ships and primary pilots are assigned.', priority: 'high' },
      { id: 'gate_support', title: 'Support resources ready', detail: 'Materials, cargo space, and staging supplies in place.', priority: 'warn' },
    ],
    support_requirements: [
      { key: 'fleet', label: 'Fleet Readiness', module: 'FLEET', priority: 'high', target: 'Core assignments above 70 readiness.' },
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'warn', target: 'Cargo movement capacity available.' },
      { key: 'armory', label: 'Armory', module: 'ARMORY', priority: 'warn', target: 'Critical consumables stocked.' },
    ],
    recommended_fleet: [
      { role: 'Operators', ship_tags: ['mining', 'salvage'], count: 2 },
      { role: 'Escort', ship_tags: ['combat'], count: 2 },
      { role: 'Hauler', ship_tags: ['hauling'], count: 1 },
    ],
  },
  {
    key: 'MINING_CONVOY',
    name: 'Mining Convoy',
    short_label: 'Mining Convoy',
    op_type: 'MINING',
    description: 'Convoy mining run with escort and haul chain focus.',
    systems: ['Stanton', 'Nyx'],
    phases: ['Staging', 'Transit', 'Mining', 'Extraction', 'Refinery Handoff', 'Debrief'],
    roles: [
      { id: 'command', name: 'Command', capacity: 1, role_tag: 'support', ship_tags: ['support'] },
      { id: 'mining', name: 'Mining', capacity: 3, role_tag: 'mining', ship_tags: ['mining'] },
      { id: 'escort', name: 'Escort', capacity: 2, role_tag: 'combat', ship_tags: ['combat', 'escort'] },
      { id: 'hauler', name: 'Hauler', capacity: 2, role_tag: 'hauling', ship_tags: ['hauling'] },
    ],
    readiness_items: [
      { id: 'gate_mining', title: 'Mining route and survey confirmed', detail: 'Primary survey and reserve deposits reviewed.', priority: 'high' },
      { id: 'gate_convoy', title: 'Convoy loadsheets ready', detail: 'Cargo spacing and transfer cadence confirmed.', priority: 'warn' },
      { id: 'gate_escort', title: 'Escort wing green', detail: 'Escort assignments ready for transit and extraction.', priority: 'high' },
    ],
    support_requirements: [
      { key: 'scout', label: 'Scout Intel', module: 'SCOUT', priority: 'high', target: 'Deposit route confirmed.' },
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'high', target: 'Hauler throughput online.' },
      { key: 'refinery', label: 'Refinery', module: 'INDUSTRY', priority: 'warn', target: 'Refinery station or collection plan ready.' },
    ],
    recommended_fleet: [
      { role: 'Mining', ship_tags: ['mining'], count: 3 },
      { role: 'Escort', ship_tags: ['combat'], count: 2 },
      { role: 'Hauler', ship_tags: ['hauling'], count: 2 },
    ],
  },
  {
    key: 'REFINERY_PUSH',
    name: 'Refinery Push',
    short_label: 'Refinery Push',
    op_type: 'REFINERY',
    description: 'Industrial run focused on active refinery orders, pickups, and redistribution.',
    systems: ['Stanton', 'Nyx', 'Pyro'],
    phases: ['Staging', 'Collection', 'Queue Review', 'Redistribution', 'Debrief'],
    roles: [
      { id: 'coord', name: 'Refinery Coord', capacity: 1, role_tag: 'refining', ship_tags: ['support'] },
      { id: 'hauler', name: 'Hauler', capacity: 2, role_tag: 'hauling', ship_tags: ['hauling'] },
      { id: 'escort', name: 'Escort', capacity: 1, role_tag: 'combat', ship_tags: ['combat'] },
      { id: 'reserve', name: 'Reserve', capacity: 1, role_tag: 'support', ship_tags: ['support'] },
    ],
    readiness_items: [
      { id: 'gate_orders', title: 'Active refinery orders reviewed', detail: 'Ready and active orders identified for collection.', priority: 'high' },
      { id: 'gate_cargo', title: 'Cargo capacity assigned', detail: 'Haulers assigned for pickup and redistribution.', priority: 'warn' },
      { id: 'gate_destination', title: 'Destination stock or buyer confirmed', detail: 'Delivery destination or stockpile plan known.', priority: 'warn' },
    ],
    support_requirements: [
      { key: 'refinery', label: 'Refinery', module: 'INDUSTRY', priority: 'high', target: 'Active/ready refinery orders present.' },
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'high', target: 'Hauler capacity ready.' },
      { key: 'fleet', label: 'Fleet Readiness', module: 'FLEET', priority: 'warn', target: 'Assigned haulers and escort online.' },
    ],
    recommended_fleet: [
      { role: 'Hauler', ship_tags: ['hauling'], count: 2 },
      { role: 'Support', ship_tags: ['support'], count: 1 },
      { role: 'Escort', ship_tags: ['combat'], count: 1 },
    ],
  },
  {
    key: 'SALVAGE_SWEEP',
    name: 'Salvage Sweep',
    short_label: 'Salvage',
    op_type: 'SALVAGE',
    description: 'Salvage-focused operation with escort and cargo turnover.',
    systems: ['Stanton', 'Pyro', 'Nyx'],
    phases: ['Staging', 'Transit', 'Recovery', 'Extraction', 'Debrief'],
    roles: [
      { id: 'salvage', name: 'Salvage', capacity: 3, role_tag: 'support', ship_tags: ['salvage'] },
      { id: 'escort', name: 'Escort', capacity: 2, role_tag: 'combat', ship_tags: ['combat'] },
      { id: 'hauler', name: 'Hauler', capacity: 1, role_tag: 'hauling', ship_tags: ['hauling'] },
    ],
    readiness_items: [
      { id: 'gate_target', title: 'Target field confirmed', detail: 'Target salvage location and risk state confirmed.', priority: 'high' },
      { id: 'gate_hold', title: 'Cargo and hold capacity ready', detail: 'Cargo space and transfer plan confirmed.', priority: 'warn' },
      { id: 'gate_cover', title: 'Security cover assigned', detail: 'Escort cover ready for sweep and extraction.', priority: 'warn' },
    ],
    support_requirements: [
      { key: 'fleet', label: 'Fleet Readiness', module: 'FLEET', priority: 'high', target: 'Salvage and escort ships assigned.' },
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'warn', target: 'Extraction capacity available.' },
      { key: 'armory', label: 'Armory', module: 'ARMORY', priority: 'warn', target: 'Repair and consumable stock not critical.' },
    ],
    recommended_fleet: [
      { role: 'Salvage', ship_tags: ['salvage'], count: 2 },
      { role: 'Escort', ship_tags: ['combat'], count: 2 },
      { role: 'Hauler', ship_tags: ['hauling'], count: 1 },
    ],
  },
  {
    key: 'CARGO_RECOVERY',
    name: 'Cargo Recovery',
    short_label: 'Cargo Recovery',
    op_type: 'CARGO',
    description: 'Rapid cargo movement, escort, and recovery planning.',
    systems: ['Stanton', 'Pyro', 'Nyx'],
    phases: ['Staging', 'Collection', 'Escort Transit', 'Delivery', 'Debrief'],
    roles: [
      { id: 'lead', name: 'Lead', capacity: 1, role_tag: 'support', ship_tags: ['support'] },
      { id: 'hauler', name: 'Hauler', capacity: 3, role_tag: 'hauling', ship_tags: ['hauling'] },
      { id: 'escort', name: 'Escort', capacity: 2, role_tag: 'combat', ship_tags: ['combat', 'escort'] },
      { id: 'reserve', name: 'Reserve', capacity: 1, role_tag: 'support', ship_tags: ['support'] },
    ],
    readiness_items: [
      { id: 'gate_manifest', title: 'Cargo manifest verified', detail: 'Cargo type, volume, and handoff destination reviewed.', priority: 'high' },
      { id: 'gate_escort', title: 'Escort coverage ready', detail: 'Escort role fill adequate for full transit.', priority: 'warn' },
      { id: 'gate_delivery', title: 'Delivery route and unload point set', detail: 'Final unload destination confirmed.', priority: 'warn' },
    ],
    support_requirements: [
      { key: 'cargo', label: 'Cargo Chain', module: 'LOGISTICS', priority: 'high', target: 'Cargo movement cadence established.' },
      { key: 'fleet', label: 'Fleet Readiness', module: 'FLEET', priority: 'high', target: 'Hauler and escort assignments ready.' },
      { key: 'armory', label: 'Armory', module: 'ARMORY', priority: 'warn', target: 'Critical convoy consumables stocked.' },
    ],
    recommended_fleet: [
      { role: 'Hauler', ship_tags: ['hauling'], count: 3 },
      { role: 'Escort', ship_tags: ['combat'], count: 2 },
    ],
  },
];

export function listOpTemplates() {
  return OP_TEMPLATES.map((template) => ({
    key: textValue(template.key),
    name: textValue(template.name),
    short_label: textValue(template.short_label),
    redscar_alias: nullableText(template.redscar_alias),
    op_type: textValue(template.op_type),
    description: textValue(template.description),
    systems: safeArray<string>(template.systems),
    phases: safeArray<string>(template.phases),
    roles: normalizeRoleSlotsDetailed(template.roles),
    readiness_items: normalizeReadinessItems(template.readiness_items),
    support_requirements: safeArray<GenericRecord>(template.support_requirements),
    recommended_fleet: safeArray<GenericRecord>(template.recommended_fleet),
  }));
}

export function getOpTemplate(templateKey: string | null | undefined) {
  const normalized = deriveTemplateRecommendationKey(String(templateKey || ''));
  return listOpTemplates().find((template) => textValue(template.key).toUpperCase() === normalized)
    || listOpTemplates().find((template) => textValue(template.key) === 'GENERIC_INDUSTRIAL')
    || null;
}

async function safeListEntity(base44: Base44Client, entityName: string, sort = '-created_date', limit = 200) {
  try {
    const entity = (base44.asServiceRole.entities as GenericRecord)[entityName] as any;
    if (!entity?.list) return [];
    const records = await entity.list(sort, limit);
    return safeArray<GenericRecord>(records);
  } catch {
    return [];
  }
}

async function safeFilterEntity(base44: Base44Client, entityName: string, filters: Record<string, unknown>, sort = '-created_date', limit = 200) {
  try {
    const entity = (base44.asServiceRole.entities as GenericRecord)[entityName] as any;
    if (!entity?.filter) return [];
    const records = await entity.filter(filters, sort, limit);
    return safeArray<GenericRecord>(records);
  } catch {
    return [];
  }
}

function validateCommandRank(user: GenericRecord) {
  const rank = textValue(user?.nexus_rank).toUpperCase();
  if (!COMMAND_RANKS.has(rank)) {
    throw new NexusWriteError('forbidden', 403);
  }
}

function parseStatus(value: unknown, fallback = 'DRAFT') {
  const normalized = textValue(value || fallback).toUpperCase();
  if (!LIVE_STATUSES.has(normalized)) {
    throw new NexusWriteError('invalid_op_status', 400);
  }
  return normalized;
}

function buildReadinessGateFromTemplate(template: GenericRecord | null, currentGate?: unknown) {
  const templateItems = normalizeReadinessItems(template?.readiness_items || []);
  const items = normalizeReadinessItems(currentGate && safeRecord(currentGate).items, templateItems);
  return {
    items,
    completion_pct: items.length ? Math.round((items.filter((item) => item.done).length / items.length) * 100) : 0,
  };
}

function buildSupportRequirementsFromTemplate(template: GenericRecord | null, currentRequirements?: unknown) {
  const incoming = safeArray<GenericRecord>(currentRequirements);
  if (incoming.length) return incoming;
  return safeArray<GenericRecord>(template?.support_requirements);
}

function buildLinkedUnits(fleetSnapshot: Record<string, unknown> | null) {
  const units = safeArray<GenericRecord>(fleetSnapshot?.units);
  return units.map((unit) => ({
    id: textValue(unit.id),
    name: textValue(unit.name),
    unit_type: textValue(unit.unit_type),
  }));
}

function ensurePhaseList(input: unknown, template: GenericRecord | null) {
  const phases = safeArray<string>(input).map((phase) => textValue(phase)).filter(Boolean);
  if (phases.length) return phases;
  return safeArray<string>(template?.phases).map((phase) => textValue(phase)).filter(Boolean);
}

function ensureRoleSlots(input: unknown, template: GenericRecord | null) {
  const slots = normalizeRoleSlotsDetailed(input);
  if (slots.length) return slots;
  return normalizeRoleSlotsDetailed(template?.roles);
}

function buildSessionLogEntry(type: string, text: string, extra: Record<string, unknown> = {}) {
  const normalizedType = textValue(type).toUpperCase();
  return {
    id: textValue(extra.id) || randomId('log'),
    t: new Date().toISOString(),
    type: PHASE_ACTION_TYPES.has(normalizedType) ? normalizedType : 'MANUAL',
    text,
    ...extra,
  };
}

function computeRoleCoverage(roleSlots: Array<Record<string, unknown>>, rsvps: Array<GenericRecord>) {
  const confirmed = rsvps.filter((rsvp) => textValue(rsvp.status).toUpperCase() === 'CONFIRMED');
  return roleSlots.map((slot) => {
    const name = textValue(slot.name);
    const capacity = Math.max(1, Math.round(numberValue(slot.capacity, 1)));
    const filled = confirmed.filter((rsvp) => textValue(rsvp.role) === name).length;
    return {
      id: textValue(slot.id),
      name,
      capacity,
      filled,
      gap: Math.max(0, capacity - filled),
      fill_pct: Math.round((Math.min(filled, capacity) / capacity) * 100),
      role_tag: textValue(slot.role_tag || name).toLowerCase(),
      ship_tags: safeArray<string>(slot.ship_tags || []),
    };
  });
}

function activeThreatsFromLog(sessionLog: Array<GenericRecord>) {
  const resolved = new Set(sessionLog.filter((entry) => textValue(entry.type).toUpperCase() === 'THREAT_RESOLVED').map((entry) => textValue(entry.threat_id || entry.id)));
  return sessionLog
    .filter((entry) => textValue(entry.type).toUpperCase() === 'THREAT' && !resolved.has(textValue(entry.threat_id || entry.id)))
    .map((entry) => ({
      id: textValue(entry.id || entry.threat_id),
      severity: textValue(entry.severity || 'MED').toUpperCase(),
      location: nullableText(entry.location),
      author: nullableText(entry.author),
      text: textValue(entry.text),
      t: safeDate(entry.t),
    }));
}

function summarizeLoot(sessionLog: Array<GenericRecord>) {
  const loot = sessionLog.filter((entry) => textValue(entry.type).toUpperCase() === 'MATERIAL');
  const grouped = new Map<string, { quantity_scu: number; quality_score: number[] }>();
  loot.forEach((entry) => {
    const name = textValue(entry.material_name || 'UNKNOWN');
    const current = grouped.get(name) || { quantity_scu: 0, quality_score: [] };
    current.quantity_scu += numberValue(entry.quantity_scu);
    const qualityScore = numberValue(entry.quality_score) || Math.round(numberValue(entry.quality_pct) * 10);
    if (qualityScore > 0) current.quality_score.push(qualityScore);
    grouped.set(name, current);
  });
  return Array.from(grouped.entries()).map(([material_name, value]) => ({
    material_name,
    quantity_scu: Number(value.quantity_scu.toFixed(1)),
    avg_quality_pct: value.quality_score.length
      ? Math.round((value.quality_score.reduce((sum, score) => sum + score, 0) / value.quality_score.length) / 10)
      : 0,
  }));
}

function buildSupportCard(key: string, label: string, module: string, priority: string, score: number, detail: string, extras: Record<string, unknown> = {}) {
  return {
    key,
    label,
    module,
    priority,
    readiness_score: Math.max(0, Math.min(100, Math.round(score))),
    status: score >= 75 ? 'READY' : score >= 50 ? 'WATCH' : 'BLOCKED',
    detail,
    ...extras,
  };
}

function cardsToReadiness(cards: Array<Record<string, unknown>>) {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[textValue(card.key)] = numberValue(card.readiness_score);
    return acc;
  }, {});
}

function buildRecommendationList(cards: Array<Record<string, unknown>>, roleCoverage: Array<Record<string, unknown>>, op: GenericRecord, fleetSnapshot: Record<string, unknown> | null) {
  const recommendations: string[] = [];
  const roleGaps = roleCoverage.filter((slot) => numberValue(slot.gap) > 0);
  if (roleGaps.length) {
    recommendations.push(`Backfill open roles: ${roleGaps.map((slot) => `${slot.name} (${slot.gap})`).join(', ')}.`);
  }

  cards.filter((card) => numberValue(card.readiness_score) < 60).forEach((card) => {
    recommendations.push(`${textValue(card.label)} requires attention: ${textValue(card.detail)}`);
  });

  if (fleetSnapshot?.scenario && safeArray<GenericRecord>(fleetSnapshot.assignments).length === 0) {
    recommendations.push('Linked fleet scenario has no assignments. Seed ships/builds before launch.');
  }

  if (textValue(op.status).toUpperCase() === 'PUBLISHED') {
    recommendations.push('Use the readiness gate before activation; do not move live until mining, escort, hauling, and fabrication cards are green.');
  }

  return unique(recommendations).slice(0, 6);
}

function generateOperationalSummary(op: GenericRecord, outcome: string, attendance: Array<Record<string, unknown>>, lootSummary: Array<Record<string, unknown>>, blockers: Array<Record<string, unknown>>, splitSummary: Array<Record<string, unknown>>, fleetSnapshot: Record<string, unknown> | null) {
  const crewCount = attendance.filter((member) => textValue(member.status).toUpperCase() === 'CONFIRMED').length;
  const lootValue = lootSummary.reduce((sum, item) => sum + numberValue(item.quantity_scu), 0);
  const topBlockers = blockers.slice(0, 3).map((item) => textValue(item.title || item.label || item.detail)).filter(Boolean);
  const splitTotal = splitSummary.reduce((sum, item) => sum + numberValue(item.amount_aUEC), 0);
  const readinessUnits = safeArray<GenericRecord>(safeRecord(fleetSnapshot?.aggregates).readiness_by_unit);
  const fleetReadiness = readinessUnits.length
    ? Math.round(readinessUnits.reduce((sum, unit) => sum + numberValue(unit.readiness_score), 0) / readinessUnits.length)
    : 0;
  const lines = [
    `${textValue(op.name || 'Operation')} concluded with ${outcome.toLowerCase()} status.`,
    `Confirmed attendance: ${crewCount} crew.`,
    `Operational harvest/logged haul: ${lootValue.toFixed(1)} SCU across ${lootSummary.length} tracked entries.`,
    splitTotal > 0 ? `Tracked split total: ${Math.round(splitTotal).toLocaleString()} aUEC.` : 'No split total was logged during wrap-up.',
    fleetReadiness > 0 ? `Linked fleet readiness at wrap-up averaged ${Math.round(fleetReadiness)}.` : 'No linked fleet readiness snapshot was available.',
  ];
  if (topBlockers.length) {
    lines.push(`Primary blockers: ${topBlockers.join(' · ')}.`);
  } else {
    lines.push('No major blockers were recorded during wrap-up.');
  }
  return lines.join(' ');
}

async function buildSupportSnapshot(base44: Base44Client, op: GenericRecord, fleetSnapshot: Record<string, unknown> | null) {
  const [deposits, materials, craftQueue, refineryOrders, cargoLogs, orgShips, armoryItems] = await Promise.all([
    safeListEntity(base44, 'ScoutDeposit', '-reported_at', 120),
    safeListEntity(base44, 'Material', '-logged_at', 200),
    safeListEntity(base44, 'CraftQueue', '-created_date', 120),
    safeListEntity(base44, 'RefineryOrder', '-started_at', 120),
    safeListEntity(base44, 'CargoLog', '-logged_at', 200),
    safeListEntity(base44, 'OrgShip', '-last_synced', 300),
    safeListEntity(base44, 'ArmoryItem', '-quantity', 200),
  ]);

  const targetSystem = textValue(op.system_name || op.system).toUpperCase();
  const targetLocation = textValue(op.location).toLowerCase();
  const matchingDeposits = deposits.filter((deposit) => textValue(deposit.system_name).toUpperCase() === targetSystem && deposit.is_stale !== true);
  const highQualityDeposits = matchingDeposits.filter((deposit) => numberValue(deposit.quality_score) >= 800);
  const activeMaterials = materials.filter((material) => material.is_archived !== true);
  const t2Materials = activeMaterials.filter((material) => numberValue(material.quality_score) >= 800);
  const activeCraftQueue = craftQueue.filter((item) => !['COMPLETE', 'CANCELLED'].includes(textValue(item.status).toUpperCase()));
  const opCraftQueue = activeCraftQueue.filter((item) => textValue(item.op_id) === textValue(op.id));
  const readyOrders = refineryOrders.filter((order) => textValue(order.status).toUpperCase() === 'READY');
  const activeOrders = refineryOrders.filter((order) => textValue(order.status).toUpperCase() === 'ACTIVE');
  const recentCargo = cargoLogs.filter((entry) => {
    const origin = textValue(entry.origin_station).toLowerCase();
    const destination = textValue(entry.destination_station).toLowerCase();
    return targetLocation
      ? origin.includes(targetLocation) || destination.includes(targetLocation)
      : true;
  }).slice(0, 50);
  const totalCargoVolume = recentCargo.reduce((sum, entry) => sum + numberValue(entry.quantity_scu), 0);
  const availableShips = orgShips.filter((ship) => textValue(ship.status).toUpperCase() === 'AVAILABLE');
  const escortShips = availableShips.filter((ship) => {
    const shipClass = textValue(ship.class || ship.ship_class).toUpperCase();
    return shipClass.includes('FIGHTER') || shipClass === 'COMBAT' || shipClass === 'ESCORT';
  });
  const medicalShips = availableShips.filter((ship) => textValue(ship.class || ship.ship_class).toUpperCase() === 'MEDICAL');
  const lowStockItems = armoryItems.filter((item) => numberValue(item.quantity, 999) <= numberValue(item.min_threshold, 0));

  const fleetReadiness = fleetSnapshot?.aggregates
    ? safeArray<GenericRecord>(safeRecord(fleetSnapshot.aggregates).readiness_by_unit)
    : [];
  const averageFleetReadiness = fleetReadiness.length
    ? Math.round(fleetReadiness.reduce((sum, unit) => sum + numberValue(unit.readiness_score), 0) / fleetReadiness.length)
    : Math.min(100, availableShips.length * 12);
  const fleetAssignments = safeArray<GenericRecord>(fleetSnapshot?.assignments);
  const fleetRoleGaps = fleetAssignments.filter((assignment) => numberValue(assignment.readiness_score) < 60).length;

  const cards = [
    buildSupportCard('scout', 'Scout Intel', 'SCOUT', 'high', matchingDeposits.length ? (highQualityDeposits.length ? 100 : 72) : 35, matchingDeposits.length ? `${matchingDeposits.length} current deposits in ${targetSystem || 'target system'}${highQualityDeposits.length ? ` · ${highQualityDeposits.length} T2+` : ''}.` : 'No fresh scout deposits matched the target system.'),
    buildSupportCard('fleet', 'Fleet Readiness', 'FLEET', 'high', averageFleetReadiness, fleetAssignments.length ? `${fleetAssignments.length} linked assignments${fleetRoleGaps ? ` · ${fleetRoleGaps} below readiness threshold` : ''}.` : `${availableShips.length} ships available across org fleet.`),
    buildSupportCard('fabrication', 'Fabrication', 'INDUSTRY', 'high', opCraftQueue.length ? 92 : activeCraftQueue.length ? 70 : t2Materials.length ? 58 : 32, opCraftQueue.length ? `${opCraftQueue.length} op-linked craft jobs in progress.` : activeCraftQueue.length ? `${activeCraftQueue.length} active craft jobs available to support fabrication.` : 'No active craft queue is feeding the op.'),
    buildSupportCard('cargo', 'Cargo Chain', 'LOGISTICS', 'warn', totalCargoVolume > 100 ? 88 : totalCargoVolume > 30 ? 65 : 40, recentCargo.length ? `${recentCargo.length} recent cargo movements · ${totalCargoVolume.toFixed(1)} SCU.` : 'No recent cargo movements match the target route.'),
    buildSupportCard('refinery', 'Refinery', 'INDUSTRY', 'warn', readyOrders.length ? 90 : activeOrders.length ? 68 : 45, readyOrders.length ? `${readyOrders.length} refinery orders are ready for pickup.` : activeOrders.length ? `${activeOrders.length} refinery orders are still cooking.` : 'No active refinery activity is currently tracked.'),
    buildSupportCard('armory', 'Armory', 'ARMORY', 'warn', lowStockItems.length === 0 ? 92 : lowStockItems.some((item) => numberValue(item.quantity) <= 0) ? 35 : 60, lowStockItems.length === 0 ? 'No low-stock blockers detected in armory inventory.' : `${lowStockItems.length} low-stock armory items require attention.`),
    buildSupportCard('recovery', 'Medical / Recovery', 'FLEET', 'warn', medicalShips.length ? 88 : 55, medicalShips.length ? `${medicalShips.length} recovery-capable ships available.` : 'No dedicated medical/recovery ship is currently available.'),
    buildSupportCard('escort', 'Escort Coverage', 'FLEET', 'high', escortShips.length >= 2 ? 90 : escortShips.length === 1 ? 60 : 30, escortShips.length ? `${escortShips.length} escort-capable ships available.` : 'No escort-capable ship is marked available.'),
  ];

  return {
    cards,
    readiness_by_subsystem: cardsToReadiness(cards),
    industrial_blockers: cards.filter((card) => numberValue(card.readiness_score) < 60),
    totals: {
      matching_deposits: matchingDeposits.length,
      t2_materials: t2Materials.length,
      active_craft_jobs: activeCraftQueue.length,
      ready_refinery_orders: readyOrders.length,
      cargo_volume_scu: Number(totalCargoVolume.toFixed(1)),
      low_stock_items: lowStockItems.length,
    },
  };
}

async function buildAttendance(base44: Base44Client, rsvps: Array<GenericRecord>) {
  if (!rsvps.length) return [];
  const userIds = unique(rsvps.map((rsvp) => textValue(rsvp.user_id)).filter(Boolean));
  const users = await Promise.all(userIds.map((userId) => findEntityById(base44, 'NexusUser', userId)));
  const usersById = new Map(users.filter(Boolean).map((user) => [textValue((user as GenericRecord).id), user as GenericRecord]));
  return rsvps.map((rsvp) => {
    const user = usersById.get(textValue(rsvp.user_id)) || {};
    return {
      user_id: textValue(rsvp.user_id),
      callsign: textValue(rsvp.callsign || user.callsign || user.username),
      role: textValue(rsvp.role),
      ship: nullableText(rsvp.ship),
      status: textValue(rsvp.status).toUpperCase(),
      nexus_rank: textValue(user.nexus_rank).toUpperCase(),
    };
  });
}

export async function buildOpCommandSnapshot(base44: Base44Client, opId: string) {
  const op = await findEntityById(base44, 'Op', opId);
  if (!op) {
    throw new NexusWriteError('op_not_found', 404);
  }

  const [rsvps, cofferLogs] = await Promise.all([
    safeFilterEntity(base44, 'OpRsvp', { op_id: opId }, '-created_date', 400),
    safeFilterEntity(base44, 'CofferLog', { op_id: opId }, '-logged_at', 200),
  ]);

  const template = getOpTemplate(textValue(op.template_key || op.type));
  const roleSlots = ensureRoleSlots(op.role_slots, template);
  const roleCoverage = computeRoleCoverage(roleSlots, rsvps);
  const attendance = await buildAttendance(base44, rsvps);
  const fleetScenarioId = textValue(op.fleet_scenario_id);
  const fleetSnapshot = fleetScenarioId ? await buildFleetPlanningSnapshot(base44, fleetScenarioId) : null;
  const supportSnapshot = await buildSupportSnapshot(base44, op, fleetSnapshot);
  const sessionLog = safeArray<GenericRecord>(op.session_log || []);
  const threats = activeThreatsFromLog(sessionLog);
  const lootSummary = summarizeLoot(sessionLog);
  const splitSummary = cofferLogs
    .filter((entry) => textValue(entry.entry_type).toUpperCase() === 'OP_SPLIT')
    .map((entry) => ({
      id: textValue(entry.id),
      callsign: textValue(entry.logged_by_callsign),
      amount_aUEC: Math.round(numberValue(entry.amount_aUEC)),
      logged_at: safeDate(entry.logged_at),
    }));
  const readinessGate = buildReadinessGateFromTemplate(template, op.readiness_gate);
  const recommendations = buildRecommendationList(supportSnapshot.cards, roleCoverage, op, fleetSnapshot);
  const crewSummary = {
    confirmed: attendance.filter((member) => member.status === 'CONFIRMED').length,
    tentative: attendance.filter((member) => member.status === 'TENTATIVE').length,
    declined: attendance.filter((member) => member.status === 'DECLINED').length,
    role_fill_pct: roleCoverage.length
      ? Math.round(roleCoverage.reduce((sum, slot) => sum + Math.min(numberValue(slot.filled), numberValue(slot.capacity)), 0) / Math.max(1, roleCoverage.reduce((sum, slot) => sum + numberValue(slot.capacity), 0)) * 100)
      : 0,
  };

  return {
    ok: true,
    template,
    op: {
      ...op,
      phases: ensurePhaseList(op.phases, template),
      role_slots: roleSlots,
      readiness_gate: readinessGate,
      support_requirements_json: buildSupportRequirementsFromTemplate(template, op.support_requirements_json),
      linked_units_json: safeArray<GenericRecord>(op.linked_units_json || buildLinkedUnits(fleetSnapshot)),
    },
    attendance,
    rsvps,
    crew_summary: crewSummary,
    role_coverage: roleCoverage,
    support_chain: supportSnapshot,
    fleet_snapshot: fleetSnapshot,
    active_threats: threats,
    loot_summary: lootSummary,
    split_summary: splitSummary,
    session_log: sessionLog,
    command_recommendations: recommendations,
  };
}

function validateTemplatePayload(body: GenericRecord, template: GenericRecord | null, requireSchedule: boolean) {
  const name = textValue(body.name);
  if (!name) {
    throw new NexusWriteError('op_name_required', 400);
  }

  const scheduledAt = safeDate(body.scheduled_at);
  if (requireSchedule && !scheduledAt) {
    throw new NexusWriteError('scheduled_at_required', 400);
  }

  const roleSlots = ensureRoleSlots(body.role_slots, template);
  if (!roleSlots.length || roleSlots.some((slot) => !textValue(slot.name))) {
    throw new NexusWriteError('invalid_role_slots', 400);
  }

  const phases = ensurePhaseList(body.phases, template);
  if (!phases.length) {
    throw new NexusWriteError('invalid_phases', 400);
  }

  return { roleSlots, phases, scheduledAt };
}

export async function handleCreateOp(base44: Base44Client, sessionUser: GenericRecord, body: GenericRecord) {
  validateCommandRank(sessionUser);

  const action = textValue(body.action || 'create').toLowerCase();
  if (action === 'templates') {
    return okResponse({ templates: listOpTemplates(), template_version: OPS_TEMPLATE_VERSION });
  }

  const template = getOpTemplate(textValue(body.template_key));
  if (!template) {
    throw new NexusWriteError('invalid_template_key', 400);
  }

  const requireSchedule = action === 'publish' || parseStatus(body.status || 'DRAFT') === 'PUBLISHED';
  const { roleSlots, phases, scheduledAt } = validateTemplatePayload(body, template, requireSchedule);
  const fleetScenarioId = nullableText(body.fleet_scenario_id);
  const fleetSnapshot = fleetScenarioId ? await buildFleetPlanningSnapshot(base44, fleetScenarioId) : null;
  const linkedUnits = buildLinkedUnits(fleetSnapshot);
  const status = action === 'publish' ? 'PUBLISHED' : parseStatus(body.status || 'DRAFT');
  const readinessGate = buildReadinessGateFromTemplate(template, body.readiness_gate);
  const payload = {
    name: textValue(body.name),
    type: textValue(body.type || template.op_type),
    template_key: textValue(template.key),
    system_name: textValue(body.system_name || safeArray<string>(template.systems)[0] || 'Stanton'),
    system: textValue(body.system_name || safeArray<string>(template.systems)[0] || 'Stanton'),
    location: nullableText(body.location),
    access_type: textValue(body.access_type || 'EXCLUSIVE').toUpperCase(),
    buy_in_cost: Math.max(0, Math.round(numberValue(body.buy_in_cost))),
    scheduled_at: scheduledAt,
    rank_gate: textValue(body.rank_gate || body.min_rank || 'AFFILIATE').toUpperCase(),
    min_rank: textValue(body.rank_gate || body.min_rank || 'AFFILIATE').toUpperCase(),
    role_slots: roleSlots,
    phases,
    phase_current: Math.max(0, Math.round(numberValue(body.phase_current, 0))),
    status,
    created_by_user_id: textValue(body.created_by_user_id || sessionUser.id),
    created_by_callsign: resolveCallsign(sessionUser),
    allow_late_joins: body.allow_late_joins !== false,
    hide_from_non_members: body.hide_from_non_members === true,
    log_loot_tally: body.log_loot_tally !== false,
    calc_split_on_close: body.calc_split_on_close !== false,
    readiness_gate: readinessGate,
    support_requirements_json: buildSupportRequirementsFromTemplate(template, body.support_requirements_json),
    support_snapshot_json: safeArray<GenericRecord>(body.support_snapshot_json || []),
    linked_units_json: linkedUnits,
    fleet_scenario_id: fleetScenarioId,
    wrapup_required: false,
    latest_record_id: nullableText(body.latest_record_id),
    recommended_fleet_json: safeArray<GenericRecord>(template.recommended_fleet),
    session_log: safeArray<GenericRecord>(body.session_log || []),
  };

  if (action === 'update') {
    const opId = textValue(body.op_id);
    if (!opId) {
      throw new NexusWriteError('op_id_required', 400);
    }
    const existing = await findEntityById(base44, 'Op', opId);
    if (!existing) {
      throw new NexusWriteError('op_not_found', 404);
    }
    const updated = await (base44.asServiceRole.entities.Op as any).update(opId, payload);
    return okResponse({ op: updated });
  }

  const created = await (base44.asServiceRole.entities.Op as any).create(payload);

  if (status === 'PUBLISHED') {
    await createNotification(base44, {
      type: 'OP_PUBLISHED',
      title: 'Operation Published',
      body: `${payload.name} is published${payload.system_name ? ` · ${payload.system_name}` : ''}.`,
      severity: 'INFO',
      target_user_id: null,
      source_module: 'OPS',
      source_id: created.id,
    }).catch(() => null);
  }

  return okResponse({ op: created }, 201);
}

export async function handleOpCommandAction(base44: Base44Client, sessionUser: GenericRecord, body: GenericRecord) {
  validateCommandRank(sessionUser);

  const action = textValue(body.action).toLowerCase();
  const opId = textValue(body.op_id);
  if (!opId) {
    throw new NexusWriteError('op_id_required', 400);
  }

  const op = await findEntityById(base44, 'Op', opId);
  if (!op) {
    throw new NexusWriteError('op_not_found', 404);
  }

  const sessionLog = safeArray<GenericRecord>(op.session_log || []);
  const now = new Date().toISOString();
  const notifications: Array<Record<string, unknown>> = [];
  const patch: Record<string, unknown> = {};

  if (action === 'publish') {
    patch.status = 'PUBLISHED';
    notifications.push({
      type: 'OP_PUBLISHED',
      title: 'Operation Published',
      body: `${textValue(op.name)} is published${textValue(op.system_name || op.system) ? ` · ${textValue(op.system_name || op.system)}` : ''}.`,
      severity: 'INFO',
      target_user_id: null,
      source_module: 'OPS',
      source_id: opId,
    });
  } else if (action === 'activate') {
    patch.status = 'LIVE';
    patch.started_at = safeDate(op.started_at) || now;
    sessionLog.push(buildSessionLogEntry('COMMAND', `${resolveCallsign(sessionUser)} activated the operation.`, { author: resolveCallsign(sessionUser) }));
    notifications.push({
      type: 'OP_LIVE',
      title: 'Operation Live',
      body: `${textValue(op.name)} is now live${textValue(op.location) ? ` · ${textValue(op.location)}` : ''}.`,
      severity: 'INFO',
      target_user_id: null,
      source_module: 'OPS',
      source_id: opId,
    });
  } else if (action === 'advance_phase') {
    const phases = ensurePhaseList(op.phases, getOpTemplate(textValue(op.template_key || op.type)));
    const nextPhase = Math.min(phases.length - 1, Math.max(0, Math.round(numberValue(body.phase_current, numberValue(op.phase_current, 0) + 1))));
    patch.phase_current = nextPhase;
    sessionLog.push(buildSessionLogEntry('PHASE_ADVANCE', `${resolveCallsign(sessionUser)} advanced to phase ${nextPhase + 1}${phases[nextPhase] ? ` · ${phases[nextPhase]}` : ''}.`, {
      author: resolveCallsign(sessionUser),
      phase_current: nextPhase,
      phase_label: phases[nextPhase] || null,
    }));
    notifications.push({
      type: 'OP_PHASE_ADVANCE',
      title: 'Operation Phase Advanced',
      body: `${textValue(op.name)} advanced to phase ${nextPhase + 1}${phases[nextPhase] ? ` · ${phases[nextPhase]}` : ''}.`,
      severity: 'INFO',
      target_user_id: null,
      source_module: 'OPS',
      source_id: opId,
    });
  } else if (action === 'append_log') {
    const logText = textValue(body.text);
    if (!logText) {
      throw new NexusWriteError('log_text_required', 400);
    }
    sessionLog.push(buildSessionLogEntry(textValue(body.type || 'MANUAL'), logText, {
      author: resolveCallsign(sessionUser),
      location: nullableText(body.location),
      severity: nullableText(body.severity),
    }));
  } else if (action === 'report_threat') {
    const description = textValue(body.description);
    if (!description) {
      throw new NexusWriteError('threat_description_required', 400);
    }
    const severity = textValue(body.severity || 'MED').toUpperCase();
    const threatId = randomId('threat');
    sessionLog.push(buildSessionLogEntry('THREAT', `[${severity}] ${description}${textValue(body.location) ? ` · ${textValue(body.location)}` : ''}`, {
      id: threatId,
      threat_id: threatId,
      author: resolveCallsign(sessionUser),
      severity,
      location: nullableText(body.location),
    }));
    notifications.push({
      type: 'OP_THREAT',
      title: 'Threat Alert',
      body: `${textValue(op.name)}: [${severity}] ${description}${textValue(body.location) ? ` · ${textValue(body.location)}` : ''}.`,
      severity: severity === 'HIGH' ? 'CRITICAL' : 'WARN',
      target_user_id: null,
      source_module: 'OPS',
      source_id: opId,
    });
  } else if (action === 'resolve_threat') {
    const threatId = textValue(body.threat_id);
    if (!threatId) {
      throw new NexusWriteError('threat_id_required', 400);
    }
    sessionLog.push(buildSessionLogEntry('THREAT_RESOLVED', `${resolveCallsign(sessionUser)} marked a threat resolved.`, {
      threat_id: threatId,
      author: resolveCallsign(sessionUser),
    }));
  } else if (action === 'update_readiness') {
    const incomingGate = safeRecord(body.readiness_gate);
    const currentGate = buildReadinessGateFromTemplate(getOpTemplate(textValue(op.template_key || op.type)), op.readiness_gate);
    let nextGate = currentGate;

    if (incomingGate.items) {
      nextGate = buildReadinessGateFromTemplate(getOpTemplate(textValue(op.template_key || op.type)), incomingGate);
    } else {
      const itemId = textValue(body.item_id);
      if (!itemId) {
        throw new NexusWriteError('item_id_required', 400);
      }
      nextGate = {
        ...currentGate,
        items: safeArray<GenericRecord>(currentGate.items).map((item) => (
          textValue(item.id) === itemId
            ? {
                ...item,
                done: body.done === undefined ? !Boolean(item.done) : body.done === true,
                assignee: nullableText(body.assignee || item.assignee),
              }
            : item
        )),
      };
      nextGate.completion_pct = safeArray<GenericRecord>(nextGate.items).length
        ? Math.round((safeArray<GenericRecord>(nextGate.items).filter((item) => item.done === true).length / safeArray<GenericRecord>(nextGate.items).length) * 100)
        : 0;
    }

    patch.readiness_gate = nextGate;
  } else if (action === 'end_op') {
    patch.status = 'COMPLETE';
    patch.ended_at = now;
    patch.wrapup_required = true;
    sessionLog.push(buildSessionLogEntry('WRAP_UP', `${resolveCallsign(sessionUser)} ended the operation. Wrap-up required.`, {
      author: resolveCallsign(sessionUser),
    }));
    notifications.push({
      type: 'OP_COMPLETE',
      title: 'Operation Complete',
      body: `${textValue(op.name)} has ended and now requires wrap-up.`,
      severity: 'INFO',
      target_user_id: null,
      source_module: 'OPS',
      source_id: opId,
    });
  } else {
    throw new NexusWriteError('invalid_action', 400);
  }

  if (sessionLog.length) {
    patch.session_log = sessionLog;
  }

  const updated = await (base44.asServiceRole.entities.Op as any).update(opId, patch);
  await Promise.allSettled(notifications.map((notification) => createNotification(base44, notification)));
  const snapshot = await buildOpCommandSnapshot(base44, opId);
  return okResponse({ op: updated, snapshot });
}

export async function handleFinalizeOpRecord(base44: Base44Client, sessionUser: GenericRecord, body: GenericRecord) {
  validateCommandRank(sessionUser);

  const opId = textValue(body.op_id);
  if (!opId) {
    throw new NexusWriteError('op_id_required', 400);
  }

  const op = await findEntityById(base44, 'Op', opId);
  if (!op) {
    throw new NexusWriteError('op_not_found', 404);
  }

  const outcome = textValue(body.outcome || 'SUCCESS').toUpperCase();
  if (!WRAP_UP_OUTCOMES.has(outcome)) {
    throw new NexusWriteError('invalid_outcome', 400);
  }

  const snapshot = await buildOpCommandSnapshot(base44, opId);
  const attendance = safeArray<GenericRecord>(snapshot.attendance);
  const lootSummary = safeArray<GenericRecord>(body.loot_summary_json || snapshot.loot_summary);
  const splitSummary = safeArray<GenericRecord>(body.split_summary_json || snapshot.split_summary);
  const blockers = safeArray<GenericRecord>(body.blocker_summary_json || safeRecord(snapshot.support_chain).industrial_blockers);
  const startedAt = safeDate(body.started_at || op.started_at);
  const endedAt = safeDate(body.ended_at || op.ended_at || new Date().toISOString());
  const durationMinutes = startedAt && endedAt
    ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000))
    : Math.round(numberValue(body.duration_minutes, 0));
  const completedPhases = ensurePhaseList(op.phases, getOpTemplate(textValue(op.template_key || op.type))).slice(0, Math.max(1, Math.round(numberValue(op.phase_current, 0)) + 1));
  const debriefText = textValue(body.debrief_text);
  const generatedSummary = debriefText || generateOperationalSummary(op, outcome, attendance, lootSummary, blockers, splitSummary, safeRecord(snapshot.fleet_snapshot));

  const recordPayload = {
    op_id: opId,
    template_key: textValue(op.template_key || op.type),
    outcome,
    started_at: startedAt,
    ended_at: endedAt,
    duration_minutes: durationMinutes,
    completed_phases_json: completedPhases,
    attendance_json: attendance,
    ship_losses_json: safeArray<GenericRecord>(body.ship_losses_json || []),
    loot_summary_json: lootSummary,
    split_summary_json: splitSummary,
    blocker_summary_json: blockers,
    debrief_text: nullableText(body.debrief_text),
    generated_summary: generatedSummary,
    created_by_user_id: textValue(sessionUser.id),
  };

  const created = await (base44.asServiceRole.entities.OpRecord as any).create(recordPayload);
  const updatedOp = await (base44.asServiceRole.entities.Op as any).update(opId, {
    status: 'ARCHIVED',
    wrapup_required: false,
    latest_record_id: created.id,
    ended_at: endedAt,
    wrap_up_report: generatedSummary,
    support_snapshot_json: safeRecord(snapshot.support_chain).cards || [],
  });

  await createNotification(base44, {
    type: 'OP_ARCHIVED',
    title: 'Operation Archived',
    body: `${textValue(op.name)} was archived with outcome ${outcome}.`,
    severity: 'INFO',
    target_user_id: null,
    source_module: 'OPS',
    source_id: opId,
  }).catch(() => null);

  return okResponse({ record: created, op: updatedOp });
}

export { okResponse, errorResponse, requireSessionUser };
