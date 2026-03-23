import { SESSION_COOKIE_NAME, STATE_COOKIE_NAME, clearCookie, sessionNoStoreHeaders } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const headers = new Headers(sessionNoStoreHeaders());
  clearCookie(headers, SESSION_COOKIE_NAME, req);
  clearCookie(headers, STATE_COOKIE_NAME, req);

  return Response.json({ success: true }, { headers });
});
