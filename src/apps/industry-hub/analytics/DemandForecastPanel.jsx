/**
 * DemandForecastPanel — Material supply vs demand analysis.
 */
import React from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Package } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  return (Math.round(n * 10) / 10).toLocaleString();
}

const STATUS_META = {
  CRITICAL: { color: '#C0392B', bg: 'rgba(192,57,43,0.08)', label: 'CRITICAL' },
  SHORT:    { color: '#C8A84B', bg: 'rgba(200,168,75,0.06)', label: 'SHORT' },
  ADEQUATE: { color: '#4AE830', bg: 'rgba(74,232,48,0.06)', label: 'OK' },
  SURPLUS:  { color: 'var(--info)', bg: 'rgba(82,151,255,0.06)', label: 'SURPLUS' },
};

function SupplyBar({ stock, demand }) {
  const total = Math.max(stock, demand, 1);
  const stockPct = (stock / total) * 100;
  const demandPct = (demand / total) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
      <div style={{ width: 60, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        {/* Demand bar (background) */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${demandPct}%`, height: '100%',
          background: 'rgba(192,57,43,0.3)', borderRadius: 3,
        }} />
        {/* Stock bar (foreground) */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${Math.min(stockPct, 100)}%`, height: '100%',
          background: stockPct >= demandPct ? '#4AE830' : '#C8A84B', borderRadius: 3,
        }} />
      </div>
    </div>
  );
}

export default function DemandForecastPanel({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No pending craft queue items or active jobs to forecast demand from.
      </div>
    );
  }

  const criticalCount = data.filter(d => d.status === 'CRITICAL').length;
  const shortCount = data.filter(d => d.status === 'SHORT').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Alert banner */}
      {(criticalCount > 0 || shortCount > 0) && (
        <div style={{
          padding: '8px 12px', borderRadius: 4,
          background: criticalCount > 0 ? 'rgba(192,57,43,0.08)' : 'rgba(200,168,75,0.06)',
          border: `0.5px solid ${criticalCount > 0 ? 'rgba(192,57,43,0.2)' : 'rgba(200,168,75,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={12} style={{ color: criticalCount > 0 ? '#C0392B' : '#C8A84B' }} />
          <span style={{ fontSize: 10, color: criticalCount > 0 ? '#C0392B' : '#C8A84B', fontWeight: 600 }}>
            {criticalCount > 0 ? `${criticalCount} critical shortage${criticalCount !== 1 ? 's' : ''}` : ''}
            {criticalCount > 0 && shortCount > 0 ? ' · ' : ''}
            {shortCount > 0 ? `${shortCount} material${shortCount !== 1 ? 's' : ''} running low` : ''}
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 0.6fr 0.7fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr',
          gap: 6, padding: '8px 12px',
          background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)',
          fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em', fontWeight: 600,
        }}>
          <div>MATERIAL</div>
          <div style={{ textAlign: 'center' }}>STATUS</div>
          <div style={{ textAlign: 'right' }}>IN STOCK</div>
          <div style={{ textAlign: 'right' }}>QUEUE NEED</div>
          <div style={{ textAlign: 'right' }}>DEFICIT</div>
          <div style={{ textAlign: 'right' }}>SURPLUS</div>
          <div style={{ textAlign: 'right' }}>MIN Q%</div>
          <div>SUPPLY</div>
        </div>

        {data.map(d => {
          const meta = STATUS_META[d.status] || STATUS_META.ADEQUATE;
          return (
            <div key={d.material} style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.6fr 0.7fr 0.7fr 0.7fr 0.7fr 0.5fr 0.8fr',
              gap: 6, padding: '7px 12px', alignItems: 'center',
              borderBottom: '0.5px solid var(--b0)', fontSize: 10,
              background: d.status === 'CRITICAL' ? 'rgba(192,57,43,0.04)' : 'transparent',
            }}>
              <div style={{ color: 'var(--t0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.material}
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{
                  padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700,
                  color: meta.color, background: meta.bg,
                }}>
                  {meta.label}
                </span>
              </div>

              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--t1)' }}>
                {fmt(d.current_stock_scu)}
              </div>

              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--t1)' }}>
                {fmt(d.queue_demand_scu)}
              </div>

              <div style={{
                textAlign: 'right', fontFamily: 'monospace', fontWeight: d.deficit_scu > 0 ? 600 : 400,
                color: d.deficit_scu > 0 ? '#C0392B' : 'var(--t3)',
              }}>
                {d.deficit_scu > 0 ? `-${fmt(d.deficit_scu)}` : '—'}
              </div>

              <div style={{
                textAlign: 'right', fontFamily: 'monospace',
                color: d.surplus_scu > 0 ? '#4AE830' : 'var(--t3)',
              }}>
                {d.surplus_scu > 0 ? `+${fmt(d.surplus_scu)}` : '—'}
              </div>

              <div style={{ textAlign: 'right', color: 'var(--t2)', fontSize: 9 }}>
                {d.min_quality_required > 0 ? `${d.min_quality_required}%` : '—'}
              </div>

              <SupplyBar stock={d.current_stock_scu} demand={d.queue_demand_scu} />
            </div>
          );
        })}
      </div>
    </div>
  );
}