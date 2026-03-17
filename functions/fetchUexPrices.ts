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

    const uexApiKey = Deno.env.get('UEX_API_KEY');
    if (!uexApiKey) {
      return Response.json({ error: 'UEX API key not configured' }, { status: 503 });
    }

    const { commodity = null } = await req.json();

    // Fetch from UEX API
    const endpoint = commodity
      ? `https://api.uexcorp.space/api/v2/commodities/${commodity}`
      : 'https://api.uexcorp.space/api/v2/commodities?limit=50';

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${uexApiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `UEX API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json({ success: true, data, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[fetchUexPrices] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});