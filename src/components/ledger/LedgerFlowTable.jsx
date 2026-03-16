import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

const TYPE_COLORS = {
  RAW:     'var(--warn)',
  REFINED: 'var(--live)',
  SALVAGE: 'var(--info)',
  CRAFTED: 'var(--acc2)',
  OTHER:   'var(--t2)',
};

const STAGE_MAP = {
  RAW:     'ACQUIRED',
  SALVAGE: 'ACQUIRED',
  REFINED: 'STOCKPILED',
  CRAFTED: 'ARMORY',
  OTHER:   'MISC',
};

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function MaterialRow({ m, onArchive }) {
  const q = m.quality_pct || 0;
  const qColor = q >= 80 ? 'var(--live)' : q >= 60 ? 'var(--info)' : q >= 40 ? 'var(--warn)' : 'var(--danger)';
  const typeColor = TYPE_COLORS[m.material_type] || 'var(--t2)';
  const stage = STAGE_MAP[m.material_type] || 'MISC';

  const ago = (() => {
    const d = m.logged_at || m.created_date;
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)', opacity: m.is_archived ? 0.4 : 1 }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '7px 14px' }}>
        <span className="nexus-tag" style={{ color: typeColor, borderColor: 'transparent', background: 'transparent', fontSize: 9 }}>
          {m.material_type}
        </span>
      </td>
      <td style={{ padding: '7px 14px', color: 'var(--t0)', fontSize: 11, maxWidth: 160 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_name}</div>
      </td>
      <td style={{ padding: '7px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 48, height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${q}%`, background: qColor, borderRadius: 2 }} />
          </div>
          <span style={{ color: qColor, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{q.toFixed(0)}%</span>
        </div>
      </td>
      <td style={{ padding: '7px 14px', color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{(m.quantity_scu || 0).toFixed(1)}</td>
      <td style={{ padding: '7px 14px' }}>
        {q >= 80 ? (
          <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.25)', background: 'rgba(39,201,106,0.07)', fontSize: 9 }}>CRAFT-READY</span>
        ) : m.material_type === 'RAW' ? (
          <span className="nexus-tag" style={{ color: 'var(--info)', borderColor: 'rgba(74,143,208,0.25)', background: 'rgba(74,143,208,0.07)', fontSize: 9 }}>NEEDS REFINING</span>
        ) : (
          <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(232,160,32,0.25)', background: 'rgba(232,160,32,0.07)', fontSize: 9 }}>BELOW T2</span>
        )}
      </td>
      <td style={{ padding: '7px 14px', color: 'var(--t2)', fontSize: 10 }}>{stage}</td>
      <td style={{ padding: '7px 14px', color: 'var(--t1)', fontSize: 11 }}>{m.logged_by_callsign || m.logged_by || '—'}</td>
      <td style={{ padding: '7px 14px', color: 'var(--t2)', fontSize: 10 }}>{ago}</td>
      <td style={{ padding: '7px 14px', color: 'var(--t1)', fontSize: 11 }}>{m.location || '—'}</td>
      <td style={{ padding: '7px 14px' }}>
        <span className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b1)', background: 'transparent', fontSize: 9 }}>{m.source_type || 'MANUAL'}</span>
      </td>
      <td style={{ padding: '7px 14px' }}>
        {!m.is_archived && (
          <button onClick={() => onArchive(m.id)} className="nexus-btn" style={{ padding: '2px 7px', fontSize: 9, color: 'var(--t2)' }}>
            ARCHIVE
          </button>
        )}
      </td>
    </tr>
  );
}

export default function LedgerFlowTable({ materials, refineryOrders, onRefresh }) {
  const [typeFilter, setTypeFilter]   = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [search, setSearch]           = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    return materials.filter(m => {
      if (!showArchived && m.is_archived) return false;
      if (typeFilter !== 'ALL' && m.material_type !== typeFilter) return false;
      if (stageFilter !== 'ALL' && STAGE_MAP[m.material_type] !== stageFilter) return false;
      if (search && !m.material_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [materials, typeFilter, stageFilter, search, showArchived]);

  const handleArchive = async (id) => {
    await base44.entities.Material.update(id, { is_archived: true });
    onRefresh();
  };

  const types  = ['ALL', 'RAW', 'REFINED', 'SALVAGE', 'CRAFTED', 'OTHER'];
  const stages = ['ALL', 'ACQUIRED', 'STOCKPILED', 'ARMORY', 'MISC'];

  // Refinery pipeline strip
  const activeRO = refineryOrders.filter(r => r.status === 'ACTIVE');
  const readyRO  = refineryOrders.filter(r => r.status === 'READY');

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Refinery pipeline strip */}
      {(activeRO.length > 0 || readyRO.length > 0) && (
        <div>
          <SectionHeader label="REFINERY IN PROGRESS" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {readyRO.map(o => (
              <div key={o.id} style={{ background: 'rgba(39,201,106,0.07)', border: '0.5px solid rgba(39,201,106,0.25)', borderRadius: 6, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)' }} />
                <span style={{ color: 'var(--t0)', fontSize: 11 }}>{o.material_name}</span>
                <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 500 }}>READY</span>
                <span style={{ color: 'var(--t2)', fontSize: 10 }}>{o.quantity_scu} SCU</span>
              </div>
            ))}
            {activeRO.map(o => {
              const diff = o.completes_at ? new Date(o.completes_at).getTime() - Date.now() : null;
              const tl = diff > 0 ? (() => { const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m`; })() : 'READY';
              return (
                <div key={o.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 6, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--info)' }} />
                  <span style={{ color: 'var(--t1)', fontSize: 11 }}>{o.material_name}</span>
                  <span style={{ color: 'var(--info)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{tl}</span>
                  <span style={{ color: 'var(--t2)', fontSize: 10 }}>{o.quantity_scu} SCU</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="nexus-input"
          placeholder="Search material..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 180, fontSize: 11, padding: '5px 10px' }}
        />
        <div style={{ display: 'flex', gap: 3 }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className="nexus-btn" style={{
              padding: '3px 8px', fontSize: 9,
              background: typeFilter === t ? 'var(--bg4)' : 'var(--bg2)',
              borderColor: typeFilter === t ? 'var(--b3)' : 'var(--b1)',
              color: typeFilter === t ? 'var(--t0)' : 'var(--t2)',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {stages.map(s => (
            <button key={s} onClick={() => setStageFilter(s)} className="nexus-btn" style={{
              padding: '3px 8px', fontSize: 9,
              background: stageFilter === s ? 'var(--bg4)' : 'var(--bg2)',
              borderColor: stageFilter === s ? 'var(--b3)' : 'var(--b1)',
              color: stageFilter === s ? 'var(--t0)' : 'var(--t2)',
            }}>{s}</button>
          ))}
        </div>
        <button onClick={() => setShowArchived(a => !a)} className="nexus-btn" style={{
          padding: '3px 8px', fontSize: 9,
          color: showArchived ? 'var(--warn)' : 'var(--t2)',
          borderColor: showArchived ? 'rgba(232,160,32,0.3)' : 'var(--b1)',
        }}>
          {showArchived ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'}
        </button>
        <span style={{ color: 'var(--t2)', fontSize: 10, marginLeft: 'auto' }}>{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['TYPE', 'MATERIAL', 'QUALITY', 'SCU', 'STATUS', 'STAGE', 'LOGGED BY', 'AGE', 'LOCATION', 'SOURCE', ''].map(h => (
                <th key={h} style={{ padding: '7px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 500, borderBottom: '0.5px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => <MaterialRow key={m.id} m={m} onArchive={handleArchive} />)}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No materials match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
