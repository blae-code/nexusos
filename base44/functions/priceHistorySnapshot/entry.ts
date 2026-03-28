/**
 * priceHistorySnapshot — Scheduled job that copies current PriceSnapshot
 * records into PriceHistory for 30-day trend analysis.
 * Triggered by automation, runs every 6 hours.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const snapshots = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200);
    const now = new Date().toISOString();

    const records = snapshots
      .filter(s => s.commodity_name && ((s.curr_sell_avg || 0) > 0 || (s.curr_buy_avg || 0) > 0))
      .map(s => ({
        commodity_name: s.commodity_name.toLowerCase(),
        buy_avg: s.curr_buy_avg || 0,
        sell_avg: s.curr_sell_avg || 0,
        best_buy_price: s.best_buy_price || 0,
        best_sell_price: s.best_sell_price || 0,
        best_buy_station: s.best_buy_station || '',
        best_sell_station: s.best_sell_station || '',
        margin_pct: s.margin_pct || 0,
        snapped_at: now,
      }));

    if (records.length > 0) {
      await base44.asServiceRole.entities.PriceHistory.bulkCreate(records);
    }

    // Clean records older than 31 days
    const cutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const oldRecords = await base44.asServiceRole.entities.PriceHistory.filter(
      { snapped_at: { $lt: cutoff } }, 'snapped_at', 500
    );
    for (const r of oldRecords) {
      await base44.asServiceRole.entities.PriceHistory.delete(r.id);
    }

    console.log(`[priceHistorySnapshot] Stored ${records.length} records, cleaned ${oldRecords.length} old`);
    return Response.json({ stored: records.length, cleaned: oldRecords.length, snapped_at: now });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[priceHistorySnapshot] error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});