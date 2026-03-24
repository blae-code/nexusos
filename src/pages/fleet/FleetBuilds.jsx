import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, Search } from 'lucide-react';
import BuildCard from './BuildCard';
import AddBuildDialog from './AddBuildDialog';

const LEVEL_FILTERS = ['ALL', 'ORG STANDARD', 'PERSONAL'];

export default function FleetBuilds() {
  const [builds, setBuilds] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('ALL');
  const [dialog, setDialog] = useState(null); // null | 'add' | build object

  const load = useCallback(async () => {
    try {
      const [buildsData, shipsData] = await Promise.all([
        base44.entities.FleetBuild.list('-created_date', 200),
        base44.entities.OrgShip.list('name', 200),
      ]);
      setBuilds(buildsData || []);
      setShips(shipsData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.FleetBuild.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const filtered = builds.filter(b => {
    if (level === 'ORG STANDARD' && !b.is_org_canonical) return false;
    if (level === 'PERSONAL' && b.is_org_canonical) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${b.ship_name} ${b.build_name} ${b.role_tag || ''} ${b.created_by_callsign || ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by ship name
  const grouped = {};
  filtered.forEach(b => {
    const key = b.ship_name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: 8, color: '#5A5850' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search builds..."
            style={{ width: '100%', paddingLeft: 26, background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, color: '#E8E4DC', fontSize: 10, padding: '6px 8px 6px 26px', fontFamily: "'Barlow Condensed', sans-serif" }}
          />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {LEVEL_FILTERS.map(f => (
            <button key={f} onClick={() => setLevel(f)} style={{
              padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: '0.06em',
              background: level === f ? '#1A1A16' : 'transparent',
              border: `0.5px solid ${level === f ? 'rgba(200,170,100,0.15)' : 'transparent'}`,
              color: level === f ? '#E8E4DC' : '#5A5850',
            }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#5A5850', fontSize: 9 }}>{filtered.length} builds</span>
        <button onClick={() => setDialog('add')} className="nexus-btn primary" style={{ padding: '6px 12px', fontSize: 10 }}>
          <Plus size={10} /> NEW BUILD
        </button>
      </div>

      {/* Build grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#5A5850' }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              {builds.length === 0 ? 'No builds saved yet. Create one to start tracking loadouts.' : 'No builds match current filters.'}
            </div>
            {builds.length === 0 && (
              <button onClick={() => setDialog('add')} className="nexus-btn primary" style={{ padding: '8px 16px', fontSize: 11 }}>
                <Plus size={11} /> CREATE FIRST BUILD
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([shipName, shipBuilds]) => (
            <div key={shipName} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
                {shipName} ({shipBuilds.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                {shipBuilds.map(b => (
                  <BuildCard key={b.id} build={b} onEdit={(bld) => setDialog(bld)} onRefresh={load} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      {dialog && (
        <AddBuildDialog
          build={dialog === 'add' ? null : dialog}
          ships={ships}
          onClose={() => setDialog(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}