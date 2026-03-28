// UEX Inventory Tracker — aggregates commodity prices, averages, ranking
// and cross-references with org Material entity for live stock valuation.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../../auth/_shared/issuedKey/entry.ts';

const UEX_BASE = 'https://api.uexcorp.space/2.0';

async function uexGet(path, apiKey) {
  const res = await fetch(`${UEX_BASE}/${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`UEX ${path} → ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const session = await resolveIssuedKeySession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = Deno.env.get('UEX_API_KEY');
  if (!apiKey) return Response.json({ error: 'UEX_API_KEY not configured' }, { status: 500 });

  let body = {};
  try {
    if (req.method === 'POST') body = await req.json();
    else {
      const url = new URL(req.url);
      body.action = url.searchParams.get('action');
      body.commodity_name = url.searchParams.get('commodity_name');
    }
  } catch {
    // ignore parse errors
  }

  const { action } = body;

  try {
    // --- All commodities list (for search / dropdown) ---
    if (action === 'commodities') {
      const data = await uexGet('commodities', apiKey);
      return Response.json({ commodities: data });
    }

    // --- Commodity price detail by id_commodity ---
    if (action === 'commodity_prices') {
      const { id_commodity } = body;
      if (!id_commodity) return Response.json({ error: 'id_commodity required' }, { status: 400 });
      const prices = await uexGet(`commodities_prices?id_commodity=${id_commodity}`, apiKey);

      // Summarise
      const buys = prices.map(p => p.price_buy).filter(Boolean);
      const sells = prices.map(p => p.price_sell).filter(Boolean);
      const stats = {
        buy_min: buys.length ? Math.min(...buys) : null,
        buy_max: buys.length ? Math.max(...buys) : null,
        buy_avg: buys.length ? buys.reduce((a, b) => a + b, 0) / buys.length : null,
        sell_min: sells.length ? Math.min(...sells) : null,
        sell_max: sells.length ? Math.max(...sells) : null,
        sell_avg: sells.length ? sells.reduce((a, b) => a + b, 0) / sells.length : null,
        locations: prices.length,
      };
      return Response.json({ prices, stats });
    }

    // --- Commodity averages (CAX score + profitability ranking) ---
    if (action === 'averages') {
      const data = await uexGet('commodities_averages', apiKey);
      // Sort by cax_score desc, return top 100
      const sorted = (Array.isArray(data) ? data : [])
        .filter(c => c.cax_score != null)
        .sort((a, b) => (b.cax_score || 0) - (a.cax_score || 0))
        .slice(0, 100);
      return Response.json({ averages: sorted });
    }

    // --- Org stock valuation: cross-reference Materials with UEX prices ---
    if (action === 'org_stock') {
      const [materials, allAverages] = await Promise.all([
        base44.asServiceRole.entities.Material.filter({ is_archived: false }),
        uexGet('commodities_averages', apiKey),
      ]);

      const avgByName = {};
      for (const avg of (allAverages || [])) {
        if (avg.name) avgByName[avg.name.toLowerCase()] = avg;
      }

      // Group org materials by name, aggregate SCU
      const grouped = {};
      for (const mat of (materials || [])) {
        const key = (mat.material_name || '').toLowerCase();
        if (!grouped[key]) {
          grouped[key] = {
            name: mat.material_name,
            total_scu: 0,
            avg_quality: [],
            locations: new Set(),
            material_type: mat.material_type,
            uex: avgByName[key] || null,
          };
        }
        grouped[key].total_scu += mat.quantity_scu || 0;
        if (mat.quality_pct) grouped[key].avg_quality.push(mat.quality_pct);
        if (mat.location) grouped[key].locations.add(mat.location);
      }

      const stockItems = Object.values(grouped).map(item => ({
        name: item.name,
        material_type: item.material_type,
        total_scu: item.total_scu,
        avg_quality: item.avg_quality.length
          ? item.avg_quality.reduce((a, b) => a + b, 0) / item.avg_quality.length
          : null,
        location_count: item.locations.size,
        uex_sell_avg: item.uex?.price_sell_avg || null,
        uex_buy_avg: item.uex?.price_buy_avg || null,
        uex_profitability: item.uex?.profitability || null,
        uex_cax_score: item.uex?.cax_score || null,
        est_value: item.uex?.price_sell_avg
          ? Math.round(item.total_scu * item.uex.price_sell_avg)
          : null,
      })).sort((a, b) => (b.est_value || 0) - (a.est_value || 0));

      const total_est_value = stockItems.reduce((s, i) => s + (i.est_value || 0), 0);
      return Response.json({ stock: stockItems, total_est_value });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[uexInventory]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
