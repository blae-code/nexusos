/**
 * Herald Bot — NexusOS Discord Integration
 *
 * Actions: publishOp · rsvpUpdate · opGo · opActivate · opEnd · phaseAdvance ·
 *          phaseBriefing · threatAlert · deliverKey · keyEvent · armoryUpdate ·
 *          armoryAlert · patchDigest · notify_patch_alert · scoutPing ·
 *          depositStaleAlert · opDebrief · opWrapUp · wrapUpDebrief ·
 *          lowStockAlert · orgHealthBriefing
 * Passthrough: refineryReady · craftComplete
 *
 * Discord interactions: rsvp_{op_id}_{role_name} — per-role RSVP toggle
 *   Received via Discord interactions webhook (X-Signature-Ed25519 header).
 *   Verified with Ed25519, deferred ephemeral, toggles OpRsvp, refreshes embed.
 *
 * Stub mode: BOT_CONFIGURED=false → Discord calls log-only, never throw.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Channel config ───────────────────────────────────────────────────────────
const CH = {
  nexusOps:      Deno.env.get('NEXUSOS_OPS_CHANNEL_ID'),
  nexusOcr:      Deno.env.get('NEXUSOS_OCR_CHANNEL_ID'),
  nexusIntel:    Deno.env.get('NEXUSOS_INTEL_CHANNEL_ID'),
  nexusLog:      Deno.env.get('NEXUSOS_LOG_CHANNEL_ID'),
  armory:        Deno.env.get('ARMORY_CHANNEL_ID'),
  coffer:        Deno.env.get('COFFER_CHANNEL_ID'),
  invoices:      Deno.env.get('INVOICES_CHANNEL_ID'),
  industry:      Deno.env.get('INDUSTRY_CHANNEL_ID'),
  rangers:       Deno.env.get('RANGERS_CHANNEL_ID'),
  announcements: Deno.env.get('ANNOUNCEMENTS_CHANNEL_ID'),
  ptu:           Deno.env.get('PTU_CHANNEL_ID'),
  bonfire:       Deno.env.get('BONFIRE_CHANNEL_ID'),
  redscarOnly:   Deno.env.get('REDSCAR_ONLY_CHANNEL_ID'),
};

// ─── Profession → secondary channel routing ───────────────────────────────────
const PROFESSION_ROUTING: Record<string, { secondary: string | null | undefined }> = {
  INDUSTRY:    { secondary: CH.industry },
  MINING:      { secondary: CH.industry },
  ROCKBREAKER: { secondary: CH.industry },
  SALVAGE:     { secondary: CH.industry },
  PATROL:      { secondary: CH.rangers },
  COMBAT:      { secondary: CH.rangers },
  ESCORT:      { secondary: CH.rangers },
  S17:         { secondary: CH.rangers },
  RESCUE:      { secondary: null },
  EMERGENCY:   { secondary: null },
};

const BOT_TOKEN          = Deno.env.get('HERALD_BOT_TOKEN');
const GUILD_ID           = Deno.env.get('REDSCAR_GUILD_ID');
const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');
const DISCORD_API        = 'https://discord.com/api/v10';

const BOT_CONFIGURED = !!BOT_TOKEN && !!GUILD_ID;

// ─── Token URLs for Discord embed thumbnails ──────────────────────────────────
const BASE_URL = (Deno.env.get('NEXUSOS_PUBLIC_URL') || '').replace(/\/$/, '');
const tokenUrl = (name: string) => `${BASE_URL}/tokens/token-${name}.png`;
const TOKENS = {
  opAnnounce:   tokenUrl('objective-blue'),
  opLive:       tokenUrl('objective-cyan'),
  phaseAdvance: tokenUrl('objective-cyan'),
  threatHigh:   tokenUrl('target-red'),
  threatMed:    tokenUrl('target-alt-orange'),
  keyDelivered: tokenUrl('square-cyan'),
  keyRevoked:   tokenUrl('square-red'),
  armoryUpdate: tokenUrl('mechanics-blue'),
  patchDigest:  tokenUrl('energy-blue'),
  depositStale: tokenUrl('hex-grey'),
  depositReady: tokenUrl('hex-green'),
  scoutPing:    tokenUrl('hex-green'),
};

type HeraldRequestBody = {
  action?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function coerceActionPayload(body: HeraldRequestBody) {
  const { action, payload, ...rest } = body;
  return {
    action: typeof action === 'string' ? action : '',
    payload: payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : rest,
  };
}

function formatDurationMinutes(startedAt?: string | null, endedAt?: string | null): string | null {
  if (!startedAt || !endedAt) return null;
  const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  return `${Math.round(durationMs / 60000)}m`;
}

// ─── Discord REST helpers ─────────────────────────────────────────────────────
async function discordPost(path: string, body: unknown) {
  if (!BOT_CONFIGURED) {
    console.log(`[HERALD STUB] POST ${path}`, JSON.stringify(body).slice(0, 120));
    return { id: `stub_${Date.now()}` };
  }
  const res = await fetch(`${DISCORD_API}${path}`, {
    method:  'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord POST ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function discordPatch(path: string, body: unknown) {
  if (!BOT_CONFIGURED) {
    console.log(`[HERALD STUB] PATCH ${path}`, JSON.stringify(body).slice(0, 120));
    return { id: `stub_${Date.now()}` };
  }
  const res = await fetch(`${DISCORD_API}${path}`, {
    method:  'PATCH',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord PATCH ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function discordDelete(path: string) {
  if (!BOT_CONFIGURED) {
    console.log(`[HERALD STUB] DELETE ${path}`);
    return null;
  }
  const res = await fetch(`${DISCORD_API}${path}`, {
    method:  'DELETE',
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Discord DELETE ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function updateScheduledEventStatus(eventId: unknown, status: 2 | 3) {
  if (!isNonEmptyString(eventId) || !GUILD_ID) return;

  try {
    await discordPatch(`/guilds/${GUILD_ID}/scheduled-events/${eventId}`, { status });
  } catch (error) {
    console.warn(`[heraldBot] scheduled event ${eventId} status ${status} failed:`, (error as Error).message);
  }
}

// Open / reuse a DM channel with a Discord user
async function openDM(discordId: string): Promise<string> {
  const dm = await discordPost('/users/@me/channels', { recipient_id: discordId }) as any;
  return dm.id;
}

// ─── Ed25519 signature verification (Discord interactions) ────────────────────
function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function verifyDiscordSig(publicKey: string, sig: string, ts: string, body: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('raw', hexToUint8(publicKey), 'Ed25519', false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hexToUint8(sig), new TextEncoder().encode(ts + body));
  } catch {
    return false;
  }
}

// ─── Embed / component builders ───────────────────────────────────────────────

/** Per-role RSVP buttons — one ACTION_ROW per 5 roles (max 5 rows). */
function buildRsvpButtons(op: any): any[] {
  const roles = Object.keys(op.role_slots || {});
  if (roles.length === 0) return [];
  const rows: any[] = [];
  for (let i = 0; i < roles.length && rows.length < 5; i += 5) {
    rows.push({
      type: 1,
      components: roles.slice(i, i + 5).map(role => ({
        type: 2, style: 2,
        label:     role.toUpperCase(),
        custom_id: `rsvp_${op.id}_${role}`,
      })),
    });
  }
  return rows;
}

