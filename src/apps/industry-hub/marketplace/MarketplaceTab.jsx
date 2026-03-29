/**
 * MarketplaceTab — Industrial Materials Marketplace.
 * Structured buy/sell board for materials, refined goods, and crafted items.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { useSession } from '@/core/data/SessionContext';
import { Plus, X } from 'lucide-react';
import MarketplaceFilters from './MarketplaceFilters';
import ListingCard from './ListingCard';
import NewListingForm from './NewListingForm';
import MarketplaceStats from './MarketplaceStats';

export default function MarketplaceTab({ materials, blueprints, craftQueue }) {
  const { user } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const userId = user?.id || '';

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    type: 'ALL',         // ALL | SELL | BUY
    materialType: 'ALL', // ALL | CMR | CMP | ...
    minQuality: 0,
    search: '',
    showMine: false,
  });

  const load = useCallback(async () => {
    const data = await base44.entities.MaterialListing.list('-created_date', 200).catch(() => []);
    setListings(data || []);
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);

  useEffect(() => {
    const unsub = base44.entities.MaterialListing.subscribe(scheduleRefresh);
    return () => unsub();
  }, [scheduleRefresh]);

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (filters.type !== 'ALL' && l.listing_type !== filters.type) return false;
      if (filters.materialType !== 'ALL' && l.material_type !== filters.materialType) return false;
      if (filters.minQuality > 0 && (l.quality_score || 0) < filters.minQuality) return false;
      if (filters.showMine && l.poster_id !== userId) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!(l.material_name || '').toLowerCase().includes(s) &&
            !(l.notes || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [listings, filters, userId]);

  const openListings = filtered.filter(l => l.status === 'OPEN');
  const myListings = listings.filter(l => l.poster_id === userId);
  const sellListings = openListings.filter(l => l.listing_type === 'SELL');
  const buyListings = openListings.filter(l => l.listing_type === 'BUY');

  // Craft queue demand matching
  const demandMaterials = useMemo(() => {
    if (!craftQueue?.length || !blueprints?.length) return [];
    const needed = new Map();
    craftQueue.filter(q => q.status === 'OPEN' || q.status === 'CLAIMED').forEach(q => {
      const bp = blueprints.find(b => b.id === q.blueprint_id);
      if (!bp?.recipe_materials) return;
      bp.recipe_materials.forEach(rm => {
        const key = rm.material_name || rm.material;
        needed.set(key, (needed.get(key) || 0) + (rm.quantity_scu || 0) * (q.quantity || 1));
      });
    });
    return [...needed.entries()].map(([name, qty]) => ({ name, qty }));
  }, [craftQueue, blueprints]);

  const handleCreate = async (form) => {
    await base44.entities.MaterialListing.create({
      ...form,
      poster_callsign: callsign,
      poster_id: userId,
      status: 'OPEN',
    });
    setShowForm(false);
    await refreshNow();
  };

  const handleAccept = async (listing) => {
    await base44.entities.MaterialListing.update(listing.id, {
      status: 'RESERVED',
      accepted_by_callsign: callsign,
      accepted_by_id: userId,
    });
    await refreshNow();
  };

  const handleComplete = async (listing) => {
    await base44.entities.MaterialListing.update(listing.id, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    });
    await refreshNow();
  };

  const handleCancel = async (listing) => {
    await base44.entities.MaterialListing.update(listing.id, {
      status: 'CANCELLED',
    });
    await refreshNow();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.06em' }}>
            MATERIAL MARKETPLACE
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#9A9488', marginTop: 2 }}>
            Buy & sell materials, refined goods, and crafted items within the org
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: showForm ? 'rgba(192,57,43,0.10)' : '#C0392B',
          border: showForm ? '0.5px solid rgba(192,57,43,0.3)' : 'none',
          borderRadius: 2, padding: '8px 16px',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: showForm ? '#C0392B' : '#F0EDE5', fontWeight: 600,
          cursor: 'pointer', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 150ms',
        }}>
          {showForm ? <><X size={12} /> CANCEL</> : <><Plus size={12} /> NEW LISTING</>}
        </button>
      </div>

      {/* Stats */}
      <MarketplaceStats
        sellCount={sellListings.length}
        buyCount={buyListings.length}
        myActive={myListings.filter(l => l.status === 'OPEN' || l.status === 'RESERVED').length}
        demandMaterials={demandMaterials}
      />

      {/* New listing form */}
      {showForm && (
        <NewListingForm
          materials={materials}
          blueprints={blueprints}
          demandMaterials={demandMaterials}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <MarketplaceFilters filters={filters} onChange={setFilters} />

      {/* Listings */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {openListings.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
          }}>
            NO LISTINGS MATCH YOUR FILTERS
          </div>
        ) : (
          openListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isOwn={listing.poster_id === userId}
              demandMaterials={demandMaterials}
              onAccept={() => handleAccept(listing)}
              onComplete={() => handleComplete(listing)}
              onCancel={() => handleCancel(listing)}
            />
          ))
        )}
      </div>

      {/* My listings section */}
      {myListings.filter(l => l.status !== 'OPEN').length > 0 && (
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
            paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.06)',
          }}>MY LISTING HISTORY</div>
          <div style={{
            background: '#0F0F0D',
            border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            {myListings.filter(l => l.status !== 'OPEN').map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isOwn={true}
                demandMaterials={demandMaterials}
                onAccept={() => {}}
                onComplete={() => handleComplete(listing)}
                onCancel={() => handleCancel(listing)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
