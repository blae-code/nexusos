/**
 * POST /auth/logout — Clear session cookie.
 * Self-contained: no local imports.
 */
const SESSION_COOKIE_NAME = 'nexus_member_session';

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configured = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const fwd = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
    const host = (req.headers.get('host') || '').split(',')[0]?.trim();
    const requestHost = (fwd || host || new URL(req.url).hostname || '').split(':')[0].replace(/^www\./, '').toLowerCase();
    if (requestHost === configured || requestHost.endsWith(`.${configured}`)) return configured;
    return null;
  } catch { return null; }
}

Deno.serve((req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'SameSite=Lax', 'HttpOnly', 'Max-Age=0'];
  const domain = getCookieDomain(req);
  if (domain) parts.push(`Domain=.${domain}`);
  if (isSecure(req)) parts.push('Secure');

  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', parts.join('; '));

  return Response.json({ success: true }, { headers });
});