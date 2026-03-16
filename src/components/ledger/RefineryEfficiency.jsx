import React, { useMemo, useState } from 'react';

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function EfficiencyBar({ label, expected, actual, unit = 'SCU' }) {
  const pct = expected > 0 ? Math.min((actual / expected) * 100, 120) : 0;
  const displayPct = expected > 0 ? ((actual / expected) * 100).toFixed(1) : '—';
  const color = pct >= 95 ? 'var(--live)' : pct >= 80 ? 'var(--info)' : pct >= 60 ? 'var(--warn)' : 'var(--danger)';
  const overYield = pct > 100;

  return (
    <div style={{ padding: '8px 0', borderBottom: '0.5px solid var(--b0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ color: 'var(--t0)', fontSize: 11 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>
            {actual.toFixed(1)} / {expected.toFixed(1)} {unit}
          </span>
          <span style={{
            color,
            fontSize: 11,
            fontWeight: 500,
            minWidth: 48,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayPct}%
          </span>
          {overYield && (
            <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)', fontSize: 9 }}>
              OVER
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
        {/* Expected marker at 100% */}
        <div style={{ position: 'absolute', right: 0, top: -1, height: 5, width: '0.5px', background: 'var(--b3)' }} />
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const expected = order.quantity_scu || 0;
  const actual = order.yield_pct ? expected * (order.yield_pct / 100) : null;
  const efficiency = actual !== null && expected > 0 ? (actual / expected) * 100 : null;
  const effColor = efficiency === null ? 'var(--t2)' : efficiency >= 95 ? 'var(--live)' : efficiency >= 80 ? 'var(--info)' : efficiency >= 60 ? 'var(--warn)' : 'var(--danger)';

  const timeLeft = (() => {
    if (!order.completes_at) return null;
    const diff = new Date(order.completes_at) - Date.now();
    if (diff <= 0) return 'READY';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 11 }}>{order.material_name}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.method || '—'}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{expected.toFixed(1)}</td>
      <td style={{ padding: '8px 14px', fontVariantNumeric: 'tabular-nums' }}>
        {actual !== null ? (
          <span style={{ color: effColor, fontSize: 11 }}>{actual.toFixed(1)}</span>
        ) : <span style={{ color: 'var(--t2)' }}>—</span>}
      </td>
      <td style={{ padding: '8px 14px' }}>
        {efficiency !== null ? (
          <span style={{ color: effColor, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{efficiency.toFixed(1)}%</span>
        ) : <span style={{ color: 'var(--t2)', fontSize: 11 }}>—</span>}
      </td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.cost_aUEC ? order.cost_aUEC.toLocaleString() : '—'}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.station || '—'}</td>
      <td style={{ padding: '8px 14px' }}>
        {timeLeft === 'READY' ? (
          <span style={{ color: 'var(--live)', fontSize: 11, fontWeight: 500 }}>READY</span>
        ) : timeLeft ? (
          <span style={{ color: 'var(--info)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</span>
        ) : <span style={{ color: 'var(--t2)', fontSize: 11 }}>—</span>}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <span className="nexus-tag" style={{
          color: order.status === 'READY' ? 'var(--live)' : order.status === 'ACTIVE' ? 'var(--info)' : 'var(--t2)',
          borderColor: 'transparent',
          background: 'transparent',
          fontSize: 9,
        }}>{order.status}</span>
      </td>
    </tr>
  );
}

export default function RefineryEfficiency({ refineryOrders }) {
  const [methodFilter, setMethodFilter] = useState('ALL');

  const stats = useMemo(() => {
    const completed = refineryOrders.filter(o => o.status === 'COLLECTED' && o.yield_pct);
    const active    = refineryOrders.filter(o => o.status === 'ACTIVE');
    const ready     = refineryOrders.filter(o => o.status === 'READY');

    // Expected vs actual by method
    const methodStats = {};
    completed.forEach(o => {
      const m = o.method || 'UNKNOWN';
      if (!methodStats[m]) methodStats[m] = { expected: 0, actual: 0, count: 0 };
      methodStats[m].expected += o.quantity_scu || 0;
      methodStats[m].actual   += (o.quantity_scu || 0) * (o.yield_pct / 100);
      methodStats[m].count++;
    });

    const overallExpected = completed.reduce((s, o) => s + (o.quantity_scu || 0), 0);
    const overallActual   = completed.reduce((s, o) => s + ((o.quantity_scu || 0) * ((o.yield_pct || 0) / 100)), 0);
    const overallEff      = overallExpected > 0 ? (overallActual / overallExpected) * 100 : 0;

    const avgYield = completed.length > 0
      ? completed.reduce((s, o) => s + (o.yield_pct || 0), 0) / completed.length
      : 0;

    const totalCost = refineryOrders.reduce((s, o) => s + (o.cost_aUEC || 0), 0);

    return { completed, active, ready, methodStats, overallExpected, overallActual, overallEff, avgYield, totalCost };
  }, [refineryOrders]);

  const methods = ['ALL', ...Object.keys(stats.methodStats)];
  const filteredOrders = methodFilter === 'ALL' ? refineryOrders : refineryOrders.filter(o => o.method === methodFilter);

  const effColor = stats.overallEff >= 95 ? 'var(--live)' : stats.overallEff >= 80 ? 'var(--info)' : stats.overallEff >= 60 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'OVERALL EFFICIENCY', value: `${stats.overallEff.toFixed(1)}%`, accent: effColor },
          { label: 'AVG YIELD RATE',     value: `${stats.avgYield.toFixed(1)}%`,   accent: 'var(--t0)' },
          { label: 'TOTAL COST',         value: stats.totalCost > 0 ? `${stats.totalCost.toLocaleString()} aUEC` : '—', accent: 'var(--t0)' },
          { label: 'ACTIVE ORDERS',      value: stats.active.length,  accent: 'var(--info)' },
          { label: 'READY TO COLLECT',   value: stats.ready.length,   accent: stats.ready.length > 0 ? 'var(--live)' : 'var(--t2)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.accent, fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* By method breakdown */}
      {Object.keys(stats.methodStats).length > 0 && (
        <div>
          <SectionHeader label="EFFICIENCY BY METHOD" />
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '10px 14px' }}>
            {Object.entries(stats.methodStats).map(([method, ms]) => (
              <EfficiencyBar key={method} label={method} expected={ms.expected} actual={ms.actual} />
            ))}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionHeader label="ORDER LOG" />
          <div style={{ display: 'flex', gap: 4 }}>
            {methods.map(m => (
              <button key={m} onClick={() => setMethodFilter(m)} className="nexus-btn" style={{
                padding: '3px 8px', fontSize: 9,
                background: methodFilter === m ? 'var(--bg4)' : 'var(--bg2)',
                borderColor: methodFilter === m ? 'var(--b3)' : 'var(--b1)',
                color: methodFilter === m ? 'var(--t0)' : 'var(--t2)',
              }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['MATERIAL', 'METHOD', 'INPUT SCU', 'YIELD SCU', 'EFFICIENCY', 'COST', 'STATION', 'TIME LEFT', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 500, borderBottom: '0.5px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => <OrderRow key={o.id} order={o} />)}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                    No refinery orders. Submit orders or upload screenshots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}