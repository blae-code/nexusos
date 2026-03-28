import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { requireAdminSession } from '../auth/_shared/issuedKey/entry.ts';

export async function fetchFleetYardsRoster(handle) {
  const response = await fetch(`https://api.fleetyards.net/v1/orgs/${handle}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`FleetYards API error: ${response.status}`);
  }

  const org = await response.json();
  if (!org.ships || !Array.isArray(org.ships)) {
    return [];
  }

  return org.ships.map(ship => ({
    name: ship.name || ship.model?.name || 'Unknown',
    model: ship.model?.name || 'Unknown',
    manufacturer: ship.model?.manufacturer?.name || 'Unknown',
    class: mapShipClassToEnum(ship.model?.classification),
    cargo_scu: ship.model?.cargoCapacity || 0,
    crew_size: ship.model?.crewSize || 1,
    fleetyards_id: ship.id,
  }));
}

export function mapShipClassToEnum(classification) {
  if (!classification) return 'OTHER';
  const lower = classification.toLowerCase();
  
  if (lower.includes('fighter')) return 'FIGHTER';
  if (lower.includes('heavy fighter')) return 'HEAVY_FIGHTER';
  if (lower.includes('miner')) return 'MINER';
  if (lower.includes('hauler') || lower.includes('cargo')) return 'HAULER';
  if (lower.includes('salvage')) return 'SALVAGER';
  if (lower.includes('medical')) return 'MEDICAL';
  if (lower.includes('explorer')) return 'EXPLORER';
  if (lower.includes('vehicle') || lower.includes('rover')) return 'GROUND_VEHICLE';
  
  return 'OTHER';
}

export async function syncFleetYardsRoster(base44, fleetyardsHandle) {
  const ships = await fetchFleetYardsRoster(fleetyardsHandle);
  const now = new Date().toISOString();
  
  const existing = await base44.asServiceRole.entities.OrgShip.list();
  const existingMap = new Map(existing.map(s => [s.fleetyards_id, s]));
  
  for (const ship of ships) {
    const existing = existingMap.get(ship.fleetyards_id);
    const syncedShip = { ...ship, last_synced: now };
    
    if (existing) {
      await base44.asServiceRole.entities.OrgShip.update(existing.id, syncedShip);
    } else {
      await base44.asServiceRole.entities.OrgShip.create({
        ...syncedShip,
        status: 'AVAILABLE',
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403 });
    }

    const handle = Deno.env.get('FLEETYARDS_HANDLE');
    if (!handle) {
      return new Response(JSON.stringify({ error: 'FLEETYARDS_HANDLE not configured' }), { status: 500 });
    }

    await syncFleetYardsRoster(base44, handle);

    return new Response(JSON.stringify({ success: true, synced_at: new Date().toISOString() }), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[fleetyardsRosterSync]', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
