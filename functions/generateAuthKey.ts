import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN   = Deno.env.get('HERALD_BOT_TOKEN');

function makeKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `RSN-${seg()}-${seg()}-${seg()}`;
}

async function dmUser(discordId, content) {
  // Create DM channel
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!dmRes.ok) return;
  const dm = await dmRes.json();

  // Send DM
  await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { callsign, nexus_rank, discord_id, existing_user_id } = await req.json();

    if (!callsign) return Response.json({ error: 'callsign required' }, { status: 400 });

    const plainKey = makeKey();
    const keyHash  = await bcrypt.hash(plainKey, 12);
    const prefix   = plainKey.split('-')[1]; // first segment after RSN

    const now = new Date().toISOString();

    if (existing_user_id) {
      // Reissue — update existing record
      await base44.asServiceRole.entities.NexusUser.update(existing_user_id, {
        auth_key_hash:  keyHash,
        key_prefix:     prefix,
        key_issued_at:  now,
        key_revoked:    false,
        session_token:  null,
        session_expires_at: null,
      });
    } else {
      // New user — create record
      await base44.asServiceRole.entities.NexusUser.create({
        callsign:       callsign.toUpperCase().trim(),
        nexus_rank:     nexus_rank || 'VAGRANT',
        discord_id:     discord_id || '',
        auth_key_hash:  keyHash,
        key_prefix:     prefix,
        key_issued_by:  user.email,
        key_issued_at:  now,
        key_revoked:    false,
        joined_at:      now,
      });
    }

    // DM the key if discord_id provided and bot token configured
    if (discord_id && BOT_TOKEN) {
      try {
        await dmUser(discord_id, [
          `🔑 **Your NexusOS Auth Key**`,
          `\`\`\`${plainKey}\`\`\``,
          `Use this key with your callsign **${callsign.toUpperCase()}** at the Access Gate.`,
          `**Keep this key private.** If compromised, contact a Pioneer immediately.`,
          `Access NexusOS: ${Deno.env.get('APP_URL') || '(see #nexusos-ops)'}`,
        ].join('\n'));
      } catch (e) {
        console.warn('DM delivery failed:', e.message);
      }
    }

    // Emit Herald Bot log event
    await base44.asServiceRole.functions.invoke('heraldBot', {
      action: 'keyEvent',
      payload: {
        event_type: 'ISSUED',
        callsign: callsign.toUpperCase(),
        issued_by: user.email,
        nexus_rank: nexus_rank || 'VAGRANT',
      },
    });

    return Response.json({
      success: true,
      // Only return plainKey in response — never stored again after this
      auth_key: plainKey,
      callsign: callsign.toUpperCase(),
    });

  } catch (error) {
    console.error('generateAuthKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});