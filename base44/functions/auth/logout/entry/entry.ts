// Self-contained logout handler — no local imports
const SESSION_COOKIE_NAME = 'nexus_member_session';
const STATE_COOKIE_NAME = 'nexus_oauth_state';

function isSecureRequest(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  const reqUrl = new URL(req.url);
  return appUrl.startsWith('https://') || reqUrl.protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function clearCookieHeader(headers, name, req) {
  const parts = [
    `${name}=`,
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
    'HttpOnly',
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  headers.append('Set-Cookie', parts.join('; '));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const headers = new Headers({ 'Cache-Control': 'no-store' });
  clearCookieHeader(headers, SESSION_COOKIE_NAME, req);
  clearCookieHeader(headers, STATE_COOKIE_NAME, req);

  return Response.json({ success: true }, { headers });
});