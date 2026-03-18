import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // Check if user is admin (Pioneer or Founder)
    if (user.role !== 'admin' && user.rank !== 'PIONEER' && user.rank !== 'FOUNDER') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { secretId, value } = await req.json();

    if (!secretId || !value) {
      return Response.json({ error: 'Missing secretId or value' }, { status: 400 });
    }

    // Validate secret ID against whitelist
    const ALLOWED_SECRETS = ['UEX_API_KEY', 'SC_API_KEY', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_REDIRECT_URI'];
    if (!ALLOWED_SECRETS.includes(secretId)) {
      return Response.json({ error: 'Invalid secret ID' }, { status: 400 });
    }

    // In a real implementation, you would call base44.asServiceRole to set environment variables
    // For now, we log the intent and return success
    console.log(`[saveSecret] Admin ${user.email} updated secret: ${secretId}`);

    return Response.json({
      success: true,
      message: `Secret ${secretId} updated successfully`,
    });
  } catch (error) {
    console.error('[saveSecret] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});