/**
 * inventoryForecaster — Predictive inventory forecasting agent
 *
 * Pipeline:
 * 1. Compute material burn rates from recent FabricationJob + CraftQueue history
 * 2. Snapshot current material stockpile
 * 3. Factor in incoming supply (active refinery orders)
 * 4. For each material used by active/queued blueprints, project days-until-stockout
 * 5. Auto-create Requisition records for materials below threshold
 * 6. Return full forecast for dashboard consumption
 *
 * Can be called on-demand from frontend OR on a daily schedule.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STOCKOUT_THRESHOLD_DAYS = 5; // auto-requisition if < 5 days supply remaining
const LOOKBACK_DAYS = 14; // analyse 14 days of production history
const MIN_REORDER_SCU = 2; // minimum SCU to requisition

function sumBy(arr, fn) {
  return arr.reduce((s, x) => s + (fn(x) || 0), 0);
}

function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) continue;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

function normName(n) {
  return (n || '').trim().toUpperCase();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const thresholdDays = body.threshold_days || STOCKOUT_THRESHOLD_DAYS;

    console.log(`[inventoryForecaster] Starting forecast (dryRun=${dryRun}, threshold=${thresholdDays}d)`);

    // ── 1. Fetch all required data ──────────────────────────────────────
    const [materials, blueprints, craftQueue, fabJobs, refineryOrders, existingReqs] = await Promise.all([
      base44.asServiceRole.entities.Material.filter({ is_archived: false }).catch(() => []),
      base44.asServiceRole.entities.Blueprint.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.CraftQueue.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.FabricationJob.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.RefineryOrder.filter({ status: 'ACTIVE' }).catch(() => []),
      base44.asServiceRole.entities.Requisition.filter({ status: 'OPEN', source_module: 'INVENTORY_FORECAST' }).catch(() => []),
    ]);

    // ── 2. Build current stockpile index ────────────────────────────────
    const stockpile = {}; // { MATERIAL_NAME: total_scu }
    for (const m of (materials || [])) {
      const key = normName(m.material_name);
      if (!key) continue;
      stockpile[key] = (stockpile[key] || 0) + (m.quantity_scu || 0);
    }

    // ── 3. Compute burn rates from completed fab jobs + craft queue ─────
    const cutoff = Date.now() - LOOKBACK_DAYS * 86400000;
    const recentFabs = (fabJobs || []).filter(j =>
      j.status === 'COMPLETE' && j.completed_at && new Date(j.completed_at).getTime() > cutoff
    );
    const recentCrafts = (craftQueue || []).filter(q =>
      q.status === 'COMPLETE' && q.completed_at && new Date(q.completed_at).getTime() > cutoff
    );

    // Blueprint lookup for recipe extraction
    const bpMap = {};
    for (const bp of (blueprints || [])) {
      bpMap[bp.id] = bp;
      bpMap[normName(bp.item_name)] = bp;
    }

    // Aggregate consumed materials over lookback period
    const consumed = {}; // { MATERIAL_NAME: total_scu_consumed }

    // From fabrication jobs (have explicit materials_consumed snapshots)
    for (const job of recentFabs) {
      const mats = Array.isArray(job.materials_consumed) ? job.materials_consumed : [];
      for (const mat of mats) {
        const key = normName(mat.material || mat.material_name);
        if (!key) continue;
        consumed[key] = (consumed[key] || 0) + ((mat.quantity_scu || 0) * (job.quantity || 1));
      }
    }

    // From craft queue completions (look up recipe from blueprint)
    for (const cq of recentCrafts) {
      const bp = bpMap[cq.blueprint_id] || bpMap[normName(cq.blueprint_name)];
      if (!bp || !Array.isArray(bp.recipe_materials)) continue;
      for (const rm of bp.recipe_materials) {
        const key = normName(rm.material_name || rm.material);
        if (!key) continue;
        consumed[key] = (consumed[key] || 0) + ((rm.quantity_scu || 0) * (cq.quantity || 1));
      }
    }

    // Daily burn rate = total consumed / lookback days
    const burnRates = {}; // { MATERIAL_NAME: scu_per_day }
    for (const [key, total] of Object.entries(consumed)) {
      burnRates[key] = total / LOOKBACK_DAYS;
    }

    // ── 4. Factor in pending demand from open craft queue ───────────────
    const pendingDemand = {}; // { MATERIAL_NAME: total_scu_needed }
    const openQueue = (craftQueue || []).filter(q => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(q.status));
    for (const cq of openQueue) {
      const bp = bpMap[cq.blueprint_id] || bpMap[normName(cq.blueprint_name)];
      if (!bp || !Array.isArray(bp.recipe_materials)) continue;
      for (const rm of bp.recipe_materials) {
        const key = normName(rm.material_name || rm.material);
        if (!key) continue;
        pendingDemand[key] = (pendingDemand[key] || 0) + ((rm.quantity_scu || 0) * (cq.quantity || 1));
      }
    }

    // ── 5. Factor in incoming supply from active refinery orders ────────
    const incoming = {}; // { MATERIAL_NAME: expected_scu }
    for (const ro of (refineryOrders || [])) {
      const key = normName(ro.material_name);
      if (!key) continue;
      const yieldRatio = ro.expected_yield_ratio || (ro.yield_pct ? ro.yield_pct / 100 : 0.4);
      const expectedOutput = (ro.quantity_scu || 0) * yieldRatio;
      incoming[key] = (incoming[key] || 0) + expectedOutput;
    }

    // ── 6. Generate forecasts per material ──────────────────────────────
    // Collect all material names that matter (stockpiled, consumed, or demanded)
    const allMaterialKeys = new Set([
      ...Object.keys(stockpile),
      ...Object.keys(burnRates),
      ...Object.keys(pendingDemand),
    ]);

    const forecasts = [];
    const requisitionsToCreate = [];
    const existingReqMaterials = new Set(
      (existingReqs || []).map(r => normName(r.material_name))
    );

    for (const key of allMaterialKeys) {
      const currentStock = stockpile[key] || 0;
      const dailyBurn = burnRates[key] || 0;
      const pending = pendingDemand[key] || 0;
      const incomingSupply = incoming[key] || 0;
      const effectiveStock = currentStock + incomingSupply;

      // Days until stockout (considering both burn rate and pending demand)
      let daysUntilStockout = null;
      let stockoutRisk = 'NONE';

      if (dailyBurn > 0) {
        daysUntilStockout = Math.max(0, effectiveStock / dailyBurn);
        if (daysUntilStockout < 2) stockoutRisk = 'CRITICAL';
        else if (daysUntilStockout < thresholdDays) stockoutRisk = 'HIGH';
        else if (daysUntilStockout < thresholdDays * 2) stockoutRisk = 'MEDIUM';
        else stockoutRisk = 'LOW';
      } else if (pending > 0 && currentStock < pending) {
        // No burn history but pending demand exceeds stock
        daysUntilStockout = 0;
        stockoutRisk = 'HIGH';
      }

      // Deficit = how much we need to cover threshold_days of burn + pending
      const targetStock = (dailyBurn * thresholdDays) + pending;
      const deficit = Math.max(0, targetStock - effectiveStock);
      const reorderScu = Math.max(0, Math.ceil(deficit * 10) / 10); // round up to 0.1

      const forecast = {
        material_name: key,
        current_stock_scu: Math.round(currentStock * 100) / 100,
        daily_burn_rate: Math.round(dailyBurn * 1000) / 1000,
        pending_demand_scu: Math.round(pending * 100) / 100,
        incoming_supply_scu: Math.round(incomingSupply * 100) / 100,
        effective_stock_scu: Math.round(effectiveStock * 100) / 100,
        days_until_stockout: daysUntilStockout !== null ? Math.round(daysUntilStockout * 10) / 10 : null,
        stockout_risk: stockoutRisk,
        reorder_scu: reorderScu,
        target_stock_scu: Math.round(targetStock * 100) / 100,
      };
      forecasts.push(forecast);

      // Auto-requisition for HIGH/CRITICAL risk if no existing open req
      if (
        (stockoutRisk === 'CRITICAL' || stockoutRisk === 'HIGH') &&
        reorderScu >= MIN_REORDER_SCU &&
        !existingReqMaterials.has(key)
      ) {
        requisitionsToCreate.push({
          material_name: key,
          reorder_scu: reorderScu,
          stockout_risk: stockoutRisk,
          days_until_stockout: daysUntilStockout,
        });
      }
    }

    // Sort by urgency
    forecasts.sort((a, b) => {
      const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
      const ra = riskOrder[a.stockout_risk] ?? 5;
      const rb = riskOrder[b.stockout_risk] ?? 5;
      if (ra !== rb) return ra - rb;
      return (a.days_until_stockout ?? 999) - (b.days_until_stockout ?? 999);
    });

    // ── 7. Create requisition orders ────────────────────────────────────
    let requisitionsCreated = 0;

    if (!dryRun && requisitionsToCreate.length > 0) {
      for (const item of requisitionsToCreate) {
        try {
          await base44.asServiceRole.entities.Requisition.create({
            requested_by_callsign: 'NEXUSOS-AUTO',
            request_type: 'MATERIAL',
            material_name: item.material_name,
            material_type: 'OTHER',
            quantity_scu: item.reorder_scu,
            purpose: `Auto-forecast: ${item.stockout_risk} stockout risk (${item.days_until_stockout !== null ? item.days_until_stockout.toFixed(1) + 'd remaining' : 'deficit detected'}). Reorder ${item.reorder_scu} SCU to maintain ${thresholdDays}-day buffer.`,
            priority: item.stockout_risk === 'CRITICAL' ? 'URGENT' : 'HIGH',
            source_module: 'INVENTORY_FORECAST',
            status: 'OPEN',
            requested_at: new Date().toISOString(),
          });
          requisitionsCreated++;
        } catch (e) {
          console.warn(`[inventoryForecaster] Failed to create requisition for ${item.material_name}:`, e.message);
        }
      }

      // Notify leadership
      if (requisitionsCreated > 0) {
        const criticalCount = requisitionsToCreate.filter(r => r.stockout_risk === 'CRITICAL').length;
        await base44.asServiceRole.entities.NexusNotification.create({
          type: 'INVENTORY_FORECAST',
          title: `Inventory Alert: ${requisitionsCreated} Auto-Requisitions`,
          body: `Predictive forecasting detected ${requisitionsCreated} material shortages${criticalCount > 0 ? ` (${criticalCount} CRITICAL)` : ''}. Requisitions created automatically. Review in Industry Hub → Requisitions.`,
          severity: criticalCount > 0 ? 'CRITICAL' : 'WARN',
          source_module: 'INDUSTRY',
          is_read: false,
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    // ── 8. Summary stats ────────────────────────────────────────────────
    const summary = {
      total_materials_tracked: forecasts.length,
      critical_count: forecasts.filter(f => f.stockout_risk === 'CRITICAL').length,
      high_count: forecasts.filter(f => f.stockout_risk === 'HIGH').length,
      medium_count: forecasts.filter(f => f.stockout_risk === 'MEDIUM').length,
      low_count: forecasts.filter(f => f.stockout_risk === 'LOW').length,
      total_daily_burn_scu: Math.round(sumBy(forecasts, f => f.daily_burn_rate) * 100) / 100,
      total_pending_demand_scu: Math.round(sumBy(forecasts, f => f.pending_demand_scu) * 100) / 100,
      total_incoming_supply_scu: Math.round(sumBy(forecasts, f => f.incoming_supply_scu) * 100) / 100,
      requisitions_created: requisitionsCreated,
      lookback_days: LOOKBACK_DAYS,
      threshold_days: thresholdDays,
      forecast_generated_at: new Date().toISOString(),
    };

    console.log(`[inventoryForecaster] Done: ${summary.critical_count} CRITICAL, ${summary.high_count} HIGH, ${requisitionsCreated} reqs created`);

    return Response.json({ summary, forecasts });
  } catch (error) {
    console.error('[inventoryForecaster] Fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});