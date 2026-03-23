// Self-contained Discord OAuth start handler — apex canonical
// Reads DISCORD_REDIRECT_URI and APP_URL from env; both must be apex (https://nomadnexus.space/...)

const STATE_COOKIE_NAME = 'nexus_oauth_state';
const STATE_MAX_AGE_SECONDS = 60 * 10;
const enc = new TextEncoder();

function toBase64Url(bytes) {
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getSigningKey() {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) throw new Error('SESSION_SIGNING_SECRET not set');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signValue(value) {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function encodeSignedPayload(payload) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await signValue(body);
  return `${body}.${sig}`;
}

function normalizeRedirectTo(raw) {
  if (!raw || !raw.startsWith('/')) return '/app/industry';
  if (raw.startsWith('//')) return '/app/industry';
  if (!raw.startsWith('/app') && raw !== '/onboarding') return '/app/industry';
  return raw;
}

function isSecure(req) {
  const appUrl = Deno.env.get('APP_URL') || '';
  return appUrl.startsWith('https://') ||
    new URL(req.url).protocol === 'https:' ||
    (req.headers.get('x-forwarded-proto') || '').includes('https');
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const clientId = Deno.env.get('DISCORD_CLIENT_ID');
    const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return Response.json({ error: 'Discord OAuth not configured' }, { status: 500 });
    }

    const url = new URL(req.url);
    const redirectTo = normalizeRedirectTo(url.searchParams.get('redirect_to'));

    const state = crypto.randomUUID().replace(/-/g, '');
    const signedState = await encodeSignedPayload({
      state,
      redirect_to: redirectTo,
      exp: Date.now() + STATE_MAX_AGE_SECONDS * 1000,
    });

    const discordUrl = new URL('https://discord.com/api/v10/oauth2/authorize');
    discordUrl.searchParams.set('client_id', clientId);
    discordUrl.searchParams.set('response_type', 'code');
    discordUrl.searchParams.set('scope', 'identify guilds.members.read');
    discordUrl.searchParams.set('redirect_uri', redirectUri);
    discordUrl.searchParams.set('state', state);
    discordUrl.searchParams.set('prompt', 'consent');

    const secure = isSecure(req);
    const cookieParts = [
      `${STATE_COOKIE_NAME}=${encodeURIComponent(signedState)}`,
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${STATE_MAX_AGE_SECONDS}`,
      'HttpOnly',
    ];
    if (secure) cookieParts.push('Secure');

    const headers = new Headers({
      'Location': discordUrl.toString(),
      'Cache-Control': 'no-store',
    });
    headers.append('Set-Cookie', cookieParts.join('; '));

    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('[auth/discord/start]', error);
    return Response.json({ error: 'Discord OAuth unavailable' }, { status: 500 });
  }
});