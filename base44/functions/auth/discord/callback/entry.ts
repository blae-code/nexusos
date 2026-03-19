import {
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  parseCookies,
  decodeSignedPayload,
  exchangeDiscordCode,
  fetchDiscordUser,
  fetchGuildMember,
  mapGuildRolesToRank,
  upsertNexusUser,
  createSessionCookieValue,
  setCookie,
  clearCookie,
  gateErrorRedirect,
  appRedirect,
  sessionNoStoreHeaders,
} from '../../_shared/auth.ts';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return gateErrorRedirect('missing_params', req);
  }

  const cookies = parseCookies(req);
  const signedState = await decodeSignedPayload<{
    state: string;
    redirect_to: string;
    app_base: string;
  }>(cookies[STATE_COOKIE_NAME]);

  if (!signedState || signedState.state !== state) {
    console.warn('[auth/discord/callback] State mismatch or expired');
    return gateErrorRedirect('state_mismatch', req);
  }

  try {
    const { access_token: accessToken } = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(accessToken);
    const guildMember = await fetchGuildMember(discordUser.id);

    if (!guildMember) {
      return gateErrorRedirect('not_in_guild', req, new Headers(), signedState.app_base);
    }

    const { roleNames, nexusRank } = await mapGuildRolesToRank(guildMember.roles);

    if (!nexusRank) {
      return gateErrorRedirect('role_not_allowed', req, new Headers(), signedState.app_base);
    }

    const nexusUser = await upsertNexusUser(req, discordUser, guildMember, roleNames, nexusRank);

    if (!nexusUser) {
      return gateErrorRedirect('auth_failed', req, new Headers(), signedState.app_base);
    }

    const sessionValue = await createSessionCookieValue(discordUser.id);
    const headers = new Headers(sessionNoStoreHeaders());
    setCookie(headers, SESSION_COOKIE_NAME, sessionValue, req, { maxAge: SESSION_MAX_AGE_SECONDS });
    clearCookie(headers, STATE_COOKIE_NAME, req);

    const redirectPath = nexusUser.onboarding_complete
      ? (signedState.redirect_to || '/app/industry')
      : '/onboarding';

    return appRedirect(redirectPath, req, headers, signedState.app_base ?? '');
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return gateErrorRedirect('callback_failed', req, new Headers(), signedState.app_base ?? '');
  }
});
