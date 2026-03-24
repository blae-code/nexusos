import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createNotification, NexusNotificationError } from '../_shared/nexusNotification/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  try {
    const payload = await req.json();
    const base44 = createClientFromRequest(req);
    const notification = await createNotification(base44, payload || {});

    return Response.json({
      ok: true,
      id: notification.id,
      notification,
    });
  } catch (error) {
    if (error instanceof NexusNotificationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }

    console.error('[notifyUser]', error);
    return Response.json({ error: 'notification_failed' }, { status: 500 });
  }
});
