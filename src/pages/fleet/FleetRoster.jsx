import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Plus, Search, RefreshCw, Ship, Anchor, Package, Users, Wrench, Download } from 'lucide-react';
import ShipCard from './ShipCard';
import AddShipDialog from './AddShipDialog';
import FleetImportDialog from './FleetImportDialog';

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'];
const CLASS_FILTERS = ['ALL', 'FIGHTER', 'HEAVY_FIGHTER', 'MINER', 'HAULER', 'SALVAGER', 'MEDICAL', 'EXPLORER', 'GROUND_VEHICLE', 'OTHER'];

function StatWidget({ icon: Icon, label, value, color, tip }) {
  return (
    <div className="nexus-tooltip" data-tooltip={tip} style={{
      padding: '8px 12px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
      borderRadius: 'var(--r-lg)', minWidth: 90, cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Icon size={10} style={{ color: 'var(--t3)' }} />
        <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

export default function FleetRoster() {
  const [ships, setShips] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    try {
      const [shipsData, membersData] = await Promise.all([
        base44.entities.OrgShip.list('-created_date', 200).catch(() => []),
        listMemberDirectory({ sort: '-joined_at', limit: 200 }).catch(() => []),
      ]);
      setShips(shipsData || []);
      setMembers((membersData || []).filter(m => m.callsign));
    } finally {
      setLoading(false);
    }
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(scheduleRefresh);
    return () => unsub();
  }, [scheduleRefresh]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('fleetyardsRosterSync', {});
      await refreshNow();
    } catch { /* sync failed */ } finally { setSyncing(false); }
  };

  const filtered = ships.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (classFilter !== 'ALL' && s.class !== classFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${s.name} ${s.model} ${s.manufacturer} ${s.assigned_to_callsign || ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: ships.length,
    available: ships.filter(s => s.status === 'AVAILABLE').length,
    assigned: ships.filter(s => s.status === 'ASSIGNED').length,
    maintenance: ships.filter(s => s.status === 'MAINTENANCE').length,
    totalCargo: ships.reduce((sum, s) => sum + (s.cargo_scu || 0), 0),
    pilots: new Set(ships.map(s => s.assigned_to_callsign).filter(Boolean)).size,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>LOADING FLEET ROSTER…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatWidget icon={Ship} label="TOTAL" value={stats.total} color="var(--t0)" tip="Total registered ships" />
        <StatWidget icon={Anchor} label="AVAILABLE" value={stats.available} color="var(--live)" tip="Ready for deployment" />
        <StatWidget icon={Users} label="ASSIGNED" value={stats.assigned} color="var(--warn)" tip="Currently deployed with a pilot" />
        <StatWidget icon={Wrench} label="MAINTENANCE" value={stats.maintenance} color="#FF6B35" tip="Undergoing repairs" />
        <StatWidget icon={Package} label="CARGO CAP" value={`${stats.totalCargo.toLocaleString()}`} color="var(--info)" tip={`${stats.totalCargo.toLocaleString()} SCU total fleet cargo capacity`} />
        <div style={{ flex: 1 }} />
        <button onClick={handleSync} disabled={syncing} className="nexus-btn nexus-tooltip" data-tooltip="Pull latest roster from FleetYards" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={11} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'SYNCING…' : 'SYNC FLEET'}
        </button>
        <button onClick={() => setShowImport(true)} className="nexus-btn nexus-tooltip" data-tooltip="Import ships from HangarXPLOR, FleetYards, or Hangar Helper" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Download size={11} /> IMPORT
        </button>
        <button onClick={() => setDialog('add')} className="nexus-btn nexus-btn-go nexus-tooltip" data-tooltip="Manually register a new ship" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={11} /> ADD SHIP
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
          <input
            className="nexus-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, model, pilot…"
            style={{ paddingLeft: 28, height: 32, fontSize: 10 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} className="nexus-btn" style={{
              padding: '3px 8px', fontSize: 9,
              background: statusFilter === f ? 'var(--bg3)' : 'var(--bg2)',
              borderColor: statusFilter === f ? 'var(--b2)' : 'var(--b0)',
              color: statusFilter === f ? 'var(--t0)' : 'var(--t3)',
            }}>
              {f}
            </button>
          ))}
        </div>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          style={{ height: 28, fontSize: 9, paddingRight: 24 }}
        >
          {CLASS_FILTERS.map(c => <option key={c} value={c}>{c === 'ALL' ? 'ALL CLASSES' : c.replace(/_/g, ' ')}</option>)}
        </select>
        <span style={{ color: 'var(--t3)', fontSize: 9, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{filtered.length} ships</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Ship size={36} style={{ color: 'var(--t3)', opacity: 0.2, marginBottom: 16 }} />
            <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 12 }}>
              {ships.length === 0
                ? 'No ships in the fleet yet. Register your first ship or sync from FleetYards.'
                : 'No ships match the current filters.'}
            </div>
            {ships.length === 0 && (
              <button onClick={() => setDialog('add')} className="nexus-btn nexus-btn-go" style={{ padding: '8px 18px', fontSize: 11 }}>
                <Plus size={12} /> REGISTER FIRST SHIP
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 }}>
            {filtered.map(ship => (
              <ShipCard key={ship.id} ship={ship} onEdit={s => setDialog(s)} onRefresh={refreshNow} />
            ))}
          </div>
        )}
      </div>

      {dialog && (
        <AddShipDialog
          ship={dialog === 'add' ? null : dialog}
          members={members}
          onClose={() => setDialog(null)}
          onSaved={refreshNow}
        />
      )}
      {showImport && (
        <FleetImportDialog
          ownerCallsign={''}
          onClose={() => setShowImport(false)}
          onImported={refreshNow}
        />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
