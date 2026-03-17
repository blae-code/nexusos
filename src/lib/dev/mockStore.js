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

// ── Seed data ──────────────────────────────────────────────────────

mockStore.seed('NexusUser', [
  { id: 'u-pioneer',   callsign: 'COMMODORE_BLAE', rank: 'PIONEER',   discord_id: 'dev-pioneer-001',   key_revoked: false, joined_at: '2025-01-01T00:00:00Z' },
  { id: 'u-founder',   callsign: 'DEV_FOUNDER',    rank: 'FOUNDER',    discord_id: 'dev-founder-001',   key_revoked: false, joined_at: '2025-01-10T00:00:00Z' },
  { id: 'u-scout',     callsign: 'DEV_SCOUT',      rank: 'SCOUT',      discord_id: 'dev-scout-001',     key_revoked: false, joined_at: '2025-02-01T00:00:00Z' },
  { id: 'u-voyager',   callsign: 'DEV_VOYAGER',    rank: 'VOYAGER',    discord_id: 'dev-voyager-001',   key_revoked: false, joined_at: '2025-02-15T00:00:00Z' },
  { id: 'u-vagrant',   callsign: 'DEV_VAGRANT',    rank: 'VAGRANT',    discord_id: 'dev-vagrant-001',   key_revoked: false, joined_at: '2025-03-01T00:00:00Z' },
  { id: 'u-affiliate', callsign: 'DEV_AFFILIATE',  rank: 'AFFILIATE',  discord_id: 'dev-affiliate-001', key_revoked: false, joined_at: '2025-03-10T00:00:00Z' },
]);

mockStore.seed('ArmoryItem', [
  { id: 'arm-1', name: 'P4-AR Assault Rifle',      category: 'FPS',         quantity: 6, total_quantity: 8,  condition: 'GOOD',      notes: '' },
  { id: 'arm-2', name: 'P8-SC SMG',                category: 'FPS',         quantity: 4, total_quantity: 4,  condition: 'EXCELLENT', notes: '' },
  { id: 'arm-3', name: 'FS-9 LMG',                 category: 'FPS',         quantity: 2, total_quantity: 2,  condition: 'FAIR',      notes: 'Needs service after next op' },
  { id: 'arm-4', name: 'Salvo Frag Grenade',        category: 'CONSUMABLE',  quantity: 24, total_quantity: 30, condition: 'GOOD',     notes: '' },
  { id: 'arm-5', name: 'Medpen (Grade B)',          category: 'CONSUMABLE',  quantity: 18, total_quantity: 20, condition: 'GOOD',     notes: '' },
  { id: 'arm-6', name: 'S2 Laser Cannon (fixed)',  category: 'SHIP',        quantity: 2, total_quantity: 2,  condition: 'GOOD',      notes: 'Prospector wing mounts' },
  { id: 'arm-7', name: 'CF-007 Bulldog Repeater',  category: 'SHIP',        quantity: 3, total_quantity: 3,  condition: 'EXCELLENT', notes: '' },
]);

