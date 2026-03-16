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

    const { materials, blueprints, craftQueue } = await req.json();

    if (!materials || !blueprints || !craftQueue) {
      return Response.json(
        { error: 'Missing required parameters: materials, blueprints, craftQueue' },
        { status: 400 }
      );
    }

    // Prepare material availability summary
    const materialSummary = materials.map(m => ({
      name: m.material_name,
      quantity_scu: m.quantity_scu,
      quality_pct: m.quality_pct,
      t2_eligible: m.quality_pct >= 80,
    }));

    // Prepare blueprint summary
    const blueprintSummary = blueprints
      .filter(bp => bp.tier === 'T2' || bp.tier === 'T1')
      .map(bp => ({
        name: bp.item_name,
        tier: bp.tier,
        category: bp.category,
        recipe: (bp.recipe_materials || []).map(rm => ({
          material: rm.material,
          quantity_scu: rm.quantity_scu,
          min_quality: rm.min_quality,
        })),
      }));

    // Prepare pending requests
    const pendingRequests = craftQueue
      .filter(cq => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(cq.status))
      .map(cq => ({
        id: cq.id,
        blueprint: cq.blueprint_name,
        quantity: cq.quantity,
        priority: cq.priority_flag ? 'HIGH' : 'NORMAL',
        requested_by: cq.requested_by_callsign,
      }));

    // Build Claude prompt
    const prompt = `You are a crafting efficiency analyst for Redscar Nomads' industrial operations.

CURRENT MATERIAL STOCKPILE:
${JSON.stringify(materialSummary, null, 2)}

AVAILABLE BLUEPRINTS (T1 and T2 only):
${JSON.stringify(blueprintSummary, null, 2)}

PENDING CRAFT REQUESTS (in submission order):
${JSON.stringify(pendingRequests, null, 2)}

Analyze the current requests and available materials. Generate an optimized crafting sequence that:
1. Prioritizes HIGH priority requests
2. Maximizes use of high-quality materials (80%+ for T2 items if available)
3. Sequences items to minimize idle time and material waste
4. Flags any requests that CANNOT be fulfilled due to insufficient materials or missing blueprints
5. For each item, note if T2 quality threshold is met, material gaps, and estimated time impact

Return ONLY valid JSON (no markdown, no explanation):
{
  "optimized_sequence": [
    {
      "request_id": "string",
      "blueprint": "string",
      "quantity": number,
      "priority": "HIGH|NORMAL",
      "tier": "T1|T2",
      "materials_met": boolean,
      "missing_materials": [{ "name": "string", "needed_scu": number, "available_scu": number }],
      "quality_constraint": "NATIVE_T2|NATIVE_T1|NO_THRESHOLD|INSUFFICIENT_QUALITY",
      "reason": "brief tactical reason for this position"
    }
  ],
  "unfulfillable_requests": [
    {
      "request_id": "string",
      "blueprint": "string",
      "reason": "why this cannot be crafted"
    }
  ],
  "summary": "brief operational summary of the suggested sequence"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          optimized_sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                request_id: { type: 'string' },
                blueprint: { type: 'string' },
                quantity: { type: 'number' },
                priority: { type: 'string' },
                tier: { type: 'string' },
                materials_met: { type: 'boolean' },
                missing_materials: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      needed_scu: { type: 'number' },
                      available_scu: { type: 'number' },
                    },
                  },
                },
                quality_constraint: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          unfulfillable_requests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                request_id: { type: 'string' },
                blueprint: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error('Crafting optimiser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});