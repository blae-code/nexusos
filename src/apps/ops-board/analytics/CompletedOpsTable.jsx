/**
 * CompletedOpsTable — Recent completed ops with key stats.
 */
import React from 'react';
import { Link } from 'react-router-dom';

function fmtAuec(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const S = {
  header: {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
    color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
    padding: '6px 10px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
    whiteSpace: 'nowrap',
  },
  cell: {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
    color: '#9A9488', padding: '8px 10px',
    borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  },
};

export default function CompletedOpsTable({ ops }) {
  const rows = ops.slice(0, 15);

  if (rows.length === 0) {
    return <div style={{ color: '#5A5850', fontSize: 11, padding: 20, textAlign: 'center' }}>No completed ops</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={S.header}>Name</th>
            <th style={S.header}>Type</th>
            <th style={S.header}>System</th>
            <th style={S.header}>Date</th>
            <th style={{ ...S.header, textAlign: 'right' }}>Crew</th>
            <th style={{ ...S.header, textAlign: 'right' }}>Duration</th>
            <th style={{ ...S.header, textAlign: 'right' }}>Loot</th>
            <th style={{ ...S.header, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...S.header, textAlign: 'right' }}>Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(o => (
            <tr key={o.id} style={{ transition: 'background 100ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <td style={S.cell}>
                <Link to={`/app/ops/${o.id}`} style={{
                  color: '#E8E4DC', fontWeight: 600, textDecoration: 'none',
                  borderBottom: '0.5px dotted rgba(200,170,100,0.15)',
                }}>{o.name}</Link>
              </td>
              <td style={S.cell}>{o.type.replace(/_/g, ' ')}</td>
              <td style={S.cell}>{o.system}</td>
              <td style={S.cell}>{fmtDate(o.scheduledAt || o.endedAt)}</td>
              <td style={{ ...S.cell, textAlign: 'right' }}>{o.crewCount}</td>
              <td style={{ ...S.cell, textAlign: 'right' }}>{o.durationMin != null ? `${o.durationMin}m` : '—'}</td>
              <td style={{ ...S.cell, textAlign: 'right', color: '#C8A84B' }}>{o.totalLootSCU > 0 ? `${o.totalLootSCU.toFixed(0)} SCU` : '—'}</td>
              <td style={{ ...S.cell, textAlign: 'right', color: '#4A8C5C' }}>{o.revenue > 0 ? `${fmtAuec(o.revenue)}` : '—'}</td>
              <td style={{ ...S.cell, textAlign: 'right', color: o.netProfit >= 0 ? '#4A8C5C' : '#E04848' }}>
                {o.revenue > 0 || o.expenses > 0 ? fmtAuec(o.netProfit) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}