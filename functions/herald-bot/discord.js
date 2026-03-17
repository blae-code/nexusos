const DISCORD_API_BASE = 'https://discord.com/api/v10';
const ROLE_PRIORITY = [
  { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Founder', nexusRank: 'FOUNDER' },
  { roleName: 'Voyager', nexusRank: 'VOYAGER' },
  { roleName: 'Scout', nexusRank: 'SCOUT' },
  { roleName: 'Vagrant', nexusRank: 'VAGRANT' },
  { roleName: 'Affiliate', nexusRank: 'AFFILIATE' },
];
const roleCache = new Map();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

async function discordRequest(path, init = {}) {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, init);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord ${init.method || 'GET'} ${path} failed: ${response.status} ${detail}`);
  }

  return response.json();
}

async function getGuildRoleMap(guildId) {
  const cacheKey = String(guildId);
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.map;
  }

  const botToken = requiredEnv('DISCORD_BOT_TOKEN');
  const roles = await discordRequest(`/guilds/${guildId}/roles`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  const roleMap = new Map((roles || []).map((role) => [String(role.id), role.name]));
  roleCache.set(cacheKey, {
    expiresAt: Date.now() + (5 * 60 * 1000),
    map: roleMap,
  });
  return roleMap;
}

export function getAuthUrl({ state = '', redirectUri } = {}) {
  const clientId = requiredEnv('DISCORD_CLIENT_ID');
  const resolvedRedirectUri = redirectUri || requiredEnv('DISCORD_REDIRECT_URI');

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', resolvedRedirectUri);
  url.searchParams.set('scope', 'identify guilds guilds.members.read');
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: requiredEnv('DISCORD_CLIENT_ID'),
    client_secret: requiredEnv('DISCORD_CLIENT_SECRET'),
    grant_type: 'authorization_code',
    code,
    redirect_uri: requiredEnv('DISCORD_REDIRECT_URI'),
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${detail}`);
  }

  return response.json();
}

export async function getUserProfile(token) {
  return discordRequest('/users/@me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getGuildMember(token, guildId) {
  if (!guildId) {
    throw new Error('DISCORD_GUILD_ID is not configured');
  }

  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord guild membership lookup failed: ${response.status} ${detail}`);
  }

  const guildMember = await response.json();
  const roleMap = await getGuildRoleMap(guildId);
  const roleNames = Array.isArray(guildMember.roles)
    ? guildMember.roles.map((roleId) => roleMap.get(String(roleId))).filter(Boolean)
    : [];

  return {
    ...guildMember,
    guild_id: String(guildId),
    role_names: roleNames,
  };
}

export function syncRoles(guildMember) {
  const roleNames = Array.isArray(guildMember?.role_names)
    ? guildMember.role_names
    : Array.isArray(guildMember?.roles)
      ? guildMember.roles.filter((value) => typeof value === 'string')
      : [];

  const matchedRole = ROLE_PRIORITY.find(({ roleName }) => roleNames.includes(roleName));

  return {
    discordRoles: roleNames,
    nexusRank: matchedRole?.nexusRank || null,
  };
}

export function verifyMembership(guildMember) {
  if (!guildMember) {
    return false;
  }

  const roleSync = syncRoles(guildMember);
  return Boolean(roleSync.nexusRank);
}
