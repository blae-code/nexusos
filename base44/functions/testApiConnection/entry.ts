import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

function isAdminUser(user) {
  const rank = String(user?.nexus_rank || user?.rank || '').toUpperCase();
  return user?.role === 'admin' || rank === 'PIONEER' || rank === 'FOUNDER';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { secretId } = await req.json();

    if (!secretId || !API_TESTS[secretId]) {
      return Response.json({ error: 'Invalid secret ID' }, { status: 400 });
    }

    // Get the secret value from environment
    const value = Deno.env.get(secretId);
    if (!value) {
      return Response.json({ success: false, error: 'Secret not configured' });
    }

    // Run the test
    const testFn = API_TESTS[secretId];
    const isValid = await testFn(value);

    return Response.json({
      success: isValid,
      secretId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[testApiConnection] Error:', error);
    return Response.json({
      success: false,
      error: error.message,
    });
  }
});
