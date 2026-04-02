// Material Context — aggregates cached market data with refinery, blueprint, and cargo context.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

function norm(value) { return (value || '').toLowerCase().trim(); }

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const session = await resolveIssuedKeySession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const materialName = body.material_name;
  if (!materialName) return Response.json({ error: 'material_name required' }, { status: 400 });

  const normalised = norm(materialName);

  const [refineryOrders, blueprints, cargoLogs, priceSnapshots, commodityCache] = await Promise.all([
    base44.asServiceRole.entities.RefineryOrder.list('-started_at', 100),
    base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
    base44.asServiceRole.entities.CargoLog.list('-logged_at', 200),
    base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200),
    base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000),
  ]);

  const relatedRefinery = (refineryOrders || []).filter(
    (order) => norm(order.material_name) === normalised,
  ).map((order) => ({
    id: order.id,
    quantity_scu: order.quantity_scu,
    method: order.method,
    yield_pct: order.yield_pct,
    cost_aUEC: order.cost_aUEC,
    station: order.station,
    status: order.status,
    completes_at: order.completes_at,
    submitted_by_callsign: order.submitted_by_callsign,
  }));

  const relatedBlueprints = (blueprints || []).filter((blueprint) => {
    const recipe = blueprint.recipe_materials || [];
    return recipe.some((req) => norm(req.material) === normalised);
  }).map((blueprint) => {
    const req = (blueprint.recipe_materials || []).find((material) => norm(material.material) === normalised);
    return {
      id: blueprint.id,
      item_name: blueprint.item_name,
      category: blueprint.category,
      tier: blueprint.tier,
      required_scu: req?.quantity_scu || 0,
      min_quality: req?.min_quality || blueprint.min_material_quality || 80,
      is_priority: blueprint.is_priority,
      owned_by_callsign: blueprint.owned_by_callsign,
    };
  });

  const relatedCargo = (cargoLogs || []).filter(
    (log) => norm(log.commodity) === normalised,
  ).slice(0, 10).map((log) => ({
    id: log.id,
    transaction_type: log.transaction_type,
    quantity_scu: log.quantity_scu,
    purchase_price_scu: log.purchase_price_scu,
    sale_price_scu: log.sale_price_scu,
    profit_loss: log.profit_loss,
    origin_station: log.origin_station,
    destination_station: log.destination_station,
    logged_by_callsign: log.logged_by_callsign,
    logged_at: log.logged_at,
  }));

  const cacheMatch = (commodityCache || []).find((commodity) => norm(commodity.name) === normalised);
  const uexPrice = cacheMatch ? {
    buy_avg: cacheMatch.npc_avg_buy,
    sell_avg: cacheMatch.npc_avg_sell,
    buy_min: cacheMatch.buy_min_uex,
    sell_max: cacheMatch.sell_max_uex,
    best_buy_terminal: cacheMatch.best_buy_terminal,
    best_sell_terminal: cacheMatch.best_sell_terminal,
  } : null;

  const snapshot = (priceSnapshots || []).find((entry) => norm(entry.commodity_name) === normalised);
  const volatility = snapshot ? {
    buy_change_pct: snapshot.buy_change_pct,
    sell_change_pct: snapshot.sell_change_pct,
    alert_type: snapshot.alert_type,
    margin_pct: snapshot.margin_pct,
    snapped_at: snapshot.snapped_at,
  } : null;

  return Response.json({
    material_name: materialName,
    uex_price: uexPrice,
    volatility,
    refinery_orders: relatedRefinery,
    blueprints: relatedBlueprints,
    cargo_logs: relatedCargo,
  });
});
