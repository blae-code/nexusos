import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

const FLEETYARDS_API_BASE = 'https://api.fleetyards.net/v1';

async function fetchFleetYardsOrg(handle) {
  const response = await fetch(`${FLEETYARDS_API_BASE}/orgs/${handle}`);
  if (!response.ok) {
    throw new Error(`FleetYards API error: ${response.statusText}`);
  }
  return response.json();
}

async function fetchFleetYardsShips(handle) {
  const response = await fetch(`${FLEETYARDS_API_BASE}/orgs/${handle}/ships`);
  if (!response.ok) {
    throw new Error(`FleetYards API error: ${response.statusText}`);
  }
  return response.json();
}

async function fetchFleetYardsVehicles(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${FLEETYARDS_API_BASE}/vehicles?${params}`);
  if (!response.ok) {
    throw new Error(`FleetYards API error: ${response.statusText}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const session = await resolveIssuedKeySession(req);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const handle = Deno.env.get('FLEETYARDS_HANDLE');
    if (!handle) {
      return Response.json(
        { error: 'FLEETYARDS_HANDLE not configured' },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'org') {
      const org = await fetchFleetYardsOrg(handle);
      return Response.json({ org });
    }

    if (action === 'ships') {
      const ships = await fetchFleetYardsShips(handle);
      return Response.json({ ships });
    }

    if (action === 'vehicle') {
      const shipType = url.searchParams.get('ship_type');
      if (!shipType) {
        return Response.json(
          { error: 'ship_type required' },
          { status: 400 }
        );
      }
      const vehicle = await fetchFleetYardsVehicles(shipType);
      return Response.json({ vehicle: vehicle[0] || null });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[fleetyardsSync]', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
