import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { resolveMemberSession, sessionNoStoreHeaders } from '../_shared/auth.ts';

const ADMIN_MARKERS = new Set(['admin', 'system_admin', 'app_admin', 'super_admin', 'sudo']);

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

function toAdminSession(adminUser: any) {
  return {
    authenticated: true,
    source: 'admin',
    user: {
      id: adminUser.id || 'admin',
      discordId: 'SYSTEM_ADMIN',
      callsign: adminUser.full_name || adminUser.name || adminUser.email || 'SYS-ADMIN',
      rank: 'PIONEER',
      discordRoles: ['Base44 Admin'],
      joinedAt: null,
    },
  };
}

async function resolveAdminFromCookies(req: Request) {
  const appId = req.headers.get('Base44-App-Id') || req.headers.get('X-App-Id');
  const cookie = req.headers.get('cookie');

  if (!appId || !cookie) {
    return null;
  }

  const serverUrl = req.headers.get('Base44-Api-Url') || new URL(req.url).origin;
  const headers = new Headers({
    Accept: 'application/json',
    Cookie: cookie,
    'X-App-Id': appId,
    'Base44-App-Id': appId,
  });

  const originUrl = req.headers.get('X-Origin-URL');
  if (originUrl) {
    headers.set('X-Origin-URL', originUrl);
  }

  const authorization = req.headers.get('Authorization');
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

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const memberSession = await resolveMemberSession(req);
    if (memberSession) {
      return Response.json(memberSession, {
        headers: sessionNoStoreHeaders(),
      });
    }

    const previewAdmin = await resolveAdminFromCookies(req);
    if (isBase44Admin(previewAdmin)) {
      return Response.json(toAdminSession(previewAdmin), {
        headers: sessionNoStoreHeaders(),
      });
    }

    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me().catch(() => null);
    if (isBase44Admin(adminUser)) {
      return Response.json(toAdminSession(adminUser), {
        headers: sessionNoStoreHeaders(),
      });
    }

    return Response.json({ authenticated: false }, {
      status: 401,
      headers: sessionNoStoreHeaders(),
    });
  } catch (error) {
    console.error('[auth/session]', error);
    return Response.json({ authenticated: false, error: 'Session lookup failed' }, {
      status: 500,
      headers: sessionNoStoreHeaders(),
    });
  }
});
