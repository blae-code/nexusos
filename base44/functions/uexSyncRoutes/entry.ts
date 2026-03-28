/**
 * uexSyncRoutes — Sync optimal trade routes from UEX API.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const UEX_BASE = 'https://uexcorp.space/api/2.0';
const NO_STORE = { 'Cache-Control': 'no-store' };

function riskLevel(system) {
  const s = (system || '').toUpperCase();
  if (s.includes('NYX')) return 'HIGH';
  if (s.includes('PYRO')) return 'MEDIUM';
  return 'LOW';
}

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);

  try {
    const apiKey = Deno.env.get('UEX_API_KEY');
    if (!apiKey) return Response.json({ error: 'UEX_API_KEY not configured' }, { status: 500, headers: NO_STORE });

    const res = await fetch(`${UEX_BASE}/commodities_routes`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      await base44.asServiceRole.entities.MarketSync.create({
        sync_type: 'TRADE_ROUTES', status: 'FAILED',
        error_message: `UEX ${res.status}`, duration_ms: Date.now() - start,
        synced_at: new Date().toISOString(), triggered_by: 'MANUAL',
      });
      return Response.json({ error: 'UEX API error' }, { status: 502, headers: NO_STORE });
    }

    const data = await res.json();
    const routes = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    // Load existing routes for upsert
    const existing = await base44.asServiceRole.entities.TradeRoute.list('-synced_at', 500);
    const existingMap = {};
    (existing || []).forEach(r => {
      const key = `${(r.commodity_name||'').toLowerCase()}|${(r.origin_terminal||'').toLowerCase()}|${(r.destination_terminal||'').toLowerCase()}`;
      existingMap[key] = r;
    });

    const now = new Date().toISOString();
    let synced = 0;

    for (const r of routes) {
      const commodity = r.commodity_name || r.name || '';
      const origin = r.origin_terminal || r.terminal_buy_name || '';
      const dest = r.destination_terminal || r.terminal_sell_name || '';
      if (!commodity) continue;

      const buyPrice = r.buy_price || r.price_buy || 0;
      const sellPrice = r.sell_price || r.price_sell || 0;
      const profitPerScu = sellPrice - buyPrice;
      const marginPct = buyPrice > 0 ? ((profitPerScu / buyPrice) * 100) : 0;
      const originSys = r.origin_system || r.system_buy_name || '';
      const destSys = r.destination_system || r.system_sell_name || '';

      const record = {
        commodity_name: commodity,
        origin_terminal: origin, origin_system: originSys,
        destination_terminal: dest, destination_system: destSys,
        buy_price: buyPrice, sell_price: sellPrice,
        profit_per_scu: profitPerScu,
        margin_pct: Math.round(marginPct * 100) / 100,
        investment_required: r.investment_required || 0,
        max_scu: r.max_scu || 0,
        risk_level: riskLevel(destSys || originSys),
        jump_count: r.jump_count || r.jumps || 0,
        route_score: r.route_score || r.score || 0,
        synced_at: now,
      };

      const key = `${commodity.toLowerCase()}|${origin.toLowerCase()}|${dest.toLowerCase()}`;
      const cached = existingMap[key];
      if (cached) {
        await base44.asServiceRole.entities.TradeRoute.update(cached.id, record);
      } else {
        await base44.asServiceRole.entities.TradeRoute.create(record);
      }
      synced++;
    }

    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'TRADE_ROUTES', status: 'SUCCESS',
      records_synced: synced, duration_ms: Date.now() - start,
      synced_at: now, triggered_by: 'MANUAL',
    });

    return Response.json({ routes_synced: synced, duration_ms: Date.now() - start }, { headers: NO_STORE });
  } catch (error) {
    console.error('[uexSyncRoutes]', error);
    return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
});