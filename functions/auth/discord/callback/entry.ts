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
  let appBase = '';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req);
    const statePayload = await decodeSignedPayload<{ state: string; redirect_to: string; app_base?: string }>(cookies[STATE_COOKIE_NAME]);
    appBase = statePayload?.app_base || '';

    if (!code || !state || !statePayload || statePayload.state !== state) {
      return gateErrorRedirect('expired_state', req, headers, appBase);
    }

    // Exchange code for token — failure here means Discord rejected the code
    let tokens;
    try {
      tokens = await exchangeDiscordCode(code);
    } catch (err) {
      console.error('[auth/discord/callback] token exchange failed', err);
      return gateErrorRedirect('callback_failed', req, headers, appBase);
    }

    // Fetch Discord user profile
    let discordUser;
    try {
      discordUser = await fetchDiscordUser(tokens.access_token);
    } catch (err) {
      console.error('[auth/discord/callback] user fetch failed', err);
      return gateErrorRedirect('discord_request_failed', req, headers, appBase);
    }

    // Check guild membership via bot
    let member;
    try {
      member = await fetchGuildMember(String(discordUser.id));
    } catch (err) {
      console.error('[auth/discord/callback] guild member fetch failed', err);
      return gateErrorRedirect('discord_request_failed', req, headers, appBase);
    }

    if (!member) {
      return gateErrorRedirect('not_in_guild', req, headers, appBase);
    }

    // Map Discord roles to NexusOS rank
    let roleNames: string[];
    let nexusRank: string | null;
    try {
      ({ roleNames, nexusRank } = await mapGuildRolesToRank(member.roles || []));
    } catch (err) {
      console.error('[auth/discord/callback] role mapping failed', err);
      return gateErrorRedirect('discord_request_failed', req, headers, appBase);
    }

    if (!nexusRank) {
      return gateErrorRedirect('role_not_allowed', req, headers, appBase);
    }

    // Upsert NexusUser record
    const user = await upsertNexusUser(req, discordUser, member, roleNames, nexusRank);
    const sessionCookie = await createSessionCookieValue(String(discordUser.id));
    setCookie(headers, SESSION_COOKIE_NAME, sessionCookie, req, { maxAge: 60 * 60 * 24 * 7 });

    // Route new users or incomplete onboarding to /onboarding; others to their intended destination
    const isNew = (user as any)?.isNew === true;
    const onboardingDone = (user as any)?.onboarding_complete === true;
    const destination = (isNew || !onboardingDone) ? '/onboarding' : (statePayload.redirect_to || '/app/industry');

    return appRedirect(destination, req, headers, appBase);
  } catch (error) {
    console.error('[auth/discord/callback]', error);
    if (!appBase) {
      try {
        const cookies = parseCookies(req);
        const statePayload = await decodeSignedPayload<{ app_base?: string }>(cookies[STATE_COOKIE_NAME]);
        appBase = statePayload?.app_base || '';
      } catch {
        appBase = '';
      }
    }

    return gateErrorRedirect('callback_failed', req, headers, appBase);
  }
});
