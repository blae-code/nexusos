import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  errorResponse,
  findEntityById,
  LEADER_RANKS,
  normalizeEnum,
  normalizeRoleSlots,
  okResponse,
  requirePostJson,
  requireSessionUser,
  textValue,
  VALID_RSVP_STATUSES,
  NexusWriteError,
} from '../_shared/nexusWriteValidation/entry.ts';

Deno.serve(async (req) => {
  try {
    const body = await requirePostJson(req);
    const base44 = createClientFromRequest(req);
    const sessionUser = await requireSessionUser(req);
    const action = textValue(body?.action || 'upsert').toLowerCase();
    const opId = textValue(body?.op_id);

    if (!opId) {
      throw new NexusWriteError('op_id_required', 400);
    }

    const op = await findEntityById(base44, 'Op', opId);
    if (!op) {
      throw new NexusWriteError('op_not_found', 404);
    }
    if (!['PUBLISHED', 'LIVE'].includes(textValue(op.status).toUpperCase())) {
      throw new NexusWriteError('op_not_rsvpable', 400);
    }

    const requestedUserId = textValue(body?.user_id);
    const actingOnOtherUser = requestedUserId && requestedUserId !== String(sessionUser.id);
    if (actingOnOtherUser && !LEADER_RANKS.has(textValue(sessionUser?.nexus_rank).toUpperCase())) {
      throw new NexusWriteError('forbidden', 403);
    }

    const targetUserId = requestedUserId || String(sessionUser.id);
    const targetUser = actingOnOtherUser
      ? await findEntityById(base44, 'NexusUser', targetUserId)
      : sessionUser;

    if (!targetUser?.id) {
      throw new NexusWriteError('target_user_not_found', 404);
    }

    const existing = (await base44.asServiceRole.entities.OpRsvp.filter({
      op_id: opId,
      user_id: targetUser.id,
    }))?.[0] || null;

    if (action === 'decline') {
      const payload = existing
        ? await base44.asServiceRole.entities.OpRsvp.update(existing.id, { status: 'DECLINED' })
        : await base44.asServiceRole.entities.OpRsvp.create({
            op_id: opId,
            user_id: targetUser.id,
            callsign: textValue(targetUser.callsign || body?.callsign) || 'UNKNOWN',
            role: '',
            status: 'DECLINED',
            ship: '',
          });

      return okResponse({ rsvp: payload });
    }

    const status = normalizeEnum(body?.status || 'CONFIRMED', VALID_RSVP_STATUSES, 'invalid_rsvp_status');
    const role = textValue(body?.role);
    const validRoles = normalizeRoleSlots(op.role_slots);

    if (status === 'CONFIRMED' && validRoles.length > 0 && !validRoles.includes(role)) {
      throw new NexusWriteError('invalid_rsvp_role', 400);
    }

    const ship = textValue(body?.ship);
    const payload = {
      op_id: opId,
      user_id: targetUser.id,
      callsign: textValue(targetUser.callsign || body?.callsign) || 'UNKNOWN',
      role,
      status,
      ship,
    };

    const rsvp = existing
      ? await base44.asServiceRole.entities.OpRsvp.update(existing.id, payload)
      : await base44.asServiceRole.entities.OpRsvp.create(payload);

    return okResponse({ rsvp });
  } catch (error) {
    return errorResponse(error);
  }
});
