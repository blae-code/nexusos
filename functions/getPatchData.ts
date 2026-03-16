import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Get Patch Data — real-time API for frontend consumption
 * Returns latest patches for LIVE and PTU branches
 * Used by Industry Hub and other dashboards for live data
 */

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const branch = url.searchParams.get('branch') || 'LIVE'; // LIVE or PTU
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);

    // Fetch latest patches for the branch
    const patches = await base44.asServiceRole.entities.PatchDigest.filter({
      branch: branch.toUpperCase(),
    });

    const sorted = (patches || [])
      .sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, limit)
      .map((p: any) => ({
        version: p.patch_version,
        branch: p.branch,
        publishedAt: p.published_at,
        processedAt: p.processed_at,
        summary: p.industry_summary,
        highlights: (p.changes_json as any[])?.slice(0, 5).map(c => c.change_summary) || [],
        affectedSystems: [...new Set((p.changes_json as any[])?.flatMap(c => c.affected_systems || []))],
        url: p.comm_link_url,
      }));

    return Response.json({
      success: true,
      branch,
      count: sorted.length,
      patches: sorted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[getPatchData]', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});