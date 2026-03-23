import {
  resolveMemberSession,
  sessionNoStoreHeaders,
} from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  try {
    const result = await resolveMemberSession(req);

    if (!result) {
      return Response.json({ authenticated: false }, {
        status: 401,
        headers: sessionNoStoreHeaders(),
      });
    }

    return Response.json(result, {
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
