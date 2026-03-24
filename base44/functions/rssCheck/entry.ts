/**
 * rssCheck — NexusOS RSS polling job
 *
 * Scheduled by Base44 cron every 5 minutes.
 * Polls the RSI Comm-Link Atom feed via leonick.se, detects new patch notes,
 * invokes patchDigest for extraction, and marks ScoutDeposits stale on
 * version change (deposits need re-verification after every patch).
 *
 * No user auth required — background cron job.
 * All external fetches have AbortSignal timeouts.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RSS_URL        = 'https://leonick.se/feeds/rsi/atom';
const FETCH_TIMEOUT  = 10_000; // ms — generous for a background job

// ─── Atom XML parsing ─────────────────────────────────────────────────────────
// No DOM/DOMParser in Deno edge functions — parse with targeted regex.
// Atom spec: entries use <id>, <title>, <link href="...">, <updated>.

interface AtomEntry {
  id:    string | null;
  title: string | null;
  link:  string | null;
}

function parseFirstAtomEntry(xml: string): AtomEntry | null {
  // Grab the first <entry> block
  const blockMatch = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/);
  if (!blockMatch) return null;
  const block = blockMatch[1];

  // <id> — unique identifier (may be a tag URI or full URL)
  const id = block.match(/<id[^>]*>([^<]+)<\/id>/)?.[1]?.trim() ?? null;

  // <title> — may be plain text or wrapped in CDATA
  const titleRaw = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '';
  // Strip CDATA wrapper if present: <title><![CDATA[...]]></title>
  const title = titleRaw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .trim() || null;

  // <link href="..."> — Atom uses href attribute, NOT text content
  // Matches: <link rel="alternate" href="https://..."/> or <link href="..."/>
  const link = block.match(/<link[^>]*\shref="([^"]+)"/)?.[1]?.trim() ?? null;

  return { id, title, link };
}

// ─── URL normalisation for deduplication ─────────────────────────────────────
// Trailing slashes and minor variations shouldn't cause re-processing.
function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash from pathname, lowercase host
    u.pathname = u.pathname.replace(/\/$/, '');
    return u.origin + u.pathname;
  } catch {
    // If URL is malformed, strip trailing slash as best-effort
    return url.replace(/\/$/, '');
  }
}

// ─── HTML text extraction ─────────────────────────────────────────────────────
// Strips scripts, styles, tags, and decodes common HTML entities.
// RSI Comm-Link pages are server-rendered — fetch returns real content.
function extractTextFromHtml(html: string): string {
  return html
    // Remove <script> blocks entirely (can contain confusing text)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove <style> blocks
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#39;/g,   "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/&#x27;/g,  "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g,'…')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Patch note detection ─────────────────────────────────────────────────────
// A Comm-Link entry is a patch note if the title contains a version number
// AND contains a known patch-related keyword.
// This avoids triggering patchDigest on org-spotlight or fiction posts.
function isPatchNote(title: string): boolean {
  const hasVersion = /\d+\.\d+/.test(title);
  const hasKeyword = /\b(patch\s*note|hotfix|live|ptu|alpha|update\s*\d|maintenance)\b/i.test(title);
  return hasVersion && hasKeyword;
}

// Extract semantic version string from title: "4.7", "4.7.1", "4.7.0.1"
function extractVersion(title: string): string | null {
  const m = title.match(/(\d+\.\d+(?:\.\d+){0,2})/);
  return m ? m[1] : null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── 1. Fetch RSS feed ───────────────────────────────────────────────────
    let xmlText: string;
    try {
      const rssRes = await fetch(RSS_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: {
          'User-Agent': 'NexusOS/1.0 (Redscar Nomads; contact via robertsspaceindustries.com)',
          'Accept':     'application/atom+xml, application/xml, text/xml',
        },
      });
      if (!rssRes.ok) {
        console.warn(`[rssCheck] RSS feed returned ${rssRes.status}`);
        return Response.json(
          { success: false, error: `RSS feed returned HTTP ${rssRes.status}` },
          { status: 502 }
        );
      }
      xmlText = await rssRes.text();
    } catch (e) {
      // Network failure — leonick.se is a third-party service, may be temporarily down
      console.warn('[rssCheck] RSS fetch failed:', (e as Error).message);
      return Response.json(
        { success: false, error: 'RSS fetch failed — will retry on next cron tick' },
        { status: 502 }
      );
    }

    // ── 2. Parse latest entry ───────────────────────────────────────────────
    const entry = parseFirstAtomEntry(xmlText);
    if (!entry || !entry.link) {
      console.warn('[rssCheck] Could not parse any entry from feed');
      return Response.json({ success: true, new_content: false });
    }

    const entryLinkNorm = normaliseUrl(entry.link);

    // ── 3. Load most recent patch_digest for dedup + version comparison ─────
    let lastDigest: Record<string, unknown> | null = null;
    try {
      const recent = await base44.asServiceRole.entities.PatchDigest.list('-processed_at', 1);
      lastDigest = recent?.[0] ?? null;
    } catch (e) {
      // If the entity doesn't exist yet, treat as no prior record
      console.warn('[rssCheck] PatchDigest query failed (entity may not exist yet):', (e as Error).message);
    }

    const lastProcessedUrl = typeof lastDigest?.comm_link_url === 'string'
      ? normaliseUrl(lastDigest.comm_link_url)
      : null;
    const lastVersion = typeof lastDigest?.patch_version === 'string'
      ? lastDigest.patch_version
      : null;

    // ── 4. Deduplication — exit if we already processed this entry ──────────
    if (lastProcessedUrl && lastProcessedUrl === entryLinkNorm) {
      return Response.json({ success: true, new_content: false });
    }

    // ── 5a. Check if this is a patch note (vs general Comm-Link) ───────────
    const title        = entry.title ?? '';
    const patchVersion = extractVersion(title);

    if (!isPatchNote(title)) {
      // General Comm-Link news item — not a patch note, do not trigger patchDigest.
      // Log so we can trace in Base44 function logs.
      console.log(`[rssCheck] New Comm-Link detected but not a patch note: "${title}"`);
      return Response.json({
        success:        true,
        new_content:    true,
        is_patch_note:  false,
        title,
      });
    }

    // ── 5b. Fetch full Comm-Link page ───────────────────────────────────────
    // RSI Comm-Link pages are server-rendered — fetch returns real HTML content.
    // On failure, fall back to the entry title so patchDigest has something to work with.
    let rawText = title; // minimum viable fallback
    try {
      const pageRes = await fetch(entry.link, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: {
          'User-Agent': 'NexusOS/1.0 (Redscar Nomads; contact via robertsspaceindustries.com)',
          'Accept':     'text/html',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const extracted = extractTextFromHtml(html);
        // Only use extracted text if it has meaningful content
        if (extracted.length > title.length * 2) {
          rawText = extracted;
        }
      } else {
        console.warn(`[rssCheck] Comm-Link page returned ${pageRes.status} — using title as fallback`);
      }
    } catch (e) {
      console.warn('[rssCheck] Comm-Link page fetch failed:', (e as Error).message, '— using title as fallback');
    }

    // ── 5c. Invoke patchDigest ──────────────────────────────────────────────
    // Await so we know if it succeeded before proceeding to deposit stale update.
    // On failure, log and continue — deposits still need to be marked stale.
    let patchDigestOk = false;
    try {
      await base44.asServiceRole.functions.invoke('patchDigest', {
        comm_link_url: entry.link,
        raw_text:      rawText,
        patch_version: patchVersion,
      });
      patchDigestOk = true;
    } catch (e) {
      console.error('[rssCheck] patchDigest invocation failed:', (e as Error).message);
      // Continue — stale deposit update and Herald Bot are still correct actions
      // even if the Claude extraction failed (can be retriggered manually).
    }

    // ── 5d. Stale deposits on version change ────────────────────────────────
    // Any patch — even PTU — can change deposit compositions. Mark all active
    // deposits stale so members re-verify. Only triggers on version change
    // (not on patch note resubs of the same version, e.g. LIVE repost of PTU).
    const isNewVersion = patchVersion !== null && patchVersion !== lastVersion;

    if (isNewVersion) {
      let stalledCount = 0;
      try {
        // Explicit sort + high limit — matches SDK pattern and avoids silent truncation.
        // An org would never realistically have >500 active deposits in one session.
        const activeDeposits = await base44.asServiceRole.entities.ScoutDeposit.filter(
          { is_stale: false },
          '-reported_at',
          500
        );

        if (activeDeposits?.length > 0) {
          // Promise.allSettled — individual failures do not abort the batch
          const results = await Promise.allSettled(
            activeDeposits.map((d: Record<string, unknown>) =>
              base44.asServiceRole.entities.ScoutDeposit.update(
                d.id as string,
                { is_stale: true }
              )
            )
          );
          stalledCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.length - stalledCount;
          if (failCount > 0) {
            console.warn(`[rssCheck] ${failCount} deposit stale updates failed (${stalledCount} succeeded)`);
          }
          console.log(`[rssCheck] Marked ${stalledCount} deposits stale for patch ${patchVersion}`);
        }
      } catch (e) {
        console.warn('[rssCheck] Deposit stale batch failed:', (e as Error).message);
      }

    }

    return Response.json({
      success:          true,
      new_content:      true,
      is_patch_note:    true,
      patch_version:    patchVersion,
      patch_digest_ok:  patchDigestOk,
      version_changed:  isNewVersion,
    });

  } catch (error) {
    console.error('[rssCheck] unhandled error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
