/**
 * uexSyncPrices — Sync commodity prices from UEX API.
 * Updates GameCacheCommodity + PriceSnapshot, checks PriceAlert thresholds.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const UEX_BASE = 'https://uexcorp.space/api/2.0';
const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);

  try {
    const apiKey = Deno.env.get('UEX_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'UEX_API_KEY not configured' }, { status: 500, headers: NO_STORE });
    }

    const res = await fetch(`${UEX_BASE}/commodities_prices_all`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const err = await res.text();
      await base44.asServiceRole.entities.MarketSync.create({
        sync_type: 'COMMODITY_PRICES', status: 'FAILED',
        error_message: `UEX ${res.status}: ${err.slice(0, 200)}`,
        duration_ms: Date.now() - start, synced_at: new Date().toISOString(), triggered_by: 'AUTO',
      });
      return Response.json({ error: 'UEX API error', status: res.status }, { status: 502, headers: NO_STORE });
    }

    const data = await res.json();
    const commodities = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (commodities.length === 0) {
      return Response.json({ synced: 0, alerts_triggered: 0, duration_ms: Date.now() - start }, { headers: NO_STORE });
    }

    // Load existing cached commodities
    const existing = await base44.asServiceRole.entities.GameCacheCommodity.list('-last_synced', 500);
    const existingMap = {};
    (existing || []).forEach(c => { existingMap[(c.name || '').toLowerCase()] = c; });

    // Load price alerts
    const alerts = await base44.asServiceRole.entities.PriceAlert.filter({ is_active: true });
    const alertMap = {};
    (alerts || []).forEach(a => {
      const key = (a.commodity_name || '').toLowerCase();
      if (!alertMap[key]) alertMap[key] = [];
      alertMap[key].push(a);
    });

    // Load previous snapshots for comparison
    const prevSnapshots = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 500);
    const prevSnapMap = {};
    (prevSnapshots || []).forEach(s => {
      const key = (s.commodity_name || '').toLowerCase();
      if (!prevSnapMap[key]) prevSnapMap[key] = s;
    });

    const now = new Date().toISOString();
    let synced = 0;
    let alertsTriggered = 0;

    for (const c of commodities) {
      const name = c.commodity_name || c.name || '';
      if (!name) continue;
      const key = name.toLowerCase();

      const buyPrice = c.price_buy ?? c.buy_price ?? 0;
      const sellPrice = c.price_sell ?? c.sell_price ?? 0;
      const margin = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice * 100) : 0;
      const prevBuy = prevSnapMap[key]?.curr_buy_avg ?? buyPrice;
      const prevSell = prevSnapMap[key]?.curr_sell_avg ?? sellPrice;
      const buyChange = prevBuy > 0 ? ((buyPrice - prevBuy) / prevBuy * 100) : 0;
      const sellChange = prevSell > 0 ? ((sellPrice - prevSell) / prevSell * 100) : 0;

      // Determine trend
      let trend = 'STABLE';
      if (sellChange > 2) trend = 'UP';
      else if (sellChange < -2) trend = 'DOWN';

      // Upsert GameCacheCommodity
      const cached = existingMap[key];
      const commodityData = {
        name, type: c.type || c.commodity_type || '',
        buy_price_uex: buyPrice, sell_price_uex: sellPrice,
        best_buy_terminal: c.best_buy_terminal || c.terminal_buy_name || '',
        best_sell_terminal: c.best_sell_terminal || c.terminal_sell_name || '',
        best_buy_system: c.best_buy_system || c.system_buy_name || '',
        best_sell_system: c.best_sell_system || c.system_sell_name || '',
        margin_pct: Math.round(margin * 100) / 100,
        price_trend: trend,
        npc_avg_buy: buyPrice, npc_avg_sell: sellPrice,
        price_synced_at: now, last_synced: now,
      };
      if (cached) {
        await base44.asServiceRole.entities.GameCacheCommodity.update(cached.id, commodityData);
      } else {
        await base44.asServiceRole.entities.GameCacheCommodity.create({
          wiki_id: c.id_commodity || c.wiki_id || `uex-${key}`, ...commodityData,
        });
      }

      // Create PriceSnapshot
      let alertTriggered = false;
      const commodityAlerts = alertMap[key] || [];
      for (const alert of commodityAlerts) {
        let triggered = false;
        switch (alert.alert_type) {
          case 'SELL_ABOVE': triggered = sellPrice > alert.threshold_aUEC; break;
          case 'SELL_BELOW': triggered = sellPrice < alert.threshold_aUEC; break;
          case 'BUY_ABOVE': triggered = buyPrice > alert.threshold_aUEC; break;
          case 'BUY_BELOW': triggered = buyPrice < alert.threshold_aUEC; break;
          case 'MARGIN_ABOVE': triggered = margin > alert.threshold_aUEC; break;
        }
        if (triggered) {
          alertTriggered = true;
          alertsTriggered++;
          await base44.asServiceRole.entities.PriceAlert.update(alert.id, {
            last_triggered_at: now, trigger_count: (alert.trigger_count || 0) + 1,
          });
        }
      }

      // Upsert PriceSnapshot
      const prev = prevSnapMap[key];
      const snapData = {
        commodity_name: name,
        prev_buy_avg: prevBuy, prev_sell_avg: prevSell,
        curr_buy_avg: buyPrice, curr_sell_avg: sellPrice,
        buy_change_pct: Math.round(buyChange * 100) / 100,
        sell_change_pct: Math.round(sellChange * 100) / 100,
        alert_triggered: alertTriggered, alert_type: alertTriggered ? (sellChange > 0 ? 'SPIKE' : 'DROP') : 'NONE',
        best_sell_station: c.best_sell_terminal || c.terminal_sell_name || '',
        best_sell_price: sellPrice,
        best_buy_station: c.best_buy_terminal || c.terminal_buy_name || '',
        best_buy_price: buyPrice,
        margin_pct: Math.round(margin * 100) / 100,
        snapped_at: now,
      };
      if (prev) {
        await base44.asServiceRole.entities.PriceSnapshot.update(prev.id, snapData);
      } else {
        await base44.asServiceRole.entities.PriceSnapshot.create(snapData);
      }

      synced++;
    }

    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'COMMODITY_PRICES', status: 'SUCCESS',
      records_synced: synced, duration_ms: Date.now() - start,
      synced_at: now, triggered_by: 'AUTO',
    });

    return Response.json({ synced, alerts_triggered: alertsTriggered, duration_ms: Date.now() - start }, { headers: NO_STORE });
  } catch (error) {
    console.error('[uexSyncPrices]', error);
    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'COMMODITY_PRICES', status: 'FAILED',
      error_message: error.message?.slice(0, 300), duration_ms: Date.now() - start,
      synced_at: new Date().toISOString(), triggered_by: 'AUTO',
    });
    return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
});