/**
 * BlueprintBrowser — searchable, filterable grid of all blueprints.
 * Users can claim/unclaim ownership with a single click.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Search, Grid3X3, LayoutGrid } from 'lucide-react';
import BlueprintBrowserCard from './BlueprintBrowserCard';
import BlueprintMissionMatrix from './BlueprintMissionMatrix';

const CATEGORIES = [
  'ALL', 'WEAPON', 'ARMOR', 'GEAR', 'COMPONENT',
  'CONSUMABLE', 'AMMO', 'SHIP_COMPONENT', 'FOCUSING_LENS', 'OTHER',
];

const OWNERSHIP_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'owned', label: 'OWNED' },
  { id: 'unowned', label: 'UNOWNED' },
  { id: 'mine', label: 'MINE' },
  { id: 'priority', label: 'PRIORITY' },
];

export default function BlueprintBrowser({ blueprints, callsign, onBlueprintUpdated }) {
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('all');

  const filtered = useMemo(() => {
    return (blueprints || []).filter(bp => {
      if (categoryFilter !== 'ALL' && (bp.category || 'OTHER') !== categoryFilter) return false;
      const isOwned = Boolean(bp.owned_by_callsign || bp.owned_by);
      const isMine = (bp.owned_by_callsign || '').toUpperCase() === (callsign || '').toUpperCase();
      if (ownershipFilter === 'owned' && !isOwned) return false;
      if (ownershipFilter === 'unowned' && isOwned) return false;
      if (ownershipFilter === 'mine' && !isMine) return false;
      if (ownershipFilter === 'priority' && !bp.is_priority) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [bp.item_name, bp.category, bp.tier, bp.source_mission_giver, bp.owned_by_callsign]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [blueprints, categoryFilter, ownershipFilter, search, callsign]);

  const totalOwned = (blueprints || []).filter(b => b.owned_by_callsign || b.owned_by).length;
  const myCount = (blueprints || []).filter(b => (b.owned_by_callsign || '').toUpperCase() === (callsign || '').toUpperCase()).length;

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#141410',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 'clamp(14px, 3vw, 16px)', color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>BLUEPRINT BROWSER</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#5A5850', marginTop: 2, letterSpacing: '0.06em',
            }}>
              {totalOwned}/{(blueprints || []).length} org-owned · {myCount} yours · Click "I HAVE THIS" to claim
            </div>
          </div>
          <div style={{ display: 'flex', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{
              padding: '6px 10px', background: viewMode === 'grid' ? 'rgba(200,170,100,0.08)' : '#141410',
              border: 'none', color: viewMode === 'grid' ? '#C8A84B' : '#5A5850', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><LayoutGrid size={11} /> BROWSE</button>
            <button onClick={() => setViewMode('matrix')} style={{
              padding: '6px 10px', background: viewMode === 'matrix' ? 'rgba(200,170,100,0.08)' : '#141410',
              border: 'none', color: viewMode === 'matrix' ? '#C8A84B' : '#5A5850', cursor: 'pointer',
              borderLeft: '0.5px solid rgba(200,170,100,0.12)',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><Grid3X3 size={11} /> MISSION MATRIX</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH BLUEPRINTS..."
            className="nexus-input"
            style={{ paddingLeft: 30, height: 34, fontSize: 11 }}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                background: categoryFilter === cat ? 'rgba(200,168,75,0.12)' : 'transparent',
                border: `0.5px solid ${categoryFilter === cat ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
                color: categoryFilter === cat ? '#C8A84B' : '#5A5850',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Ownership filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {OWNERSHIP_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setOwnershipFilter(f.id)}
              style={{
                padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                background: ownershipFilter === f.id ? 'rgba(192,57,43,0.12)' : 'transparent',
                border: `0.5px solid ${ownershipFilter === f.id ? '#C0392B' : 'rgba(200,170,100,0.10)'}`,
                color: ownershipFilter === f.id ? '#E8E4DC' : '#5A5850',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Mission Matrix view */}
      {viewMode === 'matrix' ? (
        <div style={{ padding: '14px 16px' }}>
          <BlueprintMissionMatrix blueprints={blueprints} callsign={callsign} />
        </div>
      ) : (
      <>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 10,
        padding: '14px 16px 20px',
      }}>
        {filtered.map(bp => (
          <BlueprintBrowserCard
            key={bp.id}
            blueprint={bp}
            callsign={callsign}
            onUpdated={onBlueprintUpdated}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>
          {(blueprints || []).length === 0 ? 'NO BLUEPRINTS IN DATABASE' : 'NO BLUEPRINTS MATCH FILTERS'}
        </div>
      )}

      <div style={{
        padding: '8px 16px', borderTop: '0.5px solid rgba(200,170,100,0.06)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
      }}>
        Showing {filtered.length} of {(blueprints || []).length}
      </div>
      </>
      )}
    </div>
  );
}