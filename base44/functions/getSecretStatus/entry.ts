import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function isAdminUser(user) {
  const rank = String(user?.nexus_rank || user?.rank || '').toUpperCase();
  return user?.role === 'admin' || rank === 'PIONEER' || rank === 'FOUNDER';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdminUser(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return which secrets are set (not the values, just existence markers)
    const ALLOWED_SECRETS = ['UEX_API_KEY', 'SC_API_KEY'];
    const secretStatus = {};

    ALLOWED_SECRETS.forEach((secretId) => {
      // Check if secret is set in environment (truthy check only)
      const value = Deno.env.get(secretId);
      // Return a placeholder if set, so frontend knows it's configured
      secretStatus[secretId] = value ? 'SET' : null;
    });

    return Response.json(secretStatus);
  } catch (error) {
    console.error('[getSecretStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
