/**
 * uexFullSync — Runs all UEX syncs in sequence: prices → marketplace → routes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const results = {};

  try {
    // Sync prices
    const pricesRes = await base44.asServiceRole.functions.invoke('uexSyncPrices', {});
    results.prices = pricesRes;
  } catch (e) {
    results.prices = { error: e.message };
  }

  try {
    // Sync marketplace
    const marketRes = await base44.asServiceRole.functions.invoke('uexSyncMarketplace', {});
    results.marketplace = marketRes;
  } catch (e) {
    results.marketplace = { error: e.message };
  }

  try {
    // Sync routes
    const routesRes = await base44.asServiceRole.functions.invoke('uexSyncRoutes', {});
    results.routes = routesRes;
  } catch (e) {
    results.routes = { error: e.message };
  }

  return Response.json(results, { headers: NO_STORE });
});