import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';
import { buildFleetPlanningSnapshot } from '../_shared/fleetPlanning/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  const resolved = await resolveIssuedKeySession(req);
  if (!resolved) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const snapshot = await buildFleetPlanningSnapshot(base44, String(payload?.scenarioId || payload?.scenario_id || '') || null);
    return Response.json(snapshot);
  } catch (error) {
    console.error('[fleetPlanningSnapshot]', error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'request_failed' }, { status: 500 });
  }
});