mockStore.seed('Op', [
  {
    id: 'op-1',
    title: 'ROCKBREAKER ALPHA',
    type: 'ROCKBREAKER',
    status: 'DRAFT',
    created_by: 'dev-pioneer-001',
    created_by_callsign: 'COMMODORE_BLAE',
    phase: 0,
    phases: [
      { name: 'TRANSIT',  instructions: 'Form up at Crusader. Fly to Yela belt sector 7.' },
      { name: 'MINING',   instructions: 'Establish mining pattern. Escorts hold outer perimeter.' },
      { name: 'HAUL',     instructions: 'Haulers load and run to Orison. Escorts escort.' },
      { name: 'WRAP',     instructions: 'Return to base. Log loot. Run split calc.' },
    ],
    roles: [
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
    created_date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'op-2',
    title: 'ESCORT RUN: ORISON–CRUSADER',
    type: 'ESCORT',
    status: 'COMPLETE',
    created_by: 'dev-scout-001',
    created_by_callsign: 'DEV_SCOUT',
    phase: 3,
    phases: [
      { name: 'BRIEF',   instructions: 'Meet at Orison pad 3.' },
      { name: 'TRANSIT', instructions: 'Fly escort pattern to Crusader.' },
      { name: 'WRAP',    instructions: 'Debrief and log credits.' },
    ],
    roles: [
      { name: 'Escort', capacity: 2 },
      { name: 'Hauler', capacity: 1 },
    ],
    notes: '',
    max_crew: 3,
    voice_channel: 'NEXUSOS OPS',
    discord_message_id: 'discord-mock-456',
    started_at: '2025-03-10T18:00:00Z',
    ended_at: '2025-03-10T20:30:00Z',
    created_date: '2025-03-10T16:00:00Z',
  },
]);

mockStore.seed('OpRsvp', [
  { id: 'rsvp-1', op_id: 'op-1', discord_id: 'dev-pioneer-001', callsign: 'COMMODORE_BLAE', role: 'Refinery Coord', ship: 'RAFT', status: 'YES' },
  { id: 'rsvp-2', op_id: 'op-1', discord_id: 'dev-scout-001',   callsign: 'DEV_SCOUT',       role: 'Mining',        ship: 'Prospector', status: 'YES' },
  { id: 'rsvp-3', op_id: 'op-1', discord_id: 'dev-voyager-001', callsign: 'DEV_VOYAGER',     role: 'Escort',        ship: 'Gladius',    status: 'YES' },
]);

mockStore.seed('Material', [
  { id: 'mat-1', name: 'Agricium',    unit: 'SCU', alert_threshold: 100, current_stock: 242, target_stock: 500, source: 'Mining' },
  { id: 'mat-2', name: 'Titanium',    unit: 'SCU', alert_threshold: 50,  current_stock: 38,  target_stock: 200, source: 'Mining' },
  { id: 'mat-3', name: 'Quantanium',  unit: 'SCU', alert_threshold: 20,  current_stock: 84,  target_stock: 100, source: 'Mining' },
  { id: 'mat-4', name: 'Laranite',    unit: 'SCU', alert_threshold: 30,  current_stock: 67,  target_stock: 150, source: 'Mining' },
  { id: 'mat-5', name: 'Diamond',     unit: 'SCU', alert_threshold: 10,  current_stock: 5,   target_stock: 50,  source: 'Mining' },
]);

mockStore.seed('CofferEntry', [
  { id: 'cf-1', description: 'Ore sale — Yela run',       amount: 48000,  type: 'INCOME',  logged_by: 'COMMODORE_BLAE', date: '2025-03-10T00:00:00Z' },
  { id: 'cf-2', description: 'Ship repair — escort op',   amount: -4200,  type: 'EXPENSE', logged_by: 'DEV_SCOUT',       date: '2025-03-10T00:00:00Z' },
  { id: 'cf-3', description: 'Quantanium sale — Orison',  amount: 126000, type: 'INCOME',  logged_by: 'COMMODORE_BLAE', date: '2025-03-12T00:00:00Z' },
]);

mockStore.seed('ScoutDeposit', [
  { id: 'sd-1', system: 'Stanton', location: 'Yela Belt – Sector 7', deposit_type: 'Quantanium', quantity_est: 'HIGH', notes: 'Rich vein, confirmed 2025-03-14', reported_by: 'DEV_SCOUT', status: 'ACTIVE', created_date: '2025-03-14T10:00:00Z' },
  { id: 'sd-2', system: 'Stanton', location: 'Aberdeen Cave Network C', deposit_type: 'Titanium', quantity_est: 'MEDIUM', notes: '', reported_by: 'DEV_VOYAGER', status: 'ACTIVE', created_date: '2025-03-15T08:00:00Z' },
]);

mockStore.seed('RescueCall', []);
