/**
 * LootSummaryBar — compact running total of all LOOT events
 */
import React from 'react';
import { Package } from 'lucide-react';

export default function LootSummaryBar({ events }) {
  if (!events || events.length === 0) return null;

  const totalScu = events.reduce((s, e) => s + (e.quantity_scu || 0), 0);
  const uniqueMaterials = [...new Set(events.map(e => e.material_name).filter(Boolean))];
  const avgQuality = events.filter(e => e.quality_score > 0).reduce((s, e, _, a) => s + e.quality_score / a.length, 0);

  return (
    <div style={{
      flexShrink: 0, marginBottom: 8, padding: '6px 10px',
      background: 'rgba(200,170,100,0.04)', border: '0.5px solid var(--b0)',
      borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Package size={10} style={{ color: 'var(--acc)', flexShrink: 0 }} />
      <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em' }}>LOOT:</span>
      <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {totalScu.toFixed(1)} SCU
      </span>
      <span style={{ fontSize: 9, color: 'var(--t3)' }}>
        {events.length} haul{events.length !== 1 ? 's' : ''} · {uniqueMaterials.length} type{uniqueMaterials.length !== 1 ? 's' : ''}
      </span>
      {avgQuality > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: 9, color: avgQuality >= 800 ? 'var(--live)' : avgQuality >= 600 ? 'var(--warn)' : 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
          AVG Q{Math.round(avgQuality)}
        </span>
      )}
    </div>
  );
}