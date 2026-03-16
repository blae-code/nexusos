import {
  STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  appRedirect,
  clearCookie,
  createSessionCookieValue,
  decodeSignedPayload,
  exchangeDiscordCode,
  fetchDiscordUser,
  fetchGuildMember,
  gateErrorRedirect,
  mapGuildRolesToRank,
  parseCookies,
  setCookie,
  upsertNexusUser,
} from '../../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const headers = new Headers();
  clearCookie(headers, STATE_COOKIE_NAME, req);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req);
    const statePayload = await decodeSignedPayload<{ state: string; redirect_to: string; app_base?: string }>(cookies[STATE_COOKIE_NAME]);
    const appBase = statePayload?.app_base || '';

    if (!code || !state || !statePayload || statePayload.state !== state) {
      return gateErrorRedirect('expired_state', req, headers, appBase);
    }

    const tokens = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(tokens.access_token);
    const member = await fetchGuildMember(String(discordUser.id));

    if (!member) {
      return gateErrorRedirect('not_in_guild', req, headers, appBase);
    }

    const { roleNames, nexusRank } = await mapGuildRolesToRank(member.roles || []);
    if (!nexusRank) {
      return gateErrorRedirect('role_not_allowed', req, headers, appBase);
    }

    const user = await upsertNexusUser(req, discordUser, member, roleNames, nexusRank);
    const sessionCookie = await createSessionCookieValue(String(discordUser.id));
    setCookie(headers, SESSION_COOKIE_NAME, sessionCookie, req, { maxAge: 60 * 60 * 24 * 7 });

    return appRedirect(statePayload.redirect_to || '/app/industry', req, headers, appBase);
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return gateErrorRedirect('auth_failed', req, headers);
  }
});
