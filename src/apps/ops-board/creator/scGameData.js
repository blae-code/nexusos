/**
 * scGameData — Star Citizen faction, mission, and blueprint reference data.
 * Used by OpPlanningStep for REP_GRIND and BLUEPRINT_GRIND op types.
 * Data reflects Stanton / Pyro / Nyx as of current live patch.
 */

// ─── Rep tier thresholds ─────────────────────────────────────────────────────

export const REP_TIERS = [
  { id: 'HOSTILE',    label: 'Hostile',    threshold: -2500, color: '#C0392B' },
  { id: 'UNFRIENDLY', label: 'Unfriendly', threshold: 0,     color: '#E04848' },
  { id: 'NEUTRAL',    label: 'Neutral',    threshold: 2500,  color: '#9A9488' },
  { id: 'TRUSTED',    label: 'Trusted',    threshold: 8000,  color: '#C8A84B' },
  { id: 'ASSOCIATE',  label: 'Associate',  threshold: 25000, color: '#7AAECC' },
  { id: 'ALLY',       label: 'Ally',       threshold: 75000, color: '#4A8C5C' },
  { id: 'CHAMPION',   label: 'Champion',   threshold: null,  color: '#DDE1F0' },
];

// Returns estimated missions to reach targetTier from currentRep using avgRepPerMission
export function estimateMissions(currentRep, targetTierId, avgRepPerMission = 300) {
  const tier = REP_TIERS.find(t => t.id === targetTierId);
  if (!tier || tier.threshold === null) return null;
  const gap = Math.max(0, tier.threshold - currentRep);
  return gap > 0 ? Math.ceil(gap / avgRepPerMission) : 0;
}

// ─── Factions ────────────────────────────────────────────────────────────────

