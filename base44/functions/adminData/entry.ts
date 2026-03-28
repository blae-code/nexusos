import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  deactivateAdminRecord,
  deleteAdminRecord,
  getAdminRecord,
  listAdminActionLog,
  listAdminEntityConfigs,
  listAdminRecords,
  restoreAdminRecord,
  updateAdminRecord,
} from '../_shared/adminControl/entry.ts';
import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

function errorStatus(code: string) {
  if (code === 'forbidden') return 403;
  if (code === 'record_not_found') return 404;
  if (code === 'method_not_allowed') return 405;
  if (code === 'unknown_entity' || code === 'invalid_action' || code === 'invalid_patch' || code === 'empty_patch' || code === 'reason_required') return 400;
  if (code === 'entity_not_available' || code === 'entity_unreadable' || code === 'admin_action_log_unavailable') return 500;
  if (code === 'entity_read_only' || code === 'delete_not_supported' || code === 'deactivate_not_supported' || code === 'restore_not_supported' || code === 'entity_not_deletable') return 409;
  return 500;
}

function jsonError(code: string) {
  return Response.json({ error: code }, { status: errorStatus(code), headers: sessionNoStoreHeaders() });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonError('method_not_allowed');
    }

    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return jsonError('forbidden');
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = typeof body.action === 'string' ? body.action.trim() : 'list_entities';
    const base44 = createClientFromRequest(req);
    const actor = {
      id: adminSession.user.id,
      callsign: adminSession.user.callsign || adminSession.user.login_name || null,
    };

    if (action === 'list_entities') {
      return Response.json({
        ok: true,
        action,
        entities: listAdminEntityConfigs(),
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'list_records') {
      const result = await listAdminRecords(base44, {
        entity: body.entity,
        query: body.query,
        id: body.id,
        sort: body.sort,
        limit: body.limit,
        page: body.page,
        recent_window: body.recent_window,
      });

      return Response.json({
        ok: true,
        action,
        ...result,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'get_record') {
      const result = await getAdminRecord(base44, String(body.entity || '').trim(), String(body.id || '').trim());
      return Response.json({
        ok: true,
        action,
        ...result,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'update_record') {
      const record = await updateAdminRecord(
        base44,
        actor,
        String(body.entity || '').trim(),
        String(body.id || '').trim(),
        body.patch,
        body.reason,
      );

      return Response.json({
        ok: true,
        action,
        record,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'deactivate_record') {
      const record = await deactivateAdminRecord(
        base44,
        actor,
        String(body.entity || '').trim(),
        String(body.id || '').trim(),
        body.reason,
      );

      return Response.json({
        ok: true,
        action,
        record,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'restore_record') {
      const record = await restoreAdminRecord(
        base44,
        actor,
        String(body.entity || '').trim(),
        String(body.id || '').trim(),
        body.reason,
      );

      return Response.json({
        ok: true,
        action,
        record,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'delete_record') {
      const result = await deleteAdminRecord(
        base44,
        actor,
        String(body.entity || '').trim(),
        String(body.id || '').trim(),
        body.reason,
      );

      return Response.json({
        ok: true,
        action,
        ...result,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'get_action_log') {
      const limit = Math.max(1, Math.min(100, Number(body.limit) || 20));
      const records = await listAdminActionLog(base44, limit);
      return Response.json({
        ok: true,
        action,
        records,
      }, { headers: sessionNoStoreHeaders() });
    }

    return jsonError('invalid_action');
  } catch (error) {
    const code = error instanceof Error ? error.message : 'internal_error';
    console.error('[adminData]', error);
    return jsonError(code);
  }
});