/** Op embed with live RSVP roster per role. */
function buildRsvpEmbed(op: any, confirmedRsvps: any[]) {
  const ts        = op.scheduled_at ? Math.floor(new Date(op.scheduled_at).getTime() / 1000) : null;
  const scheduled = ts ? `<t:${ts}:F>` : '—';
  const relative  = ts ? `<t:${ts}:R>` : '';
  const isLive    = op.status === 'LIVE';

  const roleFields = Object.entries(op.role_slots || {}).map(([role, slot]) => {
    const cap   = typeof slot === 'object' ? (slot as any).capacity ?? slot : slot;
    const crew  = confirmedRsvps.filter(r => r.role === role);
    const names = crew.length > 0 ? crew.map(r => r.discord_username || r.discord_id).join(', ') : '—';
    return { name: `${role.toUpperCase()} [${crew.length}/${cap}]`, value: names, inline: true };
  });

  return {
    title: isLive ? `🟢 LIVE — ${op.name}` : `🎯 ${op.name}`,
    color: isLive ? 0x27c96a : 0x4a8fd0,
    fields: [
      { name: 'Type',      value: op.type?.replace(/_/g, ' ') || '—', inline: true },
      { name: 'System',    value: (op.system_name || op.system || '—') + (op.location ? ` · ${op.location}` : ''), inline: true },
      { name: 'Access',    value: op.access_type || 'EXCLUSIVE', inline: true },
      { name: 'Scheduled', value: `${scheduled}${relative ? `\n${relative}` : ''}`, inline: false },
      ...(op.buy_in_cost > 0 ? [{ name: 'Buy-In', value: `${op.buy_in_cost.toLocaleString()} aUEC`, inline: true }] : []),
      ...roleFields,
    ],
    footer:    { text: 'NEXUSOS · REDSCAR NOMADS' },
    timestamp: new Date().toISOString(),
  };
}

function buildWrapUpEmbed(op: any, cofferEntries: any[]) {
  const totalAuec = cofferEntries.reduce((s, e) => s + (e.amount_aUEC || 0), 0);
  const duration  = op.started_at && op.ended_at
    ? Math.round((new Date(op.ended_at).getTime() - new Date(op.started_at).getTime()) / 60000)
    : null;
  return {
    title:       `📋 WRAP-UP — ${op.name}`,
    color:       0x5a6080,
    description: op.wrap_up_report || 'Op complete.',
    fields: [
      ...(duration  ? [{ name: 'Duration',   value: `${duration}m`,              inline: true }] : []),
      ...(totalAuec ? [{ name: 'Gross aUEC', value: totalAuec.toLocaleString(), inline: true }] : []),
    ],
    footer:    { text: 'NEXUSOS · EPIC ARCHIVE' },
    timestamp: new Date().toISOString(),
  };
}

// ─── Discord Scheduled Events ─────────────────────────────────────────────────
async function createDiscordEvent(op: any) {
  const startTime = op.scheduled_at
    ? new Date(op.scheduled_at).toISOString()
    : new Date(Date.now() + 3600000).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + 3 * 3600000).toISOString();
  const roleDesc = op.role_slots
    ? Object.entries(op.role_slots).map(([r, s]) => `${r} ×${typeof s === 'object' ? (s as any).capacity : s}`).join(', ')
    : '';
  return discordPost(`/guilds/${GUILD_ID}/scheduled-events`, {
    name:                 op.name,
    description:          [
      `${op.type?.replace(/_/g, ' ')} · ${op.system_name || op.system}${op.location ? ` · ${op.location}` : ''}`,
      op.access_type ? `Access: ${op.access_type}` : '',
      roleDesc           ? `Roles: ${roleDesc}` : '',
      'RSVP in #nexusos-ops',
    ].filter(Boolean).join('\n'),
    scheduled_start_time: startTime,
    scheduled_end_time:   endTime,
    privacy_level:        2,  // GUILD_ONLY
    entity_type:          3,  // EXTERNAL
    entity_metadata:      { location: `Verse — ${op.system_name || op.system}${op.location ? ` · ${op.location}` : ''}` },
  });
}

