/**
 * Shared ship loadout data for the mining circuit planner.
 * Used by both the planner config and the results panel.
 * Hardcoded fallbacks are merged with live GameCacheVehicle data
 * via useShipLoadouts() hook.
 */
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';

export const SHIP_LOADOUTS = {
  PROSPECTOR:    { key: 'PROSPECTOR',    label: 'Prospector',      class: 'MINER',    scu: 32,  crew: 1, fuel_capacity: 1750,  fuel_rate: 0.42, qt_speed: 75.6  },
  MOLE:          { key: 'MOLE',          label: 'ARGO MOLE',       class: 'MINER',    scu: 96,  crew: 4, fuel_capacity: 5200,  fuel_rate: 0.68, qt_speed: 75.6  },
  ORION:         { key: 'ORION',         label: 'RSI Orion',       class: 'MINER',    scu: 384, crew: 7, fuel_capacity: 12000, fuel_rate: 1.20, qt_speed: 55.2  },
  CUTLASS_BLACK: { key: 'CUTLASS_BLACK', label: 'Cutlass Black',   class: 'HAULER',   scu: 46,  crew: 2, fuel_capacity: 2200,  fuel_rate: 0.35, qt_speed: 75.6  },
  FREELANCER:    { key: 'FREELANCER',    label: 'Freelancer',      class: 'HAULER',   scu: 66,  crew: 2, fuel_capacity: 3000,  fuel_rate: 0.45, qt_speed: 75.6  },
  CATERPILLAR:   { key: 'CATERPILLAR',   label: 'Caterpillar',     class: 'HAULER',   scu: 576, crew: 5, fuel_capacity: 8000,  fuel_rate: 0.95, qt_speed: 55.2  },
  C2_HERCULES:   { key: 'C2_HERCULES',   label: 'C2 Hercules',     class: 'HAULER',   scu: 696, crew: 3, fuel_capacity: 9500,  fuel_rate: 1.10, qt_speed: 55.2  },
  VULTURE:       { key: 'VULTURE',       label: 'Vulture',         class: 'SALVAGER', scu: 12,  crew: 1, fuel_capacity: 1400,  fuel_rate: 0.30, qt_speed: 75.6  },
};

export const SHIP_OPTIONS = Object.values(SHIP_LOADOUTS);

/** Classify a vehicle by name/role into a broad class */
function classifyShip(vehicle) {
  const name = (vehicle.name || '').toLowerCase();
  const role = (vehicle.stats_json?.role || '').toLowerCase();
  const focus = (vehicle.stats_json?.focus || '').toLowerCase();
  if (role.includes('min') || focus.includes('min') || name.includes('prospector') || name.includes('mole') || name.includes('orion')) return 'MINER';
  if (role.includes('salvag') || focus.includes('salvag') || name.includes('vulture') || name.includes('reclaimer')) return 'SALVAGER';
  if (role.includes('haul') || role.includes('freight') || role.includes('transport') || focus.includes('freight')) return 'HAULER';
  if (role.includes('combat') || role.includes('fight') || focus.includes('fight') || focus.includes('combat')) return 'FIGHTER';
  if (role.includes('med') || focus.includes('med')) return 'MEDICAL';
  if (role.includes('explor') || focus.includes('explor')) return 'EXPLORER';
  return 'OTHER';
}

/** Estimate fuel specs from mass when not available in hardcoded data */
function estimateFuel(vehicle) {
  const mass = vehicle.stats_json?.mass || 0;
  if (mass > 5_000_000) return { fuel_capacity: 10000, fuel_rate: 1.1, qt_speed: 55.2 };
  if (mass > 1_000_000) return { fuel_capacity: 5000, fuel_rate: 0.7, qt_speed: 55.2 };
  if (mass > 200_000) return { fuel_capacity: 3000, fuel_rate: 0.45, qt_speed: 75.6 };
  return { fuel_capacity: 1800, fuel_rate: 0.35, qt_speed: 75.6 };
}

