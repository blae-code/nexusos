/**
 * GET /auth/session — Validate issued-key session cookie and return current user.
 */
import {
  resolveIssuedKeySession,
  sessionNoStoreHeaders,
  toSessionResponse,
} from '../_shared/issuedKey.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  try {
    const resolved = await resolveIssuedKeySession(req);
    if (!resolved) {
      return Response.json({ authenticated: false }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    return Response.json(toSessionResponse(resolved.user), {
      status: 200,
      headers: sessionNoStoreHeaders(),
    });
  } catch (error) {
    console.error('[auth/session]', error);
    return Response.json({ authenticated: false, error: 'session_unavailable' }, {
      status: 500,
      headers: sessionNoStoreHeaders(),
    });
  }
});
