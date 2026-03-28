import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { MapPin, User, Ship, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const STATUS_COLORS = {
  ACTIVE: '#4A8C5C', STORED: '#9A9488', DEPLOYED: '#3498DB',
  MAINTENANCE: '#C8A84B', DAMAGED: '#E67E22', DESTROYED: '#C0392B',
  LOANED: '#8E44AD', MISSING: '#C0392B',
};
const CONDITION_COLORS = {
  PRISTINE: '#4A8C5C', GOOD: '#9A9488', FAIR: '#C8A84B',
  DAMAGED: '#E67E22', WRECKED: '#C0392B',
};
const TYPE_LABELS = {
  SHIP: 'Ship', VEHICLE: 'Vehicle', FPS_WEAPON: 'FPS Weapon',
  FPS_ARMOR: 'FPS Armor', SHIP_COMPONENT: 'Ship Component',
  EQUIPMENT: 'Equipment', OTHER: 'Other',
};

export default function AssetCard({ asset, onEdit, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${asset.asset_name}"?`)) return;
    setDeleting(true);
    await base44.entities.OrgAsset.delete(asset.id);
    onRefresh();
  };

  const statusColor = STATUS_COLORS[asset.status] || '#5A5850';
  const condColor = CONDITION_COLORS[asset.condition] || '#5A5850';

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid ' + statusColor,
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '14px 16px',
      opacity: deleting ? 0.4 : 1, transition: 'opacity 150ms',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 13, color: '#E8E4DC', letterSpacing: '0.06em',
            textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{asset.asset_name}</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#5A5850', letterSpacing: '0.08em', marginTop: 2,
          }}>
            {TYPE_LABELS[asset.asset_type] || asset.asset_type}
            {asset.model && <> · {asset.model}</>}
            {asset.manufacturer && <> · {asset.manufacturer}</>}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4,
          }}><MoreVertical size={14} /></button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 22, background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2,
              zIndex: 20, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }} onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { setMenuOpen(false); onEdit(asset); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 12px', background: 'none', border: 'none',
                color: '#9A9488', fontSize: 11, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                <Edit2 size={11} /> EDIT
              </button>
              <button onClick={() => { setMenuOpen(false); handleDelete(); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 12px', background: 'none', border: 'none',
                color: '#C0392B', fontSize: 11, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                <Trash2 size={11} /> DELETE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 2, fontSize: 9, fontWeight: 600,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em',
          background: statusColor + '18', color: statusColor, textTransform: 'uppercase',
        }}>{asset.status}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 2, fontSize: 9, fontWeight: 600,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em',
          background: condColor + '18', color: condColor, textTransform: 'uppercase',
        }}>{asset.condition || 'GOOD'}</span>
        {asset.serial_tag && (
          <span style={{
            padding: '2px 8px', borderRadius: 2, fontSize: 9,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
            background: 'rgba(200,170,100,0.06)', color: '#C8A84B',
          }}>{asset.serial_tag}</span>
        )}
        {asset.is_org_property === false && (
          <span style={{
            padding: '2px 8px', borderRadius: 2, fontSize: 9,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
            background: 'rgba(142,68,173,0.12)', color: '#8E44AD',
          }}>PERSONAL</span>
        )}
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 10, color: '#9A9488' }}>
        {asset.assigned_to_callsign && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={11} style={{ color: '#C8A84B' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
              {asset.assigned_to_callsign}
            </span>
          </div>
        )}
        {(asset.location_system || asset.location_detail) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={11} style={{ color: '#C8A84B' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
              {[asset.location_system, asset.location_detail].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {asset.linked_ship_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ship size={11} style={{ color: '#C8A84B' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
              Installed on {asset.linked_ship_name}
            </span>
          </div>
        )}
        {asset.estimated_value_aUEC > 0 && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', color: '#C8A84B' }}>
            {asset.estimated_value_aUEC.toLocaleString()} aUEC
          </div>
        )}
      </div>

      {asset.notes && (
        <div style={{
          marginTop: 8, padding: '6px 8px', background: 'rgba(200,170,100,0.04)',
          borderRadius: 2, fontSize: 10, color: '#5A5850', lineHeight: 1.5,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>{asset.notes}</div>
      )}
    </div>
  );
}
