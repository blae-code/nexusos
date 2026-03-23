/**
 * GET /auth/health — Simple readiness check.
 */
Deno.serve((req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  const ready = Boolean(Deno.env.get('SESSION_SIGNING_SECRET')?.trim());

  return Response.json({
    ok: ready,
    auth_mode: 'issued_key',
    remember_me_supported: true,
    status: ready ? 'ok' : 'error',
  }, { headers: { 'Cache-Control': 'no-store' } });
});
