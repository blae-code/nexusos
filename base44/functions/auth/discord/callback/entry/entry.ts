import {
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  parseCookies,
  decodeSignedPayload,
  setCookie,
  exchangeDiscordCode,
  fetchDiscordUser,
  fetchGuildMember,
  mapGuildRolesToRank,
  upsertNexusUser,
  createSessionCookieValue,
  gateErrorRedirect,
  appRedirect,
  sessionNoStoreHeaders,
} from '../../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return gateErrorRedirect('missing_code_or_state', req);
  }

  const cookies = parseCookies(req);
  const signedState = await decodeSignedPayload(cookies[STATE_COOKIE_NAME]);

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
    setCookie(headers, SESSION_COOKIE_NAME, sessionValue, req, { maxAge: 7 * 24 * 60 * 60 });

    // Clear state cookie after successful exchange
    setCookie(headers, STATE_COOKIE_NAME, '', req, { maxAge: 0 });

    const redirectPath = nexusUser.onboarding_complete ? '/app/industry' : '/onboarding';
    return appRedirect(redirectPath, req, headers, signedState.app_base);
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    return gateErrorRedirect('callback_failed', req, new Headers(), signedState?.app_base);
  }
});