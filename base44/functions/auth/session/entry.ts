import {
  resolveIssuedKeySession,
  sessionNoStoreHeaders,
  toSessionResponse,
} from './_shared/issuedKey.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  try {
    const resolved = await resolveIssuedKeySession(req);

    if (!resolved) {
      return Response.json({ authenticated: false }, {
        status: 401,
        headers: sessionNoStoreHeaders(),
      });
    }

    return Response.json(toSessionResponse(resolved.user), {
      status: 200,
      headers: sessionNoStoreHeaders(),
    });
  } catch (error) {
    console.error('[auth/session]', error);
    return Response.json({ authenticated: false }, {
      status: 500,
      headers: sessionNoStoreHeaders(),
    });
  }
});
