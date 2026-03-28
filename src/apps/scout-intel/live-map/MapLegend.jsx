/**
 * MapLegend — compact overlay legend for the live system map layers.
 */
import React from 'react';

const ITEMS = [
  { color: '#4A8C5C', label: 'T2+ Deposit (≥80%)', shape: 'circle' },
  { color: '#C8A84B', label: 'T1 Deposit (60-79%)', shape: 'circle' },
  { color: '#9A9488', label: 'Low Quality (<60%)', shape: 'circle' },
  { color: '#5A5850', dashed: true, label: 'Stale / Unverified', shape: 'circle' },
  { color: '#3498DB', label: 'Station / Terminal', shape: 'square' },
  { color: '#C0392B', label: 'Hazard Zone', shape: 'diamond' },
  { color: '#E8A020', label: 'Trade Route', shape: 'line' },
];

function Shape({ shape, color, dashed }) {
  const s = 10;
  if (shape === 'square') {
    return <div style={{ width: s, height: s, background: `${color}30`, border: `1px solid ${color}`, borderRadius: 1 }} />;
  }
  if (shape === 'diamond') {
    return <div style={{ width: s, height: s, background: `${color}25`, border: `1px solid ${color}`, borderRadius: 1, transform: 'rotate(45deg)' }} />;
  }
  if (shape === 'line') {
    return <div style={{ width: 14, height: 0, borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}` }} />;
  }
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%',
      background: `${color}30`, border: `1px ${dashed ? 'dashed' : 'solid'} ${color}`,
    }} />
  );
}

export default function MapLegend() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '8px 10px', background: 'rgba(10,9,8,0.85)',
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
        color: '#5A5850', letterSpacing: '0.15em', marginBottom: 2,
      }}>MAP LEGEND</div>
      {ITEMS.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shape shape={item.shape} color={item.color} dashed={item.dashed} />
          <span style={{ fontSize: 8, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}