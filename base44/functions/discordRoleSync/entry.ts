/**
 * discordRoleSync — NexusOS background agent
 *
 * Intended schedule: every 30 minutes (must be configured in Base44 admin panel).
 * Iterates all NexusUser records, fetches each member's current Discord roles
 * via the bot token, maps them to a NexusOS rank, and updates the DB record.
 *
 * Members who have left the Discord server are flagged with nexus_rank = 'NONE'
 * but are NOT deleted, so their historical data is preserved.
 *
 * No user auth — service role background job.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DISCORD_API = 'https://discord.com/api/v10';
const FETCH_TIMEOUT = 10_000;

// Must match the role priority in _shared/auth.ts
const ROLE_PRIORITY: Array<{ roleName: string; nexusRank: string }> = [
  { roleName: 'The Pioneer', nexusRank: 'PIONEER' },
  { roleName: 'Founder',     nexusRank: 'FOUNDER' },
  { roleName: 'Voyager',     nexusRank: 'VOYAGER' },
  { roleName: 'Scout',       nexusRank: 'SCOUT' },
  { roleName: 'Vagrant',     nexusRank: 'VAGRANT' },
  { roleName: 'Affiliate',   nexusRank: 'AFFILIATE' },
];

function mapRoleNamesToRank(roleNames: string[]): string {
  const nameSet = new Set(roleNames);
  const matched = ROLE_PRIORITY.find(({ roleName }) => nameSet.has(roleName));
  return matched?.nexusRank ?? 'AFFILIATE';
}

async function getGuildRoles(guildId: string, botToken: string): Promise<Map<string, string>> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`Failed to fetch guild roles: ${res.status}`);
  const roles = await res.json() as Array<{ id: string; name: string }>;
  return new Map(roles.map(r => [r.id, r.name]));
}

async function getGuildMember(
  guildId: string,
  userId: string,
  botToken: string,
): Promise<{ roles: string[] } | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (res.status === 404) return null; // left the server
  if (!res.ok) throw new Error(`Guild member lookup failed for ${userId}: ${res.status}`);
  return res.json() as Promise<{ roles: string[] }>;
}

Deno.serve(async (req) => {
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  const guildId  = Deno.env.get('DISCORD_GUILD_ID');

  if (!botToken || !guildId) {
    return Response.json({ error: 'DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must be configured' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const results = { updated: 0, left_server: 0, errors: 0, skipped: 0 };

  try {
    // Fetch guild role name map once, reuse for every member
    const roleById = await getGuildRoles(guildId, botToken);

    // Load all NexusUser records (up to 200; adjust limit if org grows beyond this)
    const users = await base44.asServiceRole.entities.NexusUser.list('-joined_at', 200);

    if (!users || users.length === 0) {
      return Response.json({ message: 'No NexusUser records found', ...results });
    }

    // Discord rate limit: 50 requests/second per bot token for guild member endpoints.
    // Process in batches of 25 with a small delay between batches to stay safe.
    const BATCH_SIZE = 25;
    const BATCH_DELAY_MS = 600;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          if (!user.discord_id) {
            results.skipped++;
            return;
          }

          try {
            const member = await getGuildMember(guildId, String(user.discord_id), botToken);

            if (!member) {
              // Member has left the Discord server
              await base44.asServiceRole.entities.NexusUser.update(user.id, {
                nexus_rank: 'NONE',
                roles_synced_at: now,
              });
              results.left_server++;
              return;
            }

            const roleNames = member.roles.map(id => roleById.get(id)).filter(Boolean) as string[];
            const nexusRank = mapRoleNamesToRank(roleNames);

            await base44.asServiceRole.entities.NexusUser.update(user.id, {
              nexus_rank: nexusRank,
              discord_roles: roleNames,
              roles_synced_at: now,
            });
            results.updated++;
          } catch (err) {
            console.error(`[discordRoleSync] Error processing user ${user.discord_id}:`, err);
            results.errors++;
          }
        })
      );

      // Pause between batches to respect Discord rate limits
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log('[discordRoleSync] Complete:', results);
    return Response.json({ message: 'Role sync complete', ...results });

  } catch (err) {
    console.error('[discordRoleSync] Fatal error:', err);
    return Response.json({ error: String(err), ...results }, { status: 500 });
  }
});
