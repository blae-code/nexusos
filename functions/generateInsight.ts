import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Generates an org-state insight using Claude.
 * Reads current Materials, CraftQueue, RefineryOrders, and ScoutDeposits,
 * then returns a single actionable recommendation with up to 2 action labels.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [materials, craftQueue, refineryOrders, deposits] = await Promise.all([
      base44.asServiceRole.entities.Material.list('-logged_at', 50),
      base44.asServiceRole.entities.CraftQueue.filter({ status: 'OPEN' }, '-created_date', 20),
      base44.asServiceRole.entities.RefineryOrder.filter({ status: 'ACTIVE' }, '-started_at', 20),
      base44.asServiceRole.entities.ScoutDeposit.filter({ is_stale: false }, '-reported_at', 20),
    ]);

    const summary = {
      total_materials_scu: (materials || []).reduce((s, m) => s + (m.quantity_scu || 0), 0),
      avg_quality_pct: materials?.length ? Math.round(materials.reduce((s, m) => s + (m.quality_pct || 0), 0) / materials.length) : 0,
      t2_eligible_count: (materials || []).filter(m => m.t2_eligible).length,
      craft_queue_open: craftQueue?.length || 0,
      refinery_active: refineryOrders?.length || 0,
      top_deposits: (deposits || []).filter(d => (d.quality_pct || 0) >= 80).length,
    };

    const insight = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are an advisor for the Redscar Nomads, a Star Citizen industrial org.

Current org state snapshot:
${JSON.stringify(summary, null, 2)}

Based on this data, generate ONE concise operational insight and recommendation.
The insight should be actionable and specific to their current state.

Keep the title under 8 words. Keep detail under 25 words. Make it feel like a tactical briefing.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          action_1_label: { type: 'string' },
          action_2_label: { type: 'string' },
        },
      },
    });

    return Response.json({ insight });

  } catch (error) {
    console.error('generateInsight error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});