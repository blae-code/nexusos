import { buildDiscordAuthorizeUrl, normalizeAppBase, normalizeRedirectTo } from '../../../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const redirectTo = normalizeRedirectTo(url.searchParams.get('redirect_to'));
    const appBase = normalizeAppBase(url.searchParams.get('app_base'));
    const headers = await buildDiscordAuthorizeUrl(req, redirectTo, appBase);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('[auth/discord/start]', error);
    return Response.json({ error: 'Discord OAuth unavailable' }, { status: 500 });
  }
});
