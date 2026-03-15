/**
 * Polls RSI server status + starcitizen-api.com
 * Returns { status: 'online' | 'degraded' | 'offline' | 'unknown' }
 */
Deno.serve(async (req) => {
  try {
    const SC_API_KEY = Deno.env.get('SC_API_KEY');

    // Try starcitizen-api.com first
    if (SC_API_KEY) {
      const res = await fetch('https://api.starcitizen-api.com/status', {
        headers: { 'apikey': SC_API_KEY },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const s = data?.data?.status?.toLowerCase();
        if (s === 'online')  return Response.json({ status: 'online' });
        if (s === 'offline') return Response.json({ status: 'offline' });
        return Response.json({ status: 'degraded' });
      }
    }

    // Fallback — RSI status page
    const rsi = await fetch('https://status.robertsspaceindustries.com/', {
      signal: AbortSignal.timeout(5000),
    });
    return Response.json({ status: rsi.ok ? 'online' : 'offline' });

  } catch {
    return Response.json({ status: 'unknown' });
  }
});