import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      op_id,
      op_name,
      op_type,
      duration_minutes,
      crew_list = [],
      session_log = [],
      materials_logged = [],
      total_value_aUEC = 0,
    } = await req.json();

    if (!op_id || !op_name) {
      return Response.json({ error: 'Missing op_id or op_name' }, { status: 400 });
    }

    // Format crew summary
    const crewSummary = crew_list
      .map(member => `- ${member.callsign || member.name} (${member.role || 'unknown'})`)
      .join('\n');

    // Format materials summary
    const materialsSummary = materials_logged
      .map(m => `- ${m.material_name}: ${m.quantity_scu} SCU @ ${m.quality_pct}% quality`)
      .join('\n');

    // Format session log excerpt (last 5 entries)
    const logExcerpt = (session_log || [])
      .slice(-5)
      .map(entry => `[${entry.time || 'T+?'}] ${entry.message || entry.action || 'Event logged'}`)
      .join('\n');

    const prompt = `You are a Redscar Nomads operations debrief officer. Generate a tactical, concise markdown debrief for:

OPERATION: ${op_name}
TYPE: ${op_type}
DURATION: ${duration_minutes} minutes
CREW: ${crew_list.length} members
TOTAL VALUE: ${total_value_aUEC.toLocaleString()} aUEC

CREW ROSTER:
${crewSummary || '(None recorded)'}

MATERIALS LOGGED:
${materialsSummary || '(None recorded)'}

SESSION HIGHLIGHTS (last entries):
${logExcerpt || '(No session log entries)'}

Write a brief tactical debrief that:
1. Opens with status line (SUCCESS/PARTIAL/CHALLENGING)
2. Notes crew performance and coordination
3. Highlights material yields and quality achieved
4. Flags any issues or improvements for next time
5. Closes with operational summary

Use military/tactical tone. Keep it under 300 words. Do NOT include any markdown code blocks.
Return ONLY the markdown text for the debrief.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude-sonnet-4-6',
    });

    // The debrief markdown text
    const debrief_text = result;

    // Format Discord embed for #nexusos-ops
    const discordEmbed = {
      title: `📋 OP DEBRIEF: ${op_name}`,
      description: debrief_text.substring(0, 2048), // Discord limit
      color: total_value_aUEC > 0 ? 2611200 : 6918400, // Green if profitable, amber if not
      fields: [
        {
          name: 'Duration',
          value: `${duration_minutes}m`,
          inline: true,
        },
        {
          name: 'Crew',
          value: `${crew_list.length} members`,
          inline: true,
        },
        {
          name: 'Total Value',
          value: `${total_value_aUEC.toLocaleString()} aUEC`,
          inline: true,
        },
        {
          name: 'Materials Logged',
          value: materials_logged.length > 0
            ? materials_logged.map(m => `${m.material_name} (${m.quantity_scu} SCU)`).join('\n')
            : '(None)',
          inline: false,
        },
      ],
      footer: {
        text: `Op ID: ${op_id}`,
      },
      timestamp: new Date().toISOString(),
    };

    return Response.json({
      debrief_text,
      discord_embed: discordEmbed,
      op_id,
    });
  } catch (error) {
    console.error('Op wrap-up error:', error);
    return Response.json({ error: error.message || 'Debrief generation failed' }, { status: 500 });
  }
});
