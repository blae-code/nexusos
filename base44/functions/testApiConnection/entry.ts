import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

const API_TESTS = {
  UEX_API_KEY: async (key) => {
    // Test UEX Corp API
    const res = await fetch('https://api.uexcorp.space/api/v2/body/Stanton', {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  },

  SC_API_KEY: async (key) => {
    // Test Star Citizen API
    const res = await fetch(`https://api.starcitizen-api.com/api/v2/live/vehicles?key=${key}`);
    return res.ok;
  },
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
    }

    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: sessionNoStoreHeaders() });
    }

    const { secretId } = await req.json();

    if (!secretId || !API_TESTS[secretId]) {
      return Response.json({ error: 'invalid_secret_id' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    const value = Deno.env.get(secretId);
    if (!value) {
      return Response.json({
        success: false,
        error: 'secret_not_configured',
        secretId,
        timestamp: new Date().toISOString(),
      }, { headers: sessionNoStoreHeaders() });
    }

    const testFn = API_TESTS[secretId];
    const isValid = await testFn(value);

    return Response.json({
      success: isValid,
      secretId,
      timestamp: new Date().toISOString(),
    }, { headers: sessionNoStoreHeaders() });
  } catch (error) {
    console.error('[testApiConnection] Error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
