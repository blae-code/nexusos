import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

async function fetchFleetYardsModels(query) {
  const params = new URLSearchParams({ search: query, per_page: '5' });
  const response = await fetch(`${FLEETYARDS_API_BASE}/models?${params}`);
  if (!response.ok) {
    throw new Error(`FleetYards API error: ${response.statusText}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const handle = Deno.env.get('FLEETYARDS_HANDLE');
    if (!handle) {
      return Response.json(
        { error: 'FLEETYARDS_HANDLE not configured' },
        { status: 500 }
      );
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get('action');

    if (action === 'org') {
      const org = await fetchFleetYardsOrg(handle);
      return Response.json({ org });
    }

    if (action === 'ships') {
      const ships = await fetchFleetYardsShips(handle);
      return Response.json({ ships });
    }

    if (action === 'vehicle') {
      const shipType = body.ship_type || new URL(req.url).searchParams.get('ship_type');
      if (!shipType) {
        return Response.json(
          { error: 'ship_type required' },
          { status: 400 }
        );
      }
      const models = await fetchFleetYardsModels(shipType);
      return Response.json({ vehicle: models[0] || null });
    }

    if (action === 'hardpoints') {
      const shipModel = body.ship_model;
      if (!shipModel) {
        return Response.json({ error: 'ship_model required' }, { status: 400 });
      }
      // Search for the model
      const models = await fetchFleetYardsModels(shipModel);
      const model = models?.[0];
      if (!model) {
        return Response.json({ hardpoints: [] });
      }
      const slug = model.slug;
      if (!slug) {
        return Response.json({ hardpoints: [] });
      }
      try {
        const detailResp = await fetch(`${FLEETYARDS_API_BASE}/models/${slug}/hardpoints`);
        if (detailResp.ok) {
          const hardpoints = await detailResp.json();
          const SIZE_MAP = { capital: 10, large: 8, medium: 6, small: 4, vehicle: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, remote: 0, tbd: 0 };
          const parseSize = (s) => {
            if (typeof s === 'number') return s;
            if (!s) return 0;
            return SIZE_MAP[String(s).toLowerCase()] || parseInt(s) || 0;
          };
          return Response.json({
            hardpoints: (hardpoints || []).map(hp => ({
              name: hp.name || hp.key || 'Unknown',
              hardpoint_type: hp.hardpointType || hp.type || 'other',
              category: hp.category || hp.group || hp.hardpointType || 'other',
              size: parseSize(hp.size),
              component_size: parseSize(hp.componentSize || hp.size),
              component_name: hp.component?.name || hp.defaultComponent?.name || '',
              component: hp.component || hp.defaultComponent || null,
            }))
          });
        }
        return Response.json({ hardpoints: [] });
      } catch {
        return Response.json({ hardpoints: [] });
      }
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