export const SC_FACTIONS = [
  {
    id: 'BHG',
    name: 'Bounty Hunters Guild',
    shortName: 'BHG',
    color: '#C8A84B',
    systems: ['STANTON', 'PYRO'],
    primaryLocations: ['Port Tressler', 'Baijini Point', 'HUR-L1', 'ARC-L1', 'CRU-L1', 'MIC-L1', 'Ruin Station'],
    missionTypes: [
      { id: 'PERSONAL_BOUNTY',  label: 'Personal Bounty',    avgRep: 150,  avgAuec: 8000,  difficulty: 'EASY',   crew: 1 },
      { id: 'CRIMINAL_BOUNTY',  label: 'Criminal Bounty',    avgRep: 350,  avgAuec: 22000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'HIGH_VALUE',       label: 'High-Value Target',  avgRep: 800,  avgAuec: 60000, difficulty: 'HARD',   crew: 3 },
      { id: 'ASSASSINATION',    label: 'Assassination',       avgRep: 600,  avgAuec: 45000, difficulty: 'HARD',   crew: 2 },
      { id: 'ELIMINATE_GROUP',  label: 'Eliminate Group',     avgRep: 450,  avgAuec: 30000, difficulty: 'MEDIUM', crew: 3 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'Priority bounty contracts' },
      { tier: 'ASSOCIATE', unlock: 'High-value target access · BHG armour discount' },
      { tier: 'ALLY',      unlock: 'Spec-ops contracts · Blueprint store access' },
      { tier: 'CHAMPION',  unlock: 'Top-tier HVTs · Exclusive loadout BPs' },
    ],
    blueprintRewards: ['P4-AR Receiver BP', 'FS-9 LMG BP', 'BHG Sentinel Armour BP'],
    notes: 'Best overall rep grind. Criminal bounties give the highest rep/hr for a 2-ship crew. HVTs require combat-capable escort.',
  },
  {
    id: 'HURSTON',
    name: 'Hurston Dynamics',
    shortName: 'Hurston',
    color: '#8B6914',
    systems: ['STANTON'],
    primaryLocations: ['Lorville', 'HUR-L1', 'HUR-L2', 'HUR-L3', 'HDMS-Edmond', 'HDMS-Stanhope', 'Aberdeen', 'Magda'],
    missionTypes: [
      { id: 'DELIVERY',     label: 'Cargo Delivery',   avgRep: 120,  avgAuec: 6000,  difficulty: 'EASY',   crew: 1 },
      { id: 'INVESTIGATION',label: 'Investigation',     avgRep: 280,  avgAuec: 15000, difficulty: 'MEDIUM', crew: 1 },
      { id: 'ELIMINATE',    label: 'Eliminate Threats', avgRep: 350,  avgAuec: 20000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'PROTECT',      label: 'Asset Protection',  avgRep: 300,  avgAuec: 18000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'DATA_RECOVERY',label: 'Data Recovery',     avgRep: 250,  avgAuec: 12000, difficulty: 'EASY',   crew: 1 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'Lorville shop discounts' },
      { tier: 'ASSOCIATE', unlock: 'Industrial component access · HDMS contracts' },
      { tier: 'ALLY',      unlock: 'Hurston weapon BPs · Heavy armour store access' },
      { tier: 'CHAMPION',  unlock: 'Experimental HD component BPs' },
    ],
    blueprintRewards: ['Devastator Shotgun BP', 'Hurston Worker Armour BP', 'HD Industrial Tool BP'],
    notes: 'Good for mixed cargo + combat crews. Investigation missions chain into eliminate objectives. Base around Lorville.',
  },
  {
    id: 'ARCCORP',
    name: 'ArcCorp',
    shortName: 'ArcCorp',
    color: '#5B8FB9',
    systems: ['STANTON'],
    primaryLocations: ['Area 18', 'ARC-L1', 'ARC-L5', 'Lyria', 'Wala'],
    missionTypes: [
      { id: 'DELIVERY',      label: 'Corporate Delivery', avgRep: 130,  avgAuec: 7000,  difficulty: 'EASY',   crew: 1 },
      { id: 'PROTECT',       label: 'Asset Protection',   avgRep: 310,  avgAuec: 19000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'INVESTIGATION', label: 'Investigation',       avgRep: 260,  avgAuec: 14000, difficulty: 'MEDIUM', crew: 1 },
      { id: 'SABOTAGE',      label: 'Counter-Sabotage',   avgRep: 400,  avgAuec: 25000, difficulty: 'HARD',   crew: 2 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'Area 18 corporate shop access' },
      { tier: 'ASSOCIATE', unlock: 'Energy weapon component discounts' },
      { tier: 'ALLY',      unlock: 'ArcCorp Shield Generator BPs' },
      { tier: 'CHAMPION',  unlock: 'Prototype energy weapon BPs' },
    ],
    blueprintRewards: ['Omnisky VI Laser BP', 'Porrón Mk II Shield BP', 'ArcCorp Flight Suit BP'],
    notes: 'Solid for energy weapon unlocks. Area 18 is the central hub. Sabotage missions pay best but need a coordinated crew.',
  },
  {
    id: 'CRUSADER',
    name: 'Crusader Industries',
    shortName: 'Crusader',
    color: '#7AAECC',
    systems: ['STANTON'],
    primaryLocations: ['Orison', 'CRU-L1', 'CRU-L5', 'Cellin', 'Daymar', 'Yela'],
    missionTypes: [
      { id: 'DELIVERY',      label: 'Cargo Delivery',     avgRep: 130,  avgAuec: 7000,  difficulty: 'EASY',   crew: 1 },
      { id: 'PATROL',        label: 'Security Patrol',    avgRep: 270,  avgAuec: 16000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'ELIMINATE',     label: 'Threat Elimination', avgRep: 320,  avgAuec: 18000, difficulty: 'MEDIUM', crew: 2 },
      { id: 'SIEGE_ORISON',  label: 'Siege of Orison',    avgRep: 900,  avgAuec: 80000, difficulty: 'VERY_HARD', crew: 6 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'Orison shop discounts' },
      { tier: 'ASSOCIATE', unlock: 'Crusader ship component access' },
      { tier: 'ALLY',      unlock: 'C2/M2 ground crew role access · Siege participation' },
      { tier: 'CHAMPION',  unlock: 'Exclusive Crusader ship component BPs' },
    ],
    blueprintRewards: ['Siege of Orison Armour BP', 'MaxOx NN-14 Cannon BP', 'Crusader C-788 BP'],
    notes: 'Siege of Orison gives exceptional rep per session. Needs 4+ combat crew. Delivery missions for solo or small group warm-up.',
  },
  {
    id: 'MICROTECH',
    name: 'microTech',
    shortName: 'mTech',
    color: '#9DA1CD',
    systems: ['STANTON'],
    primaryLocations: ['New Babbage', 'MIC-L1', 'MIC-L2', 'Clio', 'Calliope', 'Euterpe'],
    missionTypes: [
      { id: 'DELIVERY',      label: 'Tech Delivery',      avgRep: 140,  avgAuec: 8000,  difficulty: 'EASY',   crew: 1 },
      { id: 'INVESTIGATION', label: 'System Investigation',avgRep: 300,  avgAuec: 16000, difficulty: 'MEDIUM', crew: 1 },
      { id: 'DATA_RUNNING',  label: 'Data Running',        avgRep: 220,  avgAuec: 11000, difficulty: 'EASY',   crew: 1 },
      { id: 'PROTECT',       label: 'Infrastructure Guard',avgRep: 330,  avgAuec: 20000, difficulty: 'MEDIUM', crew: 2 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'New Babbage tech store access' },
      { tier: 'ASSOCIATE', unlock: 'Quantum drive component discounts' },
      { tier: 'ALLY',      unlock: 'mTech quantum drive BPs · Cooler BPs' },
      { tier: 'CHAMPION',  unlock: 'Prototype mTech quantum drive BPs' },
    ],
    blueprintRewards: ['Siren QD BP', 'JOKER Sano Cooler BP', 'mTech Pilot Suit BP'],
    notes: 'Best for QD and cooler blueprints. New Babbage is the hub. Data running missions are quick solo grinds.',
  },
  {
    id: 'NINE_TAILS',
    name: 'Nine Tails',
    shortName: '9T',
    color: '#9B59B6',
    systems: ['STANTON', 'PYRO'],
    primaryLocations: ['Yela Belt', 'Jumptown', 'Pyro II', 'Pyro III', 'Ruin Station'],
    missionTypes: [
      { id: 'CONTRABAND_RUN', label: 'Contraband Run',     avgRep: 400,  avgAuec: 30000, difficulty: 'HIGH_RISK', crew: 2 },
      { id: 'DRUG_MFGR',     label: 'Drug Manufacturing',  avgRep: 550,  avgAuec: 45000, difficulty: 'HIGH_RISK', crew: 2 },
      { id: 'AMBUSH',        label: 'Ambush Contract',      avgRep: 480,  avgAuec: 35000, difficulty: 'HIGH_RISK', crew: 3 },
      { id: 'THEFT',         label: 'Cargo Theft',          avgRep: 350,  avgAuec: 25000, difficulty: 'HIGH_RISK', crew: 2 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'Nine Tails contraband market access' },
      { tier: 'ASSOCIATE', unlock: 'Jumptown manufacturing access' },
      { tier: 'ALLY',      unlock: 'Outlaw weapon and armour BPs' },
      { tier: 'CHAMPION',  unlock: 'Exclusive Nine Tails heavy weapon BPs' },
    ],
    blueprintRewards: ['Custodian SMG BP', 'Nine Tails Armour BP', 'Drug Lab Stim BP'],
    notes: 'High risk, high reward. Jumptown is contested — bring combat escort. Wanted rating is unavoidable. Pyro offers safer grinding locations.',
    warning: 'Outlaw faction — criminality rating applies. Crimestat unavoidable.',
  },
  {
    id: 'XENOTHREAT',
    name: 'XenoThreat',
    shortName: 'XT',
    color: '#E04848',
    systems: ['STANTON'],
    primaryLocations: ['Pyro Gateway', 'CRU-L4', 'Stanton-Pyro Jump Point'],
    missionTypes: [
      { id: 'EVENT_DEFENSE',  label: 'Idriss Defense',      avgRep: 1200, avgAuec: 95000, difficulty: 'VERY_HARD', crew: 8 },
      { id: 'EVENT_ASSAULT',  label: 'XenoThreat Assault',  avgRep: 900,  avgAuec: 70000, difficulty: 'VERY_HARD', crew: 6 },
    ],
    repUnlocks: [
      { tier: 'TRUSTED',   unlock: 'XenoThreat event access' },
      { tier: 'ASSOCIATE', unlock: 'Event armour rewards · Fleet coordination roles' },
      { tier: 'ALLY',      unlock: 'XenoThreat exclusive weapon BPs' },
    ],
    blueprintRewards: ['XenoThreat Armour BP', 'Event-issue Rifle BP'],
    notes: 'Event-only. Exceptional rep/hr when active. Needs 6+ crew and capital/multi-crew ships. Check patch notes for event schedule.',
    eventOnly: true,
  },
];

// ─── Blueprint catalogue ──────────────────────────────────────────────────────

export const BLUEPRINT_CATEGORIES = [
  { id: 'SHIP_WEAPON',    label: 'Ship Weapons' },
  { id: 'PERSONAL_WEAPON',label: 'Personal Weapons' },
  { id: 'ARMOR',          label: 'Armour' },
  { id: 'SHIP_COMPONENT', label: 'Ship Components' },
  { id: 'CONSUMABLE',     label: 'Consumables' },
];

export const ACQUISITION_METHODS = [
  { id: 'MISSION_REWARD', label: 'Mission Reward', color: '#C8A84B' },
  { id: 'LOOT_DROP',      label: 'Loot Drop',      color: '#7AAECC' },
  { id: 'FACTION_STORE',  label: 'Faction Store',  color: '#4A8C5C' },
  { id: 'EVENT_ONLY',     label: 'Event Only',     color: '#9B59B6' },
  { id: 'CARGO_BUY',      label: 'Cargo Buy',      color: '#9A9488' },
];

