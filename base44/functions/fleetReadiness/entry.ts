/**
 * fleetReadiness — Aggregates org ship data with cached vehicle specs and verse status.
 * Returns enriched ship cards with Base44 cache data plus SC API server status.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

const SC_API_BASE = 'https://api.starcitizen-api.com';

async function getVerseStatus() {
  const scApiKey = Deno.env.get('SC_API_KEY');
  try {
    if (scApiKey) {
      const res = await fetch(`${SC_API_BASE}/status`, {
        headers: { 'apikey': scApiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const s = data?.data?.status?.toLowerCase();
        if (s === 'online') return 'online';
        if (s === 'offline') return 'offline';
        return 'degraded';
      }
    }
    // Fallback
    const rsi = await fetch('https://status.robertsspaceindustries.com/', {
      signal: AbortSignal.timeout(5000),
    });
    return rsi.ok ? 'online' : 'offline';
  } catch {
    return 'unknown';
  }
}

function normalizeVehicleName(vehicleName) {
  return String(vehicleName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getCachedVehicleStats(vehicleName, cachedVehicles) {
  if (!vehicleName || !cachedVehicles?.length) return null;
  const normalized = normalizeVehicleName(vehicleName);
  const match = cachedVehicles.find((v) => {
    const vn = normalizeVehicleName(v.name);
    return vn === normalized || vn.includes(normalized) || normalized.includes(vn);
  });
  return match || null;
}

async function getHydrogenFuelPrice(cachedCommodities) {
  if (!cachedCommodities?.length) return null;
  const fuel = cachedCommodities.find((c) =>
    (c.name ?? '').toLowerCase().includes('hydrogen fuel') ||
    (c.name ?? '').toLowerCase().includes('hydrogen')
  );
  return fuel ? {
    name: fuel.name,
    buy: fuel.buy_price_uex ?? fuel.npc_avg_buy ?? 0,
    sell: fuel.sell_price_uex ?? fuel.npc_avg_sell ?? 0,
  } : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [orgShips, cachedVehicles, cachedCommodities, verseStatus] = await Promise.allSettled([
      base44.asServiceRole.entities.OrgShip.list('name', 200),
      base44.asServiceRole.entities.GameCacheVehicle.list('name', 500),
      base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000),
      getVerseStatus(),
    ]);

    const ships = orgShips.status === 'fulfilled' ? (orgShips.value ?? []) : [];
    const vehicles = cachedVehicles.status === 'fulfilled' ? (cachedVehicles.value ?? []) : [];
    const commodities = cachedCommodities.status === 'fulfilled' ? (cachedCommodities.value ?? []) : [];
    const status = verseStatus.status === 'fulfilled' ? verseStatus.value : 'unknown';

    const hydrogenFuel = await getHydrogenFuelPrice(commodities);

    const enriched = await Promise.all(ships.map(async (ship) => {
      const cachedData = await getCachedVehicleStats(ship.model, vehicles);
      const stats = cachedData?.stats_json || {};
      return {
        id: ship.id,
        name: ship.name,
        model: ship.model,
        manufacturer: ship.manufacturer || cachedData?.manufacturer || '',
        class: ship.class,
        status: ship.status,
        assigned_to: ship.assigned_to,
        assigned_to_callsign: ship.assigned_to_callsign,
        cargo_scu: ship.cargo_scu ?? cachedData?.cargo_scu ?? 0,
        crew_size: ship.crew_size ?? stats.crew_max ?? 1,
        notes: ship.notes || '',
        last_synced: ship.last_synced,
        uex: cachedData ? {
          speed_scm: stats.speed_scm ?? 0,
          speed_max: stats.speed_max ?? 0,
          shield_hp: stats.shields ?? 0,
          hull_hp: stats.hull_hp ?? 0,
          mass: stats.mass ?? 0,
          hydrogen_capacity: stats.hydrogen_capacity ?? stats.fuel_hydrogen ?? 0,
          quantum_capacity: stats.quantum_capacity ?? stats.fuel_quantum ?? 0,
          role: stats.role ?? stats.focus ?? '',
          size: stats.size ?? '',
          crew_min: stats.crew_min ?? 1,
          crew_max: stats.crew_max ?? 1,
        } : null,
      };
    }));

    // Fleet-wide stats
    const stats = {
      total: ships.length,
      available: ships.filter(s => s.status === 'AVAILABLE').length,
      assigned: ships.filter(s => s.status === 'ASSIGNED').length,
      maintenance: ships.filter(s => s.status === 'MAINTENANCE').length,
      destroyed: ships.filter(s => s.status === 'DESTROYED').length,
      total_cargo_scu: ships.reduce((sum, s) => sum + (s.cargo_scu || 0), 0),
      unique_pilots: new Set(ships.filter(s => s.assigned_to).map(s => s.assigned_to)).size,
    };

    return Response.json({
      ships: enriched,
      stats,
      verse_status: status,
      hydrogen_fuel: hydrogenFuel,
      fetched_at: new Date().toISOString(),
      uex_vehicles_count: vehicles.length,
    });

  } catch (error) {
    console.error('[fleetReadiness]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
