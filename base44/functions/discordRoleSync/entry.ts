/**
 * DEACTIVATED: discordRoleSync
 *
 * NexusOS rank management is now manual.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  createClientFromRequest(req);

  return Response.json({
    ok: true,
    stub: true,
    deactivated: true,
    message: 'discordRoleSync is deactivated',
  });
});
