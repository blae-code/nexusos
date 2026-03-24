/**
 * DEACTIVATED: publishOpToDiscord
 *
 * Discord op publishing has been removed from NexusOS.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  const body = await req.json().catch(() => ({}));

  return Response.json({
    ok: true,
    stub: true,
    deactivated: true,
    actor_id: user?.id ?? null,
    op_id: body?.op_id ?? null,
    message: 'publishOpToDiscord is deactivated',
  });
});
