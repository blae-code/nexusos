/**
 * orgHealthAgent — NexusOS background agent
 *
 * Scheduled: daily at 08:00 UTC (midnight Pacific)
 * Performs a full org state analysis using Claude, then posts a daily
 * industry readiness briefing to the Discord #nexusos-log channel.
 *
 * Also performs housekeeping:
 * - Archives Material entries older than 30 days with 0 SCU
 * - Flags CraftQueue items OPEN for >7 days as stale (adds note)
 * - Cleans up COLLECTED RefineryOrders older than 14 days
 *
 * No user auth — service role background job.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now    = new Date();
    const nowIso = now.toISOString();

    console.log('[orgHealthAgent] Daily org health check starting...');

    // ── 1. Gather org state ───────────────────────────────────────────────────
    const [materials, blueprints, craftQueue, refineryOrders, scoutDeposits] = await Promise.all([
      base44.asServiceRole.entities.Material.list('-logged_at', 300),
      base44.asServiceRole.entities.Blueprint.list('item_name', 100),
      base44.asServiceRole.entities.CraftQueue.list('-created_date', 100),
      base44.asServiceRole.entities.RefineryOrder.list('-started_at', 100),
      base44.asServiceRole.entities.ScoutDeposit.list('-reported_at', 50),
    ]);

    // ── 2. Housekeeping ───────────────────────────────────────────────────────
    const housekeeping = { archived_materials: 0, flagged_queue: 0, cleaned_refinery: 0 };

    // Archive zero-SCU materials older than 30 days
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
    const zeroScuOld = (materials ?? []).filter(m =>
      !m.is_archived &&
      (m.quantity_scu ?? 0) <= 0 &&
      (m.logged_at ?? m.created_date ?? '') < thirtyDaysAgo
    );
    if (zeroScuOld.length > 0) {
      await Promise.allSettled(zeroScuOld.map(m =>
        base44.asServiceRole.entities.Material.update(m.id, { is_archived: true })
      ));
      housekeeping.archived_materials = zeroScuOld.length;
      console.log(`[orgHealthAgent] Archived ${zeroScuOld.length} zero-SCU materials`);
    }

    // Flag CraftQueue OPEN items stale after 7 days
    const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
    const staleQueue = (craftQueue ?? []).filter(c =>
      c.status === 'OPEN' &&
      (c.created_date ?? '') < sevenDaysAgo &&
      !c.notes?.includes('[STALE]')
    );
    if (staleQueue.length > 0) {
      await Promise.allSettled(staleQueue.map(c =>
        base44.asServiceRole.entities.CraftQueue.update(c.id, {
          notes: `[STALE] ${c.notes ?? ''}`.trim(),
        })
      ));
      housekeeping.flagged_queue = staleQueue.length;
      console.log(`[orgHealthAgent] Flagged ${staleQueue.length} stale queue items`);
    }

    // Clean up COLLECTED refinery orders older than 14 days
    const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
    const oldCollected = (refineryOrders ?? []).filter(r =>
      r.status === 'COLLECTED' &&
      (r.started_at ?? r.created_date ?? '') < fourteenDaysAgo
    );
    if (oldCollected.length > 0) {
      await Promise.allSettled(oldCollected.map(r =>
        base44.asServiceRole.entities.RefineryOrder.delete(r.id)
      ));
      housekeeping.cleaned_refinery = oldCollected.length;
      console.log(`[orgHealthAgent] Cleaned ${oldCollected.length} old refinery records`);
    }

    // ── 3. Build org state summary for Claude ─────────────────────────────────
    const activeMats = (materials ?? []).filter(m => !m.is_archived);
    const totalScu   = activeMats.reduce((s, m) => s + (m.quantity_scu ?? 0), 0);
    const avgQuality = activeMats.length
      ? activeMats.reduce((s, m) => s + (m.quality_pct ?? 0), 0) / activeMats.length
      : 0;
    const t2Mats     = activeMats.filter(m => (m.quality_pct ?? 0) >= 80);
    const openCraft  = (craftQueue ?? []).filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status));
    const activeRO   = (refineryOrders ?? []).filter(r => r.status === 'ACTIVE');
    const readyRO    = (refineryOrders ?? []).filter(r => r.status === 'READY');
    const freshDeps  = (scoutDeposits ?? []).filter(d => !d.is_stale);
    const priorityBPs = (blueprints ?? []).filter(b => b.is_priority);

    // Top 10 materials by SCU
    const topMats = [...activeMats]
      .sort((a, b) => (b.quantity_scu ?? 0) - (a.quantity_scu ?? 0))
      .slice(0, 10)
      .map(m => `${m.material_name} ${(m.quantity_scu ?? 0).toFixed(1)}SCU @${(m.quality_pct ?? 0).toFixed(0)}%`);

    const craftSummary = openCraft.slice(0, 8).map(c =>
      `${c.blueprint_name} ×${c.quantity ?? 1} [${c.status}]${c.priority_flag ? ' ★' : ''}`
    );

    const prompt = `You are the NexusOS autonomous ops intelligence agent for Redscar Nomads, a Star Citizen industrial org operating in the 4.7 crafting economy.

Generate a daily INDUSTRY READINESS BRIEFING. Tone: tactical, direct, mil-spec. Under 200 words total.

ORG STATE — ${now.toUTCString()}
Stockpile: ${totalScu.toFixed(1)} SCU across ${activeMats.length} entries | Avg quality: ${avgQuality.toFixed(0)}% | T2-eligible (80%+): ${t2Mats.length} entries
Top materials: ${topMats.join(', ')}
Craft queue: ${openCraft.length} active | ${craftSummary.join(', ')}
Refinery: ${activeRO.length} active orders | ${readyRO.length} READY to collect
Scout deposits: ${freshDeps.length} fresh | High-quality (80%+): ${freshDeps.filter(d => (d.quality_pct ?? 0) >= 80).length}
Priority blueprints: ${priorityBPs.map(b => b.item_name).join(', ') || 'none flagged'}
Housekeeping done: archived ${housekeeping.archived_materials} materials | flagged ${housekeeping.flagged_queue} stale queue items | cleaned ${housekeeping.cleaned_refinery} refinery records

Write exactly 3 sections using ## headers:
## READINESS STATUS — one sentence overall assessment
## PRIORITY ACTIONS — 2-3 specific actions the org should take today (be concrete: material names, quantities, blueprint names)
## ALERTS — any critical issues (empty = "None")

Do not mention AI. Do not use corporate language. Write as if this is a system status report from the ship's computer.`;

    let briefing = '';
    try {
      briefing = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt,
      });
      if (typeof briefing !== 'string') briefing = String(briefing?.text ?? briefing?.content ?? '');
    } catch (e) {
      console.warn('[orgHealthAgent] Claude briefing failed:', e.message);
      briefing = `## READINESS STATUS\nAutomated briefing unavailable — system intelligence offline.\n## PRIORITY ACTIONS\nManual review required.\n## ALERTS\norgHealthAgent Claude call failed: ${e.message}`;
    }

    console.log('[orgHealthAgent] Daily briefing complete.');
    return Response.json({
      success: true,
      generated_at: nowIso,
      housekeeping,
      briefing_length: briefing.length,
      briefing,
    });

  } catch (error) {
    console.error('[orgHealthAgent] unhandled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
