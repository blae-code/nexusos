import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

function getRedirectUrl(appUrl, path = '/app/industry') {
  return `${appUrl}${path}`;
}

function createSessionCookie(sessionData, secret) {
  const payload = Buffer.from(JSON.stringify(sessionData)).toString('hex');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  
  return `nexus_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function exchangeDiscordCode(code, clientId, clientSecret, redirectUri) {
  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Discord code');
  }

  return response.json();
}

async function getDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord user');
  }

  return response.json();
}

async function getDiscordGuilds(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord guilds');
  }

  return response.json();
}

async function getGuildMember(guildId, userId, accessToken) {
  const response = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function mapRolesToRank(roles) {
  const roleSet = new Set(roles || []);
  
  if (roleSet.has('1483426522704957440')) return 'PIONEER';
  if (roleSet.has('1483426532196036618')) return 'FOUNDER';
  if (roleSet.has('1483426543389102151')) return 'VOYAGER';
  if (roleSet.has('1483426554082324630')) return 'SCOUT';
  if (roleSet.has('1483426561696579614')) return 'VAGRANT';
  
  return 'AFFILIATE';
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), { status: 400 });
  }

  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  const guildId = Deno.env.get('DISCORD_GUILD_ID');
  const appUrl = Deno.env.get('APP_URL');
  const redirectUri = Deno.env.get('DISCORD_REDIRECT_URI');
  const sessionSecret = Deno.env.get('SESSION_SIGNING_SECRET');

  if (!clientId || !clientSecret || !guildId || !appUrl || !redirectUri || !sessionSecret) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }

  try {
    const tokenData = await exchangeDiscordCode(code, clientId, clientSecret, redirectUri);
    const accessToken = tokenData.access_token;

    const discordUser = await getDiscordUser(accessToken);
    const guildMember = await getGuildMember(guildId, discordUser.id, accessToken);

    if (!guildMember) {
      return new Response(
        `<html><body>You are not a member of the Redscar Discord. <a href="${appUrl}">Return to login</a></body></html>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const nexusRank = mapRolesToRank(guildMember.roles || []);
    const base44 = createClientFromRequest(req);

    const nexusUsers = await base44.asServiceRole.entities.NexusUser.filter({
      discord_id: discordUser.id,
    });

    const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const sessionData = {
      id: discordUser.id,
      discord_id: discordUser.id,
      callsign: discordUser.username,
      nexus_rank: nexusRank,
      onboarding_complete: false,
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE_MS,
    };

    if (nexusUsers.length > 0) {
      const existingUser = nexusUsers[0];
      await base44.asServiceRole.entities.NexusUser.update(existingUser.id, {
        nexus_rank: nexusRank,
        discord_roles: guildMember.roles || [],
      });
      // Use the Base44 entity ID (not the Discord snowflake) so the frontend
      // can reliably call NexusUser.update(user.id, ...) for things like onboarding.
      sessionData.id = existingUser.id;
      sessionData.onboarding_complete = existingUser.onboarding_complete || false;
    } else {
      const created = await base44.asServiceRole.entities.NexusUser.create({
        discord_id: discordUser.id,
        callsign: discordUser.username,
        nexus_rank: nexusRank,
        discord_roles: guildMember.roles || [],
        joined_at: new Date().toISOString(),
      });
      sessionData.id = created.id;
    }

    const setCookie = createSessionCookie(sessionData, sessionSecret);
    const redirectPath = sessionData.onboarding_complete ? '/app/industry' : '/onboarding';
    const redirectUrl = getRedirectUrl(appUrl, redirectPath);

    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': setCookie,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('[Discord Callback]', error);
    return new Response(
      `<html><body>Authentication failed: ${error.message}. <a href="${appUrl}">Return to login</a></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});