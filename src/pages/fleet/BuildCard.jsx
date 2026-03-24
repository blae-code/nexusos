import React from 'react';
import { ExternalLink, Star, Trash2, Edit2 } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

export default function BuildCard({ build, onEdit, onRefresh }) {
  const handleDelete = async () => {
    if (!window.confirm(`Delete build "${build.build_name}"?`)) return;
    await base44.entities.FleetBuild.delete(build.id);
    onRefresh?.();
  };

  const handleToggleCanonical = async () => {
    await base44.entities.FleetBuild.update(build.id, { is_org_canonical: !build.is_org_canonical });
    onRefresh?.();
  };

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${build.is_org_canonical ? '#4AE830' : '#C0392B'}`,
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E8E4DC', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {build.build_name}
          </div>
          <div style={{ color: '#9A9488', fontSize: 10, marginTop: 2 }}>
            {build.ship_name}{build.role_tag ? ` · ${build.role_tag}` : ''}
          </div>
        </div>
        {build.is_org_canonical && (
          <span style={{
            fontSize: 8, padding: '2px 6px',
            background: 'rgba(74,140,92,0.12)', border: '0.5px solid rgba(74,140,92,0.3)',
            borderRadius: 2, color: '#4A8C5C', letterSpacing: '0.08em', fontWeight: 600,
          }}>
            ORG STANDARD
          </span>
        )}
      </div>

      {/* Stats */}
      {build.stats_snapshot && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {Object.entries(build.stats_snapshot).filter(([k]) => k !== 'readiness_score' && k !== 'delta_stats').slice(0, 6).map(([key, value]) => (
            <div key={key} style={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 2, padding: '5px 8px' }}>
              <div style={{ color: '#5A5850', fontSize: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
              <div style={{ color: '#E8E4DC', fontSize: 11, fontWeight: 500, marginTop: 1 }}>{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5A5850', fontSize: 9 }}>
        <span>By {build.created_by_callsign || 'UNKNOWN'}</span>
        {build.patch_version && <span>· v{build.patch_version}</span>}
        {build.patch_locked && <span style={{ color: '#C8A84B' }}>🔒 LOCKED</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={handleToggleCanonical} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9, flex: 1 }}>
          <Star size={9} /> {build.is_org_canonical ? 'REMOVE STANDARD' : 'SET AS STANDARD'}
        </button>
        {build.build_url && (
          <a href={build.build_url} target="_blank" rel="noopener noreferrer" className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9, textDecoration: 'none' }}>
            <ExternalLink size={9} /> LINK
          </a>
        )}
        <button onClick={() => onEdit?.(build)} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9 }}>
          <Edit2 size={9} />
        </button>
        <button onClick={handleDelete} className="nexus-btn danger-btn" style={{ padding: '4px 8px', fontSize: 9 }}>
          <Trash2 size={9} />
        </button>
      </div>
    </div>
  );
}