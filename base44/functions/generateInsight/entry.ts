import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Generates an org-state insight using Claude.
 * Reads current Materials, CraftQueue, RefineryOrders, and ScoutDeposits,
 * then returns a single actionable recommendation with up to 2 action labels.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const context = textValue(body.context || 'org_readiness');
    const followUpPrompt = textValue(body.prompt);

    const responseJsonSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        detail: { type: 'string' },
        action_1_label: { type: 'string' },
        action_1_prompt: { type: 'string' },
        action_2_label: { type: 'string' },
        action_2_prompt: { type: 'string' },
      },
    } as const;

    if (context === 'scout_route') {
      const depositSnapshot = {
        deposit_id: textValue(body.deposit_id),
        material_name: textValue(body.material_name),
        system_name: textValue(body.system_name),
        location_detail: textValue(body.location_detail),
        quality_pct: numberValue(body.quality_pct, 0),
        risk_level: textValue(body.risk_level).toUpperCase() || 'MEDIUM',
      };

      if (!depositSnapshot.material_name || !depositSnapshot.system_name) {
        return Response.json({ error: 'Missing scout route context' }, { status: 400 });
      }

      const scoutRouteInsight = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a Redscar Nomads scout route planner.

TARGET DEPOSIT:
${JSON.stringify(depositSnapshot, null, 2)}

Generate one short tactical recommendation for how a scout or mining crew should approach this deposit.

Requirements:
- Keep the title under 8 words.
- Keep the detail under 30 words.
- Mention route, staging, or threat handling.
- Use a tactical system tone, not chatty assistant tone.
- Return follow-up prompts that expand on route and risk decisions.`,
        response_json_schema: responseJsonSchema,
      });

      return Response.json({ insight: scoutRouteInsight });
    }

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

    const genericPrompt = followUpPrompt
      ? `You are an advisor for the Redscar Nomads, a Star Citizen industrial org.

Current org state snapshot:
${JSON.stringify(summary, null, 2)}

Answer this follow-up tactical request using the org snapshot:
${followUpPrompt}

Return a single concise tactical insight. Keep the title under 8 words. Keep detail under 25 words.`
      : `You are an advisor for the Redscar Nomads, a Star Citizen industrial org.

Current org state snapshot:
${JSON.stringify(summary, null, 2)}

Based on this data, generate ONE concise operational insight and recommendation.
The insight should be actionable and specific to their current state.

Keep the title under 8 words. Keep detail under 25 words. Make it feel like a tactical briefing.

Return action_1_prompt and action_2_prompt as specific, detailed questions a user would ask to act on this insight — they will be sent directly to an assistant as follow-up queries.`;

    const insight = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: genericPrompt,
      response_json_schema: responseJsonSchema,
    });

    return Response.json({ insight });

  } catch (error) {
    console.error('generateInsight error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
