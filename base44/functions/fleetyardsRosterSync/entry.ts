import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { requireAdminSession } from '../auth/_shared/issuedKey/entry.ts';
import { fetchFleetYardsFleetVehicles } from '../_shared/fleetyards/entry.ts';

export async function fetchFleetYardsRoster(handle) {
  const { vehicles } = await fetchFleetYardsFleetVehicles(handle);

  return vehicles.map(ship => {
    const slug = String(ship?.slug || ship?.shipSlug || ship?.model_slug || '').trim();
    const name = ship?.name || ship?.shipName || ship?.model?.name || (slug ? slug.replace(/-/g, ' ') : 'Unknown');
    const model = ship?.model?.name || ship?.model || ship?.shipName || ship?.name || (slug ? slug.replace(/-/g, ' ') : 'Unknown');
    const manufacturer = ship?.model?.manufacturer?.name || ship?.manufacturer?.name || ship?.manufacturerName || ship?.manufacturer || 'Unknown';
    const classification = ship?.model?.classification || ship?.classification || ship?.type || ship?.role || '';
    const cargoCapacity = ship?.model?.cargoCapacity ?? ship?.cargo ?? ship?.scm_cargo ?? ship?.cargoCapacity ?? 0;
    const crewSize = ship?.model?.crewSize ?? ship?.maxCrew ?? ship?.max_crew ?? ship?.crew?.max ?? 1;
    const fleetyardsId = String(ship?.id || ship?.fid || slug || name).trim();

    return {
      name,
      model,
      manufacturer,
      class: mapShipClassToEnum(classification),
      cargo_scu: Number(cargoCapacity) || 0,
      crew_size: Number(crewSize) || 1,
      fleetyards_id: fleetyardsId,
    };
  });
}

export function mapShipClassToEnum(classification) {
  if (!classification) return 'OTHER';
  const lower = classification.toLowerCase();
  
  if (lower.includes('heavy fighter')) return 'HEAVY_FIGHTER';
  if (lower.includes('fighter')) return 'FIGHTER';
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
