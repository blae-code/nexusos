import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, Search, Layers, Star, Tag } from 'lucide-react';
import BuildCard from './BuildCard';
import AddBuildDialog from './AddBuildDialog';

const LEVEL_FILTERS = ['ALL', 'ORG STANDARD', 'PERSONAL'];

function BuildSummaryWidget({ builds }) {
  const orgStandard = builds.filter(b => b.is_org_canonical).length;
  const personal = builds.length - orgStandard;
  const uniqueShips = new Set(builds.map(b => b.ship_name)).size;
  const roles = new Set(builds.map(b => b.role_tag).filter(Boolean));

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { icon: Layers, label: 'TOTAL', value: builds.length, color: 'var(--t0)', tip: 'Total saved builds' },
        { icon: Star, label: 'ORG STD', value: orgStandard, color: 'var(--live)', tip: 'Builds flagged as org-recommended' },
        { icon: Tag, label: 'PERSONAL', value: personal, color: 'var(--t2)', tip: 'Personal builds' },
        { icon: Layers, label: 'SHIPS', value: uniqueShips, color: 'var(--acc)', tip: 'Unique ship models with builds' },
      ].map(s => (
        <div key={s.label} className="nexus-tooltip" data-tooltip={s.tip} style={{
          padding: '6px 10px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
          borderRadius: 'var(--r-lg)', cursor: 'default', minWidth: 70,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
            <s.icon size={9} style={{ color: 'var(--t3)' }} />
            <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>{s.label}</span>
          </div>
          <div style={{ color: s.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function FleetBuilds() {
  const [builds, setBuilds] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('ALL');
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [buildsData, shipsData] = await Promise.all([
        base44.entities.FleetBuild.list('-created_date', 200),
        base44.entities.OrgShip.list('name', 200),
      ]);
      setBuilds(buildsData || []);
      setShips(shipsData || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.FleetBuild.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const filtered = useMemo(() => builds.filter(b => {
    if (level === 'ORG STANDARD' && !b.is_org_canonical) return false;
    if (level === 'PERSONAL' && b.is_org_canonical) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${b.ship_name} ${b.build_name} ${b.role_tag || ''} ${b.created_by_callsign || ''}`.toLowerCase().includes(q);
    }
    return true;
  }), [builds, level, search]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(b => {
      const key = b.ship_name || 'Unknown';
      if (!g[key]) g[key] = [];
      g[key].push(b);
    });
    return g;
  }, [filtered]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>LOADING BUILD LIBRARY…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <BuildSummaryWidget builds={builds} />
          <div style={{ flex: 1 }} />
          <button onClick={() => setDialog('add')} className="nexus-btn nexus-btn-go nexus-tooltip" data-tooltip="Save a new ship loadout" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={11} /> NEW BUILD
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
            <input
              className="nexus-input"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by ship, build name, role, creator…"
              style={{ paddingLeft: 28, height: 32, fontSize: 10 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {LEVEL_FILTERS.map(f => (
              <button key={f} onClick={() => setLevel(f)} className="nexus-btn" style={{
                padding: '3px 8px', fontSize: 9,
                background: level === f ? 'var(--bg3)' : 'var(--bg2)',
                borderColor: level === f ? 'var(--b2)' : 'var(--b0)',
                color: level === f ? 'var(--t0)' : 'var(--t3)',
              }}>
                {f}
              </button>
            ))}
          </div>
          <span style={{ color: 'var(--t3)', fontSize: 9, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{filtered.length} builds</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Layers size={36} style={{ color: 'var(--t3)', opacity: 0.15, marginBottom: 16 }} />
            <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 12 }}>
              {builds.length === 0
                ? 'No builds saved yet. Create a build to start tracking ship loadouts and fitting recommendations.'
                : 'No builds match the current filters.'}
            </div>
            {builds.length === 0 && (
              <button onClick={() => setDialog('add')} className="nexus-btn nexus-btn-go" style={{ padding: '8px 18px', fontSize: 11 }}>
                <Plus size={12} /> CREATE FIRST BUILD
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([shipName, shipBuilds]) => (
            <div key={shipName} style={{ marginBottom: 20 }}>
              <div className="nexus-section-header" style={{ marginBottom: 10 }}>
                {shipName} ({shipBuilds.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 }}>
                {shipBuilds.map(b => (
                  <BuildCard key={b.id} build={b} onEdit={bld => setDialog(bld)} onRefresh={load} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

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