const SESSION_COOKIE_NAME = 'nexus_member_session';

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') || new URL(req.url).protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function getCookieDomain(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!appUrl) return null;
  try {
    const configuredHost = new URL(appUrl).hostname.replace(/^www\./, '').toLowerCase();
    const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0]?.trim();
    const hostHeader = (req.headers.get('host') || '').split(',')[0]?.trim();
    const requestHost = (forwardedHost || hostHeader || new URL(req.url).hostname || '').split(':')[0].replace(/^www\./, '').toLowerCase();
    if (requestHost === configuredHost || requestHost.endsWith(`.${configuredHost}`)) return configuredHost;
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
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
  }

  const headers = new Headers({ 'Cache-Control': 'no-store' });
  clearSessionCookie(headers, req);

  return Response.json({ success: true }, { headers });
});