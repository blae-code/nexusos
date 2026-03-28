/**
 * BlueprintMissionMatrix — cross-reference table of mission givers × blueprints.
 * Shows which missions drop which blueprints, with ownership & drop-chance data.
 * Helps users plan farming runs by grouping blueprints under their source missions.
 */
import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, Star, Check, MapPin, Crosshair } from 'lucide-react';

const CATEGORY_COLORS = {
  WEAPON: '#C0392B', ARMOR: '#C8A84B', GEAR: '#9A9488',
  COMPONENT: '#7AAECC', CONSUMABLE: '#4A8C5C', AMMO: '#5A5850',
  SHIP_COMPONENT: '#D8BC70', FOCUSING_LENS: '#8E44AD', OTHER: '#5A5850',
};

function DropChanceBadge({ pct }) {
  if (!pct) return null;
  const color = pct >= 20 ? '#4A8C5C' : pct >= 10 ? '#C8A84B' : '#C0392B';
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
      color, background: `${color}18`, border: `0.5px solid ${color}40`,
      borderRadius: 2, padding: '1px 5px', fontVariantNumeric: 'tabular-nums',
    }}>{pct}%</span>
  );
}

function BlueprintChip({ bp, callsign }) {
  const catColor = CATEGORY_COLORS[bp.category] || '#5A5850';
  const isMine = (bp.owned_by_callsign || '').toUpperCase() === (callsign || '').toUpperCase();
  const isOwned = Boolean(bp.owned_by_callsign || bp.owned_by);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 2,
      background: isMine ? 'rgba(74,140,92,0.06)' : isOwned ? 'rgba(200,168,75,0.04)' : '#0A0908',
      border: `0.5px solid ${isMine ? 'rgba(74,140,92,0.2)' : isOwned ? 'rgba(200,168,75,0.12)' : 'rgba(200,170,100,0.08)'}`,
      borderLeft: `2px solid ${catColor}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12,
          color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{bp.item_name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: catColor, fontWeight: 600,
          }}>{bp.category || 'OTHER'}</span>
          <span style={{ color: '#5A5850', fontSize: 8 }}>·</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: bp.tier === 'T2' ? '#C8A84B' : '#5A5850', fontWeight: 600,
          }}>{bp.tier || 'T1'}</span>
          {bp.aUEC_value_est > 0 && (
            <>
              <span style={{ color: '#5A5850', fontSize: 8 }}>·</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: '#C8A84B', fontVariantNumeric: 'tabular-nums',
              }}>{bp.aUEC_value_est.toLocaleString()} aUEC</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {bp.is_priority && <Star size={10} style={{ color: '#C8A84B', fill: '#C8A84B' }} />}
        {isMine && <Check size={10} style={{ color: '#4A8C5C' }} />}
        {isOwned && !isMine && (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: '#C8A84B', fontWeight: 600,
          }}>{bp.owned_by_callsign}</span>
        )}
      </div>
    </div>
  );
}

function MissionGroup({ giver, missions, blueprintMap, callsign, expanded, onToggle }) {
  const totalBps = missions.reduce((s, m) => s + m.bpIds.length, 0);
  const ownedBps = missions.reduce((s, m) => {
    return s + m.bpIds.filter(id => {
      const bp = blueprintMap[id];
      return bp && (bp.owned_by_callsign || bp.owned_by);
    }).length;
  }, 0);

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.08)',
      borderLeft: '2px solid #C0392B',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Group header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: '#141410', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '0.5px solid rgba(200,170,100,0.08)' : 'none',
        }}
      >
        {expanded
          ? <ChevronDown size={12} style={{ color: '#C8A84B', flexShrink: 0 }} />
          : <ChevronRight size={12} style={{ color: '#5A5850', flexShrink: 0 }} />
        }
        <Crosshair size={11} style={{ color: '#C0392B', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
          color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.06em',
          flex: 1, textAlign: 'left',
        }}>{giver}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          fontVariantNumeric: 'tabular-nums',
        }}>{ownedBps}/{totalBps} owned</span>
        {/* Coverage mini-bar */}
        <div style={{ width: 50, height: 3, background: 'rgba(200,170,100,0.08)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: ownedBps === totalBps ? '#4A8C5C' : '#C8A84B',
            width: `${totalBps > 0 ? (ownedBps / totalBps) * 100 : 0}%`,
            transition: 'width 0.4s ease-out',
          }} />
        </div>
      </button>

      {/* Mission list */}
      {expanded && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {missions.map((mission, idx) => (
            <div key={idx}>
              {/* Mission name row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              }}>
                <MapPin size={10} style={{ color: '#C8A84B', flexShrink: 0 }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
                  color: '#C8A84B', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{mission.name}</span>
                {mission.dropChance && <DropChanceBadge pct={mission.dropChance} />}
              </div>
              {/* Blueprint chips in this mission */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 16 }}>
                {mission.bpIds.map(id => {
                  const bp = blueprintMap[id];
                  if (!bp) return null;
                  return <BlueprintChip key={id} bp={bp} callsign={callsign} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlueprintMissionMatrix({ blueprints, callsign }) {
  const [search, setSearch] = useState('');
  const [expandedGivers, setExpandedGivers] = useState({});
  const [showOwned, setShowOwned] = useState('all'); // all | unowned | priority

  const bpMap = useMemo(() => {
    const m = {};
    for (const bp of (blueprints || [])) m[bp.id] = bp;
    return m;
  }, [blueprints]);

  // Build mission-giver → missions → blueprints structure
  const { giverGroups, ungrouped } = useMemo(() => {
    const giverMap = {};
    const noSource = [];

    for (const bp of (blueprints || [])) {
      // Filter by ownership
      const isOwned = Boolean(bp.owned_by_callsign || bp.owned_by);
      if (showOwned === 'unowned' && isOwned) continue;
      if (showOwned === 'priority' && !bp.is_priority) continue;

      // Filter by search
      if (search) {
        const q = search.toLowerCase();
        const hay = [bp.item_name, bp.category, bp.source_mission_giver, bp.drop_source,
          ...(bp.drop_missions || []).map(d => d.mission_name + ' ' + d.mission_giver)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }

      // If blueprint has structured drop_missions data, use it
      if (bp.drop_missions?.length > 0) {
        for (const dm of bp.drop_missions) {
          const giver = (dm.mission_giver || bp.source_mission_giver || 'UNKNOWN').toUpperCase();
          if (!giverMap[giver]) giverMap[giver] = {};
          const missionKey = dm.mission_name || 'General';
          if (!giverMap[giver][missionKey]) giverMap[giver][missionKey] = { name: dm.mission_name || 'General', dropChance: dm.drop_chance_pct, bpIds: [] };
          if (!giverMap[giver][missionKey].bpIds.includes(bp.id)) {
            giverMap[giver][missionKey].bpIds.push(bp.id);
          }
        }
      } else if (bp.source_mission_giver) {
        // Fallback to source_mission_giver field
        const giver = bp.source_mission_giver.toUpperCase();
        if (!giverMap[giver]) giverMap[giver] = {};
        const missionKey = bp.drop_source || 'General';
        if (!giverMap[giver][missionKey]) giverMap[giver][missionKey] = { name: bp.drop_source || 'General Missions', dropChance: null, bpIds: [] };
        if (!giverMap[giver][missionKey].bpIds.includes(bp.id)) {
          giverMap[giver][missionKey].bpIds.push(bp.id);
        }
      } else {
        noSource.push(bp.id);
      }
    }

    // Convert to array sorted by total blueprints descending
    const groups = Object.entries(giverMap).map(([giver, missions]) => ({
      giver,
      missions: Object.values(missions).sort((a, b) => b.bpIds.length - a.bpIds.length),
      totalBps: Object.values(missions).reduce((s, m) => s + m.bpIds.length, 0),
    })).sort((a, b) => b.totalBps - a.totalBps);

    return { giverGroups: groups, ungrouped: noSource };
  }, [blueprints, search, showOwned]);

  const toggleGiver = (giver) => {
    setExpandedGivers(prev => ({ ...prev, [giver]: !prev[giver] }));
  };

  const expandAll = () => {
    const all = {};
    giverGroups.forEach(g => { all[g.giver] = true; });
    setExpandedGivers(all);
  };

  const collapseAll = () => setExpandedGivers({});

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
        padding: '16px 18px 14px', background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 'clamp(14px, 3vw, 16px)', color: '#E8E4DC',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>BLUEPRINT / MISSION MATRIX</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#5A5850', marginTop: 2, letterSpacing: '0.06em',
            }}>
              {giverGroups.length} mission giver{giverGroups.length !== 1 ? 's' : ''} ·
              Cross-reference where blueprints drop to plan farming runs
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={expandAll} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9 }}>EXPAND ALL</button>
            <button onClick={collapseAll} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9 }}>COLLAPSE</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH MISSIONS, BLUEPRINTS, GIVERS..."
            className="nexus-input"
            style={{ paddingLeft: 30, height: 34, fontSize: 11 }}
          />
        </div>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'ALL BLUEPRINTS' },
            { id: 'unowned', label: 'UNOWNED ONLY' },
            { id: 'priority', label: 'PRIORITY ONLY' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setShowOwned(f.id)}
              style={{
                padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                background: showOwned === f.id ? 'rgba(192,57,43,0.12)' : 'transparent',
                border: `0.5px solid ${showOwned === f.id ? '#C0392B' : 'rgba(200,170,100,0.10)'}`,
                color: showOwned === f.id ? '#E8E4DC' : '#5A5850',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Matrix body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {giverGroups.map(group => (
          <MissionGroup
            key={group.giver}
            giver={group.giver}
            missions={group.missions}
            blueprintMap={bpMap}
            callsign={callsign}
            expanded={expandedGivers[group.giver] || false}
            onToggle={() => toggleGiver(group.giver)}
          />
        ))}

        {/* Blueprints with no source */}
        {ungrouped.length > 0 && (
          <div style={{
            background: '#0F0F0D',
            border: '0.5px solid rgba(200,170,100,0.08)',
            borderLeft: '2px solid #5A5850',
            borderRadius: 2, padding: '12px 14px',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
              color: '#5A5850', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>NO SOURCE DATA ({ungrouped.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ungrouped.slice(0, 10).map(id => {
                const bp = bpMap[id];
                if (!bp) return null;
                return <BlueprintChip key={id} bp={bp} callsign={callsign} />;
              })}
              {ungrouped.length > 10 && (
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  color: '#5A5850', paddingLeft: 16,
                }}>+{ungrouped.length - 10} more without source data</span>
              )}
            </div>
          </div>
        )}

        {giverGroups.length === 0 && ungrouped.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>NO BLUEPRINTS MATCH CURRENT FILTERS</div>
        )}
      </div>
    </div>
  );
}