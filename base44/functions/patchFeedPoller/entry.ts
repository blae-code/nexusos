import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Background job: Poll RSI RSS feed, extract patches, process via Claude,
 * store patch digests for Industry Hub display.
 *
 * Trigger: Scheduled automation (hourly or custom interval)
 * Output: PatchDigest records stored, Herald Bot notified for major changes
 */

const RSS_FEED_URL = 'https://leonick.se/feeds/rsi/atom';

async function fetchAndParseRSS(url) {
  const response = await fetch(url);
  const text = await response.text();

  const entries = [];
  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryPattern.exec(text)) !== null) {
    const entryText = match[1];
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entryText);
    const linkMatch = /<link[^>]*href="([^"]+)"/.exec(entryText);
    const publishedMatch = /<published>([\s\S]*?)<\/published>/.exec(entryText);

    if (titleMatch && linkMatch) {
      entries.push({
        title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link: linkMatch[1],
        published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
      });
    }
  }

  return entries;
}

function extractPatchVersion(title) {
  const match = title.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

async function fetchPatchContent(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Extract text content, removing HTML tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, 4000); // Limit to first 4000 chars for Claude
  } catch (error) {
    console.error(`Failed to fetch patch content from ${url}:`, error.message);
    return '';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('[patchFeedPoller] Starting patch feed poll...');

    // Fetch RSS feed
    const entries = await fetchAndParseRSS(RSS_FEED_URL);
    console.log(`[patchFeedPoller] Found ${entries.length} RSS entries`);

    if (entries.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No entries in RSS feed' });
    }

    // Process most recent 3 patches
    const recentEntries = entries.slice(0, 3);
    const processed = [];
    const errors = [];

    for (const entry of recentEntries) {
      const patchVersion = extractPatchVersion(entry.title);
      if (!patchVersion) {
        console.log(`[patchFeedPoller] Skipping "${entry.title}" - no version found`);
        continue;
      }

      try {
        // Check if patch already exists
        const existing = await base44.asServiceRole.entities.PatchDigest.filter(
          { patch_version: patchVersion },
          '-published_at',
          1
        );

        if (existing && existing.length > 0) {
          console.log(`[patchFeedPoller] Patch ${patchVersion} already processed`);
          continue;
        }

        // Fetch patch content from Comm-Link
        const patchContent = await fetchPatchContent(entry.link);

        if (!patchContent) {
          console.log(`[patchFeedPoller] Could not fetch content for ${patchVersion}`);
          errors.push({ version: patchVersion, reason: 'failed_to_fetch_content' });
          continue;
        }

        // Call Claude to extract industrial changes
        const analysisPrompt = `You are a Star Citizen patch analyst for an industrial mining/crafting organization.
Extract ONLY changes relevant to: mining, crafting, salvage, materials, blueprints, refinery, ship components, economy, or Pyro/Nyx systems.

For each relevant change, provide:
- category: MINING | CRAFTING | SALVAGE | MATERIALS | BLUEPRINTS | REFINERY | ECONOMY | COMPONENTS | PYRO | NYX
- change_summary: 1 sentence impact statement
- severity: high | medium | low
- affected_systems: [list of systems affected]

Patch: ${patchVersion}

Content excerpt:
${patchContent}

Return valid JSON only. If no industry-relevant changes found, return: { "changes": [] }`;

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              changes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    change_summary: { type: 'string' },
                    severity: { type: 'string' },
                    affected_systems: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        });

        const changes = analysis?.changes || [];

        // Generate industry summary from first few changes
        const industrySummary =
          changes.length > 0
            ? changes
                .slice(0, 2)
                .map((c) => `${c.category}: ${c.change_summary}`)
                .join(' • ')
            : 'No industry-relevant changes detected.';

        // Store patch digest
        const digest = {
          patch_version: patchVersion,
          comm_link_url: entry.link,
          raw_text: patchContent,
          industry_summary: industrySummary,
          changes_json: changes,
          published_at: new Date(entry.published).toISOString(),
          processed_at: new Date().toISOString(),
        };

        await base44.asServiceRole.entities.PatchDigest.create(digest);
        console.log(`[patchFeedPoller] Stored patch ${patchVersion}`);
        processed.push(patchVersion);

        // If high-severity changes, trigger Herald Bot notification
        const hasHighSeverity = changes.some((c) => c.severity === 'high');
        if (hasHighSeverity) {
          try {
            await base44.asServiceRole.functions.invoke('heraldBot', {
              action: 'notify_patch_alert',
              payload: {
                patch_version: patchVersion,
                summary: industrySummary,
                changes: changes.filter((c) => String(c.severity).toLowerCase() === 'high'),
              },
            });
            console.log(`[patchFeedPoller] Herald Bot notified for ${patchVersion}`);
          } catch (e) {
            console.warn(`[patchFeedPoller] Herald Bot notification failed:`, e.message);
          }
        }
      } catch (error) {
        console.error(`[patchFeedPoller] Error processing ${patchVersion}:`, error.message);
        errors.push({ version: patchVersion, reason: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: processed.length,
      processed_versions: processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[patchFeedPoller] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
