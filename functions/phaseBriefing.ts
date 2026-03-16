/**
 * phaseBriefing — Rockbreaker Phase Briefing (Claude #5)
 * Generates a tactical Discord-ready phase brief for Op Leaders.
 * Called from LiveOp "POST PHASE BRIEF" button.
 *
 * Input: { op_id, phase_name, phase_index, threat_notes, material_status, custom_notes }
 * Output: { success, brief_text, discord_posted }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      op_id,
      phase_name,
      phase_index = 0,
      threat_notes = '',
      material_status = '',
      custom_notes = '',
      post_to_discord = true,
    } = await req.json();

    if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

    // Gather op data
    const [ops, rsvps, materials] = await Promise.all([
      base44.asServiceRole.entities.Op.filter({ id: op_id }),
      base44.asServiceRole.entities.OpRsvp.filter({ op_id }),
      base44.asServiceRole.entities.Material.filter({ session_id: op_id }),
    ]);

    const op = ops?.[0];
    if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

    const confirmedCrew = (rsvps || []).filter(r => r.status === 'CONFIRMED');

    // Group crew by role
    const byRole = {};
    confirmedCrew.forEach(r => {
      const role = r.role || 'crew';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(r.callsign || r.discord_id);
    });
    const crewByRole = Object.entries(byRole)
      .map(([role, names]) => `${role.toUpperCase()}: ${names.join(', ')}`)
      .join('\n');

    // Material summary from session
    const matSummary = (materials || []).length > 0
      ? materials.map(m => `${m.material_name} ${m.quantity_scu}SCU@${m.quality_pct || 0}%`).join(', ')
      : material_status || 'Not yet logged';

    // Phases context
    const phases = op.phases || [];
    const completedPhases = phases.slice(0, phase_index).map(p => p.name || p).filter(Boolean);
    const remainingPhases = phases.slice(phase_index + 1).map(p => p.name || p).filter(Boolean);

    const prompt = `You are the operations debrief officer for Redscar Nomads, a Star Citizen industrial org. You are writing a PHASE BRIEF — a tactical status update for crew during an active op.

Format for Discord. Use this exact structure:
**PHASE ${phase_index + 1} — ${(phase_name || 'UNKNOWN').toUpperCase()}**
*Op: ${op.name} · ${op.system}${op.location ? ` · ${op.location}` : ''}*

**STATUS:** [1-2 sentences on current phase state and crew readiness]

**CREW ASSIGNMENTS:**
[list key assignments by role, keep tight]

**MATERIALS:** [brief yield status, highlight T2-quality if above 80%]

**THREATS:** [if any — else omit this section entirely]

**NEXT PHASE:** [what's coming next — if known]

**ALL CREWS:** [one punchy directive sentence]

Rules:
- Tone: tactical, Redscar-native, no corporate fluff
- Max 200 words total
- No markdown headers with ##, use **bold** only
- No emojis

DATA:
Op Type: ${op.type?.replace(/_/g, ' ')}
Current Phase: ${phase_name || 'Unknown'} (${phase_index + 1}/${phases.length || '?'})
Completed: ${completedPhases.join(', ') || 'None'}
Remaining: ${remainingPhases.join(', ') || 'Unknown'}
Crew (${confirmedCrew.length}):
${crewByRole || 'Crew not listed'}
Material Status: ${matSummary}
${threat_notes ? `Threats: ${threat_notes}` : ''}
${custom_notes ? `Notes: ${custom_notes}` : ''}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt,
    });

    const briefText = typeof result === 'string' ? result : (result?.text || result?.content || String(result));

    // Optionally post to Discord
    let discordPosted = false;
    if (post_to_discord) {
      try {
        await base44.asServiceRole.functions.invoke('heraldBot', {
          action: 'phaseAdvance',
          payload: {
            op_id,
            phase_name: phase_name || 'UNKNOWN',
            phase_index,
            brief_text: briefText,
          },
        });
        discordPosted = true;
      } catch (e) {
        console.warn('[phaseBriefing] Discord post failed:', e.message);
      }
    }

    // Log to op session_log
    const existingLog = op.session_log || [];
    const logEntry = {
      type: 'phase_brief',
      t: new Date().toISOString(),
      author: 'NEXUSOS',
      text: `Phase brief posted: ${phase_name || 'Phase ' + (phase_index + 1)}`,
      phase: phase_name,
      phase_index,
    };
    await base44.asServiceRole.entities.Op.update(op_id, {
      session_log: [...existingLog, logEntry],
      phase_current: phase_index,
    });

    return Response.json({ success: true, brief_text: briefText, discord_posted: discordPosted });

  } catch (error) {
    console.error('[phaseBriefing] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});