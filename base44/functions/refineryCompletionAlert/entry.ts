/**
 * refineryCompletionAlert
 * Called by entity automation when a RefineryOrder is updated to status READY.
 * Fires a heraldBot refineryReady action to post a Discord notification.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { event, data, old_data } = body;

    // Only act on status transitions TO 'READY'
    const order = data;
    const wasReady = old_data?.status === 'READY';
    const isReady  = order?.status === 'READY';

    if (!isReady || wasReady) {
      return Response.json({ skipped: true, reason: 'not a READY transition' });
    }

    // Fire herald alert (fire-and-forget style — don't fail the automation if Discord is down)
    try {
      await base44.asServiceRole.functions.invoke('heraldBot', {
        action: 'refineryReady',
        payload: {
          material_name: order.material_name,
          quantity_scu:  order.quantity_scu,
          station:       order.station || '—',
          callsign:      order.submitted_by_callsign || '—',
        },
      });
    } catch (discordErr) {
      console.warn('[refineryCompletionAlert] heraldBot failed:', discordErr.message);
    }

    return Response.json({ success: true, material: order.material_name });
  } catch (error) {
    console.error('[refineryCompletionAlert] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});