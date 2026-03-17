import { sessionNoStoreHeaders } from '../../_shared/auth.ts';

const DEFAULT_INVITE_URL = 'https://discord.gg/redscar';
const DEFAULT_SUPPORT_CHANNEL = '#nexusos-ops';
const DEFAULT_GUILD_LABEL = 'REDSCAR NOMADS';

function hasEnv(name: string) {
  return Boolean(Deno.env.get(name)?.trim());
}

function getOptionalEnv(name: string, fallback: string) {
  return Deno.env.get(name)?.trim() || fallback;
}

Deno.serve((req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  const oauthReady = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI',
    'DISCORD_GUILD_ID',
    'DISCORD_BOT_TOKEN',
    'SESSION_SIGNING_SECRET',
    'APP_URL',
  ].every(hasEnv);

  return Response.json({
    oauth_ready: oauthReady,
    requires_membership: true,
    guild_label: getOptionalEnv('NEXUSOS_GUILD_LABEL', DEFAULT_GUILD_LABEL),
    support_channel_label: getOptionalEnv('NEXUSOS_SUPPORT_CHANNEL_LABEL', DEFAULT_SUPPORT_CHANNEL),
    invite_url: getOptionalEnv('DISCORD_INVITE_URL', DEFAULT_INVITE_URL),
    onboarding_steps: [
      'Join the Redscar Discord server.',
      'Make sure you have a Redscar member role in Discord.',
      'Return here and continue with Discord to launch NexusOS.',
      'After first login, confirm or edit your seeded callsign in Profile Settings.',
    ],
  }, {
    headers: sessionNoStoreHeaders(),
  });
});
