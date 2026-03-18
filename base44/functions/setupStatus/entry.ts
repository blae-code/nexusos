import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { resolveMemberSession, sessionNoStoreHeaders } from './auth/_shared/auth.ts';

const ADMIN_MARKERS = new Set(['admin', 'system_admin', 'app_admin', 'super_admin', 'sudo']);
const ELEVATED_RANKS = new Set(['PIONEER', 'FOUNDER']);
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_TIMEOUT_MS = 8000;
const DISCORD_ADMINISTRATOR = 8n;
const CHANNEL_TYPE_CATEGORY = 4;

const REQUIRED_GUILD_PERMISSIONS = [
  { label: 'Manage Events', bit: 8589934592n },
];

const REQUIRED_CHANNEL_PERMISSIONS = [
  { label: 'View Channel', bit: 1024n },
  { label: 'Send Messages', bit: 2048n },
  { label: 'Embed Links', bit: 16384n },
  { label: 'Use External Emojis', bit: 262144n },
  { label: 'Create Public Threads', bit: 34359738368n },
];

const NEXUS_CHANNELS = [
  { itemId: 'NEXUSOS_OPS_CHANNEL_ID', expectedName: 'nexusos-ops' },
  { itemId: 'NEXUSOS_OCR_CHANNEL_ID', expectedName: 'nexusos-ocr' },
  { itemId: 'NEXUSOS_INTEL_CHANNEL_ID', expectedName: 'nexusos-intel' },
  { itemId: 'NEXUSOS_LOG_CHANNEL_ID', expectedName: 'nexusos-log' },
];

const AUX_CHANNELS = [
  { itemId: 'ARMORY_CHANNEL_ID', expectedName: 'armory' },
  { itemId: 'COFFER_CHANNEL_ID', expectedName: 'coffer' },
  { itemId: 'INVOICES_CHANNEL_ID', expectedName: 'invoices' },
  { itemId: 'INDUSTRY_CHANNEL_ID', expectedName: 'industry' },
  { itemId: 'RANGERS_CHANNEL_ID', expectedName: 'rangers' },
  { itemId: 'ANNOUNCEMENTS_CHANNEL_ID', expectedName: 'announcements' },
];

type SetupItems = Record<string, boolean>;
type SetupDetails = Record<string, string>;

type DiscordUser = {
  id: string;
  username: string;
  discriminator?: string;
};

type DiscordGuild = {
  id: string;
  name: string;
};

type DiscordRole = {
  id: string;
  name: string;
  permissions: string;
};

type DiscordMember = {
  user?: DiscordUser;
  roles: string[];
};

type DiscordPermissionOverwrite = {
  id: string;
  type: number | string;
  allow: string;
  deny: string;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  permission_overwrites?: DiscordPermissionOverwrite[];
};