/**
 * useShipLoadouts — merges hardcoded fallback specs with live GameCacheVehicle data.
 * Returns { loadouts: Record<string, ShipSpec>, options: ShipSpec[], loading }
 */
export function useShipLoadouts() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.GameCacheVehicle.list('name', 500)
      .then(v => setVehicles(v || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const { loadouts, options } = useMemo(() => {
    // Start with hardcoded
    const merged = { ...SHIP_LOADOUTS };

    // For each vehicle from FleetYards, update SCU if we have a match, or add new
    vehicles.forEach(v => {
      if (!v.name || (v.cargo_scu || 0) <= 0) return; // skip zero-cargo vehicles
      const key = v.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const existing = Object.values(merged).find(
        s => s.label.toLowerCase() === v.name.toLowerCase()
          || s.key === key
      );
      if (existing) {
        // Update cargo from FleetYards (more authoritative)
        existing.scu = v.cargo_scu;
        const stats = v.stats_json || {};
        if (stats.crew_max > 0) existing.crew = stats.crew_max;
        existing.fleetyards = true;
      } else {
        // Add new ship from FleetYards
        const fuel = estimateFuel(v);
        const stats = v.stats_json || {};
        merged[key] = {
          key,
          label: v.name,
          class: classifyShip(v),
          scu: v.cargo_scu,
          crew: stats.crew_max || stats.crew_min || 1,
          fuel_capacity: fuel.fuel_capacity,
          fuel_rate: fuel.fuel_rate,
          qt_speed: fuel.qt_speed,
          fleetyards: true,
        };
      }
    });

    return { loadouts: merged, options: Object.values(merged) };
  }, [vehicles]);

  return { loadouts, options, loading };
}

/** Recalculate circuit stats for a different ship using existing leg distances */
export function recalcCircuit(legs, ship, depositCount) {
  let totalFuel = 0;
  let totalTravel = 0;
  let totalMining = 0;
  let totalDist = 0;

  const newLegs = legs.map(leg => {
    if (leg.type === 'TRANSIT') {
      const d = leg.distance_mkm || 0;
      const travelSec = ship.qt_speed > 0 ? d / ship.qt_speed : 0;
      const travelMin = Math.ceil(travelSec / 60) + 2;
      const fuel = Math.round(d * ship.fuel_rate * 100);
      totalDist += d;
      totalTravel += travelMin;
      totalFuel += fuel;
      return { ...leg, travel_minutes: travelMin, fuel_units: fuel };
    }
    if (leg.type === 'MINING') {
      totalMining += leg.mining_minutes || 0;
    }
    return leg;
  });

  const fuelPct = ship.fuel_capacity > 0 ? Math.round((totalFuel / ship.fuel_capacity) * 100) : 0;
  const avgQualityPct = (() => {
    const mLegs = newLegs.filter(l => l.type === 'MINING');
    if (mLegs.length === 0) return 0;
    return Math.round(mLegs.reduce((s, l) => s + (l.quality_pct || 0), 0) / mLegs.length);
  })();
  const estYield = Math.min(
    ship.scu,
    depositCount * (ship.scu / Math.max(3, depositCount)) * (avgQualityPct / 70),
  );

  return {
    legs: newLegs,
    summary: {
      total_distance_mkm: Math.round(totalDist * 10) / 10,
      total_travel_minutes: totalTravel,
      total_mining_minutes: totalMining,
      total_session_minutes: totalTravel + totalMining,
      total_fuel_units: totalFuel,
      fuel_capacity: ship.fuel_capacity,
      fuel_usage_pct: fuelPct,
      needs_refuel: fuelPct > 85,
      estimated_yield_scu: Math.round(estYield * 10) / 10,
      cargo_capacity_scu: ship.scu,
      avg_quality_pct: avgQualityPct,
      crew_required: ship.crew,
    },
  };
}