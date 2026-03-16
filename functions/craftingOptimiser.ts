import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * craftingOptimiser — NexusOS Crafting Optimiser
 *
 * Reads the current Material stockpile, Blueprint registry, and open CraftQueue requests.
 * Uses Claude to produce a prioritised production order based on material availability,
 * estimated aUEC value, and urgency (priority_flag, age of request).
 *
 * Returns: { recommended_order: [{ blueprint_id, blueprint_name, reason, materials_met,
 *   estimated_aUEC, priority, feasibility }] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Gather all inputs in parallel ──────────────────────────────────────────
    const [materials, blueprints, openQueue] = await Promise.all([
      base44.asServiceRole.entities.Material.list('-logged_at', 150),
      base44.asServiceRole.entities.Blueprint.list('-created_date', 100),
      base44.asServiceRole.entities.CraftQueue.filter(
        { status: 'OPEN' }, '-created_date', 50
      ),
    ]);

    if (!openQueue || openQueue.length === 0) {
      return Response.json({ recommended_order: [], message: 'No open craft requests.' });
    }

    // ── Compact material snapshot for Claude ───────────────────────────────────
    const matSnapshot = (materials || []).map(m => ({
      name:     m.material_name,
      type:     m.material_type,
      scu:      m.quantity_scu || 0,
      quality:  m.quality_pct || 0,
      t2_ready: (m.quality_pct || 0) >= 80,
    }));

    // ── Compact blueprint snapshot ─────────────────────────────────────────────
    const bpMap = {};
    (blueprints || []).forEach(bp => { bpMap[bp.id] = bp; });

    // ── Compact queue snapshot ─────────────────────────────────────────────────
    const queueSnapshot = (openQueue || []).map(item => {
      const bp = bpMap[item.blueprint_id] || {};
      const ageHours = item.created_date
        ? Math.round((Date.now() - new Date(item.created_date).getTime()) / 3600000)
        : 0;
      return {
        id:              item.id,
        blueprint_id:    item.blueprint_id,
        blueprint_name:  item.blueprint_name,
        quantity:        item.quantity || 1,
        priority_flag:   item.priority_flag || false,
        aUEC_value_est:  item.aUEC_value_est || null,
        requested_by:    item.requested_by_callsign || '—',
        age_hours:       ageHours,
        tier:            bp.tier || null,
        category:        bp.category || null,
        recipe_materials: bp.recipe_materials || [],
      };
    });

    // ── Claude prompt ──────────────────────────────────────────────────────────
    const prompt = `You are the production scheduler for the Redscar Nomads, a Star Citizen industrial org.

Your task: given the org's current material stockpile and open crafting requests, produce the optimal production order.

MATERIAL STOCKPILE (current):
${JSON.stringify(matSnapshot, null, 2)}

OPEN CRAFTING REQUESTS (${queueSnapshot.length} items):
${JSON.stringify(queueSnapshot, null, 2)}

RULES:
1. T2 crafting requires 80%+ quality materials. Check t2_ready flag.
2. priority_flag items MUST rank first unless completely infeasible.
3. Estimate material feasibility: does the stockpile have enough SCU of the right materials for the recipe? If recipe_materials is empty, assume feasible.
4. Older requests (high age_hours) get a mild urgency boost unless blocked by materials.
5. Higher aUEC_value_est items get preference when feasibility is equal.
6. Return ALL items from the open queue in your recommended order — no omissions.
7. feasibility: "READY" (materials available now), "PARTIAL" (some materials available), "BLOCKED" (key materials missing).
8. reason: 1 short sentence, tactical tone, no fluff.

Return a recommended_order array covering every item in the queue, sorted from highest to lowest priority.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          recommended_order: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                blueprint_id:    { type: 'string' },
                blueprint_name:  { type: 'string' },
                reason:          { type: 'string' },
                materials_met:   { type: 'boolean' },
                estimated_aUEC:  { type: 'number' },
                priority:        { type: 'string', enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] },
                feasibility:     { type: 'string', enum: ['READY', 'PARTIAL', 'BLOCKED'] },
              },
            },
          },
        },
      },
    });

    // Merge back the original queue IDs so the frontend can match rows
    const idByName = {};
    queueSnapshot.forEach(q => { idByName[q.blueprint_name] = q.id; });

    const enriched = (result.recommended_order || []).map((rec, idx) => ({
      ...rec,
      // Find the original queue item by blueprint_id or name fallback
      queue_id: queueSnapshot.find(q => q.blueprint_id === rec.blueprint_id)?.id
             || idByName[rec.blueprint_name]
             || null,
      rank: idx + 1,
    }));

    return Response.json({ recommended_order: enriched });

  } catch (error) {
    console.error('[craftingOptimiser] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});