// ─── RSVP embed refresh (shared by rsvpUpdate + interaction handler) ──────────
async function refreshRsvpEmbed(b44: any, op: any): Promise<void> {
  if (!op.discord_message_id || !CH.nexusOps) return;
  const rsvps     = await b44.asServiceRole.entities.OpRsvp.filter({ op_id: op.id });
  const confirmed = (rsvps || []).filter((r: any) => r.status === 'CONFIRMED');
  await discordPatch(`/channels/${CH.nexusOps}/messages/${op.discord_message_id}`, {
    embeds:     [buildRsvpEmbed(op, confirmed)],
    components: buildRsvpButtons(op),
  });
}

// ─── Discord interaction: per-role RSVP toggle ────────────────────────────────
async function handleRsvpToggle(req: Request, interaction: any, opId: string, roleName: string): Promise<Response> {
  const discordUserId   = interaction.member?.user?.id       || interaction.user?.id;
  const discordUsername = interaction.member?.user?.username || interaction.user?.username;

  if (!discordUserId) {
    return Response.json({ type: 4, data: { content: '⚠️ Could not identify your Discord account.', flags: 64 } });
  }

  // createClientFromRequest reads Authorization header only — safe after body consumed
  const b44 = createClientFromRequest(req);
  try {
    const [ops, allRsvps] = await Promise.all([
      b44.asServiceRole.entities.Op.filter({ id: opId }),
      b44.asServiceRole.entities.OpRsvp.filter({ op_id: opId, discord_id: discordUserId }),
    ]);

    const op = ops?.[0];
    if (!op) return Response.json({ type: 4, data: { content: '⚠️ Op not found.', flags: 64 } });

    if (op.role_slots && !(roleName in op.role_slots)) {
      return Response.json({ type: 4, data: { content: `⚠️ Role **${roleName}** is not in this op.`, flags: 64 } });
    }

    const existingForRole = (allRsvps || []).find((r: any) => r.role === roleName && r.status === 'CONFIRMED');
    const existingOther   = (allRsvps || []).find((r: any) => r.role !== roleName && r.status === 'CONFIRMED');

    let msg: string;
    if (existingForRole) {
      await b44.asServiceRole.entities.OpRsvp.update(existingForRole.id, { status: 'DECLINED' });
      msg = `❌ RSVP removed — **${roleName.toUpperCase()}** on *${op.name}*`;
    } else if (existingOther) {
      await b44.asServiceRole.entities.OpRsvp.update(existingOther.id, { role: roleName });
      msg = `🔄 Switched to **${roleName.toUpperCase()}** on *${op.name}*`;
    } else {
      await b44.asServiceRole.entities.OpRsvp.create({
        op_id:            opId,
        discord_id:       discordUserId,
        discord_username: discordUsername,
        role:             roleName,
        status:           'CONFIRMED',
      });
      msg = `✅ RSVP confirmed — **${roleName.toUpperCase()}** on *${op.name}*`;
    }

    // Refresh embed — fire-and-forget, non-fatal
    refreshRsvpEmbed(b44, op).catch(e => console.warn('[rsvp embed refresh]', e.message));

    return Response.json({ type: 4, data: { content: msg, flags: 64 } });
  } catch (e) {
    console.error('[handleRsvpToggle]', e);
    return Response.json({ type: 4, data: { content: '⚠️ RSVP update failed — please try again.', flags: 64 } });
  }
}

