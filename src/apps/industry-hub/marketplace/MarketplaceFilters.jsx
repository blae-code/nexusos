/**
 * MarketplaceFilters — Filter bar for the marketplace.
 */
import React from 'react';
import { Search } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'ALL' },
  { value: 'SELL', label: 'SELL' },
  { value: 'BUY', label: 'BUY' },
];

const MAT_TYPES = [
  'ALL', 'CMR', 'CMP', 'CMS', 'CM_REFINED', 'ORE', 'CRAFTED_ITEM', 'COMPONENT', 'OTHER',
];

export default function MarketplaceFilters({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      padding: '8px 0',
    }}>
      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 0 }}>
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => set('type', t.value)} style={{
            padding: '5px 12px', border: 'none', cursor: 'pointer',
            borderBottom: filters.type === t.value ? '2px solid #C0392B' : '2px solid transparent',
            background: 'transparent',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: filters.type === t.value ? '#E8E4DC' : '#5A5850',
            transition: 'color 150ms',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Material type */}
      <select
        value={filters.materialType}
        onChange={e => set('materialType', e.target.value)}
        style={{
          padding: '5px 8px', background: '#0C0C0A',
          border: '0.5px solid rgba(200,170,100,0.08)',
          borderRadius: 2, color: '#E8E4DC', fontSize: 10,
          fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer',
        }}
      >
        {MAT_TYPES.map(mt => (
          <option key={mt} value={mt}>{mt === 'ALL' ? 'ALL TYPES' : mt.replace(/_/g, ' ')}</option>
        ))}
      </select>

      {/* Quality filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850' }}>MIN Q:</span>
        <input
          type="number" min={0} max={1000} step={50}
          value={filters.minQuality}
          onChange={e => set('minQuality', Number(e.target.value) || 0)}
          style={{
            width: 56, padding: '4px 6px', background: '#0C0C0A',
            border: '0.5px solid rgba(200,170,100,0.08)',
            borderRadius: 2, color: '#E8E4DC', fontSize: 10,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        />
      </div>

      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 140px', minWidth: 140 }}>
        <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
        <input
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="Search..."
          style={{
            width: '100%', padding: '5px 8px 5px 26px',
            background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
            borderRadius: 2, color: '#E8E4DC', fontSize: 10,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        />
      </div>

      {/* My listings toggle */}
      <button onClick={() => set('showMine', !filters.showMine)} style={{
        padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        background: filters.showMine ? 'rgba(122,174,204,0.10)' : 'transparent',
        border: `0.5px solid ${filters.showMine ? '#7AAECC' : 'rgba(200,170,100,0.08)'}`,
        color: filters.showMine ? '#7AAECC' : '#5A5850',
        letterSpacing: '0.08em',
        transition: 'all 150ms',
      }}>MINE ONLY</button>
    </div>
  );
}