import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, ExternalLink, Flag } from 'lucide-react';
import { useSession } from '@/core/data/SessionContext';
import moment from 'moment';

function fmt(v) { return v != null ? v.toLocaleString() : '—'; }

export default function MarketplaceTab({ lastSync, onSynced }) {
  const { isAdmin } = useSession();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [orgOnly, setOrgOnly] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    const l = await base44.entities.UEXListing.filter({ is_active: true }, '-synced_at', 200);
    setListings(l || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    await base44.functions.invoke('uexSyncMarketplace', {});
    await load();
    onSynced?.();
    setSyncing(false);
  };

  const handleFlag = async (id) => {
    await base44.entities.UEXListing.update(id, { is_flagged: true });
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_flagged: true } : l));
  };

  const filtered = useMemo(() => {
    let list = [...listings];
    if (typeFilter !== 'ALL') list = list.filter(l => l.listing_type === typeFilter);
    if (orgOnly) list = list.filter(l => l.is_org_member);
    if (flaggedOnly) list = list.filter(l => l.is_flagged);
    if (sortBy === 'price_asc') list.sort((a, b) => (a.price_aUEC || 0) - (b.price_aUEC || 0));
    else if (sortBy === 'price_desc') list.sort((a, b) => (b.price_aUEC || 0) - (a.price_aUEC || 0));
    else if (sortBy === 'quality') list.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
    return list;
  }, [listings, typeFilter, orgOnly, flaggedOnly, sortBy]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          UEX PLAYER MARKETPLACE
        </div>
        <button onClick={handleSync} disabled={syncing} style={{
          padding: '6px 14px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
          borderRadius: 2, color: syncing ? '#5A5850' : '#9A9488', cursor: syncing ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}><RefreshCw size={11} /> {syncing ? 'SYNCING...' : 'SYNC NOW'}</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', 'WTS', 'WTB'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '5px 12px', background: typeFilter === t ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${typeFilter === t ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
            borderRadius: 2, color: typeFilter === t ? '#E8E4DC' : '#5A5850', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.12em',
          }}>{t}</button>
        ))}
        <button onClick={() => setOrgOnly(!orgOnly)} style={{
          padding: '5px 12px', background: orgOnly ? 'rgba(200,168,75,0.12)' : '#141410',
          border: `0.5px solid ${orgOnly ? '#C8A84B' : 'rgba(200,170,100,0.12)'}`,
          borderRadius: 2, color: orgOnly ? '#C8A84B' : '#5A5850', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.12em',
        }}>ORG MEMBERS</button>
        <button onClick={() => setFlaggedOnly(!flaggedOnly)} style={{
          padding: '5px 12px', background: flaggedOnly ? 'rgba(192,57,43,0.12)' : '#141410',
          border: `0.5px solid ${flaggedOnly ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
          borderRadius: 2, color: flaggedOnly ? '#C0392B' : '#5A5850', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.12em',
        }}>FLAGGED</button>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          marginLeft: 'auto', padding: '5px 10px', background: '#141410',
          border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        }}>
          <option value="newest">NEWEST</option>
          <option value="price_asc">PRICE ASC</option>
          <option value="price_desc">PRICE DESC</option>
          <option value="quality">QUALITY</option>
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850' }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em' }}>
            NO MARKETPLACE LISTINGS — SYNC TO FETCH PLAYER ORDERS
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(l => {
            const isWTS = l.listing_type === 'WTS';
            const borderColor = l.is_org_member ? 'rgba(200,168,75,0.35)' : (isWTS ? '#C8A84B' : '#C0392B');
            return (
              <div key={l.id} style={{
                background: '#0F0F0D', borderLeft: `2px solid ${borderColor}`,
                borderTop: '0.5px solid rgba(200,170,100,0.10)',
                borderRight: l.is_org_member ? '0.5px solid rgba(200,168,75,0.25)' : '0.5px solid rgba(200,170,100,0.10)',
                borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2, padding: '14px 16px',
              }}>
                {/* Top badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', background: isWTS ? 'rgba(200,168,75,0.12)' : 'rgba(192,57,43,0.12)', color: isWTS ? '#C8A84B' : '#C0392B' }}>
                    {l.listing_type}
                  </span>
                  {l.item_category && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{l.item_category}</span>}
                  {l.is_org_member && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', background: 'rgba(200,168,75,0.15)', color: '#C8A84B' }}>NOMAD</span>}
                  {l.is_flagged && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(192,57,43,0.12)', color: '#C0392B' }}>FLAGGED</span>}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8E4DC', letterSpacing: '0.04em', marginBottom: 4 }}>{l.item_name}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: isWTS ? '#4A8C5C' : '#C8A84B', letterSpacing: '0.02em', marginBottom: 6 }}>
                  {fmt(l.price_aUEC)} <span style={{ fontSize: 11, fontWeight: 400, color: '#5A5850' }}>aUEC</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
                  {l.quantity > 1 && <span>Qty: {l.quantity}</span>}
                  {l.quality_score > 0 && <span>Quality: {l.quality_score}</span>}
                  {l.condition && <span>{l.condition}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#5A5850', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>
                  {l.seller_handle}{l.seller_org ? ` [${l.seller_org}]` : ''}
                </div>
                {l.system_location && <div style={{ fontSize: 10, color: '#5A5850' }}>{l.system_location}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {l.listing_url && (
                    <a href={l.listing_url} target="_blank" rel="noopener noreferrer" style={{
                      padding: '5px 12px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                      borderRadius: 2, color: '#9A9488', fontSize: 10, textDecoration: 'none',
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}><ExternalLink size={10} /> VIEW ON UEX</a>
                  )}
                  {isAdmin && !l.is_flagged && (
                    <button onClick={() => handleFlag(l.id)} style={{
                      padding: '5px 12px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                      borderRadius: 2, color: '#C8A84B', fontSize: 10, cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}><Flag size={10} /> FLAG</button>
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