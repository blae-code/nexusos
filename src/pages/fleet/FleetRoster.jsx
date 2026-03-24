import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, Search, RefreshCw } from 'lucide-react';
import ShipCard from './ShipCard';
import AddShipDialog from './AddShipDialog';

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'];
const CLASS_FILTERS = ['ALL', 'FIGHTER', 'HEAVY_FIGHTER', 'MINER', 'HAULER', 'SALVAGER', 'MEDICAL', 'EXPLORER', 'GROUND_VEHICLE', 'OTHER'];

export default function FleetRoster() {
  const [ships, setShips] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null); // null | 'add' | ship object

  const load = useCallback(async () => {
    try {
      const [shipsData, membersData] = await Promise.all([
        base44.entities.OrgShip.list('-created_date', 200),
        base44.entities.NexusUser.list('-joined_at', 200),
      ]);
      setShips(shipsData || []);
      setMembers((membersData || []).filter(m => m.callsign));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('fleetyardsRosterSync', {});
      await load();
    } catch {
      // sync failed silently
    } finally {
      setSyncing(false);
    }
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
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0, flexWrap: 'wrap' }}>
        {[
          { label: 'TOTAL', value: stats.total, color: '#E8E4DC' },
          { label: 'AVAILABLE', value: stats.available, color: '#4AE830' },
          { label: 'ASSIGNED', value: stats.assigned, color: '#C8A84B' },
          { label: 'MAINT.', value: stats.maintenance, color: '#FF6B35' },
          { label: 'CARGO', value: `${stats.totalCargo.toLocaleString()} SCU`, color: '#5297FF' },
        ].map(s => (
          <div key={s.label} style={{ padding: '6px 10px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 3, minWidth: 80 }}>
            <div style={{ color: '#5A5850', fontSize: 7, letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={handleSync} disabled={syncing} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }}>
            <RefreshCw size={10} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'SYNCING' : 'SYNC'}
          </button>
          <button onClick={() => setDialog('add')} className="nexus-btn primary" style={{ padding: '6px 12px', fontSize: 10 }}>
            <Plus size={10} /> ADD SHIP
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)', background: '#0A0908', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: 8, color: '#5A5850' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ships..."
            style={{ width: '100%', paddingLeft: 26, background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, color: '#E8E4DC', fontSize: 10, padding: '6px 8px 6px 26px', fontFamily: "'Barlow Condensed', sans-serif" }}
          />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: '0.06em',
              background: statusFilter === f ? '#1A1A16' : 'transparent',
              border: `0.5px solid ${statusFilter === f ? 'rgba(200,170,100,0.15)' : 'transparent'}`,
              color: statusFilter === f ? '#E8E4DC' : '#5A5850',
            }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ width: '0.5px', height: 14, background: 'rgba(200,170,100,0.10)' }} />
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          style={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, color: '#9A9488', fontSize: 9, padding: '4px 8px', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {CLASS_FILTERS.map(c => <option key={c} value={c}>{c === 'ALL' ? 'ALL CLASSES' : c.replace('_', ' ')}</option>)}
        </select>
        <span style={{ color: '#5A5850', fontSize: 9, marginLeft: 'auto' }}>{filtered.length} ships</span>
      </div>

      {/* Ship grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#5A5850' }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              {ships.length === 0 ? 'No ships registered. Add ships manually or sync from FleetYards.' : 'No ships match current filters.'}
            </div>
            {ships.length === 0 && (
              <button onClick={() => setDialog('add')} className="nexus-btn primary" style={{ padding: '8px 16px', fontSize: 11 }}>
                <Plus size={11} /> ADD FIRST SHIP
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filtered.map(ship => (
              <ShipCard key={ship.id} ship={ship} onEdit={(s) => setDialog(s)} onRefresh={load} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialog && (
        <AddShipDialog
          ship={dialog === 'add' ? null : dialog}
          members={members}
          onClose={() => setDialog(null)}
          onSaved={load}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}