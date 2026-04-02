/**
 * MiningResults — displays the calculated mining signature breakdown.
 */
import React from 'react';

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

const TIER_COLOR = {
  S: 'var(--danger)', A: '#C8A84B', B: 'var(--info)',
  C: 'var(--t1)', D: 'var(--t2)', E: 'var(--t3)', F: 'var(--t3)',
};

export default function MiningResults({ result }) {
  if (!result) return null;
  const { bracket, estScu, minerals, totalValue, refineryYields, weightedInstability, weightedResistance, inputInstability, inputResistance, mass } = result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8, borderTop: '0.5px solid var(--b1)' }}>
      {/* Rock classification */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat label="ROCK SIZE" value={bracket?.label || '—'} color="var(--warn)" />
        <Stat label="EST. SCU" value={estScu.toFixed(1)} color="var(--info)" />
        <Stat label="RAW VALUE" value={`${fmt(totalValue)} aUEC`} color="var(--live)" />
        {mass && <Stat label="MASS" value={`${fmt(mass)} kg`} />}
      </div>

      {/* Instability / Resistance */}
      <div style={{ display: 'flex', gap: 10 }}>
        <BarStat label="INSTABILITY" value={inputInstability != null ? inputInstability : weightedInstability * 100} max={100} color="var(--danger)" suffix="%" />
        <BarStat label="RESISTANCE" value={inputResistance != null ? inputResistance : weightedResistance * 100} max={100} color="var(--warn)" suffix="%" />
      </div>

      {/* Mineral breakdown */}
      {minerals.length > 0 && (
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px 80px 50px', gap: 4, padding: '8px 12px', borderBottom: '0.5px solid var(--b0)' }}>
            {['MINERAL', '%', 'SCU', 'VALUE', 'TIER'].map(h => (
              <span key={h} style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em' }}>{h}</span>
            ))}
          </div>
          {minerals.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px 80px 50px', gap: 4, padding: '7px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
              <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500 }}>{m.name}</span>
              <span style={{ fontSize: 11, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{m.pct}%</span>
              <span style={{ fontSize: 11, color: 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>{m.scu.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: 'var(--live)', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.value)}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: TIER_COLOR[m.tier] || 'var(--t2)' }}>{m.tier}</span>
            </div>
          ))}
        </div>
      )}

      {/* Refinery yields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.12em' }}>REFINERY YIELDS</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {refineryYields.map(r => (
            <div key={r.method} style={{
              flex: 1, minWidth: 130, padding: '8px 10px',
              background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 'var(--r-md)',
            }}>
              <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>{r.method}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--live)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(r.value)} aUEC
              </div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>{Math.round(r.yieldPct * 100)}% yield</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: '1 1 100px', padding: '8px 10px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 'var(--r-md)' }}>
      <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--t0)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function BarStat({ label, value, max, color, suffix }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: 10, color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 300ms ease' }} />
      </div>
    </div>
  );
}