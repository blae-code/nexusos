/**
 * arbitrageAlertCheck — Scheduled function that scans PriceSnapshot data
 * for high-margin arbitrage opportunities (>20%) and creates NexusNotification
 * records to alert all members.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MARGIN_THRESHOLD = 20;
const MAX_ALERTS_PER_RUN = 5;
const DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Fetch current price snapshots
    const snapshots = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 300);
    if (!snapshots || snapshots.length === 0) {
      console.log('[arbitrageAlertCheck] No price snapshots available.');
      return Response.json({ alerts_created: 0, reason: 'no_snapshots' });
    }

    // 2. Filter for high-margin opportunities
    const opportunities = snapshots
      .filter(s => {
        const margin = s.margin_pct || 0;
        const bestBuy = s.best_buy_price || 0;
        const bestSell = s.best_sell_price || 0;
        return margin > MARGIN_THRESHOLD && bestBuy > 0 && bestSell > bestBuy;
      })
      .sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))
      .slice(0, MAX_ALERTS_PER_RUN);

    if (opportunities.length === 0) {
      console.log('[arbitrageAlertCheck] No opportunities above threshold.');
      return Response.json({ alerts_created: 0, reason: 'none_above_threshold', threshold: MARGIN_THRESHOLD });
    }

    // 3. Dedup — check recent notifications to avoid spamming
    const recentNotifications = await base44.asServiceRole.entities.NexusNotification.filter(
      { type: 'ARBITRAGE_ALERT' }, '-created_at', 50
    ).catch(() => []);

    const recentlySent = new Set();
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    for (const n of (recentNotifications || [])) {
      if (n.created_at && n.created_at > cutoff && n.source_id) {
        recentlySent.add(n.source_id);
      }
    }

    // 4. Create notifications for new opportunities
    const now = new Date().toISOString();
    let alertsCreated = 0;
    const alertDetails = [];

    for (const opp of opportunities) {
      const commodityKey = (opp.commodity_name || '').toLowerCase();
      if (!commodityKey || recentlySent.has(commodityKey)) continue;

      const profitPerScu = Math.round((opp.best_sell_price || 0) - (opp.best_buy_price || 0));
      const marginPct = Math.round((opp.margin_pct || 0) * 10) / 10;

      const title = `${opp.commodity_name} — ${marginPct}% margin detected`;
      const body = [
        `**${opp.commodity_name}** has a ${marginPct}% arbitrage margin.`,
        `Buy @ **${opp.best_buy_station || 'Unknown'}** for ${(opp.best_buy_price || 0).toLocaleString()} aUEC/SCU`,
        `Sell @ **${opp.best_sell_station || 'Unknown'}** for ${(opp.best_sell_price || 0).toLocaleString()} aUEC/SCU`,
        `Profit: **${profitPerScu.toLocaleString()} aUEC/SCU**`,
      ].join('\n');

      await base44.asServiceRole.entities.NexusNotification.create({
        type: 'ARBITRAGE_ALERT',
        title,
        body,
        severity: marginPct >= 40 ? 'CRITICAL' : marginPct >= 30 ? 'WARN' : 'INFO',
        target_user_id: null, // broadcast to all
        source_module: 'MARKET_INTEL',
        source_id: commodityKey,
        is_read: false,
        created_at: now,
      });

      alertsCreated++;
      alertDetails.push({
        commodity: opp.commodity_name,
        margin_pct: marginPct,
        profit_per_scu: profitPerScu,
        buy_station: opp.best_buy_station,
        sell_station: opp.best_sell_station,
      });
    }

    console.log(`[arbitrageAlertCheck] Created ${alertsCreated} alerts.`);
    return Response.json({
      alerts_created: alertsCreated,
      threshold: MARGIN_THRESHOLD,
      scanned: snapshots.length,
      above_threshold: opportunities.length,
      alerts: alertDetails,
      checked_at: now,
    });
  } catch (error) {
    console.error('[arbitrageAlertCheck] error:', error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});