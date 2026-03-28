import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  buildMaterialRecord,
  errorResponse,
  findEntityById,
  okResponse,
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

    if (action === 'update') {
      const materialId = textValue(body?.material_id);
      if (!materialId) {
        throw new NexusWriteError('material_id_required', 400);
      }

      const existing = await findEntityById(base44, 'Material', materialId);
      if (!existing) {
        throw new NexusWriteError('material_not_found', 404);
      }

      const material = await base44.asServiceRole.entities.Material.update(materialId, buildMaterialRecord({
        ...existing,
        ...body,
        source_type: body?.source_type || existing.source_type || 'MANUAL',
        screenshot_ref: body?.screenshot_ref ?? existing.screenshot_ref,
        notes: body?.notes ?? existing.notes,
        session_id: body?.session_id ?? existing.session_id,
        location: body?.location ?? existing.location,
        container: body?.container ?? existing.container,
        logged_at: body?.logged_at ?? existing.logged_at,
      }, user, {
        logged_by_user_id: existing.logged_by_user_id || user.id || null,
        logged_by_callsign: existing.logged_by_callsign || user.callsign || 'UNKNOWN',
      }));

      return okResponse({ material });
    }

    const items = Array.isArray(body?.materials) ? body.materials : [body];
    const materials = [];

    for (const item of items) {
      const material = await base44.asServiceRole.entities.Material.create(buildMaterialRecord(item || {}, user));
      materials.push(material);
    }

    return okResponse({
      material: materials[0] || null,
      materials,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
