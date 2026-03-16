import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Archive } from 'lucide-react';

const TYPE_BADGES = {
  RAW:     { color: 'var(--warn)',  label: 'RAW' },
  REFINED: { color: 'var(--cyan)',  label: 'REFINED' },
  SALVAGE: { color: '#a855f7',      label: 'SALVAGE' },
  CRAFTED: { color: 'var(--live)',  label: 'CRAFTED' },
  OTHER:   { color: 'var(--t2)',    label: 'OTHER' },
};

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MaterialsTab({ materials, onRefresh }) {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [t2Filter, setT2Filter] = useState(false);

  const filtered = useMemo(() => {
    return (materials || []).filter(m => {
      if (!m) return false;
      const nameMatch = !searchText || m.material_name?.toLowerCase().includes(searchText.toLowerCase());
      const typeMatch = typeFilter === 'all' || m.material_type === typeFilter;
      const t2Match = !t2Filter || m.t2_eligible;
      return nameMatch && typeMatch && t2Match;
    });
  }, [materials, searchText, typeFilter, t2Filter]);

  const handleArchive = async (id) => {
    await base44.entities.Material.update(id, { is_archived: true });
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search materials…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '6px 10px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t0)',
            fontSize: 10,
            fontFamily: 'inherit',
          }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t1)',
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_BADGES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t1)', fontSize: 10 }}>
          <input
            type="checkbox"
            checked={t2Filter}
            onChange={e => setT2Filter(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          T2 Eligible Only
        </label>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10 }}>
          <Plus size={10} style={{ marginRight: 4 }} /> Add Material
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
              {['Name', 'Type', 'Qty SCU', 'Quality', 'T2', 'Location', 'Container', 'Logged By', 'Logged At', 'Action'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const typeInfo = TYPE_BADGES[m.material_type] || TYPE_BADGES.OTHER;
              const quality = m.quality_pct || 0;
              return (
                <tr key={m.id} style={{ borderBottom: '0.5px solid var(--b0)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--t0)', fontSize: 11 }}>{m.material_name}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      color: typeInfo.color,
                      background: `${typeInfo.color}22`,
                      border: `0.5px solid ${typeInfo.color}55`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                    }}>
                      {typeInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 11, fontFamily: 'monospace' }}>
                    {m.quantity_scu?.toFixed(1)}
                  </td>
                  <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 40, height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${quality}%`, height: '100%', background: quality >= 80 ? 'var(--live)' : 'var(--warn)' }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--t1)' }}>
                      {quality.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    {m.t2_eligible ? '✓' : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>{m.location || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>{m.container || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>{m.logged_by || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--t2)', fontSize: 9, fontFamily: 'monospace' }}>
                    {relativeTime(m.logged_at)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={() => handleArchive(m.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--t2)',
                        display: 'flex',
                      }}
                      title="Archive"
                    >
                      <Archive size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No materials found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}