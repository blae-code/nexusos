// UEX Inventory Tracker — now backed by cached commodity and station-price data.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../../auth/_shared/issuedKey/entry.ts';

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function norm(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function loadCommodityCache(base44) {
  const records = await base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000).catch(() => []);
  return Array.isArray(records) ? records : [];
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const session = await resolveIssuedKeySession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try {
    if (req.method === 'POST') body = await req.json();
    else {
      const url = new URL(req.url);
      body.action = url.searchParams.get('action');
      body.commodity_name = url.searchParams.get('commodity_name');
      body.id_commodity = url.searchParams.get('id_commodity');
    }
  } catch {
    body = {};
  }

  const { action } = body;

  try {
    const commodityCache = await loadCommodityCache(base44);
    const commodityByName = {};
    commodityCache.forEach((commodity) => {
      commodityByName[norm(commodity.name)] = commodity;
    });

    if (action === 'commodities') {
      const ranked = [...commodityCache].sort((a, b) =>
        safeNumber(b.trade_volume_uex) - safeNumber(a.trade_volume_uex) ||
        safeNumber(b.margin_pct) - safeNumber(a.margin_pct)
      );
      return Response.json({ commodities: ranked });
    }

    if (action === 'commodity_prices') {
      const requestedId = body.id_commodity || body.commodity_name;
      if (!requestedId) return Response.json({ error: 'id_commodity required' }, { status: 400 });

      const selected = commodityCache.find((commodity) =>
        commodity.id === requestedId ||
        String(commodity.wiki_id) === String(requestedId) ||
        norm(commodity.name) === norm(requestedId)
      );

      const prices = selected?.wiki_id
        ? await base44.asServiceRole.entities.CommodityStationPrice.filter({ commodity_wiki_id: String(selected.wiki_id) }, '-price_sell', 300).catch(() => [])
        : [];

      const buys = (prices || []).map((price) => safeNumber(price.price_buy)).filter(Boolean);
      const sells = (prices || []).map((price) => safeNumber(price.price_sell)).filter(Boolean);
      const stats = {
        buy_min: buys.length ? Math.min(...buys) : null,
        buy_max: buys.length ? Math.max(...buys) : null,
        buy_avg: buys.length ? buys.reduce((sum, value) => sum + value, 0) / buys.length : null,
        sell_min: sells.length ? Math.min(...sells) : null,
        sell_max: sells.length ? Math.max(...sells) : null,
        sell_avg: sells.length ? sells.reduce((sum, value) => sum + value, 0) / sells.length : null,
        locations: prices.length,
      };
      return Response.json({ prices, stats });
    }

    if (action === 'averages') {
      const averages = commodityCache
        .map((commodity) => ({
          name: commodity.name,
          price_buy_avg: commodity.npc_avg_buy || 0,
          price_sell_avg: commodity.npc_avg_sell || 0,
          price_buy_min: commodity.buy_min_uex || 0,
          price_sell_max: commodity.sell_max_uex || 0,
          best_buy_terminal: commodity.best_buy_terminal || '',
          best_sell_terminal: commodity.best_sell_terminal || '',
          cax_score: commodity.cax_score || 0,
          profitability: commodity.margin_pct || 0,
        }))
        .sort((a, b) => safeNumber(b.cax_score) - safeNumber(a.cax_score))
        .slice(0, 100);
      return Response.json({ averages });
    }

    if (action === 'org_stock') {
      const materials = await base44.asServiceRole.entities.Material.filter({ is_archived: false }).catch(() => []);
      const grouped = {};

      for (const material of (materials || [])) {
        const key = norm(material.material_name);
        if (!key) continue;
        if (!grouped[key]) {
          grouped[key] = {
            name: material.material_name,
            total_scu: 0,
            avg_quality: [],
            locations: new Set(),
            material_type: material.material_type,
            cache: commodityByName[key] || null,
          };
        }
        grouped[key].total_scu += safeNumber(material.quantity_scu);
        if (material.quality_pct) grouped[key].avg_quality.push(safeNumber(material.quality_pct));
        if (material.location) grouped[key].locations.add(material.location);
      }

      const stockItems = Object.values(grouped).map((item) => ({
        name: item.name,
        material_type: item.material_type,
        total_scu: item.total_scu,
        avg_quality: item.avg_quality.length
          ? item.avg_quality.reduce((sum, value) => sum + value, 0) / item.avg_quality.length
          : null,
        location_count: item.locations.size,
        uex_sell_avg: item.cache?.npc_avg_sell || null,
        uex_buy_avg: item.cache?.npc_avg_buy || null,
        uex_profitability: item.cache?.margin_pct || null,
        uex_cax_score: item.cache?.cax_score || null,
        est_value: item.cache?.npc_avg_sell
          ? Math.round(item.total_scu * item.cache.npc_avg_sell)
          : null,
      })).sort((a, b) => safeNumber(b.est_value) - safeNumber(a.est_value));

      const total_est_value = stockItems.reduce((sum, item) => sum + safeNumber(item.est_value), 0);
      return Response.json({ stock: stockItems, total_est_value });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uexInventory]', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
