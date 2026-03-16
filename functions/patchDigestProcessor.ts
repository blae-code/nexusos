import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Patch Digest Processor — monitors RSI patch RSS feed for new patches
 * Extracts industry-relevant changes using Claude
 * Stores in PatchDigest table + posts to Discord via Herald Bot
 *
 * Scheduled to run every 2 hours
 * Safe to call multiple times — checks existing digests to avoid duplicates
 */

const RSS_FEED_URL = 'https://leonick.se/feeds/rsi/atom';
const INDUSTRY_CATEGORIES = ['mining', 'crafting', 'salvage', 'refinery', 'materials', 'blueprints', 'economy', 'components', 'pyro', 'nyx'];

interface PatchEntry {
  title: string;
  link: string;
  publishedDate: string;
}

interface Change {
  category: string;
  change_summary: string;
  severity: 'high' | 'medium' | 'low';
  affected_systems?: string[];
}

async function fetchRSSFeed(): Promise<PatchEntry[]> {
  const res = await fetch(RSS_FEED_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  // Simple XML parsing for patch entries
  const entries: PatchEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(entryXml);
    const linkMatch = /<link[^>]*href="([^"]+)"/.exec(entryXml);
    const publishedMatch = /<published>([\s\S]*?)<\/published>/.exec(entryXml);

    if (titleMatch && linkMatch && publishedMatch) {
      entries.push({
        title: titleMatch[1].trim(),
        link: linkMatch[1],
        publishedDate: publishedMatch[1],
      });
    }
  }

  return entries;
}

async function fetchPatchContent(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const html = await res.text();
    // Extract main content — look for paragraph tags or common content containers
    const contentMatch = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html) ||
                         /<article[^>]*>([\s\S]*?)<\/article>/.exec(html) ||
                         /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(html);
    if (contentMatch) {
      // Strip HTML tags
      return contentMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
    }
    return '';
  } catch (e) {
    console.warn('Patch content fetch failed:', (e as Error).message);
    return '';
  }
}

function extractPatchVersion(title: string): string | null {
  // Match patterns like "3.23.0", "4.7.1", etc.
  const match = /\b(\d+\.\d+(?:\.\d+)?)\b/.exec(title);
  return match ? match[1] : null;
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admin can trigger this manually; scheduled job runs as service role
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      isAuthorized = user?.role === 'admin';
    } catch {
      // Service role invocation — always authorized
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch RSS feed
    const entries = await fetchRSSFeed();
    if (entries.length === 0) {
      return Response.json({ success: true, message: 'No patch entries found in RSS feed', processed: 0 });
    }

    // Check for new patches
    const existingDigests = await base44.asServiceRole.entities.PatchDigest.list('-published_at', 50);
    const existingVersions = new Set((existingDigests || []).map((d: any) => d.patch_version));

    const newPatches = entries
      .map(entry => ({
        ...entry,
        version: extractPatchVersion(entry.title),
      }))
      .filter((p): p is PatchEntry & { version: string } => p.version !== null && !existingVersions.has(p.version));

    if (newPatches.length === 0) {
      return Response.json({ success: true, message: 'No new patches detected', processed: 0 });
    }

    const processed: any[] = [];

    for (const patch of newPatches.slice(0, 3)) { // Process max 3 new patches per run
      console.log(`Processing patch ${patch.version}...`);

      // Fetch patch content
      const rawText = await fetchPatchContent(patch.link);

      // Call Claude to extract industry changes
      const claudeResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a Star Citizen patch analyst for an industrial organization.
Analyze this Star Citizen patch note and extract all changes relevant to:
- Mining (prospecting, extraction, ore types)
- Crafting (fabrication, blueprints, recipes, materials)
- Salvage (salvaging mechanics, components)
- Refinery (refinement, yields, methods, processing)
- Materials (raw, refined, quality, properties)
- Blueprints (availability, requirements, tier system)
- Economy (pricing, markets, aUEC values)
- Ship Components (mining components, cargo, holds)
- Pyro and Nyx systems

For each change, classify by:
1. category (mining, crafting, salvage, refinery, materials, blueprints, economy, components, pyro, nyx)
2. change_summary (1-2 sentence plain description)
3. severity (high, medium, low)
4. affected_systems (list of systems affected)

Also provide a brief 2-3 sentence industry_summary highlighting the most impactful changes.

PATCH TITLE: ${patch.title}

PATCH CONTENT:
${rawText || '(Content could not be fetched)'}

Return as JSON with structure:
{
  "industry_summary": "string",
  "changes": [
    {
      "category": "string",
      "change_summary": "string",
      "severity": "high|medium|low",
      "affected_systems": ["string"]
    }
  ]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            industry_summary: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  change_summary: { type: 'string' },
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  affected_systems: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      });

      const summary = claudeResponse?.industry_summary || '';
      const changes = claudeResponse?.changes || [];

      // Store in PatchDigest
      const digest = await base44.asServiceRole.entities.PatchDigest.create({
        patch_version: patch.version,
        comm_link_url: patch.link,
        raw_text: rawText,
        industry_summary: summary,
        changes_json: changes,
        published_at: patch.publishedDate,
        processed_at: new Date().toISOString(),
      });

      processed.push(digest);

      // Post to Discord via Herald Bot
      await base44.asServiceRole.functions.invoke('heraldBot', {
        action: 'patchDigest',
        payload: {
          patch_version: patch.version,
          industry_summary: summary,
          changes_json: changes,
        },
      });

      console.log(`✓ Patch ${patch.version} processed and posted to Discord`);
    }

    return Response.json({
      success: true,
      processed: processed.length,
      digests: processed.map(d => ({
        patch_version: d.patch_version,
        changes_count: (d.changes_json as any[])?.length || 0,
      })),
    });
  } catch (error) {
    console.error('patchDigestProcessor error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});