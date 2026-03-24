/**
 * DEPRECATED — patchFeedPoller has been retired.
 *
 * Patch ingestion is now handled exclusively by patchIntelligenceAgent.
 * Keeping this endpoint as a no-op prevents duplicate PatchDigest records if
 * legacy automations are still enabled in Base44.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  createClientFromRequest(req);

  return Response.json({
    success: true,
    deprecated: true,
    processor: 'patchFeedPoller',
    active_pipeline: 'patchIntelligenceAgent',
    message: 'Patch feed polling has been consolidated into patchIntelligenceAgent.',
  });
});
