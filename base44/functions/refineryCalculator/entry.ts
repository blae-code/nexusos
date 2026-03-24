import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    const {
      material_name,
      quantity_scu,
      quality_pct,
      refinery_method,
      station,
      base_yield_pct = 75,
      station_bonus_pct = 0,
    } = await req.json();

    if (!material_name || !quantity_scu || !refinery_method || !station) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Build Claude prompt for yield calculation
    const prompt = `You are a Star Citizen refinery efficiency analyst for Redscar Nomads.

REFINERY BATCH ANALYSIS:
Material: ${material_name}
Input Quantity: ${quantity_scu} SCU
Quality: ${quality_pct}%
Refining Method: ${refinery_method}
Station: ${station}
Base Yield: ${base_yield_pct}%
Station Bonus: +${station_bonus_pct}%

Calculate the expected refinery output considering:
1. Base yield % for this method
2. Quality bonus (materials 80%+ get +5% yield, 90%+ get +10%)
3. Station location bonus
4. Estimated processing time based on batch size
5. Any method-specific constraints

Return ONLY valid JSON (no markdown):
{
  "method": "string",
  "input_scu": number,
  "input_quality": number,
  "estimated_output_scu": number,
  "yield_pct": number,
  "quality_retained_pct": number,
  "processing_minutes": number,
  "cost_aUEC": number,
  "notes": "brief technical notes about the refining process"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          input_scu: { type: 'number' },
          input_quality: { type: 'number' },
          estimated_output_scu: { type: 'number' },
          yield_pct: { type: 'number' },
          quality_retained_pct: { type: 'number' },
          processing_minutes: { type: 'number' },
          cost_aUEC: { type: 'number' },
          notes: { type: 'string' },
        },
      },
    });

    // Calculate completion time
    const completesAt = new Date(Date.now() + result.processing_minutes * 60000);

    return Response.json({
      ...result,
      cost_aUEC: Math.round(result.cost_aUEC),
      completes_at: completesAt.toISOString(),
      started_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Refinery calculator error:', error);
    return Response.json({ error: error.message || 'Yield calculation failed' }, { status: 500 });
  }
});
