/**
 * uexPriceSync — Cache-backed commodity lookup for legacy PriceTracker consumers.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

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
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? '';

    if (action === 'commodities') {
      const commodities = await loadCommodityCache(base44);
      const ranked = [...commodities]
        .sort((a, b) => safeNumber(b.trade_volume_uex) - safeNumber(a.trade_volume_uex) || safeNumber(b.margin_pct) - safeNumber(a.margin_pct))
        .slice(0, 20);
      return Response.json({ commodities: ranked });
    }

    if (action === 'prices') {
      const commodityId = body?.commodity_id;
      if (!commodityId) {
        return Response.json({ error: 'commodity_id required' }, { status: 400 });
      }

      const commodities = await loadCommodityCache(base44);
      const selected = commodities.find((commodity) =>
        commodity.id === commodityId ||
        String(commodity.wiki_id) === String(commodityId) ||
        norm(commodity.name) === norm(commodityId)
      );

      const prices = selected?.wiki_id
        ? await base44.asServiceRole.entities.CommodityStationPrice.filter({ commodity_wiki_id: String(selected.wiki_id) }, '-price_sell', 300).catch(() => [])
        : [];

      const formattedPrices = (prices || []).map((price) => ({
        ...price,
        station: price.station_name || price.terminal_name || 'Unknown',
      }));
      const priceNums = formattedPrices
        .flatMap((price) => [safeNumber(price.price_buy), safeNumber(price.price_sell)])
        .filter((value) => value > 0);

      return Response.json({
        commodity_id: commodityId,
        prices: formattedPrices,
        stats: {
          average: priceNums.length ? priceNums.reduce((sum, value) => sum + value, 0) / priceNums.length : 0,
          min: priceNums.length ? Math.min(...priceNums) : 0,
          max: priceNums.length ? Math.max(...priceNums) : 0,
          count: priceNums.length,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[uexPriceSync] error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
});
