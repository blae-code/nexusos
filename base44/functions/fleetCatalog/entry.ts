import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';
import { buildFleetCatalog } from '../_shared/fleetPlanning/entry.ts';

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
    const data = await buildFleetCatalog(base44, payload || {});
    return Response.json(data);
  } catch (error) {
    console.error('[fleetCatalog]', error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'request_failed' }, { status: 500 });
  }
});
