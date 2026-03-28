/**
 * MarketplaceStats — Quick metrics for the marketplace.
 */
import React from 'react';
import { TrendingUp, TrendingDown, User, AlertTriangle } from 'lucide-react';

export default function MarketplaceStats({ sellCount, buyCount, myActive, demandMaterials }) {
  const topDemand = demandMaterials.slice(0, 3);

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { icon: TrendingUp, label: 'FOR SALE', value: String(sellCount), color: '#2edb7a' },
        { icon: TrendingDown, label: 'WANTED', value: String(buyCount), color: '#C8A84B' },
        { icon: User, label: 'MY ACTIVE', value: String(myActive), color: '#7AAECC' },
      ].map(s => (
        <div key={s.label} style={{
          flex: '1 1 100px', background: '#0F0F0D',
          border: `0.5px solid ${s.color}22`,
          borderLeft: `2px solid ${s.color}`,
          borderRadius: 2, padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <s.icon size={10} style={{ color: s.color }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>{s.label}</span>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
        </div>
      ))}

      {topDemand.length > 0 && (
        <div style={{
          flex: '2 1 200px', background: '#0F0F0D',
          border: '0.5px solid rgba(192,57,43,0.15)',
          borderLeft: '2px solid #C0392B',
          borderRadius: 2, padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <AlertTriangle size={10} style={{ color: '#C0392B' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>CRAFT QUEUE DEMAND</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topDemand.map(d => (
              <span key={d.name} style={{
                padding: '2px 8px', borderRadius: 2, fontSize: 9,
                background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.15)',
                color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {d.name} <span style={{ color: '#C0392B', fontWeight: 600 }}>{d.qty.toFixed(1)} SCU</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}