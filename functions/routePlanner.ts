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

    const { target_material, quality_threshold, risk_tolerance, deposits } = await req.json();

    if (!target_material || !deposits || deposits.length === 0) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Filter deposits by material and quality
    const viable = deposits.filter(d =>
      d.material_name === target_material &&
      (d.quality_pct || 0) >= (quality_threshold || 0)
    );

    if (viable.length === 0) {
      return Response.json({
        route: [],
        estimated_yield_scu: 0,
        estimated_session_minutes: 0,
        message: 'No viable deposits found matching criteria',
      });
    }

    // Build context for Claude
    const deposit_summary = viable.map((d, i) => ({
      index: i,
      material: d.material_name,
      system: d.system_name,
      location: d.location_detail,
      quality: d.quality_pct,
      volume: d.volume_estimate,
      risk: d.risk_level,
      coords: d.coords_approx || 'TBD',
    }));

    const prompt = `You are a Star Citizen route planning AI for Redscar Nomads industrial ops.

Given these viable deposits for ${target_material}:
${JSON.stringify(deposit_summary, null, 2)}

Risk tolerance: ${risk_tolerance || 'MEDIUM'}

Generate the most efficient route (fewest jumps, fastest execution).
Consider:
- System jumps add ~3 minutes per jump
- Risk affects time (EXTREME +50%, HIGH +25%, MEDIUM +10%, LOW baseline)
- Volume estimates: SMALL=30min, MEDIUM=60min, LARGE=90min, MASSIVE=120min
- Quality >80% adds 10% bonus speed

Return ONLY valid JSON (no markdown, no explanation):
{
  "route": [
    {
      "waypoint": 1,
      "deposit_index": <index from above>,
      "system": "STANTON|PYRO|NYX",
      "location": "string",
      "quality_pct": number,
      "volume_estimate": "SMALL|MEDIUM|LARGE|MASSIVE",
      "risk_level": "LOW|MEDIUM|HIGH|EXTREME",
      "estimated_minutes": number
    }
  ],
  "estimated_yield_scu": number,
  "estimated_total_minutes": number,
  "efficiency_note": "brief tactical reason for this route"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          route: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                waypoint: { type: 'number' },
                deposit_index: { type: 'number' },
                system: { type: 'string' },
                location: { type: 'string' },
                quality_pct: { type: 'number' },
                volume_estimate: { type: 'string' },
                risk_level: { type: 'string' },
                estimated_minutes: { type: 'number' },
              },
            },
          },
          estimated_yield_scu: { type: 'number' },
          estimated_total_minutes: { type: 'number' },
          efficiency_note: { type: 'string' },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error('Route planner error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});