/**
 * ShortageForecaster — analyses current stockpile vs craft-queue demand
 * and incoming refinery orders to predict which materials will run short.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, ArrowDown, Package } from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#C0392B', bg: 'rgba(192,57,43,0.12)', label: 'CRITICAL', icon: AlertTriangle },
  LOW:      { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)', label: 'LOW STOCK', icon: ArrowDown },
  OK:       { color: '#4A8C5C', bg: 'rgba(74,140,92,0.10)', label: 'ADEQUATE', icon: CheckCircle },
};

function fmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(1);
}

export default function ShortageForecaster({ materials, craftQueue, blueprints, refineryOrders }) {
  const forecasts = useMemo(() => {
    // 1. Build current stockpile by material name
    const stockpile = {};
    for (const m of (materials || [])) {
      if (m.is_archived) continue;
      const name = (m.material_name || '').toUpperCase();
      if (!name) continue;
      stockpile[name] = (stockpile[name] || 0) + (m.quantity_scu || 0);
    }

    // 2. Calculate demand from active/open craft queue
    const demand = {};
    const bpMap = {};
    for (const bp of (blueprints || [])) bpMap[bp.id] = bp;

    for (const cq of (craftQueue || [])) {
      if (cq.status === 'COMPLETE' || cq.status === 'CANCELLED') continue;
      const bp = bpMap[cq.blueprint_id];
      if (!bp?.recipe_materials) continue;
      const qty = cq.quantity || 1;
      for (const rm of bp.recipe_materials) {
        const matName = (rm.material_name || rm.material || '').toUpperCase();
        if (!matName) continue;
        demand[matName] = (demand[matName] || 0) + (rm.quantity_scu || 0) * qty;
      }
    }

    // 3. Calculate incoming supply from active refinery orders
    const incoming = {};
    for (const ro of (refineryOrders || [])) {
      if (ro.status === 'COLLECTED') continue;
      const name = (ro.material_name || '').toUpperCase();
      if (!name) continue;
      const yieldRatio = ro.expected_yield_ratio || (ro.yield_pct ? ro.yield_pct / 100 : 0.4);
      incoming[name] = (incoming[name] || 0) + (ro.quantity_scu || 0) * yieldRatio;
    }

    // 4. Generate forecasts for all materials that have either stock or demand
    const allMats = new Set([...Object.keys(stockpile), ...Object.keys(demand)]);
    const results = [];

    for (const mat of allMats) {
      const stock = stockpile[mat] || 0;
      const needed = demand[mat] || 0;
      const inbound = incoming[mat] || 0;
      const netAvailable = stock + inbound;
      const deficit = needed - netAvailable;

      let severity = 'OK';
      if (needed > 0 && deficit > 0) {
        severity = deficit >= needed * 0.5 ? 'CRITICAL' : 'LOW';
      } else if (needed > 0 && netAvailable < needed * 1.2) {
        severity = 'LOW';
      }

      // Days until depleted (rough: assume ~2 SCU consumed per day per active queue entry)
      const burnRate = needed > 0 ? needed / 7 : 0; // assume weekly demand
      const daysLeft = burnRate > 0 ? Math.max(0, netAvailable / burnRate) : Infinity;

      results.push({
        material: mat,
        stock,
        demand: needed,
        incoming: inbound,
        deficit: Math.max(0, deficit),
        severity,
        daysLeft: Number.isFinite(daysLeft) ? Math.round(daysLeft) : null,
      });
    }

    // Sort: CRITICAL first, then LOW, then OK
    const order = { CRITICAL: 0, LOW: 1, OK: 2 };
    return results.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || b.deficit - a.deficit);
  }, [materials, craftQueue, blueprints, refineryOrders]);

  const critCount = forecasts.filter(f => f.severity === 'CRITICAL').length;
  const lowCount = forecasts.filter(f => f.severity === 'LOW').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        <SummaryChip icon={AlertTriangle} label="CRITICAL" value={critCount} color="#C0392B" />
        <SummaryChip icon={ArrowDown} label="LOW STOCK" value={lowCount} color="#C8A84B" />
        <SummaryChip icon={Package} label="TRACKED" value={forecasts.length} color="#9A9488" />
      </div>

      {/* Explanation */}
      <div style={{
        padding: '10px 14px', background: 'rgba(200,170,100,0.04)',
        border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: '#9A9488', lineHeight: 1.6,
      }}>
        Compares current stockpile + incoming refinery yields against active craft queue demand.
        Materials marked CRITICAL cannot fulfill current queue without additional supply runs.
      </div>

      {/* Table */}
      <div style={{
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 90px 100px',
          padding: '8px 14px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <span>MATERIAL</span><span>STOCK</span><span>DEMAND</span>
          <span>INCOMING</span><span>DEFICIT</span><span>DAYS LEFT</span><span>STATUS</span>
        </div>

        {forecasts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
            No materials tracked — log materials or queue crafting jobs first
          </div>
        ) : forecasts.map(f => {
          const cfg = SEVERITY_CONFIG[f.severity];
          return (
            <div key={f.material} style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 90px 100px',
              padding: '10px 14px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.06)',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12,
                color: '#E8E4DC', letterSpacing: '0.04em',
              }}>{f.material}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(f.stock)} SCU
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: f.demand > 0 ? '#E8E4DC' : '#5A5850', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(f.demand)} SCU
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: f.incoming > 0 ? '#4A8C5C' : '#5A5850', fontVariantNumeric: 'tabular-nums' }}>
                {f.incoming > 0 ? `+${fmt(f.incoming)}` : '—'}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: f.deficit > 0 ? '#C0392B' : '#4A8C5C', fontWeight: f.deficit > 0 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                {f.deficit > 0 ? `-${fmt(f.deficit)}` : '✓'}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: f.daysLeft !== null ? (f.daysLeft <= 3 ? '#C0392B' : f.daysLeft <= 7 ? '#C8A84B' : '#9A9488') : '#5A5850', fontVariantNumeric: 'tabular-nums' }}>
                {f.daysLeft !== null ? `~${f.daysLeft}d` : '∞'}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                color: cfg.color, background: cfg.bg,
                border: `0.5px solid ${cfg.color}40`, borderRadius: 2, padding: '2px 6px',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                <cfg.icon size={9} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryChip({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
    }}>
      <Icon size={13} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}