/**
 * predictiveAnalytics — Aggregates historical data across price snapshots,
 * cargo logs, fabrication jobs, materials, and blueprints to produce
 * actionable forecasts and recommendations.
 *
 * Actions:
 *   market_forecast  — price trend analysis + momentum signals
 *   production_recs  — ranked blueprint profitability with material readiness
 *   demand_forecast  — which materials will be needed soon based on queue + jobs
 *   trade_intel      — best buy/sell opportunities from cargo log history + UEX
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const UEX_BASE = 'https://api.uexcorp.space/2.0';
function norm(s) { return (s || '').toLowerCase().trim(); }

async function uexGet(path, apiKey) {
  const res = await fetch(`${UEX_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

// Simple linear regression: returns { slope, intercept, r2 }
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (const { x, y } of points) {
    sx += x; sy += y; sxy += x * y; sx2 += x * x; sy2 += y * y;
  }
  const denom = (n * sx2 - sx * sx);
  if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  // R-squared
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of points) {
    ssTot += (y - yMean) ** 2;
    ssRes += (y - (slope * x + intercept)) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action;
  const apiKey = Deno.env.get('UEX_API_KEY');

  // ── MARKET FORECAST ──────────────────────────────────────────────────────
  if (action === 'market_forecast') {
    const [snapshots, cargoLogs, uexAvgs] = await Promise.all([
      base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 500),
      base44.asServiceRole.entities.CargoLog.list('-logged_at', 200),
      apiKey ? uexGet('commodities_averages', apiKey) : [],
    ]);

    // Build UEX lookup
    const uexMap = {};
    for (const c of uexAvgs) {
      if (c.name) uexMap[norm(c.name)] = c;
    }

    // Group snapshots by commodity
    const byCommodity = {};
    for (const s of (snapshots || [])) {
      const key = norm(s.commodity_name);
      if (!byCommodity[key]) byCommodity[key] = { name: s.commodity_name, points: [] };
      byCommodity[key].points.push(s);
    }

    // Analyse each commodity
    const forecasts = Object.values(byCommodity).map(({ name, points }) => {
      const key = norm(name);
      const sorted = points.sort((a, b) => new Date(a.snapped_at).getTime() - new Date(b.snapped_at).getTime());
      const firstTime = new Date(sorted[0].snapped_at).getTime();

      // Build regression points (hours since first snapshot)
      const sellPoints = sorted
        .filter(s => s.curr_sell_avg > 0)
        .map(s => ({ x: (new Date(s.snapped_at).getTime() - firstTime) / 3600000, y: s.curr_sell_avg }));
      const buyPoints = sorted
        .filter(s => s.curr_buy_avg > 0)
        .map(s => ({ x: (new Date(s.snapped_at).getTime() - firstTime) / 3600000, y: s.curr_buy_avg }));

      const sellTrend = linearRegression(sellPoints);
      const buyTrend = linearRegression(buyPoints);

      const latestSell = sellPoints.length > 0 ? sellPoints[sellPoints.length - 1].y : 0;
      const latestBuy = buyPoints.length > 0 ? buyPoints[buyPoints.length - 1].y : 0;

      // Forecast 24h ahead
      const maxX = Math.max(...sellPoints.map(p => p.x), ...buyPoints.map(p => p.x), 0);
      const sellForecast24h = sellTrend.slope * (maxX + 24) + sellTrend.intercept;
      const buyForecast24h = buyTrend.slope * (maxX + 24) + buyTrend.intercept;

      // Momentum: last 3 snapshots slope vs overall
      const recentSell = sellPoints.slice(-3);
      const recentTrend = linearRegression(recentSell);

      let signal = 'HOLD';
      if (sellTrend.slope > 0 && recentTrend.slope > sellTrend.slope) signal = 'STRONG_BUY';
      else if (sellTrend.slope > 0) signal = 'BUY';
      else if (sellTrend.slope < 0 && recentTrend.slope < sellTrend.slope) signal = 'STRONG_SELL';
      else if (sellTrend.slope < 0) signal = 'SELL';

      // Volatility from snapshots
      const latest = sorted[sorted.length - 1];
      const volatility = latest ? Math.abs(latest.sell_change_pct || 0) : 0;

      // UEX current data
      const uex = uexMap[key];

      // Cargo log volume for this commodity
      const trades = (cargoLogs || []).filter(l => norm(l.commodity) === key);
      const totalVolume = trades.reduce((s, l) => s + (l.quantity_scu || 0), 0);
      const avgProfit = trades.length > 0
        ? trades.reduce((s, l) => s + (l.profit_loss || 0), 0) / trades.length
        : 0;

      return {
        commodity: name,
        data_points: sorted.length,
        current_sell: latestSell,
        current_buy: latestBuy,
        sell_forecast_24h: Math.round(sellForecast24h * 100) / 100,
        buy_forecast_24h: Math.round(buyForecast24h * 100) / 100,
        sell_trend_slope: Math.round(sellTrend.slope * 1000) / 1000,
        buy_trend_slope: Math.round(buyTrend.slope * 1000) / 1000,
        trend_confidence: Math.round(sellTrend.r2 * 100),
        signal,
        volatility: Math.round(volatility * 100) / 100,
        trade_volume_scu: totalVolume,
        avg_trade_profit: Math.round(avgProfit),
        uex_sell_avg: uex?.price_sell_avg || null,
        uex_buy_avg: uex?.price_buy_avg || null,
        uex_cax_score: uex?.cax_score || null,
      };
    }).sort((a, b) => {
      const signalOrder = { STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1 };
      return (signalOrder[b.signal] || 0) - (signalOrder[a.signal] || 0);
    });

    return Response.json({ forecasts });
  }

  // ── PRODUCTION RECOMMENDATIONS ───────────────────────────────────────────
  if (action === 'production_recs') {
    const [blueprints, materials, fabJobs, uexAvgs] = await Promise.all([
      base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
      base44.asServiceRole.entities.Material.list('-logged_at', 500),
      base44.asServiceRole.entities.FabricationJob.list('-started_at', 100),
      apiKey ? uexGet('commodities_averages', apiKey) : [],
    ]);

    const uexMap = {};
    for (const c of uexAvgs) { if (c.name) uexMap[norm(c.name)] = c; }

    const activeMats = (materials || []).filter(m => !m.is_archived);

    const recs = (blueprints || []).map(bp => {
      const recipe = bp.recipe_materials || [];
      const outputQty = bp.output_quantity || 1;
      const outputValue = bp.aUEC_value_est || 0;

      // Calculate material cost from UEX buy averages
      let totalInputCost = 0;
      let allMaterialsAvailable = true;
      let hasUexPricing = false;
      const materialStatus = [];

      for (const req of recipe) {
        const needed = req.quantity_scu || 0;
        const minQ = req.min_quality || bp.min_material_quality || 0;
        const stock = activeMats.filter(m =>
          norm(m.material_name) === norm(req.material) && (m.quality_pct || 0) >= minQ
        );
        const have = stock.reduce((s, m) => s + (m.quantity_scu || 0), 0);
        const uexPrice = uexMap[norm(req.material)];
        const buyCost = uexPrice?.price_buy_avg || 0;

        if (buyCost > 0) {
          totalInputCost += needed * buyCost;
          hasUexPricing = true;
        }

        const met = have >= needed - 0.01;
        if (!met) allMaterialsAvailable = false;

        materialStatus.push({
          material: req.material,
          needed,
          have: Math.round(have * 10) / 10,
          met,
          buy_cost_per_scu: buyCost,
        });
      }

      const profit = outputValue * outputQty - totalInputCost;
      const marginPct = totalInputCost > 0 ? (profit / totalInputCost) * 100 : (outputValue > 0 ? 100 : 0);
      const craftTime = bp.crafting_time_min || 30;
      const profitPerHour = craftTime > 0 ? (profit / craftTime) * 60 : 0;

      // Check how many times this has been fabricated recently
      const recentJobs = (fabJobs || []).filter(j => j.blueprint_id === bp.id && j.status !== 'CANCELLED');
      const activeJobs = recentJobs.filter(j => j.status === 'ACTIVE');

      return {
        blueprint_id: bp.id,
        item_name: bp.item_name,
        category: bp.category,
        tier: bp.tier,
        output_quantity: outputQty,
        output_value: outputValue * outputQty,
        input_cost: Math.round(totalInputCost),
        profit: Math.round(profit),
        margin_pct: Math.round(marginPct * 10) / 10,
        profit_per_hour: Math.round(profitPerHour),
        craft_time_min: craftTime,
        materials_ready: allMaterialsAvailable,
        has_uex_pricing: hasUexPricing,
        material_status: materialStatus,
        active_jobs: activeJobs.length,
        total_fabricated: recentJobs.length,
        recommendation: allMaterialsAvailable && profit > 0
          ? 'CRAFT_NOW'
          : profit > 0
            ? 'GATHER_MATERIALS'
            : 'LOW_PRIORITY',
      };
    }).sort((a, b) => b.profit_per_hour - a.profit_per_hour);

    return Response.json({ recommendations: recs });
  }

  // ── DEMAND FORECAST ──────────────────────────────────────────────────────
  if (action === 'demand_forecast') {
    const [craftQueue, fabJobs, blueprints, materials] = await Promise.all([
      base44.asServiceRole.entities.CraftQueue.filter({ status: 'OPEN' }),
      base44.asServiceRole.entities.FabricationJob.filter({ status: 'ACTIVE' }),
      base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
      base44.asServiceRole.entities.Material.list('-logged_at', 500),
    ]);

    const bpMap = {};
    for (const bp of (blueprints || [])) bpMap[bp.id] = bp;

    const activeMats = (materials || []).filter(m => !m.is_archived);

    // Aggregate demand from open craft queue + active fab jobs
    const demandMap = {}; // material_name → { needed, sources[] }

    // From open craft queue items
    for (const item of (craftQueue || [])) {
      const bp = bpMap[item.blueprint_id];
      if (!bp || !bp.recipe_materials) continue;
      const qty = item.quantity || 1;
      for (const req of bp.recipe_materials) {
        const key = norm(req.material);
        if (!demandMap[key]) demandMap[key] = { name: req.material, queue_need: 0, active_need: 0, min_quality: 0 };
        demandMap[key].queue_need += (req.quantity_scu || 0) * qty;
        demandMap[key].min_quality = Math.max(demandMap[key].min_quality, req.min_quality || bp.min_material_quality || 0);
      }
    }

    // From active fabrication jobs (already consumed but shows consumption rate)
    for (const job of (fabJobs || [])) {
      const consumed = job.materials_consumed || [];
      for (const mat of consumed) {
        const key = norm(mat.material);
        if (!demandMap[key]) demandMap[key] = { name: mat.material, queue_need: 0, active_need: 0, min_quality: 0 };
        demandMap[key].active_need += mat.quantity_scu || 0;
      }
    }

    // Calculate supply vs demand
    const forecast = Object.values(demandMap).map(d => {
      const key = norm(d.name);
      const stock = activeMats.filter(m =>
        norm(m.material_name) === key && (m.quality_pct || 0) >= d.min_quality
      );
      const currentStock = stock.reduce((s, m) => s + (m.quantity_scu || 0), 0);
      const totalDemand = d.queue_need;
      const deficit = Math.max(0, totalDemand - currentStock);
      const surplus = Math.max(0, currentStock - totalDemand);

      let status = 'ADEQUATE';
      if (deficit > 0 && currentStock === 0) status = 'CRITICAL';
      else if (deficit > 0) status = 'SHORT';
      else if (surplus > totalDemand * 2) status = 'SURPLUS';

      return {
        material: d.name,
        current_stock_scu: Math.round(currentStock * 10) / 10,
        queue_demand_scu: Math.round(d.queue_need * 10) / 10,
        active_consumption_scu: Math.round(d.active_need * 10) / 10,
        deficit_scu: Math.round(deficit * 10) / 10,
        surplus_scu: Math.round(surplus * 10) / 10,
        min_quality_required: d.min_quality,
        status,
      };
    }).sort((a, b) => b.deficit_scu - a.deficit_scu);

    return Response.json({ demand: forecast });
  }

  // ── TRADE INTEL ──────────────────────────────────────────────────────────
  if (action === 'trade_intel') {
    const [cargoLogs, uexAvgs] = await Promise.all([
      base44.asServiceRole.entities.CargoLog.list('-logged_at', 500),
      apiKey ? uexGet('commodities_averages', apiKey) : [],
    ]);

    // Group cargo logs by commodity
    const byCommodity = {};
    for (const log of (cargoLogs || [])) {
      const key = norm(log.commodity);
      if (!byCommodity[key]) byCommodity[key] = { name: log.commodity, logs: [] };
      byCommodity[key].logs.push(log);
    }

    const uexMap = {};
    for (const c of uexAvgs) { if (c.name) uexMap[norm(c.name)] = c; }

    const intel = Object.values(byCommodity).map(({ name, logs }) => {
      const key = norm(name);
      const offloads = logs.filter(l => l.transaction_type === 'OFFLOAD');
      const totalRevenue = offloads.reduce((s, l) => s + (l.total_revenue || 0), 0);
      const totalCost = offloads.reduce((s, l) => s + (l.total_cost || 0), 0);
      const totalProfit = offloads.reduce((s, l) => s + (l.profit_loss || 0), 0);
      const totalScu = offloads.reduce((s, l) => s + (l.quantity_scu || 0), 0);
      const avgMargin = offloads.length > 0
        ? offloads.reduce((s, l) => s + (l.margin_pct || 0), 0) / offloads.length
        : 0;

      // Best routes
      const routeMap = {};
      for (const log of offloads) {
        const route = `${log.origin_station || '?'} → ${log.destination_station || '?'}`;
        if (!routeMap[route]) routeMap[route] = { route, profit: 0, count: 0, scu: 0 };
        routeMap[route].profit += log.profit_loss || 0;
        routeMap[route].count += 1;
        routeMap[route].scu += log.quantity_scu || 0;
      }
      const bestRoutes = Object.values(routeMap).sort((a, b) => b.profit - a.profit).slice(0, 3);

      const uex = uexMap[key];

      return {
        commodity: name,
        trade_count: offloads.length,
        total_volume_scu: Math.round(totalScu),
        total_profit: Math.round(totalProfit),
        avg_margin_pct: Math.round(avgMargin * 10) / 10,
        uex_sell_avg: uex?.price_sell_avg || null,
        uex_buy_avg: uex?.price_buy_avg || null,
        uex_cax_score: uex?.cax_score || null,
        best_routes: bestRoutes,
        rating: totalProfit > 50000 && avgMargin > 15 ? 'TOP_TIER' :
                totalProfit > 10000 && avgMargin > 5 ? 'PROFITABLE' :
                totalProfit > 0 ? 'MARGINAL' : 'AVOID',
      };
    }).sort((a, b) => b.total_profit - a.total_profit);

    return Response.json({ intel });
  }

  return Response.json({ error: 'Invalid action. Use: market_forecast, production_recs, demand_forecast, trade_intel' }, { status: 400 });
});