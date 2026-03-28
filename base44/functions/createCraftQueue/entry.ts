import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  buildCraftQueueRecord,
  errorResponse,
  findEntityById,
  normalizeEnum,
  okResponse,
  requirePostJson,
  requireSessionUser,
  textValue,
  VALID_CRAFT_STATUSES,
  NexusWriteError,
} from '../_shared/nexusWriteValidation/entry.ts';

Deno.serve(async (req) => {
  try {
    const body = await requirePostJson(req);
    const base44 = createClientFromRequest(req);
    const user = await requireSessionUser(req);
    const action = textValue(body?.action || 'create').toLowerCase();

    if (action === 'claim' || action === 'status') {
      const queueId = textValue(body?.queue_id);
      if (!queueId) {
        throw new NexusWriteError('queue_id_required', 400);
      }

      const existing = await findEntityById(base44, 'CraftQueue', queueId);
      if (!existing) {
        throw new NexusWriteError('craft_queue_not_found', 404);
      }

      const nextStatus = action === 'claim'
        ? 'CLAIMED'
        : normalizeEnum(body?.status, VALID_CRAFT_STATUSES, 'invalid_craft_status');

      const patch: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === 'CLAIMED') {
        patch.claimed_by_user_id = user.id || null;
        patch.claimed_by_callsign = user.callsign || 'UNKNOWN';
      }

      const item = await base44.asServiceRole.entities.CraftQueue.update(queueId, patch);
      return okResponse({ item });
    }

    const blueprintId = textValue(body?.blueprint_id);
    const blueprint = blueprintId ? await findEntityById(base44, 'Blueprint', blueprintId) : null;
    const item = await base44.asServiceRole.entities.CraftQueue.create(buildCraftQueueRecord(body, blueprint, user));
    return okResponse({ item });
  } catch (error) {
    return errorResponse(error);
  }
});
