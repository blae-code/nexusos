import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { op_id } = await req.json();
    if (!op_id) return Response.json({ error: 'op_id required' }, { status: 400 });

    // Gather all op data in parallel
    const [ops, rsvps, cofferEntries, materials] = await Promise.all([
      base44.asServiceRole.entities.Op.filter({ id: op_id }),
      base44.asServiceRole.entities.OpRsvp.filter({ op_id }),
      base44.asServiceRole.entities.CofferLog.filter({ op_id }),
      base44.asServiceRole.entities.Material.filter({ session_id: op_id }),
    ]);

    const op = ops?.[0];
    if (!op) return Response.json({ error: 'Op not found' }, { status: 404 });

    const durationMin = op.started_at && op.ended_at
      ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000)
      : null;

    const confirmedCrew = (rsvps || []).filter(r => r.status === 'CONFIRMED');
    const crewList = confirmedCrew.map(r => `${r.callsign} (${r.role || 'crew'})`).join('\n') || 'None recorded';

    const totalAuec = (cofferEntries || [])
      .filter(e => ['SALE', 'CRAFT_SALE', 'OP_SPLIT'].includes(e.entry_type))
      .reduce((s, e) => s + (e.amount_aUEC || 0), 0);

    const totalScu = (materials || []).reduce((s, m) => s + (m.quantity_scu || 0), 0);

    const sessionLog = (op.session_log || [])
      .slice(-30)
      .map(e => `[${e.t ? new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}] ${e.author}: ${e.text}`)
      .join('\n') || 'No entries';

    const matSummary = (materials || []).length > 0
      ? materials.map(m => `${m.material_name} ${m.quantity_scu}SCU @ ${m.quality_pct || 0}%`).join(', ')
      : 'None logged';

    const cofferSummary = (cofferEntries || []).length > 0
      ? cofferEntries.map(e => `${e.entry_type}: ${e.amount_aUEC?.toLocaleString()} aUEC${e.commodity ? ` (${e.commodity})` : ''}`).join('\n')
      : 'No coffer entries';

    const prompt = `You are the operations debrief officer for Redscar Nomads, a Star Citizen industrial org.

Write a tactical after-action debrief. Tone: concise, mil-spec, no corporate fluff. Under 280 words.

OP: ${op.name} | ${op.type?.replace(/_/g, ' ')} | ${op.system}${op.location ? ` · ${op.location}` : ''}
Duration: ${durationMin != null ? `${durationMin}m` : 'unknown'} | Phase: ${op.phase_current || 0}
Crew (${confirmedCrew.length}): ${crewList}
Materials: ${matSummary} | Total: ${totalScu.toFixed(1)} SCU
Coffer: ${cofferSummary} | Gross: ${totalAuec.toLocaleString()} aUEC
Session log:
${sessionLog}

Use ## sections: Overview, Crew Performance, Material Yield, Coffer Summary, Notes. Markdown format.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt,
    });

    const report = typeof result === 'string' ? result : (result?.text || result?.content || String(result));

    // Save report to op
    await base44.asServiceRole.entities.Op.update(op_id, { wrap_up_report: report });

    // Post to Discord via heraldBot
    await base44.asServiceRole.functions.invoke('heraldBot', {
      action: 'wrapUpDebrief',
      payload: {
        op_name: op.name,
        system: op.system,
        location: op.location,
        duration_min: durationMin,
        crew_count: confirmedCrew.length,
        total_auec: totalAuec,
        total_scu: totalScu,
        report: report.length > 1800 ? report.slice(0, 1797) + '...' : report,
      },
    });

    return Response.json({ success: true, report });

  } catch (error) {
    console.error('[opWrapUp] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});