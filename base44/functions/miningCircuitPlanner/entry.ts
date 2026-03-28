import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * miningCircuitPlanner — Aggregates scouted deposits and plans the most
 * efficient mining circuit with estimated travel time, fuel capacity,
 * and per-leg breakdowns for specific ship loadouts.
 */

// ─── Ship loadout database ───────────────────────────────────────────────────
const SHIP_LOADOUTS = {
  PROSPECTOR: {
    label: 'MISC Prospector', class: 'MINER', cargo_scu: 32,
    fuel_capacity: 1750, fuel_rate_per_km: 0.42, cruise_speed_kph: 1220,
    qt_speed_mkm_s: 75.6, mining_capable: true, crew: 1,
    range_km: 4100, notes: 'Solo mining workhorse. Limited cargo.',
  },
  MOLE: {
    label: 'ARGO MOLE', class: 'MINER', cargo_scu: 96,
    fuel_capacity: 5200, fuel_rate_per_km: 0.68, cruise_speed_kph: 945,
    qt_speed_mkm_s: 75.6, mining_capable: true, crew: 4,
    range_km: 7500, notes: 'Multi-crew mining platform. 3 laser turrets.',
  },
  ORION: {
    label: 'RSI Orion', class: 'MINER', cargo_scu: 384,
    fuel_capacity: 12000, fuel_rate_per_km: 1.2, cruise_speed_kph: 780,
    qt_speed_mkm_s: 55.2, mining_capable: true, crew: 7,
    range_km: 10000, notes: 'Capital-class mining. Onboard refinery.',
  },
  CUTLASS_BLACK: {
    label: 'Drake Cutlass Black', class: 'HAULER', cargo_scu: 46,
    fuel_capacity: 2200, fuel_rate_per_km: 0.35, cruise_speed_kph: 1230,
    qt_speed_mkm_s: 75.6, mining_capable: false, crew: 2,
    range_km: 6200, notes: 'Versatile hauler/escort. Popular for small runs.',
  },
  FREELANCER: {
    label: 'MISC Freelancer', class: 'HAULER', cargo_scu: 66,
    fuel_capacity: 3000, fuel_rate_per_km: 0.45, cruise_speed_kph: 1100,
    qt_speed_mkm_s: 75.6, mining_capable: false, crew: 2,
    range_km: 6600, notes: 'Medium hauler. Decent combat capability.',
  },
  CATERPILLAR: {
    label: 'Drake Caterpillar', class: 'HAULER', cargo_scu: 576,
    fuel_capacity: 8000, fuel_rate_per_km: 0.95, cruise_speed_kph: 850,
    qt_speed_mkm_s: 55.2, mining_capable: false, crew: 5,
    range_km: 8400, notes: 'Heavy hauler. Needs escort in contested space.',
  },
  C2_HERCULES: {
    label: 'Crusader C2 Hercules', class: 'HAULER', cargo_scu: 696,
    fuel_capacity: 9500, fuel_rate_per_km: 1.1, cruise_speed_kph: 900,
    qt_speed_mkm_s: 55.2, mining_capable: false, crew: 3,
    range_km: 8600, notes: 'Premier large hauler. Excellent protection.',
  },
  VULTURE: {
    label: 'Drake Vulture', class: 'SALVAGER', cargo_scu: 12,
    fuel_capacity: 1400, fuel_rate_per_km: 0.30, cruise_speed_kph: 1300,
    qt_speed_mkm_s: 75.6, mining_capable: false, crew: 1,
    range_km: 4600, notes: 'Solo salvage craft. Low cargo capacity.',
  },
  ROC: {
    label: 'Greycat ROC', class: 'VEHICLE_MINER', cargo_scu: 0.65,
    fuel_capacity: 0, fuel_rate_per_km: 0, cruise_speed_kph: 0,
    qt_speed_mkm_s: 0, mining_capable: true, crew: 1,
    range_km: 0, notes: 'Ground vehicle. Requires transport ship.',
  },
};