function normalizeAdminValue(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isBase44Admin(user: any) {
  if (!user) return false;

  if (user.is_admin === true || user.isAdmin === true || user.is_system_admin === true || user.isSystemAdmin === true) {
    return true;
  }

  const scalarFields = [
    user.role,
    user.access_level,
    user.accessLevel,
    user.app_role,
    user.appRole,
    user.user_role,
    user.userRole,
    user.permission_level,
    user.permissionLevel,
    user.level,
    user.type,
  ];

  if (scalarFields.some((value) => ADMIN_MARKERS.has(normalizeAdminValue(value)))) {
    return true;
  }

  const roleCollections = [user.roles, user.permissions, user.access];
  return roleCollections.some((collection) =>
    Array.isArray(collection) && collection.some((value) => ADMIN_MARKERS.has(normalizeAdminValue(value))),
  );
}

async function resolveAdminFromBase44Request(req: Request) {
  const appId = req.headers.get('Base44-App-Id') || req.headers.get('X-App-Id');
  const cookie = req.headers.get('cookie');
  const authorization = req.headers.get('Authorization');

  if (!appId || (!cookie && !authorization)) {
    return null;
  }

  const serverUrl = req.headers.get('Base44-Api-Url') || new URL(req.url).origin;
  const headers = new Headers({
    Accept: 'application/json',
    'X-App-Id': appId,
    'Base44-App-Id': appId,
  });

  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const originUrl = req.headers.get('X-Origin-URL');
  if (originUrl) {
    headers.set('X-Origin-URL', originUrl);
  }

  if (authorization) {
    headers.set('Authorization', authorization);
  }

  const stateHeader = req.headers.get('Base44-State');
  if (stateHeader) {
    headers.set('Base44-State', stateHeader);
  }

  const response = await fetch(new URL(`/api/apps/${appId}/entities/User/me`, serverUrl), {
    method: 'GET',
    headers,
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  return response.json();
}

function hasEnv(name: string) {
  return Boolean(Deno.env.get(name)?.trim());
}

function isValidAbsoluteUrl(value: string | undefined | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function parsePermissions(value: string | number | bigint | undefined | null) {
  if (value == null) return 0n;

  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function formatMissingPermissions(required: { label: string; bit: bigint }[], permissions: bigint) {
  if ((permissions & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR) {
    return [];
  }

  return required
    .filter(({ bit }) => (permissions & bit) !== bit)
    .map(({ label }) => label);
}

function resolveGuildPermissions(member: DiscordMember, roles: DiscordRole[], guildId: string) {
  const relevantRoleIds = new Set([guildId, ...(member.roles || [])]);
  return roles.reduce((permissions, role) => {
    if (!relevantRoleIds.has(role.id)) {
      return permissions;
    }

    return permissions | parsePermissions(role.permissions);
  }, 0n);
}

function applyChannelOverwrites(basePermissions: bigint, channel: DiscordChannel, guildId: string, member: DiscordMember, botUserId: string) {
  if ((basePermissions & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR) {
    return basePermissions;
  }

  const overwrites = Array.isArray(channel.permission_overwrites) ? channel.permission_overwrites : [];
  let permissions = basePermissions;

  const everyoneOverwrite = overwrites.find((overwrite) => overwrite.id === guildId);
  if (everyoneOverwrite) {
    permissions = (permissions & ~parsePermissions(everyoneOverwrite.deny)) | parsePermissions(everyoneOverwrite.allow);
  }

  const roleOverwrites = overwrites.filter((overwrite) => member.roles?.includes(overwrite.id));
  if (roleOverwrites.length > 0) {
    const roleDeny = roleOverwrites.reduce((acc, overwrite) => acc | parsePermissions(overwrite.deny), 0n);
    const roleAllow = roleOverwrites.reduce((acc, overwrite) => acc | parsePermissions(overwrite.allow), 0n);
    permissions = (permissions & ~roleDeny) | roleAllow;
  }

  const memberOverwrite = overwrites.find((overwrite) => overwrite.id === botUserId);
  if (memberOverwrite) {
    permissions = (permissions & ~parsePermissions(memberOverwrite.deny)) | parsePermissions(memberOverwrite.allow);
  }

  return permissions;
}

async function discordBotFetch<T>(path: string): Promise<T> {
  const token = Deno.env.get('HERALD_BOT_TOKEN');
  if (!token) {
    throw new Error('HERALD_BOT_TOKEN is not configured');
  }

  const response = await fetch(`${DISCORD_API}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }

  return response.json() as Promise<T>;
}

function addConfigStatus(items: SetupItems, details: SetupDetails, itemId: string, ok: boolean, message?: string) {
  items[itemId] = ok;
  if (message) {
    details[itemId] = message;
  }
}

function buildStaticStatus() {
  const oauthFields = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'];
  const missingOauthFields = oauthFields.filter((field) => !hasEnv(field));
  const appUrl = Deno.env.get('APP_URL');
  const publicUrl = Deno.env.get('NEXUSOS_PUBLIC_URL');

  const items: SetupItems = {
    HERALD_BOT_TOKEN: hasEnv('HERALD_BOT_TOKEN'),
    REDSCAR_GUILD_ID: hasEnv('REDSCAR_GUILD_ID'),
    DISCORD_CLIENT_ID: missingOauthFields.length === 0,
    DISCORD_PUBLIC_KEY: hasEnv('DISCORD_PUBLIC_KEY'),
    SESSION_SIGNING_SECRET: hasEnv('SESSION_SIGNING_SECRET'),
    NEXUSOS_OPS_CHANNEL_ID: hasEnv('NEXUSOS_OPS_CHANNEL_ID'),
    NEXUSOS_OCR_CHANNEL_ID: hasEnv('NEXUSOS_OCR_CHANNEL_ID'),
    NEXUSOS_INTEL_CHANNEL_ID: hasEnv('NEXUSOS_INTEL_CHANNEL_ID'),
    NEXUSOS_LOG_CHANNEL_ID: hasEnv('NEXUSOS_LOG_CHANNEL_ID'),
    CREATE_NEXUSOS_CATEGORY: false,
    BOT_PERMISSIONS: false,
    APP_URL: isValidAbsoluteUrl(appUrl),
    NEXUSOS_PUBLIC_URL: isValidAbsoluteUrl(publicUrl),
    SC_API_KEY: hasEnv('SC_API_KEY'),
    ARMORY_CHANNEL_ID: hasEnv('ARMORY_CHANNEL_ID'),
    COFFER_CHANNEL_ID: hasEnv('COFFER_CHANNEL_ID'),
    INVOICES_CHANNEL_ID: hasEnv('INVOICES_CHANNEL_ID'),
    INDUSTRY_CHANNEL_ID: hasEnv('INDUSTRY_CHANNEL_ID'),
    RANGERS_CHANNEL_ID: hasEnv('RANGERS_CHANNEL_ID'),
    ANNOUNCEMENTS_CHANNEL_ID: hasEnv('ANNOUNCEMENTS_CHANNEL_ID'),
  };

  const details: SetupDetails = {
    DISCORD_CLIENT_ID: missingOauthFields.length === 0
      ? 'Discord OAuth client id, secret, and redirect URI are configured.'
      : `Missing OAuth settings: ${missingOauthFields.join(', ')}`,
    DISCORD_PUBLIC_KEY: items.DISCORD_PUBLIC_KEY
      ? 'Discord request signature verification is configured for Herald interactions.'
      : 'Set DISCORD_PUBLIC_KEY to verify Discord interaction requests.',
    APP_URL: items.APP_URL
      ? `Using launcher URL ${appUrl}`
      : 'APP_URL must be an absolute http(s) URL for redirects and launcher routing.',
    NEXUSOS_PUBLIC_URL: items.NEXUSOS_PUBLIC_URL
      ? `Bot embed assets resolve from ${publicUrl}`
      : 'Set NEXUSOS_PUBLIC_URL so Discord embeds can resolve NexusOS token images.',
    RSVP_INTERACTION: items.DISCORD_PUBLIC_KEY
      ? 'Signed RSVP button handling is implemented in heraldBot. Remaining work: register the Discord Interactions Endpoint URL.'
      : 'RSVP button handling is implemented in code, but DISCORD_PUBLIC_KEY is still missing.',
    PATCH_WATCHER: 'rssCheck -> patchDigest -> heraldBot patch alert flow is implemented. Remaining work: enable the scheduled job in Base44.',
    OCR_DISCORD_WATCH: 'Still blocked on Discord message-create delivery. A gateway process or external relay is still required.',
  };

  return { items, details };
}

async function enrichDiscordDiagnostics(items: SetupItems, details: SetupDetails) {
  const guildId = Deno.env.get('REDSCAR_GUILD_ID');
  if (!items.HERALD_BOT_TOKEN || !guildId) {
    if (!items.HERALD_BOT_TOKEN) {
      details.HERALD_BOT_TOKEN = 'Bot token not configured, so Discord reachability checks were skipped.';
    }
    if (!guildId) {
      details.REDSCAR_GUILD_ID = 'Guild ID not configured, so Discord reachability checks were skipped.';
    }
    return { items, details };
  }

  try {
    const [botUser, guild, roles, channels] = await Promise.all([
      discordBotFetch<DiscordUser>('/users/@me'),
      discordBotFetch<DiscordGuild>(`/guilds/${guildId}`),
      discordBotFetch<DiscordRole[]>(`/guilds/${guildId}/roles`),
      discordBotFetch<DiscordChannel[]>(`/guilds/${guildId}/channels`),
    ]);

    const member = await discordBotFetch<DiscordMember>(`/guilds/${guildId}/members/${botUser.id}`);
    const channelsById = new Map(channels.map((channel) => [channel.id, channel]));

    addConfigStatus(items, details, 'HERALD_BOT_TOKEN', true, `Authenticated to Discord as ${botUser.username}.`);
    addConfigStatus(items, details, 'REDSCAR_GUILD_ID', true, `Guild resolved: ${guild.name}`);

    const guildPermissions = resolveGuildPermissions(member, roles, guildId);
    const missingGuildPermissions = formatMissingPermissions(REQUIRED_GUILD_PERMISSIONS, guildPermissions);
    const missingChannelPermissions: string[] = [];

    const validateChannel = ({ itemId, expectedName }: { itemId: string; expectedName: string }) => {
      const channelId = Deno.env.get(itemId);
      if (!channelId) {
        return null;
      }

      const channel = channelsById.get(channelId);
      if (!channel) {
        addConfigStatus(items, details, itemId, false, 'Configured channel ID was not found in the Discord guild.');
        return null;
      }

      addConfigStatus(
        items,
        details,
        itemId,
        true,
        channel.name === expectedName
          ? `Resolved to #${channel.name}.`
          : `Resolved to #${channel.name} (expected #${expectedName}).`,
      );

      const channelPermissions = applyChannelOverwrites(guildPermissions, channel, guildId, member, botUser.id);
      const missing = formatMissingPermissions(REQUIRED_CHANNEL_PERMISSIONS, channelPermissions);
      if (missing.length > 0) {
        missingChannelPermissions.push(`#${channel.name}: ${missing.join(', ')}`);
      }

      return channel;
    };

    const resolvedNexusChannels = NEXUS_CHANNELS.map(validateChannel).filter(Boolean) as DiscordChannel[];
    AUX_CHANNELS.forEach(validateChannel);

    if (missingGuildPermissions.length === 0 && missingChannelPermissions.length === 0) {
      addConfigStatus(items, details, 'BOT_PERMISSIONS', true, 'Bot can access the guild and has the required events/messages/thread permissions on configured channels.');
    } else {
      addConfigStatus(
        items,
        details,
        'BOT_PERMISSIONS',
        false,
        [
          missingGuildPermissions.length > 0 ? `Missing guild permissions: ${missingGuildPermissions.join(', ')}` : null,
          missingChannelPermissions.length > 0 ? `Channel overrides still block: ${missingChannelPermissions.join(' | ')}` : null,
        ].filter(Boolean).join(' · '),
      );
    }

    const nexusParentIds = Array.from(new Set(
      resolvedNexusChannels
        .map((channel) => channel.parent_id || null)
        .filter(Boolean),
    ));

    if (resolvedNexusChannels.length === NEXUS_CHANNELS.length && nexusParentIds.length === 1) {
      const parent = channelsById.get(String(nexusParentIds[0]));
      const isCategory = parent?.type === CHANNEL_TYPE_CATEGORY;
      const categoryLooksRight = isCategory && parent?.name?.toLowerCase().includes('nexusos');

      addConfigStatus(
        items,
        details,
        'CREATE_NEXUSOS_CATEGORY',
        Boolean(categoryLooksRight),
        categoryLooksRight
          ? `Resolved NexusOS channels under category "${parent?.name}".`
          : isCategory
            ? `Channels share category "${parent?.name}", but it does not look like the expected NexusOS category.`
            : 'Configured NexusOS channels do not share a Discord category.',
      );
    } else if (resolvedNexusChannels.length > 0) {
      addConfigStatus(items, details, 'CREATE_NEXUSOS_CATEGORY', false, 'Configured NexusOS channels are not all present under one shared category yet.');
    } else {
      addConfigStatus(items, details, 'CREATE_NEXUSOS_CATEGORY', false, 'Set the NexusOS channel IDs before category verification can run.');
    }
  } catch (error) {
    const message = (error as Error).message || 'Discord reachability checks failed.';
    addConfigStatus(items, details, 'HERALD_BOT_TOKEN', false, `Bot authentication failed: ${message}`);
    addConfigStatus(items, details, 'REDSCAR_GUILD_ID', false, `Guild lookup failed: ${message}`);
    addConfigStatus(items, details, 'BOT_PERMISSIONS', false, `Permission checks failed: ${message}`);
  }

  return { items, details };
}

async function setupStatusPayload() {
  const staticStatus = buildStaticStatus();
  const { items, details } = await enrichDiscordDiagnostics(staticStatus.items, staticStatus.details);

  return {
    checked_at: new Date().toISOString(),
    items,
    details,
    meta: {
      auth_ready: items.HERALD_BOT_TOKEN && items.REDSCAR_GUILD_ID && items.DISCORD_CLIENT_ID && items.DISCORD_PUBLIC_KEY && items.SESSION_SIGNING_SECRET && items.APP_URL,
      channels_ready: items.NEXUSOS_OPS_CHANNEL_ID && items.NEXUSOS_OCR_CHANNEL_ID && items.NEXUSOS_INTEL_CHANNEL_ID && items.NEXUSOS_LOG_CHANNEL_ID && items.CREATE_NEXUSOS_CATEGORY,
      herald_ready: items.HERALD_BOT_TOKEN && items.REDSCAR_GUILD_ID && items.BOT_PERMISSIONS && items.NEXUSOS_OPS_CHANNEL_ID,
      external_services_ready: items.SC_API_KEY,
      interaction_ready: items.DISCORD_PUBLIC_KEY && items.APP_URL && items.NEXUSOS_PUBLIC_URL,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (!['GET', 'POST'].includes(req.method)) {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: sessionNoStoreHeaders(),
    });
  }

  let authorized = false;

  try {
    const memberSession = await resolveMemberSession(req).catch(() => null);
    if (memberSession?.user?.rank && ELEVATED_RANKS.has(String(memberSession.user.rank).toUpperCase())) {
      authorized = true;
    }
  } catch {
    // Ignore member-session resolution failures during setup diagnostics.
  }

  if (!authorized) {
    const previewAdmin = await resolveAdminFromBase44Request(req).catch(() => null);
    if (isBase44Admin(previewAdmin)) {
      authorized = true;
    }
  }

  if (!authorized) {
    try {
      const base44 = createClientFromRequest(req);
      const adminUser = await base44.auth.me().catch(() => null);
      if (isBase44Admin(adminUser)) {
        authorized = true;
      }
    } catch {
      // Ignore Base44 auth failures; return a normal auth error below.
    }
  }

  if (!authorized) {
    return Response.json({ error: 'Forbidden' }, {
      status: 403,
      headers: sessionNoStoreHeaders(),
    });
  }

  return Response.json(await setupStatusPayload(), {
    headers: sessionNoStoreHeaders(),
  });
});
