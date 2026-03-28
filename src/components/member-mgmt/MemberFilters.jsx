import React from 'react';
import { Search } from 'lucide-react';

const RANKS = ['ALL', 'PIONEER', 'FOUNDER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];
const SPECS = ['ALL', 'MINING', 'SALVAGE', 'COMBAT', 'CRAFTING', 'HAULING', 'MEDICAL', 'EXPLORATION', 'RACING', 'LEADERSHIP', 'UNASSIGNED'];
const ACCESS_LEVELS = ['ALL', 'FULL', 'STANDARD', 'RESTRICTED', 'NONE'];

function ChipRow({ options, value, onChange, activeColor }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          background: value === opt ? `${activeColor}18` : 'transparent',
          border: `0.5px solid ${value === opt ? activeColor : 'rgba(200,170,100,0.10)'}`,
          color: value === opt ? activeColor : '#5A5850',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{opt}</button>
      ))}
    </div>
  );
}

export default function MemberFilters({
  search, onSearch, rankFilter, onRankFilter,
  specFilter, onSpecFilter, accessFilter, onAccessFilter,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="SEARCH CALLSIGN OR ROLE..."
          className="nexus-input" style={{ paddingLeft: 32, height: 34, fontSize: 11, width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.15em', marginBottom: 3 }}>RANK</div>
          <ChipRow options={RANKS} value={rankFilter} onChange={onRankFilter} activeColor="#C8A84B" />
        </div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.15em', marginBottom: 3 }}>SPEC</div>
          <ChipRow options={SPECS} value={specFilter} onChange={onSpecFilter} activeColor="#3498DB" />
        </div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.15em', marginBottom: 3 }}>ACCESS</div>
          <ChipRow options={ACCESS_LEVELS} value={accessFilter} onChange={onAccessFilter} activeColor="#4A8C5C" />
        </div>
      </div>
    </div>
  );
}