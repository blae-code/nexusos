import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { resolveMemberSession, sessionNoStoreHeaders } from '../_shared/auth.ts';

function isBase44Admin(user: any) {
  if (!user) return false;

  return user.role === 'admin'
    || user.role === 'system_admin'
    || user.access_level === 'admin'
    || user.is_admin === true;
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

    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me().catch(() => null);
    if (isBase44Admin(adminUser)) {
      return Response.json({
        authenticated: true,
        source: 'admin',
        user: {
          id: adminUser.id || 'admin',
          discordId: 'SYSTEM_ADMIN',
          callsign: 'SYS-ADMIN',
          rank: 'PIONEER',
          discordRoles: ['Base44 Admin'],
          joinedAt: null,
        },
      }, {
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
