import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'GET') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
    }

    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
    }

    const secrets = ['UEX_API_KEY', 'SC_API_KEY', 'SESSION_SIGNING_SECRET', 'SYSTEM_ADMIN_BOOTSTRAP_SECRET', 'APP_URL']
      .reduce((acc, secretId) => {
        acc[secretId] = {
          configured: Boolean(String(Deno.env.get(secretId) || '').trim()),
          protected: ['SESSION_SIGNING_SECRET', 'SYSTEM_ADMIN_BOOTSTRAP_SECRET', 'APP_URL'].includes(secretId),
        };
        return acc;
      }, {});

    return Response.json({
      secrets,
      environment: {
        app_url: String(Deno.env.get('APP_URL') || '').trim() || null,
      },
    }, { headers: sessionNoStoreHeaders() });
  } catch (error) {
    console.error('[getSecretStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
