/**
 * fleetReadiness — Aggregates org ship data with UEX vehicle specs and verse status
 * Returns enriched ship cards with stats from UEX Corp API + SC API server status
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const UEX_API_BASE = 'https://uexcorp.space/api/2.0';
const SC_API_BASE = 'https://api.starcitizen-api.com';

async function fetchUEX(path) {
  const res = await fetch(`${UEX_API_BASE}${path}`, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' },
  });
  if (!res.ok) throw new Error(`UEX ${path} returned ${res.status}`);
  const json = await res.json();
  return json?.data ?? [];
}

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

async function getUEXVehicleStats(vehicleName, uexVehicles) {
  if (!vehicleName || !uexVehicles?.length) return null;
  const normalized = vehicleName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = uexVehicles.find(v => {
    const vn = (v.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return vn === normalized || vn.includes(normalized) || normalized.includes(vn);
  });
  return match || null;
}

async function getHydrogenFuelPrice(uexCommodities) {
  if (!uexCommodities?.length) return null;
  const fuel = uexCommodities.find(c =>
    (c.name ?? '').toLowerCase().includes('hydrogen fuel') ||
    (c.name ?? '').toLowerCase().includes('hydrogen')
  );
  return fuel ? { name: fuel.name, buy: fuel.price_buy ?? 0, sell: fuel.price_sell ?? 0 } : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch in parallel: org ships from DB, UEX vehicle specs, verse status, UEX commodities
    const [orgShips, uexVehicles, verseStatus, uexCommodities] = await Promise.allSettled([
      base44.entities.OrgShip.list('name', 200),
      fetchUEX('/vehicles'),
      getVerseStatus(),
      fetchUEX('/commodities'),
    ]);

    const ships = orgShips.status === 'fulfilled' ? (orgShips.value ?? []) : [];
    const vehicles = uexVehicles.status === 'fulfilled' ? (uexVehicles.value ?? []) : [];
    const status = verseStatus.status === 'fulfilled' ? verseStatus.value : 'unknown';
    const commodities = uexCommodities.status === 'fulfilled' ? (uexCommodities.value ?? []) : [];

    const hydrogenFuel = await getHydrogenFuelPrice(commodities);

    // Enrich each ship with UEX vehicle specs
    const enriched = await Promise.all(ships.map(async (ship) => {
      const uexData = await getUEXVehicleStats(ship.model, vehicles);
      return {
        id: ship.id,
        name: ship.name,
        model: ship.model,
        manufacturer: ship.manufacturer || uexData?.manufacturer_name || '',
        class: ship.class,
        status: ship.status,
        assigned_to: ship.assigned_to,
        assigned_to_callsign: ship.assigned_to_callsign,
        cargo_scu: ship.cargo_scu ?? uexData?.scu ?? 0,
        crew_size: ship.crew_size ?? uexData?.crew_max ?? 1,
        notes: ship.notes || '',
        last_synced: ship.last_synced,
        // UEX-enriched stats
        uex: uexData ? {
          speed_scm: uexData.speed_scm ?? 0,
          speed_max: uexData.speed_max ?? 0,
          shield_hp: uexData.shield_hp ?? 0,
          hull_hp: uexData.hull_hp ?? 0,
          mass: uexData.mass ?? 0,
          hydrogen_capacity: uexData.hydrogen_capacity ?? uexData.fuel_hydrogen ?? 0,
          quantum_capacity: uexData.quantum_capacity ?? uexData.fuel_quantum ?? 0,
          role: uexData.role ?? uexData.focus ?? '',
          size: uexData.size ?? '',
          crew_min: uexData.crew_min ?? 1,
          crew_max: uexData.crew_max ?? 1,
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