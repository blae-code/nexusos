/**
 * patchDigest — NexusOS patch intelligence function
 *
 * Called by rssCheck (via asServiceRole.functions.invoke) when a new
 * Comm-Link entry is detected. Also callable manually by admin.
 *
 * Input (POST body): { comm_link_url, raw_text, patch_version }
 *
 * Sends patch note text to Claude, extracts industry-relevant changes,
 * stores in patch_digests, and triggers Herald Bot post to #PTU-CHAT
 * and #INDUSTRY.
 *
 * This function is idempotent on comm_link_url — safe to retry.
 * Claude API usage is server-side only; no AI attribution in outputs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Max characters sent to LLM — keeps tokens reasonable for a big patch note
const LLM_TEXT_LIMIT = 15_000;
// Max characters stored in raw_text column — covers most Comm-Link pages
const STORAGE_TEXT_LIMIT = 30_000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Input validation ─────────────────────────────────────────────────────
    let body: { comm_link_url?: string; raw_text?: string; patch_version?: string | null };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { comm_link_url, raw_text, patch_version } = body;

    if (!comm_link_url || typeof comm_link_url !== 'string') {
      return Response.json({ error: 'comm_link_url is required' }, { status: 400 });
    }
    if (!raw_text || typeof raw_text !== 'string') {
      return Response.json({ error: 'raw_text is required' }, { status: 400 });
    }

    // ── Idempotency — skip if this URL was already processed ─────────────────
    // Protects against double-invocation if rssCheck fires concurrently or on retry.
    try {
      const existing = await base44.asServiceRole.entities.PatchDigest.filter({
        comm_link_url,
      });
      if (existing?.length > 0) {
        console.log(`[patchDigest] Already processed ${comm_link_url} — skipping`);
        return Response.json({
          success: true,
          patch_version: existing[0].patch_version,
          change_count: existing[0].changes_json?.length ?? 0,
          duplicate: true,
        });
      }
    } catch (e) {
      // Non-fatal — proceed even if dedup check fails
      console.warn('[patchDigest] Dedup check failed (proceeding):', e.message);
    }

    const now = new Date().toISOString();

    // Truncate for LLM — stay well within token budget
    const llmText = raw_text.length > LLM_TEXT_LIMIT
      ? raw_text.slice(0, LLM_TEXT_LIMIT) + '\n[...truncated for length]'
      : raw_text;

    // ── Claude extraction ─────────────────────────────────────────────────────
    // Model: claude_sonnet_4_6 per project spec.
    // Role framing avoids "AI assistant" language — outputs appear as system intel.
    // response_json_schema constrains the model to structured output.
    const digest = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are the Redscar Nomads operations intelligence system analysing a Star Citizen patch note.

Your task: extract every change that affects the org's industrial operations.

Relevant categories (only extract these):
- mining (ore types, deposit quality, scanner range, rock compositions)
- crafting (recipes, ingredient costs, craft times, workbench changes)
- salvage (hull scraping, component salvage, wreck spawns)
- materials (commodities, item properties, stack sizes)
- blueprints (new items, removed items, T1/T2 recipe changes)
- refinery (processing methods, yield rates, processing times, costs)
- ship_components (mining heads, salvage beams, cargo capacity, fuel)
- economy (station buy/sell prices, market events, trade route changes)
- station_events (Jumptown, Levski, Nine Tails events affecting trade)
- item_quality (T2 eligibility thresholds, quality-gate changes)
- commodity_prices (price floor/ceiling changes, supply/demand shifts)
- derelict_stations (Nuen Waste, Covalex, new derelict spawns, loot tables)

Exclude: flight model, joystick, UI layout, bug fixes unrelated to economy, combat balance (unless it changes loot/salvage yield), rendering, audio.

Patch note text:
${llmText}

Patch version hint: ${patch_version ?? 'unknown — extract from text if visible'}

industry_summary must be 2–3 plain sentences a game-session commander would read before deploying the org. Focus on what changed and what members should do differently today.
change_summary must be under 20 words per item.
affected_module must be one of: IndustryHub, ScoutIntel, FleetForge, OpBoard, ProfitCalc, EpicArchive, or "General".`,
      response_json_schema: {
        type: 'object',
        properties: {
          patch_version: { type: 'string' },
          industry_summary: { type: 'string' },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category:        { type: 'string' },
                change_summary:  { type: 'string' },
                severity:        { type: 'string', enum: ['MAJOR', 'MINOR', 'BUGFIX'] },
                affected_module: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // ── Resolve fields — guard against malformed LLM response ────────────────
    const effectivePatchVersion =
      patch_version?.trim() ||
      digest?.patch_version?.trim() ||
      'unknown';

    const changes: Array<{
      category: string;
      change_summary: string;
      severity: string;
      affected_module: string;
    }> = Array.isArray(digest?.changes) ? digest.changes : [];

    const industrySummary: string =
      typeof digest?.industry_summary === 'string' && digest.industry_summary.length > 0
        ? digest.industry_summary
        : 'No industry-relevant changes detected in this patch.';

    // ── Persist to patch_digests ─────────────────────────────────────────────
    await base44.asServiceRole.entities.PatchDigest.create({
      patch_version:    effectivePatchVersion,
      comm_link_url,
      raw_text:         raw_text.slice(0, STORAGE_TEXT_LIMIT),
      industry_summary: industrySummary,
      changes_json:     changes,   // JSON field — matches schema name
      published_at:     now,
      processed_at:     now,
    });

    // ── Herald Bot — non-fatal ────────────────────────────────────────────────
    // heraldBot.ts patchDigest action expects: { patch_version, industry_summary,
    // changes_json, comm_link_url } — field name must match what heraldBot reads.
    base44.asServiceRole.functions
      .invoke('heraldBot', {
        action: 'patchDigest',
        payload: {
          patch_version:    effectivePatchVersion,
          industry_summary: industrySummary,
          changes_json:     changes,
          comm_link_url,
        },
      })
      .catch((e: Error) =>
        console.warn('[patchDigest] heraldBot invocation failed:', e.message)
      );

    return Response.json({
      success:      true,
      patch_version: effectivePatchVersion,
      change_count: changes.length,
    });

  } catch (error) {
    console.error('[patchDigest] error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
