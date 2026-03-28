import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  buildMaterialRecord,
  buildRefineryOrderRecord,
  errorResponse,
  findEntityById,
  normalizeLookup,
  okResponse,
  optionalNumber,
  qualityPercentFromScore,
  requirePostJson,
  requireSessionUser,
  textValue,
  NexusWriteError,
} from '../_shared/nexusWriteValidation/entry.ts';

Deno.serve(async (req) => {
  try {
    const body = await requirePostJson(req);
    const base44 = createClientFromRequest(req);
    const user = await requireSessionUser(req);
    const action = textValue(body?.action || 'create').toLowerCase();

    if (action === 'collect') {
      const orderId = textValue(body?.order_id);
      if (!orderId) {
        throw new NexusWriteError('order_id_required', 400);
      }

      const existing = await findEntityById(base44, 'RefineryOrder', orderId);
      if (!existing) {
        throw new NexusWriteError('refinery_order_not_found', 404);
      }

      const order = await base44.asServiceRole.entities.RefineryOrder.update(orderId, { status: 'COLLECTED' });
      return okResponse({ order });
    }

    const orderRecord = buildRefineryOrderRecord(body, user);
    const activeOrders = await base44.asServiceRole.entities.RefineryOrder.filter({
      submitted_by_user_id: user.id,
      status: 'ACTIVE',
    });

    const duplicate = (activeOrders || []).find((order: any) =>
      normalizeLookup(order.material_name) === normalizeLookup(orderRecord.material_name)
      && normalizeLookup(order.station) === normalizeLookup(orderRecord.station),
    );

    if (duplicate) {
      throw new NexusWriteError('duplicate_refinery_order', 409, { existing_id: duplicate.id });
    }

    const order = await base44.asServiceRole.entities.RefineryOrder.create(orderRecord);
    try {
      const estimatedOutputScu = optionalNumber(body?.estimated_output_scu);
      const pendingQualityPct = optionalNumber(body?.quality_retained_pct)
        ?? (orderRecord.quality_score ? qualityPercentFromScore(orderRecord.quality_score) : null)
        ?? 100;

      const pendingMaterial = await base44.asServiceRole.entities.Material.create(buildMaterialRecord({
        material_name: orderRecord.material_name,
        quantity_scu: estimatedOutputScu ?? (orderRecord.quantity_scu * ((optionalNumber(body?.yield_pct) ?? 100) / 100)),
        quality_pct: pendingQualityPct,
        material_type: 'REFINED',
        location: orderRecord.station,
        source_type: 'REFINERY_ORDER',
        session_id: order.id,
        notes: textValue(body?.notes)
          || `Refining via ${orderRecord.method} at ${orderRecord.station}${optionalNumber(body?.processing_minutes) ? ` - ETA ${Math.round(optionalNumber(body?.processing_minutes) || 0)}m` : ''}`,
        logged_at: orderRecord.started_at,
      }, user));

      return okResponse({ order, pending_material: pendingMaterial });
    } catch (error) {
      await base44.asServiceRole.entities.RefineryOrder.delete(order.id).catch(() => null);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
});
