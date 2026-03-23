/**
 * GET /auth/ping — Minimal health check. No deps, no DB, no env vars.
 */
Deno.serve(() => {
  return Response.json({ ok: true, message: 'pong', timestamp: Date.now() });
});