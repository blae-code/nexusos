/**
 * commodityPriceSync — Admin/system alias for the shared commodity market sync.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { runCommodityMarketSync } from '../_shared/uexMarket/entry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const result = await runCommodityMarketSync(base44, {
      triggerMode: 'manual',
      triggeredBy: 'ADMIN',
    });
    return Response.json(result, { status: result.status === 'failed' ? 500 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[commodityPriceSync] unhandled error:', message);
    return Response.json({ ok: false, status: 'failed', error: message }, { status: 500 });
  }
});
