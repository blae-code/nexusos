// setupStatus — diagnostics endpoint. Accepts both modern and legacy env var names.
// Modern: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
// Legacy: HERALD_BOT_TOKEN, REDSCAR_GUILD_ID

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function hasEnv(...names) {
  return names.some(name => Boolean(Deno.env.get(name)?.trim()));
}

function getEnv(...names) {
  for (const name of names) {
    const val = Deno.env.get(name)?.trim();
    if (val) return val;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks = {
    APP_URL: {
      ok: hasEnv('APP_URL'),
      value: getEnv('APP_URL'),
    },
    DISCORD_CLIENT_ID: {
      ok: hasEnv('DISCORD_CLIENT_ID'),
    },
    DISCORD_CLIENT_SECRET: {
      ok: hasEnv('DISCORD_CLIENT_SECRET'),
    },
    DISCORD_REDIRECT_URI: {
      ok: hasEnv('DISCORD_REDIRECT_URI'),
      value: getEnv('DISCORD_REDIRECT_URI'),
    },
    // Accepts modern DISCORD_GUILD_ID or legacy REDSCAR_GUILD_ID
    DISCORD_GUILD_ID: {
      ok: hasEnv('DISCORD_GUILD_ID', 'REDSCAR_GUILD_ID'),
      resolvedFrom: hasEnv('DISCORD_GUILD_ID') ? 'DISCORD_GUILD_ID' : hasEnv('REDSCAR_GUILD_ID') ? 'REDSCAR_GUILD_ID' : null,
    },
    // Accepts modern DISCORD_BOT_TOKEN or legacy HERALD_BOT_TOKEN
    DISCORD_BOT_TOKEN: {
      ok: hasEnv('DISCORD_BOT_TOKEN', 'HERALD_BOT_TOKEN'),
      resolvedFrom: hasEnv('DISCORD_BOT_TOKEN') ? 'DISCORD_BOT_TOKEN' : hasEnv('HERALD_BOT_TOKEN') ? 'HERALD_BOT_TOKEN' : null,
    },
    SESSION_SIGNING_SECRET: {
      ok: hasEnv('SESSION_SIGNING_SECRET'),
    },
  };

  const allOk = Object.values(checks).every(c => c.ok);
  const appUrl = getEnv('APP_URL') || '';
  const redirectUri = getEnv('DISCORD_REDIRECT_URI') || '';

  // Coherence check: callback URI should match APP_URL origin
  const callbackCoherent = appUrl && redirectUri
    ? redirectUri.startsWith(new URL(appUrl).origin)
    : null;

  return Response.json({
    ok: allOk,
    checks,
    coherence: {
      callback_uri_matches_app_url: callbackCoherent,
      recommended_callback_uri: appUrl
        ? `${new URL(appUrl).origin}/api/functions/auth/discord/callback/entry`
        : null,
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
});