import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Patch Intelligence Agent — autonomous background worker
 * Monitors RSI LIVE + PTU patch feeds continuously
 * Ingests, parses, and stores patch data for real-time app consumption
 * 
 * Runs continuously to ensure app data is always current
 * Designed to work discretely — minimal logging, maximum efficiency
 */

const FEED_URLS = {
  LIVE: 'https://leonick.se/feeds/rsi/atom',
  PTU: 'https://leonick.se/feeds/rsi-ptu/atom',
};

const INDUSTRY_KEYWORDS = [
  'mining', 'prospector', 'mole', 'ore', 'extraction',
  'craft', 'fabricator', 'blueprint', 'recipe', 'materials',
  'salvage', 'vulture', 'reclaimer', 'salvaging',
  'refin', 'yield', 'processing', 'smelting',
  't2', 'quality', 'tier', 'grade',
  'economy', 'aUEC', 'pricing', 'market',
  'component', 'hardpoint', 'upgrade',
  'pyro', 'nyx', 'stanton',
];

interface PatchFeed {
  version: string;
  title: string;
  link: string;
  publishedDate: string;
  branch: 'LIVE' | 'PTU';
  contentPreview: string;
}

async function fetchFeed(url: string, branch: 'LIVE' | 'PTU'): Promise<PatchFeed[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();

    const entries: PatchFeed[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(entryXml);
      const linkMatch = /<link[^>]*href="([^"]+)"/.exec(entryXml);
      const publishedMatch = /<published>([\s\S]*?)<\/published>/.exec(entryXml);
      const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(entryXml);

      if (titleMatch && linkMatch && publishedMatch) {
        const title = titleMatch[1].trim();
        const versionMatch = /\b(\d+\.\d+(?:\.\d+)?)\b/.exec(title);
        const version = versionMatch ? versionMatch[1] : null;

        if (version) {
          entries.push({
            version,
            title,
            link: linkMatch[1],
            publishedDate: publishedMatch[1],
            branch,
            contentPreview: summaryMatch ? summaryMatch[1].slice(0, 500) : '',
          });
        }
      }
    }

    return entries;
  } catch (e) {
    console.warn(`[Agent] Feed fetch failed (${branch}):`, (e as Error).message);
    return [];
  }
}

async function analyzeWithClaude(version: string, branch: string, title: string, contentPreview: string): Promise<any> {
  const client = createClientFromRequest(new Request('http://internal'));
  try {
    return await client.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `Analyze Star Citizen ${branch} patch ${version} for industrial gameplay impact.

PATCH TITLE: ${title}

SUMMARY: ${contentPreview}

Extract ONLY industry-relevant changes in JSON format:
{
  "highlights": ["brief bullet point", ...],
  "affected_systems": ["mining", "crafting", ...],
  "impact_level": "critical|high|medium|low",
  "action_required": boolean
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          highlights: { type: 'array', items: { type: 'string' } },
          affected_systems: { type: 'array', items: { type: 'string' } },
          impact_level: { type: 'string' },
          action_required: { type: 'boolean' },
        },
      },
    });
  } catch (e) {
    console.warn(`[Agent] Claude analysis failed:`, (e as Error).message);
    return { highlights: [], affected_systems: [], impact_level: 'unknown', action_required: false };
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Minimal auth check — agent can run with service role
    let isAgent = false;
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      isAgent = true; // Authenticated users can trigger
    } catch {
      // Service role — always allowed
      isAgent = true;
    }

    if (!isAgent) {
      return Response.json({ error: 'Not authorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch both feeds in parallel
    const [liveFeeds, ptuFeeds] = await Promise.all([
      fetchFeed(FEED_URLS.LIVE, 'LIVE'),
      fetchFeed(FEED_URLS.PTU, 'PTU'),
    ]);

    const allFeeds = [...liveFeeds, ...ptuFeeds];
    if (allFeeds.length === 0) {
      return Response.json({ success: true, message: 'No patches found', processed: 0, timestamp: new Date().toISOString() });
    }

    // Check existing to avoid duplicates
    const existing = await base44.asServiceRole.entities.PatchDigest.list('-published_at', 100);
    const existingKeys = new Set((existing || []).map((d: any) => `${d.patch_version}-${d.branch || 'LIVE'}`));

    // Filter new patches
    const newPatches = allFeeds.filter(p => !existingKeys.has(`${p.version}-${p.branch}`)).slice(0, 5);

    const processed: any[] = [];

    for (const patch of newPatches) {
      // Analyze with Claude
      const analysis = await analyzeWithClaude(patch.version, patch.branch, patch.title, patch.contentPreview);

      // Store in PatchDigest with branch metadata
      const digest = await base44.asServiceRole.entities.PatchDigest.create({
        patch_version: patch.version,
        branch: patch.branch,
        comm_link_url: patch.link,
        raw_text: patch.contentPreview,
        industry_summary: analysis.highlights?.join(' • ') || '',
        changes_json: analysis.highlights?.map((h: string) => ({
          category: 'general',
          change_summary: h,
          severity: analysis.impact_level === 'critical' ? 'high' : analysis.impact_level === 'high' ? 'high' : 'medium',
          affected_systems: analysis.affected_systems || [],
        })) || [],
        processed_at: new Date().toISOString(),
        published_at: patch.publishedDate,
      });

      processed.push({
        version: patch.version,
        branch: patch.branch,
        action_required: analysis.action_required,
      });

      // Post to Discord if critical or action required
      if (analysis.action_required || analysis.impact_level === 'critical') {
        await base44.asServiceRole.functions.invoke('heraldBot', {
          action: 'patchDigest',
          payload: {
            patch_version: patch.version,
            branch: patch.branch,
            industry_summary: analysis.highlights?.join('\n') || 'Patch processed',
            changes_json: analysis.highlights?.map((h: string) => ({
              category: 'critical',
              change_summary: h,
              severity: 'high',
              affected_systems: analysis.affected_systems || [],
            })) || [],
          },
        }).catch(e => console.warn('[Agent] Discord post failed:', (e as Error).message));
      }
    }

    return Response.json({
      success: true,
      processed: processed.length,
      patches: processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[patchIntelligenceAgent]', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});