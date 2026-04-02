import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Package } from 'lucide-react';
import AssetCard from '@/components/assets/AssetCard';
import AssetKpiBar from '@/components/assets/AssetKpiBar';
import AssetRegisterForm from '@/components/assets/AssetRegisterForm';

const TYPES = ['ALL', 'SHIP', 'VEHICLE', 'FPS_WEAPON', 'FPS_ARMOR', 'SHIP_COMPONENT', 'EQUIPMENT', 'OTHER'];
const STATUSES = ['ALL', 'ACTIVE', 'STORED', 'DEPLOYED', 'MAINTENANCE', 'DAMAGED', 'DESTROYED', 'LOANED', 'MISSING'];

function AssetListView({ assets, onEdit }) {
  return (
    <div style={{ borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1.4fr 60px',
        padding: '8px 14px',
        background: '#0F0F0D',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 9,
        color: '#5A5850',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}>
        <span>Asset</span>
        <span>Type</span>
        <span>Status</span>
        <span>Custody</span>
        <span>Location</span>
        <span />
      </div>
      {assets.map((asset) => (
        <div
          key={asset.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1.4fr 60px',
            padding: '10px 14px',
            alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.06)',
            transition: 'background 100ms',
            cursor: 'pointer',
          }}
          onClick={() => onEdit(asset)}
          onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(200,170,100,0.04)'; }}
          onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: '#E8E4DC',
              letterSpacing: '0.06em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{asset.asset_name}</div>
            {(asset.model || asset.manufacturer) && (
              <div style={{ fontSize: 10, color: '#5A5850' }}>
                {[asset.model, asset.manufacturer].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#9A9488' }}>{asset.asset_type || 'OTHER'}</span>
          <span style={{ fontSize: 10, color: '#C8A84B' }}>{asset.status || 'STORED'}</span>
          <span style={{ fontSize: 10, color: '#9A9488' }}>{asset.assigned_to_callsign || 'UNASSIGNED'}</span>
          <span style={{ fontSize: 10, color: '#9A9488' }}>
            {[asset.location_system, asset.location_detail].filter(Boolean).join(' · ') || 'Unknown'}
          </span>
          <span />
        </div>
      ))}
    </div>
  );
}

export default function InventoryAssetRoster({ assets, members, ships, search, scope, onRefresh }) {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);

  const query = (search || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    return (assets || []).filter((asset) => {
      if (typeFilter !== 'ALL' && asset.asset_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && asset.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        asset.asset_name,
        asset.asset_type,
        asset.model,
        asset.manufacturer,
        asset.serial_tag,
        asset.assigned_to_callsign,
        asset.location_system,
        asset.location_detail,
        asset.linked_ship_name,
        asset.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [assets, query, statusFilter, typeFilter]);

  const handleEdit = (asset) => {
    setEditAsset(asset);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditAsset(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditAsset(null);
    onRefresh();
  };

  const handleClose = () => {
    setShowForm(false);
    setEditAsset(null);
  };

  if (filtered.length === 0) {
    return (
      <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="nexus-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ width: 160, fontSize: 10 }}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="nexus-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ width: 160, fontSize: 10 }}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <button onClick={handleNew} style={{
            padding: '7px 14px',
            borderRadius: 2,
            background: '#7AAECC',
            border: 'none',
            color: '#08121A',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <Plus size={10} /> REGISTER ASSET
          </button>
        </div>

        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: '#5A5850',
        }}>
          <Package size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
          <div>{search ? 'No org assets match this search' : scope === 'me' ? 'No org assets are assigned into your custody' : 'No org assets registered yet'}</div>
        </div>

        {showForm && (
          <AssetRegisterForm
            editAsset={editAsset}
            members={members}
            ships={ships}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="nexus-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ width: 160, fontSize: 10 }}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="nexus-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ width: 160, fontSize: 10 }}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('grid')} style={{
                padding: '8px 10px',
                background: viewMode === 'grid' ? 'rgba(200,170,100,0.08)' : '#141410',
                border: 'none',
                color: viewMode === 'grid' ? '#C8A84B' : '#5A5850',
                cursor: 'pointer',
              }}><LayoutGrid size={12} /></button>
              <button onClick={() => setViewMode('list')} style={{
                padding: '8px 10px',
                background: viewMode === 'list' ? 'rgba(200,170,100,0.08)' : '#141410',
                border: 'none',
                borderLeft: '0.5px solid rgba(200,170,100,0.12)',
                color: viewMode === 'list' ? '#C8A84B' : '#5A5850',
                cursor: 'pointer',
              }}><List size={12} /></button>
            </div>
            <button onClick={handleNew} style={{
              padding: '7px 14px',
              borderRadius: 2,
              background: '#7AAECC',
              border: 'none',
              color: '#08121A',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Plus size={10} /> REGISTER ASSET
            </button>
          </div>
        </div>

        <AssetKpiBar assets={filtered} />

        {viewMode === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
          }}>
            {filtered.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onEdit={handleEdit} onRefresh={onRefresh} />
            ))}
          </div>
        ) : (
          <AssetListView assets={filtered} onEdit={handleEdit} />
        )}
      </div>

      {showForm && (
        <AssetRegisterForm
          editAsset={editAsset}
          members={members}
          ships={ships}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
