/**
 * DEACTIVATED: authDiag
 * Discord auth diagnostics have been removed from NexusOS.
 */

Deno.serve(() => {
  return Response.json({
    ok: true,
    deactivated: true,
    auth_mode: 'issued_key',
    message: 'Legacy Discord auth diagnostics have been archived.',
  }, { headers: { 'Cache-Control': 'no-store' } });
});
