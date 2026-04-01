export const SC_REFERENCE_PATCH = '4.7.0';

export const REFERENCE_SOURCE = Object.freeze({
  LIVE_CACHE: 'LIVE_CACHE',
  PATCH_REGISTRY: 'PATCH_REGISTRY',
  ENTITY_RELATION: 'ENTITY_RELATION',
  LOCAL_ENUM: 'LOCAL_ENUM',
});

/**
 * @typedef {{
 *   value: string,
 *   label: string,
 *   group?: string,
 *   source: string,
 *   patch?: string | null,
 *   deprecated?: boolean,
 *   replacement?: string | null,
 *   searchTokens?: string[],
 *   meta?: Record<string, unknown>,
 * }} ReferenceOption
 */

/**
 * @typedef {{
 *   fieldId: string,
 *   surface: string,
 *   domain: string,
 *   sourceKind: string,
 *   patchSensitive: boolean,
 *   searchable: boolean,
 *   status: 'migrated' | 'planned' | 'backlog',
 *   migrationPriority: 'P0' | 'P1' | 'P2',
 *   legacyRisk: 'low' | 'medium' | 'high',
 *   legacyCount: number,
 * }} FieldAuditEntry
 */

function enumLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildOption(value, label, group, source, meta = {}, extra = {}) {
  return {
    value,
    label,
    group,
    source,
    patch: SC_REFERENCE_PATCH,
    deprecated: false,
    replacement: null,
    searchTokens: [],
    meta,
    ...extra,
  };
}

export const SYSTEM_REGISTRY = [
  buildOption('STANTON', 'Stanton', 'Systems', REFERENCE_SOURCE.PATCH_REGISTRY, {
    token: 'ST',
    theme: 'tactical',
    detail: 'Civilized trade and industry core',
  }),
  buildOption('PYRO', 'Pyro', 'Systems', REFERENCE_SOURCE.PATCH_REGISTRY, {
    token: 'PY',
    theme: 'tactical',
    detail: 'Lawless frontier with active piracy pressure',
  }),
  buildOption('NYX', 'Nyx', 'Systems', REFERENCE_SOURCE.PATCH_REGISTRY, {
    token: 'NX',
    theme: 'tactical',
    detail: 'Sparse frontier staging system',
  }),
];

