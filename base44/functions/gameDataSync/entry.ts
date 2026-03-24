/**
 * gameDataSync — NexusOS background agent
 *
 * Scheduled: every 6 hours
 * Syncs ship (GameCacheVehicle) and item (GameCacheItem) data from UEX Corp API.
 * Focused on ships, weapons, armor, and components relevant to the 4.7 crafting loop.
 *
 * No user auth — service role background job.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const UEX_API_BASE  = 'https://uexcorp.space/api/2.0';
const FETCH_TIMEOUT = 20_000;

async function fetchUEX(path) {
  const res = await fetch(`${UEX_API_BASE}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    headers: { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' },
  });
  if (!res.ok) throw new Error(`UEX ${path} returned ${res.status}`);
  const json = await res.json();
  return json?.data ?? [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now    = new Date().toISOString();
    const results = { vehicles: { upserted: 0, skipped: 0 }, items: { upserted: 0, skipped: 0 } };

    // ── 1. Sync Vehicles (ships) ───────────────────────────────────────────────
    console.log('[gameDataSync] Fetching vehicles from UEX...');
    let vehicles = [];
    try {
      vehicles = await fetchUEX('/vehicles');
    } catch (e) {
      console.warn('[gameDataSync] Vehicle fetch failed:', e.message);
    }

    if (vehicles.length > 0) {
      const existing = await base44.asServiceRole.entities.GameCacheVehicle.list('name', 500);
      const byWikiId = {};
      for (const v of (existing ?? [])) { if (v.wiki_id) byWikiId[String(v.wiki_id)] = v; }

      const CHUNK = 10;
      for (let i = 0; i < vehicles.length; i += CHUNK) {
        const chunk = vehicles.slice(i, i + CHUNK);
        await Promise.allSettled(chunk.map(async (v) => {
          const wikiId = String(v.id ?? v.uuid ?? '');
          const name   = v.name ?? '';
          if (!wikiId || !name) { results.vehicles.skipped++; return; }

          const record = {
            wiki_id:          wikiId,
            name,
            manufacturer:     v.manufacturer_name ?? v.manufacturer ?? '',
            cargo_scu:        v.scu ?? v.cargo_capacity ?? 0,
            stats_json:       {
              crew_min:       v.crew_min ?? 0,
              crew_max:       v.crew_max ?? 0,
              mass:           v.mass ?? 0,
              speed_scm:      v.speed_scm ?? 0,
              speed_max:      v.speed_max ?? 0,
              shields:        v.shield_hp ?? 0,
              role:           v.role ?? '',
              size:           v.size ?? '',
              focus:          v.focus ?? '',
            },
            last_synced: now,
          };

          if (byWikiId[wikiId]) {
            await base44.asServiceRole.entities.GameCacheVehicle.update(byWikiId[wikiId].id, record);
          } else {
            await base44.asServiceRole.entities.GameCacheVehicle.create(record);
          }
          results.vehicles.upserted++;
        }));
      }
    }

    // ── 2. Sync Items (weapons, armor, components) ────────────────────────────
    console.log('[gameDataSync] Fetching items from UEX...');
    let items = [];
    try {
      // UEX items endpoint — filter to crafting-relevant categories
      items = await fetchUEX('/items');
    } catch (e) {
      console.warn('[gameDataSync] Item fetch failed:', e.message);
    }

    // Focus on crafting-relevant item types only
    const RELEVANT_TYPES = new Set([
      'weapon', 'armor', 'component', 'module', 'consumable',
      'fps_weapon', 'fps_armor', 'gadget', 'medical',
      'focusing_lens', 'ammo',
    ]);

    const relevantItems = items.filter(it => {
      const type = (it.type ?? it.item_type ?? '').toLowerCase();
      return RELEVANT_TYPES.has(type) || RELEVANT_TYPES.has(type.split('_')[0]);
    });

    if (relevantItems.length > 0) {
      const existing = await base44.asServiceRole.entities.GameCacheItem.list('name', 2000);
      const byWikiId = {};
      for (const it of (existing ?? [])) { if (it.wiki_id) byWikiId[String(it.wiki_id)] = it; }

      const CHUNK = 20;
      for (let i = 0; i < relevantItems.length; i += CHUNK) {
        const chunk = relevantItems.slice(i, i + CHUNK);
        await Promise.allSettled(chunk.map(async (it) => {
          const wikiId = String(it.id ?? it.uuid ?? '');
          const name   = it.name ?? '';
          if (!wikiId || !name) { results.items.skipped++; return; }

          const record = {
            wiki_id:     wikiId,
            name,
            type:        it.type ?? it.item_type ?? '',
            category:    it.sub_type ?? it.category ?? '',
            stats_json:  {
              size:        it.size ?? '',
              grade:       it.grade ?? '',
              class:       it.class ?? '',
              manufacturer: it.manufacturer_name ?? '',
              description: (it.description ?? '').slice(0, 300),
            },
            last_synced: now,
          };

          if (byWikiId[wikiId]) {
            await base44.asServiceRole.entities.GameCacheItem.update(byWikiId[wikiId].id, record);
          } else {
            await base44.asServiceRole.entities.GameCacheItem.create(record);
          }
          results.items.upserted++;
        }));
      }
    }

    console.log(`[gameDataSync] Done. vehicles=${JSON.stringify(results.vehicles)} items=${JSON.stringify(results.items)}`);
    return Response.json({ success: true, synced_at: now, results });

  } catch (error) {
    console.error('[gameDataSync] unhandled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});