import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Fetch RSS feed
    const feedUrl = 'https://leonick.se/feeds/rsi/atom';
    const feedResponse = await fetch(feedUrl);
    const feedText = await feedResponse.text();

    // Parse RSS entries (basic XML parsing)
    const entries = [];
    const entryMatches = feedText.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

    for (const match of entryMatches) {
      const entry = match[1];
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link[^>]*href="([^"]*)"[^>]*>/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);

      if (titleMatch) {
        entries.push({
          title: titleMatch[1].replace(/<[^>]*>/g, ''),
          url: linkMatch ? linkMatch[1] : '',
          published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
          content: contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '').substring(0, 5000) : '',
        });
      }
    }

    // Filter for patch notes (4.7)
    const patchEntries = entries.filter(e => 
      e.title.match(/patch|update/i) && 
      (e.title.match(/4\.7|PTU/) || e.content.match(/4\.7|PTU/))
    );

    if (patchEntries.length === 0) {
      return Response.json({ message: 'No new patches found' });
    }

    // Get the latest patch entry
    const latestPatch = patchEntries[0];

    // Extract version from title
    const versionMatch = latestPatch.title.match(/(\d+\.\d+\.\d+|\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : '4.7.0';

    // Check if we already processed this patch
    const existing = await base44.entities.PatchDigest.filter({ patch_version: version });
    if (existing && existing.length > 0) {
      return Response.json({ message: 'Patch already processed', version });
    }

    // Use Claude to analyze patch for industrial impact
    const analysisPrompt = `You are a Star Citizen patch analyst for Redscar Nomads, an industrial mining and crafting organization.

Analyze this patch note for INDUSTRIAL IMPACT ONLY. Focus exclusively on:
- Mining mechanics, yields, methods
- Crafting system, blueprints, fabricators
- Refinery processes, yields, methods
- Material quality and types
- Salvage operations
- Economy and pricing
- New components or items
- T2 quality requirements (80%+ threshold)
- Pyro and Nyx system changes
- Any profession-critical mechanics

PATCH TITLE: ${latestPatch.title}

PATCH CONTENT:
${latestPatch.content}

Generate output ONLY as valid JSON (no markdown, no explanation):
{
  "industry_summary": "2-3 sentence tactical summary of industrial impact",
  "affected_systems": ["system1", "system2"],
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "key_changes": [
    { "system": "mining", "change": "specific change description" }
  ]
}`;

    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          industry_summary: { type: 'string' },
          affected_systems: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string' },
          key_changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                system: { type: 'string' },
                change: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Store patch digest
    const digest = {
      patch_version: version,
      comm_link_url: latestPatch.url,
      raw_text: latestPatch.content,
      industry_summary: analysisResult.industry_summary || '',
      affected_systems: analysisResult.affected_systems || [],
      severity: analysisResult.severity || 'MEDIUM',
      key_changes: analysisResult.key_changes || [],
      published_at: latestPatch.published,
      processed_at: new Date().toISOString(),
    };

    await base44.entities.PatchDigest.create(digest);

    return Response.json({
      success: true,
      patch_version: version,
      summary: digest.industry_summary,
    });
  } catch (error) {
    console.error('Patch digest processor error:', error);
    return Response.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
});