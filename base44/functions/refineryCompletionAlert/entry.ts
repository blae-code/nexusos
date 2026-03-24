/**
 * refineryCompletionAlert
 * Called by entity automation when a RefineryOrder is updated to status READY.
 * Discord delivery has been removed; this function now returns completion data only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createNotification } from '../_shared/nexusNotification/entry.ts';

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

    if (order.submitted_by_user_id) {
      try {
        await createNotification(base44, {
          type: 'REFINERY_READY',
          title: `${order.material_name || 'Refinery order'} ready`,
          body: `${order.material_name || 'Material'} is ready for collection${order.station ? ` at ${order.station}` : ''}.`,
          severity: 'INFO',
          target_user_id: order.submitted_by_user_id,
          source_module: 'INDUSTRY',
          source_id: order.id,
        });
      } catch (notificationError) {
        console.warn('[refineryCompletionAlert] notification failed:', notificationError?.message || notificationError);
      }
    }

    return Response.json({
      success: true,
      material: order.material_name,
      submitted_by_user_id: order.submitted_by_user_id || null,
      callsign: order.submitted_by_callsign || '—',
    });
  } catch (error) {
    console.error('[refineryCompletionAlert] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
