/**
 * ShipList — displays ships with mission readiness scores and equipment loadout.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Ship } from 'lucide-react';

const STATUS_COLORS = {
  AVAILABLE: '#4A8C5C', ASSIGNED: '#3498DB', MAINTENANCE: '#C8A84B',
  DESTROYED: '#C0392B', ARCHIVED: '#5A5850',
};

const READINESS_DIMS = [
  { key: 'combat',      label: 'CMB', color: '#C0392B' },
  { key: 'mining',      label: 'MIN', color: '#C8A84B' },
  { key: 'hauling',     label: 'HAL', color: '#3498DB' },
  { key: 'salvage',     label: 'SAL', color: '#8E44AD' },
  { key: 'exploration', label: 'EXP', color: '#27AE60' },
  { key: 'medical',     label: 'MED', color: '#E8A020' },
];

function ReadinessBar({ dim, value }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const opacity = pct === 0 ? 0.2 : 1;
  return (
    <div style={{ flex: 1, minWidth: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 7, color: '#5A5850', letterSpacing: '0.06em' }}>{dim.label}</span>
        <span style={{ fontSize: 7, color: pct >= 70 ? dim.color : '#5A5850', opacity }}>{pct}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(200,170,100,0.08)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: dim.color, opacity, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function LoadoutSlot({ slot }) {
  const equipped = slot.equipped_name;
  const statusColor = slot.status === 'DAMAGED' ? '#C0392B' : slot.status === 'MISSING' ? '#C8A84B' : '#4A8C5C';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 0.6fr',
      gap: 6, padding: '3px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      fontSize: 9, alignItems: 'center',
    }}>
      <span style={{ color: '#5A5850', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {slot.slot_name}{slot.slot_size ? ` S${slot.slot_size}` : ''}
      </span>
      <span style={{ color: equipped ? '#E8E4DC' : '#3A3A38', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {equipped
          ? `${slot.equipped_manufacturer ? slot.equipped_manufacturer + ' ' : ''}${equipped}${slot.equipped_size ? ` (S${slot.equipped_size})` : ''}`
          : 'Empty'}
      </span>
      {slot.status && (
        <span style={{ fontSize: 7, color: statusColor, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em' }}>
          {slot.status}
        </span>
      )}
    </div>
  );
}

function groupLoadout(slots) {
  const groups = {};
  for (const slot of slots) {
    const cat = slot.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(slot);
  }
  return groups;
}

function ShipCard({ ship, scope }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_COLORS[ship.status] || '#5A5850';
  const readiness = ship.mission_readiness || {};
  const hasReadiness = Object.keys(readiness).length > 0;
  const loadout = Array.isArray(ship.equipment_loadout) ? ship.equipment_loadout : [];
  const hasLoadout = loadout.length > 0;
  const canExpand = hasReadiness || hasLoadout;

  const loadoutGroups = useMemo(() => groupLoadout(loadout), [loadout]);

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${sc}`,
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2,
    }}>
      <div
        style={{ padding: 14, cursor: canExpand ? 'pointer' : 'default' }}
        onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {canExpand && (
              expanded
                ? <ChevronDown size={10} style={{ color: '#5A5850', flexShrink: 0 }} />
                : <ChevronRight size={10} style={{ color: '#5A5850', flexShrink: 0 }} />
            )}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
              fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.04em',
            }}>{ship.name}</div>
          </div>
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
            color: sc, background: `${sc}18`, border: `0.5px solid ${sc}40`,
          }}>{ship.status}</span>
        </div>
        <div style={{ fontSize: 11, color: '#9A9488', marginBottom: 4 }}>{ship.model}</div>
        {ship.manufacturer && <div style={{ fontSize: 9, color: '#5A5850' }}>{ship.manufacturer}</div>}
        {scope === 'org' && ship.assigned_to_callsign && (
          <div style={{ fontSize: 9, color: '#C8A84B', marginTop: 4 }}>
            Custody: {ship.assigned_to_callsign}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#5A5850' }}>
          {ship.cargo_scu > 0 && <span>Cargo: <span style={{ color: '#C8A84B' }}>{ship.cargo_scu} SCU</span></span>}
          {ship.crew_size > 0 && <span>Crew: <span style={{ color: '#9A9488' }}>{ship.crew_size}</span></span>}
          {ship.class && <span style={{ color: '#3498DB' }}>{ship.class}</span>}
        </div>

        {hasReadiness && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {READINESS_DIMS.map((dim) => (
              <ReadinessBar key={dim.key} dim={dim} value={readiness[dim.key]} />
            ))}
          </div>
        )}
      </div>

      {expanded && hasLoadout && (
        <div style={{ padding: '0 14px 12px', borderTop: '0.5px solid rgba(200,170,100,0.06)' }}>
          <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.12em', margin: '8px 0 6px', fontFamily: "'Barlow Condensed', sans-serif" }}>
            EQUIPMENT LOADOUT
          </div>
          {Object.entries(loadoutGroups).map(([cat, slots]) => (
            <div key={cat} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: '#3498DB', letterSpacing: '0.12em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>
                {cat.toUpperCase()}
              </div>
              {slots.map((slot, i) => (
                <LoadoutSlot key={i} slot={slot} />
              ))}
            </div>
          ))}
          {ship.loadout_synced_at && (
            <div style={{ fontSize: 8, color: '#3A3A38', marginTop: 6 }}>
              Synced {new Date(ship.loadout_synced_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {expanded && hasReadiness && !hasLoadout && (
        <div style={{ padding: '4px 14px 10px', borderTop: '0.5px solid rgba(200,170,100,0.06)' }}>
          <div style={{ fontSize: 9, color: '#3A3A38', paddingTop: 6 }}>No equipment loadout logged for this vessel.</div>
        </div>
      )}
    </div>
  );
}

export default function ShipList({ ships, search, scope = 'me' }) {
  const q = (search || '').toLowerCase();
  const filtered = useMemo(() =>
    ships.filter((ship) => {
      if (!q) return true;
      const haystack = [
        ship.name, ship.model, ship.manufacturer,
        ship.assigned_to_callsign, ship.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }),
    [ships, q]
  );

  if (filtered.length === 0) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
      }}>
        <Ship size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
        <div>{search ? 'No ships match your search' : scope === 'org' ? 'No org ships logged yet' : 'No ships assigned to you'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
      {filtered.map((s) => (
        <ShipCard key={s.id} ship={s} scope={scope} />
      ))}
    </div>
  );
}
