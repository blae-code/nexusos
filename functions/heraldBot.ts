/**
 * Herald Bot — NexusOS Discord Integration
 * Handles: op publishing, OCR routing, scout pings, log events,
 *          refinery alerts, craft completions, voice state sync,
 *          Discord Scheduled Events creation/update/delete
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Channel Config (loaded from env) ────────────────────────────────────────
const CH = {
  // New NexusOS channels
  nexusOps:     Deno.env.get('NEXUSOS_OPS_CHANNEL_ID'),
  nexusOcr:     Deno.env.get('NEXUSOS_OCR_CHANNEL_ID'),
  nexusIntel:   Deno.env.get('NEXUSOS_INTEL_CHANNEL_ID'),
  nexusLog:     Deno.env.get('NEXUSOS_LOG_CHANNEL_ID'),
  // Existing channels
  armory:       Deno.env.get('ARMORY_CHANNEL_ID'),
  coffer:       Deno.env.get('COFFER_CHANNEL_ID'),
  invoices:     Deno.env.get('INVOICES_CHANNEL_ID'),
  industry:     Deno.env.get('INDUSTRY_CHANNEL_ID'),
  rangers:      Deno.env.get('RANGERS_CHANNEL_ID'),
  announcements:Deno.env.get('ANNOUNCEMENTS_CHANNEL_ID'),
  events:       Deno.env.get('EVENTS_CHANNEL_ID'),
  ptu:          Deno.env.get('PTU_CHANNEL_ID'),
  bonfire:      Deno.env.get('BONFIRE_CHANNEL_ID'),
  redscarOnly:  Deno.env.get('REDSCAR_ONLY_CHANNEL_ID'),
  // Placeholder — future Marketplace module
  // TODO: BAZZAR_CHANNEL_ID — future NexusOS Marketplace integration
};

// ─── Profession → Channel routing (configurable, not hardcoded) ──────────────
const PROFESSION_ROUTING = {
  INDUSTRY:    { secondary: CH.industry },
  MINING:      { secondary: CH.industry },
  ROCKBREAKER: { secondary: CH.industry },
  SALVAGE:     { secondary: CH.industry },
  PATROL:      { secondary: CH.rangers },
  COMBAT:      { secondary: CH.rangers },
  ESCORT:      { secondary: CH.rangers },
  S17:         { secondary: CH.rangers },
  RESCUE:      { secondary: null, emergency: true },
  EMERGENCY:   { secondary: null, emergency: true },
  // RACING: placeholder, no Herald Bot features yet
};

const BOT_TOKEN = Deno.env.get('HERALD_BOT_TOKEN');
const GUILD_ID  = Deno.env.get('REDSCAR_GUILD_ID');
const DISCORD_API = 'https://discord.com/api/v10';

// ─── Stub mode — gracefully no-op if bot token not yet configured ─────────────
const BOT_CONFIGURED = !!BOT_TOKEN && !!GUILD_ID;

// ─── Discord API helpers ──────────────────────────────────────────────────────
async function discordPost(path, body) {
  if (!BOT_CONFIGURED) {
    console.log(`[HERALD STUB] POST ${path}`, JSON.stringify(body).slice(0, 120));
    return { id: `stub_${Date.now()}` };
  }
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function discordPatch(path, body) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function discordDelete(path) {
  if (!BOT_CONFIGURED) {
    console.log(`[HERALD STUB] DELETE ${path}`);
    return null;
  }
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Discord API error ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ─── Embed builders ───────────────────────────────────────────────────────────
function opEmbed(op) {
  const roleLines = op.role_slots
    ? Object.entries(op.role_slots).map(([role, slot]) => `**${role.toUpperCase()}** × ${typeof slot === 'object' ? slot.capacity : slot}`).join('\n')
    : '—';
  const scheduled = op.scheduled_at ? `<t:${Math.floor(new Date(op.scheduled_at).getTime() / 1000)}:F>` : '—';
  const relative  = op.scheduled_at ? `<t:${Math.floor(new Date(op.scheduled_at).getTime() / 1000)}:R>` : '';

  return {
    title: `🎯 ${op.name}`,
    color: 0x4a8fd0,
    fields: [
      { name: 'Type',     value: op.type?.replace(/_/g, ' ') || '—', inline: true },
      { name: 'System',   value: op.system + (op.location ? ` · ${op.location}` : ''), inline: true },
      { name: 'Access',   value: op.access_type || 'EXCLUSIVE', inline: true },
      { name: 'Scheduled', value: `${scheduled}\n${relative}`, inline: false },
      { name: 'Role Slots', value: roleLines, inline: false },
      ...(op.buy_in_cost > 0 ? [{ name: 'Buy-In', value: `${op.buy_in_cost.toLocaleString()} aUEC`, inline: true }] : []),
    ],
    footer: { text: 'NEXUSOS · REDSCAR NOMADS' },
    timestamp: new Date().toISOString(),
  };
}

function liveOpEmbed(op) {
  const elapsed = op.started_at ? Math.floor((Date.now() - new Date(op.started_at)) / 60000) : 0;
  return {
    title: `🟢 LIVE — ${op.name}`,
    color: 0x27c96a,
    description: `Phase **${(op.phase_current || 0) + 1}** underway · ${elapsed}m elapsed`,
    fields: [
      { name: 'System', value: op.system + (op.location ? ` · ${op.location}` : ''), inline: true },
    ],
    footer: { text: 'NEXUSOS · LIVE OP' },
    timestamp: new Date().toISOString(),
  };
}

function wrapUpEmbed(op, cofferEntries) {
  const totalAuec = cofferEntries.reduce((s, e) => s + (e.amount_aUEC || 0), 0);
  const duration = op.started_at && op.ended_at
    ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000)
    : null;
  return {
    title: `📋 WRAP-UP — ${op.name}`,
    color: 0x5a6080,
    description: op.wrap_up_report || 'Op complete.',
    fields: [
      ...(duration ? [{ name: 'Duration', value: `${duration}m`, inline: true }] : []),
      ...(totalAuec ? [{ name: 'Gross aUEC', value: totalAuec.toLocaleString(), inline: true }] : []),
    ],
    footer: { text: 'NEXUSOS · EPIC ARCHIVE' },
    timestamp: new Date().toISOString(),
  };
}

// ─── Discord Scheduled Events ─────────────────────────────────────────────────
async function createDiscordEvent(op) {
  const startTime = op.scheduled_at ? new Date(op.scheduled_at).toISOString() : new Date(Date.now() + 3600000).toISOString();
  const endTime   = new Date(new Date(startTime).getTime() + 3 * 3600000).toISOString();

  const roleDesc = op.role_slots
    ? Object.entries(op.role_slots).map(([r, s]) => `${r.charAt(0).toUpperCase() + r.slice(1)} ×${typeof s === 'object' ? s.capacity : s}`).join(', ')
    : '';

  return discordPost(`/guilds/${GUILD_ID}/scheduled-events`, {
    name: op.name,
    description: [
      `${op.type?.replace(/_/g, ' ')} · ${op.system}${op.location ? ` · ${op.location}` : ''}`,
      op.access_type ? `Access: ${op.access_type}` : '',
      roleDesc ? `Roles: ${roleDesc}` : '',
      `RSVP in #nexusos-ops`,
    ].filter(Boolean).join('\n'),
    scheduled_start_time: startTime,
    scheduled_end_time:   endTime,
    privacy_level: 2, // GUILD_ONLY
    entity_type: 3,   // EXTERNAL
    entity_metadata: {
      location: `Verse — ${op.system}${op.location ? ` · ${op.location}` : ''}`,
    },
  });
}

async function deleteDiscordEvent(eventId) {
  return discordDelete(`/guilds/${GUILD_ID}/scheduled-events/${eventId}`);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, payload } = await req.json();

    // ── Publish Op ──────────────────────────────────────────────────────────
    if (action === 'publishOp') {
      const { op_id } = payload;
      const ops = await base44.asServiceRole.entities.Op.filter({ id: op_id });
      const op  = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      // Post op embed to #nexusos-ops
      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        content: `@here 📡 **New op published** — RSVP below`,
        embeds: [opEmbed(op)],
        components: [
          {
            type: 1, // ACTION_ROW
            components: [
              { type: 2, style: 3, label: '✅ RSVP', custom_id: `rsvp_confirm_${op_id}` },
              { type: 2, style: 4, label: '❌ Decline', custom_id: `rsvp_decline_${op_id}` },
              { type: 2, style: 2, label: '⏳ Tentative', custom_id: `rsvp_tentative_${op_id}` },
            ],
          },
        ],
      });

      // Secondary profession channel ping
      const routing = PROFESSION_ROUTING[op.type?.toUpperCase()];
      if (routing?.secondary) {
        await discordPost(`/channels/${routing.secondary}/messages`, {
          embeds: [{
            title: `📅 Upcoming: ${op.name}`,
            color: 0x4a8fd0,
            description: `See [#nexusos-ops] for details and RSVP`,
            footer: { text: `${op.system}${op.location ? ` · ${op.location}` : ''}` },
          }],
        });
      }

      // Create Discord Scheduled Event
      let discordEventId = null;
      try {
        const event = await createDiscordEvent(op);
        discordEventId = event.id;
      } catch (e) {
        console.warn('Scheduled event creation failed:', e.message);
      }

      // Save Discord message ID + event ID back to op
      await base44.asServiceRole.entities.Op.update(op_id, {
        discord_message_id: msg.id,
        discord_event_id:   discordEventId,
      });

      return Response.json({ success: true, message_id: msg.id, event_id: discordEventId });
    }

    // ── Go Live ──────────────────────────────────────────────────────────────
    if (action === 'goLive') {
      const { op_id } = payload;
      const ops = await base44.asServiceRole.entities.Op.filter({ id: op_id });
      const op  = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      await discordPost(`/channels/${CH.nexusOps}/messages`, {
        content: `@here 🟢 **OP IS LIVE** — All crew to stations`,
        embeds: [liveOpEmbed(op)],
      });

      return Response.json({ success: true });
    }

    // ── Phase Advance ────────────────────────────────────────────────────────
    if (action === 'phaseAdvance') {
      const { op_id, phase_name, phase_index } = payload;
      await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [{
          title: `⚙️ Phase ${phase_index + 1}: ${phase_name}`,
          color: 0x4a8fd0,
          description: `Op phase advanced — all crew acknowledge`,
          footer: { text: `NEXUSOS · OP ID ${op_id}` },
          timestamp: new Date().toISOString(),
        }],
      });
      return Response.json({ success: true });
    }

    // ── Wrap-Up ──────────────────────────────────────────────────────────────
    if (action === 'wrapUp') {
      const { op_id } = payload;
      const [ops, cofferEntries] = await Promise.all([
        base44.asServiceRole.entities.Op.filter({ id: op_id }),
        base44.asServiceRole.entities.CofferLog.filter({ op_id }),
      ]);
      const op = ops?.[0];
      if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, {
        embeds: [wrapUpEmbed(op, cofferEntries || [])],
      });

      // Create archive thread on the wrap-up message
      await discordPost(`/channels/${CH.nexusOps}/messages/${msg.id}/threads`, {
        name: `📁 ${op.name} — Session Log`,
        auto_archive_duration: 1440, // 24h
      });

      // Post aUEC split to #COFFER
      const totalAuec = (cofferEntries || []).reduce((s, e) => s + (e.amount_aUEC || 0), 0);
      if (totalAuec > 0 && CH.coffer) {
        await discordPost(`/channels/${CH.coffer}/messages`, {
          embeds: [{
            title: `💰 Op Split — ${op.name}`,
            color: 0x27c96a,
            description: `Total: **${totalAuec.toLocaleString()} aUEC**`,
            footer: { text: 'NEXUSOS · COFFER' },
            timestamp: new Date().toISOString(),
          }],
        });
      }

      return Response.json({ success: true });
    }

    // ── Refinery Ready Alert ─────────────────────────────────────────────────
    if (action === 'refineryReady') {
      const { material_name, quantity_scu, station, callsign } = payload;
      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title: `⚗️ Refinery READY — ${material_name}`,
          color: 0xe8a020,
          fields: [
            { name: 'Quantity', value: `${quantity_scu} SCU`, inline: true },
            { name: 'Station', value: station || '—', inline: true },
            { name: 'Submitted by', value: callsign || '—', inline: true },
          ],
          footer: { text: 'NEXUSOS · REFINERY' },
          timestamp: new Date().toISOString(),
        }],
      });
      return Response.json({ success: true });
    }

    // ── Craft Complete ───────────────────────────────────────────────────────
    if (action === 'craftComplete') {
      const { item_name, quantity, fabricator, requestor, value_est } = payload;

      // Log to #nexusos-log
      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title: `🔧 Craft Complete — ${item_name}`,
          color: 0x27c96a,
          fields: [
            { name: 'Quantity',   value: String(quantity || 1), inline: true },
            { name: 'Fabricator', value: fabricator || '—', inline: true },
            { name: 'Requestor',  value: requestor || '—', inline: true },
            ...(value_est ? [{ name: 'Est. Value', value: `${value_est.toLocaleString()} aUEC`, inline: true }] : []),
          ],
          footer: { text: 'NEXUSOS · CRAFT QUEUE' },
          timestamp: new Date().toISOString(),
        }],
      });

      // Invoice to #INVOICES
      if (CH.invoices) {
        await discordPost(`/channels/${CH.invoices}/messages`, {
          embeds: [{
            title: `🧾 Invoice — ${item_name}`,
            color: 0x5a6080,
            fields: [
              { name: 'Item',      value: item_name, inline: true },
              { name: 'Qty',       value: String(quantity || 1), inline: true },
              { name: 'Fabricator', value: fabricator || '—', inline: true },
              { name: 'Requestor', value: requestor || '—', inline: true },
              ...(value_est ? [{ name: 'Est. Value', value: `${value_est.toLocaleString()} aUEC`, inline: true }] : []),
            ],
            footer: { text: 'NEXUSOS · INVOICES' },
            timestamp: new Date().toISOString(),
          }],
        });
      }

      return Response.json({ success: true });
    }

    // ── Scout Intel Ping ─────────────────────────────────────────────────────
    if (action === 'scoutPing') {
      const { material_name, quality_pct, system_name, location_detail, callsign } = payload;
      const highValue = quality_pct >= 88;

      await discordPost(`/channels/${CH.nexusIntel}/messages`, {
        content: highValue ? `@here 🔥 **High-value deposit detected**` : null,
        embeds: [{
          title: `📡 Scout Deposit — ${material_name}`,
          color: quality_pct >= 88 ? 0x27c96a : quality_pct >= 70 ? 0x4a8fd0 : 0xe8a020,
          fields: [
            { name: 'Quality',  value: `${quality_pct}%`, inline: true },
            { name: 'Location', value: `${system_name}${location_detail ? ` · ${location_detail}` : ''}`, inline: true },
            { name: 'Scout',    value: callsign || '—', inline: true },
          ],
          footer: { text: 'NEXUSOS · SCOUT INTEL' },
          timestamp: new Date().toISOString(),
        }],
      });

      // High-value deposits also ping #INDUSTRY
      if (highValue && CH.industry) {
        await discordPost(`/channels/${CH.industry}/messages`, {
          embeds: [{
            title: `⛏️ High-Quality Deposit — ${material_name} ${quality_pct}%`,
            color: 0x27c96a,
            description: `${system_name}${location_detail ? ` · ${location_detail}` : ''} — scouted by ${callsign || '—'}`,
            footer: { text: 'NEXUSOS · INDUSTRY' },
          }],
        });
      }

      return Response.json({ success: true });
    }

    // ── Key Issued / Revoked ─────────────────────────────────────────────────
    if (action === 'keyEvent') {
      const { event_type, callsign, issued_by, nexus_rank } = payload;
      const isIssue = event_type === 'ISSUED';

      await discordPost(`/channels/${CH.nexusLog}/messages`, {
        embeds: [{
          title: isIssue ? `🔑 Key Issued — ${callsign}` : `🚫 Key Revoked — ${callsign}`,
          color: isIssue ? 0x4a8fd0 : 0xe04848,
          fields: [
            ...(nexus_rank ? [{ name: 'Rank', value: nexus_rank, inline: true }] : []),
            ...(issued_by ? [{ name: isIssue ? 'Issued By' : 'Revoked By', value: issued_by, inline: true }] : []),
          ],
          footer: { text: 'NEXUSOS · KEY AUDIT' },
          timestamp: new Date().toISOString(),
        }],
      });

      // Welcome to #REDSCAR-ONLY for new issuances
      if (isIssue && CH.redscarOnly) {
        await discordPost(`/channels/${CH.redscarOnly}/messages`, {
          content: `👋 **${callsign}** has joined NexusOS — welcome to the Nexus, ${nexus_rank?.toLowerCase() || 'operative'}.`,
        });
      }

      return Response.json({ success: true });
    }

    // ── Patch Digest Post ────────────────────────────────────────────────────
    if (action === 'patchDigest') {
      const { patch_version, industry_summary, changes_json } = payload;

      // Full digest → #PTU-CHAT
      if (CH.ptu) {
        await discordPost(`/channels/${CH.ptu}/messages`, {
          embeds: [{
            title: `📦 Star Citizen v${patch_version} — Patch Notes`,
            color: 0x5a6080,
            description: industry_summary || 'Patch notes received.',
            footer: { text: 'NEXUSOS · PATCH DIGEST' },
            timestamp: new Date().toISOString(),
          }],
        });
      }

      // Industry-relevant changes → #INDUSTRY
      const industryChanges = (changes_json || []).filter(c =>
        ['mining', 'crafting', 'salvage', 'economy', 'refinery'].includes(c.category?.toLowerCase())
      );
      if (industryChanges.length > 0 && CH.industry) {
        await discordPost(`/channels/${CH.industry}/messages`, {
          embeds: [{
            title: `⚙️ v${patch_version} — Industry Changes`,
            color: 0xe8a020,
            description: industryChanges.map(c => `• **${c.category?.toUpperCase()}**: ${c.change_summary}`).join('\n'),
            footer: { text: 'NEXUSOS · INDUSTRY' },
          }],
        });
      }

      // Major patch → #! ANNOUNCEMENTS
      if (CH.announcements) {
        await discordPost(`/channels/${CH.announcements}/messages`, {
          content: `📣 **Star Citizen ${patch_version} is live.** Full digest in <#${CH.ptu}>.`,
        });
      }

      return Response.json({ success: true });
    }

    // ── Wrap-Up Debrief (Claude-generated) ──────────────────────────────────
    if (action === 'wrapUpDebrief') {
      const { op_name, op_type, system, location, duration_min, crew_count, total_auec, total_scu, report } = payload;

      const embed = {
        title: `📋 DEBRIEF — ${op_name}`,
        color: 0x5a6080,
        description: report,
        fields: [
          { name: 'Type',     value: op_type?.replace(/_/g, ' ') || '—', inline: true },
          { name: 'System',   value: system + (location ? ` · ${location}` : ''), inline: true },
          ...(duration_min != null ? [{ name: 'Duration', value: `${duration_min}m`, inline: true }] : []),
          ...(crew_count   ? [{ name: 'Crew',     value: String(crew_count), inline: true }] : []),
          ...(total_scu    ? [{ name: 'Yield',    value: `${total_scu.toFixed(1)} SCU`, inline: true }] : []),
          ...(total_auec   ? [{ name: 'Gross',    value: `${total_auec.toLocaleString()} aUEC`, inline: true }] : []),
        ],
        footer: { text: 'NEXUSOS · EPIC ARCHIVE' },
        timestamp: new Date().toISOString(),
      };

      const msg = await discordPost(`/channels/${CH.nexusOps}/messages`, { embeds: [embed] });

      // Auto-thread for debrief discussion
      await discordPost(`/channels/${CH.nexusOps}/messages/${msg.id}/threads`, {
        name: `📁 ${op_name} — Debrief`,
        auto_archive_duration: 1440,
      });

      return Response.json({ success: true, message_id: msg.id });
    }

    // ── Armory Update ────────────────────────────────────────────────────────
    if (action === 'armoryUpdate') {
      const { callsign, material_name, quantity_scu, quality_pct, source_type } = payload;
      if (CH.armory) {
        await discordPost(`/channels/${CH.armory}/messages`, {
          embeds: [{
            title: `📦 Armory Updated`,
            color: 0x4a8fd0,
            description: `**${callsign}** logged **${quantity_scu} SCU ${material_name}** @ ${quality_pct}% via ${source_type} — armory record updated`,
            footer: { text: 'NEXUSOS · ARMORY' },
            timestamp: new Date().toISOString(),
          }],
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('heraldBot error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});