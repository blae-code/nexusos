/**
 * uexStantonCrawler — Automated UEX data crawler for Stanton system.
 * 
 * 1. Fetches per-terminal commodity prices across all Stanton locations
 * 2. Updates GameCacheCommodity with best buy/sell across terminals
 * 3. Creates PriceSnapshot records with change detection
 * 4. Calculates the most profitable trade routes from live price discrepancies
 * 5. Upserts TradeRoute records ranked by profit/SCU
 * 6. Logs sync status to MarketSync
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const UEX_BASE = 'https://uexcorp.space/api/2.0';
const NO_STORE = { 'Cache-Control': 'no-store' };

// Major Stanton terminals for per-location price crawl
const STANTON_TERMINALS = [
  'Port Olisar', 'Area18', 'Lorville', 'New Babbage', 'Orison',
  'Grim HEX', 'Everus Harbor', 'Baijini Point', 'Seraphim Station',
  'CRU-L1', 'CRU-L4', 'CRU-L5', 'ARC-L1', 'HUR-L1', 'HUR-L2',
  'HUR-L3', 'HUR-L4', 'HUR-L5', 'MIC-L1', 'MIC-L2',
];

function riskLevel(system) {
  const s = (system || '').toUpperCase();
  if (s.includes('NYX')) return 'HIGH';
  if (s.includes('PYRO')) return 'HIGH';
  return 'LOW';
}

function avg(arr) { return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);
  const errors = [];

  try {
    const apiKey = Deno.env.get('UEX_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'UEX_API_KEY not configured' }, { status: 500, headers: NO_STORE });
    }

    console.log('[uexStantonCrawler] Starting Stanton price crawl...');

    // ── Step 1: Fetch bulk commodity prices from UEX ──────────────────
    const priceRes = await fetch(`${UEX_BASE}/commodities_prices_all`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!priceRes.ok) {
      const errText = await priceRes.text().catch(() => '');
      console.error('[uexStantonCrawler] Price API failed:', priceRes.status, errText.slice(0, 200));
      errors.push(`prices: ${priceRes.status}`);
    }

    const priceData = priceRes.ok ? await priceRes.json() : { data: [] };
    const rawPrices = Array.isArray(priceData?.data) ? priceData.data : Array.isArray(priceData) ? priceData : [];
    console.log(`[uexStantonCrawler] Fetched ${rawPrices.length} commodity price records`);

    // ── Step 2: Fetch commodities ranking for top-traded items ────────
    // Routes are computed from price discrepancies in Step 6
    // UEX routes endpoint requires per-commodity/terminal queries, so we
    // calculate profitable routes ourselves from the bulk price data.
    console.log(`[uexStantonCrawler] Will compute routes from price discrepancies`);

    // ── Step 3: Build per-commodity best-price index ─────────────────
    // Group prices by commodity, track per-terminal buy/sell
    const commodityIndex = {};
    for (const c of rawPrices) {
      const name = c.commodity_name || c.name || '';
      if (!name) continue;
      const key = name.toLowerCase();

      const buyPrice = c.price_buy ?? c.buy_price ?? 0;
      const sellPrice = c.price_sell ?? c.sell_price ?? 0;
      const buyTerminal = c.terminal_buy_name || c.best_buy_terminal || '';
      const sellTerminal = c.terminal_sell_name || c.best_sell_terminal || '';
      const buySys = c.system_buy_name || c.best_buy_system || 'STANTON';
      const sellSys = c.system_sell_name || c.best_sell_system || 'STANTON';

      if (!commodityIndex[key]) {
        commodityIndex[key] = {
          name, type: c.type || c.commodity_type || '',
          wikiId: String(c.id_commodity || c.wiki_id || `uex-${key}`),
          buyOffers: [], sellOffers: [],
        };
      }

      if (buyPrice > 0) {
        commodityIndex[key].buyOffers.push({ price: buyPrice, terminal: buyTerminal, system: buySys });
      }
      if (sellPrice > 0) {
        commodityIndex[key].sellOffers.push({ price: sellPrice, terminal: sellTerminal, system: sellSys });
      }
    }

    // ── Step 4: Load existing data for upsert ────────────────────────
    // Load existing data with delays between calls to avoid rate limits
    const existingCommodities = await base44.asServiceRole.entities.GameCacheCommodity.list('-last_synced', 200).catch(() => []);
    const existingSnapshots = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200).catch(() => []);
    await new Promise(r => setTimeout(r, 2000));
    const existingRoutes = await base44.asServiceRole.entities.TradeRoute.list('-synced_at', 200).catch(() => []);
    const priceAlerts = await base44.asServiceRole.entities.PriceAlert.filter({ is_active: true }).catch(() => []);
    await new Promise(r => setTimeout(r, 2000));

    const commMap = {};
    (existingCommodities || []).forEach(c => { commMap[(c.name || '').toLowerCase()] = c; });
    const snapMap = {};
    (existingSnapshots || []).forEach(s => { snapMap[(s.commodity_name || '').toLowerCase()] = s; });
    const routeMap = {};
    (existingRoutes || []).forEach(r => {
      const k = `${(r.commodity_name||'').toLowerCase()}|${(r.origin_terminal||'').toLowerCase()}|${(r.destination_terminal||'').toLowerCase()}`;
      routeMap[k] = r;
    });
    const alertMap = {};
    (priceAlerts || []).forEach(a => {
      const k = (a.commodity_name || '').toLowerCase();
      if (!alertMap[k]) alertMap[k] = [];
      alertMap[k].push(a);
    });

    const now = new Date().toISOString();
    let commoditiesSynced = 0;
    let snapshotsCreated = 0;
    let alertsTriggered = 0;

    // ── Step 5: Upsert commodities + snapshots ───────────────────────
    // Filter to commodities with meaningful price data, cap at 50 to stay within rate limits
    const allEntries = Object.entries(commodityIndex)
      .filter(([_, idx]) => idx.buyOffers.length > 0 || idx.sellOffers.length > 0)
      .sort((a, b) => {
        const aMax = Math.max(...a[1].sellOffers.map(o => o.price), 0);
        const bMax = Math.max(...b[1].sellOffers.map(o => o.price), 0);
        return bMax - aMax;
      })
      .slice(0, 50);
    const commEntries = allEntries;
    console.log(`[uexStantonCrawler] Processing ${commEntries.length} commodities with price data (from ${Object.keys(commodityIndex).length} total)`);
    for (let i = 0; i < commEntries.length; i++) {
      const [key, idx] = commEntries[i];

      // Find best buy (lowest) and best sell (highest)
      const sortedBuys = [...idx.buyOffers].sort((a, b) => a.price - b.price);
      const sortedSells = [...idx.sellOffers].sort((a, b) => b.price - a.price);
      const bestBuy = sortedBuys[0] || { price: 0, terminal: '', system: 'STANTON' };
      const bestSell = sortedSells[0] || { price: 0, terminal: '', system: 'STANTON' };
      const avgBuy = avg(idx.buyOffers.map(o => o.price));
      const avgSell = avg(idx.sellOffers.map(o => o.price));
      const margin = bestBuy.price > 0 ? ((bestSell.price - bestBuy.price) / bestBuy.price * 100) : 0;

      // Previous data for trend
      const prev = snapMap[key];
      const prevBuy = prev?.curr_buy_avg ?? avgBuy;
      const prevSell = prev?.curr_sell_avg ?? avgSell;
      const sellChange = prevSell > 0 ? ((avgSell - prevSell) / prevSell * 100) : 0;
      const buyChange = prevBuy > 0 ? ((avgBuy - prevBuy) / prevBuy * 100) : 0;
      let trend = 'STABLE';
      if (sellChange > 2) trend = 'UP';
      else if (sellChange < -2) trend = 'DOWN';

      // Upsert GameCacheCommodity
      const commData = {
        name: idx.name, type: idx.type,
        buy_price_uex: bestBuy.price, sell_price_uex: bestSell.price,
        best_buy_terminal: bestBuy.terminal, best_sell_terminal: bestSell.terminal,
        best_buy_system: bestBuy.system, best_sell_system: bestSell.system,
        margin_pct: Math.round(margin * 100) / 100,
        price_trend: trend, npc_avg_buy: avgBuy, npc_avg_sell: avgSell,
        price_synced_at: now, last_synced: now,
      };
      const cached = commMap[key];
      if (cached) {
        await base44.asServiceRole.entities.GameCacheCommodity.update(cached.id, commData);
      } else {
        await base44.asServiceRole.entities.GameCacheCommodity.create({ wiki_id: idx.wikiId, ...commData });
      }
      commoditiesSynced++;

      // Check price alerts
      let alertHit = false;
      for (const alert of (alertMap[key] || [])) {
        let triggered = false;
        switch (alert.alert_type) {
          case 'SELL_ABOVE': triggered = bestSell.price > alert.threshold_aUEC; break;
          case 'SELL_BELOW': triggered = bestSell.price < alert.threshold_aUEC; break;
          case 'BUY_ABOVE': triggered = bestBuy.price > alert.threshold_aUEC; break;
          case 'BUY_BELOW': triggered = bestBuy.price < alert.threshold_aUEC; break;
          case 'MARGIN_ABOVE': triggered = margin > alert.threshold_aUEC; break;
        }
        if (triggered) {
          alertHit = true;
          alertsTriggered++;
          await base44.asServiceRole.entities.PriceAlert.update(alert.id, {
            last_triggered_at: now, trigger_count: (alert.trigger_count || 0) + 1,
          });
        }
      }

      // Upsert PriceSnapshot
      const snapData = {
        commodity_name: idx.name,
        prev_buy_avg: prevBuy, prev_sell_avg: prevSell,
        curr_buy_avg: avgBuy, curr_sell_avg: avgSell,
        buy_change_pct: Math.round(buyChange * 100) / 100,
        sell_change_pct: Math.round(sellChange * 100) / 100,
        alert_triggered: alertHit, alert_type: alertHit ? (sellChange > 0 ? 'SPIKE' : 'DROP') : 'NONE',
        best_sell_station: bestSell.terminal, best_sell_price: bestSell.price,
        best_buy_station: bestBuy.terminal, best_buy_price: bestBuy.price,
        margin_pct: Math.round(margin * 100) / 100, snapped_at: now,
      };
      if (prev) {
        await base44.asServiceRole.entities.PriceSnapshot.update(prev.id, snapData);
      } else {
        await base44.asServiceRole.entities.PriceSnapshot.create(snapData);
      }
      snapshotsCreated++;

      // Rate limit: pause every 5 records to stay within entity API limits
      if ((i + 1) % 5 === 0) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // ── Step 6: Calculate trade routes from price discrepancies ──────
    let routesSynced = 0;

    // Generate routes from price discrepancies
    // For each commodity, pair best buy terminal with best sell terminal
    let computedRoutes = 0;
    for (const [key, idx] of Object.entries(commodityIndex)) {
      if (idx.buyOffers.length === 0 || idx.sellOffers.length === 0) continue;
      const bestBuy = idx.buyOffers.sort((a, b) => a.price - b.price)[0];
      const bestSell = idx.sellOffers.sort((a, b) => b.price - a.price)[0];
      if (!bestBuy.terminal || !bestSell.terminal) continue;
      if (bestBuy.terminal === bestSell.terminal) continue;

      const profitPerScu = bestSell.price - bestBuy.price;
      if (profitPerScu <= 0) continue;

      const marginPct = bestBuy.price > 0 ? ((profitPerScu / bestBuy.price) * 100) : 0;
      const rKey = `${idx.name.toLowerCase()}|${bestBuy.terminal.toLowerCase()}|${bestSell.terminal.toLowerCase()}`;

      if (routeMap[rKey]) continue; // already exists from UEX data

      const record = {
        commodity_name: idx.name,
        origin_terminal: bestBuy.terminal, origin_system: bestBuy.system || 'STANTON',
        destination_terminal: bestSell.terminal, destination_system: bestSell.system || 'STANTON',
        buy_price: bestBuy.price, sell_price: bestSell.price,
        profit_per_scu: profitPerScu, margin_pct: Math.round(marginPct * 100) / 100,
        investment_required: 0, max_scu: 0,
        risk_level: riskLevel(bestSell.system || bestBuy.system),
        jump_count: 0, route_score: Math.round(profitPerScu * marginPct / 100),
        synced_at: now,
      };

      await base44.asServiceRole.entities.TradeRoute.create(record);
      computedRoutes++;
      routesSynced++;
    }

    console.log(`[uexStantonCrawler] Synced ${commoditiesSynced} commodities, ${snapshotsCreated} snapshots, ${routesSynced} routes (${computedRoutes} computed), ${alertsTriggered} alerts`);

    // ── Step 7: Log sync results ─────────────────────────────────────
    const durationMs = Date.now() - start;
    const syncStatus = errors.length > 0 ? 'PARTIAL' : 'SUCCESS';
    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'COMMODITY_PRICES', status: syncStatus,
      records_synced: commoditiesSynced + routesSynced,
      duration_ms: durationMs, synced_at: now, triggered_by: 'AUTO',
      error_message: errors.length > 0 ? errors.join('; ') : undefined,
    });

    return Response.json({
      status: syncStatus,
      commodities_synced: commoditiesSynced,
      snapshots_updated: snapshotsCreated,
      routes_synced: routesSynced,
      computed_routes: computedRoutes,
      alerts_triggered: alertsTriggered,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: durationMs,
    }, { headers: NO_STORE });

  } catch (error) {
    console.error('[uexStantonCrawler] Fatal:', error);
    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'COMMODITY_PRICES', status: 'FAILED',
      error_message: error.message?.slice(0, 300),
      duration_ms: Date.now() - start, synced_at: new Date().toISOString(), triggered_by: 'AUTO',
    }).catch(() => {});
    return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
});