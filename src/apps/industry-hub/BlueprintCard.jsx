/**
 * BlueprintCard — expandable card for a single blueprint entry.
 */
import React, { useState } from 'react';
import { Clock, Zap, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import MaterialContextPanel from '@/components/industry/MaterialContextPanel';
import { qualityPercentFromRecord } from '@/core/data/quality';

const CAT_COLOR = {
  WEAPON: 'var(--danger)', ARMOR: 'var(--info)', GEAR: 'var(--acc2)',
  COMPONENT: 'var(--warn)', CONSUMABLE: 'var(--live)', FOCUSING_LENS: 'var(--info)',
  SHIP_COMPONENT: 'var(--info)', OTHER: 'var(--t2)',
};

function formatTime(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function BlueprintCard({ bp, materials, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [contextMaterial, setContextMaterial] = useState(null);
  const owned = Boolean(bp.owned_by || bp.owned_by_callsign);
  const catColor = CAT_COLOR[bp.category] || 'var(--t2)';
  const isT2 = bp.tier === 'T2';

  // Check material availability against current stockpile
  const recipeMaterials = bp.recipe_materials || [];
  const materialStatus = recipeMaterials.map(req => {
    const stock = materials.filter(m => m.material_name?.toLowerCase() === req.material?.toLowerCase());
    const totalScu = stock.reduce((s, m) => s + (m.quantity_scu || 0), 0);
    const bestQuality = stock.length ? Math.max(...stock.map((m) => qualityPercentFromRecord(m))) : 0;
    const qualityOk = bestQuality >= (req.min_quality || bp.min_material_quality || 80);
    const qtyOk = totalScu >= (req.quantity_scu || 0);
    return { ...req, totalScu, bestQuality, qualityOk, qtyOk, met: qualityOk && qtyOk };
  });

  const allMet = recipeMaterials.length > 0 && materialStatus.every(m => m.met);
  const systems = (bp.available_systems || ['STANTON']).join(' · ');

  return (
    <div style={{
      background: 'var(--bg1)',
      border: `0.5px solid ${bp.is_priority ? 'var(--warn-b)' : 'var(--b1)'}`,
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'border-color 0.1s',
    }}
      onMouseEnter={e => { if (!bp.is_priority) e.currentTarget.style.borderColor = 'var(--b2)'; }}
      onMouseLeave={e => { if (!bp.is_priority) e.currentTarget.style.borderColor = 'var(--b1)'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        {/* Category dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0 }} />

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: owned ? 'var(--t0)' : 'var(--t2)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bp.item_name}
            </span>
            {bp.is_priority && (
              <span style={{ color: 'var(--warn)', fontSize: 8, padding: '1px 5px', border: '0.5px solid var(--warn-b)', borderRadius: 3, background: 'var(--warn-bg)', flexShrink: 0 }}>
                PRIORITY
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: catColor, fontSize: 9 }}>{bp.category}</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>·</span>
            <span style={{ color: isT2 ? 'var(--warn)' : 'var(--t2)', fontSize: 9 }}>{bp.tier}</span>
            {systems && <><span style={{ color: 'var(--t3)', fontSize: 9 }}>·</span><span style={{ color: 'var(--t2)', fontSize: 9 }}>{systems}</span></>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {bp.crafting_time_min > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--t2)', fontSize: 9 }}>
              <Clock size={9} />
              {formatTime(bp.crafting_time_min)}
            </div>
          )}
          {bp.refinery_bonus_pct > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--live)', fontSize: 9 }}>
              <Zap size={9} />
              +{bp.refinery_bonus_pct}%
            </div>
          )}
          {bp.aUEC_value_est > 0 && (
            <span style={{ color: 'var(--t1)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
              {bp.aUEC_value_est.toLocaleString()} aUEC
            </span>
          )}

          {/* Material readiness indicator */}
          {recipeMaterials.length > 0 && (
            <div style={{
              padding: '2px 7px', borderRadius: 3, fontSize: 9,
              background: allMet ? 'var(--live-bg)' : 'var(--bg3)',
              border: `0.5px solid ${allMet ? 'var(--live-b)' : 'var(--b2)'}`,
              color: allMet ? 'var(--live)' : 'var(--t2)',
            }}>
              {allMet ? '✓ READY' : `${materialStatus.filter(m => m.met).length}/${recipeMaterials.length}`}
            </div>
          )}

          {/* Ownership */}
          {owned ? (
            <span style={{ color: 'var(--acc2)', fontSize: 9, padding: '1px 6px', border: '0.5px solid var(--b2)', borderRadius: 3, background: 'var(--bg3)' }}>
              {bp.owned_by_callsign || 'owned'}
            </span>
          ) : (
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>unowned</span>
          )}

          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(bp); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex', fontSize: 10 }}>
              ✎
            </button>
          )}

          {expanded ? <ChevronUp size={11} style={{ color: 'var(--t2)' }} /> : <ChevronDown size={11} style={{ color: 'var(--t2)' }} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '0.5px solid var(--b0)' }}>
          {/* Recipe materials */}
          {recipeMaterials.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>REQUIRED MATERIALS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {materialStatus.map((req, i) => (
                  <React.Fragment key={i}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px auto',
                      gap: 8, padding: '5px 8px', borderRadius: 5,
                      background: req.met ? 'var(--live-bg)' : 'var(--bg2)',
                      border: `0.5px solid ${req.met ? 'var(--live-b)' : 'var(--b1)'}`,
                      alignItems: 'center',
                    }}>
                      <span style={{ color: req.met ? 'var(--t0)' : 'var(--t1)', fontSize: 11 }}>{req.material}</span>
                      <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: req.qtyOk ? 'var(--live)' : 'var(--danger)' }}>{req.totalScu.toFixed(1)}</span>
                        /{req.quantity_scu || 0} SCU
                      </span>
                      <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: req.qualityOk ? 'var(--live)' : 'var(--danger)' }}>{req.bestQuality.toFixed(0)}</span>
                        /{req.min_quality || 80}%
                      </span>
                      <span style={{ color: req.met ? 'var(--live)' : 'var(--t3)', fontSize: 9 }}>
                        {req.met ? '✓ MET' : '✗ SHORT'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setContextMaterial(contextMaterial === req.material ? null : req.material); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: contextMaterial === req.material ? 'var(--acc2)' : 'var(--t3)', padding: 2, display: 'flex' }}
                        title="View market & cross-module data"
                      >
                        <ExternalLink size={10} />
                      </button>
                    </div>
                    {contextMaterial === req.material && (
                      <MaterialContextPanel materialName={req.material} onClose={() => setContextMaterial(null)} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Meta info row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {bp.output_quantity > 1 && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>OUTPUT · </span><span style={{ color: 'var(--t1)', fontSize: 10 }}>×{bp.output_quantity}</span></div>
            )}
            {bp.min_material_quality && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>MIN QUALITY · </span><span style={{ color: bp.min_material_quality >= 80 ? 'var(--warn)' : 'var(--t1)', fontSize: 10 }}>{bp.min_material_quality}%</span></div>
            )}
            {bp.fabricator_location && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>FABRICATOR · </span><span style={{ color: 'var(--t1)', fontSize: 10 }}>{bp.fabricator_location}</span></div>
            )}
            {bp.refinery_bonus_pct > 0 && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>REFINERY BONUS · </span><span style={{ color: 'var(--live)', fontSize: 10 }}>+{bp.refinery_bonus_pct}% yield</span></div>
            )}
          </div>

          {bp.notes && (
            <div style={{ marginTop: 8, color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{bp.notes}</div>
          )}
          {bp.priority_note && (
            <div style={{ marginTop: 6, color: 'var(--warn)', fontSize: 10 }}>⚑ {bp.priority_note}</div>
          )}

          {canEdit && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => onEdit(bp)} className="nexus-btn" style={{ padding: '4px 12px', fontSize: 9 }}>EDIT</button>
              <button onClick={() => onDelete(bp.id)} style={{
                padding: '4px 12px', fontSize: 9, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                background: 'var(--danger-bg)', border: '0.5px solid var(--danger-b)', color: 'var(--danger)',
              }}>DELETE</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
