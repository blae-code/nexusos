import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { resolveIssuedKeySession } from '../auth/_shared/issuedKey/entry.ts';

type ScoutDepositSummary = {
  material?: string;
  system?: string;
  location?: string;
  quality?: number;
  volume?: string;
  risk?: string;
  reporter?: string;
};

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return fallback;
}

function sanitizeDeposits(value: unknown): ScoutDepositSummary[] {
  return (Array.isArray(value) ? value : [])
    .map((deposit) => ({
      material: textValue(deposit?.material),
      system: textValue(deposit?.system),
      location: textValue(deposit?.location),
      quality: numberValue(deposit?.quality, 0),
      volume: textValue(deposit?.volume),
      risk: textValue(deposit?.risk).toUpperCase(),
      reporter: textValue(deposit?.reporter),
    }))
    .filter((deposit) => deposit.material && deposit.system && deposit.location)
    .slice(0, 12);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const session = await resolveIssuedKeySession(req);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const deposits = sanitizeDeposits(body.deposits);
    const shipClass = textValue(body.ship_class || body.shipClass).toUpperCase() || 'MINER';
    const maxRisk = textValue(body.max_risk || body.maxRisk).toUpperCase() || 'MEDIUM';
    const includeRefueling = booleanValue(body.include_refueling ?? body.includeRefueling, true);
    const minimumQuality = numberValue(body.minimum_quality ?? body.minimumQuality, 0);

    if (deposits.length < 2) {
      return Response.json({ error: 'At least 2 eligible deposits required' }, { status: 400 });
    }

    const prompt = `You are a Star Citizen mining route optimizer for Redscar Nomads.

Given these filtered scouted deposits, calculate the most efficient route to visit as many high-value deposits as possible.

DEPOSITS:
${JSON.stringify(deposits, null, 2)}

PARAMETERS:
- Ship class: ${shipClass}
- Max acceptable risk: ${maxRisk}
- Include refueling stops: ${includeRefueling ? 'Yes' : 'No'}
- Minimum quality threshold: ${minimumQuality}%

INSTRUCTIONS:
1. Order the deposits into an optimal visiting sequence.
2. Prioritize higher quality deposits while clustering same-system stops.
3. Prefer lower-risk deposits first when quality is similar.
4. ${includeRefueling ? 'Insert refueling stops between risky system jumps or after every 3 deposit stops.' : 'Do not insert refueling stops.'}
5. Estimate travel time between waypoints in minutes.
6. Provide overall route safety, estimated session time, and expected yield.

Return ONLY valid JSON with the exact schema provided.`;

    const route = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          route_name: { type: 'string' },
          waypoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                order: { type: 'integer' },
                type: { type: 'string' },
                name: { type: 'string' },
                system: { type: 'string' },
                location: { type: 'string' },
                material: { type: 'string' },
                quality_pct: { type: 'number' },
                risk_level: { type: 'string' },
                travel_minutes: { type: 'integer' },
                notes: { type: 'string' },
              },
            },
          },
          total_session_minutes: { type: 'integer' },
          total_estimated_yield_scu: { type: 'number' },
          safety_rating: { type: 'string' },
          safety_notes: { type: 'string' },
          route_summary: { type: 'string' },
        },
      },
    });

    return Response.json(route);
  } catch (error) {
    console.error('[scoutRouteOptimizer]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Route optimization failed' }, { status: 500 });
  }
});