export const LOCATION_REGISTRY = [
  buildOption('Area 18', 'Area 18', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Landing Zone', token: 'A18' }),
  buildOption('Lorville', 'Lorville', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Landing Zone', token: 'LV' }),
  buildOption('Orison', 'Orison', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Landing Zone', token: 'OR' }),
  buildOption('New Babbage', 'New Babbage', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Landing Zone', token: 'NB' }),
  buildOption('Seraphim Station', 'Seraphim Station', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Orbital Station', token: 'SS' }),
  buildOption('Everus Harbor', 'Everus Harbor', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Orbital Station', token: 'EH' }),
  buildOption('Baijini Point', 'Baijini Point', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Orbital Station', token: 'BP' }),
  buildOption('Port Tressler', 'Port Tressler', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Orbital Station', token: 'PT' }),
  buildOption('CRU-L1', 'CRU-L1', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'C1' }),
  buildOption('CRU-L4', 'CRU-L4', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'C4' }),
  buildOption('CRU-L5', 'CRU-L5', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'C5' }),
  buildOption('ARC-L1', 'ARC-L1', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'A1' }),
  buildOption('ARC-L5', 'ARC-L5', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'A5' }),
  buildOption('HUR-L1', 'HUR-L1', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'H1' }),
  buildOption('HUR-L2', 'HUR-L2', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'H2' }),
  buildOption('HUR-L3', 'HUR-L3', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'H3' }),
  buildOption('HUR-L4', 'HUR-L4', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'H4' }),
  buildOption('HUR-L5', 'HUR-L5', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'H5' }),
  buildOption('MIC-L1', 'MIC-L1', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'M1' }),
  buildOption('MIC-L2', 'MIC-L2', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Lagrange Station', token: 'M2' }),
  buildOption('Cellin', 'Cellin', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'CE' }),
  buildOption('Daymar', 'Daymar', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'DY' }),
  buildOption('Yela', 'Yela', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'YE' }),
  buildOption('Aberdeen', 'Aberdeen', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'AB' }),
  buildOption('Arial', 'Arial', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'AR' }),
  buildOption('Ita', 'Ita', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'IT' }),
  buildOption('Magda', 'Magda', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'MG' }),
  buildOption('Lyria', 'Lyria', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'LY' }),
  buildOption('Wala', 'Wala', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'WA' }),
  buildOption('Clio', 'Clio', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'CL' }),
  buildOption('Calliope', 'Calliope', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'CA' }),
  buildOption('Euterpe', 'Euterpe', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Moon', token: 'EU' }),
  buildOption('Aaron Halo', 'Aaron Halo', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Belt', token: 'AH' }),
  buildOption('Yela Belt', 'Yela Belt', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Belt', token: 'YB' }),
  buildOption('Jumptown', 'Jumptown', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Outpost', token: 'JT' }),
  buildOption('Brio\'s Breaker Yard', 'Brio\'s Breaker Yard', 'Stanton', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'STANTON', kind: 'Scrapyard', token: 'BBY' }),
  buildOption('Pyro Gateway', 'Pyro Gateway', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Gateway', token: 'PG' }),
  buildOption('Ruin Station', 'Ruin Station', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Station', token: 'RS' }),
  buildOption('Checkmate Station', 'Checkmate Station', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Station', token: 'CM' }),
  buildOption('Orbituary', 'Orbituary', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Station', token: 'OB' }),
  buildOption('Rat\'s Nest', 'Rat\'s Nest', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Station', token: 'RN' }),
  buildOption('Patch City', 'Patch City', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Settlement', token: 'PC' }),
  buildOption('Stanton-Pyro Jump Point', 'Stanton-Pyro Jump Point', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Jump Point', token: 'SPJ' }),
  buildOption('Pyro I', 'Pyro I', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P1' }),
  buildOption('Pyro II', 'Pyro II', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P2' }),
  buildOption('Pyro III', 'Pyro III', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P3' }),
  buildOption('Pyro IV', 'Pyro IV', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P4' }),
  buildOption('Pyro V', 'Pyro V', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P5' }),
  buildOption('Pyro VI', 'Pyro VI', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Planet', token: 'P6' }),
  buildOption('Terminus', 'Terminus', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Moon', token: 'TM' }),
  buildOption('Ignis', 'Ignis', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Moon', token: 'IG' }),
  buildOption('Vatra', 'Vatra', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Moon', token: 'VT' }),
  buildOption('Adir', 'Adir', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Moon', token: 'AD' }),
  buildOption('Fairo', 'Fairo', 'Pyro', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'PYRO', kind: 'Moon', token: 'FR' }),
  buildOption('Levski', 'Levski', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Landing Zone', token: 'LVK' }),
  buildOption('Delamar', 'Delamar', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Planetoid', token: 'DL' }),
  buildOption('Nyx I', 'Nyx I', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Planet', token: 'N1' }),
  buildOption('Nyx II', 'Nyx II', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Planet', token: 'N2' }),
  buildOption('Nyx-Pyro Jump Point', 'Nyx-Pyro Jump Point', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Jump Point', token: 'NPJ' }),
  buildOption('Nyx-Stanton Jump Point', 'Nyx-Stanton Jump Point', 'Nyx', REFERENCE_SOURCE.PATCH_REGISTRY, { system: 'NYX', kind: 'Jump Point', token: 'NSJ' }),
];

export const FACTION_REGISTRY = [
  buildOption('BHG', 'Bounty Hunters Guild', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON', 'PYRO'], token: 'BHG' }),
  buildOption('HURSTON', 'Hurston Dynamics', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON'], token: 'HD' }),
  buildOption('ARCCORP', 'ArcCorp', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON'], token: 'AC' }),
  buildOption('CRUSADER', 'Crusader Industries', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON'], token: 'CI' }),
  buildOption('MICROTECH', 'microTech', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON'], token: 'MT' }),
  buildOption('NINE_TAILS', 'Nine Tails', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON', 'PYRO'], token: '9T' }),
  buildOption('XENOTHREAT', 'XenoThreat', 'Factions', REFERENCE_SOURCE.PATCH_REGISTRY, { systems: ['STANTON'], token: 'XT' }),
];

export const OP_TYPE_REGISTRY = [
  'ROCKBREAKER',
  'MINING',
  'SALVAGE',
  'CARGO',
  'PATROL',
  'COMBAT',
  'ESCORT',
  'RESCUE',
  'RECON',
  'S17',
].map((value) => buildOption(value, enumLabel(value), 'Operation Types', REFERENCE_SOURCE.PATCH_REGISTRY, {
  token: value.slice(0, 3),
}));

export const MISSION_TYPE_REGISTRY = [
  'PERSONAL_BOUNTY',
  'CRIMINAL_BOUNTY',
  'HIGH_VALUE',
  'DELIVERY',
  'INVESTIGATION',
  'PATROL',
  'PROTECT',
  'SABOTAGE',
  'SIEGE_ORISON',
  'CONTRABAND_RUN',
  'EVENT_DEFENSE',
  'EVENT_ASSAULT',
  'DEPOSIT_SURVEY',
  'ROUTE_CLEARANCE',
  'DISTRESS',
  'EVAC',
].map((value) => buildOption(value, enumLabel(value), 'Mission Types', REFERENCE_SOURCE.PATCH_REGISTRY));

function buildEnumOptions(values, group, meta = {}) {
  return values.map((value) => buildOption(value, enumLabel(value), group, REFERENCE_SOURCE.LOCAL_ENUM, meta));
}

export const LOCAL_REFERENCE_ENUMS = {
  'risk-levels': [
    buildOption('LOW', 'Low', 'Risk Levels', REFERENCE_SOURCE.LOCAL_ENUM, { tone: 'safe', token: 'L' }),
    buildOption('MEDIUM', 'Medium', 'Risk Levels', REFERENCE_SOURCE.LOCAL_ENUM, { tone: 'warn', token: 'M' }),
    buildOption('HIGH', 'High', 'Risk Levels', REFERENCE_SOURCE.LOCAL_ENUM, { tone: 'danger', token: 'H' }),
    buildOption('EXTREME', 'Extreme', 'Risk Levels', REFERENCE_SOURCE.LOCAL_ENUM, { tone: 'danger', token: 'X' }),
  ],
  'asset-types': [
    buildOption('SHIP', 'Ship', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'vehicle' }),
    buildOption('VEHICLE', 'Ground Vehicle', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'vehicle' }),
    buildOption('FPS_WEAPON', 'FPS Weapon', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'equipment' }),
    buildOption('FPS_ARMOR', 'FPS Armor', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'equipment' }),
    buildOption('SHIP_COMPONENT', 'Ship Component', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'component' }),
    buildOption('EQUIPMENT', 'Equipment', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'equipment' }),
    buildOption('OTHER', 'Other', 'Asset Types', REFERENCE_SOURCE.LOCAL_ENUM, { family: 'general' }),
  ],
  'asset-statuses': buildEnumOptions(['ACTIVE', 'STORED', 'DEPLOYED', 'MAINTENANCE', 'DAMAGED', 'DESTROYED', 'LOANED', 'MISSING'], 'Asset Status'),
  'asset-conditions': buildEnumOptions(['PRISTINE', 'GOOD', 'FAIR', 'DAMAGED', 'WRECKED'], 'Asset Condition'),
  'asset-sources': buildEnumOptions(['PURCHASED', 'CRAFTED', 'LOOTED', 'DONATED', 'OP_REWARD', 'SALVAGED', 'OTHER'], 'Asset Sources'),
  'trade-order-categories': buildEnumOptions(['FPS_WEAPON', 'FPS_ARMOR', 'SHIP_COMPONENT', 'MATERIAL', 'COMMODITY', 'BLUEPRINT', 'CURRENCY', 'OTHER'], 'Trade Categories'),
  'trade-order-conditions': buildEnumOptions(['PRISTINE', 'GOOD', 'DAMAGED', 'ANY'], 'Trade Conditions'),
};

export const LEGACY_ALIASES = {
  locations: {
    'PORT OLISAR': 'Seraphim Station',
  },
};

/** @type {FieldAuditEntry[]} */
export const SC_FIELD_AUDIT_REGISTRY = [
  { fieldId: 'ops.mission_create.type', surface: 'Ops', domain: 'op-types', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'ops.mission_create.system', surface: 'Ops', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'ops.mission_create.location', surface: 'Ops', domain: 'locations', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'ops.rescue.system', surface: 'Ops', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'ops.rescue.location', surface: 'Ops', domain: 'locations', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'scout.deposit_log.system', surface: 'Scout', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'scout.deposit_log.location', surface: 'Scout', domain: 'locations', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'scout.mining.origin_station', surface: 'Scout', domain: 'stations', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'scout.mining.system_filter', surface: 'Scout', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'scout.mining.max_risk', surface: 'Scout', domain: 'risk-levels', sourceKind: REFERENCE_SOURCE.LOCAL_ENUM, patchSensitive: false, searchable: false, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'assets.register.asset_type', surface: 'Assets', domain: 'asset-types', sourceKind: REFERENCE_SOURCE.LOCAL_ENUM, patchSensitive: false, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'assets.register.asset_name', surface: 'Assets', domain: 'asset-names', sourceKind: REFERENCE_SOURCE.LIVE_CACHE, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'assets.register.manufacturer', surface: 'Assets', domain: 'manufacturers', sourceKind: REFERENCE_SOURCE.LIVE_CACHE, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'assets.register.location_system', surface: 'Assets', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'assets.register.location_detail', surface: 'Assets', domain: 'locations', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'assets.register.linked_ship_id', surface: 'Assets', domain: 'org-ships', sourceKind: REFERENCE_SOURCE.ENTITY_RELATION, patchSensitive: false, searchable: true, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'commerce.trade_board.item_name', surface: 'Commerce', domain: 'tradeable-items', sourceKind: REFERENCE_SOURCE.LIVE_CACHE, patchSensitive: true, searchable: true, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'high', legacyCount: 0 },
  { fieldId: 'commerce.trade_board.category', surface: 'Commerce', domain: 'trade-order-categories', sourceKind: REFERENCE_SOURCE.LOCAL_ENUM, patchSensitive: false, searchable: false, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'commerce.trade_board.condition', surface: 'Commerce', domain: 'trade-order-conditions', sourceKind: REFERENCE_SOURCE.LOCAL_ENUM, patchSensitive: false, searchable: false, status: 'migrated', migrationPriority: 'P1', legacyRisk: 'low', legacyCount: 0 },
  { fieldId: 'commerce.trade_board.system_location', surface: 'Commerce', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'migrated', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'ops.op_creator.system', surface: 'Ops', domain: 'systems', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: false, status: 'planned', migrationPriority: 'P0', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'ops.rep_grind.faction', surface: 'Ops', domain: 'factions', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'ops.rep_grind.mission_type', surface: 'Ops', domain: 'mission-types', sourceKind: REFERENCE_SOURCE.PATCH_REGISTRY, patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'medium', legacyCount: 0 },
  { fieldId: 'industry.blueprint.material', surface: 'Industry', domain: 'tradeable-items', sourceKind: REFERENCE_SOURCE.LIVE_CACHE, patchSensitive: true, searchable: true, status: 'planned', migrationPriority: 'P1', legacyRisk: 'high', legacyCount: 0 },
];

export function normalizeReferenceValue(value) {
  return String(value || '').trim();
}

export function normalizeReferenceToken(value) {
  return normalizeReferenceValue(value).toUpperCase();
}

export function dedupeReferenceOptions(options) {
  const map = new Map();
  for (const option of Array.isArray(options) ? options : []) {
    const key = normalizeReferenceToken(option?.value || option?.label);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, option);
      continue;
    }

    const current = map.get(key);
    if (current.deprecated && !option.deprecated) {
      map.set(key, option);
      continue;
    }

    if (current.source !== REFERENCE_SOURCE.LIVE_CACHE && option.source === REFERENCE_SOURCE.LIVE_CACHE) {
      map.set(key, option);
    }
  }
  return [...map.values()];
}

export function mergeReferenceOptions(...lists) {
  return dedupeReferenceOptions(lists.flat().filter(Boolean)).sort((left, right) => {
    const groupCompare = String(left.group || '').localeCompare(String(right.group || ''));
    if (groupCompare !== 0) return groupCompare;
    return String(left.label || '').localeCompare(String(right.label || ''));
  });
}

export function resolveLegacyReplacement(domain, value) {
  const aliases = LEGACY_ALIASES[domain];
  if (!aliases) return null;
  return aliases[normalizeReferenceToken(value)] || null;
}

export function preserveLegacyReferenceOptions(options, values, domain) {
  const knownValues = new Set(options.map((option) => normalizeReferenceToken(option.value)));
  const additions = [];

  for (const rawValue of Array.isArray(values) ? values : [values]) {
    const value = normalizeReferenceValue(rawValue);
    if (!value) continue;
    const key = normalizeReferenceToken(value);
    if (knownValues.has(key)) continue;

    additions.push({
      value,
      label: value,
      group: 'Deprecated',
      source: REFERENCE_SOURCE.PATCH_REGISTRY,
      patch: SC_REFERENCE_PATCH,
      deprecated: true,
      replacement: resolveLegacyReplacement(domain, value),
      searchTokens: [value],
      meta: { kind: 'Legacy Value', token: 'OLD' },
    });
  }

  return mergeReferenceOptions(options, additions);
}

export function summarizeFieldAudit(fields = SC_FIELD_AUDIT_REGISTRY) {
  const summary = {
    total: fields.length,
    migrated: 0,
    planned: 0,
    backlog: 0,
    legacyCount: 0,
  };

  fields.forEach((field) => {
    summary[field.status] += 1;
    summary.legacyCount += Number(field.legacyCount || 0);
  });

  return summary;
}
