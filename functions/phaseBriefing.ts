import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      op_id,
      op_name,
      phase_name,
      phase_number,
      total_phases,
      crew_list = [],
      materials_status = {},
      threats = [],
      objectives = [],
      next_phase = null,
    } = await req.json();

    if (!op_id || !op_name || !phase_name) {
      return Response.json({ error: 'Missing op or phase data' }, { status: 400 });
    }

    // Build tactical briefing prompt
    const crewSummary = crew_list
      .map(c => `${c.callsign} (${c.role})`)
      .join(', ') || 'Unspecified crew';

    const materialsSummary = Object.entries(materials_status)
      .map(([mat, status]) => `${mat}: ${status}`)
      .join(', ') || 'No material tracking';

    const threatSummary = threats.length > 0
      ? threats.map(t => `- ${t}`).join('\n')
      : 'No active threats';

    const objectivesList = objectives.length > 0
      ? objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : 'No specific objectives logged';

    const prompt = `You are a Redscar Nomads tactical operations briefing officer. Generate a concise PHASE BRIEFING for:

OPERATION: ${op_name}
PHASE: ${phase_number}/${total_phases} — ${phase_name}
NEXT PHASE: ${next_phase || 'N/A'}

CREW (${crew_list.length} members):
${crewSummary}

MATERIALS STATUS:
${materialsSummary}

ACTIVE THREATS:
${threatSummary}

CURRENT OBJECTIVES:
${objectivesList}

Generate output ONLY as valid JSON:
{
  "phase_status": "brief 1-sentence status of this phase",
  "crew_readiness": "assessment of crew capability for this phase",
  "material_readiness": "can we proceed with current materials?",
  "threat_advisory": "any active threats or concerns",
  "next_steps": "what happens next phase",
  "action_items": ["item1", "item2"]
}`;

    const briefingResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          phase_status: { type: 'string' },
          crew_readiness: { type: 'string' },
          material_readiness: { type: 'string' },
          threat_advisory: { type: 'string' },
          next_steps: { type: 'string' },
          action_items: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Format briefing markdown
    const briefingMarkdown = `
**PHASE ${phase_number}/${total_phases}: ${phase_name.toUpperCase()}**

${briefingResult.phase_status}

**CREW READINESS**
${briefingResult.crew_readiness}

**MATERIAL STATUS**
${briefingResult.material_readiness}

**THREAT ADVISORY**
${briefingResult.threat_advisory}

**NEXT STEPS**
${briefingResult.next_steps}

${briefingResult.action_items.length > 0 ? `**ACTION ITEMS**\n${briefingResult.action_items.map(a => `• ${a}`).join('\n')}` : ''}
`;

    // Format Discord embed
    const discordEmbed = {
      title: `📋 PHASE BRIEFING: ${phase_name.toUpperCase()}`,
      description: briefingResult.phase_status,
      color: 4149032, // Blue
      fields: [
        {
          name: 'Crew Readiness',
          value: briefingResult.crew_readiness,
          inline: false,
        },
        {
          name: 'Materials',
          value: briefingResult.material_readiness,
          inline: false,
        },
        {
          name: 'Threat Advisory',
          value: briefingResult.threat_advisory,
          inline: false,
        },
        {
          name: 'Next Steps',
          value: briefingResult.next_steps,
          inline: false,
        },
        ...(briefingResult.action_items.length > 0
          ? [{
              name: 'Action Items',
              value: briefingResult.action_items.map(a => `• ${a}`).join('\n'),
              inline: false,
            }]
          : []),
      ],
      footer: {
        text: `Op: ${op_name} | Phase ${phase_number}/${total_phases}`,
      },
      timestamp: new Date().toISOString(),
    };

    // Post to Discord via Herald Bot
    try {
      await base44.functions.invoke('heraldBot', {
        action: 'phaseBriefing',
        payload: {
          op_id,
          op_name,
          phase_name,
          briefing_text: briefingMarkdown,
          embed: discordEmbed,
        },
      });
    } catch (err) {
      console.warn('Herald Bot post failed:', err.message);
      // Don't fail the function, just warn
    }

    return Response.json({
      success: true,
      briefing: briefingMarkdown,
      embed: discordEmbed,
    });
  } catch (error) {
    console.error('Phase briefing error:', error);
    return Response.json({ error: error.message || 'Briefing generation failed' }, { status: 500 });
  }
});