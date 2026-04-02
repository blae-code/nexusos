/**
 * uexSyncPrices — Manual commodity market refresh backed by the shared sync pipeline.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { runCommodityMarketSync } from '../_shared/uexMarket/entry.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body: Record<string, unknown> = {};
    try {
      if (req.method === 'POST') body = await req.json();
    } catch {
      body = {};
    }

    const result = await runCommodityMarketSync(base44, {
      triggerMode: body.trigger_mode === 'auto' ? 'auto' : 'manual',
      triggeredBy: typeof body.triggered_by === 'string' ? body.triggered_by : 'MANUAL',
    });

    return Response.json(result, { status: result.status === 'failed' ? 500 : 200, headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[uexSyncPrices]', message);
    return Response.json({ ok: false, status: 'failed', error: message }, { status: 500, headers: NO_STORE });
  }
});
