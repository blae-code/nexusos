/**
 * DEACTIVATED: heraldBot
 *
 * Discord delivery has been removed from NexusOS.
 * This function remains as a non-failing stub so legacy callers do not crash.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  let action = 'unknown';

  try {
    const body = await req.json().catch(() => ({}));
    action = typeof body?.action === 'string' ? body.action : 'unknown';
  } catch {
    action = 'unknown';
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    return Response.json({
      ok: true,
      stub: true,
      deactivated: true,
      action,
      actor_id: user?.id ?? null,
      message: 'heraldBot is deactivated',
    });
  } catch {
    return Response.json({
      ok: true,
      stub: true,
      deactivated: true,
      action,
      actor_id: null,
      message: 'heraldBot is deactivated',
    });
  }
});
