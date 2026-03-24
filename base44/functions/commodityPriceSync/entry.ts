/**
 * commodityPriceSync — NexusOS background agent
 *
 * Scheduled: every 30 minutes
 * Fetches live commodity prices from UEX Corp API and upserts into GameCacheCommodity.
 * Falls back to sc-trade.us if UEX is unavailable.
 *
 * No user auth — service role background job.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const UEX_API_BASE   = 'https://uexcorp.space/api/2.0';
const FETCH_TIMEOUT  = 15_000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('[commodityPriceSync] Starting commodity price sync...');

    // ── 1. Fetch commodity list from UEX ─────────────────────────────────────
    let commodities = [];
    try {
      const res = await fetch(`${UEX_API_BASE}/commodities`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' },
      });
      if (!res.ok) throw new Error(`UEX API ${res.status}`);
      const data = await res.json();
      commodities = data?.data ?? [];
    } catch (e) {
      console.warn('[commodityPriceSync] UEX commodity fetch failed:', e.message);
      return Response.json({ success: false, error: e.message }, { status: 502 });
    }

    if (!commodities.length) {
      console.warn('[commodityPriceSync] No commodities returned from UEX');
      return Response.json({ success: true, upserted: 0 });
    }

    // ── 2. Fetch best prices from UEX price endpoint ──────────────────────────
    let prices = [];
    try {
      const res = await fetch(`${UEX_API_BASE}/commodities_prices_all`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' },
      });
      if (res.ok) {
        const data = await res.json();
        prices = data?.data ?? [];
      }
    } catch (e) {
      console.warn('[commodityPriceSync] UEX price fetch failed (non-fatal):', e.message);
      // Continue — we can still upsert commodity metadata without prices
    }

    // Build price lookup by commodity_id → { best_buy, best_sell }
    const priceMap = {};
    for (const p of prices) {
      const cid = p.id_commodity;
      if (!cid) continue;
      if (!priceMap[cid]) priceMap[cid] = { buy: 0, sell: 0 };
      if (p.price_buy  > 0) priceMap[cid].buy  = Math.max(priceMap[cid].buy,  p.price_buy);
      if (p.price_sell > 0) priceMap[cid].sell = Math.max(priceMap[cid].sell, p.price_sell);
    }

    // ── 3. Load existing GameCacheCommodity records for dedup ─────────────────
    const existing = await base44.asServiceRole.entities.GameCacheCommodity.list('name', 1000);
    const existingByWikiId = {};
    for (const c of (existing ?? [])) {
      if (c.wiki_id) existingByWikiId[String(c.wiki_id)] = c;
    }

    // ── 4. Upsert commodities ─────────────────────────────────────────────────
    const now = new Date().toISOString();
    let upserted = 0;
    let skipped  = 0;

    // Batch in chunks of 20 to avoid overwhelming the DB
    const CHUNK = 20;
    for (let i = 0; i < commodities.length; i += CHUNK) {
      const chunk = commodities.slice(i, i + CHUNK);
      await Promise.allSettled(chunk.map(async (c) => {
        const wikiId   = String(c.id ?? c.uuid ?? '');
        const name     = c.name ?? c.commodity_name ?? '';
        const type     = c.commodity_type ?? c.type ?? '';
        if (!wikiId || !name) { skipped++; return; }

        const priceEntry = priceMap[wikiId] ?? {};
        const record = {
          wiki_id:         wikiId,
          name,
          type,
          buy_price_uex:   priceEntry.buy  || c.price_buy  || 0,
          sell_price_uex:  priceEntry.sell || c.price_sell || 0,
          price_synced_at: now,
          last_synced:     now,
        };

        if (existingByWikiId[wikiId]) {
          await base44.asServiceRole.entities.GameCacheCommodity.update(existingByWikiId[wikiId].id, record);
        } else {
          await base44.asServiceRole.entities.GameCacheCommodity.create(record);
        }
        upserted++;
      }));
    }

    console.log(`[commodityPriceSync] Done. upserted=${upserted} skipped=${skipped} total_source=${commodities.length}`);
    return Response.json({ success: true, upserted, skipped, total: commodities.length, synced_at: now });

  } catch (error) {
    console.error('[commodityPriceSync] unhandled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
