/**
 * ProductionRecsPanel — Ranked blueprint profitability recommendations.
 */
import React, { useState } from 'react';
import { Zap, Clock, CheckCircle, AlertTriangle, Package } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

const REC_META = {
  CRAFT_NOW:        { label: 'CRAFT NOW',        color: '#4AE830', bg: 'rgba(74,232,48,0.08)', border: 'rgba(74,232,48,0.2)' },
  GATHER_MATERIALS: { label: 'GATHER MATS',      color: '#C8A84B', bg: 'rgba(200,168,75,0.08)', border: 'rgba(200,168,75,0.2)' },
  LOW_PRIORITY:     { label: 'LOW PRIORITY',     color: 'var(--t3)', bg: 'var(--bg3)', border: 'var(--b1)' },
};

function RecBadge({ rec }) {
  const meta = REC_META[rec] || REC_META.LOW_PRIORITY;
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 3, fontSize: 8, fontWeight: 700,
      color: meta.color, background: meta.bg, border: `0.5px solid ${meta.border}`,
    }}>
      {meta.label}
    </span>
  );
}

export default function ProductionRecsPanel({ data }) {
  const [filter, setFilter] = useState('ALL'); // ALL, CRAFT_NOW, GATHER_MATERIALS

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No blueprints registered. Add blueprints with recipe data to see production recommendations.
      </div>
    );
  }

  const craftNow = data.filter(r => r.recommendation === 'CRAFT_NOW');
  const filtered = filter === 'ALL' ? data : data.filter(r => r.recommendation === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Quick insight */}
      {craftNow.length > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 4,
          background: 'rgba(74,232,48,0.06)', border: '0.5px solid rgba(74,232,48,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Zap size={12} style={{ color: '#4AE830' }} />
          <span style={{ fontSize: 10, color: '#4AE830', fontWeight: 600 }}>
            {craftNow.length} item{craftNow.length !== 1 ? 's' : ''} ready to craft now
          </span>
          <span style={{ fontSize: 9, color: 'var(--t2)' }}>
            Total potential: {fmt(craftNow.reduce((s, r) => s + r.profit, 0))} aUEC profit
          </span>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 3 }}>
        {['ALL', 'CRAFT_NOW', 'GATHER_MATERIALS', 'LOW_PRIORITY'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="nexus-btn"
            style={{
              padding: '3px 9px', fontSize: 9,
              background: filter === f ? 'var(--bg4)' : 'var(--bg2)',
              borderColor: filter === f ? 'var(--b3)' : 'var(--b1)',
              color: filter === f ? 'var(--t0)' : 'var(--t2)',
            }}
          >
            {f === 'ALL' ? 'ALL' : (REC_META[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 0.5fr 0.6fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr',
          gap: 6, padding: '8px 12px',
          background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)',
          fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em', fontWeight: 600,
        }}>
          <div>BLUEPRINT</div>
          <div style={{ textAlign: 'center' }}>REC</div>
          <div style={{ textAlign: 'center' }}>READY</div>
          <div style={{ textAlign: 'right' }}>INPUT COST</div>
          <div style={{ textAlign: 'right' }}>OUTPUT VALUE</div>
          <div style={{ textAlign: 'right' }}>PROFIT</div>
          <div style={{ textAlign: 'right' }}>MARGIN</div>
          <div style={{ textAlign: 'right' }}>aUEC/HR</div>
        </div>

        {filtered.map(r => (
          <div key={r.blueprint_id} style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 0.5fr 0.6fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr',
            gap: 6, padding: '7px 12px', alignItems: 'center',
            borderBottom: '0.5px solid var(--b0)', fontSize: 10,
          }}>
            <div>
              <div style={{ color: 'var(--t0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.item_name}
              </div>
              <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 1 }}>
                {r.tier} · {r.category} · {r.craft_time_min}m
                {r.active_jobs > 0 && <span style={{ color: 'var(--info)', marginLeft: 4 }}>{r.active_jobs} active</span>}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}><RecBadge rec={r.recommendation} /></div>

            <div style={{ textAlign: 'center' }}>
              {r.materials_ready
                ? <CheckCircle size={12} style={{ color: '#4AE830' }} />
                : <AlertTriangle size={12} style={{ color: '#C8A84B' }} />
              }
            </div>

            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#C0392B', fontSize: 10 }}>
              {r.has_uex_pricing ? fmt(r.input_cost) : <span style={{ color: 'var(--t3)', fontSize: 8 }}>no data</span>}
            </div>

            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#C8A84B', fontSize: 10 }}>
              {fmt(r.output_value)}
            </div>

            <div style={{
              textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 10,
              color: r.profit > 0 ? '#4AE830' : r.profit < 0 ? '#C0392B' : 'var(--t3)',
            }}>
              {r.profit > 0 ? '+' : ''}{fmt(r.profit)}
            </div>

            <div style={{
              textAlign: 'right', fontFamily: 'monospace', fontSize: 9,
              color: r.margin_pct > 20 ? '#4AE830' : r.margin_pct > 0 ? '#C8A84B' : 'var(--t3)',
            }}>
              {r.margin_pct > 0 ? `${r.margin_pct}%` : '—'}
            </div>

            <div style={{
              textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 10,
              color: r.profit_per_hour > 10000 ? '#4AE830' : r.profit_per_hour > 0 ? 'var(--t1)' : 'var(--t3)',
            }}>
              {r.profit_per_hour > 0 ? fmt(r.profit_per_hour) : '—'}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>
            No blueprints match this filter.
          </div>
        )}
      </div>
    </div>
  );
}