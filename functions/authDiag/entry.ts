// Surgical auth diagnostics — admin only
// Tests DISCORD_GUILD_ID validity and bot access
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
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

  const guildId = Deno.env.get('DISCORD_GUILD_ID') || '(not set)';
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN') || '(not set)';
  const clientId = Deno.env.get('DISCORD_CLIENT_ID') || '(not set)';
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI') || '(not set)';
  const appUrl = Deno.env.get('APP_URL') || '(not set)';

  const result = {
    env: {
      DISCORD_GUILD_ID: guildId,
      DISCORD_CLIENT_ID: clientId,
      DISCORD_REDIRECT_URI: redirectUri,
      APP_URL: appUrl,
      DISCORD_BOT_TOKEN: botToken !== '(not set)' ? `set (starts: ${botToken.slice(0, 8)}...)` : '(not set)',
    },
    guild_lookup: null,
    bot_guild_member_test: null,
    scope_in_current_start_source: 'identify guilds.members.read',
  };

  // 1. Resolve guild id to guild name via bot
  if (botToken !== '(not set)' && guildId !== '(not set)') {
    try {
      const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      const guildBody = await guildRes.json();
      result.guild_lookup = {
        status: guildRes.status,
        guild_id_used: guildId,
        guild_name: guildBody.name || null,
        guild_id_returned: guildBody.id || null,
        error: guildBody.message || null,
      };
    } catch (e) {
      result.guild_lookup = { error: e.message };
    }

    // 2. Test member lookup with a known test user id if provided as query param
    const url = new URL(req.url);
    const testUserId = url.searchParams.get('user_id');
    if (testUserId) {
      try {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${testUserId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        const memberBody = await memberRes.json();
        result.bot_guild_member_test = {
          user_id_queried: testUserId,
          status: memberRes.status,
          nick: memberBody.nick || null,
          roles_count: memberBody.roles?.length ?? null,
          error: memberBody.message || null,
          diagnosis: memberRes.status === 200
            ? 'User IS in guild'
            : memberRes.status === 404
              ? 'User NOT found in this guild — either wrong guild or user not a member'
              : `Unexpected status ${memberRes.status}`,
        };
      } catch (e) {
        result.bot_guild_member_test = { error: e.message };
      }
    }

    // 3. List guilds the bot is in (first 10) to help identify correct guild
    try {
      const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bot ${botToken}` },
      });
      const guildsBody = await guildsRes.json();
      result.bot_guilds = Array.isArray(guildsBody)
        ? guildsBody.slice(0, 10).map(g => ({ id: g.id, name: g.name }))
        : { error: guildsBody.message || 'unexpected response' };
    } catch (e) {
      result.bot_guilds = { error: e.message };
    }
  }

  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
});