/**
 * Shared ship loadout data for the mining circuit planner.
 * Used by both the planner config and the results panel.
 */

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