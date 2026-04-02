/**
 * SalvageResults — displays salvage signature analysis.
 */
import React from 'react';
import { SALVAGE_MATERIALS, REFINERY_METHODS } from './signatureData';

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function SalvageResults({ result }) {
  if (!result) return null;
  const { bracket, estScu, sig } = result;

  // Salvage yields: ~60% RMC, ~25% hull scrap, ~15% composites
  const rmcScu = estScu * 0.60;
  const hullScrapScu = estScu * 0.25;
  const compositeScu = estScu * 0.15;

  const rmc = SALVAGE_MATERIALS.find(m => m.name === 'RMC');
  const hull = SALVAGE_MATERIALS.find(m => m.name === 'Hull Scrap');
  const cmr = SALVAGE_MATERIALS.find(m => m.name === 'CMR');

  const rawValue = (rmcScu * rmc.pricePerScu) + (hullScrapScu * hull.pricePerScu) + (compositeScu * cmr.pricePerScu);

  const refinedYields = REFINERY_METHODS.map(method => ({
    method: method.name,
    yieldPct: method.yieldPct,
    value: rawValue * method.yieldPct,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8, borderTop: '0.5px solid var(--b1)' }}>
      {/* Classification */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat label="WRECK CLASS" value={bracket?.label || '—'} color="var(--warn)" />
        <Stat label="EST. SCU" value={estScu.toFixed(1)} color="var(--info)" />
        <Stat label="RAW VALUE" value={`${fmt(rawValue)} aUEC`} color="var(--live)" />
        <Stat label="SIGNATURE" value={sig.toLocaleString()} />
      </div>

      {/* Material breakdown */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: 4, padding: '8px 12px', borderBottom: '0.5px solid var(--b0)' }}>
          {['MATERIAL', 'SCU', 'VALUE'].map(h => (
            <span key={h} style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em' }}>{h}</span>
          ))}
        </div>
        {[
          { name: 'RMC', scu: rmcScu, value: rmcScu * rmc.pricePerScu },
          { name: 'Hull Scrap', scu: hullScrapScu, value: hullScrapScu * hull.pricePerScu },
          { name: 'Composites (CMR)', scu: compositeScu, value: compositeScu * cmr.pricePerScu },
        ].map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: 4, padding: '7px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
            <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500 }}>{m.name}</span>
            <span style={{ fontSize: 11, color: 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>{m.scu.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: 'var(--live)', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.value)}</span>
          </div>
        ))}
      </div>

      {/* Refinery yields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.12em' }}>REFINERY YIELDS</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {refinedYields.map(r => (
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