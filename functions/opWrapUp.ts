import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Op Wrap-Up — Generates a tactical debrief report using Claude,
 * then posts to Discord #nexusos-ops and creates a discussion thread.
 *
 * Input: { op_id }
 * 
 * Fetches:
 * - Op record (session_log, crew count, duration, materials, splits)
 * - OpRsvp records (crew list, roles)
 * - Material records filtered to op's session_id
 * 
 * Calls Claude with debrief officer prompt, then:
 * - Stores markdown report in ops.wrap_up_report
 * - Invokes heraldBot to post embed + create thread
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { op_id } = await req.json();
    if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

    // Fetch op
    const ops = await base44.asServiceRole.entities.Op.filter({ id: op_id });
    const op = ops?.[0];
    if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

    // Fetch crew RSVPs
    const rsvps = await base44.asServiceRole.entities.OpRsvp.filter({ op_id: op_id, status: 'CONFIRMED' });

    // Fetch materials logged during this op
    const materials = await base44.asServiceRole.entities.Material.filter({
      session_id: op_id,
    });

    // Calculate metrics
    const duration = op.ended_at && op.started_at
      ? Math.floor((new Date(op.ended_at) - new Date(op.started_at)) / 60000) // minutes
      : 0;

    const totalMaterialScu = (materials || []).reduce((s, m) => s + (m.quantity_scu || 0), 0);
    const avgQuality = materials.length > 0
      ? (materials.reduce((s, m) => s + (m.quality_pct || 0), 0) / materials.length).toFixed(1)
      : 0;

    // Group materials by type
    const materialsByType = {};
    (materials || []).forEach(m => {
      const type = m.material_type || 'OTHER';
      if (!materialsByType[type]) materialsByType[type] = [];
      materialsByType[type].push(m);
    });

    // Build session summary for Claude
    const sessionSummary = `
**OPERATION:** ${op.name}
**TYPE:** ${op.type}
**SYSTEM:** ${op.system}
**LOCATION:** ${op.location || 'N/A'}
**DURATION:** ${duration} minutes
**CREW:** ${rsvps.length} members

**CREW BREAKDOWN:**
${(rsvps || []).map(r => `- ${r.callsign} (${r.role || 'unassigned'})${r.ship ? ` · ${r.ship}` : ''}`).join('\n')}

**MATERIAL HARVEST:**
Total: ${totalMaterialScu} SCU (avg quality: ${avgQuality}%)
${Object.entries(materialsByType).map(([type, mats]) => {
  const scu = mats.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  return `- ${type}: ${scu} SCU`;
}).join('\n')}

**SESSION LOG ENTRIES:**
${(op.session_log || []).map(entry => {
  const time = entry.t ? new Date(entry.t).toLocaleTimeString('en-US', { timeZone: 'UTC' }) : '??:??:??';
  if (entry.type === 'threat') {
    return `[${time}] THREAT: ${entry.text} (reported by ${entry.author})`;
  } else if (entry.type === 'phase') {
    return `[${time}] PHASE: ${entry.text}`;
  } else {
    return `[${time}] LOG: ${entry.text}`;
  }
}).join('\n')}
    `.trim();

    // Call Claude for debrief
    const debrief = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are a tactical debrief officer for the Star Citizen industrial org Redscar Nomads.
Generate a concise mission wrap-up report for this completed operation.

Tone: Professional, tactical, org-native. Not corporate or marketing speak.
Format: Markdown (no triple-backticks, no code blocks)
Length: 200-300 words max

Focus on:
1. Mission success/status
2. Key achievements (material yields, T2 quality metrics, crew performance)
3. Notable incidents or challenges
4. Logistics summary
5. Brief recommendations for next phase

SESSION DATA:
${sessionSummary}`,
      response_json_schema: {
        type: 'object',
        properties: {
          report: { type: 'string' },
        },
      },
    });

    const report = debrief?.report || 'Debrief report generation failed.';

    // Store report on op
    await base44.asServiceRole.entities.Op.update(op_id, {
      wrap_up_report: report,
    });

    // Post to Discord via Herald Bot (heraldBot handles thread creation + coffer posting)
    await base44.asServiceRole.functions.invoke('heraldBot', {
      action: 'opWrapUp',
      payload: { op_id: op_id },
    });

    return Response.json({
      success: true,
      op_id: op_id,
      report_length: report.length,
      crew_count: rsvps.length,
      materials_logged: materials.length,
    });
  } catch (error) {
    console.error('opWrapUp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});