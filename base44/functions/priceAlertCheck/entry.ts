/**
 * priceAlertCheck — Entity automation handler.
 * Triggered on PriceSnapshot create.
 * Checks all active PriceAlert records for the snapshot's commodity.
 * If a threshold is met, creates NexusNotification(s) and increments trigger_count.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data || event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const snap = data;
    const commodity = (snap.commodity_name || '').toUpperCase();
    if (!commodity) {
      return Response.json({ ok: true, skipped: true, reason: 'no_commodity' });
    }

    // Fetch all active alerts for this commodity
    const allAlerts = await base44.asServiceRole.entities.PriceAlert.filter({ is_active: true });
    const alerts = (allAlerts || []).filter(a =>
      (a.commodity_name || '').toUpperCase() === commodity
    );

    if (alerts.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'no_matching_alerts' });
    }

    const sellPrice = snap.curr_sell_avg || snap.best_sell_price || 0;
    const buyPrice = snap.curr_buy_avg || snap.best_buy_price || 0;
    const marginPct = snap.margin_pct || 0;
    const now = new Date().toISOString();
    const cooldownMs = 30 * 60 * 1000; // 30 minute cooldown between re-triggers

    const notifications = [];
    const alertUpdates = [];

    for (const alert of alerts) {
      // Cooldown check — don't re-trigger within 30 minutes
      if (alert.last_triggered_at) {
        const elapsed = Date.now() - new Date(alert.last_triggered_at).getTime();
        if (elapsed < cooldownMs) continue;
      }

      let triggered = false;
      let priceLabel = '';

      switch (alert.alert_type) {
        case 'SELL_ABOVE':
          if (sellPrice >= alert.threshold_aUEC) {
            triggered = true;
            priceLabel = `Sell price ${Math.round(sellPrice)} aUEC ≥ ${alert.threshold_aUEC} aUEC`;
          }
          break;
        case 'SELL_BELOW':
          if (sellPrice > 0 && sellPrice <= alert.threshold_aUEC) {
            triggered = true;
            priceLabel = `Sell price ${Math.round(sellPrice)} aUEC ≤ ${alert.threshold_aUEC} aUEC`;
          }
          break;
        case 'BUY_ABOVE':
          if (buyPrice >= alert.threshold_aUEC) {
            triggered = true;
            priceLabel = `Buy price ${Math.round(buyPrice)} aUEC ≥ ${alert.threshold_aUEC} aUEC`;
          }
          break;
        case 'BUY_BELOW':
          if (buyPrice > 0 && buyPrice <= alert.threshold_aUEC) {
            triggered = true;
            priceLabel = `Buy price ${Math.round(buyPrice)} aUEC ≤ ${alert.threshold_aUEC} aUEC`;
          }
          break;
        case 'MARGIN_ABOVE':
          if (marginPct >= alert.threshold_aUEC) {
            triggered = true;
            priceLabel = `Margin ${marginPct.toFixed(1)}% ≥ ${alert.threshold_aUEC}%`;
          }
          break;
      }

      if (!triggered) continue;

      // Update the alert record
      alertUpdates.push(
        base44.asServiceRole.entities.PriceAlert.update(alert.id, {
          last_triggered_at: now,
          trigger_count: (alert.trigger_count || 0) + 1,
        })
      );

      // Build notification
      const severity = alert.alert_type.includes('ABOVE') ? 'WARN' : 'INFO';

      if (alert.notify_all) {
        // Broadcast to everyone
        notifications.push({
          type: 'PRICE_ALERT',
          title: `Price Alert · ${snap.commodity_name}`,
          body: `${priceLabel}${alert.notes ? ' — ' + alert.notes : ''}. Set by ${alert.created_by_callsign}.`,
          severity,
          target_user_id: null,
          target_callsign: null,
          source_module: 'MARKET',
          source_id: alert.id,
          is_read: false,
          created_at: now,
        });
      } else {
        // Notify creator only — look up their user ID
        if (alert.created_by_callsign) {
          const users = await base44.asServiceRole.entities.NexusUser.filter({
            callsign: alert.created_by_callsign,
          });
          const creator = (users || [])[0];
          notifications.push({
            type: 'PRICE_ALERT',
            title: `Price Alert · ${snap.commodity_name}`,
            body: `${priceLabel}${alert.notes ? ' — ' + alert.notes : ''}.`,
            severity,
            target_user_id: creator?.id || null,
            target_callsign: alert.created_by_callsign,
            source_module: 'MARKET',
            source_id: alert.id,
            is_read: false,
            created_at: now,
          });
        }
      }
    }

    // Execute all updates and notification creates
    await Promise.all(alertUpdates);
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.NexusNotification.bulkCreate(notifications);
    }

    return Response.json({
      ok: true,
      commodity,
      alerts_checked: alerts.length,
      alerts_triggered: alertUpdates.length,
      notifications_sent: notifications.length,
    });
  } catch (error) {
    console.error('[priceAlertCheck]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});