// ─── Location distance approximations (Mkm) ─────────────────────────────────
// Simplified distances between major Star Citizen locations
const LOCATION_DISTANCES = {
  // Stanton system distances (Mkm)
  'Aaron Halo|Yela': 12.5, 'Aaron Halo|Daymar': 14.2, 'Aaron Halo|Cellin': 13.8,
  'Aaron Halo|Aberdeen': 18.4, 'Aaron Halo|Arial': 19.1, 'Aaron Halo|Ita': 20.3,
  'Aaron Halo|Magda': 22.6, 'Aaron Halo|Lyria': 25.8, 'Aaron Halo|Wala': 26.4,
  'Yela|Daymar': 3.2, 'Yela|Cellin': 2.8, 'Daymar|Cellin': 2.1,
  'Aberdeen|Arial': 4.6, 'Aberdeen|Ita': 5.2, 'Arial|Ita': 3.8,
  'Magda|Clio': 6.1, 'Magda|Calliope': 7.8, 'Magda|Euterpe': 8.4,
  'Lyria|Wala': 5.3, 'Cellin|Aberdeen': 22.4, 'Yela|Aberdeen': 24.1,
  'Daymar|Aberdeen': 23.5, 'Aberdeen|Lyria': 32.6, 'Yela|Lyria': 38.2,
  // Stanton to Pyro (via jump point)
  'STANTON|PYRO': 45.0, 'STANTON|NYX': 60.0, 'PYRO|NYX': 35.0,
  // Refinery stations (distance from orbit)
  'CRU-L1|Yela': 8.5, 'CRU-L1|Daymar': 9.2, 'CRU-L1|Cellin': 8.1,
  'ARC-L1|Lyria': 6.8, 'ARC-L1|Wala': 7.4,
  'HUR-L1|Aberdeen': 5.6, 'HUR-L1|Arial': 6.2,
  'HUR-L2|Aberdeen': 8.4, 'MIC-L1|Magda': 7.2,
};

function getDistance(locA, locB) {
  if (!locA || !locB) return 15; // default medium distance
  const a = locA.toUpperCase().trim();
  const b = locB.toUpperCase().trim();
  if (a === b) return 0.5;

  // Check both orderings
  for (const [key, dist] of Object.entries(LOCATION_DISTANCES)) {
    const [p1, p2] = key.split('|');
    if ((a.includes(p1.toUpperCase()) && b.includes(p2.toUpperCase())) ||
        (a.includes(p2.toUpperCase()) && b.includes(p1.toUpperCase()))) {
      return dist;
    }
  }

  // Same system default, cross-system default
  return 15;
}

function calcTravelTime(distanceMkm, ship) {
  if (!ship.qt_speed_mkm_s || ship.qt_speed_mkm_s <= 0) return 0;
  // qt_speed is in Mkm/s, so travel time in seconds = distance_Mkm / speed_Mkm_per_s
  const seconds = distanceMkm / ship.qt_speed_mkm_s;
  // Add 2 min per leg for spool-up, alignment, decel
  return Math.ceil(seconds / 60) + 2;
}

function calcFuelForLeg(distanceMkm, ship) {
  // fuel_rate is per km, distance is in Mkm; use a reasonable per-Mkm rate
  return Math.round(distanceMkm * ship.fuel_rate_per_km * 100);
}

// ─── Nearest-neighbour TSP heuristic ─────────────────────────────────────────

