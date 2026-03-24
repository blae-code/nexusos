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

    const {
      material_name,
      raw_scu,
      refinery_method = 'CORMACK',
      material_quality = 75,
    } = await req.json();

    if (!material_name || !raw_scu || raw_scu <= 0) {
      return Response.json({ error: 'Invalid material or quantity' }, { status: 400 });
    }

    // Star Citizen 4.7 refinery methods — yield%, time multiplier, cost per SCU
    const METHOD_DATA: Record<string, { yield: number; timeMultiplier: number; costPerScu: number }> = {
      CORMACK:    { yield: 75, timeMultiplier: 1.0, costPerScu: 50  }, // Standard balanced
      DINYX:      { yield: 60, timeMultiplier: 0.7, costPerScu: 35  }, // Fastest, lower yield
      ELECTRODES: { yield: 88, timeMultiplier: 2.5, costPerScu: 80  }, // High yield, slow
      FERRON:     { yield: 92, timeMultiplier: 4.0, costPerScu: 150 }, // Maximum yield, slowest
      GCCS:       { yield: 80, timeMultiplier: 1.5, costPerScu: 65  }, // Gas & volatile compounds
      GRASE:      { yield: 82, timeMultiplier: 2.0, costPerScu: 70  }, // Greycat automated
      PYROMETRIC: { yield: 85, timeMultiplier: 3.0, costPerScu: 95  }, // Refractory ores
      THERMONITE: { yield: 90, timeMultiplier: 5.0, costPerScu: 180 }, // Extreme heat processing
      XCR:        { yield: 72, timeMultiplier: 1.2, costPerScu: 55  }, // Dense ore compression
    };

    const method = METHOD_DATA[refinery_method] ?? METHOD_DATA.CORMACK;
    const baseYield = method.yield;

    // Quality bonus (80%+ gets T2 bonus)
    const qualityBonus = material_quality >= 80 ? 1.10 : 1.0;

    // Calculate refined output
    const yieldPct = Math.round((baseYield * qualityBonus) * 100) / 100;
    const refinedScu = Math.round((raw_scu * (yieldPct / 100)) * 100) / 100;

    // Processing time and cost based on method table
    const baseMinutes = Math.ceil(raw_scu / 10) + 10;
    const processingMinutes = Math.ceil(baseMinutes * method.timeMultiplier);
    const costAUEC = Math.round(raw_scu * method.costPerScu);

    const METHOD_LABELS: Record<string, string> = {
      CORMACK: 'Cormack Method', DINYX: 'Dinyx Solventation', ELECTRODES: 'Electrodes',
      FERRON: 'Ferron Exchange', GCCS: 'GCCS', GRASE: 'GRASE',
      PYROMETRIC: 'Pyrometric', THERMONITE: 'Thermonite', XCR: 'XCR',
    };

    // Use Claude for market value analysis and profit projection
    const prompt = `You are a Star Citizen commodity market analyst for Redscar Nomads.

REFINERY OPERATION:
Material: ${material_name}
Input: ${raw_scu} SCU (${material_quality}% quality)
Method: ${METHOD_LABELS[refinery_method] ?? refinery_method} (${yieldPct}% effective yield)
Expected Output: ${refinedScu} SCU
Refining Cost: ${costAUEC} aUEC
Processing Time: ${processingMinutes} minutes

Based on current Star Citizen 4.7 economy data, estimate:
1. Market buy price for raw ${material_name}
2. Market sell price for refined ${material_name}
3. Total profit potential (sell value - input cost - refining cost)
4. ROI percentage

Generate output ONLY as valid JSON:
{
  "raw_market_price": number,
  "refined_market_price": number,
  "raw_input_cost": number,
  "refining_cost": number,
  "total_cost": number,
  "refined_sell_value": number,
  "gross_profit": number,
  "roi_percent": number,
  "market_note": "brief market context"
}`;

    const marketAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          raw_market_price: { type: 'number' },
          refined_market_price: { type: 'number' },
          raw_input_cost: { type: 'number' },
          refining_cost: { type: 'number' },
          total_cost: { type: 'number' },
          refined_sell_value: { type: 'number' },
          gross_profit: { type: 'number' },
          roi_percent: { type: 'number' },
          market_note: { type: 'string' },
        },
      },
    });

    return Response.json({
      material_name,
      raw_scu,
      refinery_method,
      material_quality,
      yield_pct: yieldPct,
      refined_scu: refinedScu,
      processing_minutes: processingMinutes,
      cost_aUEC: costAUEC,
      ...marketAnalysis,
      efficiency_score: yieldPct,
    });
  } catch (error) {
    console.error('Refinery efficiency calculator error:', error);
    return Response.json({ error: error.message || 'Calculation failed' }, { status: 500 });
  }
});