export const SC_BLUEPRINTS = [
  // ── Ship Weapons ────────────────────────────────────────────────────────────
  {
    id: 'CF117_BADGER',    category: 'SHIP_WEAPON',     name: 'CF-117 Badger Repeater',
    subcategory: 'Ballistic Repeater', size: 2,
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Bunkers', 'NPC Wrecks', 'HDMS Outposts'],
    rarity: 'COMMON',
    notes: 'Common drop from bunker enemies and salvage. Good starting S2 ballistic.',
  },
  {
    id: 'CF227_BADGER',    category: 'SHIP_WEAPON',     name: 'CF-227 Badger Repeater',
    subcategory: 'Ballistic Repeater', size: 3,
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Contested Zones', 'Siege of Orison', 'Derelict Ships'],
    rarity: 'UNCOMMON',
    notes: 'Best-in-slot S3 ballistic repeater for most roles. Drops from Siege of Orison.',
  },
  {
    id: 'M6A_LASER',       category: 'SHIP_WEAPON',     name: 'M6A Laser Cannon',
    subcategory: 'Energy Cannon', size: 3,
    acquisition: 'MISSION_REWARD', faction: 'BHG',    minTier: 'ASSOCIATE',
    locations: ['Port Tressler', 'Baijini Point'],
    rarity: 'RARE',
    notes: 'BHG Associate reward. Best S3 energy cannon for fixed-mount builds.',
  },
  {
    id: 'NN14_NEUTRON',    category: 'SHIP_WEAPON',     name: 'MaxOx NN-14 Neutron Repeater',
    subcategory: 'Energy Repeater', size: 3,
    acquisition: 'MISSION_REWARD', faction: 'CRUSADER', minTier: 'ALLY',
    locations: ['Orison', 'CRU-L1'],
    rarity: 'RARE',
    notes: 'Crusader Ally reward. High DPS S3 energy repeater. Siege of Orison is the fastest unlock path.',
  },
  {
    id: 'OMNISKY_VI',      category: 'SHIP_WEAPON',     name: 'Omnisky VI Laser Cannon',
    subcategory: 'Energy Cannon', size: 3,
    acquisition: 'FACTION_STORE',  faction: 'ARCCORP',  minTier: 'ALLY',
    locations: ['Area 18'],
    rarity: 'RARE',
    notes: 'ArcCorp Ally store item. Popular high-efficiency energy cannon.',
  },
  {
    id: 'TALON_SHREDDER',  category: 'SHIP_WEAPON',     name: 'Talon Shredder',
    subcategory: 'Ballistic Repeater', size: 1,
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Nine Tails Contested Zones', 'Jumptown', 'Pyro Wrecks'],
    rarity: 'UNCOMMON',
    notes: 'S1 ballistic. Good for fighters and light combat builds. Drops in Nine Tails territory.',
  },
  {
    id: 'REVENANT_TREE',   category: 'SHIP_WEAPON',     name: 'Klaus & Werner Revenant',
    subcategory: 'Ballistic Gatling', size: 3,
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['High-Security Bunkers', 'Contested Zones', 'Siege of Orison'],
    rarity: 'RARE',
    notes: 'Rare drop. Highest burst DPS of any S3 ballistic. Worth running Siege specifically for this.',
  },
  {
    id: 'PORRON_MK2',      category: 'SHIP_WEAPON',     name: 'Porrón Mk II Cannon',
    subcategory: 'Ballistic Cannon', size: 3,
    acquisition: 'FACTION_STORE',  faction: 'ARCCORP',  minTier: 'ASSOCIATE',
    locations: ['Area 18'],
    rarity: 'UNCOMMON',
    notes: 'ArcCorp Associate store. Reliable fixed-mount S3 ballistic cannon.',
  },

  // ── Personal Weapons ────────────────────────────────────────────────────────
  {
    id: 'P4AR',            category: 'PERSONAL_WEAPON',  name: 'Behring P4-AR Rifle',
    subcategory: 'Assault Rifle',
    acquisition: 'MISSION_REWARD', faction: 'BHG',    minTier: 'TRUSTED',
    locations: ['Port Tressler', 'HUR-L1'],
    rarity: 'UNCOMMON',
    notes: 'BHG Trusted reward. Best-in-slot FPS assault rifle. Priority blueprint for combat-focused members.',
  },
  {
    id: 'FS9_LMG',         category: 'PERSONAL_WEAPON',  name: 'Behring FS-9 LMG',
    subcategory: 'LMG',
    acquisition: 'FACTION_STORE',  faction: 'BHG',    minTier: 'CHAMPION',
    locations: ['Port Tressler'],
    rarity: 'VERY_RARE',
    notes: 'BHG Champion store unlock. Endgame LMG — long grind but worth it for sustained fire roles.',
  },
  {
    id: 'DEVASTATOR',      category: 'PERSONAL_WEAPON',  name: 'UCS Devastator Shotgun',
    subcategory: 'Shotgun',
    acquisition: 'FACTION_STORE',  faction: 'HURSTON', minTier: 'ALLY',
    locations: ['Lorville'],
    rarity: 'RARE',
    notes: 'Hurston Ally unlock. Best close-quarters shotgun in the game. Board-and-clear builds.',
  },
  {
    id: 'CUSTODIAN_SMG',   category: 'PERSONAL_WEAPON',  name: 'Kastak Arms Custodian',
    subcategory: 'SMG',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Nine Tails Zones', 'Jumptown', 'Pyro Contested'],
    rarity: 'UNCOMMON',
    notes: 'Drops from Nine Tails soldiers. Good suppressed SMG for boarding operations.',
  },
  {
    id: 'P8SC',            category: 'PERSONAL_WEAPON',  name: 'Gemini P8-SC SMG',
    subcategory: 'SMG',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Bunkers', 'Drug Labs', 'Outlaw NPC Drops'],
    rarity: 'COMMON',
    notes: 'Most common SMG drop. Solid utility weapon for all crew roles.',
  },
  {
    id: 'R97_SHOTGUN',     category: 'PERSONAL_WEAPON',  name: 'Gallant R97 Shotgun',
    subcategory: 'Shotgun',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Security Outposts', 'Contested Zones', 'Bunkers'],
    rarity: 'UNCOMMON',
    notes: 'Reliable mid-tier shotgun. Common enough to farm via regular bunker clears.',
  },
  {
    id: 'GP33_LAUNCHER',   category: 'PERSONAL_WEAPON',  name: 'K&W GP-33 Launcher',
    subcategory: 'Grenade Launcher',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['High-Security Bunkers', 'Military Wrecks'],
    rarity: 'RARE',
    notes: 'Rare drop from military-grade locations. Anti-personnel clearance weapon.',
  },

  // ── Armour ──────────────────────────────────────────────────────────────────
  {
    id: 'CALVA_LIGHT',     category: 'ARMOR',            name: 'Calva Armour Set (Light)',
    subcategory: 'Light EVA',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Bunkers', 'Outposts', 'NPC Drops'],
    rarity: 'COMMON',
    notes: 'Common FPS armour. Baseline kit for boarding crew.',
  },
  {
    id: 'CALVA_PRO',       category: 'ARMOR',            name: 'Calva Pro Armour Set',
    subcategory: 'Light EVA',
    acquisition: 'MISSION_REWARD', faction: 'BHG',    minTier: 'ASSOCIATE',
    locations: ['Port Tressler', 'HUR-L1'],
    rarity: 'UNCOMMON',
    notes: 'BHG Associate reward. Enhanced light armour — preferred for bounty and boarding ops.',
  },
  {
    id: 'NOVIKOV_MED',     category: 'ARMOR',            name: 'Novikov Armour Set (Medium)',
    subcategory: 'Medium Combat',
    acquisition: 'FACTION_STORE',  faction: 'HURSTON', minTier: 'ASSOCIATE',
    locations: ['Lorville'],
    rarity: 'UNCOMMON',
    notes: 'Hurston Associate store. Best mid-tier combat armour for ground assault roles.',
  },
  {
    id: 'PALADIN_MED',     category: 'ARMOR',            name: 'Paladin Armour Set',
    subcategory: 'Medium Combat',
    acquisition: 'FACTION_STORE',  faction: 'ARCCORP',  minTier: 'ALLY',
    locations: ['Area 18'],
    rarity: 'RARE',
    notes: 'ArcCorp Ally store. High ballistic resistance. Good for contested zone runs.',
  },
  {
    id: 'SIEGE_ARMOR',     category: 'ARMOR',            name: 'Siege of Orison Armour',
    subcategory: 'Heavy Combat',
    acquisition: 'EVENT_ONLY',    faction: 'CRUSADER', minTier: null,
    locations: ['Siege of Orison Event'],
    rarity: 'VERY_RARE',
    notes: 'Event-only drop. Highest tier armour in the game. Requires Crusader standing and event participation.',
  },
  {
    id: 'NINE_TAILS_ARMOR',category: 'ARMOR',            name: 'Nine Tails Armour Set',
    subcategory: 'Outlaw Medium',
    acquisition: 'FACTION_STORE',  faction: 'NINE_TAILS', minTier: 'ALLY',
    locations: ['Jumptown', 'Ruin Station'],
    rarity: 'RARE',
    notes: 'Nine Tails Ally store. Distinctive aesthetic, solid stats. Outlaw faction required.',
  },

  // ── Ship Components ─────────────────────────────────────────────────────────
  {
    id: 'PORRON_SHIELD_S2',category: 'SHIP_COMPONENT',   name: 'Porrón Defender Shield (S2)',
    subcategory: 'Shield Generator',
    acquisition: 'FACTION_STORE',  faction: 'ARCCORP',  minTier: 'TRUSTED',
    locations: ['Area 18'],
    rarity: 'UNCOMMON',
    notes: 'ArcCorp Trusted unlock. Reliable S2 shield for fighters and small craft.',
  },
  {
    id: 'GORGON_SHIELD_S3',category: 'SHIP_COMPONENT',   name: 'Gorgon Defender Shield (S3)',
    subcategory: 'Shield Generator',
    acquisition: 'MISSION_REWARD', faction: 'BHG',    minTier: 'ALLY',
    locations: ['Port Tressler'],
    rarity: 'RARE',
    notes: 'BHG Ally reward. Top-tier S3 shield for medium fighters. Hard to get — long grind.',
  },
  {
    id: 'SIREN_QD',        category: 'SHIP_COMPONENT',   name: 'Siren QD (S2)',
    subcategory: 'Quantum Drive',
    acquisition: 'MISSION_REWARD', faction: 'MICROTECH', minTier: 'ALLY',
    locations: ['New Babbage'],
    rarity: 'RARE',
    notes: 'mTech Ally reward. Best-in-slot S2 quantum drive for fighters. Fastest spool + range.',
  },
  {
    id: 'VOYAGER_QD',      category: 'SHIP_COMPONENT',   name: 'Voyager Fast-Charge QD (S2)',
    subcategory: 'Quantum Drive',
    acquisition: 'FACTION_STORE',  faction: 'MICROTECH', minTier: 'ASSOCIATE',
    locations: ['New Babbage', 'MIC-L1'],
    rarity: 'UNCOMMON',
    notes: 'mTech Associate store. Good budget QD with fast spool for escort and fighter builds.',
  },
  {
    id: 'PETER_CABOT_PP',  category: 'SHIP_COMPONENT',   name: 'Peter Cabot Power Plant (S2)',
    subcategory: 'Power Plant',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Derelict Ships', 'Contested Zones', 'Bunkers'],
    rarity: 'UNCOMMON',
    notes: 'Common-ish loot drop from derelict ships. Solid all-round S2 power plant.',
  },
  {
    id: 'JOKER_COOLER',    category: 'SHIP_COMPONENT',   name: 'JOKER Sano-5 Cooler (S2)',
    subcategory: 'Cooler',
    acquisition: 'LOOT_DROP',     faction: null,     minTier: null,
    locations: ['Ship Wrecks', 'Security Outposts'],
    rarity: 'UNCOMMON',
    notes: 'Good S2 cooler drop from wrecks. Reduces IR signature for stealth builds.',
  },

  // ── Consumables ─────────────────────────────────────────────────────────────
  {
    id: 'STIM_BLUE',       category: 'CONSUMABLE',       name: 'Premium Stim BP (Blue)',
    subcategory: 'Combat Stimulant',
    acquisition: 'CARGO_BUY',     faction: null,     minTier: null,
    locations: ['Jumptown', 'Drug Labs (Pyro)'],
    rarity: 'UNCOMMON',
    notes: 'Jumptown / Pyro drug labs. High value trade commodity + personal use.',
  },
  {
    id: 'MEDPEN_GRADE3',   category: 'CONSUMABLE',       name: 'MedPen Grade III BP',
    subcategory: 'Medical',
    acquisition: 'FACTION_STORE',  faction: 'HURSTON', minTier: 'ASSOCIATE',
    locations: ['Lorville'],
    rarity: 'UNCOMMON',
    notes: 'Hurston Associate store. Top-tier medpen — priority for crew carrying a medic slot.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getFactionById(id) {
  return SC_FACTIONS.find(f => f.id === id) || null;
}

export function getBlueprintsByCategory(categoryId) {
  if (!categoryId || categoryId === 'ALL') return SC_BLUEPRINTS;
  return SC_BLUEPRINTS.filter(b => b.category === categoryId);
}

export function getBlueprintLocations(selectedIds) {
  const selected = SC_BLUEPRINTS.filter(b => selectedIds.includes(b.id));
  const locationSet = new Set();
  selected.forEach(b => b.locations.forEach(l => locationSet.add(l)));
  return [...locationSet];
}

export function getBlueprintFactions(selectedIds) {
  const selected = SC_BLUEPRINTS.filter(b => selectedIds.includes(b.id));
  const factionIds = [...new Set(selected.filter(b => b.faction).map(b => b.faction))];
  return factionIds.map(id => SC_FACTIONS.find(f => f.id === id)).filter(Boolean);
}

export function getSystemForLocation(location) {
  const stantonKeywords = ['Stanton', 'Lorville', 'Area 18', 'Orison', 'New Babbage',
    'Port Tressler', 'Baijini', 'Everus', 'HUR-', 'ARC-', 'CRU-', 'MIC-',
    'Yela', 'Daymar', 'Cellin', 'Lyria', 'Wala', 'HDMS', 'Aberdeen', 'Magda',
    'Clio', 'Calliope', 'Euterpe', 'Aaron Halo', 'Jumptown', 'Bunker', 'Outpost'];
  const pyroKeywords = ['Pyro', 'Ruin Station', 'Checkmate', 'Ignis', 'Vatra', 'Adir', 'Fairo', 'Terminus'];
  const nyxKeywords = ['Delamar', 'Levski', 'Nyx'];

  if (pyroKeywords.some(k => location.includes(k))) return 'PYRO';
  if (nyxKeywords.some(k => location.includes(k))) return 'NYX';
  if (stantonKeywords.some(k => location.includes(k))) return 'STANTON';
  return 'STANTON';
}

// ─── Op type planning data (all types except REP_GRIND / BLUEPRINT_GRIND) ────
// Used by OpPlanningStep to populate reference panels for every op type.

export const OP_TYPE_PLANS = {

  MINING: {
    minerals: [
      { id: 'QUANTANIUM',    name: 'Quantanium',    aUEC_per_SCU: 32000, rarity: 'RARE',       color: '#C0392B',
        locations: ['Aaron Halo (inner band)', 'Yela Belt (dense zones)', 'ARC-L5 Ring'],
        notes: 'Volatile — 8-min decay post-extraction. Have haulers staged before firing.' },
      { id: 'BEXALITE',      name: 'Bexalite',      aUEC_per_SCU: 8500,  rarity: 'UNCOMMON',   color: '#C8A84B',
        locations: ['Yela', 'Daymar', 'Cellin', 'Pyro I'],
        notes: 'Stable. Best value-to-risk ratio for steady income runs.' },
      { id: 'TARANITE',      name: 'Taranite',      aUEC_per_SCU: 5800,  rarity: 'UNCOMMON',   color: '#7AAECC',
        locations: ['Wala', 'Lyria', 'Clio', 'Euterpe'],
        notes: 'microTech moon staple. Good fallback when Bexalite isn\'t spawning.' },
      { id: 'AGRICIUM',      name: 'Agricium',      aUEC_per_SCU: 4200,  rarity: 'UNCOMMON',   color: '#9DA1CD',
        locations: ['Aberdeen', 'Arial', 'Ita', 'Magda'],
        notes: 'Hurston moon staple. Reliable mid-value consistent haul.' },
      { id: 'LARANITE',      name: 'Laranite',      aUEC_per_SCU: 3100,  rarity: 'COMMON',     color: '#4A8C5C',
        locations: ['Daymar', 'Ita', 'Lyria', 'Wala'],
        notes: 'Also required for Rockbreaker lens crafting — dual-use resource.' },
      { id: 'HEPHAESTANITE', name: 'Hephaestanite', aUEC_per_SCU: 2400,  rarity: 'UNCOMMON',   color: '#E04848',
        locations: ['Pyro III', 'Pyro IV', 'Pyro V'],
        notes: 'Pyro-exclusive. High value but requires operating in lawless space.' },
      { id: 'BORASE',        name: 'Borase',        aUEC_per_SCU: 1800,  rarity: 'COMMON',     color: '#5A5850',
        locations: ['Cellin', 'Daymar', 'Aberdeen'],
        notes: 'Low value but required for lens crafting. Stock up during MINING ops.' },
      { id: 'TITANIUM',      name: 'Titanium',      aUEC_per_SCU: 950,   rarity: 'COMMON',     color: '#3A3830',
        locations: ['Most asteroid belts', 'Most moons'],
        notes: 'Bulk filler. Mine alongside high-value to maximise haul value.' },
    ],
    ships: [
      { id: 'PROSPECTOR', name: 'Prospector', manufacturer: 'MISC', crew: '1',    cargoSCU: 32,
        pros: 'Solo capable · Fast scan cycle · Easy parking',
        cons: 'Small hold · Fragile hull', recommended: true },
      { id: 'MOLE',       name: 'MOLE',       manufacturer: 'ARGO', crew: '1–3',  cargoSCU: 96,
        pros: '3 simultaneous turrets · Large hold · High efficiency',
        cons: 'Needs full crew for best output · Expensive to insure', recommended: true },
      { id: 'ROC',        name: 'ROC',        manufacturer: 'MISC', crew: '1',    cargoSCU: 4,
        pros: 'Surface deposits · Unique moon minerals',
        cons: 'Requires carrier · Very small hold', recommended: false },
      { id: 'ROC_DS',     name: 'ROC-DS',     manufacturer: 'MISC', crew: '2',    cargoSCU: 8,
        pros: '2-crew ground op · Higher yield than solo ROC',
        cons: 'Needs large carrier · Ground-only', recommended: false },
    ],
    lasers: [
      { name: 'Lancet MK1',    size: 'S1', use: 'Precise fracture — sensitive/volatile rocks' },
      { name: 'Helix I',       size: 'S1', use: 'General purpose — stable power output' },
      { name: 'Arbor MH1',     size: 'S1', use: 'Multi-hit wide beam — fast fracture on large rocks' },
      { name: 'Impulse IV',    size: 'S2', use: 'MOLE turret standard — high yield deposits' },
      { name: 'Hofstede-S1',   size: 'S1', use: 'Low heat — good for sustained long sessions' },
    ],
    refineries: [
      { name: 'CRU-L1', system: 'STANTON' }, { name: 'ARC-L1', system: 'STANTON' },
      { name: 'HUR-L1', system: 'STANTON' }, { name: 'MIC-L1', system: 'STANTON' },
      { name: 'Ruin Station', system: 'PYRO' },
    ],
  },

  ROCKBREAKER: {
    deposits: [
      { id: 'QUANT_AARON',  name: 'Quantanium Cluster — Aaron Halo', system: 'STANTON',
        yieldSCU: '80–240 SCU per crack', risk: 'HIGH',
        notes: '8-min decay. Stage haulers before firing. Best known Quantanium source.' },
      { id: 'QUANT_YELA',   name: 'Quantanium Cluster — Yela Belt', system: 'STANTON',
        yieldSCU: '60–180 SCU per crack', risk: 'HIGH',
        notes: 'Dense belt. Multiple Orions can work simultaneously. Congested.' },
      { id: 'BEXALITE_ARC', name: 'Bexalite Vein — ARC-L5 Ring', system: 'STANTON',
        yieldSCU: '40–120 SCU', risk: 'MEDIUM',
        notes: 'Stable ore. Good fallback deposit when Quantanium cluster isn\'t spawning.' },
      { id: 'MULTI_MIX',    name: 'Mixed Ore Cluster — General', system: 'STANTON',
        yieldSCU: '60–180 SCU', risk: 'LOW',
        notes: 'Laranite + Titanium + Borase. Low value but risk-free practice/lens material run.' },
      { id: 'HEPH_PYRO',    name: 'Hephaestanite Vein — Pyro', system: 'PYRO',
        yieldSCU: '60–200 SCU', risk: 'VERY_HIGH',
        notes: 'Pyro-exclusive high-value ore. Heavy escort mandatory at all times.' },
    ],
    lensRecipe: [
      { material: 'Borase',   quantityPerLens: '10–15 units', source: 'Moon mining: Cellin, Daymar, Aberdeen' },
      { material: 'Laranite', quantityPerLens: '8–12 units',  source: 'Moon mining: Daymar, Lyria, Ita' },
    ],
    crewRoles: [
      { role: 'Mining Lead',   ship: 'Orion',              duty: 'Primary laser operator · coordinates fracture timing' },
      { role: 'Lens Crafter',  ship: 'Orion (Engineering)',duty: 'Manufactures lenses during transit · monitors heat' },
      { role: 'Hauler',        ship: 'Caterpillar / C2',   duty: 'Receives fractured ore · runs to refinery during extraction' },
      { role: 'Escort Lead',   ship: 'Heavy Fighter (×2)',  duty: 'Area denial during extraction · piracy response' },
      { role: 'Scout',         ship: 'Light Fighter',       duty: 'Cluster ID · threat early warning' },
    ],
    notes: 'Stock 3+ lenses per session. Confirm hauler is on station BEFORE firing laser on Quantanium clusters.',
  },

  SALVAGE: {
    wreckTypes: [
      { id: 'DERELICT_SMALL', name: 'Derelict Ship (Small)',
        yieldSCU: '10–80 SCU hull material', value: 'MEDIUM', risk: 'LOW',
        locations: ['Random spawns — all systems', 'Cellin, Daymar, Ita derelict zones'],
        processType: 'BULK',
        notes: 'Most common. Quick solo Vulture work. Good for warm-up or low-crew sessions.' },
      { id: 'CAPITAL_WRECK', name: 'Capital Ship Wreck',
        yieldSCU: '150–500 SCU + components', value: 'HIGH', risk: 'MEDIUM',
        locations: ['Spider (Delamar)', 'Contested derelict zones', 'Deep space random'],
        processType: 'BOTH',
        notes: 'Rare spawn. Full Reclaimer crew recommended. Can take multiple sessions.' },
      { id: 'STATION_DEBRIS', name: 'Derelict Station / Platform',
        yieldSCU: '200–800 SCU', value: 'HIGH', risk: 'MEDIUM',
        locations: ['Abandoned platforms', 'Various derelict outposts'],
        processType: 'BULK',
        notes: 'Large debris field. Reclaimer optimal. Watch for NPC squatters.' },
      { id: 'CONTESTED', name: 'Contested Salvage Zone',
        yieldSCU: '50–300 SCU + high-value components', value: 'VERY_HIGH', risk: 'HIGH',
        locations: ['Active battlezones', 'Post-event debris', 'Pyro contested areas'],
        processType: 'COMPONENT',
        notes: 'Active PvP risk. Escort mandatory. Component values justify the danger.' },
      { id: 'DRUG_LAB', name: 'Abandoned Drug Lab',
        yieldSCU: '20–60 SCU + contraband', value: 'MEDIUM', risk: 'MEDIUM',
        locations: ['Random moon surfaces', 'Deep space platforms'],
        processType: 'COMPONENT',
        notes: 'Contraband cargo risk. Nine Tails presence possible. Check before landing.' },
    ],
    ships: [
      { id: 'VULTURE',    name: 'Vulture',    manufacturer: 'Drake', crew: '1',   maxSCU: 24,
        pros: 'Solo capable · Agile · Good for small wrecks',
        cons: 'Small hold · Slow on large wrecks', recommended: true },
      { id: 'RECLAIMER',  name: 'Reclaimer',  manufacturer: 'AEGIS', crew: '3–5', maxSCU: 468,
        pros: 'Massive hold · Tractor beam arm · Component extraction',
        cons: 'Needs full crew · Very slow · Expensive', recommended: true },
      { id: 'CORSAIR',    name: 'Corsair',    manufacturer: 'Drake', crew: '2–3', maxSCU: 72,
        pros: 'Combat capable · Decent hold · Fast transit',
        cons: 'Not dedicated salvage — limited extraction tools', recommended: false },
    ],
    processTypes: [
      { id: 'BULK',      label: 'Bulk Hull Scraping', desc: 'Scrape hull material. High SCU, lower aUEC/SCU.' },
      { id: 'COMPONENT', label: 'Component Recovery', desc: 'Extract ship components. Low SCU, high unit value.' },
      { id: 'BOTH',      label: 'Combined',           desc: 'Hull scrape + component recovery. Reclaimer recommended.' },
    ],
  },

  CARGO: {
    routes: [
      { id: 'REFINED_ORE',   name: 'Refined Ore — Refineries → Trade Hubs',
        commodity: 'Refined Minerals', margin: '1,800–4,200 aUEC/SCU', risk: 'LOW',
        minSCU: 80, systems: ['STANTON'],
        notes: 'Best safe-haul margins. Coordinate with mining teams for supply.' },
      { id: 'MEDICAL_RUN',   name: 'Medical Supplies — CRU/MIC → Outlying Stations',
        commodity: 'Medical Supplies', margin: '1,200–2,800 aUEC/SCU', risk: 'LOW',
        minSCU: 24, systems: ['STANTON'],
        notes: 'Reliable bulk. Available in quantity. Safe corridors.' },
      { id: 'FOOD_LOOP',     name: 'Agricultural Loop — Hurston/Crusader',
        commodity: 'Agricultural Supplies', margin: '600–1,400 aUEC/SCU', risk: 'LOW',
        minSCU: 32, systems: ['STANTON'],
        notes: 'Steady income. Good fleet coordination run.' },
      { id: 'STIMS_PYRO',    name: 'Stanton → Pyro Supply Stations',
        commodity: 'Consumables / Medical', margin: '2,000–5,000 aUEC/SCU', risk: 'HIGH',
        minSCU: 20, systems: ['STANTON', 'PYRO'],
        notes: 'High demand in Pyro. Active piracy corridor. Escort required.' },
      { id: 'SCRAP_HAUL',    name: 'Salvage Scrap → Trade Depots',
        commodity: 'Recycled Material Composite', margin: '400–900 aUEC/SCU', risk: 'LOW',
        minSCU: 100, systems: ['STANTON'],
        notes: 'Low margin, high volume. Suits Hull-series and Caterpillar hauls.' },
      { id: 'JUMPTOWN_STIM', name: 'Jumptown → Levski / Grim HEX',
        commodity: 'WiDoW / Neon (Illegal)', margin: '4,000–8,000 aUEC/SCU', risk: 'VERY_HIGH',
        minSCU: 12, systems: ['STANTON', 'NYX'],
        notes: 'Highest margins in game. Nine Tails territory, active piracy, crimestat. Escort essential.' },
    ],
    ships: [
      { id: 'FREELANCER_MAX', name: 'Freelancer MAX', manufacturer: 'MISC',     maxSCU: 120,  crew: '1–2' },
      { id: 'C2_HERCULES',    name: 'C2 Hercules',    manufacturer: 'Crusader', maxSCU: 696,  crew: '2' },
      { id: 'CATERPILLAR',    name: 'Caterpillar',    manufacturer: 'Drake',    maxSCU: 576,  crew: '2–4' },
      { id: 'HULL_C',         name: 'MISC Hull C',    manufacturer: 'MISC',     maxSCU: 4608, crew: '2', warning: 'Exposed cargo — extreme piracy target' },
      { id: 'CONSTELLATION_TAURUS', name: 'Constellation Taurus', manufacturer: 'RSI', maxSCU: 174, crew: '1–2' },
      { id: 'A2_HERCULES',    name: 'A2 Hercules',    manufacturer: 'Crusader', maxSCU: 912,  crew: '3' },
    ],
    riskColors: { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#E04848', VERY_HIGH: '#C0392B' },
  },

  PATROL: {
    zones: [
      { id: 'AARON_HALO',    name: 'Aaron Halo',         system: 'STANTON', threat: 'HIGH',
        factions: ['NPC Pirates', 'Nine Tails', 'Rival Org PvP'],
        notes: 'Dense belt — high collision risk. Major piracy corridor for miners.' },
      { id: 'YELA_BELT',     name: 'Yela Belt',          system: 'STANTON', threat: 'MEDIUM',
        factions: ['NPC Pirates', 'Nine Tails'],
        notes: 'Active mining zone. Patrol presence deters opportunistic pirates.' },
      { id: 'HURSTON_MOONS', name: 'Hurston Moons AO',   system: 'STANTON', threat: 'MEDIUM',
        factions: ['Hurston Security (hostile to criminals)', 'Outlaws'],
        notes: 'Industrial area. Protect mining/cargo ops in the Aberdeen–Magda corridor.' },
      { id: 'CRUSADER_BELT', name: 'Crusader Belt AO',   system: 'STANTON', threat: 'MEDIUM',
        factions: ['NPC Pirates', 'Nine Tails', 'Civilian traffic'],
        notes: 'Busy shipping lanes. Escort missions and deterrence patrols.' },
      { id: 'STANTON_PYRO',  name: 'Stanton–Pyro Transit', system: 'STANTON', threat: 'VERY_HIGH',
        factions: ['Nine Tails', 'Rival Org PvP', 'XenoThreat (event)'],
        notes: 'Jump point corridor. Highest PvP risk in Stanton. Minimum 4 combat ships.' },
      { id: 'PYRO_GENERAL',  name: 'Pyro General AO',   system: 'PYRO', threat: 'EXTREME',
        factions: ['Outlaws', 'Rival Orgs', 'NPC Piracy'],
        notes: 'Entire system is hostile. Continuous combat readiness. No mercy rule applies.' },
      { id: 'NYX_APPROACH',  name: 'Nyx / Delamar AO',  system: 'NYX', threat: 'MEDIUM',
        factions: ['Outlaws', 'Nine Tails overflow'],
        notes: 'Frontier system. Low pop but Nine Tails staging area. Vigilance required.' },
    ],
    engagementRules: [
      { id: 'ROE_HOT',    label: 'Hot',          desc: 'Engage any hostile on sight. No warnings.' },
      { id: 'ROE_WARN',   label: 'Warn First',   desc: 'One warning broadcast then engage.' },
      { id: 'ROE_ESCORT', label: 'Escort Only',  desc: 'Engage only when assigned asset is threatened.' },
      { id: 'ROE_DEFEND', label: 'Defend Only',  desc: 'No proactive engagement. Return fire only.' },
    ],
    ships: [
      { name: 'Gladius',      class: 'Light Fighter',  role: 'Scout / Fast intercept' },
      { name: 'Arrow',        class: 'Light Fighter',  role: 'Intercept / Flanking' },
      { name: 'Hornet F7C',   class: 'Heavy Fighter',  role: 'Patrol lead / DPS' },
      { name: 'Hurricane',    class: 'Heavy Fighter',  role: 'Heavy patrol / suppression' },
      { name: 'Vanguard Warden', class: 'Heavy Fighter', role: 'Long-range patrol / durability' },
      { name: 'Hammerhead',   class: 'Capital/Multi',  role: 'Sector command / area denial' },
    ],
  },

  COMBAT: {
    missionTypes: [
      { id: 'PERSONAL_BOUNTY',  label: 'Personal Bounty',      avgAuec: 8000,   difficulty: 'EASY',   crew: 1,
        locations: ['Any landing zone mission board'],
        notes: 'Quick solo income. Low threat. Good for warming up crew.' },
      { id: 'CRIMINAL_BOUNTY',  label: 'Criminal Bounty',      avgAuec: 22000,  difficulty: 'MEDIUM', crew: 2,
        locations: ['Comm arrays', 'Asteroid bases', 'Moons'],
        notes: 'Standard 2-ship pairing. Most efficient aUEC/hr for small combat crews.' },
      { id: 'HIGH_VALUE_TARGET', label: 'High-Value Target',   avgAuec: 60000,  difficulty: 'HARD',   crew: 3,
        locations: ['Deep space', 'Restricted zones', 'Contested areas'],
        notes: 'Escort + primary. Target often has support fleet. Don\'t engage alone.' },
      { id: 'GROUND_ASSAULT',   label: 'Ground Assault',       avgAuec: 35000,  difficulty: 'MEDIUM', crew: 4,
        locations: ['Bunkers', 'Outposts', 'Drug labs'],
        notes: 'Mixed ship + FPS. Drop ship + fighters. Clear bunker or outpost.' },
      { id: 'SIEGE',            label: 'Siege of Orison',      avgAuec: 80000,  difficulty: 'VERY_HARD', crew: 8,
        locations: ['Orison (Crusader)'],
        notes: 'Event-triggered. Crusader rep required. Best rep/aUEC in the game when active.' },
      { id: 'ORG_PVP',          label: 'Org PvP / Rivalry',    avgAuec: 0,      difficulty: 'VARIABLE', crew: 4,
        locations: ['Agreed zone or contested area'],
        notes: 'No NPC contract. Arrange with target org or treat as open world PvP.' },
    ],
    loadouts: [
      { role: 'Fighter Pilot',  ships: ['Gladius', 'Arrow', 'Hornet F7C', 'Hurricane'], primary: 'S3 fixed ballistic/laser' },
      { role: 'Heavy DPS',      ships: ['Vanguard Warden', 'Eclipse', 'Harbinger'],      primary: 'Torpedoes / S4 cannons' },
      { role: 'Support',        ships: ['Cutlass Red', 'Carrack', 'Pisces'],             primary: 'Repair / Med / Relay' },
      { role: 'Ground Assault', ships: ['Dropship (Valkyrie / C2)'],                     primary: 'P4-AR, shotgun, grenades' },
    ],
  },

  ESCORT: {
    convoyTypes: [
      { id: 'MINING_ESCORT',  label: 'Mining Op Escort',     desc: 'Protect Prospector/MOLE during extraction in contested belt.',
        risk: 'MEDIUM', minEscort: 2, notes: 'Patrol perimeter at 3–5km. Intercept before contact with miners.' },
      { id: 'CARGO_ESCORT',   label: 'Cargo Convoy Escort',  desc: 'Protect haul ships on a trade route.',
        risk: 'HIGH', minEscort: 3, notes: 'Maintain formation. 2 fighters flanking, 1 ahead scouting.' },
      { id: 'VIP_ESCORT',     label: 'VIP / Personnel',      desc: 'Protect named org member or high-value passenger.',
        risk: 'HIGH', minEscort: 2, notes: 'VIP in fastest ship with dedicated wingman. No splits mid-route.' },
      { id: 'SALVAGE_ESCORT', label: 'Salvage Op Escort',    desc: 'Protect Vulture/Reclaimer during salvage at contested wreck.',
        risk: 'MEDIUM', minEscort: 2, notes: 'Salvagers are slow and vulnerable. Active area denial required.' },
      { id: 'JUMP_TRANSIT',   label: 'Jump Point Transit',   desc: 'Escort through Stanton–Pyro corridor.',
        risk: 'VERY_HIGH', minEscort: 4, notes: 'Most dangerous leg. Collapse formation at jump point. Constant comms.' },
    ],
    ratios: [
      { label: '1 hauler',   fighters: 2, note: 'Minimum viable escort' },
      { label: '2 haulers',  fighters: 3, note: 'Standard convoy ratio' },
      { label: '3+ haulers', fighters: 4, note: 'Full convoy — recommend dedicated coordinator' },
    ],
    piracyZones: [
      { name: 'Aaron Halo',           system: 'STANTON', risk: 'HIGH' },
      { name: 'Stanton–Pyro Transit', system: 'STANTON', risk: 'VERY_HIGH' },
      { name: 'Pyro (all zones)',     system: 'PYRO',    risk: 'EXTREME' },
      { name: 'Jumptown vicinity',    system: 'STANTON', risk: 'HIGH' },
      { name: 'Nyx / Delamar',        system: 'NYX',     risk: 'MEDIUM' },
    ],
  },

  RECON: {
    targetTypes: [
      { id: 'DEPOSIT_SURVEY',  label: 'Deposit Survey',    desc: 'Identify and map high-value mineral deposits for future mining ops.',
        outputs: ['Deposit location', 'Mineral composition', 'Cluster size estimate'],
        ships: ['Prospector (scanner)', 'Terrapin', 'Constellation Aquila'],
        notes: 'Use maximum ping range. Log coordinates and mineral type to Scout Intel module.' },
      { id: 'ENEMY_POSITION',  label: 'Enemy Position',    desc: 'Locate and report hostile org or NPC force positions.',
        outputs: ['Force size', 'Ship types', 'Position fix'],
        ships: ['Gladius (fast pass)', 'Arrow', 'Terrapin'],
        notes: 'No engagement. Observe and report only. Maintain 8km+ standoff.' },
      { id: 'POI_DISCOVERY',   label: 'POI Discovery',     desc: 'Find and catalogue derelicts, outposts, or points of interest.',
        outputs: ['POI type', 'Occupancy status', 'Value assessment'],
        ships: ['Constellation Aquila', 'Terrapin', 'Cutlass Black'],
        notes: 'Document for salvage or follow-up ops. Note NPC presence and armament.' },
      { id: 'ROUTE_CLEARANCE', label: 'Route Clearance',   desc: 'Scout a trade/transit route before a cargo or mining op departs.',
        outputs: ['Threat contacts', 'Safe corridor', 'Recommended timing'],
        ships: ['Fast fighter (Arrow)', 'Gladius'],
        notes: 'Lead element runs 5–10 min ahead of main convoy. Call all contacts.' },
      { id: 'TARGET_PACKAGE',  label: 'Target Package',    desc: 'Compile intelligence on a specific target for a combat or S17 op.',
        outputs: ['Force composition', 'Defensive layout', 'Egress routes'],
        ships: ['Terrapin', 'Constellation Aquila'],
        notes: 'Full dossier expected. Include approach vectors and abort criteria.' },
    ],
    scannerTips: [
      'Ping range scales with scanner quality — equip best available.',
      'Use Geological Survey mode to differentiate mineral types at range.',
      'Passive radar sweep before pinging — avoid giving away position first.',
      'Record bearing and range to each contact, not just "something\'s there".',
    ],
  },

  RESCUE: {
    beaconTypes: [
      { id: 'MEDICAL_BEACON', label: 'Medical Beacon',    desc: 'Injured player needs on-site medical treatment or stabilisation.',
        priority: 'HIGH', response: 'Cutlass Red or Carrack med bay',
        notes: 'Stabilise on-site if possible. If critical, immediate evac to nearest station.' },
      { id: 'SHIP_RECOVERY',  label: 'Ship Recovery',     desc: 'Player stranded in damaged/disabled ship, needs tow or crew transfer.',
        priority: 'MEDIUM', response: 'Drake Cutter / Cutlass / Multi-crew with tractor',
        notes: 'Determine if ship is salvageable. If total loss, evacuate crew first.' },
      { id: 'DISTRESS',       label: 'Distress Call',     desc: 'Player under active attack or in immediate danger.',
        priority: 'CRITICAL', response: 'Fast combat response + medical follow-up',
        notes: 'Combat assets respond first. Medical arrives once area is clear. Speed critical.' },
      { id: 'EVAC',           label: 'Personnel Evac',    desc: 'Extract personnel from hostile or collapsing location.',
        priority: 'HIGH', response: 'Valkyrie / Cutlass / Carrack',
        notes: 'Fast ship preferred. Confirm LZ before committing to landing.' },
    ],
    medShips: [
      { name: 'Cutlass Red',  crew: '2–3', beds: 2,  role: 'Standard medical response' },
      { name: 'Carrack',      crew: '4–6', beds: 4,  role: 'Long-range / multi-patient' },
      { name: 'Endeavor',     crew: '6+',  beds: 12, role: 'Mobile base hospital' },
      { name: 'Valkyrie',     crew: '3+',  beds: 6,  role: 'Combat evac / armed insertion' },
    ],
    responseProtocol: [
      'Acknowledge beacon immediately — give ETA.',
      'Send combat element first if distress is active.',
      'Stabilise patient on-site before transit if possible.',
      'Confirm destination station has med facilities before departure.',
      'Stand down only when patient is handed to station medical.',
    ],
  },

  S17: {
    clearanceLevels: [
      { id: 'BLUE',   label: 'Blue',   desc: 'Surveillance and reconnaissance only. No engagement authorised.' },
      { id: 'AMBER',  label: 'Amber',  desc: 'Limited engagement authorised. Minimum force. Deniable assets.' },
      { id: 'RED',    label: 'Red',    desc: 'Full kinetic response authorised. No witnesses.' },
    ],
    objectiveTypes: [
      { id: 'SURVEILLANCE',  label: 'Surveillance', desc: 'Observe target. Document activity. No contact.' },
      { id: 'ELIMINATION',   label: 'Elimination',  desc: 'Remove target. No trace. Exfil before alarm.' },
      { id: 'EXTRACTION',    label: 'Extraction',   desc: 'Acquire asset or personnel. Controlled egress.' },
      { id: 'DISRUPTION',    label: 'Disruption',   desc: 'Degrade target capability. Sabotage. Plausible deniability.' },
    ],
    crewRequirements: [
      'All personnel confirm operational security briefing before launch.',
      'Comms silence protocol active from jump point to objective.',
      'Need-to-know only. Op Lead holds full picture.',
      'Exfil route confirmed before breach. Abort criteria defined.',
    ],
    note: 'Full operational parameters issued by Op Lead at time of staging. No further data available at this classification level.',
  },
};
