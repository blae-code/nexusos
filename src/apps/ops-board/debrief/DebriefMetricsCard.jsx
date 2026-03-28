/**
 * DebriefMetricsCard — compact metric display card for debrief data.
 */
import React from 'react';

export default function DebriefMetricsCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#0F0F0D',
      border: `0.5px solid ${color}22`, borderLeft: `2px solid ${color}`,
      borderRadius: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {Icon && <Icon size={10} style={{ color }} />}
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          color: '#5A5850', letterSpacing: '0.15em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
        fontWeight: 700, color, fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 8, color: '#5A5850', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}