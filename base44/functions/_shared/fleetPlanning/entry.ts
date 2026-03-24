import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

export const FLEET_MANIFEST_VERSION = '2026.03-fleetforge-v1';

type Base44Client = ReturnType<typeof createClientFromRequest>;
type GenericRecord = Record<string, unknown>;

export type SupportedShipManifest = {
  slug: string;
  display_name: string;
  manufacturer: string;
  ship_class: string;
  role: string;
  viewer_asset_key: string;
  role_tags: string[];
  sections: Array<{
    id: string;
    label: string;
    slots: Array<{
      id: string;
      label: string;
      slot_type: string;
      slot_size: number;
      position_label?: string;
    }>;
  }>;
  default_loadout: Array<{
    hardpoint_id: string;
    label: string;
    slot_type: string;
    slot_size: number;
    component_name: string;
    manufacturer: string;
  }>;
};

const SHIP_MANIFEST: SupportedShipManifest[] = [
  {
    slug: 'misc-prospector',
    display_name: 'MISC Prospector',
    manufacturer: 'MISC',
    ship_class: 'MINER',
    role: 'INDUSTRIAL MINING',
    viewer_asset_key: 'prospector',
    role_tags: ['mining', 'industrial', 'solo'],
    sections: [
      {
        id: 'primary',
        label: 'PRIMARY HARDPOINTS',
        slots: [
          { id: 'mining-arm-left', label: 'Port Mining Arm', slot_type: 'mining-arm', slot_size: 1, position_label: 'port' },
          { id: 'mining-arm-right', label: 'Starboard Mining Arm', slot_type: 'mining-arm', slot_size: 1, position_label: 'starboard' },
          { id: 'scanner-top', label: 'Survey Sensor', slot_type: 'sensor', slot_size: 1, position_label: 'dorsal fore' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, position_label: 'dorsal mid' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'mining-arm-left', label: 'Port Mining Arm', slot_type: 'mining-arm', slot_size: 1, component_name: 'Arbor MH1 Mining Laser', manufacturer: 'Greycat' },
      { hardpoint_id: 'mining-arm-right', label: 'Starboard Mining Arm', slot_type: 'mining-arm', slot_size: 1, component_name: 'Arbor MH1 Mining Laser', manufacturer: 'Greycat' },
      { hardpoint_id: 'scanner-top', label: 'Survey Sensor', slot_type: 'sensor', slot_size: 1, component_name: 'Surveyor Recon Suite', manufacturer: 'MISC' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, component_name: 'Bulwark S1 Shield', manufacturer: 'MISC' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, component_name: 'Regulus S1 Power Plant', manufacturer: 'MISC' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, component_name: 'Snowblind S1 Cooler', manufacturer: 'MISC' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, component_name: 'Snowblind S1 Cooler', manufacturer: 'MISC' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, component_name: 'Atlas Quantum Drive', manufacturer: 'MISC' },
    ],
  },
  {
    slug: 'argo-mole',
    display_name: 'Argo MOLE',
    manufacturer: 'ARGO',
    ship_class: 'MINER',
    role: 'CREWED INDUSTRIAL MINING',
    viewer_asset_key: 'mole',
    role_tags: ['mining', 'industrial', 'multicrew'],
    sections: [
      {
        id: 'primary',
        label: 'MINING STATIONS',
        slots: [
          { id: 'mining-turret-center', label: 'Center Mining Turret', slot_type: 'mining-turret', slot_size: 2, position_label: 'dorsal fore' },
          { id: 'mining-turret-port', label: 'Port Mining Turret', slot_type: 'mining-turret', slot_size: 2, position_label: 'port mid' },
          { id: 'mining-turret-starboard', label: 'Starboard Mining Turret', slot_type: 'mining-turret', slot_size: 2, position_label: 'starboard mid' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 2, position_label: 'port aft' },
          { id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 2, position_label: 'starboard aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 2, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 2, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 2, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 2, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'mining-turret-center', label: 'Center Mining Turret', slot_type: 'mining-turret', slot_size: 2, component_name: 'Klein S2 Mining Turret', manufacturer: 'ARGO' },
      { hardpoint_id: 'mining-turret-port', label: 'Port Mining Turret', slot_type: 'mining-turret', slot_size: 2, component_name: 'Klein S2 Mining Turret', manufacturer: 'ARGO' },
      { hardpoint_id: 'mining-turret-starboard', label: 'Starboard Mining Turret', slot_type: 'mining-turret', slot_size: 2, component_name: 'Klein S2 Mining Turret', manufacturer: 'ARGO' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 2, component_name: 'Bulwark S2 Shield', manufacturer: 'ARGO' },
      { hardpoint_id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 2, component_name: 'Bulwark S2 Shield', manufacturer: 'ARGO' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 2, component_name: 'Regulus S2 Power Plant', manufacturer: 'ARGO' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 2, component_name: 'Snowblind S2 Cooler', manufacturer: 'ARGO' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 2, component_name: 'Snowblind S2 Cooler', manufacturer: 'ARGO' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 2, component_name: 'Expedition Quantum Drive', manufacturer: 'ARGO' },
    ],
  },
  {
    slug: 'drake-caterpillar',
    display_name: 'Drake Caterpillar',
    manufacturer: 'DRAKE',
    ship_class: 'HAULER',
    role: 'HEAVY HAULING',
    viewer_asset_key: 'caterpillar',
    role_tags: ['hauling', 'support', 'multicrew'],
    sections: [
      {
        id: 'weapons',
        label: 'DEFENSIVE HARDPOINTS',
        slots: [
          { id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 4, position_label: 'fore dorsal' },
          { id: 'turret-mid', label: 'Mid Turret', slot_type: 'turret', slot_size: 4, position_label: 'dorsal mid' },
          { id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 4, position_label: 'aft dorsal' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, position_label: 'port aft' },
          { id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, position_label: 'starboard aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, position_label: 'port mid' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, position_label: 'starboard mid' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 4, component_name: 'CF-447 Rhino Repeater', manufacturer: 'Klaus & Werner' },
      { hardpoint_id: 'turret-mid', label: 'Mid Turret', slot_type: 'turret', slot_size: 4, component_name: 'CF-447 Rhino Repeater', manufacturer: 'Klaus & Werner' },
      { hardpoint_id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 4, component_name: 'CF-447 Rhino Repeater', manufacturer: 'Klaus & Werner' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, component_name: 'Guardian S3 Shield', manufacturer: 'Drake' },
      { hardpoint_id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, component_name: 'Guardian S3 Shield', manufacturer: 'Drake' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, component_name: 'Regulus S3 Power Plant', manufacturer: 'Drake' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, component_name: 'Snowblind S3 Cooler', manufacturer: 'Drake' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, component_name: 'Snowblind S3 Cooler', manufacturer: 'Drake' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, component_name: 'Voyage Quantum Drive', manufacturer: 'Drake' },
    ],
  },
  {
    slug: 'crusader-c2-hercules',
    display_name: 'Crusader C2 Hercules',
    manufacturer: 'CRUSADER',
    ship_class: 'HAULER',
    role: 'HEAVY LIFT TRANSPORT',
    viewer_asset_key: 'c2-hercules',
    role_tags: ['hauling', 'support', 'fleet'],
    sections: [
      {
        id: 'weapons',
        label: 'DEFENSIVE HARDPOINTS',
        slots: [
          { id: 'turret-nose', label: 'Nose Turret', slot_type: 'turret', slot_size: 4, position_label: 'fore dorsal' },
          { id: 'turret-dorsal', label: 'Dorsal Turret', slot_type: 'turret', slot_size: 4, position_label: 'dorsal mid' },
          { id: 'turret-ventral', label: 'Ventral Turret', slot_type: 'turret', slot_size: 4, position_label: 'ventral aft' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, position_label: 'port aft' },
          { id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, position_label: 'starboard aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, position_label: 'port mid' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, position_label: 'starboard mid' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'turret-nose', label: 'Nose Turret', slot_type: 'turret', slot_size: 4, component_name: 'M6A Laser Cannon', manufacturer: 'Behring' },
      { hardpoint_id: 'turret-dorsal', label: 'Dorsal Turret', slot_type: 'turret', slot_size: 4, component_name: 'M6A Laser Cannon', manufacturer: 'Behring' },
      { hardpoint_id: 'turret-ventral', label: 'Ventral Turret', slot_type: 'turret', slot_size: 4, component_name: 'M6A Laser Cannon', manufacturer: 'Behring' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, component_name: 'Rampart S3 Shield', manufacturer: 'Crusader' },
      { hardpoint_id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, component_name: 'Rampart S3 Shield', manufacturer: 'Crusader' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, component_name: 'Aegis S3 Power Plant', manufacturer: 'Crusader' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, component_name: 'Avalanche S3 Cooler', manufacturer: 'Crusader' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, component_name: 'Avalanche S3 Cooler', manufacturer: 'Crusader' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, component_name: 'Odyssey Quantum Drive', manufacturer: 'Crusader' },
    ],
  },
  {
    slug: 'misc-hull-c',
    display_name: 'MISC Hull C',
    manufacturer: 'MISC',
    ship_class: 'HAULER',
    role: 'BULK TRANSPORT',
    viewer_asset_key: 'hull-c',
    role_tags: ['hauling', 'logistics', 'fleet'],
    sections: [
      {
        id: 'weapons',
        label: 'DEFENSIVE HARDPOINTS',
        slots: [
          { id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 3, position_label: 'fore dorsal' },
          { id: 'turret-port', label: 'Port Turret', slot_type: 'turret', slot_size: 3, position_label: 'port mid' },
          { id: 'turret-starboard', label: 'Starboard Turret', slot_type: 'turret', slot_size: 3, position_label: 'starboard mid' },
          { id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 3, position_label: 'aft dorsal' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, position_label: 'port aft' },
          { id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, position_label: 'starboard aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, position_label: 'port mid' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, position_label: 'starboard mid' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'MISC' },
      { hardpoint_id: 'turret-port', label: 'Port Turret', slot_type: 'turret', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'MISC' },
      { hardpoint_id: 'turret-starboard', label: 'Starboard Turret', slot_type: 'turret', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'MISC' },
      { hardpoint_id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'MISC' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, component_name: 'Guardian S3 Shield', manufacturer: 'MISC' },
      { hardpoint_id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, component_name: 'Guardian S3 Shield', manufacturer: 'MISC' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, component_name: 'Regulus S3 Power Plant', manufacturer: 'MISC' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, component_name: 'Snowblind S3 Cooler', manufacturer: 'MISC' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, component_name: 'Snowblind S3 Cooler', manufacturer: 'MISC' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, component_name: 'Spooler Quantum Drive', manufacturer: 'MISC' },
    ],
  },
  {
    slug: 'anvil-arrow',
    display_name: 'Anvil Arrow',
    manufacturer: 'ANVIL',
    ship_class: 'FIGHTER',
    role: 'LIGHT FIGHTER',
    viewer_asset_key: 'arrow',
    role_tags: ['combat', 'escort', 'scouting'],
    sections: [
      {
        id: 'weapons',
        label: 'OFFENSIVE HARDPOINTS',
        slots: [
          { id: 'weapon-wing-left', label: 'Port Wing Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'port wing' },
          { id: 'weapon-wing-right', label: 'Starboard Wing Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'starboard wing' },
          { id: 'weapon-nose', label: 'Nose Weapon', slot_type: 'weapon', slot_size: 2, position_label: 'nose' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, position_label: 'dorsal mid' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'weapon-wing-left', label: 'Port Wing Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'CF-337 Panther', manufacturer: 'Anvil' },
      { hardpoint_id: 'weapon-wing-right', label: 'Starboard Wing Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'CF-337 Panther', manufacturer: 'Anvil' },
      { hardpoint_id: 'weapon-nose', label: 'Nose Weapon', slot_type: 'weapon', slot_size: 2, component_name: 'CF-227 Badger', manufacturer: 'Anvil' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, component_name: 'Palisade S1 Shield', manufacturer: 'Anvil' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, component_name: 'Quadracell S1 Power Plant', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, component_name: 'Snowpack S1 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, component_name: 'Snowpack S1 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, component_name: 'Beacon Quantum Drive', manufacturer: 'Anvil' },
    ],
  },
  {
    slug: 'aegis-gladius',
    display_name: 'Aegis Gladius',
    manufacturer: 'AEGIS',
    ship_class: 'FIGHTER',
    role: 'INTERCEPTOR',
    viewer_asset_key: 'gladius',
    role_tags: ['combat', 'escort', 'scouting'],
    sections: [
      {
        id: 'weapons',
        label: 'OFFENSIVE HARDPOINTS',
        slots: [
          { id: 'weapon-wing-left', label: 'Port Wing Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'port wing' },
          { id: 'weapon-wing-right', label: 'Starboard Wing Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'starboard wing' },
          { id: 'weapon-nose', label: 'Nose Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'nose' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, position_label: 'dorsal mid' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'weapon-wing-left', label: 'Port Wing Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'Mantis GT-220', manufacturer: 'Aegis' },
      { hardpoint_id: 'weapon-wing-right', label: 'Starboard Wing Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'Mantis GT-220', manufacturer: 'Aegis' },
      { hardpoint_id: 'weapon-nose', label: 'Nose Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'CF-337 Panther', manufacturer: 'Aegis' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, component_name: 'FR-66 Shield Generator', manufacturer: 'Aegis' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, component_name: 'JS-300 Power Plant', manufacturer: 'Aegis' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, component_name: 'ZeroRush Cooler', manufacturer: 'Aegis' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, component_name: 'ZeroRush Cooler', manufacturer: 'Aegis' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, component_name: 'Atlas Quantum Drive', manufacturer: 'Aegis' },
    ],
  },
  {
    slug: 'drake-cutlass-black',
    display_name: 'Drake Cutlass Black',
    manufacturer: 'DRAKE',
    ship_class: 'FIGHTER',
    role: 'MULTIROLE STRIKE',
    viewer_asset_key: 'cutlass-black',
    role_tags: ['combat', 'hauling', 'support'],
    sections: [
      {
        id: 'weapons',
        label: 'OFFENSIVE HARDPOINTS',
        slots: [
          { id: 'weapon-pilot-left', label: 'Port Pilot Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'port fore' },
          { id: 'weapon-pilot-right', label: 'Starboard Pilot Weapon', slot_type: 'weapon', slot_size: 3, position_label: 'starboard fore' },
          { id: 'turret-dorsal', label: 'Dorsal Turret', slot_type: 'turret', slot_size: 3, position_label: 'dorsal mid' },
          { id: 'missile-rack-left', label: 'Port Missile Rack', slot_type: 'missile', slot_size: 3, position_label: 'port wing' },
          { id: 'missile-rack-right', label: 'Starboard Missile Rack', slot_type: 'missile', slot_size: 3, position_label: 'starboard wing' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 2, position_label: 'dorsal aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 2, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 2, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 2, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 2, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'weapon-pilot-left', label: 'Port Pilot Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'Drake' },
      { hardpoint_id: 'weapon-pilot-right', label: 'Starboard Pilot Weapon', slot_type: 'weapon', slot_size: 3, component_name: 'Panther Laser Repeater', manufacturer: 'Drake' },
      { hardpoint_id: 'turret-dorsal', label: 'Dorsal Turret', slot_type: 'turret', slot_size: 3, component_name: 'Badger Laser Repeater', manufacturer: 'Drake' },
      { hardpoint_id: 'missile-rack-left', label: 'Port Missile Rack', slot_type: 'missile', slot_size: 3, component_name: 'StrikeForce III Rack', manufacturer: 'Drake' },
      { hardpoint_id: 'missile-rack-right', label: 'Starboard Missile Rack', slot_type: 'missile', slot_size: 3, component_name: 'StrikeForce III Rack', manufacturer: 'Drake' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 2, component_name: 'Rampart S2 Shield', manufacturer: 'Drake' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 2, component_name: 'Regulus S2 Power Plant', manufacturer: 'Drake' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 2, component_name: 'Avalanche S2 Cooler', manufacturer: 'Drake' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 2, component_name: 'Avalanche S2 Cooler', manufacturer: 'Drake' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 2, component_name: 'Crossfield Quantum Drive', manufacturer: 'Drake' },
    ],
  },
  {
    slug: 'anvil-carrack',
    display_name: 'Anvil Carrack',
    manufacturer: 'ANVIL',
    ship_class: 'EXPLORER',
    role: 'COMMAND EXPLORATION',
    viewer_asset_key: 'carrack',
    role_tags: ['exploration', 'support', 'scouting', 'fleet'],
    sections: [
      {
        id: 'weapons',
        label: 'DEFENSIVE HARDPOINTS',
        slots: [
          { id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 4, position_label: 'fore dorsal' },
          { id: 'turret-port', label: 'Port Turret', slot_type: 'turret', slot_size: 4, position_label: 'port mid' },
          { id: 'turret-starboard', label: 'Starboard Turret', slot_type: 'turret', slot_size: 4, position_label: 'starboard mid' },
          { id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 4, position_label: 'aft dorsal' },
          { id: 'sensor-array', label: 'Sensor Array', slot_type: 'sensor', slot_size: 3, position_label: 'dorsal center' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, position_label: 'port aft' },
          { id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, position_label: 'starboard aft' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, position_label: 'port mid' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, position_label: 'starboard mid' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'turret-fore', label: 'Fore Turret', slot_type: 'turret', slot_size: 4, component_name: 'Rhino Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'turret-port', label: 'Port Turret', slot_type: 'turret', slot_size: 4, component_name: 'Rhino Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'turret-starboard', label: 'Starboard Turret', slot_type: 'turret', slot_size: 4, component_name: 'Rhino Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'turret-aft', label: 'Aft Turret', slot_type: 'turret', slot_size: 4, component_name: 'Rhino Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'sensor-array', label: 'Sensor Array', slot_type: 'sensor', slot_size: 3, component_name: 'Longscan Sensor Suite', manufacturer: 'Anvil' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator Port', slot_type: 'shield', slot_size: 3, component_name: 'Palisade S3 Shield', manufacturer: 'Anvil' },
      { hardpoint_id: 'shield-2', label: 'Shield Generator Starboard', slot_type: 'shield', slot_size: 3, component_name: 'Palisade S3 Shield', manufacturer: 'Anvil' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 3, component_name: 'Regulus S3 Power Plant', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 3, component_name: 'Avalanche S3 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 3, component_name: 'Avalanche S3 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 3, component_name: 'Odyssey Quantum Drive', manufacturer: 'Anvil' },
    ],
  },
  {
    slug: 'anvil-c8-pisces',
    display_name: 'Anvil C8 Pisces',
    manufacturer: 'ANVIL',
    ship_class: 'SUPPORT',
    role: 'LIGHT SUPPORT',
    viewer_asset_key: 'pisces',
    role_tags: ['support', 'scouting', 'hauling'],
    sections: [
      {
        id: 'weapons',
        label: 'PRIMARY HARDPOINTS',
        slots: [
          { id: 'weapon-left', label: 'Port Hardpoint', slot_type: 'weapon', slot_size: 1, position_label: 'port fore' },
          { id: 'weapon-right', label: 'Starboard Hardpoint', slot_type: 'weapon', slot_size: 1, position_label: 'starboard fore' },
          { id: 'mount-nose', label: 'Nose Utility Mount', slot_type: 'utility', slot_size: 1, position_label: 'nose' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, position_label: 'dorsal mid' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'weapon-left', label: 'Port Hardpoint', slot_type: 'weapon', slot_size: 1, component_name: 'Badger Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'weapon-right', label: 'Starboard Hardpoint', slot_type: 'weapon', slot_size: 1, component_name: 'Badger Repeater', manufacturer: 'Anvil' },
      { hardpoint_id: 'mount-nose', label: 'Nose Utility Mount', slot_type: 'utility', slot_size: 1, component_name: 'Compact Utility Mount', manufacturer: 'Anvil' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, component_name: 'Bulwark S1 Shield', manufacturer: 'Anvil' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, component_name: 'Quadracell S1 Power Plant', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, component_name: 'Snowpack S1 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, component_name: 'Snowpack S1 Cooler', manufacturer: 'Anvil' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, component_name: 'Beacon Quantum Drive', manufacturer: 'Anvil' },
    ],
  },
  {
    slug: 'mirai-razor',
    display_name: 'Mirai Razor',
    manufacturer: 'MIRAI',
    ship_class: 'RACING',
    role: 'RACING INTERCEPTOR',
    viewer_asset_key: 'razor',
    role_tags: ['racing', 'scouting', 'combat'],
    sections: [
      {
        id: 'weapons',
        label: 'PRIMARY HARDPOINTS',
        slots: [
          { id: 'mount-left', label: 'Port Mount', slot_type: 'weapon', slot_size: 1, position_label: 'port fore' },
          { id: 'mount-right', label: 'Starboard Mount', slot_type: 'weapon', slot_size: 1, position_label: 'starboard fore' },
          { id: 'sensor-nose', label: 'Sensor Mount', slot_type: 'sensor', slot_size: 1, position_label: 'nose' },
        ],
      },
      {
        id: 'core',
        label: 'CORE SYSTEMS',
        slots: [
          { id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, position_label: 'dorsal mid' },
          { id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, position_label: 'ventral mid' },
          { id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, position_label: 'port aft' },
          { id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, position_label: 'starboard aft' },
          { id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, position_label: 'aft' },
        ],
      },
    ],
    default_loadout: [
      { hardpoint_id: 'mount-left', label: 'Port Mount', slot_type: 'weapon', slot_size: 1, component_name: 'Yellowjacket GT-210', manufacturer: 'Mirai' },
      { hardpoint_id: 'mount-right', label: 'Starboard Mount', slot_type: 'weapon', slot_size: 1, component_name: 'Yellowjacket GT-210', manufacturer: 'Mirai' },
      { hardpoint_id: 'sensor-nose', label: 'Sensor Mount', slot_type: 'sensor', slot_size: 1, component_name: 'Racing Telemetry Pod', manufacturer: 'Mirai' },
      { hardpoint_id: 'shield-1', label: 'Shield Generator', slot_type: 'shield', slot_size: 1, component_name: 'Echo Shield Generator', manufacturer: 'Mirai' },
      { hardpoint_id: 'power-1', label: 'Power Plant', slot_type: 'power-plant', slot_size: 1, component_name: 'Sparkfire Power Plant', manufacturer: 'Mirai' },
      { hardpoint_id: 'cooler-1', label: 'Cooler Port', slot_type: 'cooler', slot_size: 1, component_name: 'Overdrive Cooler', manufacturer: 'Mirai' },
      { hardpoint_id: 'cooler-2', label: 'Cooler Starboard', slot_type: 'cooler', slot_size: 1, component_name: 'Overdrive Cooler', manufacturer: 'Mirai' },
      { hardpoint_id: 'quantum-1', label: 'Quantum Drive', slot_type: 'quantum-drive', slot_size: 1, component_name: 'Slipstream Quantum Drive', manufacturer: 'Mirai' },
    ],
  },
];

const SLOT_TYPE_COMPATIBILITY: Record<string, string[]> = {
  weapon: ['weapon', 'turret'],
  turret: ['turret', 'weapon'],
  missile: ['missile'],
  utility: ['utility', 'sensor'],
  sensor: ['sensor', 'utility'],
  'mining-arm': ['mining-arm', 'mining-turret', 'utility'],
  'mining-turret': ['mining-turret', 'mining-arm'],
};

const ROLE_KEYWORDS = {
  mining: ['mining', 'fracture', 'ore', 'salvage'],
  combat: ['laser', 'ballistic', 'missile', 'shield', 'weapon', 'turret', 'combat'],
  hauling: ['cargo', 'hauler', 'transport', 'utility', 'support'],
  exploration: ['scanner', 'sensor', 'utility', 'survey', 'exploration'],
  refining: ['refinery', 'industrial', 'power', 'cooler'],
  scouting: ['sensor', 'scanner', 'recon', 'survey', 'stealth'],
  racing: ['race', 'speed', 'cooler', 'quantum'],
  support: ['utility', 'support', 'medical', 'scanner'],
};

function textValue(value: unknown): string {
  return String(value || '').trim();
}

export function slugifyShipName(value: string): string {
  return textValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeManufacturer(value: unknown): string {
  return textValue(value).replace(/\s{2,}/g, ' ');
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeArray<T = GenericRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function recordValue(value: unknown): GenericRecord {
  return value && typeof value === 'object' ? value as GenericRecord : {};
}

function statsValue(record: GenericRecord): GenericRecord {
  return recordValue(record.stats_json);
}

function parseSize(rawValue: unknown, fallbackText = ''): number {
  const direct = numberValue(rawValue);
  if (direct > 0) {
    return direct;
  }

  const source = `${textValue(rawValue)} ${fallbackText}`;
  const match = source.match(/\b(?:size|s)\s*([0-9]+)\b/i) || source.match(/\b([0-9])\b/);
  return match ? numberValue(match[1]) : 0;
}

function inferSlotType(record: GenericRecord): string {
  const joined = [
    textValue(record.name),
    textValue(record.item_name),
    textValue(record.type),
    textValue(record.category),
    textValue(statsValue(record).class),
    textValue(statsValue(record).description),
  ].join(' ').toLowerCase();

  if (joined.includes('missile')) return 'missile';
  if (joined.includes('quantum')) return 'quantum-drive';
  if (joined.includes('shield')) return 'shield';
  if (joined.includes('cooler')) return 'cooler';
  if (joined.includes('power')) return 'power-plant';
  if (joined.includes('scanner') || joined.includes('sensor')) return 'sensor';
  if (joined.includes('mining turret')) return 'mining-turret';
  if (joined.includes('mining')) return 'mining-arm';
  if (joined.includes('turret')) return 'turret';
  if (
    joined.includes('weapon')
    || joined.includes('cannon')
    || joined.includes('repeater')
    || joined.includes('laser')
    || joined.includes('ballistic')
    || joined.includes('gatling')
  ) {
    return 'weapon';
  }
  return 'utility';
}

function inferRoleKeywords(record: GenericRecord, slotType: string): string[] {
  const joined = [
    textValue(record.name),
    textValue(record.item_name),
    textValue(record.type),
    textValue(record.category),
    textValue(statsValue(record).description),
  ].join(' ').toLowerCase();

  const matches = new Set<string>();
  Object.entries(ROLE_KEYWORDS).forEach(([role, keywords]) => {
    if (keywords.some((keyword) => joined.includes(keyword))) {
      matches.add(role);
    }
  });

  if (slotType === 'weapon' || slotType === 'turret' || slotType === 'missile') matches.add('combat');
  if (slotType === 'mining-arm' || slotType === 'mining-turret') matches.add('mining');
  if (slotType === 'sensor') matches.add('scouting');
  if (slotType === 'utility') matches.add('support');
  if (slotType === 'quantum-drive') matches.add('hauling');
  if (slotType === 'cooler' || slotType === 'power-plant') matches.add('support');

  return Array.from(matches);
}

export function getSupportedShipManifestBySlug(slug: string): SupportedShipManifest | null {
  const normalized = slugifyShipName(slug);
  return SHIP_MANIFEST.find((entry) => {
    const entrySlug = slugifyShipName(entry.slug);
    const entryName = slugifyShipName(entry.display_name);
    return entrySlug === normalized
      || entryName === normalized
      || entrySlug.endsWith(normalized)
      || normalized.endsWith(entrySlug);
  }) || null;
}

export const MISSION_ROLES = ['mining', 'combat', 'hauling', 'exploration', 'refining', 'scouting', 'racing', 'support'] as const;
export const UNIT_TYPE_TARGETS: Record<string, Record<string, number>> = {
  SQUAD: { mining: 1, combat: 2, hauling: 1, exploration: 1, refining: 0, scouting: 1, racing: 0, support: 1 },
  WING: { mining: 2, combat: 4, hauling: 2, exploration: 1, refining: 1, scouting: 2, racing: 1, support: 2 },
  FLEET: { mining: 4, combat: 8, hauling: 4, exploration: 2, refining: 2, scouting: 3, racing: 1, support: 4 },
};

const AVAILABILITY_SCORE_BY_STATUS: Record<string, number> = {
  AVAILABLE: 100,
  READY: 100,
  ASSIGNED: 65,
  PLANNED: 65,
  MAINTENANCE: 25,
  SHORTFALL: 25,
  UNAVAILABLE: 25,
  DESTROYED: 0,
  ARCHIVED: 0,
};

function jsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function normalizeComponentKey(value: unknown): string {
  return textValue(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => textValue(value)).filter(Boolean)));
}

function safeDateValue(value: unknown): string | null {
  const normalized = textValue(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function safeListEntity(base44: Base44Client, entityNames: string[], sortField = '-created_date', limit = 500): Promise<GenericRecord[]> {
  for (const entityName of entityNames) {
    try {
      const entity = (base44.asServiceRole.entities as Record<string, any>)?.[entityName];
      if (!entity?.list) continue;
      const result = await entity.list(sortField, limit);
      if (Array.isArray(result)) {
        return result as GenericRecord[];
      }
    } catch {
      // entity missing or inaccessible in this deployment
    }
  }
  return [];
}

async function safeFilterEntity(base44: Base44Client, entityNames: string[], filter: Record<string, unknown>): Promise<GenericRecord[]> {
  for (const entityName of entityNames) {
    try {
      const entity = (base44.asServiceRole.entities as Record<string, any>)?.[entityName];
      if (!entity?.filter) continue;
      const result = await entity.filter(filter);
      if (Array.isArray(result)) {
        return result as GenericRecord[];
      }
    } catch {
      // entity missing or inaccessible in this deployment
    }
  }
  return [];
}

function flattenManifestSlots(manifest: SupportedShipManifest): SupportedShipManifest['sections'][number]['slots'] {
  return manifest.sections.flatMap((section) => safeArray(section.slots));
}

function defaultRoleTargets(unitType: string): Record<string, number> {
  const resolvedType = textValue(unitType).toUpperCase();
  return { ...(UNIT_TYPE_TARGETS[resolvedType] || UNIT_TYPE_TARGETS.SQUAD) };
}

function resolveAvailabilityScore(status: unknown): number {
  return AVAILABILITY_SCORE_BY_STATUS[textValue(status).toUpperCase()] ?? 65;
}

function normalizeRoleCollection(values: unknown, fallback: string[] = []): string[] {
  const resolved = Array.isArray(values) ? values : typeof values === 'string' ? values.split(/[|,]/) : fallback;
  return uniqueValues(resolved.map((value) => textValue(value).toLowerCase()));
}

function normalizeVehicleRecord(record: GenericRecord): GenericRecord {
  const stats = statsValue(record);
  const displayName = textValue(record.name);
  const shipSlug = slugifyShipName(displayName);
  const supported = getSupportedShipManifestBySlug(shipSlug);

  return {
    id: textValue(record.id),
    ship_slug: supported?.slug || shipSlug,
    name: displayName,
    manufacturer: normalizeManufacturer(record.manufacturer || supported?.manufacturer),
    ship_class: textValue(stats.size || record.ship_class || supported?.ship_class || 'OTHER').toUpperCase(),
    role: textValue(stats.role || stats.focus || supported?.role || 'GENERAL').toUpperCase(),
    viewer_asset_key: supported?.viewer_asset_key || shipSlug,
    cargo_scu: numberValue(record.cargo_scu || stats.cargo_scu),
    crew_min: numberValue(stats.crew_min),
    crew_max: numberValue(stats.crew_max || stats.crew_size || 1),
    speed_scm: numberValue(stats.speed_scm),
    speed_max: numberValue(stats.speed_max),
    mass: numberValue(stats.mass),
    shield_hp: numberValue(stats.shields || stats.shield_hp),
    hull_hp: numberValue(stats.hull_hp),
    role_tags: uniqueValues([...(supported?.role_tags || []), ...normalizeRoleCollection(record.role_tags), textValue(stats.role).toLowerCase(), textValue(stats.focus).toLowerCase()]),
    supported: Boolean(supported),
    support_mode: supported ? 'editable' : 'read_only',
    manifest_version: supported ? FLEET_MANIFEST_VERSION : null,
    sections: supported?.sections || [],
    default_loadout: supported?.default_loadout || [],
    stats_json: stats,
    raw: record,
  };
}

function buildOwnedItemIndex(items: GenericRecord[]) {
  const index = new Map<string, { quantity: number; records: GenericRecord[] }>();
  items.forEach((record) => {
    const name = normalizeComponentKey(record.item_name || record.name);
    if (!name) return;
    const current = index.get(name) || { quantity: 0, records: [] };
    current.quantity += numberValue(record.quantity || 0);
    current.records.push(record);
    index.set(name, current);
  });
  return index;
}

function normalizeComponentRecord(record: GenericRecord, ownedIndex: ReturnType<typeof buildOwnedItemIndex>): GenericRecord {
  const stats = statsValue(record);
  const name = textValue(record.name || record.item_name);
  const slotType = inferSlotType(record);
  const slotSize = parseSize(stats.size || record.size, `${name} ${textValue(record.category)}`);
  const buyLocations = uniqueValues(safeArray<string>(jsonValue(record.buy_locations_json, [])).map((value) => textValue(value)));
  const sourceLocations = uniqueValues(safeArray<string>(jsonValue(record.source_locations_json, [])).map((value) => textValue(value)));
  const ownership = ownedIndex.get(normalizeComponentKey(name));

  return {
    id: textValue(record.id) || textValue(record.wiki_id) || name,
    wiki_id: textValue(record.wiki_id),
    name,
    manufacturer: normalizeManufacturer(stats.manufacturer || record.manufacturer),
    slot_type: slotType,
    slot_size: slotSize,
    grade: textValue(stats.grade || record.grade).toUpperCase(),
    class_rating: textValue(stats.class || record.class).toUpperCase(),
    description: textValue(stats.description || record.description),
    role_keywords: inferRoleKeywords(record, slotType),
    buy_locations: buyLocations,
    source_locations: sourceLocations,
    is_owned: Boolean(ownership?.quantity),
    owned_quantity: numberValue(ownership?.quantity),
    is_buyable: buyLocations.length > 0 || sourceLocations.length > 0,
    stats_json: stats,
    raw: record,
  };
}

function componentMatchesSlot(component: GenericRecord, slot: GenericRecord): boolean {
  const expectedType = textValue(slot.slot_type).toLowerCase();
  const expectedSize = numberValue(slot.slot_size);
  const componentType = textValue(component.slot_type).toLowerCase();
  const componentSize = numberValue(component.slot_size);
  const compatibleTypes = SLOT_TYPE_COMPATIBILITY[expectedType] || [expectedType];

  return compatibleTypes.includes(componentType)
    && (!expectedSize || !componentSize || componentSize === expectedSize);
}

function matchScoreForSlot(component: GenericRecord, slot: GenericRecord, ship: GenericRecord): number {
  let score = 0;
  if (componentMatchesSlot(component, slot)) score += 100;
  if (numberValue(component.owned_quantity) > 0) score += 25;
  if (component.is_buyable === true) score += 12;
  if (normalizeRoleCollection(component.role_keywords).some((value) => normalizeRoleCollection(ship.role_tags).includes(value))) score += 10;

  const grade = textValue(component.grade);
  if (grade === 'A') score += 10;
  else if (grade === 'B') score += 7;
  else if (grade === 'C') score += 4;

  return score;
}

function resolveSyntheticComponent(entry: GenericRecord): GenericRecord {
  return {
    id: textValue(entry.hardpoint_id || entry.component_name),
    name: textValue(entry.component_name),
    manufacturer: textValue(entry.manufacturer),
    slot_type: textValue(entry.slot_type),
    slot_size: numberValue(entry.slot_size),
    grade: 'STOCK',
    class_rating: 'STOCK',
    role_keywords: inferRoleKeywords(entry, textValue(entry.slot_type)),
    buy_locations: [],
    source_locations: [],
    is_owned: false,
    owned_quantity: 0,
    is_buyable: false,
    synthetic_stock: true,
  };
}

function resolveBaselineComponent(entry: GenericRecord, components: GenericRecord[]): GenericRecord {
  const componentName = normalizeComponentKey(entry.component_name);
  const slotType = textValue(entry.slot_type);
  const slotSize = numberValue(entry.slot_size);
  const directMatch = components.find((component) => normalizeComponentKey(component.name) === componentName);
  const fallback = directMatch || components
    .filter((component) => textValue(component.slot_type) === slotType && numberValue(component.slot_size) === slotSize)
    .sort((left, right) => matchScoreForSlot(right, entry, { role_tags: [] }) - matchScoreForSlot(left, entry, { role_tags: [] }))[0];
  const resolved = fallback || resolveSyntheticComponent(entry);

  return {
    hardpoint_id: textValue(entry.hardpoint_id || entry.id),
    label: textValue(entry.label || entry.hardpoint_id),
    slot_type,
    slot_size: slotSize,
    component_id: textValue(resolved.id),
    component_name: textValue(resolved.name || entry.component_name),
    manufacturer: textValue(entry.manufacturer || resolved.manufacturer),
    is_owned: Boolean(resolved.is_owned),
    owned_quantity: numberValue(resolved.owned_quantity),
    buy_locations: safeArray(resolved.buy_locations),
    source_locations: safeArray(resolved.source_locations),
    role_keywords: normalizeRoleCollection(resolved.role_keywords),
    grade: textValue(resolved.grade),
    class_rating: textValue(resolved.class_rating),
  };
}

function coerceLoadoutRecord(value: unknown): GenericRecord[] {
  const records = safeArray<GenericRecord>(jsonValue(value, []));
  return records.map((record) => ({
    hardpoint_id: textValue(record.hardpoint_id || record.id),
    label: textValue(record.label || record.name || record.hardpoint_id),
    slot_type: textValue(record.slot_type || record.type),
    slot_size: numberValue(record.slot_size || record.size),
    component_id: textValue(record.component_id || record.id),
    component_name: textValue(record.component_name || record.name),
    manufacturer: textValue(record.manufacturer),
    is_owned: Boolean(record.is_owned),
    buy_locations: safeArray(record.buy_locations),
    source_locations: safeArray(record.source_locations),
    role_keywords: normalizeRoleCollection(record.role_keywords),
  }));
}

function scoreLoadout(baselineSlots: GenericRecord[], equippedLoadout: GenericRecord[], availabilityStatus: string) {
  const slotCount = baselineSlots.length || 1;
  const equippedMap = new Map(equippedLoadout.map((entry) => [textValue(entry.hardpoint_id), entry]));
  const fitCount = baselineSlots.filter((slot) => {
    const equipped = equippedMap.get(textValue(slot.hardpoint_id || slot.id));
    return equipped && textValue(equipped.component_name || equipped.name);
  }).length;

  const sourcedCount = equippedLoadout.filter((entry) => entry.is_owned || safeArray(entry.buy_locations).length > 0 || safeArray(entry.source_locations).length > 0).length;
  const fitScore = Math.round((fitCount / slotCount) * 100);
  const sourceScore = equippedLoadout.length ? Math.round((sourcedCount / equippedLoadout.length) * 100) : 0;
  const availabilityScore = resolveAvailabilityScore(availabilityStatus);
  const readinessScore = Math.round((0.45 * fitScore) + (0.25 * sourceScore) + (0.30 * availabilityScore));

  return { fit_score: fitScore, source_score: sourceScore, availability_score: availabilityScore, readiness_score: readinessScore };
}

function computeDeltaStats(ship: GenericRecord, baselineLoadout: GenericRecord[], equippedLoadout: GenericRecord[]) {
  const baseline = {
    shield: numberValue(ship.shield_hp || ship.stats_json?.shields),
    hull: numberValue(ship.hull_hp || ship.stats_json?.hull_hp || ship.mass * 0.6),
    fuel: Math.max(10, numberValue(ship.mass) / 200),
    cargo: numberValue(ship.cargo_scu),
    crew: Math.max(1, numberValue(ship.crew_max || ship.stats_json?.crew_max)),
    speed: numberValue(ship.speed_max || ship.stats_json?.speed_max),
    quantum: Math.max(20, numberValue(ship.speed_scm || ship.stats_json?.speed_scm)),
  };

  const modifier = equippedLoadout.reduce((acc, entry) => {
    const slotType = textValue(entry.slot_type);
    const size = numberValue(entry.slot_size) || 1;
    const grade = textValue(entry.grade || '').toUpperCase();
    const gradeBonus = grade === 'A' ? 1.08 : grade === 'B' ? 1.05 : grade === 'C' ? 1.02 : 1;

    if (slotType === 'shield') acc.shield += 8 * size * gradeBonus;
    if (slotType === 'power-plant') acc.hull += 2 * size * gradeBonus;
    if (slotType === 'cooler') acc.speed += 1.5 * size * gradeBonus;
    if (slotType === 'quantum-drive') acc.quantum += 4 * size * gradeBonus;
    if (slotType === 'weapon' || slotType === 'turret' || slotType === 'missile') acc.hull += 1.2 * size;
    if (slotType === 'sensor' || slotType === 'utility') acc.crew += 0.1 * size;
    if (slotType === 'mining-arm' || slotType === 'mining-turret') acc.cargo += 1 * size;
    return acc;
  }, { shield: 0, hull: 0, fuel: 0, cargo: 0, crew: 0, speed: 0, quantum: 0 });

  const baselineCount = baselineLoadout.length || 1;
  const equippedCount = equippedLoadout.length || 1;
  const completionFactor = Math.min(1.12, Math.max(0.72, equippedCount / baselineCount));

  return {
    baseline,
    current: {
      shield: Math.round(baseline.shield * completionFactor + modifier.shield),
      hull: Math.round(baseline.hull * completionFactor + modifier.hull),
      fuel: Math.round((baseline.fuel + modifier.fuel) * 10) / 10,
      cargo: Math.round(baseline.cargo + modifier.cargo),
      crew: Math.round((baseline.crew + modifier.crew) * 10) / 10,
      speed: Math.round(baseline.speed * completionFactor + modifier.speed),
      quantum: Math.round(baseline.quantum * completionFactor + modifier.quantum),
    },
  };
}

function buildShoppingList(baselineSlots: GenericRecord[], equippedLoadout: GenericRecord[]) {
  const equippedMap = new Map(equippedLoadout.map((entry) => [textValue(entry.hardpoint_id), entry]));
  return baselineSlots.flatMap((slot) => {
    const equipped = equippedMap.get(textValue(slot.hardpoint_id || slot.id));
    if (!equipped) {
      return [{
        hardpoint_id: textValue(slot.hardpoint_id || slot.id),
        label: textValue(slot.label || slot.name),
        slot_type: textValue(slot.slot_type),
        slot_size: numberValue(slot.slot_size),
        reason: 'missing',
      }];
    }

    if (equipped.is_owned || safeArray(equipped.buy_locations).length > 0 || safeArray(equipped.source_locations).length > 0) {
      return [];
    }

    return [{
      hardpoint_id: textValue(slot.hardpoint_id || slot.id),
      label: textValue(slot.label || slot.name),
      slot_type: textValue(slot.slot_type),
      slot_size: numberValue(slot.slot_size),
      component_name: textValue(equipped.component_name || equipped.name),
      reason: 'unsourced',
    }];
  });
}

function legacyHardpointsToLoadout(value: unknown): GenericRecord[] {
  const record = recordValue(value);
  return Object.entries(record).map(([hardpointId, entry]) => {
    const resolved = recordValue(entry);
    return {
      hardpoint_id: hardpointId,
      label: textValue(resolved.label || resolved.name || hardpointId),
      slot_type: textValue(resolved.slot_type || resolved.type),
      slot_size: numberValue(resolved.slot_size || resolved.size),
      component_id: textValue(resolved.component_id || resolved.id),
      component_name: textValue(resolved.component_name || resolved.name),
      manufacturer: textValue(resolved.manufacturer),
      is_owned: Boolean(resolved.is_owned),
      buy_locations: safeArray(resolved.buy_locations),
      source_locations: safeArray(resolved.source_locations),
      role_keywords: normalizeRoleCollection(resolved.role_keywords),
      grade: textValue(resolved.grade),
    };
  });
}

function decorateLoadout(entries: GenericRecord[], components: GenericRecord[]): GenericRecord[] {
  return entries.map((entry) => {
    const componentId = textValue(entry.component_id || entry.id);
    const componentName = normalizeComponentKey(entry.component_name || entry.name);
    const match = components.find((component) =>
      textValue(component.id) === componentId
      || normalizeComponentKey(component.name) === componentName
    );

    return {
      ...entry,
      id: componentId || textValue(entry.hardpoint_id),
      component_id: componentId || textValue(match?.id),
      component_name: textValue(entry.component_name || entry.name || match?.name),
      manufacturer: textValue(entry.manufacturer || match?.manufacturer),
      slot_type: textValue(entry.slot_type || match?.slot_type),
      slot_size: numberValue(entry.slot_size || match?.slot_size),
      is_owned: Boolean(entry.is_owned || match?.is_owned),
      owned_quantity: numberValue(entry.owned_quantity || match?.owned_quantity),
      buy_locations: safeArray(entry.buy_locations).length ? safeArray(entry.buy_locations) : safeArray(match?.buy_locations),
      source_locations: safeArray(entry.source_locations).length ? safeArray(entry.source_locations) : safeArray(match?.source_locations),
      role_keywords: normalizeRoleCollection(safeArray(entry.role_keywords).length ? entry.role_keywords : match?.role_keywords),
      grade: textValue(entry.grade || match?.grade),
      class_rating: textValue(entry.class_rating || match?.class_rating),
    };
  });
}

function normalizeFleetBuildRecord(record: GenericRecord, ships: GenericRecord[], components: GenericRecord[]): GenericRecord {
  const shipSlug = textValue(record.ship_slug) || slugifyShipName(textValue(record.ship_name));
  const ship = ships.find((entry) => textValue(entry.ship_slug) === shipSlug) || ships.find((entry) => slugifyShipName(textValue(entry.name)) === shipSlug) || null;
  const manifest = getSupportedShipManifestBySlug(shipSlug);
  const baselineTemplate = safeArray<GenericRecord>(manifest?.default_loadout || []);
  const baselineLoadout = decorateLoadout(
    coerceLoadoutRecord(record.baseline_loadout_json).length
      ? coerceLoadoutRecord(record.baseline_loadout_json)
      : baselineTemplate.map((entry) => resolveBaselineComponent(entry, components)),
    components,
  );
  const equippedLoadout = decorateLoadout(
    coerceLoadoutRecord(record.equipped_loadout_json).length
      ? coerceLoadoutRecord(record.equipped_loadout_json)
      : legacyHardpointsToLoadout(record.hardpoints),
    components,
  );
  const deltaStats = computeDeltaStats(ship || {}, baselineLoadout, equippedLoadout);

  return {
    id: textValue(record.id),
    ship_slug: shipSlug,
    ship_vehicle_id: textValue(record.ship_vehicle_id || ship?.id),
    ship_name: textValue(record.ship_name || ship?.name || manifest?.display_name),
    ship_class: textValue(ship?.ship_class || manifest?.ship_class || ''),
    viewer_asset_key: textValue(ship?.viewer_asset_key || manifest?.viewer_asset_key || shipSlug),
    build_name: textValue(record.build_name || record.name || `${textValue(ship?.name || manifest?.display_name)} Loadout`),
    created_by_user_id: textValue(record.created_by_user_id),
    created_by_callsign: textValue(record.created_by_callsign),
    role_tag: textValue(record.role_tag || manifest?.role).toUpperCase(),
    canonical_level: textValue(record.canonical_level || (record.is_org_canonical ? 'FLEET' : 'PERSONAL')).toUpperCase(),
    manifest_version: textValue(record.manifest_version || (manifest ? FLEET_MANIFEST_VERSION : '')),
    baseline_loadout_json: baselineLoadout,
    equipped_loadout_json: equippedLoadout,
    delta_stats_json: record.delta_stats_json || deltaStats,
    patch_locked: Boolean(record.patch_locked),
    is_org_canonical: Boolean(record.is_org_canonical),
    updated_at: safeDateValue(record.updated_date || record.created_date),
    raw: record,
  };
}

function chartBuckets(items: GenericRecord[], key: string) {
  const bucket = new Map<string, number>();
  items.forEach((item) => {
    const label = textValue(item[key] || 'UNSPECIFIED').toUpperCase();
    bucket.set(label, (bucket.get(label) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
}

function aggregateRoleCoverage(assignments: GenericRecord[], units: GenericRecord[]) {
  return units.map((unit) => {
    const unitId = textValue(unit.id);
    const roleTargets = recordValue(jsonValue(unit.role_targets_json, defaultRoleTargets(textValue(unit.unit_type))));
    const relevantAssignments = assignments.filter((assignment) => textValue(assignment.unit_id) === unitId);
    const counts = Object.fromEntries(MISSION_ROLES.map((role) => [role, 0]));
    relevantAssignments.forEach((assignment) => {
      const missionRole = textValue(assignment.mission_role).toLowerCase();
      if (missionRole && counts[missionRole] !== undefined) {
        counts[missionRole] += 1;
      }
    });

    return {
      unit_id: unitId,
      unit_name: textValue(unit.name || unit.label || unit.unit_type),
      counts,
      targets: roleTargets,
    };
  });
}

export async function buildFleetCatalog(base44: Base44Client, filters: Record<string, unknown> = {}) {
  const [vehicleRecords, itemRecords, armoryRecords] = await Promise.all([
    safeListEntity(base44, ['GameCacheVehicle'], 'name', 2500),
    safeListEntity(base44, ['GameCacheItem', 'game_cache_items'], 'name', 6000),
    safeListEntity(base44, ['ArmoryItem'], '-last_restocked_at', 2000),
  ]);

  const ownedIndex = buildOwnedItemIndex(armoryRecords);
  const ships = vehicleRecords.map((record) => normalizeVehicleRecord(record));
  const components = itemRecords.map((record) => normalizeComponentRecord(record, ownedIndex));

  const shipQuery = textValue(filters.shipQuery).toLowerCase();
  const componentQuery = textValue(filters.componentQuery).toLowerCase();
  const shipClass = textValue(filters.shipClass).toUpperCase();
  const manufacturer = textValue(filters.manufacturer).toUpperCase();
  const supportedOnly = filters.supportedOnly === true;
  const shipSlug = textValue(filters.shipSlug);
  const slotType = textValue(filters.slotType).toLowerCase();
  const slotSize = numberValue(filters.slotSize);
  const ownedOnly = filters.ownedOnly === true;
  const buyableOnly = filters.buyableOnly === true;

  const filteredShips = ships.filter((ship) => {
    if (shipQuery && !`${textValue(ship.name)} ${textValue(ship.manufacturer)} ${textValue(ship.role)}`.toLowerCase().includes(shipQuery)) return false;
    if (shipClass && textValue(ship.ship_class) !== shipClass) return false;
    if (manufacturer && textValue(ship.manufacturer).toUpperCase() !== manufacturer) return false;
    if (supportedOnly && ship.supported !== true) return false;
    if (shipSlug && textValue(ship.ship_slug) !== shipSlug) return false;
    return true;
  });

  const filteredComponents = components
    .filter((component) => {
      if (componentQuery && !`${textValue(component.name)} ${textValue(component.manufacturer)} ${safeArray(component.role_keywords).join(' ')}`.toLowerCase().includes(componentQuery)) return false;
      if (slotType && textValue(component.slot_type) !== slotType) return false;
      if (slotSize && numberValue(component.slot_size) !== slotSize) return false;
      if (manufacturer && textValue(component.manufacturer).toUpperCase() !== manufacturer) return false;
      if (ownedOnly && component.is_owned !== true) return false;
      if (buyableOnly && component.is_buyable !== true) return false;
      return true;
    })
    .sort((left, right) => {
      const ownedDelta = numberValue(right.owned_quantity) - numberValue(left.owned_quantity);
      if (ownedDelta) return ownedDelta;
      return textValue(left.name).localeCompare(textValue(right.name));
    });

  return {
    ok: true,
    manifest_version: FLEET_MANIFEST_VERSION,
    ships: filteredShips,
    components: filteredComponents,
    support: filteredShips.map((ship) => ({
      ship_slug: ship.ship_slug,
      display_name: ship.name,
      supported: ship.supported,
      support_mode: ship.support_mode,
      viewer_asset_key: ship.viewer_asset_key,
      manifest_version: ship.manifest_version,
    })),
    counts: {
      ships: filteredShips.length,
      components: filteredComponents.length,
      owned_components: filteredComponents.filter((component) => component.is_owned).length,
      supported_ships: filteredShips.filter((ship) => ship.supported).length,
    },
  };
}

export async function buildFleetPlanningSnapshot(base44: Base44Client, scenarioId: string | null) {
  const catalog = await buildFleetCatalog(base44, {});
  const [scenarioRecords, unitRecords, assignmentRecords, buildRecords, orgShips, userRecords] = await Promise.all([
    scenarioId ? safeFilterEntity(base44, ['FleetScenario'], { id: scenarioId }) : safeListEntity(base44, ['FleetScenario'], '-updated_date', 100),
    safeListEntity(base44, ['OrgUnit'], 'display_order', 250),
    scenarioId ? safeFilterEntity(base44, ['FleetScenarioAssignment'], { scenario_id: scenarioId }) : safeListEntity(base44, ['FleetScenarioAssignment'], '-updated_date', 500),
    safeListEntity(base44, ['FleetBuild'], '-updated_date', 500),
    safeListEntity(base44, ['OrgShip'], 'name', 500),
    safeListEntity(base44, ['NexusUser'], 'callsign', 500),
  ]);

  const scenario = scenarioRecords[0] || null;
  const shipsById = new Map(orgShips.map((record) => [textValue(record.id), record]));
  const usersById = new Map(userRecords.map((record) => [textValue(record.id), record]));
  const normalizedBuilds = buildRecords.map((record) => normalizeFleetBuildRecord(record, catalog.ships, catalog.components));
  const buildsById = new Map(normalizedBuilds.map((record) => [textValue(record.id), record]));

  const units = unitRecords.map((record) => ({
    id: textValue(record.id),
    name: textValue(record.name || record.label || record.unit_type),
    unit_type: textValue(record.unit_type || 'SQUAD').toUpperCase(),
    parent_unit_id: textValue(record.parent_unit_id),
    lead_user_id: textValue(record.lead_user_id),
    role_targets_json: jsonValue(record.role_targets_json, defaultRoleTargets(textValue(record.unit_type || 'SQUAD'))),
    display_order: numberValue(record.display_order),
    active: record.active !== false,
  }));

  const assignments = assignmentRecords.map((record) => {
    const build = buildsById.get(textValue(record.fleet_build_id));
    const orgShip = shipsById.get(textValue(record.org_ship_id)) || {};
    const baselineLoadout = safeArray<GenericRecord>(build?.baseline_loadout_json || []);
    const equippedLoadout = safeArray<GenericRecord>(record.override_loadout_json ? coerceLoadoutRecord(record.override_loadout_json) : build?.equipped_loadout_json || []);
    const scoring = scoreLoadout(baselineLoadout, equippedLoadout, textValue(orgShip.status || record.status || 'PLANNED'));
    const shoppingList = buildShoppingList(baselineLoadout, equippedLoadout);
    const pilot = usersById.get(textValue(record.pilot_user_id)) || {};

    return {
      id: textValue(record.id),
      scenario_id: textValue(record.scenario_id),
      unit_id: textValue(record.unit_id),
      org_ship_id: textValue(record.org_ship_id),
      fleet_build_id: textValue(record.fleet_build_id),
      pilot_user_id: textValue(record.pilot_user_id),
      pilot_callsign: textValue(pilot.callsign),
      mission_role: textValue(record.mission_role || build?.role_tag).toLowerCase(),
      position_label: textValue(record.position_label),
      status: textValue(record.status || orgShip.status || 'PLANNED').toUpperCase(),
      fit_score: numberValue(record.fit_score) || scoring.fit_score,
      source_score: numberValue(record.source_score) || scoring.source_score,
      availability_score: numberValue(record.availability_score) || scoring.availability_score,
      readiness_score: numberValue(record.readiness_score) || scoring.readiness_score,
      shopping_list_json: shoppingList,
      notes: textValue(record.notes),
      updated_by_user_id: textValue(record.updated_by_user_id),
      updated_at: safeDateValue(record.updated_date || record.created_date),
      ship_name: textValue(orgShip.name || build?.ship_name),
      ship_slug: textValue(build?.ship_slug),
      ship_class: textValue(build?.ship_class),
      build_name: textValue(build?.build_name),
    };
  });

  const unitsForScenario = units.filter((unit) => unit.active !== false);
  const readinessByUnit = unitsForScenario.map((unit) => {
    const relevant = assignments.filter((assignment) => assignment.unit_id === unit.id);
    const targetedRoles = recordValue(unit.role_targets_json);
    const readiness = relevant.length
      ? Math.round(relevant.reduce((sum, assignment) => sum + numberValue(assignment.readiness_score), 0) / relevant.length)
      : 0;
    return {
      unit_id: unit.id,
      unit_name: unit.name,
      unit_type: unit.unit_type,
      readiness_score: readiness,
      targeted_roles: targetedRoles,
      assignment_count: relevant.length,
    };
  });

  const roleCoverage = aggregateRoleCoverage(assignments, unitsForScenario);
  const classDistribution = chartBuckets(assignments.map((assignment) => ({ ship_class: assignment.ship_class || 'OTHER' })), 'ship_class');
  const shortfalls = assignments.flatMap((assignment) => safeArray<GenericRecord>(assignment.shopping_list_json).map((item) => ({
    unit_id: assignment.unit_id,
    unit_name: readinessByUnit.find((unit) => unit.unit_id === assignment.unit_id)?.unit_name || 'UNASSIGNED',
    mission_role: assignment.mission_role || 'unspecified',
    slot_type: textValue(item.slot_type),
    component_name: textValue(item.component_name),
    reason: textValue(item.reason || 'missing'),
  })));
  const shoppingTotals = chartBuckets(shortfalls.map((item) => ({ label: item.component_name || item.slot_type || 'MISSING' })), 'label');

  return {
    ok: true,
    entities_ready: {
      scenarios: scenarioRecords.length > 0 || scenarioId === null,
      units: unitRecords.length > 0,
      assignments: assignmentRecords.length > 0 || scenarioId === null,
    },
    scenario,
    units: unitsForScenario,
    assignments,
    builds: normalizedBuilds,
    aggregates: {
      readiness_by_unit: readinessByUnit,
      role_coverage: roleCoverage,
      class_distribution: classDistribution,
      component_shortfalls: shortfalls,
      shopping_totals: shoppingTotals,
      standardization_score: normalizedBuilds.length
        ? Math.round((normalizedBuilds.filter((build) => build.is_org_canonical || build.canonical_level !== 'PERSONAL').length / normalizedBuilds.length) * 100)
        : 0,
    },
    charts: {
      readiness_heatmap: readinessByUnit,
      role_radar: roleCoverage,
      class_treemap: classDistribution,
      shortfall_bars: shortfalls,
      shopping_totals: shoppingTotals,
    },
  };
}
