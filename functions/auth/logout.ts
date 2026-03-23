import { clearSessionCookie, sessionNoStoreHeaders } from './_shared/issuedKey.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const headers = new Headers(sessionNoStoreHeaders());
  clearSessionCookie(headers, req);

  return Response.json({ success: true }, { headers });
});
