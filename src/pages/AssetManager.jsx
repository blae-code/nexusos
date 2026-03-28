import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';
import AssetKpiBar from '@/components/assets/AssetKpiBar';
import AssetCard from '@/components/assets/AssetCard';
import AssetFilters from '@/components/assets/AssetFilters';
import AssetRegisterForm from '@/components/assets/AssetRegisterForm';

export default function AssetManager() {
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [assetList, memberList, shipList] = await Promise.all([
      base44.entities.OrgAsset.list('-created_date', 500),
      base44.entities.NexusUser.list('-created_date', 500),
      base44.entities.OrgShip.list('-created_date', 200),
    ]);
    setAssets(assetList || []);
    setMembers(memberList || []);
    setShips(shipList || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsub = base44.entities.OrgAsset.subscribe((event) => {
      if (event.type === 'create') setAssets(prev => [event.data, ...prev]);
      else if (event.type === 'update') setAssets(prev => prev.map(a => a.id === event.id ? event.data : a));
      else if (event.type === 'delete') setAssets(prev => prev.filter(a => a.id !== event.id));
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (typeFilter !== 'ALL' && a.asset_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (ownerFilter === 'UNASSIGNED' && a.assigned_to_callsign) return false;
      if (ownerFilter !== 'ALL' && ownerFilter !== 'UNASSIGNED' && (a.assigned_to_callsign || '').toUpperCase() !== ownerFilter.toUpperCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [a.asset_name, a.model, a.manufacturer, a.serial_tag, a.assigned_to_callsign, a.location_detail, a.notes].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, typeFilter, statusFilter, ownerFilter, search]);

  const handleEdit = (asset) => { setEditAsset(asset); setShowForm(true); };
  const handleNew = () => { setEditAsset(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditAsset(null); loadData(); };
  const handleClose = () => { setShowForm(false); setEditAsset(null); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 18, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>ASSET MANAGEMENT</div>
              <div style={{
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4,
              }}>TRACKING {assets.length} REGISTERED ASSETS</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadData} style={{
                padding: '8px 14px', background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
                color: '#5A5850', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
              }}><RefreshCw size={11} /> REFRESH</button>
              <div style={{ display: 'flex', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                <button onClick={() => setViewMode('grid')} style={{
                  padding: '8px 10px', background: viewMode === 'grid' ? 'rgba(200,170,100,0.08)' : '#141410',
                  border: 'none', color: viewMode === 'grid' ? '#C8A84B' : '#5A5850', cursor: 'pointer',
                }}><LayoutGrid size={12} /></button>
                <button onClick={() => setViewMode('list')} style={{
                  padding: '8px 10px', background: viewMode === 'list' ? 'rgba(200,170,100,0.08)' : '#141410',
                  border: 'none', color: viewMode === 'list' ? '#C8A84B' : '#5A5850', cursor: 'pointer',
                  borderLeft: '0.5px solid rgba(200,170,100,0.12)',
                }}><List size={12} /></button>
              </div>
              <button onClick={handleNew} style={{
                padding: '8px 18px', background: '#C0392B', border: 'none', borderRadius: 2,
                color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}><Plus size={12} /> REGISTER</button>
            </div>
          </div>

          <AssetKpiBar assets={assets} />

          <div style={{ marginTop: 14 }}>
            <AssetFilters
              search={search} onSearch={setSearch}
              typeFilter={typeFilter} onTypeFilter={setTypeFilter}
              statusFilter={statusFilter} onStatusFilter={setStatusFilter}
              ownerFilter={ownerFilter} onOwnerFilter={setOwnerFilter}
              members={members}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 20px', gap: 14,
            }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.15 }}>
                <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
                <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
                <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
                <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
              </svg>
              <span style={{
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
              }}>{assets.length === 0 ? 'NO ASSETS REGISTERED' : 'NO ASSETS MATCH FILTERS'}</span>
              {assets.length === 0 && (
                <button onClick={handleNew} style={{
                  marginTop: 8, padding: '10px 24px', background: '#C0392B',
                  border: 'none', borderRadius: 2, color: '#E8E4DC',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                }}>REGISTER YOUR FIRST ASSET</button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12,
            }}>
              {filtered.map(a => (
                <AssetCard key={a.id} asset={a} onEdit={handleEdit} onRefresh={loadData} />
              ))}
            </div>
          ) : (
            <AssetListView assets={filtered} onEdit={handleEdit} onRefresh={loadData} />
          )}
        </div>
      </div>

      {showForm && (
        <AssetRegisterForm
          editAsset={editAsset} members={members} ships={ships}
          onClose={handleClose} onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* Compact list view */
function AssetListView({ assets, onEdit, onRefresh }) {
  const STATUS_COLORS = {
    ACTIVE: '#4A8C5C', STORED: '#9A9488', DEPLOYED: '#3498DB',
    MAINTENANCE: '#C8A84B', DAMAGED: '#E67E22', DESTROYED: '#C0392B',
    LOANED: '#8E44AD', MISSING: '#C0392B',
  };

  return (
    <div style={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1fr 60px',
        padding: '8px 14px', background: '#0F0F0D',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        <span>ASSET</span><span>TYPE</span><span>STATUS</span>
        <span>ASSIGNED TO</span><span>LOCATION</span><span>VALUE</span><span />
      </div>
      {assets.map(a => (
        <div key={a.id} style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1fr 60px',
          padding: '10px 14px', alignItems: 'center',
          borderBottom: '0.5px solid rgba(200,170,100,0.06)',
          transition: 'background 100ms', cursor: 'pointer',
        }}
        onClick={() => onEdit(a)}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8E4DC', letterSpacing: '0.06em' }}>
              {a.asset_name}
            </div>
            {a.model && <div style={{ fontSize: 10, color: '#5A5850' }}>{a.model}</div>}
          </div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.06em' }}>
            {a.asset_type}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: STATUS_COLORS[a.status] || '#5A5850', fontWeight: 600, letterSpacing: '0.08em',
          }}>{a.status}</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.06em' }}>
            {a.assigned_to_callsign || '—'}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.06em' }}>
            {[a.location_system, a.location_detail].filter(Boolean).join(' · ') || '—'}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.06em' }}>
            {a.estimated_value_aUEC ? `${a.estimated_value_aUEC.toLocaleString()}` : '—'}
          </span>
          <span />
        </div>
      ))}
    </div>
  );
}