import {
  resolveMemberSession,
  sessionNoStoreHeaders,
} from '../../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  try {
    const session = await resolveMemberSession(req);

    if (!session) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: sessionNoStoreHeaders(),
      });
    }

    return new Response(JSON.stringify(session), {
      status: 200,
      headers: sessionNoStoreHeaders(),
    });
  } catch (error) {
    console.error('[auth/session]', error);
    return new Response(JSON.stringify({ authenticated: false, error: error.message }), {
      status: 500,
      headers: sessionNoStoreHeaders(),
    });
  }
});