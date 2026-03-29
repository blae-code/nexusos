/**
 * ShipLoadoutsTab — browse org ships and inspect/edit equipment loadouts
 * with mission readiness visualization per ship.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Search, Crosshair, ChevronRight } from 'lucide-react';
import ShipLoadoutPanel from '@/components/fleet/ShipLoadoutPanel';
import ShipMissionReadiness from '@/components/fleet/ShipMissionReadiness';
import EmptyState from '@/core/design/EmptyState';

const CLASS_LABELS = {
  FIGHTER: '⚔️', HEAVY_FIGHTER: '⚔️', MINER: '⛏️', HAULER: '📦',
  SALVAGER: '♻️', MEDICAL: '✚', EXPLORER: '🔭', GROUND_VEHICLE: '🚗', OTHER: '🛸',
};

const STATUS_DOT = {
  AVAILABLE: 'var(--live)', ASSIGNED: 'var(--warn)', MAINTENANCE: '#FF6B35',
  DESTROYED: 'var(--danger)', ARCHIVED: 'var(--t3)',
};

export default function ShipLoadoutsTab() {
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    const data = await base44.entities.OrgShip.list('name', 500).catch(() => []);
    setShips(data || []);
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(scheduleRefresh);
    return () => unsub();
  }, [scheduleRefresh]);

  const filtered = ships.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q)
      || (s.model || '').toLowerCase().includes(q)
      || (s.class || '').toLowerCase().includes(q);
  });

  const selected = ships.find(s => s.id === selectedId) || null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t2)' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Ship list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--b0)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={11} style={{ color: 'var(--t3)' }} />
          <input
            className="nexus-input"
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ships..."
            style={{ flex: 1, padding: '5px 8px', fontSize: 10, border: 'none', background: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 10 }}>No ships found</div>
          ) : (
            filtered.map(s => {
              const isActive = s.id === selectedId;
              const loadoutCount = (s.equipment_loadout || []).length;
              const equipped = (s.equipment_loadout || []).filter(sl => sl.equipped_name).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 12px', border: 'none', textAlign: 'left',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    background: isActive ? 'var(--bg3)' : 'transparent',
                    borderLeft: isActive ? '2px solid #C0392B' : '2px solid transparent',
                    borderBottom: '0.5px solid var(--b0)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 16 }}>{CLASS_LABELS[s.class] || '🛸'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isActive ? 'var(--t0)' : 'var(--t1)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </div>
                    <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>
                      {s.model}{loadoutCount > 0 ? ` · ${equipped}/${loadoutCount} equipped` : ''}
                    </div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[s.status] || 'var(--t3)', flexShrink: 0 }} />
                  <ChevronRight size={10} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <EmptyState
              icon={Crosshair}
              title="Select a ship"
              detail="Choose a ship from the roster to view and manage its equipment loadout and mission readiness."
            />
          </div>
        ) : (
          <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Ship header */}
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{CLASS_LABELS[selected.class] || '🛸'}</span>
                <div>
                  <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>{selected.name}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                    {selected.manufacturer ? `${selected.manufacturer} ` : ''}{selected.model} · {selected.cargo_scu || 0} SCU · Crew {selected.crew_size || '?'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mission readiness */}
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--b0)' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginBottom: 8 }}>MISSION READINESS</div>
              <ShipMissionReadiness ship={selected} />
            </div>

            {/* Equipment loadout */}
            <ShipLoadoutPanel ship={selected} onRefresh={refreshNow} />
          </div>
        )}
      </div>
    </div>
  );
}
