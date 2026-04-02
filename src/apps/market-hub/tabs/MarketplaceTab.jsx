import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, ExternalLink, Flag } from 'lucide-react';
import { useSession } from '@/core/data/SessionContext';
import {
  deriveSyncState,
  formatCountdown,
  loadSyncRecords,
  MANUAL_SYNC_COOLDOWN_MS,
  timeSince,
} from '../syncMeta';

function fmt(value) {
  return value != null ? value.toLocaleString() : '—';
}

function buildSyncMessage(result) {
  if (!result) return '';
  if (result.status === 'completed') {
    return `Marketplace cache refreshed ${result.records_synced || 0} listings.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'cooldown' && result.cooldown_until) {
    return `Manual marketplace sync available in ${formatCountdown(result.cooldown_until)}.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'running') {
    return 'A marketplace sync is already running.';
  }
  return result.errors?.[0] || '';
}

export default function MarketplaceTab({ refreshKey = 0, onSynced }) {
  const { isAdmin } = useSession();
  const [listings, setListings] = useState([]);
  const [syncState, setSyncState] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [orgOnly, setOrgOnly] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listingRows, syncRows] = await Promise.all([
        base44.entities.UEXListing.filter({ is_active: true }, '-synced_at', 200),
        loadSyncRecords('MARKETPLACE_LISTINGS'),
      ]);
      setListings(listingRows || []);
      setSyncState(deriveSyncState(syncRows, { manualCooldownMs: MANUAL_SYNC_COOLDOWN_MS }));
    } catch {
      setListings([]);
      setSyncState({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('uexSyncMarketplace', {});
      const result = response?.data || response;
      setSyncMessage(buildSyncMessage(result));
      await load();
      if (result.status === 'completed') onSynced?.();
    } catch (error) {
      setSyncMessage(error?.message || 'Marketplace sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFlag = async (id) => {
    await base44.entities.UEXListing.update(id, { is_flagged: true });
    setListings((current) => current.map((listing) => (listing.id === id ? { ...listing, is_flagged: true } : listing)));
  };

  const filtered = useMemo(() => {
    let list = [...listings];
    if (typeFilter !== 'ALL') list = list.filter((listing) => listing.listing_type === typeFilter);
    if (orgOnly) list = list.filter((listing) => listing.is_org_member);
    if (flaggedOnly) list = list.filter((listing) => listing.is_flagged);
    if (sortBy === 'price_asc') list.sort((a, b) => (a.price_aUEC || 0) - (b.price_aUEC || 0));
    else if (sortBy === 'price_desc') list.sort((a, b) => (b.price_aUEC || 0) - (a.price_aUEC || 0));
    else if (sortBy === 'quality') list.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
    return list;
  }, [listings, typeFilter, orgOnly, flaggedOnly, sortBy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div>
      </div>
    );
  }

  const buttonLocked = syncing || syncState.running || syncState.isCoolingDown;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          UEX PLAYER MARKETPLACE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.08em' }}>
            Last sync: {timeSince(syncState.lastCompleted?.synced_at)}
          </span>
          <button
            onClick={handleSync}
            disabled={buttonLocked}
            style={{
              padding: '6px 14px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2,
              color: buttonLocked ? '#5A5850' : '#9A9488',
              cursor: buttonLocked ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={11} className={syncing || syncState.running ? 'animate-spin' : ''} />
            {syncing || syncState.running ? 'SYNCING...' : syncState.isCoolingDown ? 'COOLDOWN' : 'SYNC NOW'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, color: '#5A5850', fontSize: 10 }}>
        <span>Cache-first listings from Base44</span>
        {syncState.isCoolingDown && <span>Manual refresh available in {formatCountdown(syncState.cooldownUntil)}</span>}
      </div>

      {syncMessage && (
        <div style={{ marginBottom: 12, color: '#9A9488', fontSize: 10 }}>
          {syncMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', 'WTS', 'WTB'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            style={{
              padding: '5px 12px',
              background: typeFilter === type ? 'rgba(192,57,43,0.12)' : '#141410',
              border: `0.5px solid ${typeFilter === type ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
              borderRadius: 2,
              color: typeFilter === type ? '#E8E4DC' : '#5A5850',
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.12em',
            }}
          >
            {type}
          </button>
        ))}
        <button
          onClick={() => setOrgOnly(!orgOnly)}
          style={{
            padding: '5px 12px',
            background: orgOnly ? 'rgba(200,168,75,0.12)' : '#141410',
            border: `0.5px solid ${orgOnly ? '#C8A84B' : 'rgba(200,170,100,0.12)'}`,
            borderRadius: 2,
            color: orgOnly ? '#C8A84B' : '#5A5850',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          ORG MEMBERS
        </button>
        <button
          onClick={() => setFlaggedOnly(!flaggedOnly)}
          style={{
            padding: '5px 12px',
            background: flaggedOnly ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${flaggedOnly ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
            borderRadius: 2,
            color: flaggedOnly ? '#C0392B' : '#5A5850',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          FLAGGED
        </button>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '5px 10px',
            background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2,
            color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
          }}
        >
          <option value="newest">NEWEST</option>
          <option value="price_asc">PRICE ASC</option>
          <option value="price_desc">PRICE DESC</option>
          <option value="quality">QUALITY</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850' }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em' }}>
            NO MARKETPLACE LISTINGS IN CACHE
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map((listing) => {
            const isWts = listing.listing_type === 'WTS';
            const borderColor = listing.is_org_member ? 'rgba(200,168,75,0.35)' : (isWts ? '#C8A84B' : '#C0392B');
            return (
              <div
                key={listing.id}
                style={{
                  background: '#0F0F0D',
                  borderLeft: `2px solid ${borderColor}`,
                  borderTop: '0.5px solid rgba(200,170,100,0.10)',
                  borderRight: listing.is_org_member ? '0.5px solid rgba(200,168,75,0.25)' : '0.5px solid rgba(200,170,100,0.10)',
                  borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                  borderRadius: 2,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', background: isWts ? 'rgba(200,168,75,0.12)' : 'rgba(192,57,43,0.12)', color: isWts ? '#C8A84B' : '#C0392B' }}>
                    {listing.listing_type}
                  </span>
                  {listing.item_category && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{listing.item_category}</span>}
                  {listing.is_org_member && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', background: 'rgba(200,168,75,0.15)', color: '#C8A84B' }}>NOMAD</span>}
                  {listing.is_flagged && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(192,57,43,0.12)', color: '#C0392B' }}>FLAGGED</span>}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8E4DC', letterSpacing: '0.04em', marginBottom: 4 }}>{listing.item_name}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: isWts ? '#4A8C5C' : '#C8A84B', letterSpacing: '0.02em', marginBottom: 6 }}>
                  {fmt(listing.price_aUEC)} <span style={{ fontSize: 11, fontWeight: 400, color: '#5A5850' }}>aUEC</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
                  {listing.quantity > 1 && <span>Qty: {listing.quantity}</span>}
                  {listing.quality_score > 0 && <span>Quality: {listing.quality_score}</span>}
                  {listing.condition && <span>{listing.condition}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#5A5850', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>
                  {listing.seller_handle}{listing.seller_org ? ` [${listing.seller_org}]` : ''}
                </div>
                {listing.system_location && <div style={{ fontSize: 10, color: '#5A5850' }}>{listing.system_location}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {listing.listing_url && (
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 12px',
                        background: '#141410',
                        border: '0.5px solid rgba(200,170,100,0.12)',
                        borderRadius: 2,
                        color: '#9A9488',
                        fontSize: 10,
                        textDecoration: 'none',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ExternalLink size={10} /> VIEW ON UEX
                    </a>
                  )}
                  {isAdmin && !listing.is_flagged && (
                    <button
                      onClick={() => handleFlag(listing.id)}
                      style={{
                        padding: '5px 12px',
                        background: '#141410',
                        border: '0.5px solid rgba(200,170,100,0.12)',
                        borderRadius: 2,
                        color: '#C8A84B',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Flag size={10} /> FLAG
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
