/**
 * GapAnalysis — cross-references inventory against active blueprint recipes.
 * Checks both quantity AND quality thresholds. Shows shortfalls and
 * auto-generates requisitions, noting whether a gap is quantity-based,
 * quality-based, or both.
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Zap, AlertTriangle, Check, Send, Package, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

const STATUS = {
  READY:   { color: '#4A8C5C', label: 'READY',   bg: 'rgba(74,140,92,0.10)' },
  PARTIAL: { color: '#C8A84B', label: 'PARTIAL',  bg: 'rgba(200,168,75,0.10)' },
  MISSING: { color: '#C0392B', label: 'MISSING',  bg: 'rgba(192,57,43,0.10)' },
};

// Default minimum quality score (1-1000 scale) for a material to count as craft-ready
const DEFAULT_QUALITY_MIN = 800;

function qualityPct(score) {
  return Math.round((score / 10));
}

function GapRow({ gap, qualityMin }) {
  const qtyPct  = gap.need > 0 ? Math.min((gap.have / gap.need) * 100, 100) : 0;
  const qtyMet  = gap.have >= gap.need;
  const qualMet = !gap.quality || gap.quality === 0 || gap.quality >= qualityMin;
  const fullyMet = qtyMet && qualMet;

  const barColor = fullyMet ? '#4A8C5C' : qtyMet ? '#C8A84B' : '#C0392B';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{
        fontSize: 10, color: '#9A9488', width: 110, flexShrink: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{gap.name}</span>

      {/* Quantity bar */}
      <div style={{ flex: 1, height: 4, background: '#1A1A16', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${qtyPct}%`, height: '100%', borderRadius: 2,
          background: barColor, transition: 'width 0.3s',
        }} />
      </div>

      {/* Qty numbers */}
      <span style={{
        fontSize: 9, fontFamily: 'monospace', color: qtyMet ? '#4A8C5C' : '#C8A84B',
        width: 76, textAlign: 'right',
      }}>
        {gap.have.toFixed(1)}/{gap.need.toFixed(1)}
      </span>

      {/* Quality badge */}
      {gap.quality > 0 && (
        <span style={{
          fontSize: 9, fontFamily: 'monospace',
          color: qualMet ? '#4A8C5C' : '#C0392B',
          width: 44, textAlign: 'right',
          title: `Quality: ${qualityPct(gap.quality)}% (need ≥${qualityPct(qualityMin)}%)`,
        }}>
          Q{qualityPct(gap.quality)}%
        </span>
      )}

      {/* Deficit */}
      <span style={{
        fontSize: 9, fontFamily: 'monospace', color: '#C0392B',
        width: 54, textAlign: 'right',
      }}>
        {!qtyMet ? `-${gap.deficit.toFixed(1)}` : !qualMet ? 'LOW Q' : '✓'}
      </span>
    </div>
  );
}

function BlueprintGapCard({ analysis, callsign, qualityMin, onRequisitionSent }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const { bp, status, pct, gaps, allMats } = analysis;
  const cfg = STATUS[status] || STATUS.MISSING;

  const handleAutoRequisition = async () => {
    if (gaps.length === 0) return;
    setSending(true);
    try {
      const reqs = gaps.filter(g => g.deficit > 0 || g.qualityDeficit).map(g => ({
        requested_by_callsign: callsign,
        request_type: 'MATERIAL',
        item_name: g.name,
        material_name: g.name,
        material_type: g.type || undefined,
        quantity_scu: Math.max(g.deficit, 0),
        quantity: Math.ceil(Math.max(g.deficit, 0)),
        min_quality: qualityMin,
        purpose: g.qualityDeficit && !g.deficit
          ? `Quality upgrade needed for crafting ${bp.item_name} — current Q${qualityPct(g.quality)}% below ${qualityPct(qualityMin)}% threshold`
          : `Auto-detected shortfall for crafting ${bp.item_name}`,
        priority: 'NORMAL',
        source_module: 'ASSET_INVENTORY',
        source_blueprint_id: bp.id,
        source_blueprint_name: bp.item_name,
        requested_at: new Date().toISOString(),
        status: 'OPEN',
      }));
      if (reqs.length > 0) {
        await Promise.all(reqs.map(r => base44.entities.Requisition.create(r)));
        showToast(`${reqs.length} requisition${reqs.length > 1 ? 's' : ''} created for ${bp.item_name}`, 'success');
        onRequisitionSent?.();
      }
    } catch (err) {
      showToast(err?.message || 'Failed to create requisitions', 'error');
    }
    setSending(false);
  };

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${cfg.color}`,
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 100ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'READY'
            ? <Check size={12} style={{ color: cfg.color }} />
            : <AlertTriangle size={12} style={{ color: cfg.color }} />}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
            fontWeight: 600, color: '#E8E4DC',
          }}>{bp.item_name}</span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>{bp.category} · {bp.tier}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 2,
            color: cfg.color, background: cfg.bg,
          }}>{pct}% — {cfg.label}</span>
          {gaps.length > 0 && (
            <span style={{ fontSize: 9, color: '#C0392B' }}>
              {gaps.filter(g => g.deficit > 0).length > 0 && `${gaps.filter(g => g.deficit > 0).length} qty gap`}
              {gaps.filter(g => g.qualityDeficit).length > 0 && ` ${gaps.filter(g => g.qualityDeficit).length} low-Q`}
            </span>
          )}
          {expanded ? <ChevronUp size={12} style={{ color: '#5A5850' }} /> : <ChevronDown size={12} style={{ color: '#5A5850' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: '10px 14px 12px',
          borderTop: '0.5px solid rgba(200,170,100,0.06)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#5A5850', width: 110 }}>MATERIAL</span>
            <span style={{ flex: 1, fontSize: 9, color: '#5A5850' }}>QTY</span>
            <span style={{ fontSize: 9, color: '#5A5850', width: 76, textAlign: 'right' }}>HAVE/NEED</span>
            <span style={{ fontSize: 9, color: '#5A5850', width: 44, textAlign: 'right' }}>QUAL</span>
            <span style={{ fontSize: 9, color: '#5A5850', width: 54, textAlign: 'right' }}>GAP</span>
          </div>

          {allMats.map((m, i) => <GapRow key={i} gap={m} qualityMin={qualityMin} />)}

          {gaps.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', background: 'rgba(192,57,43,0.06)',
              border: '0.5px solid rgba(192,57,43,0.15)', borderRadius: 2, marginTop: 4,
            }}>
              <div style={{ fontSize: 10, color: '#9A9488' }}>
                <Package size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {gaps.filter(g => g.deficit > 0).length > 0 && `${gaps.filter(g => g.deficit > 0).length} qty gap · `}
                {gaps.filter(g => g.qualityDeficit && !g.deficit).length > 0 && `${gaps.filter(g => g.qualityDeficit && !g.deficit).length} below Q${qualityPct(qualityMin)}% threshold`}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleAutoRequisition(); }}
                disabled={sending}
                style={{
                  padding: '5px 12px', borderRadius: 2,
                  background: sending ? '#5A5850' : '#C0392B', border: 'none',
                  color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Send size={9} /> {sending ? 'SENDING...' : 'AUTO-REQUISITION'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GapAnalysis({ blueprints, inventory, callsign, basisLabel }) {
  const [filter, setFilter] = useState('ALL');
  const [reqSentCount, setReqSentCount] = useState(0);
  const [qualityMin, setQualityMin] = useState(DEFAULT_QUALITY_MIN);
  const [showQualitySlider, setShowQualitySlider] = useState(false);

  const analyzed = useMemo(() => {
    return blueprints
      .filter(bp => Array.isArray(bp.recipe_materials) && bp.recipe_materials.length > 0)
      .map(bp => {
        const recipe = bp.recipe_materials;
        let met = 0;
        const gaps = [];
        const allMats = [];

        for (const r of recipe) {
          const matName = (r.material_name || r.material || '').toUpperCase();
          const need = r.quantity_scu || 0;
          // Per-recipe quality override, or fall back to global qualityMin
          const reqQuality = r.min_quality || qualityMin;
          const inv = inventory[matName] || { scu: 0, quality: 0 };
          const have = inv.scu;
          const quality = inv.quality || 0;
          const deficit = Math.max(0, need - have);
          const qtyMet = have >= need;
          // Quality only counts if we actually have inventory and it has a score
          const qualityDeficit = quality > 0 && quality < reqQuality && have > 0;
          const isMet = qtyMet && !qualityDeficit;

          allMats.push({ name: r.material_name || r.material, type: r.material_type, need, have, deficit, quality, qualityDeficit });

          if (isMet) {
            met++;
          } else {
            gaps.push({ name: r.material_name || r.material, type: r.material_type, need, have, deficit, quality, qualityDeficit });
          }
        }

        const pct = recipe.length > 0 ? Math.round((met / recipe.length) * 100) : 0;
        const status = met === recipe.length ? 'READY' : met > 0 ? 'PARTIAL' : 'MISSING';
        return { bp, status, pct, gaps, allMats, met, total: recipe.length };
      })
      .sort((a, b) => {
        const order = { READY: 0, PARTIAL: 1, MISSING: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.pct - a.pct;
      });
  }, [blueprints, inventory, qualityMin]);

  const counts = { READY: 0, PARTIAL: 0, MISSING: 0 };
  analyzed.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  const allGapItems = analyzed.flatMap(a => a.gaps.filter(g => g.deficit > 0 || g.qualityDeficit));
  const filtered = filter === 'ALL' ? analyzed : analyzed.filter(a => a.status === filter);

  const [bulkSending, setBulkSending] = useState(false);
  const handleBulkRequisition = async () => {
    if (allGapItems.length === 0) return;
    setBulkSending(true);
    try {
      const reqs = analyzed.flatMap(a =>
        a.gaps.filter(g => g.deficit > 0 || g.qualityDeficit).map(g => ({
          requested_by_callsign: callsign,
          request_type: 'MATERIAL',
          item_name: g.name,
          material_name: g.name,
          material_type: g.type || undefined,
          quantity_scu: Math.max(g.deficit, 0),
          quantity: Math.ceil(Math.max(g.deficit, 0)),
          min_quality: qualityMin,
          purpose: g.qualityDeficit && !g.deficit
            ? `Quality upgrade needed for crafting ${a.bp.item_name} — Q${qualityPct(g.quality)}% below ${qualityPct(qualityMin)}% threshold`
            : `Auto-detected shortfall for crafting ${a.bp.item_name}`,
          priority: 'NORMAL',
          source_module: 'ASSET_INVENTORY',
          source_blueprint_id: a.bp.id,
          source_blueprint_name: a.bp.item_name,
          requested_at: new Date().toISOString(),
          status: 'OPEN',
        }))
      );
      await Promise.all(reqs.map(r => base44.entities.Requisition.create(r)));
      showToast(`${reqs.length} requisitions created`, 'success');
      setReqSentCount(c => c + reqs.length);
    } catch (err) {
      showToast(err?.message || 'Failed to create requisitions', 'error');
    }
    setBulkSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {basisLabel && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(122,174,204,0.08)', border: '0.5px solid rgba(122,174,204,0.18)',
          borderRadius: 2, fontSize: 10, color: '#7AAECC',
        }}>
          Craftability measured against <strong>{basisLabel}</strong>.
          Quality threshold: <strong>Q{qualityPct(qualityMin)}%</strong> — materials below this score count as gaps even if quantity is met.
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL',     label: `ALL (${analyzed.length})`,      color: '#9A9488' },
            { id: 'READY',   label: `READY (${counts.READY})`,       color: '#4A8C5C' },
            { id: 'PARTIAL', label: `PARTIAL (${counts.PARTIAL})`,   color: '#C8A84B' },
            { id: 'MISSING', label: `MISSING (${counts.MISSING})`,   color: '#C0392B' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              background: filter === f.id ? `${f.color}15` : '#141410',
              border: `0.5px solid ${filter === f.id ? `${f.color}44` : 'rgba(200,170,100,0.08)'}`,
              color: filter === f.id ? f.color : '#5A5850', letterSpacing: '0.06em',
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {/* Quality threshold toggle */}
          <button
            onClick={() => setShowQualitySlider(s => !s)}
            title="Adjust quality threshold"
            style={{
              padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              background: showQualitySlider ? 'rgba(122,174,204,0.12)' : '#141410',
              border: `0.5px solid ${showQualitySlider ? 'rgba(122,174,204,0.3)' : 'rgba(200,170,100,0.08)'}`,
              color: showQualitySlider ? '#7AAECC' : '#5A5850', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <Sliders size={9} /> Q{qualityPct(qualityMin)}%
          </button>

          {allGapItems.length > 0 && (
            <button onClick={handleBulkRequisition} disabled={bulkSending} style={{
              padding: '6px 14px', borderRadius: 2,
              background: bulkSending ? '#5A5850' : '#C0392B', border: 'none',
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              cursor: bulkSending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Zap size={10} /> {bulkSending ? 'SENDING...' : `REQUISITION ALL GAPS (${allGapItems.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Quality threshold slider */}
      {showQualitySlider && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(122,174,204,0.06)', border: '0.5px solid rgba(122,174,204,0.16)',
          borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 10, color: '#7AAECC', whiteSpace: 'nowrap' }}>
            MIN QUALITY THRESHOLD
          </span>
          <input
            type="range" min={0} max={1000} step={50}
            value={qualityMin}
            onChange={e => setQualityMin(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#7AAECC' }}
          />
          <span style={{
            fontSize: 12, fontFamily: 'monospace', color: '#7AAECC',
            width: 46, textAlign: 'right',
          }}>Q{qualityPct(qualityMin)}%</span>
          <button
            onClick={() => setQualityMin(DEFAULT_QUALITY_MIN)}
            style={{
              fontSize: 9, color: '#5A5850', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.06em',
            }}>RESET</button>
        </div>
      )}

      {reqSentCount > 0 && (
        <div style={{
          padding: '6px 12px', background: 'rgba(74,140,92,0.08)',
          border: '0.5px solid rgba(74,140,92,0.2)', borderRadius: 2,
          fontSize: 10, color: '#4A8C5C',
        }}>
          ✓ {reqSentCount} requisition{reqSentCount > 1 ? 's' : ''} sent — view them in the Requisitions tab
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
        }}>
          <Zap size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
          <div>No blueprints with recipes match this filter</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => (
            <BlueprintGapCard
              key={a.bp.id}
              analysis={a}
              callsign={callsign}
              qualityMin={qualityMin}
              onRequisitionSent={() => setReqSentCount(c => c + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
