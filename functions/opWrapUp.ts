import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * opWrapUp — NexusOS Op Debrief Generator
 *
 * Triggered when an op ends. Gathers session log, crew roster, materials logged
 * during the op, coffer entries, and duration. Uses Claude to generate a
 * tactical markdown debrief. Saves to ops.wrap_up_report and posts to Discord.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { op_id } = await req.json();
    if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

    // ── Gather all op data in parallel ────────────────────────────────────────
    const [ops, rsvps, cofferEntries, materials] = await Promise.all([
      base44.asServiceRole.entities.Op.filter({ id: op_id }),
      base44.asServiceRole.entities.OpRsvp.filter({ op_id }),
      base44.asServiceRole.entities.CofferLog.filter({ op_id }),
      base44.asServiceRole.entities.Material.filter({ session_id: op_id }),
    ]);

    const op = ops?.[0];
    if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

    // ── Compute summary stats ─────────────────────────────────────────────────
    const durationMin = op.started_at && op.ended_at
      ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000)
      : null;

    const confirmedCrew = (rsvps || []).filter(r => r.status === 'CONFIRMED');
    const crewList = confirmedCrew.map(r => `${r.callsign} (${r.role || 'crew'})`);

    const totalAuec = (cofferEntries || [])
      .filter(e => ['SALE', 'CRAFT_SALE', 'OP_SPLIT'].includes(e.entry_type))
      .reduce((s, e) => s + (e.amount_aUEC || 0), 0);

    const totalScu = (materials || []).reduce((s, m) => s + (m.quantity_scu || 0), 0);

    const sessionLog = (op.session_log || [])
      .slice(-30) // cap at last 30 entries to stay within token budget
      .map(e => `[${e.t ? new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}] ${e.author}: ${e.text}`)
      .join('\n');

    const matSummary = (materials || []).length > 0
      ? (materials || []).map(m => `${m.material_name} ${m.quantity_scu}SCU @ ${m.quality_pct || 0}%`).join(', ')
      : 'None logged';

    const cofferSummary = (cofferEntries || []).length > 0
      ? (cofferEntries || []).map(e => `${e.entry_type}: ${e.amount_aUEC?.toLocaleString()} aUEC${e.commodity ? ` (${e.commodity})` : ''}`).join('\n')
      : 'No coffer entries';

    // ── Claude debrief prompt ─────────────────────────────────────────────────
    const prompt = `You are the operations debrief officer for Redscar Nomads, a Star Citizen industrial org.

Write a tactical debrief for the following completed operation. Tone: concise, org-native, no corporate fluff. Think mil-spec after-action report, not a business summary.

OP DETAILS:
- Name: ${op.name}
- Type: ${op.type?.replace(/_/g, ' ')}
- System: ${op.system}${op.location ? ` · ${op.location}` : ''}
- Duration: ${durationMin != null ? `${durationMin} minutes` : 'unknown'}
- Phase reached: ${op.phase_current || 0} / ${(op.phases || []).length || '?'}

CREW (${confirmedCrew.length} confirmed):
${crewList.length > 0 ? crewList.join('\n') : 'None recorded'}

MATERIALS LOGGED:
${matSummary}
Total: ${totalScu.toFixed(1)} SCU

COFFER ENTRIES:
${cofferSummary}
Gross aUEC: ${totalAuec.toLocaleString()}

SESSION LOG (last 30 entries):
${sessionLog || 'No entries'}

Write the debrief in markdown. Use ## sections: Overview, Crew Performance, Material Yield, Coffer Summary, Notes. Keep it under 300 words. Be direct and tactical.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt,
    });

    const report = typeof result === 'string' ? result : (result?.text || result?.content || JSON.stringify(result));

    // ── Save report to op record ──────────────────────────────────────────────
    await base44.asServiceRole.entities.Op.update(op_id, {
      wrap_up_report: report,
    });

    // ── Post to Discord via heraldBot ─────────────────────────────────────────
    // Truncate for Discord embed (max 4096 chars)
    const discordReport = report.length > 1800 ? report.slice(0, 1797) + '...' : report;

    await base44.asServiceRole.functions.invoke('heraldBot', {
      action: 'wrapUpDebrief',
      payload: {
        op_id,
        op_name: op.name,
        op_type: op.type,
        system: op.system,
        location: op.location,
        duration_min: durationMin,
        crew_count: confirmedCrew.length,
        total_auec: totalAuec,
        total_scu: totalScu,
        report: discordReport,
      },
    });

    return Response.json({ success: true, report });

  } catch (error) {
    console.error('[opWrapUp] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});