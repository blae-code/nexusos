import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Route Planner — Analyzes scout deposits and generates an optimized
 * mining route based on target material, quality threshold, and risk tolerance.
 *
 * Input:
 *   target_material: string (material name to search for)
 *   quality_threshold: number (min quality %, default 70)
 *   risk_tolerance: string ('LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME')
 *   max_deposits: number (max route stops, default 5)
 *
 * Output:
 *   route: [{ deposit_id, material_name, system, location, quality, risk,
 *     estimated_yield_scu, travel_minutes, order }]
 *   total_estimated_yield: number
 *   total_travel_minutes: number
 *   route_efficiency: number (0-1, yield per minute)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      target_material,
      quality_threshold = 70,
      risk_tolerance = 'MEDIUM',
      max_deposits = 5,
    } = await req.json();

    if (!target_material) {
      return Response.json({ error: 'target_material required' }, { status: 400 });
    }

    // Fetch all non-stale scout deposits
    const allDeposits = await base44.asServiceRole.entities.ScoutDeposit.filter({
      is_stale: false,
    });

    // Filter by material and quality threshold
    const candidates = (allDeposits || []).filter(d => {
      const materialMatch =
        (d.material_name || '').toLowerCase() === target_material.toLowerCase();
      const qualityOk = (d.quality_pct || 0) >= quality_threshold;
      return materialMatch && qualityOk;
    });

    if (candidates.length === 0) {
      return Response.json({
        success: true,
        route: [],
        message: `No deposits found for ${target_material} at ${quality_threshold}% quality`,
      });
    }

    // Risk scoring: filter and prioritize by risk tolerance
    const riskScore = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
    const userRiskScore = riskScore[risk_tolerance] || 2;

    const viable = candidates.filter(d => {
      const depRiskScore = riskScore[d.risk_level || 'MEDIUM'] || 2;
      return depRiskScore <= userRiskScore;
    });

    if (viable.length === 0) {
      return Response.json({
        success: true,
        route: [],
        message: `No deposits match risk tolerance: ${risk_tolerance}`,
      });
    }

    // Estimate yields by volume category
    const volumeYield = {
      SMALL: 15,
      MEDIUM: 45,
      LARGE: 100,
      MASSIVE: 250,
    };

    // Estimate travel time between systems (simplified)
    const systemTravelMinutes = {
      'STANTON-STANTON': 5, // within same system
      'STANTON-PYRO': 45,
      'STANTON-NYX': 60,
      'PYRO-NYX': 30,
    };

    const getSystemKey = (s1, s2) => {
      const systems = [s1, s2].sort();
      return `${systems[0]}-${systems[1]}`;
    };

    // Sort by: quality (desc) > volume size (desc) > risk (asc)
    const sorted = [...viable].sort((a, b) => {
      if ((b.quality_pct || 0) !== (a.quality_pct || 0)) {
        return (b.quality_pct || 0) - (a.quality_pct || 0);
      }
      const volumeOrder = ['MASSIVE', 'LARGE', 'MEDIUM', 'SMALL'];
      const aIdx = volumeOrder.indexOf(a.volume_estimate || 'MEDIUM');
      const bIdx = volumeOrder.indexOf(b.volume_estimate || 'MEDIUM');
      if (aIdx !== bIdx) return aIdx - bIdx;
      return riskScore[a.risk_level || 'MEDIUM'] - riskScore[b.risk_level || 'MEDIUM'];
    });

    // Build route (limit to max_deposits)
    const route = [];
    let lastSystem = 'STANTON';
    let totalTravel = 0;
    let totalYield = 0;

    for (let i = 0; i < Math.min(sorted.length, max_deposits); i++) {
      const dep = sorted[i];
      const sys = dep.system_name || 'STANTON';
      const travelKey = getSystemKey(lastSystem, sys);
      const travelTime = systemTravelMinutes[travelKey] || 30;

      const estimatedYield = volumeYield[dep.volume_estimate || 'MEDIUM'] || 45;
      totalTravel += travelTime;
      totalYield += estimatedYield;

      route.push({
        deposit_id: dep.id,
        material_name: dep.material_name,
        system: sys,
        location: dep.location_detail || 'Unknown',
        quality_pct: dep.quality_pct || 0,
        risk_level: dep.risk_level || 'MEDIUM',
        volume_estimate: dep.volume_estimate || 'MEDIUM',
        estimated_yield_scu: estimatedYield,
        travel_minutes: travelTime,
        order: i + 1,
        reported_by: dep.reported_by_callsign || 'Unknown',
      });

      lastSystem = sys;
    }

    const routeEfficiency = totalTravel > 0 ? totalYield / totalTravel : 0;

    return Response.json({
      success: true,
      route,
      total_estimated_yield: totalYield,
      total_travel_minutes: totalTravel,
      route_efficiency: routeEfficiency.toFixed(2),
    });
  } catch (error) {
    console.error('routePlanner error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});