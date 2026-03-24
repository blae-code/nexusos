/**
 * GET /auth/health — Health check for auth system.
 * Self-contained.
 */
Deno.serve((req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  const ready = Boolean(Deno.env.get('SESSION_SIGNING_SECRET')?.trim());

  return Response.json({
    ok: ready,
    auth_mode: 'issued_key',
    remember_me_supported: true,
    status: ready ? 'ok' : 'error',
    onboarding_steps: [
      'Receive your issued username, rank, and auth key from a Pioneer.',
      'Sign in with your issued username and auth key.',
      'Complete onboarding on first login only.',
      'If you lose your auth key, ask a Pioneer to revoke and regenerate it.',
    ],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
});