/**
 * uexSyncMarketplace — Sync UEX player marketplace listings.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const UEX_BASE = 'https://uexcorp.space/api/2.0';
const NO_STORE = { 'Cache-Control': 'no-store' };

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);

  try {
    const apiKey = Deno.env.get('UEX_API_KEY');
    if (!apiKey) return Response.json({ error: 'UEX_API_KEY not configured' }, { status: 500, headers: NO_STORE });

    const res = await fetch(`${UEX_BASE}/marketplace_listings`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      await base44.asServiceRole.entities.MarketSync.create({
        sync_type: 'MARKETPLACE_LISTINGS', status: 'FAILED',
        error_message: `UEX ${res.status}`, duration_ms: Date.now() - start,
        synced_at: new Date().toISOString(), triggered_by: 'MANUAL',
      });
      return Response.json({ error: 'UEX API error' }, { status: 502, headers: NO_STORE });
    }

    const data = await res.json();
    const listings = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    // Load org members for is_org_member detection
    const members = await base44.asServiceRole.entities.NexusUser.list('-created_date', 500);
    const memberHandles = new Set();
    const memberCallsigns = new Set();
    (members || []).forEach(m => {
      if (m.uex_handle) memberHandles.add(m.uex_handle.toLowerCase());
      if (m.callsign) memberCallsigns.add(m.callsign.toLowerCase());
    });

    // Load existing cached listings
    const existing = await base44.asServiceRole.entities.UEXListing.filter({ is_active: true });
    const existingMap = {};
    (existing || []).forEach(l => { if (l.uex_listing_id) existingMap[l.uex_listing_id] = l; });

    const now = new Date().toISOString();
    const seenIds = new Set();
    let created = 0;
    let updated = 0;
    let orgCount = 0;

    for (const l of listings) {
      const listingId = String(l.id_listing || l.id || '');
      if (!listingId) continue;
      seenIds.add(listingId);

      const sellerHandle = (l.seller_handle || l.username || '').trim();
      const isOrg = memberHandles.has(sellerHandle.toLowerCase()) || memberCallsigns.has(sellerHandle.toLowerCase());
      if (isOrg) orgCount++;

      const record = {
        uex_listing_id: listingId,
        listing_type: (l.listing_type || 'WTS').toUpperCase(),
        item_name: l.item_name || l.name || '',
        item_category: l.item_category || l.category || '',
        price_aUEC: l.price || l.price_aUEC || 0,
        quantity: l.quantity || 1,
        quality_score: l.quality || 0,
        condition: l.condition || '',
        seller_handle: sellerHandle,
        seller_org: l.seller_org || l.org_tag || '',
        system_location: l.system || l.system_location || '',
        description: l.description || '',
        listing_url: l.url || l.listing_url || `https://uexcorp.space/marketplace/${listingId}`,
        is_org_member: isOrg,
        is_active: true,
        synced_at: now,
        expires_at: l.expires_at || '',
      };

      const cached = existingMap[listingId];
      if (cached) {
        await base44.asServiceRole.entities.UEXListing.update(cached.id, record);
        updated++;
      } else {
        await base44.asServiceRole.entities.UEXListing.create(record);
        created++;
      }
    }

    // Deactivate removed listings
    let removed = 0;
    for (const [uexId, cached] of Object.entries(existingMap)) {
      if (!seenIds.has(uexId)) {
        await base44.asServiceRole.entities.UEXListing.update(cached.id, { is_active: false });
        removed++;
      }
    }

    await base44.asServiceRole.entities.MarketSync.create({
      sync_type: 'MARKETPLACE_LISTINGS', status: 'SUCCESS',
      records_synced: created + updated, duration_ms: Date.now() - start,
      synced_at: now, triggered_by: 'MANUAL',
    });

    return Response.json({ total: listings.length, org_member_listings: orgCount, new: created, updated, removed, duration_ms: Date.now() - start }, { headers: NO_STORE });
  } catch (error) {
    console.error('[uexSyncMarketplace]', error);
    return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
});