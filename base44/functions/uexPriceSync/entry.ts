/**
 * uexPriceSync — on-demand commodity price lookup for PriceTracker UI.
 *
 * Called by: src/apps/industry-hub/PriceTracker.jsx
 * Requires user auth (user-triggered, not a background job).
 *
 * Actions:
 *   commodities — top commodities by trade volume
 *   prices      — per-station prices for a specific commodity id
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const UEX_API_BASE  = 'https://uexcorp.space/api/2.0';
const FETCH_TIMEOUT = 15_000;
const UA            = { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' };

async function fetchUEX(path: string) {
  const res = await fetch(`${UEX_API_BASE}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    headers: UA,
  });
  if (!res.ok) throw new Error(`UEX ${path} returned ${res.status}`);
  const json = await res.json();
  return json?.data ?? [];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body   = await req.json();
    const action = body?.action ?? '';

    // ── commodities: top 20 by trade volume ───────────────────────────────────
    if (action === 'commodities') {
      const commodities = await fetchUEX('/commodities');
      const top = (commodities as Record<string, unknown>[])
        .sort((a, b) => ((b.trade_volume as number) || 0) - ((a.trade_volume as number) || 0))
        .slice(0, 20);
      return Response.json({ commodities: top });
    }

    // ── prices: per-station prices for one commodity ───────────────────────────
    if (action === 'prices') {
      const commodityId = body?.commodity_id;
      if (!commodityId) {
        return Response.json({ error: 'commodity_id required' }, { status: 400 });
      }

      const prices = await fetchUEX(`/commodities_prices?id_commodity=${commodityId}`);
      const priceNums = (prices as Record<string, unknown>[])
        .map(p => (p.price_buy as number) || (p.price_sell as number) || 0)
        .filter(n => n > 0);

      return Response.json({
        commodity_id: commodityId,
        prices,
        stats: {
          average: priceNums.length ? priceNums.reduce((a, b) => a + b, 0) / priceNums.length : 0,
          min:     priceNums.length ? Math.min(...priceNums) : 0,
          max:     priceNums.length ? Math.max(...priceNums) : 0,
          count:   priceNums.length,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[uexPriceSync] error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});

