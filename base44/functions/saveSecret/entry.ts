import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
    }

    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
    }

    return Response.json({
      success: false,
      error: 'secrets_managed_externally',
      message: 'Deployment secrets must be updated in the hosting environment, not from NexusOS.',
    }, { status: 410, headers: sessionNoStoreHeaders() });
  } catch (error) {
    console.error('[saveSecret] Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
