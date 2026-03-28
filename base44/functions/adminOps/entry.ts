import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { syncCommodityPrices } from '../commodityPriceSync/entry.ts';
import { syncFleetYardsRoster } from '../fleetyardsRosterSync/entry.ts';
import { syncGameData } from '../gameDataSync/entry.ts';
import { writeAdminActionLog } from '../_shared/adminControl/entry.ts';
import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function unwrapInvokeResult(value: unknown) {
  if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).data;
  }
  return value;
}

function errorStatus(code: string) {
  if (code === 'forbidden') return 403;
  if (code === 'method_not_allowed') return 405;
  if (code === 'invalid_action') return 400;
  return 500;
}

function jsonError(code: string) {
  return Response.json({ error: code }, { status: errorStatus(code), headers: sessionNoStoreHeaders() });
}

async function runAdminOperation(base44: any, action: string) {
  if (action === 'sync_fleetyards_roster') {
    const handle = textValue(Deno.env.get('FLEETYARDS_HANDLE'));
    if (!handle) {
      throw new Error('FLEETYARDS_HANDLE not configured');
    }
    return await syncFleetYardsRoster(base44, handle);
  }

  if (action === 'sync_uex_prices') {
    return await syncCommodityPrices(base44);
  }

  if (action === 'sync_game_data') {
    return await syncGameData(base44);
  }

  if (action === 'refresh_patch_digest') {
    return unwrapInvokeResult(await base44.asServiceRole.functions.invoke('rssCheck', {}));
  }

  if (action === 'run_patch_intelligence_self_test') {
    return unwrapInvokeResult(await base44.asServiceRole.functions.invoke('patchIntelligenceAgent', { mode: 'self_test' }));
  }

  throw new Error('invalid_action');
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

    const action = textValue(body.action);
    if (!action) {
      return jsonError('invalid_action');
    }

    const base44 = createClientFromRequest(req);
    const startedAt = new Date().toISOString();
    const reason = textValue(body.reason) || null;
    const actor = {
      id: adminSession.user.id,
      callsign: adminSession.user.callsign || adminSession.user.login_name || null,
    };

    try {
      const result = await runAdminOperation(base44, action);
      const endedAt = new Date().toISOString();
      await writeAdminActionLog(base44, actor, {
        actionType: 'RUN_ADMIN_OP',
        entityName: 'SYSTEM',
        recordId: action,
        recordLabel: action,
        reason,
        strategy: action,
        beforeSnapshot: { action, started_at: startedAt },
        afterSnapshot: { action, started_at: startedAt, completed_at: endedAt, result },
      });

      return Response.json({
        ok: true,
        action,
        started_at: startedAt,
        completed_at: endedAt,
        result,
      }, { headers: sessionNoStoreHeaders() });
    } catch (error) {
      const endedAt = new Date().toISOString();
      await writeAdminActionLog(base44, actor, {
        actionType: 'RUN_ADMIN_OP_FAILED',
        entityName: 'SYSTEM',
        recordId: action,
        recordLabel: action,
        reason,
        strategy: action,
        beforeSnapshot: { action, started_at: startedAt },
        afterSnapshot: { action, started_at: startedAt, failed_at: endedAt, error: error instanceof Error ? error.message : 'unknown_error' },
      }).catch((logError) => {
        console.error('[adminOps] failed to log failed operation', logError);
      });

      throw error;
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'internal_error';
    console.error('[adminOps]', error);
    return Response.json({ error: code }, { status: errorStatus(code), headers: sessionNoStoreHeaders() });
  }
});
