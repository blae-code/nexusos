let idCounter = 1;
function genId() { return `dev-${Date.now()}-${idCounter++}`; }

const stores = new Map();
const listeners = new Map();

function getStore(entityType) {
  if (!stores.has(entityType)) stores.set(entityType, new Map());
  return stores.get(entityType);
}

function emit(entityType, event) {
  (listeners.get(entityType) || []).forEach(fn => fn(event));
}

export const mockStore = {
  getAll(entityType) {
    return Array.from(getStore(entityType).values());
  },
  get(entityType, id) {
    return getStore(entityType).get(id) || null;
  },
  create(entityType, data) {
    const record = { id: genId(), created_date: new Date().toISOString(), ...data };
    getStore(entityType).set(record.id, record);
    emit(entityType, { type: 'create', record });
    return record;
  },
  update(entityType, id, data) {
    const store = getStore(entityType);
    const existing = store.get(id);
    if (!existing) throw new Error(`[DEV] ${entityType}:${id} not found`);
    const updated = { ...existing, ...data };
    store.set(id, updated);
    emit(entityType, { type: 'update', record: updated });
    return updated;
  },
  delete(entityType, id) {
    getStore(entityType).delete(id);
    emit(entityType, { type: 'delete', id });
  },
  seed(entityType, records) {
    const store = getStore(entityType);
    records.forEach(r => store.set(r.id, { created_date: new Date().toISOString(), ...r }));
  },
  subscribe(entityType, callback) {
    if (!listeners.has(entityType)) listeners.set(entityType, []);
    const fns = listeners.get(entityType);
    fns.push(callback);
    return () => {
      const idx = fns.indexOf(callback);
      if (idx >= 0) fns.splice(idx, 1);
    };
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotStores() {
  return Array.from(stores.entries()).reduce((acc, [entityType, store]) => {
    acc[entityType] = Array.from(store.values()).map(record => clone(record));
    return acc;
  }, {});
}

// ── Seed data ──────────────────────────────────────────────────────

mockStore.seed('NexusUser', [
  { id: 'u-pioneer',   callsign: 'COMMODORE_BLAE', rank: 'PIONEER',   nexus_rank: 'PIONEER',   discord_id: 'dev-pioneer-001',   joined_at: '2025-01-01T00:00:00Z', last_seen_at: new Date(Date.now() - 300000).toISOString(),  discord_roles: ['Leadership', 'Mining Ops', 'Fleet Cmd'], onboarding_complete: true, wallet_balance: 4850000, full_name: 'Commodore Blae' },
  { id: 'u-founder',   callsign: 'DEV_FOUNDER',    rank: 'FOUNDER',   nexus_rank: 'FOUNDER',   discord_id: 'dev-founder-001',   joined_at: '2025-01-10T00:00:00Z', last_seen_at: new Date(Date.now() - 7200000).toISOString(),  discord_roles: ['Founding Member', 'Scout Lead'], onboarding_complete: true, wallet_balance: 2310000, full_name: 'Founder Demo' },
  { id: 'u-scout',     callsign: 'DEV_SCOUT',      rank: 'SCOUT',     nexus_rank: 'SCOUT',     discord_id: 'dev-scout-001',     joined_at: '2025-02-01T00:00:00Z', last_seen_at: new Date(Date.now() - 1800000).toISOString(),  discord_roles: ['Scout', 'Miner'], onboarding_complete: true, wallet_balance: 1275000, full_name: 'Scout Demo' },
  { id: 'u-voyager',   callsign: 'DEV_VOYAGER',    rank: 'VOYAGER',   nexus_rank: 'VOYAGER',   discord_id: 'dev-voyager-001',   joined_at: '2025-02-15T00:00:00Z', last_seen_at: new Date(Date.now() - 86400000).toISOString(), discord_roles: ['Escort', 'Gunner'], onboarding_complete: true, wallet_balance: 860000, full_name: 'Voyager Demo' },
  { id: 'u-vagrant',   callsign: 'DEV_VAGRANT',    rank: 'VAGRANT',   nexus_rank: 'VAGRANT',   discord_id: 'dev-vagrant-001',   joined_at: '2025-03-01T00:00:00Z', last_seen_at: new Date(Date.now() - 172800000).toISOString(), discord_roles: ['New Recruit'], onboarding_complete: true, wallet_balance: 320000, full_name: 'Vagrant Demo' },
  { id: 'u-affiliate', callsign: 'DEV_AFFILIATE',  rank: 'AFFILIATE', nexus_rank: 'AFFILIATE', discord_id: 'dev-affiliate-001', joined_at: '2025-03-10T00:00:00Z', last_seen_at: new Date(Date.now() - 604800000).toISOString(), discord_roles: ['Ally'], onboarding_complete: true, wallet_balance: 540000, full_name: 'Affiliate Demo' },
]);

mockStore.seed('ArmoryItem', [
  { id: 'arm-1', name: 'P4-AR Assault Rifle',      item_name: 'P4-AR Assault Rifle',      category: 'FPS',        quantity: 6,  total_quantity: 8,  condition: 'GOOD',      notes: '', location: 'Storage', rarity: 'COMMON', last_restocked_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'arm-2', name: 'P8-SC SMG',                item_name: 'P8-SC SMG',                category: 'FPS',        quantity: 4,  total_quantity: 4,  condition: 'EXCELLENT', notes: '', location: 'Storage', rarity: 'COMMON', last_restocked_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'arm-3', name: 'FS-9 LMG',                 item_name: 'FS-9 LMG',                 category: 'FPS',        quantity: 2,  total_quantity: 2,  condition: 'FAIR',      notes: 'Needs service after next op', location: 'Storage', rarity: 'RARE', last_restocked_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 'arm-4', name: 'Salvo Frag Grenade',       item_name: 'Salvo Frag Grenade',       category: 'CONSUMABLE', quantity: 24, total_quantity: 30, condition: 'GOOD',      notes: '', location: 'Storage', rarity: 'COMMON', last_restocked_at: new Date(Date.now() - 21600000).toISOString() },
  { id: 'arm-5', name: 'Medpen (Grade B)',         item_name: 'Medpen (Grade B)',         category: 'CONSUMABLE', quantity: 18, total_quantity: 20, condition: 'GOOD',      notes: '', location: 'Storage', rarity: 'COMMON', last_restocked_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'arm-6', name: 'S2 Laser Cannon (fixed)',  item_name: 'S2 Laser Cannon (fixed)',  category: 'SHIP',       quantity: 2,  total_quantity: 2,  condition: 'GOOD',      notes: 'Prospector wing mounts', location: 'RSI Prospector Alpha', rarity: 'RARE', last_restocked_at: new Date(Date.now() - 432000000).toISOString() },
  { id: 'arm-7', name: 'CF-007 Bulldog Repeater',  item_name: 'CF-007 Bulldog Repeater',  category: 'SHIP',       quantity: 3,  total_quantity: 3,  condition: 'EXCELLENT', notes: '', location: 'Drake Cutlass Red', rarity: 'UNCOMMON', last_restocked_at: new Date(Date.now() - 345600000).toISOString() },
]);

mockStore.seed('Op', [
  {
    id: 'op-live',
    name: 'DEEP CORE RUN: YELA',
    type: 'MINING',
    status: 'LIVE',
    created_by: 'dev-pioneer-001',
    created_by_callsign: 'COMMODORE_BLAE',
    phase_current: 1,
    phases: [
      { name: 'TRANSIT',  instructions: 'Form up at Crusader. Fly to Yela belt sector 7. Hold tight formation.' },
      { name: 'MINING',   instructions: 'Establish mining pattern. Escorts hold outer perimeter. Ping on contact.' },
      { name: 'HAUL',     instructions: 'Haulers load and run to Orison. Escorts fly cover on extraction route.' },
      { name: 'WRAP',     instructions: 'Return to base. Log loot. Run split calc. Stand down.' },
    ],
    role_slots: [
      { name: 'Mining',        capacity: 3 },
      { name: 'Escort',        capacity: 2 },
      { name: 'Hauler',        capacity: 2 },
      { name: 'Refinery Coord', capacity: 1 },
    ],
    notes: 'Live mining op. All crew confirmed. Escorts on high alert — UEE patrol detected.',
    max_crew: 8,
    voice_channel: 'NEXUSOS OPS',
    discord_message_id: 'discord-mock-live-001',
    started_at: new Date(Date.now() - 5400000).toISOString(),
    ended_at: null,
    created_date: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'op-1',
    name: 'ROCKBREAKER ALPHA',
    type: 'MINING',
    status: 'DRAFT',
    created_by: 'dev-pioneer-001',
    created_by_callsign: 'COMMODORE_BLAE',
    phase_current: 0,
    phases: [
      { name: 'TRANSIT',  instructions: 'Form up at Crusader. Fly to Yela belt sector 7.' },
      { name: 'MINING',   instructions: 'Establish mining pattern. Escorts hold outer perimeter.' },
      { name: 'HAUL',     instructions: 'Haulers load and run to Orison. Escorts escort.' },
      { name: 'WRAP',     instructions: 'Return to base. Log loot. Run split calc.' },
    ],
    role_slots: [
      { name: 'Mining',        capacity: 3 },
      { name: 'Escort',        capacity: 2 },
      { name: 'Hauler',        capacity: 2 },
      { name: 'Refinery Coord', capacity: 1 },
    ],
    notes: 'Weekend rockbreaker. Prospectors preferred for mining slots.',
    max_crew: 8,
    voice_channel: 'NEXUSOS OPS',
    discord_message_id: null,
    started_at: null,
    ended_at: null,
    scheduled_at: new Date(Date.now() + 172800000).toISOString(),
    created_date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'op-2',
    name: 'ESCORT RUN: ORISON–CRUSADER',
    type: 'ESCORT',
    status: 'COMPLETE',
    created_by: 'dev-scout-001',
    created_by_callsign: 'DEV_SCOUT',
    phase_current: 3,
    phases: [
      { name: 'BRIEF',   instructions: 'Meet at Orison pad 3.' },
      { name: 'TRANSIT', instructions: 'Fly escort pattern to Crusader.' },
      { name: 'WRAP',    instructions: 'Debrief and log credits.' },
    ],
    role_slots: [
      { name: 'Escort', capacity: 2 },
      { name: 'Hauler', capacity: 1 },
    ],
    notes: '',
    max_crew: 3,
    voice_channel: 'NEXUSOS OPS',
    discord_message_id: 'discord-mock-456',
    started_at: '2025-03-10T18:00:00Z',
    ended_at: '2025-03-10T20:30:00Z',
    scheduled_at: '2025-03-10T17:00:00Z',
    created_date: '2025-03-10T16:00:00Z',
    _rsvp_count: 3,
  },
]);

mockStore.seed('OpRsvp', [
  // Live op crew
  { id: 'rsvp-live-1', op_id: 'op-live', discord_id: 'dev-pioneer-001', callsign: 'COMMODORE_BLAE', role: 'Refinery Coord', ship: 'RAFT',       status: 'CONFIRMED' },
  { id: 'rsvp-live-2', op_id: 'op-live', discord_id: 'dev-scout-001',   callsign: 'DEV_SCOUT',      role: 'Mining',        ship: 'Prospector', status: 'CONFIRMED' },
  { id: 'rsvp-live-3', op_id: 'op-live', discord_id: 'dev-voyager-001', callsign: 'DEV_VOYAGER',    role: 'Escort',        ship: 'Gladius',    status: 'CONFIRMED' },
  // Upcoming draft op crew
  { id: 'rsvp-1', op_id: 'op-1', discord_id: 'dev-pioneer-001', callsign: 'COMMODORE_BLAE', role: 'Refinery Coord', ship: 'RAFT',       status: 'CONFIRMED' },
  { id: 'rsvp-2', op_id: 'op-1', discord_id: 'dev-scout-001',   callsign: 'DEV_SCOUT',      role: 'Mining',        ship: 'Prospector', status: 'CONFIRMED' },
  { id: 'rsvp-3', op_id: 'op-1', discord_id: 'dev-voyager-001', callsign: 'DEV_VOYAGER',    role: 'Escort',        ship: 'Gladius',    status: 'CONFIRMED' },
]);

mockStore.seed('Material', [
  { id: 'mat-1', name: 'Agricium',   material_name: 'Agricium',   unit: 'SCU', alert_threshold: 100, current_stock: 242, target_stock: 500, source: 'Mining', quantity_scu: 242, quality_pct: 78, material_type: 'RAW', location: 'Warehouse Alpha', logged_at: new Date(Date.now() - 21600000).toISOString() },
  { id: 'mat-2', name: 'Titanium',   material_name: 'Titanium',   unit: 'SCU', alert_threshold: 50,  current_stock: 38,  target_stock: 200, source: 'Mining', quantity_scu: 38,  quality_pct: 69, material_type: 'RAW', location: 'Warehouse Alpha', logged_at: new Date(Date.now() - 28800000).toISOString() },
  { id: 'mat-3', name: 'Quantanium', material_name: 'Quantanium', unit: 'SCU', alert_threshold: 20,  current_stock: 84,  target_stock: 100, source: 'Mining', quantity_scu: 84,  quality_pct: 87, material_type: 'RAW', location: 'Refinery Bay',    logged_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'mat-4', name: 'Laranite',   material_name: 'Laranite',   unit: 'SCU', alert_threshold: 30,  current_stock: 67,  target_stock: 150, source: 'Mining', quantity_scu: 67,  quality_pct: 74, material_type: 'RAW', location: 'Warehouse Beta',  logged_at: new Date(Date.now() - 36000000).toISOString() },
  { id: 'mat-5', name: 'Diamond',    material_name: 'Diamond',    unit: 'SCU', alert_threshold: 10,  current_stock: 5,   target_stock: 50,  source: 'Mining', quantity_scu: 5,   quality_pct: 92, material_type: 'RAW', location: 'Warehouse Beta',  logged_at: new Date(Date.now() - 5400000).toISOString() },
]);

mockStore.seed('CofferEntry', [
  { id: 'cf-1', description: 'Ore sale — Yela run',       amount: 48000,  type: 'INCOME',  logged_by: 'COMMODORE_BLAE', date: '2025-03-10T00:00:00Z' },
  { id: 'cf-2', description: 'Ship repair — escort op',   amount: -4200,  type: 'EXPENSE', logged_by: 'DEV_SCOUT',       date: '2025-03-10T00:00:00Z' },
  { id: 'cf-3', description: 'Quantanium sale — Orison',  amount: 126000, type: 'INCOME',  logged_by: 'COMMODORE_BLAE', date: '2025-03-12T00:00:00Z' },
]);

mockStore.seed('ScoutDeposit', [
  { id: 'sd-1', system_name: 'Stanton', location_detail: 'Yela Belt – Sector 7',      material_name: 'Quantanium', quality_pct: 87, reported_by: 'DEV_SCOUT',   reported_at: '2025-03-14T10:00:00Z', status: 'ACTIVE', risk_level: 'LOW',  notes: 'Rich vein, confirmed 2025-03-14' },
  { id: 'sd-2', system_name: 'Stanton', location_detail: 'Aberdeen Cave Network C',   material_name: 'Titanium',   quality_pct: 74, reported_by: 'DEV_VOYAGER', reported_at: '2025-03-15T08:00:00Z', status: 'ACTIVE', risk_level: 'MED',  notes: '' },
  { id: 'sd-3', system_name: 'Stanton', location_detail: 'Cellin Surface – Grid 4N',  material_name: 'Laranite',   quality_pct: 91, reported_by: 'DEV_SCOUT',   reported_at: '2025-03-15T14:30:00Z', status: 'ACTIVE', risk_level: 'LOW',  notes: 'Surface deposit, easy access. Verify before committing Prospectors.' },
  { id: 'sd-4', system_name: 'Stanton', location_detail: 'Daymar Subsurface Pocket',  material_name: 'Agricium',   quality_pct: 62, reported_by: 'DEV_FOUNDER', reported_at: '2025-03-13T09:00:00Z', status: 'STALE',  risk_level: 'HIGH', notes: 'Re-verify needed — patrol activity reported nearby.' },
  { id: 'sd-5', system_name: 'Pyro',    location_detail: 'Pyro I Debris Field East',  material_name: 'Quantanium', quality_pct: 95, reported_by: 'DEV_PIONEER', reported_at: '2025-03-16T07:00:00Z', status: 'ACTIVE', risk_level: 'HIGH', notes: 'Exceptional quality but deep in hostile space. Escort required.' },
]);

mockStore.seed('Blueprint', [
  { id: 'bp-1', item_name: 'Devastator Shotgun', category: 'WEAPON',     tier: 'T2', is_priority: true,  owned_by: null,        owned_by_callsign: null,             ingredients: [{ name: 'Titanium', qty: 12 }, { name: 'Diamond', qty: 4 }], recipe_materials: [{ material_name: 'Titanium', quantity_scu: 12 }, { material_name: 'Diamond', quantity_scu: 4 }] },
  { id: 'bp-2', item_name: 'Invictus Helmet',    category: 'ARMOR',      tier: 'T2', is_priority: true,  owned_by: 'u-pioneer', owned_by_callsign: 'COMMODORE_BLAE', ingredients: [{ name: 'Titanium', qty: 8 }, { name: 'Agricium', qty: 6 }], recipe_materials: [{ material_name: 'Titanium', quantity_scu: 8 }, { material_name: 'Agricium', quantity_scu: 6 }] },
  { id: 'bp-3', item_name: 'FS-9 LMG',           category: 'WEAPON',     tier: 'T1', is_priority: false, owned_by: 'u-founder', owned_by_callsign: 'DEV_FOUNDER',    ingredients: [{ name: 'Titanium', qty: 6 }, { name: 'Laranite', qty: 2 }], recipe_materials: [{ material_name: 'Titanium', quantity_scu: 6 }, { material_name: 'Laranite', quantity_scu: 2 }] },
  { id: 'bp-4', item_name: 'Medpen Grade B',     category: 'CONSUMABLE', tier: 'T1', is_priority: false, owned_by: null,        owned_by_callsign: null,             ingredients: [{ name: 'Agricium', qty: 3 }], recipe_materials: [{ material_name: 'Agricium', quantity_scu: 3 }] },
  { id: 'bp-5', item_name: 'Shield Module Mk2',  category: 'COMPONENT',  tier: 'T2', is_priority: true,  owned_by: null,        owned_by_callsign: null,             ingredients: [{ name: 'Quantanium', qty: 5 }, { name: 'Laranite', qty: 8 }], recipe_materials: [{ material_name: 'Quantanium', quantity_scu: 5 }, { material_name: 'Laranite', quantity_scu: 8 }] },
]);

mockStore.seed('RefineryOrder', [
  { id: 'ro-1', material: 'Quantanium', material_name: 'Quantanium', quantity_raw: 48,  quantity_scu: 48,  method: 'CORMACK',  status: 'READY',      started_at: '2025-03-14T12:00:00Z', ready_at: '2025-03-14T18:00:00Z', completes_at: '2025-03-14T18:00:00Z', yield_pct: 82, cost_aUEC: 9800, logged_by: 'COMMODORE_BLAE' },
  { id: 'ro-2', material: 'Titanium',   material_name: 'Titanium',   quantity_raw: 120, quantity_scu: 120, method: 'DINYX',    status: 'PROCESSING', started_at: '2025-03-15T08:00:00Z', ready_at: new Date(Date.now() + 7200000).toISOString(),  completes_at: new Date(Date.now() + 7200000).toISOString(), yield_pct: 71, cost_aUEC: 12400, logged_by: 'DEV_SCOUT' },
  { id: 'ro-3', material: 'Laranite',   material_name: 'Laranite',   quantity_raw: 32,  quantity_scu: 32,  method: 'ELECTROX', status: 'PROCESSING', started_at: '2025-03-16T06:00:00Z', ready_at: new Date(Date.now() + 14400000).toISOString(), completes_at: new Date(Date.now() + 14400000).toISOString(), yield_pct: 88, cost_aUEC: 7600, logged_by: 'DEV_PIONEER' },
]);

mockStore.seed('CraftQueue', [
  { id: 'cq-1', item_name: 'Devastator Shotgun', blueprint_id: 'bp-1', status: 'IN_PROGRESS', priority: 1, claimed_by: 'COMMODORE_BLAE', claimed_at: new Date(Date.now() - 3600000).toISOString(), notes: 'Priority for next op' },
  { id: 'cq-2', item_name: 'Shield Module Mk2',  blueprint_id: 'bp-5', status: 'OPEN',        priority: 2, claimed_by: null,             claimed_at: null,                                          notes: '' },
]);

mockStore.seed('RescueCall', []);

mockStore.seed('CofferLog', [
  { id: 'cl-1', entry_type: 'SALE',        amount_aUEC: 48000,  logged_at: '2025-03-10T00:00:00Z', note: 'Ore sale - Yela run',      logged_by_callsign: 'COMMODORE_BLAE' },
  { id: 'cl-2', entry_type: 'EXPENSE',     amount_aUEC: 4200,   logged_at: '2025-03-10T04:00:00Z', note: 'Ship repair - escort op', logged_by_callsign: 'DEV_SCOUT' },
  { id: 'cl-3', entry_type: 'CRAFT_SALE',  amount_aUEC: 126000, logged_at: '2025-03-12T00:00:00Z', note: 'Quantanium sale - Orison', logged_by_callsign: 'COMMODORE_BLAE' },
]);

mockStore.seed('OrgShip', [
  { id: 'ship-1', name: 'Prospector Alpha',  model: 'MISC Prospector', class: 'MINER',          status: 'AVAILABLE',   assigned_to_callsign: 'DEV_SCOUT',      cargo_scu: 32, crew_size: 1, last_synced: new Date(Date.now() - 1800000).toISOString() },
  { id: 'ship-2', name: 'Cutlass Red',       model: 'Drake Cutlass Red', class: 'MEDICAL',      status: 'ASSIGNED',    assigned_to_callsign: 'DEV_VOYAGER',    cargo_scu: 12, crew_size: 2, last_synced: new Date(Date.now() - 1800000).toISOString() },
  { id: 'ship-3', name: 'RAFT Logistics',    model: 'ARGO RAFT', class: 'HAULER',                status: 'AVAILABLE',   assigned_to_callsign: 'COMMODORE_BLAE', cargo_scu: 96, crew_size: 2, last_synced: new Date(Date.now() - 1800000).toISOString() },
  { id: 'ship-4', name: 'Gladius Screen',    model: 'Aegis Gladius', class: 'FIGHTER',           status: 'MAINTENANCE', assigned_to_callsign: '',               cargo_scu: 0,  crew_size: 1, last_synced: new Date(Date.now() - 1800000).toISOString() },
]);

mockStore.seed('ArmoryCheckout', [
  { id: 'checkout-1', item_id: 'arm-1', item_name: 'P4-AR Assault Rifle', checked_out_to: 'DEV_SCOUT', checked_out_at: new Date(Date.now() - 7200000).toISOString(), quantity: 1, status: 'ACTIVE' },
]);

mockStore.seed('CargoLog', [
  { id: 'cargo-1', commodity_name: 'Quantanium', quantity_scu: 18, origin: 'Yela Belt', destination: 'ARC-L1', created_date: new Date(Date.now() - 10800000).toISOString() },
]);

mockStore.seed('FleetBuild', [
  { id: 'fb-1', name: 'Prospector Escort Wing', vessel_id: 'ship-1', role: 'Mining', owner_callsign: 'COMMODORE_BLAE', created_date: new Date(Date.now() - 86400000).toISOString() },
]);

mockStore.seed('PatchDigest', [
  { id: 'pd-1', title: '4.7.0 live refinery tuning', branch: 'LIVE', created_date: new Date(Date.now() - 43200000).toISOString() },
  { id: 'pd-2', title: '4.7.1 PTU cargo balance pass', branch: 'PTU', created_date: new Date(Date.now() - 21600000).toISOString() },
]);

mockStore.seed('game_cache_items', [
  { id: 'item-1', name: 'Devastator Shotgun', category: 'WEAPON', rarity: 'T2' },
  { id: 'item-2', name: 'Invictus Helmet', category: 'ARMOR', rarity: 'T2' },
  { id: 'item-3', name: 'Shield Module Mk2', category: 'COMPONENT', rarity: 'T2' },
]);

mockStore.seed('game_cache_commodities', [
  { id: 'comm-1', name: 'Agricium', buy_price: 27, sell_price: 33, unit: 'SCU' },
  { id: 'comm-2', name: 'Titanium', buy_price: 18, sell_price: 24, unit: 'SCU' },
  { id: 'comm-3', name: 'Quantanium', buy_price: 86, sell_price: 112, unit: 'SCU' },
]);

mockStore.seed('GameCacheCommodity', [
  { id: 'gcc-1', commodity_name: 'Agricium', commodity_code: 'AGR', unit: 'SCU', baseline_price: 33 },
  { id: 'gcc-2', commodity_name: 'Titanium', commodity_code: 'TIT', unit: 'SCU', baseline_price: 24 },
  { id: 'gcc-3', commodity_name: 'Quantanium', commodity_code: 'QTN', unit: 'SCU', baseline_price: 112 },
]);

mockStore.seed('GameCacheVehicle', [
  { id: 'gcv-1', name: 'MISC Prospector', cargo: { max: 32 }, crew: { min: 1, max: 1 }, role: 'Mining' },
  { id: 'gcv-2', name: 'ARGO RAFT', cargo: { max: 96 }, crew: { min: 1, max: 2 }, role: 'Hauling' },
  { id: 'gcv-3', name: 'Aegis Gladius', cargo: { max: 0 }, crew: { min: 1, max: 1 }, role: 'Escort' },
]);

const INITIAL_MOCK_STATE = snapshotStores();

export function getInitialMockState() {
  return clone(INITIAL_MOCK_STATE);
}

export function getCurrentMockState() {
  return clone(snapshotStores());
}
