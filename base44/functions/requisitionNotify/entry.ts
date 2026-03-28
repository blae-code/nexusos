/**
 * requisitionNotify — Entity automation handler.
 * When a Requisition is created, sends a NexusNotification to:
 *   1. The targeted member (if target_callsign is set)
 *   2. All PIONEER/FOUNDER/VOYAGER members (leaders) for visibility
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

    const reqData = data;
    const now = new Date().toISOString();
    const isMaterial = reqData.request_type === 'MATERIAL';
    const itemLabel = reqData.material_name || reqData.item_name || 'Unknown item';
    const qtyLabel = reqData.quantity_scu ? `${reqData.quantity_scu} SCU` : reqData.quantity > 1 ? `×${reqData.quantity}` : '';
    const priorityTag = reqData.priority === 'URGENT' ? ' [URGENT]' : reqData.priority === 'HIGH' ? ' [HIGH]' : '';

    const notifications = [];

    // 1. Notify targeted member
    if (reqData.target_callsign) {
      // Look up the user to get their ID
      const targetUsers = await base44.asServiceRole.entities.NexusUser.filter({
        callsign: reqData.target_callsign,
      });
      const targetUser = (targetUsers || [])[0];

      notifications.push({
        type: 'REQUISITION_REQUEST',
        title: `Material Request${priorityTag}`,
        body: `${reqData.requested_by_callsign} needs ${qtyLabel ? qtyLabel + ' ' : ''}${itemLabel}${reqData.source_blueprint_name ? ' for ' + reqData.source_blueprint_name : ''}. Check Requisitions tab.`,
        severity: reqData.priority === 'URGENT' ? 'CRITICAL' : reqData.priority === 'HIGH' ? 'WARN' : 'INFO',
        target_user_id: targetUser?.id || null,
        target_callsign: reqData.target_callsign,
        source_module: 'INDUSTRY',
        source_id: event?.entity_id || null,
        is_read: false,
        created_at: now,
      });
    }

    // 2. Notify leaders (PIONEER, FOUNDER, VOYAGER) — broadcast
    if (reqData.priority === 'URGENT' || reqData.priority === 'HIGH') {
      notifications.push({
        type: 'REQUISITION_ALERT',
        title: `${reqData.priority} Requisition${priorityTag}`,
        body: `${reqData.requested_by_callsign} requested ${qtyLabel ? qtyLabel + ' ' : ''}${itemLabel}${reqData.target_callsign ? ' from ' + reqData.target_callsign : ''}.`,
        severity: reqData.priority === 'URGENT' ? 'CRITICAL' : 'WARN',
        target_user_id: null,
        source_module: 'INDUSTRY',
        source_id: event?.entity_id || null,
        is_read: false,
        created_at: now,
      });
    }

    // 3. If no target but it's a material request, find holders and notify them
    if (isMaterial && !reqData.target_callsign && reqData.material_name) {
      const matName = reqData.material_name.toUpperCase();
      const materials = await base44.asServiceRole.entities.Material.filter({});
      const holderCallsigns = new Set();

      for (const m of (materials || [])) {
        if (m.is_archived) continue;
        if ((m.material_name || '').toUpperCase() !== matName) continue;
        if ((m.quantity_scu || 0) <= 0) continue;
        const cs = m.custodian_callsign || m.logged_by_callsign;
        if (cs && cs.toUpperCase() !== (reqData.requested_by_callsign || '').toUpperCase()) {
          holderCallsigns.add(cs);
        }
      }

      for (const cs of holderCallsigns) {
        const users = await base44.asServiceRole.entities.NexusUser.filter({ callsign: cs });
        const user = (users || [])[0];
        if (user) {
          notifications.push({
            type: 'REQUISITION_REQUEST',
            title: `Material Needed${priorityTag}`,
            body: `${reqData.requested_by_callsign} needs ${qtyLabel ? qtyLabel + ' ' : ''}${itemLabel} — you hold stock. Check Requisitions.`,
            severity: 'INFO',
            target_user_id: user.id,
            target_callsign: cs,
            source_module: 'INDUSTRY',
            source_id: event?.entity_id || null,
            is_read: false,
            created_at: now,
          });
        }
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.NexusNotification.bulkCreate(notifications);
    }

    return Response.json({ ok: true, notifications_sent: notifications.length });
  } catch (error) {
    console.error('[requisitionNotify]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});