function optimizeCircuit(deposits, origin) {
  if (deposits.length <= 2) return deposits;

  const unvisited = [...deposits];
  const ordered = [];
  let current = origin || deposits[0].location_detail || 'CRU-L1';

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = getDistance(current, unvisited[i].location_detail || unvisited[i].system_name);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = unvisited.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.location_detail || next.system_name;
  }

  return ordered;
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      ship_loadout = 'PROSPECTOR',
      target_materials = [],      // empty = all materials
      min_quality = 0,
      max_risk = 'HIGH',
      max_stops = 8,
      origin_station = 'CRU-L1', // starting station
      include_return = true,      // return to origin?
      system_filter = 'ALL',      // ALL, STANTON, PYRO, NYX
    } = body;

    const ship = SHIP_LOADOUTS[ship_loadout];
    if (!ship) return Response.json({ error: `Unknown ship loadout: ${ship_loadout}` }, { status: 400 });

    // Fetch all active deposits
    const allDeposits = await base44.asServiceRole.entities.ScoutDeposit.filter({});
    const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
    const maxRiskVal = riskOrder[max_risk] || 3;

    // Filter deposits
    const eligible = (allDeposits || []).filter(d => {
      if (d.is_stale) return false;
      const q = d.quality_score != null ? d.quality_score / 10 : 50;
      if (q < min_quality) return false;
      if ((riskOrder[d.risk_level] || 2) > maxRiskVal) return false;
      if (system_filter !== 'ALL' && (d.system_name || '').toUpperCase() !== system_filter) return false;
      if (target_materials.length > 0 && !target_materials.includes(d.material_name)) return false;
      return true;
    });

    if (eligible.length === 0) {
      return Response.json({
        error: 'No eligible deposits match your filters. Try lowering quality threshold or raising risk tolerance.',
      });
    }

    // Sort by quality descending, take top N
    eligible.sort((a, b) => (b.quality_score || 500) - (a.quality_score || 500));
    const selected = eligible.slice(0, max_stops);

    // Optimize circuit order
    const circuit = optimizeCircuit(selected, origin_station);

    // Build legs
    let totalDistanceMkm = 0;
    let totalTravelMin = 0;
    let totalFuel = 0;
    let totalMiningMin = 0;
    const legs = [];

    // First leg: origin to first deposit
    const firstDist = getDistance(origin_station, circuit[0].location_detail || circuit[0].system_name);
    const firstTravel = calcTravelTime(firstDist, ship);
    const firstFuel = calcFuelForLeg(firstDist, ship);
    totalDistanceMkm += firstDist;
    totalTravelMin += firstTravel;
    totalFuel += firstFuel;

    legs.push({
      type: 'TRANSIT',
      from: origin_station,
      to: circuit[0].location_detail || circuit[0].system_name,
      distance_mkm: Math.round(firstDist * 10) / 10,
      travel_minutes: firstTravel,
      fuel_units: firstFuel,
    });

    // Deposit legs
    for (let i = 0; i < circuit.length; i++) {
      const dep = circuit[i];
      const quality = dep.quality_score != null ? Math.round(dep.quality_score / 10) : 50;
      const volMultiplier = { SMALL: 0.6, MEDIUM: 1.0, LARGE: 1.5, MASSIVE: 2.2 };
      const miningTime = Math.round(15 * (volMultiplier[dep.volume_estimate] || 1.0));
      totalMiningMin += miningTime;

      legs.push({
        type: 'MINING',
        deposit_id: dep.id,
        location: dep.location_detail || dep.system_name,
        system: dep.system_name,
        material: dep.material_name,
        quality_pct: quality,
        volume: dep.volume_estimate,
        risk: dep.risk_level,
        mining_minutes: miningTime,
        reported_by: dep.reported_by_callsign,
        coords: dep.coords_approx,
      });

      // Transit to next deposit or return
      if (i < circuit.length - 1) {
        const nextDep = circuit[i + 1];
        const dist = getDistance(
          dep.location_detail || dep.system_name,
          nextDep.location_detail || nextDep.system_name,
        );
        const travel = calcTravelTime(dist, ship);
        const fuel = calcFuelForLeg(dist, ship);
        totalDistanceMkm += dist;
        totalTravelMin += travel;
        totalFuel += fuel;

        legs.push({
          type: 'TRANSIT',
          from: dep.location_detail || dep.system_name,
          to: nextDep.location_detail || nextDep.system_name,
          distance_mkm: Math.round(dist * 10) / 10,
          travel_minutes: travel,
          fuel_units: fuel,
        });
      }
    }

    // Return leg
    if (include_return) {
      const lastDep = circuit[circuit.length - 1];
      const returnDist = getDistance(lastDep.location_detail || lastDep.system_name, origin_station);
      const returnTravel = calcTravelTime(returnDist, ship);
      const returnFuel = calcFuelForLeg(returnDist, ship);
      totalDistanceMkm += returnDist;
      totalTravelMin += returnTravel;
      totalFuel += returnFuel;

      legs.push({
        type: 'TRANSIT',
        from: lastDep.location_detail || lastDep.system_name,
        to: origin_station,
        distance_mkm: Math.round(returnDist * 10) / 10,
        travel_minutes: returnTravel,
        fuel_units: returnFuel,
        is_return: true,
      });
    }

    // Fuel check
    const fuelPct = ship.fuel_capacity > 0 ? Math.round((totalFuel / ship.fuel_capacity) * 100) : 0;
    const needsRefuel = fuelPct > 85;

    // Estimate total yield
    const avgQuality = circuit.reduce((s, d) => s + (d.quality_score || 500), 0) / circuit.length;
    const estYieldScu = Math.min(
      ship.cargo_scu,
      circuit.length * (ship.cargo_scu / Math.max(3, circuit.length)) * (avgQuality / 700),
    );

    const totalSessionMin = totalTravelMin + totalMiningMin;

    return Response.json({
      circuit_name: `${ship.label} Circuit — ${circuit.length} Deposits`,
      ship: {
        ...ship,
        loadout_key: ship_loadout,
      },
      origin: origin_station,
      deposit_count: circuit.length,
      legs,
      summary: {
        total_distance_mkm: Math.round(totalDistanceMkm * 10) / 10,
        total_travel_minutes: totalTravelMin,
        total_mining_minutes: totalMiningMin,
        total_session_minutes: totalSessionMin,
        total_fuel_units: totalFuel,
        fuel_capacity: ship.fuel_capacity,
        fuel_usage_pct: fuelPct,
        needs_refuel: needsRefuel,
        estimated_yield_scu: Math.round(estYieldScu * 10) / 10,
        cargo_capacity_scu: ship.cargo_scu,
        avg_quality_pct: Math.round(avgQuality / 10),
        crew_required: ship.crew,
      },
      materials_targeted: [...new Set(circuit.map(d => d.material_name).filter(Boolean))],
      risk_assessment: {
        highest_risk: circuit.reduce((max, d) => {
          const r = riskOrder[d.risk_level] || 2;
          return r > (riskOrder[max] || 2) ? d.risk_level : max;
        }, 'LOW'),
        high_risk_stops: circuit.filter(d => riskOrder[d.risk_level] >= 3).length,
      },
    });
  } catch (error) {
    console.error('[miningCircuitPlanner]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});