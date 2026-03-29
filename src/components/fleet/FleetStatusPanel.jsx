/**
 * FleetStatusPanel — Centralized aggregated fleet status view.
 * Shows every ship with status, location, damage indicators, cargo/crew, and pilot assignment.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Search, RefreshCw, Ship } from 'lucide-react';
import FleetStatusKpis from './FleetStatusKpis';
import FleetStatusRow from './FleetStatusRow';
import FleetReadinessBar from './FleetReadinessBar';

const STATUS_ORDER = ['ASSIGNED', 'AVAILABLE', 'MAINTENANCE', 'DESTROYED', 'ARCHIVED'];
const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'];
const CLASS_FILTERS = ['ALL', 'FIGHTER', 'HEAVY_FIGHTER', 'MINER', 'HAULER', 'SALVAGER', 'MEDICAL', 'EXPLORER', 'GROUND_VEHICLE', 'OTHER'];

export default function FleetStatusPanel() {
  const [ships, setShips] = useState([]);
  const [members, setMembers] = useState([]);
  const [opRsvps, setOpRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('status');

  const load = useCallback(async () => {
    const [shipsData, membersData, rsvpData] = await Promise.all([
      base44.entities.OrgShip.list('-created_date', 300).catch(() => []),
      listMemberDirectory({ sort: '-last_seen_at', limit: 200 }).catch(() => []),
      base44.entities.OpRsvp.filter({ status: 'CONFIRMED' }).catch(() => []),
    ]);
    setShips((shipsData || []).filter(s => s.status !== 'ARCHIVED'));
    setMembers(membersData || []);
    setOpRsvps(rsvpData || []);
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsubscribers = [
      base44.entities.OrgShip.subscribe(scheduleRefresh),
      base44.entities.OpRsvp.subscribe(scheduleRefresh),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [scheduleRefresh]);

  // Build a member lookup by callsign for presence data
  const memberMap = useMemo(() => {
    const m = {};
    members.forEach(u => { if (u.callsign) m[u.callsign] = u; });
    return m;
  }, [members]);

  // Build set of callsigns currently on ops
  const activeOnOps = useMemo(() => {
    return new Set(opRsvps.map(r => r.callsign).filter(Boolean));
  }, [opRsvps]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = ships.filter(s => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (classFilter !== 'ALL' && s.class !== classFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return `${s.name} ${s.model} ${s.manufacturer} ${s.assigned_to_callsign || ''} ${s.notes || ''}`.toLowerCase().includes(q);
      }
      return true;
    });

    if (sortBy === 'status') {
      result.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'class') {
      result.sort((a, b) => (a.class || '').localeCompare(b.class || ''));
    } else if (sortBy === 'cargo') {
      result.sort((a, b) => (b.cargo_scu || 0) - (a.cargo_scu || 0));
    } else if (sortBy === 'value') {
      result.sort((a, b) => (b.estimated_value_aUEC || 0) - (a.estimated_value_aUEC || 0));
    }

    return result;
  }, [ships, statusFilter, classFilter, search, sortBy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>LOADING FLEET STATUS…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* KPI bar */}
      <FleetStatusKpis ships={ships} members={members} activeOnOps={activeOnOps} />

      {/* Readiness bar */}
      <FleetReadinessBar ships={ships} />

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)', background: '#0A0908',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ship, model, pilot…"
            style={{ width: '100%', paddingLeft: 28, height: 30, fontSize: 10 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              background: statusFilter === f ? 'rgba(200,168,75,0.12)' : 'transparent',
              border: `0.5px solid ${statusFilter === f ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
              color: statusFilter === f ? '#C8A84B' : '#5A5850', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{f}</button>
          ))}
        </div>

        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          style={{ height: 28, fontSize: 9, paddingRight: 24 }}>
          {CLASS_FILTERS.map(c => <option key={c} value={c}>{c === 'ALL' ? 'ALL CLASSES' : c.replace(/_/g, ' ')}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ height: 28, fontSize: 9, paddingRight: 24 }}>
          <option value="status">Sort: Status</option>
          <option value="name">Sort: Name</option>
          <option value="class">Sort: Class</option>
          <option value="cargo">Sort: Cargo</option>
          <option value="value">Sort: Value</option>
        </select>

        <div style={{ flex: 1 }} />
        <span style={{ color: '#5A5850', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{filtered.length} ships</span>
        <button onClick={refreshNow} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2, display: 'flex',
        }}><RefreshCw size={12} /></button>
      </div>

      {/* Ship table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Ship size={32} style={{ color: '#5A5850', opacity: 0.15, marginBottom: 12 }} />
            <div style={{ color: '#5A5850', fontSize: 11 }}>
              {ships.length === 0 ? 'No ships in the fleet.' : 'No ships match current filters.'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
            <thead>
              <tr>
                {['STATUS', 'SHIP', 'CLASS', 'PILOT', 'CARGO', 'CREW', 'READINESS', 'VALUE', 'NOTES'].map(h => (
                  <th key={h} style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
                    color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '8px 8px 6px', textAlign: h === 'NOTES' ? 'left' : (
                      ['CARGO', 'CREW', 'VALUE'].includes(h) ? 'right' : 'left'
                    ),
                    borderBottom: '0.5px solid rgba(200,170,100,0.10)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ship => (
                <FleetStatusRow
                  key={ship.id}
                  ship={ship}
                  member={memberMap[ship.assigned_to_callsign]}
                  isOnOp={activeOnOps.has(ship.assigned_to_callsign)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
