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

    const { target_material, quality_threshold = 0, risk_tolerance = 'MEDIUM', deposits = [] } = await req.json();

    if (!target_material || deposits.length === 0) {
      return Response.json({ error: 'Missing target_material or deposits' }, { status: 400 });
    }

    // Filter by material and quality threshold, then by risk tolerance
    const viable = deposits.filter(d =>
      d.material_name === target_material &&
      (d.quality_pct || 0) >= quality_threshold
    );

    if (viable.length === 0) {
      return Response.json({
        route: [],
        deposit_ids: [],
        estimated_yield_scu: 0,
        estimated_total_minutes: 0,
        error: `No deposits found for ${target_material} above ${quality_threshold}% quality`,
      });
    }

    // Further filter by risk tolerance
    const riskTolerance = { LOW: 0, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
    const maxRisk = riskTolerance[risk_tolerance] || 2;
    const riskMap = { LOW: 0, MEDIUM: 1, HIGH: 2, EXTREME: 3 };

    const filtered = viable.filter(d => (riskMap[d.risk_level] || 1) <= maxRisk);

    if (filtered.length === 0) {
      return Response.json({
        route: [],
        deposit_ids: [],
        estimated_yield_scu: 0,
        estimated_total_minutes: 0,
        error: `No deposits found within ${risk_tolerance} risk tolerance`,
      });
    }

    // Build deposit summary for Claude analysis
    const depositSummary = filtered.map((d, i) => ({
      index: i,
      id: d.id,
      material: d.material_name,
      system: d.system_name,
      location: d.location_detail,
      quality: d.quality_pct,
      volume: d.volume_estimate,
      risk: d.risk_level,
      coords: d.coords_approx || 'TBD',
    }));

    const prompt = `You are a Star Citizen mining route optimization AI for Redscar Nomads.

TARGET: ${target_material} (${quality_threshold}%+ quality, ${risk_tolerance} risk tolerance)

VIABLE DEPOSITS:
${JSON.stringify(depositSummary, null, 2)}

Calculate the most efficient gathering route based on:
- Travel distance (system jumps add ~3 min each)
- Risk multiplier (LOW=1x, MEDIUM=1.1x, HIGH=1.25x, EXTREME=1.5x time)
- Volume (SMALL=20 SCU/30min, MEDIUM=50 SCU/60min, LARGE=100 SCU/90min, MASSIVE=180 SCU/120min)
- Quality bonus (>80% quality = +10% speed)

Output ONLY valid JSON:
{
  "deposit_sequence": [
    {
      "waypoint": 1,
      "deposit_id": "string",
      "system": "STANTON|PYRO|NYX",
      "location": "string",
      "quality_pct": number,
      "volume_estimate": "SMALL|MEDIUM|LARGE|MASSIVE",
      "risk_level": "LOW|MEDIUM|HIGH|EXTREME",
      "time_minutes": number,
      "yield_scu": number
    }
  ],
  "total_yield_scu": number,
  "total_session_minutes": number,
  "efficiency_score": 0.0,
  "route_summary": "brief tactical summary"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          deposit_sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                waypoint: { type: 'number' },
                deposit_id: { type: 'string' },
                system: { type: 'string' },
                location: { type: 'string' },
                quality_pct: { type: 'number' },
                volume_estimate: { type: 'string' },
                risk_level: { type: 'string' },
                time_minutes: { type: 'number' },
                yield_scu: { type: 'number' },
              },
            },
          },
          total_yield_scu: { type: 'number' },
          total_session_minutes: { type: 'number' },
          efficiency_score: { type: 'number' },
          route_summary: { type: 'string' },
        },
      },
    });

    // Add deposit IDs for easy reference
    if (result.deposit_sequence) {
      result.deposit_ids = result.deposit_sequence.map(item => item.deposit_id);
    }

    return Response.json(result);
  } catch (error) {
    console.error('Route planner error:', error);
    return Response.json({ error: error.message || 'Route planning failed' }, { status: 500 });
  }
});