/**
 * predictiveAnalytics — Aggregates historical data across price snapshots,
 * cargo logs, fabrication jobs, materials, and blueprints to produce
 * actionable forecasts and recommendations.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

function norm(value) { return (value || '').toLowerCase().trim(); }
function safeNumber(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

function buildCommodityCacheMap(records) {
  const map = {};
  for (const record of (records || [])) {
    if (record?.name) map[norm(record.name)] = record;
  }
  return map;
}

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sx2 = 0;
  let sy2 = 0;
  for (const { x, y } of points) {
    sx += x;
    sy += y;
    sxy += x * y;
    sx2 += x * x;
    sy2 += y * y;
  }
  const denom = (n * sx2 - sx * sx);
  if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const { x, y } of points) {
    ssTot += (y - yMean) ** 2;
    ssRes += (y - (slope * x + intercept)) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const session = await resolveIssuedKeySession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action;

  if (action === 'market_forecast') {
    const [snapshots, cargoLogs, commodityCache] = await Promise.all([
      base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 500),
      base44.asServiceRole.entities.CargoLog.list('-logged_at', 200),
      base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000),
    ]);

    const cacheMap = buildCommodityCacheMap(commodityCache);
    const byCommodity = {};
    for (const snapshot of (snapshots || [])) {
      const key = norm(snapshot.commodity_name);
      if (!key) continue;
      if (!byCommodity[key]) byCommodity[key] = { name: snapshot.commodity_name, points: [] };
      byCommodity[key].points.push(snapshot);
    }

    const forecasts = Object.values(byCommodity).map(({ name, points }) => {
      const key = norm(name);
      const sorted = points.sort((a, b) => new Date(a.snapped_at).getTime() - new Date(b.snapped_at).getTime());
      const firstTime = new Date(sorted[0].snapped_at).getTime();

      const sellPoints = sorted
        .filter((snapshot) => safeNumber(snapshot.curr_sell_avg) > 0)
        .map((snapshot) => ({ x: (new Date(snapshot.snapped_at).getTime() - firstTime) / 3600000, y: safeNumber(snapshot.curr_sell_avg) }));
      const buyPoints = sorted
        .filter((snapshot) => safeNumber(snapshot.curr_buy_avg) > 0)
        .map((snapshot) => ({ x: (new Date(snapshot.snapped_at).getTime() - firstTime) / 3600000, y: safeNumber(snapshot.curr_buy_avg) }));

      const sellTrend = linearRegression(sellPoints);
      const buyTrend = linearRegression(buyPoints);
      const latestSell = sellPoints.length > 0 ? sellPoints[sellPoints.length - 1].y : 0;
      const latestBuy = buyPoints.length > 0 ? buyPoints[buyPoints.length - 1].y : 0;
      const maxX = Math.max(...sellPoints.map((point) => point.x), ...buyPoints.map((point) => point.x), 0);
      const sellForecast24h = sellTrend.slope * (maxX + 24) + sellTrend.intercept;
      const buyForecast24h = buyTrend.slope * (maxX + 24) + buyTrend.intercept;
      const recentTrend = linearRegression(sellPoints.slice(-3));

      let signal = 'HOLD';
      if (sellTrend.slope > 0 && recentTrend.slope > sellTrend.slope) signal = 'STRONG_BUY';
      else if (sellTrend.slope > 0) signal = 'BUY';
      else if (sellTrend.slope < 0 && recentTrend.slope < sellTrend.slope) signal = 'STRONG_SELL';
      else if (sellTrend.slope < 0) signal = 'SELL';

      const latest = sorted[sorted.length - 1];
      const cache = cacheMap[key];
      const trades = (cargoLogs || []).filter((log) => norm(log.commodity) === key);
      const totalVolume = trades.reduce((sum, log) => sum + safeNumber(log.quantity_scu), 0);
      const avgProfit = trades.length > 0
        ? trades.reduce((sum, log) => sum + safeNumber(log.profit_loss), 0) / trades.length
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
        volatility: latest ? Math.round(Math.abs(safeNumber(latest.sell_change_pct)) * 100) / 100 : 0,
        trade_volume_scu: totalVolume,
        avg_trade_profit: Math.round(avgProfit),
        uex_sell_avg: cache?.npc_avg_sell || null,
        uex_buy_avg: cache?.npc_avg_buy || null,
        uex_cax_score: cache?.cax_score || null,
      };
    }).sort((a, b) => {
      const signalOrder = { STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1 };
      return (signalOrder[b.signal] || 0) - (signalOrder[a.signal] || 0);
    });

    return Response.json({ forecasts });
  }

  if (action === 'production_recs') {
    const [blueprints, materials, fabJobs, commodityCache] = await Promise.all([
      base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
      base44.asServiceRole.entities.Material.list('-logged_at', 500),
      base44.asServiceRole.entities.FabricationJob.list('-started_at', 100),
      base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000),
    ]);

    const cacheMap = buildCommodityCacheMap(commodityCache);
    const activeMats = (materials || []).filter((material) => !material.is_archived);

    const recommendations = (blueprints || []).map((blueprint) => {
      const recipe = blueprint.recipe_materials || [];
      const outputQty = blueprint.output_quantity || 1;
      const outputValue = blueprint.aUEC_value_est || 0;
      let totalInputCost = 0;
      let allMaterialsAvailable = true;
      let hasUexPricing = false;
      const materialStatus = [];

      for (const req of recipe) {
        const needed = safeNumber(req.quantity_scu);
        const minQuality = req.min_quality || blueprint.min_material_quality || 0;
        const stock = activeMats.filter((material) =>
          norm(material.material_name) === norm(req.material) && safeNumber(material.quality_pct) >= minQuality
        );
        const have = stock.reduce((sum, material) => sum + safeNumber(material.quantity_scu), 0);
        const cache = cacheMap[norm(req.material)];
        const buyCost = safeNumber(cache?.npc_avg_buy);

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
      const craftTime = blueprint.crafting_time_min || 30;
      const profitPerHour = craftTime > 0 ? (profit / craftTime) * 60 : 0;
      const recentJobs = (fabJobs || []).filter((job) => job.blueprint_id === blueprint.id && job.status !== 'CANCELLED');
      const activeJobs = recentJobs.filter((job) => job.status === 'ACTIVE');

      return {
        blueprint_id: blueprint.id,
        item_name: blueprint.item_name,
        category: blueprint.category,
        tier: blueprint.tier,
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

    return Response.json({ recommendations });
  }

  if (action === 'demand_forecast') {
    const [craftQueue, fabJobs, blueprints, materials] = await Promise.all([
      base44.asServiceRole.entities.CraftQueue.filter({ status: 'OPEN' }),
      base44.asServiceRole.entities.FabricationJob.filter({ status: 'ACTIVE' }),
      base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
      base44.asServiceRole.entities.Material.list('-logged_at', 500),
    ]);

    const blueprintMap = {};
    for (const blueprint of (blueprints || [])) blueprintMap[blueprint.id] = blueprint;
    const activeMats = (materials || []).filter((material) => !material.is_archived);
    const demandMap = {};

    for (const item of (craftQueue || [])) {
      const blueprint = blueprintMap[item.blueprint_id];
      if (!blueprint || !blueprint.recipe_materials) continue;
      const qty = item.quantity || 1;
      for (const req of blueprint.recipe_materials) {
        const key = norm(req.material);
        if (!demandMap[key]) demandMap[key] = { name: req.material, queue_need: 0, active_need: 0, min_quality: 0 };
        demandMap[key].queue_need += safeNumber(req.quantity_scu) * qty;
        demandMap[key].min_quality = Math.max(demandMap[key].min_quality, req.min_quality || blueprint.min_material_quality || 0);
      }
    }

    for (const job of (fabJobs || [])) {
      const consumed = job.materials_consumed || [];
      for (const material of consumed) {
        const key = norm(material.material);
        if (!demandMap[key]) demandMap[key] = { name: material.material, queue_need: 0, active_need: 0, min_quality: 0 };
        demandMap[key].active_need += safeNumber(material.quantity_scu);
      }
    }

    const forecast = Object.values(demandMap).map((demand) => {
      const key = norm(demand.name);
      const stock = activeMats.filter((material) =>
        norm(material.material_name) === key && safeNumber(material.quality_pct) >= demand.min_quality
      );
      const currentStock = stock.reduce((sum, material) => sum + safeNumber(material.quantity_scu), 0);
      const totalDemand = demand.queue_need;
      const deficit = Math.max(0, totalDemand - currentStock);
      const surplus = Math.max(0, currentStock - totalDemand);

      let status = 'ADEQUATE';
      if (deficit > 0 && currentStock === 0) status = 'CRITICAL';
      else if (deficit > 0) status = 'SHORT';
      else if (surplus > totalDemand * 2) status = 'SURPLUS';

      return {
        material: demand.name,
        current_stock_scu: Math.round(currentStock * 10) / 10,
        queue_demand_scu: Math.round(demand.queue_need * 10) / 10,
        active_consumption_scu: Math.round(demand.active_need * 10) / 10,
        deficit_scu: Math.round(deficit * 10) / 10,
        surplus_scu: Math.round(surplus * 10) / 10,
        min_quality_required: demand.min_quality,
        status,
      };
    }).sort((a, b) => b.deficit_scu - a.deficit_scu);

    return Response.json({ demand: forecast });
  }

  if (action === 'trade_intel') {
    const [cargoLogs, commodityCache] = await Promise.all([
      base44.asServiceRole.entities.CargoLog.list('-logged_at', 500),
      base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000),
    ]);

    const cacheMap = buildCommodityCacheMap(commodityCache);
    const byCommodity = {};
    for (const log of (cargoLogs || [])) {
      const key = norm(log.commodity);
      if (!key) continue;
      if (!byCommodity[key]) byCommodity[key] = { name: log.commodity, logs: [] };
      byCommodity[key].logs.push(log);
    }

    const intel = Object.values(byCommodity).map(({ name, logs }) => {
      const key = norm(name);
      const offloads = logs.filter((log) => log.transaction_type === 'OFFLOAD');
      const totalProfit = offloads.reduce((sum, log) => sum + safeNumber(log.profit_loss), 0);
      const totalScu = offloads.reduce((sum, log) => sum + safeNumber(log.quantity_scu), 0);
      const avgMargin = offloads.length > 0
        ? offloads.reduce((sum, log) => sum + safeNumber(log.margin_pct), 0) / offloads.length
        : 0;

      const routeMap = {};
      for (const log of offloads) {
        const route = `${log.origin_station || '?'} → ${log.destination_station || '?'}`;
        if (!routeMap[route]) routeMap[route] = { route, profit: 0, count: 0, scu: 0 };
        routeMap[route].profit += safeNumber(log.profit_loss);
        routeMap[route].count += 1;
        routeMap[route].scu += safeNumber(log.quantity_scu);
      }
      const bestRoutes = Object.values(routeMap).sort((a, b) => b.profit - a.profit).slice(0, 3);
      const cache = cacheMap[key];

      return {
        commodity: name,
        trade_count: offloads.length,
        total_volume_scu: Math.round(totalScu),
        total_profit: Math.round(totalProfit),
        avg_margin_pct: Math.round(avgMargin * 10) / 10,
        uex_sell_avg: cache?.npc_avg_sell || null,
        uex_buy_avg: cache?.npc_avg_buy || null,
        uex_cax_score: cache?.cax_score || null,
        best_routes: bestRoutes,
        rating: totalProfit > 50000 && avgMargin > 15 ? 'TOP_TIER'
          : totalProfit > 10000 && avgMargin > 5 ? 'PROFITABLE'
          : totalProfit > 0 ? 'MARGINAL'
          : 'AVOID',
      };
    }).sort((a, b) => b.total_profit - a.total_profit);

    return Response.json({ intel });
  }

  return Response.json({ error: 'Invalid action. Use: market_forecast, production_recs, demand_forecast, trade_intel' }, { status: 400 });
});
