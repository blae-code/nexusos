import {
  clearSessionCookie,
  sessionNoStoreHeaders,
} from '../_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const headers = new Headers(sessionNoStoreHeaders());
  clearSessionCookie(headers, req);

  return Response.json({ success: true }, { headers });
});
