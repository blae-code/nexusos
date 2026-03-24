/**
 * DEACTIVATED: Discord OAuth callback
 */
Deno.serve(() =>
  Response.json(
    {
      error: 'gone',
      ok: false,
      deactivated: true,
      message: 'Discord OAuth has been removed from NexusOS',
    },
    { status: 410 },
  )
);
