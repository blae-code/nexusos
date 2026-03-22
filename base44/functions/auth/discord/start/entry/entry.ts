// Self-contained Discord OAuth start handler — no local imports
const enc = new TextEncoder();
const STATE_COOKIE_NAME = 'nexus_oauth_state';
const STATE_MAX_AGE_SECONDS = 60 * 10;

function toBase64Url(bytes) {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET is not configured');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signValue(value) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function encodeSignedPayload(payload) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signature = await signValue(body);
  return `${body}.${signature}`;
}

function isSecureRequest(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  const reqUrl = new URL(req.url);
  return appUrl.startsWith('https://') || reqUrl.protocol === 'https:' || (req.headers.get('x-forwarded-proto') || '').includes('https');
}

function setCookieHeader(headers, name, value, req, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    'SameSite=Lax',
  ];
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (isSecureRequest(req)) parts.push('Secure');
  headers.append('Set-Cookie', parts.join('; '));
}

function normalizeRedirectTo(raw) {
  if (!raw) return '/app/industry';
  if (!raw.startsWith('/')) return '/app/industry';
  if (raw.startsWith('//')) return '/app/industry';
  if (!raw.startsWith('/app') && raw !== '/onboarding') return '/app/industry';
  return raw;
}

function normalizeAppBase(raw) {
  if (!raw || raw === '/') return '';
  if (!raw.startsWith('/')) return '';
  if (raw.startsWith('//')) return '';
  if (raw.includes('?') || raw.includes('#')) return '';
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return trimmed === '/' ? '' : trimmed;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const clientId = Deno.env.get('DISCORD_CLIENT_ID');
    const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new Error('Discord OAuth is not fully configured');
    }

    const url = new URL(req.url);
    const redirectTo = normalizeRedirectTo(url.searchParams.get('redirect_to'));
    const appBase = normalizeAppBase(url.searchParams.get('app_base'));

    const state = crypto.randomUUID().replace(/-/g, '');
    const signedState = await encodeSignedPayload({
      state,
      redirect_to: redirectTo,
      app_base: appBase,
      exp: Date.now() + (STATE_MAX_AGE_SECONDS * 1000),
    });

    const discordUrl = new URL('https://discord.com/api/v10/oauth2/authorize');
    discordUrl.searchParams.set('client_id', clientId);
    discordUrl.searchParams.set('response_type', 'code');
    discordUrl.searchParams.set('scope', 'identify guilds.members.read');
    discordUrl.searchParams.set('redirect_uri', redirectUri);
    discordUrl.searchParams.set('state', state);
    discordUrl.searchParams.set('prompt', 'consent');

    const headers = new Headers({ Location: discordUrl.toString() });
    setCookieHeader(headers, STATE_COOKIE_NAME, signedState, req, { maxAge: STATE_MAX_AGE_SECONDS });

    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('[auth/discord/start]', error);
    return Response.json({ error: 'Discord OAuth unavailable' }, { status: 500 });
  }
});