async function handleDiscordInteraction(req: Request, sig: string, ts: string): Promise<Response> {
  if (!DISCORD_PUBLIC_KEY) return new Response('No public key configured', { status: 401 });

  const body  = await req.text();
  const valid = await verifyDiscordSig(DISCORD_PUBLIC_KEY, sig, ts, body);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const interaction = JSON.parse(body);

  // PING
  if (interaction.type === 1) return Response.json({ type: 1 });

  // MESSAGE_COMPONENT (button click)
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id as string;
    if (customId?.startsWith('rsvp_')) {
      const [, opId, ...roleParts] = customId.split('_');
      // opId = UUID (dashes, no underscores) · roleParts rejoined handles multi-word roles
      return handleRsvpToggle(req, interaction, opId, roleParts.join('_'));
    }
  }

  return Response.json({ type: 1 }); // ACK unknown
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Discord interactions arrive with signature headers — branch before Base44 auth
  const discordSig = req.headers.get('X-Signature-Ed25519');
  const discordTs  = req.headers.get('X-Signature-Timestamp');
  if (discordSig && discordTs) {
    return handleDiscordInteraction(req, discordSig, discordTs);
  }

  try {
    const b44  = createClientFromRequest(req);
    const user = await b44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as HeraldRequestBody;
    const { action, payload } = coerceActionPayload(body);

    // ── 1. Publish Op ─────────────────────────────────────────────────────────
    if (action === 'publishOp') {
      const { op_id } = payload;
      const ops = await b44.asServiceRole.entities.Op.filter({ id: op_id });
      const op  = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        content:    '@here 📡 **New op published** — RSVP below',
        embeds:     [{ ...buildRsvpEmbed(op, []), thumbnail: { url: TOKENS.opAnnounce } }],
        components: buildRsvpButtons(op),
      }) as any;

      // Secondary profession channel ping
      const routing = PROFESSION_ROUTING[op.type?.toUpperCase()];
      if (routing?.secondary) {
        await discordPost(`/channels/${routing.secondary}/messages`, {
          embeds: [{
            title:       `📅 Upcoming: ${op.name}`,
            color:       0x4a8fd0,
            description: 'RSVP in [#nexusos-ops]',
            footer:      { text: `${op.system_name || op.system}${op.location ? ` · ${op.location}` : ''}` },
          }],
        });
      }

      // Discord Scheduled Event — non-fatal
      let discordEventId: string | null = null;
      try {
        const event = await createDiscordEvent(op) as any;
        discordEventId = event.id;
      } catch (e) {
        console.warn('[publishOp] Scheduled event failed:', (e as Error).message);
      }

      await b44.asServiceRole.entities.Op.update(op_id, {
        discord_message_id: msg.id,
        discord_event_id:   discordEventId,
      });

      return Response.json({ success: true, message_id: msg.id, event_id: discordEventId });
    }

    // ── 2. RSVP Update (patch embed to reflect current roster) ───────────────
    if (action === 'rsvpUpdate') {
      const { op_id } = payload;
      const [ops, rsvps] = await Promise.all([
        b44.asServiceRole.entities.Op.filter({ id: op_id }),
        b44.asServiceRole.entities.OpRsvp.filter({ op_id }),
      ]);
      const op = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      if (op.discord_message_id) {
        const confirmed = (rsvps || []).filter((r: any) => r.status === 'CONFIRMED');
        await discordPatch(`/channels/${CH.nexusOps}/messages/${op.discord_message_id}`, {
          embeds:     [buildRsvpEmbed(op, confirmed)],
          components: buildRsvpButtons(op),
        });
      }

      return Response.json({ success: true });
    }

    // ── 3. Op Go (green light — patch embed + optional @here) ────────────────
    if (action === 'opGo' || action === 'opActivate') {
      const { op_id, at_here } = payload;
      const [ops, rsvps] = await Promise.all([
        b44.asServiceRole.entities.Op.filter({ id: op_id }),
        b44.asServiceRole.entities.OpRsvp.filter({ op_id }),
      ]);
      const op = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      if (op.discord_message_id) {
        const confirmed  = (rsvps || []).filter((r: any) => r.status === 'CONFIRMED');
        const liveEmbed  = { ...buildRsvpEmbed({ ...op, status: 'LIVE' }, confirmed), thumbnail: { url: TOKENS.opLive } };
        await discordPatch(`/channels/${CH.nexusOps}/messages/${op.discord_message_id}`, {
          embeds:     [liveEmbed],
          components: buildRsvpButtons(op),
        });
      }

      await updateScheduledEventStatus(op.discord_event_id, 2);

      if (action === 'opActivate' || at_here) {
        await discordPost(`/channels/${CH.nexusOps}/messages`, {
          content: `@here 🟢 **${op.name} IS LIVE** — All crew to stations`,
        });
      }

      return Response.json({ success: true });
    }

    // ── 4. Phase Advance ──────────────────────────────────────────────────────
    if (action === 'phaseAdvance') {
      const { op_id, phase_name, phase_index } = payload;
      await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [{
          title:       `⚙️ PHASE ${phase_index + 1} — ${(phase_name as string).toUpperCase()}`,
          color:       0xe8a020,
          description: 'Phase advanced — all crew acknowledge',
          thumbnail:   { url: TOKENS.phaseAdvance },
          footer:      { text: `NEXUSOS · OP ID ${op_id}` },
          timestamp:   new Date().toISOString(),
        }],
      });
      return Response.json({ success: true });
    }

    // ── 5. Phase Briefing ────────────────────────────────────────────────────
    if (action === 'phaseBriefing') {
      const { op_id, op_name, phase_name, briefing_text, embed } = payload;
      const finalEmbed = embed && typeof embed === 'object'
        ? embed
        : {
            title: `📋 PHASE BRIEFING — ${(phase_name as string || 'UPDATE').toUpperCase()}`,
            color: 0x4a8fd0,
            description: String(briefing_text || 'Phase briefing ready.'),
            footer: { text: `NEXUSOS · ${op_name || op_id || 'PHASE BRIEFING'}` },
            timestamp: new Date().toISOString(),
          };

      const message = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [finalEmbed],
      }) as any;

      return Response.json({ success: true, message_id: message?.id || null });
    }

    // ── 6. Threat Alert ───────────────────────────────────────────────────────
    if (action === 'threatAlert') {
      const { op_id, op_name, threat_type, description, system, callsign, severity } = payload;
      const sev = ((severity || threat_type) as string)?.toUpperCase();
      const thumbnailUrl = sev === 'HIGH' ? TOKENS.threatHigh : TOKENS.threatMed;
      await discordPost(`/channels/${CH.nexusOps}/messages`, {
        content: '@here ⚠️ **THREAT ALERT**',
        embeds: [{
          title:       `⚠️ ${(threat_type as string)?.toUpperCase() || 'THREAT'} — ${op_name || op_id}`,
          color:       0xe04848,
          description: description || '—',
          thumbnail:   { url: thumbnailUrl },
          fields: [
            ...(system   ? [{ name: 'System',      value: system,   inline: true }] : []),
            ...(callsign ? [{ name: 'Reported by', value: callsign, inline: true }] : []),
          ],
          footer:    { text: 'NEXUSOS · THREAT ALERT' },
          timestamp: new Date().toISOString(),
        }],
      });
      return Response.json({ success: true });
    }

    // ── 7. Deliver Key (DM to member — non-fatal) ────────────────────────────
    if (action === 'deliverKey') {
      const { discord_id, callsign, auth_key, rank } = payload;
      try {
        const dmChannelId = await openDM(discord_id);
        await discordPost(`/channels/${dmChannelId}/messages`, {
          embeds: [{
            title:       '🔑 Your NexusOS Access Key',
            color:       0x4a5070,
            thumbnail:   { url: TOKENS.keyDelivered },
            description: [
              `Welcome to NexusOS, **${callsign}** [${rank || 'OPERATIVE'}].`,
              '',
              'Your permanent auth key:',
              `\`\`\`${auth_key}\`\`\``,
              '**Keep this private.** Use it at the NexusOS login page.',
              'This key is permanent unless revoked by a Pioneer.',
            ].join('\n'),
            footer:    { text: 'NEXUSOS · REDSCAR NOMADS' },
            timestamp: new Date().toISOString(),
          }],
        });
      } catch (e) {
        console.warn('[heraldBot] deliverKey DM failed:', (e as Error).message);
      }
      return Response.json({ success: true });
    }

    // ── 8. Wrap-Up Debrief (Claude-generated) ────────────────────────────────
    if (action === 'wrapUpDebrief') {
      const { op_name, system, location, duration_min, crew_count, total_auec, total_scu, report } = payload;

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [{
          title: `📋 DEBRIEF — ${op_name}`,
          color: 0x5a6080,
          description: report,
          fields: [
            { name: 'System',    value: system + (location ? ` · ${location}` : ''), inline: true },
            ...(duration_min != null ? [{ name: 'Duration', value: `${duration_min}m`, inline: true }] : []),
            { name: 'Crew',      value: String(crew_count || 0), inline: true },
            ...(total_scu > 0 ? [{ name: 'Material Yield', value: `${total_scu.toFixed(1)} SCU`, inline: true }] : []),
            ...(total_auec > 0 ? [{ name: 'Gross aUEC', value: total_auec.toLocaleString(), inline: true }] : []),
          ],
          footer: { text: 'NEXUSOS · EPIC ARCHIVE' },
          timestamp: new Date().toISOString(),
        }],
      });

      // Create debrief thread
      if (msg?.id) {
        await discordPost(`/channels/${CH.nexusOps}/messages/${msg.id}/threads`, {
          name: `📁 ${op_name} — Debrief`,
          auto_archive_duration: 1440,
        });
      }

      // Post aUEC to #COFFER if applicable
      if (total_auec > 0 && CH.coffer) {
        await discordPost(`/channels/${CH.coffer}/messages`, {
          embeds: [{
            title: `💰 Op Split — ${op_name}`,
            color: 0x27c96a,
            description: `Gross: **${total_auec.toLocaleString()} aUEC**`,
            footer: { text: 'NEXUSOS · COFFER' },
            timestamp: new Date().toISOString(),
          }],
        });
      }

      return Response.json({ success: true });
    }

    // ── 9. Op Debrief (embed already generated elsewhere) ───────────────────
    if (action === 'opDebrief') {
      const { op_id, debrief, embed } = payload;
      const finalEmbed = embed && typeof embed === 'object'
        ? embed
        : {
            title: `📋 OP DEBRIEF — ${op_id || 'UNKNOWN OP'}`,
            color: 0x5a6080,
            description: String(debrief || 'Debrief ready.'),
            footer: { text: 'NEXUSOS · EPIC ARCHIVE' },
            timestamp: new Date().toISOString(),
          };

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [finalEmbed],
      }) as any;

      if (msg?.id) {
        await discordPost(`/channels/${CH.nexusOps}/messages/${msg.id}/threads`, {
          name: `📁 ${op_id || 'Op'} — Debrief`,
          auto_archive_duration: 1440,
        });
      }

      return Response.json({ success: true, message_id: msg?.id || null });
    }

    // ── 10. Key Event (audit log — ISSUED / REISSUED / REVOKED) ─────────────
    if (action === 'keyEvent') {
      const { event_type, callsign, issued_by, nexus_rank } = payload;
      const isRevoked = (event_type as string).toUpperCase() === 'REVOKED';

      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title:     `🔑 KEY ${(event_type as string).toUpperCase()} — ${callsign}`,
          color:     isRevoked ? 0xe04848 : 0x4a5070,
          thumbnail: { url: isRevoked ? TOKENS.keyRevoked : TOKENS.keyDelivered },
          fields: [
            ...(nexus_rank ? [{ name: 'Rank',                                     value: nexus_rank, inline: true }] : []),
            ...(issued_by  ? [{ name: isRevoked ? 'Revoked By' : 'Issued By',     value: issued_by,  inline: true }] : []),
          ],
          footer:    { text: 'NEXUSOS · KEY AUDIT' },
          timestamp: new Date().toISOString(),
        }],
      });

      // Welcome ping for new issuances
      if ((event_type as string).toUpperCase() === 'ISSUED' && CH.redscarOnly) {
        await discordPost(`/channels/${CH.redscarOnly}/messages`, {
          content: `👋 **${callsign}** has joined NexusOS — welcome, ${nexus_rank?.toLowerCase() || 'operative'}.`,
        });
      }

      return Response.json({ success: true });
    }

    // ── 11. Armory Update ────────────────────────────────────────────────────
    if (action === 'armoryUpdate') {
      const { callsign, material_name, quantity_scu, quality_pct, source_type } = payload;
      if (CH.armory) {
        await discordPost(`/channels/${CH.armory}/messages`, {
          embeds: [{
            title:     '📦 Armory Updated',
            color:     0x4a8fd0,
            thumbnail: { url: TOKENS.armoryUpdate },
            description: `**${callsign}** logged **${quantity_scu} SCU ${material_name}** @ ${quality_pct}% via ${source_type}`,
            footer:      { text: 'NEXUSOS · ARMORY' },
            timestamp:   new Date().toISOString(),
          }],
        });
      }
      return Response.json({ success: true });
    }

    // ── 12. Armory Alert ─────────────────────────────────────────────────────
    if (action === 'armoryAlert') {
      const { low_stock_count, items, alert_text } = payload;
      const targetChannel = CH.armory || CH.nexusLog || CH.nexusOps;
      const lines = Array.isArray(items)
        ? items.slice(0, 8).map((item: any) => `• ${item.name} (${item.current}/${item.threshold})`)
        : [];

      await discordPost(`/channels/${targetChannel}/messages`, {
        content: Number(low_stock_count || 0) > 0 ? '@here ⚠️ **ARMORY RESTOCK ALERT**' : null,
        embeds: [{
          title: '📦 Armory Stock Alert',
          color: 0xe8a020,
          thumbnail: { url: TOKENS.armoryUpdate },
          description: String(alert_text || 'One or more armory items are below threshold.').slice(0, 1024),
          fields: [
            { name: 'Items Below Threshold', value: String(low_stock_count || lines.length || 0), inline: true },
            ...(lines.length > 0 ? [{ name: 'Priority Items', value: lines.join('\n').slice(0, 1024), inline: false }] : []),
          ],
          footer: { text: 'NEXUSOS · ARMORY' },
          timestamp: new Date().toISOString(),
        }],
      });

      return Response.json({ success: true });
    }

    // ── 13. Patch Digest ─────────────────────────────────────────────────────
    if (action === 'patchDigest') {
      const { patch_version, industry_summary, changes_json } = payload;

      const sev = (s: string) => s === 'HIGH' ? '🔴' : s === 'MEDIUM' ? '🟡' : '🟢';
      const allChanges = (changes_json as any[] || [])
        .map(c => `${sev(c.severity)} **${c.category?.toUpperCase()}**: ${c.change_summary}`)
        .join('\n');

      // Full digest → #ptu
      if (CH.ptu) {
        await discordPost(`/channels/${CH.ptu}/messages`, {
          embeds: [{
            title:     `📦 Star Citizen v${patch_version} — Patch Notes`,
            color:     0x5a6080,
            thumbnail: { url: TOKENS.patchDigest },
            description: (allChanges || industry_summary || 'Patch notes received.').slice(0, 4096),
            footer:      { text: 'NEXUSOS · PATCH DIGEST' },
            timestamp:   new Date().toISOString(),
          }],
        });
      }

      // Industry-relevant only → #industry
      const industryChanges = (changes_json as any[] || []).filter(c =>
        ['mining', 'crafting', 'salvage', 'economy', 'refinery'].includes(c.category?.toLowerCase())
      );
      if (industryChanges.length > 0 && CH.industry) {
        const industryText = industryChanges
          .map(c => `${sev(c.severity)} **${c.category?.toUpperCase()}**: ${c.change_summary}`)
          .join('\n');
        await discordPost(`/channels/${CH.industry}/messages`, {
          embeds: [{
            title:       `⚙️ v${patch_version} — Industry Changes`,
            color:       0xe8a020,
            description: industryText.slice(0, 4096),
            footer:      { text: 'NEXUSOS · INDUSTRY' },
          }],
        });
      }

      // Announcement → #announcements
      if (CH.announcements) {
        await discordPost(`/channels/${CH.announcements}/messages`, {
          content: `📣 **Star Citizen ${patch_version} is live.** Full digest in <#${CH.ptu}>.`,
        });
      }

      return Response.json({ success: true });
    }

    // ── 14. Patch Alert (high-severity compatibility path) ──────────────────
    if (action === 'notify_patch_alert') {
      const { patch_version, summary, changes } = payload;
      const targetChannel = CH.nexusOps || CH.ptu || CH.announcements;
      const changeLines = Array.isArray(changes)
        ? changes
            .slice(0, 5)
            .map((change: any) => `• ${(change.category || 'UPDATE').toString().toUpperCase()}: ${change.change_summary || 'High-severity impact detected'}`)
            .join('\n')
        : '';

      await discordPost(`/channels/${targetChannel}/messages`, {
        content: '@here ⚠️ **HIGH-SEVERITY PATCH IMPACT DETECTED**',
        embeds: [{
          title: `📦 Patch Alert — ${patch_version || 'Unknown Version'}`,
          color: 0xe04848,
          thumbnail: { url: TOKENS.patchDigest },
          description: String(summary || 'Critical patch changes were detected.').slice(0, 1024),
          fields: changeLines ? [{ name: 'Immediate Review Items', value: changeLines.slice(0, 1024), inline: false }] : [],
          footer: { text: 'NEXUSOS · PATCH WATCHER' },
          timestamp: new Date().toISOString(),
        }],
      });

      return Response.json({ success: true });
    }

    // ── 15. Scout Ping ────────────────────────────────────────────────────────
    if (action === 'scoutPing') {
      const { material_name, quality_pct, system_name, location_detail, callsign, risk_level } = payload;
      const t2 = quality_pct >= 80;
      const ok = quality_pct >= 60;

      await discordPost(`/channels/${CH.nexusIntel}/messages`, {
        ...(t2 ? { content: '@here 🔥 **T2-eligible deposit detected**' } : {}),
        embeds: [{
          title:     `📡 Scout Deposit — ${material_name}`,
          color:     t2 ? 0x27c96a : ok ? 0xe8a020 : 0x5a6080,
          thumbnail: { url: t2 ? TOKENS.depositReady : TOKENS.depositStale },
          fields: [
            { name: 'Quality',  value: `${quality_pct}%${t2 ? ' · T2 ELIGIBLE' : ''}`, inline: true },
            { name: 'Location', value: `${system_name}${location_detail ? ` · ${location_detail}` : ''}`, inline: true },
            { name: 'Scout',    value: callsign || '—', inline: true },
            ...(risk_level ? [{ name: 'Risk', value: (risk_level as string).toUpperCase(), inline: true }] : []),
          ],
          footer:    { text: 'NEXUSOS · SCOUT INTEL' },
          timestamp: new Date().toISOString(),
        }],
      });

      // T2-eligible also pings #industry
      if (t2 && CH.industry) {
        await discordPost(`/channels/${CH.industry}/messages`, {
          embeds: [{
            title:       `⛏️ T2-Eligible Deposit — ${material_name} ${quality_pct}%`,
            color:       0x27c96a,
            description: `${system_name}${location_detail ? ` · ${location_detail}` : ''} — scouted by ${callsign || '—'}`,
            footer:      { text: 'NEXUSOS · INDUSTRY' },
          }],
        });
      }

      return Response.json({ success: true });
    }

    // ── 16. Deposit Stale Alert ──────────────────────────────────────────────
    if (action === 'depositStaleAlert') {
      const { material_name, system_name, location_detail, reported_by_callsign, stale_votes, patch_version, deposit_count, comm_link_url } = payload;
      if (CH.nexusIntel) {
        if (patch_version || deposit_count || comm_link_url) {
          await discordPost(`/channels/${CH.nexusIntel}/messages`, {
            content: Number(deposit_count || 0) > 0 ? '@here ⚠️ **PATCH CHANGE — RE-VERIFY DEPOSITS**' : null,
            embeds: [{
              title:     `🚩 Deposit Intel Invalidated${patch_version ? ` — v${patch_version}` : ''}`,
              color:     0xe8a020,
              thumbnail: { url: TOKENS.depositStale },
              description: 'A new patch was detected. Existing scout deposits should be treated as stale until re-verified in the verse.',
              fields: [
                { name: 'Deposits Marked Stale', value: String(deposit_count ?? 0), inline: true },
                ...(comm_link_url ? [{ name: 'Patch Notes', value: comm_link_url as string, inline: false }] : []),
              ],
              footer:    { text: 'NEXUSOS · SCOUT INTEL' },
              timestamp: new Date().toISOString(),
            }],
          });
        } else {
          await discordPost(`/channels/${CH.nexusIntel}/messages`, {
            embeds: [{
              title:     `🚩 Deposit Flagged Stale — ${material_name}`,
              color:     0xe8a020,
              thumbnail: { url: TOKENS.depositStale },
              fields: [
                { name: 'Location',       value: `${system_name}${location_detail ? ` · ${location_detail}` : ''}`, inline: true },
                { name: 'Original Scout', value: reported_by_callsign || '—', inline: true },
                { name: 'Stale Votes',    value: String(stale_votes ?? 3), inline: true },
              ],
              footer:    { text: 'NEXUSOS · SCOUT INTEL' },
              timestamp: new Date().toISOString(),
            }],
          });
        }
      }
      return Response.json({ success: true });
    }

    // ── 17. Op End (lightweight completion path) ─────────────────────────────
    if (action === 'opEnd') {
      const { op_id, op_name } = payload;
      const op = (await b44.asServiceRole.entities.Op.filter({ id: op_id }))?.[0];
      const resolvedName = op?.name || op_name || String(op_id || 'Unknown op');
      const duration = formatDurationMinutes(op?.started_at, op?.ended_at);

      await updateScheduledEventStatus(op?.discord_event_id, 3);

      await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [{
          title: `⏹ OP COMPLETE — ${resolvedName}`,
          color: 0x5a6080,
          fields: [
            ...(duration ? [{ name: 'Duration', value: duration, inline: true }] : []),
            ...(op?.system_name || op?.system ? [{ name: 'Location', value: `${op.system_name || op.system}${op.location ? ` · ${op.location}` : ''}`, inline: true }] : []),
          ],
          footer: { text: 'NEXUSOS · OPS' },
          timestamp: new Date().toISOString(),
        }],
      });

      return Response.json({ success: true });
    }

    // ── 18. Op Wrap-Up (summary embed + archive thread + coffer) ────────────
    if (action === 'opWrapUp') {
      const { op_id } = payload;
      const [ops, cofferEntries, rsvps] = await Promise.all([
        b44.asServiceRole.entities.Op.filter({ id: op_id }),
        b44.asServiceRole.entities.CofferLog.filter({ op_id }),
        b44.asServiceRole.entities.OpRsvp.filter({ op_id, status: 'CONFIRMED' }),
      ]);
      const op = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      await updateScheduledEventStatus(op.discord_event_id, 3);

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [buildWrapUpEmbed(op, cofferEntries || [])],
      }) as any;

      // Archive thread on the summary message
      const thread = await discordPost(
        `/channels/${CH.nexusOps}/messages/${msg.id}/threads`,
        { name: `📁 ${op.name} — After Action`, auto_archive_duration: 1440 }
      ) as any;

      // Post full report + crew + session log to thread
      if (thread?.id) {
        const crewLines  = (rsvps || []).map((r: any) => `• ${r.discord_username || r.discord_id} (${r.role})`).join('\n');
        const logEntries = Array.isArray(op.session_log)
          ? op.session_log.map((e: any) => `**[${e.phase || '—'}]** ${e.note || e.text || JSON.stringify(e)}`).join('\n')
          : (typeof op.session_log === 'string' ? op.session_log : null);

        const sections = [
          op.wrap_up_report ? `## After-Action Report\n${op.wrap_up_report}` : null,
          crewLines          ? `## Crew\n${crewLines}` : null,
          logEntries         ? `## Session Log\n${logEntries}` : null,
        ].filter(Boolean).join('\n\n');

        if (sections) {
          // Chunked to respect Discord 2000-char limit
          for (let i = 0; i < sections.length; i += 2000) {
            await discordPost(`/channels/${thread.id}/messages`, { content: sections.slice(i, i + 2000) });
          }
        }
      }

      // aUEC split → #coffer
      const totalAuec = (cofferEntries || []).reduce((s: number, e: any) => s + (e.amount_aUEC || 0), 0);
      if (totalAuec > 0 && CH.coffer) {
        await discordPost(`/channels/${CH.coffer}/messages`, {
          embeds: [{
            title:       `💰 Op Split — ${op.name}`,
            color:       0x27c96a,
            description: `Total: **${totalAuec.toLocaleString()} aUEC**`,
            footer:      { text: 'NEXUSOS · COFFER' },
            timestamp:   new Date().toISOString(),
          }],
        });
      }

      return Response.json({ success: true, thread_id: thread?.id });
    }

    // ── Refinery Ready (passthrough) ─────────────────────────────────────────
    if (action === 'refineryReady') {
      const { material_name, quantity_scu, station, callsign } = payload;
      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title: `⚗️ Refinery READY — ${material_name}`,
          color: 0xe8a020,
          fields: [
            { name: 'Quantity',     value: `${quantity_scu} SCU`, inline: true },
            { name: 'Station',      value: station  || '—',       inline: true },
            { name: 'Submitted by', value: callsign || '—',       inline: true },
          ],
          footer:    { text: 'NEXUSOS · REFINERY' },
          timestamp: new Date().toISOString(),
        }],
      });
      return Response.json({ success: true });
    }

    // ── Craft Complete (passthrough) ─────────────────────────────────────────
    if (action === 'craftComplete') {
      const { item_name, quantity, fabricator, requestor, value_est } = payload;
      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title: `🔧 Craft Complete — ${item_name}`,
          color: 0x27c96a,
          fields: [
            { name: 'Quantity',   value: String(quantity || 1), inline: true },
            { name: 'Fabricator', value: fabricator || '—',     inline: true },
            { name: 'Requestor',  value: requestor  || '—',     inline: true },
            ...(value_est ? [{ name: 'Est. Value', value: `${(value_est as number).toLocaleString()} aUEC`, inline: true }] : []),
          ],
          footer:    { text: 'NEXUSOS · CRAFT QUEUE' },
          timestamp: new Date().toISOString(),
        }],
      });
      if (CH.invoices) {
        await discordPost(`/channels/${CH.invoices}/messages`, {
          embeds: [{
            title: `🧾 Invoice — ${item_name}`,
            color: 0x5a6080,
            fields: [
              { name: 'Item',       value: item_name,             inline: true },
              { name: 'Qty',        value: String(quantity || 1), inline: true },
              { name: 'Fabricator', value: fabricator || '—',     inline: true },
              { name: 'Requestor',  value: requestor  || '—',     inline: true },
              ...(value_est ? [{ name: 'Est. Value', value: `${(value_est as number).toLocaleString()} aUEC`, inline: true }] : []),
            ],
            footer:    { text: 'NEXUSOS · INVOICES' },
            timestamp: new Date().toISOString(),
          }],
        });
      }
      return Response.json({ success: true });
    }

    // ── Low Stock Alert ───────────────────────────────────────────────────────
    if (action === 'lowStockAlert') {
      const { material, current_scu, min_scu, current_quality, min_quality, status, critical, callsign } = payload;
      const isCritical = critical && (status === 'CRITICAL' || status === 'MISSING');
      const color = isCritical ? 0xe04848 : status === 'LOW' ? 0xe8a020 : 0x4a8fd0;

      await discordPost(`/channels/${CH.nexusLog || CH.nexusOps}/messages`, {
        content: isCritical ? `@here ⚠️ **CRITICAL STOCK ALERT**` : null,
        embeds: [{
          title: `📦 Low Stock — ${material}`,
          color,
          fields: [
            { name: 'Status',     value: status, inline: true },
            { name: 'Have',       value: `${current_scu.toFixed(1)} SCU`, inline: true },
            { name: 'Need',       value: `${min_scu} SCU`, inline: true },
            { name: 'Quality',    value: `${current_quality.toFixed(0)}% / ${min_quality}% min`, inline: true },
            { name: 'Reported By', value: callsign || '—', inline: true },
          ],
          footer: { text: 'NEXUSOS · MATERIAL LEDGER' },
          timestamp: new Date().toISOString(),
        }],
      });

      return Response.json({ success: true });
    }

    // ── Org Health Briefing (daily agent report) ────────────────────────────
    if (action === 'orgHealthBriefing') {
      const { briefing, total_scu, avg_quality, t2_count, open_craft, refinery_ready, housekeeping, generated_at } = payload;
      const targetChannel = CH.nexusLog || CH.nexusOps;
      if (targetChannel) {
        await discordPost(`/channels/${targetChannel}/messages`, {
          embeds: [{
            title: `📊 Daily Industry Readiness — ${new Date(generated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`,
            color: 0x5a6080,
            description: briefing,
            fields: [
              { name: 'Stockpile', value: `${total_scu.toFixed(1)} SCU`, inline: true },
              { name: 'Avg Quality', value: `${avg_quality.toFixed(0)}%`, inline: true },
              { name: 'T2-Ready', value: String(t2_count), inline: true },
              { name: 'Craft Queue', value: String(open_craft), inline: true },
              { name: 'Refinery Ready', value: String(refinery_ready), inline: true },
              ...(housekeeping?.archived_materials > 0 || housekeeping?.flagged_queue > 0 || housekeeping?.cleaned_refinery > 0 ? [{
                name: 'Housekeeping',
                value: [
                  housekeeping.archived_materials > 0 ? `Archived ${housekeeping.archived_materials} materials` : null,
                  housekeeping.flagged_queue > 0 ? `Flagged ${housekeeping.flagged_queue} stale queue items` : null,
                  housekeeping.cleaned_refinery > 0 ? `Cleaned ${housekeeping.cleaned_refinery} refinery records` : null,
                ].filter(Boolean).join(' · '),
                inline: false,
              }] : []),
            ],
            footer: { text: 'NEXUSOS · AUTONOMOUS AGENT · DAILY BRIEF' },
            timestamp: generated_at,
          }],
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[heraldBot]', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
