import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    const body = await req.json();
    const {
      op_id,
      op_name,
      phase_name,
      phase_number,
      phase_index,
      total_phases,
      crew_list = [],
      materials_status = {},
      material_status,
      threats = [],
      threat_notes,
      objectives = [],
      next_phase = null,
      custom_notes = '',
      post_to_discord = false,
    } = body;

    let resolvedOpName = op_name;
    let resolvedTotalPhases = total_phases;

    if (op_id && (!resolvedOpName || !resolvedTotalPhases)) {
      try {
        const op = (await base44.asServiceRole.entities.Op.filter({ id: op_id }))?.[0];
        if (op) {
          resolvedOpName = resolvedOpName || op.name;
          resolvedTotalPhases = resolvedTotalPhases || (Array.isArray(op.phases) ? op.phases.length : undefined);
        }
      } catch (opLookupError) {
        console.warn('Phase briefing op lookup failed:', opLookupError?.message || opLookupError);
      }
    }

    const resolvedPhaseNumber = Number.isFinite(Number(phase_number))
      ? Number(phase_number)
      : Number.isFinite(Number(phase_index))
        ? Number(phase_index) + 1
        : 1;

    const resolvedTotalPhaseCount = Number.isFinite(Number(resolvedTotalPhases))
      ? Number(resolvedTotalPhases)
      : Math.max(resolvedPhaseNumber, 1);

    const normalizedMaterials = material_status
      ? { reported_status: material_status, ...(materials_status || {}) }
      : (materials_status || {});
    const normalizedThreats = Array.isArray(threats)
      ? [...threats, ...(threat_notes ? [threat_notes] : [])].filter(Boolean)
      : (threat_notes ? [threat_notes] : []);
    const normalizedObjectives = Array.isArray(objectives)
      ? [...objectives, ...(custom_notes ? [custom_notes] : [])].filter(Boolean)
      : (custom_notes ? [custom_notes] : []);

    if (!op_id || !resolvedOpName || !phase_name) {
      return Response.json({ error: 'Missing op or phase data' }, { status: 400 });
    }

    // Build tactical briefing prompt
    const crewSummary = crew_list
      .map(c => `${c.callsign} (${c.role})`)
      .join(', ') || 'Unspecified crew';

    const materialsSummary = Object.entries(normalizedMaterials)
      .map(([mat, status]) => `${mat}: ${status}`)
      .join(', ') || 'No material tracking';

    const threatSummary = normalizedThreats.length > 0
      ? normalizedThreats.map(t => `- ${t}`).join('\n')
      : 'No active threats';

    const objectivesList = normalizedObjectives.length > 0
      ? normalizedObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : 'No specific objectives logged';

    const prompt = `You are a Redscar Nomads tactical operations briefing officer. Generate a concise PHASE BRIEFING for:

OPERATION: ${resolvedOpName}
PHASE: ${resolvedPhaseNumber}/${resolvedTotalPhaseCount} — ${phase_name}
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
**PHASE ${resolvedPhaseNumber}/${resolvedTotalPhaseCount}: ${phase_name.toUpperCase()}**

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
        text: `Op: ${resolvedOpName} | Phase ${resolvedPhaseNumber}/${resolvedTotalPhaseCount}`,
      },
      timestamp: new Date().toISOString(),
    };

    const discordPosted = false;

    return Response.json({
      success: true,
      briefing: briefingMarkdown,
      brief_text: briefingMarkdown,
      embed: discordEmbed,
      discord_embed: discordEmbed,
      discord_posted: discordPosted,
      delivery_mode: post_to_discord === false ? 'NEXUS_ONLY' : 'NEXUS_ONLY_DISCORD_DEACTIVATED',
    });
  } catch (error) {
    console.error('Phase briefing error:', error);
    return Response.json({ error: error.message || 'Briefing generation failed' }, { status: 500 });
  }
});
