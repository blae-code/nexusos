import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const UEX_API_BASE = 'https://uexcorp.space/api/v2';

async function fetchUexCommodities() {
  const apiKey = Deno.env.get('UEX_API_KEY');
  if (!apiKey) {
    throw new Error('UEX_API_KEY not configured');
  }

  const response = await fetch(`${UEX_API_BASE}/commodities?apikey=${apiKey}`);
  if (!response.ok) {
    throw new Error(`UEX API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function fetchUexPrices(commodityId) {
  const apiKey = Deno.env.get('UEX_API_KEY');
  if (!apiKey) {
    throw new Error('UEX_API_KEY not configured');
  }

  const response = await fetch(
    `${UEX_API_BASE}/commodity/${commodityId}/prices?apikey=${apiKey}`
  );
  if (!response.ok) {
    throw new Error(`UEX API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'commodities') {
      const commodities = await fetchUexCommodities();
      const topCommodities = commodities
        .sort((a, b) => (b.trade_volume || 0) - (a.trade_volume || 0))
        .slice(0, 20);

      return Response.json({ commodities: topCommodities });
    }

    if (action === 'prices') {
      const commodityId = url.searchParams.get('commodity_id');
      if (!commodityId) {
        return Response.json(
          { error: 'commodity_id required' },
          { status: 400 }
        );
      }

      const prices = await fetchUexPrices(commodityId);
      
      // Calculate stats
      const priceList = prices.map(p => p.price_buy || p.price_sell || 0).filter(p => p > 0);
      const avgPrice = priceList.length > 0 
        ? priceList.reduce((a, b) => a + b, 0) / priceList.length 
        : 0;

      return Response.json({
        commodity_id: commodityId,
        prices,
        stats: {
          average: avgPrice,
          min: Math.min(...priceList),
          max: Math.max(...priceList),
          count: prices.length,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});