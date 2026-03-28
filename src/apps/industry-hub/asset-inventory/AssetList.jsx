/**
 * AssetList — displays personal material assets + org materials held by the user.
 */
import React, { useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Trash2, Package, Boxes } from 'lucide-react';
import { showToast } from '@/components/NexusToast';

const COND_COLORS = { PRISTINE: '#4A8C5C', GOOD: '#C8A84B', DAMAGED: '#C0392B' };
const CAT_COLORS = {
  FPS_WEAPON: '#C0392B', FPS_ARMOR: '#3498DB', SHIP_COMPONENT: '#8E44AD',
  CONSUMABLE: '#E8A020', MATERIAL: '#4A8C5C', CURRENCY: '#C8A84B', OTHER: '#5A5850',
};

function AssetRow({ asset, isOrgMat, onDelete }) {
  const name = isOrgMat ? asset.material_name : asset.item_name;
  const qty = isOrgMat ? asset.quantity_scu : asset.quantity;
  const unit = isOrgMat ? 'SCU' : '×';
  const quality = asset.quality_score;
  const loc = isOrgMat ? asset.location || asset.held_in : asset.location;
  const catColor = isOrgMat ? '#4A8C5C' : (CAT_COLORS[asset.category] || '#5A5850');
  const catLabel = isOrgMat ? (asset.material_type || 'MAT') : (asset.category || 'OTHER');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'background 100ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {/* Category tag */}
      <span style={{
        fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
        color: catColor, background: `${catColor}15`, border: `0.5px solid ${catColor}40`,
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
        minWidth: 50, textAlign: 'center', flexShrink: 0,
      }}>{catLabel}</span>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
          color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        {loc && <div style={{ fontSize: 9, color: '#5A5850', marginTop: 1 }}>{loc}</div>}
      </div>

      {/* Source badge */}
      <span style={{
        fontSize: 8, padding: '1px 5px', borderRadius: 2,
        color: isOrgMat ? '#3498DB' : '#9A9488',
        background: isOrgMat ? 'rgba(52,152,219,0.10)' : 'rgba(154,148,136,0.08)',
        border: `0.5px solid ${isOrgMat ? 'rgba(52,152,219,0.25)' : 'rgba(154,148,136,0.15)'}`,
      }}>{isOrgMat ? 'ORG MAT' : 'PERSONAL'}</span>

      {/* Quantity */}
      <span style={{
        fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
        color: '#C8A84B', minWidth: 60, textAlign: 'right',
      }}>{unit === 'SCU' ? `${qty} SCU` : `×${qty}`}</span>

      {/* Quality */}
      {quality > 0 && (
        <span style={{
          fontSize: 9, color: quality >= 800 ? '#C8A84B' : '#5A5850',
          minWidth: 35, textAlign: 'right',
        }}>Q{quality}</span>
      )}

      {/* Condition */}
      {!isOrgMat && asset.condition && (
        <span style={{
          fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 2,
          color: COND_COLORS[asset.condition] || '#5A5850',
          background: `${COND_COLORS[asset.condition] || '#5A5850'}15`,
        }}>{asset.condition}</span>
      )}

      {/* Delete (personal only) */}
      {!isOrgMat && (
        <button onClick={() => onDelete(asset)} title="Remove" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 3,
        }}>
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

export default function AssetList({ materialAssets, orgMaterials, otherAssets, search, onRefresh }) {
  const q = (search || '').toLowerCase();

  const filteredMats = useMemo(() =>
    materialAssets.filter(a => !q || (a.item_name || '').toLowerCase().includes(q)),
    [materialAssets, q]
  );
  const filteredOrg = useMemo(() =>
    orgMaterials.filter(m => !q || (m.material_name || '').toLowerCase().includes(q)),
    [orgMaterials, q]
  );
  const filteredOther = useMemo(() =>
    otherAssets.filter(a => !q || (a.item_name || '').toLowerCase().includes(q)),
    [otherAssets, q]
  );

  const handleDelete = async (asset) => {
    await base44.entities.PersonalAsset.delete(asset.id);
    showToast('Asset removed', 'info');
    onRefresh();
  };

  const total = filteredMats.length + filteredOrg.length + filteredOther.length;

  if (total === 0) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
      }}>
        <Boxes size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
        <div>{search ? 'No assets match your search' : 'No personal assets logged yet'}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
        background: '#141410', borderBottom: '0.5px solid rgba(200,170,100,0.08)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
        letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        <span style={{ minWidth: 62 }}>TYPE</span>
        <span style={{ flex: 1 }}>NAME</span>
        <span style={{ minWidth: 50 }}>SOURCE</span>
        <span style={{ minWidth: 60, textAlign: 'right' }}>QTY</span>
        <span style={{ minWidth: 35 }}>QUAL</span>
        <span style={{ minWidth: 40 }}>COND</span>
        <span style={{ width: 20 }} />
      </div>
      {filteredOrg.map(m => <AssetRow key={`org-${m.id}`} asset={m} isOrgMat onDelete={() => {}} />)}
      {filteredMats.map(a => <AssetRow key={`pa-${a.id}`} asset={a} isOrgMat={false} onDelete={handleDelete} />)}
      {filteredOther.map(a => <AssetRow key={`ot-${a.id}`} asset={a} isOrgMat={false} onDelete={handleDelete} />)}
    </div>
  );
}