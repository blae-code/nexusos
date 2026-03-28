// Material Context — aggregates cross-module data for a single material name.
// Returns UEX prices, active refinery orders, blueprints requiring it,
// recent cargo logs, and price snapshots.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

const UEX_BASE = 'https://api.uexcorp.space/2.0';

function norm(s) { return (s || '').toLowerCase().trim(); }

async function uexGet(path, apiKey) {
  const res = await fetch(`${UEX_BASE}/${path}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const session = await resolveIssuedKeySession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const materialName = body.material_name;
  if (!materialName) return Response.json({ error: 'material_name required' }, { status: 400 });

  const apiKey = Deno.env.get('UEX_API_KEY');
  const normalised = norm(materialName);

  // Fetch all cross-module data in parallel
  const [refineryOrders, blueprints, cargoLogs, priceSnapshots, uexAverages] = await Promise.all([
    base44.asServiceRole.entities.RefineryOrder.list('-started_at', 100),
    base44.asServiceRole.entities.Blueprint.list('-created_date', 200),
    base44.asServiceRole.entities.CargoLog.list('-logged_at', 200),
    base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200),
    apiKey ? uexGet('commodities_averages', apiKey) : Promise.resolve([]),
  ]);

  // Filter refinery orders for this material
  const relatedRefinery = (refineryOrders || []).filter(
    o => norm(o.material_name) === normalised
  ).map(o => ({
    id: o.id,
    quantity_scu: o.quantity_scu,
    method: o.method,
    yield_pct: o.yield_pct,
    cost_aUEC: o.cost_aUEC,
    station: o.station,
    status: o.status,
    completes_at: o.completes_at,
    submitted_by_callsign: o.submitted_by_callsign,
  }));

  // Find blueprints that require this material
  const relatedBlueprints = (blueprints || []).filter(bp => {
    const recipe = bp.recipe_materials || [];
    return recipe.some(r => norm(r.material) === normalised);
  }).map(bp => {
    const req = (bp.recipe_materials || []).find(r => norm(r.material) === normalised);
    return {
      id: bp.id,
      item_name: bp.item_name,
      category: bp.category,
      tier: bp.tier,
      required_scu: req?.quantity_scu || 0,
      min_quality: req?.min_quality || bp.min_material_quality || 80,
      is_priority: bp.is_priority,
      owned_by_callsign: bp.owned_by_callsign,
    };
  });

  // Recent cargo logs for this commodity
  const relatedCargo = (cargoLogs || []).filter(
    l => norm(l.commodity) === normalised
  ).slice(0, 10).map(l => ({
    id: l.id,
    transaction_type: l.transaction_type,
    quantity_scu: l.quantity_scu,
    purchase_price_scu: l.purchase_price_scu,
    sale_price_scu: l.sale_price_scu,
    profit_loss: l.profit_loss,
    origin_station: l.origin_station,
    destination_station: l.destination_station,
    logged_by_callsign: l.logged_by_callsign,
    logged_at: l.logged_at,
  }));

  // UEX price data
  let uexPrice = null;
  const uexMatch = (uexAverages || []).find(a => norm(a.name) === normalised);
  if (uexMatch) {
    uexPrice = {
      buy_avg: uexMatch.price_buy_avg,
      sell_avg: uexMatch.price_sell_avg,
      buy_min: uexMatch.price_buy_min,
      sell_max: uexMatch.price_sell_max,
      best_buy_terminal: uexMatch.best_buy_terminal,
      best_sell_terminal: uexMatch.best_sell_terminal,
    };
  }

  // Price snapshot (volatility data)
  const snapshot = (priceSnapshots || []).find(s => norm(s.commodity_name) === normalised);
  let volatility = null;
  if (snapshot) {
    volatility = {
      buy_change_pct: snapshot.buy_change_pct,
      sell_change_pct: snapshot.sell_change_pct,
      alert_type: snapshot.alert_type,
      margin_pct: snapshot.margin_pct,
      snapped_at: snapshot.snapped_at,
    };
  }

  return Response.json({
    material_name: materialName,
    uex_price: uexPrice,
    volatility,
    refinery_orders: relatedRefinery,
    blueprints: relatedBlueprints,
    cargo_logs: relatedCargo,
  });
});
