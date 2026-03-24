/**
 * POST /auth/logout — Clear session cookie.
 * Self-contained.
 */
const SESSION_COOKIE_NAME = 'nexus_member_session';

function sessionNoStoreHeaders() {
  return { 'Cache-Control': 'no-store' };
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getRequestHostname(req) {
  const fh = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
  const hh = (req.headers.get('host') || '').split(',')[0]?.trim();
  return (fh || hh || new URL(req.url).hostname || '').split(':')[0].replace(/^www\./, '').toLowerCase();
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configured = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const requestHost = getRequestHostname(req);
    if (!configured || !requestHost) return null;
    if (requestHost === configured || requestHost.endsWith(`.${configured}`)) return configured;
    return null;
  } catch { return null; }
}

function clearSessionCookie(headers, req) {
  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'SameSite=Lax', 'HttpOnly', 'Max-Age=0'];
  const domain = getCookieDomain(req);
  if (domain) parts.push(`Domain=.${domain}`);
  if (isSecure(req)) parts.push('Secure');
  headers.append('Set-Cookie', parts.join('; '));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  const headers = new Headers(sessionNoStoreHeaders());
  clearSessionCookie(headers, req);

  return Response.json({ success: true }, { headers });
});