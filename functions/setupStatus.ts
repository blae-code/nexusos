import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { resolveMemberSession, sessionNoStoreHeaders } from './auth/_shared/auth.ts';

const ADMIN_MARKERS = new Set(['admin', 'system_admin', 'app_admin', 'super_admin', 'sudo']);
const ELEVATED_RANKS = new Set(['PIONEER', 'FOUNDER']);

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

  if (authorization) {
    headers.set('Authorization', authorization);
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

function setupStatusPayload() {
  const items = {
    HERALD_BOT_TOKEN: hasEnv('HERALD_BOT_TOKEN'),
    REDSCAR_GUILD_ID: hasEnv('REDSCAR_GUILD_ID'),
    DISCORD_CLIENT_ID: hasEnv('DISCORD_CLIENT_ID') && hasEnv('DISCORD_CLIENT_SECRET') && hasEnv('DISCORD_REDIRECT_URI'),
    SESSION_SIGNING_SECRET: hasEnv('SESSION_SIGNING_SECRET'),
    NEXUSOS_OPS_CHANNEL_ID: hasEnv('NEXUSOS_OPS_CHANNEL_ID'),
    NEXUSOS_OCR_CHANNEL_ID: hasEnv('NEXUSOS_OCR_CHANNEL_ID'),
    NEXUSOS_INTEL_CHANNEL_ID: hasEnv('NEXUSOS_INTEL_CHANNEL_ID'),
    NEXUSOS_LOG_CHANNEL_ID: hasEnv('NEXUSOS_LOG_CHANNEL_ID'),
    APP_URL: hasEnv('APP_URL'),
    SC_API_KEY: hasEnv('SC_API_KEY'),
    ARMORY_CHANNEL_ID: hasEnv('ARMORY_CHANNEL_ID'),
    COFFER_CHANNEL_ID: hasEnv('COFFER_CHANNEL_ID'),
    INVOICES_CHANNEL_ID: hasEnv('INVOICES_CHANNEL_ID'),
    INDUSTRY_CHANNEL_ID: hasEnv('INDUSTRY_CHANNEL_ID'),
    RANGERS_CHANNEL_ID: hasEnv('RANGERS_CHANNEL_ID'),
    ANNOUNCEMENTS_CHANNEL_ID: hasEnv('ANNOUNCEMENTS_CHANNEL_ID'),
  };

  return {
    checked_at: new Date().toISOString(),
    items,
    meta: {
      auth_ready: items.HERALD_BOT_TOKEN && items.REDSCAR_GUILD_ID && items.DISCORD_CLIENT_ID && items.SESSION_SIGNING_SECRET && items.APP_URL,
      channels_ready: items.NEXUSOS_OPS_CHANNEL_ID && items.NEXUSOS_OCR_CHANNEL_ID && items.NEXUSOS_INTEL_CHANNEL_ID && items.NEXUSOS_LOG_CHANNEL_ID,
      herald_ready: items.HERALD_BOT_TOKEN && items.REDSCAR_GUILD_ID && items.NEXUSOS_OPS_CHANNEL_ID,
      external_services_ready: items.SC_API_KEY,
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

  return Response.json(setupStatusPayload(), {
    headers: sessionNoStoreHeaders(),
  });
});
