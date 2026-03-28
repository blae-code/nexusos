/**
 * CommoditySelector — Searchable dropdown to pick a commodity for charting.
 */
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export default function CommoditySelector({ commodities, selected, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    const list = [...new Set((commodities || []).map(c => c.name).filter(Boolean))].sort();
    if (!q) return list;
    return list.filter(n => n.toLowerCase().includes(q));
  }, [commodities, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <Search size={11} style={{ position: 'absolute', left: 8, top: 8, color: '#5A5850' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search commodity..."
          style={{
            width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 26px',
            background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2, color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          }}
        />
      </div>
      <div style={{
        maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1,
        background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2,
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: '12px 10px', textAlign: 'center', color: '#5A5850', fontSize: 10 }}>NO MATCHES</div>
        )}
        {filtered.map(name => (
          <button key={name} onClick={() => onSelect(name)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '6px 10px', border: 'none', cursor: 'pointer',
            background: selected === name ? 'rgba(192,57,43,0.12)' : 'transparent',
            color: selected === name ? '#E8E4DC' : '#9A9488',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
            fontWeight: selected === name ? 600 : 400,
            transition: 'all 100ms',
          }}
          onMouseEnter={e => { if (selected !== name) e.currentTarget.style.background = '#141410'; }}
          onMouseLeave={e => { if (selected !== name) e.currentTarget.style.background = 'transparent'; }}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}