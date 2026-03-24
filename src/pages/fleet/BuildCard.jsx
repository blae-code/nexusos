import React from 'react';
import { ExternalLink, Star, Trash2, Edit2, Lock, Tag } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

const ROLE_COLORS = {
  Mining: 'var(--warn)', Combat: 'var(--danger)', Hauling: 'var(--info)',
  Exploration: '#9DA1CD', Salvage: 'var(--live)', Racing: '#FF6B35',
  Support: 'var(--t2)', 'Multi-Role': 'var(--acc)',
};

export default function BuildCard({ build, onEdit, onRefresh }) {
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${build.build_name}"? This cannot be undone.`)) return;
    await base44.entities.FleetBuild.delete(build.id);
    onRefresh?.();
  };

  const handleToggleCanonical = async () => {
    await base44.entities.FleetBuild.update(build.id, { is_org_canonical: !build.is_org_canonical });
    onRefresh?.();
  };

  const roleColor = ROLE_COLORS[build.role_tag] || 'var(--t2)';

  return (
    <div className="nexus-card" style={{
      padding: 0, overflow: 'hidden',
      borderLeft: `3px solid ${build.is_org_canonical ? 'var(--live)' : 'var(--red)'}`,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {build.build_name}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{build.ship_name}</span>
            {build.role_tag && (
              <span className="nexus-pill" style={{ color: roleColor, borderColor: `${roleColor}40`, background: `${roleColor}12`, padding: '1px 6px', fontSize: 8 }}>
                {build.role_tag}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
          {build.is_org_canonical && (
            <span className="nexus-pill" style={{ background: 'var(--live-bg)', color: 'var(--live)', borderColor: 'var(--live-b)', fontSize: 8 }}>
              ORG STANDARD
            </span>
          )}
          {build.patch_locked && (
            <span className="nexus-tooltip" data-tooltip="This build is locked to a specific game patch" style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--warn)', fontSize: 9 }}>
              <Lock size={9} /> v{build.patch_version || '?'}
            </span>
          )}
        </div>
      </div>

      {/* Stat preview — show hardpoints summary if available */}
      {build.hardpoints && Object.keys(build.hardpoints).length > 0 && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 6 }}>LOADOUT SUMMARY</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(build.hardpoints).slice(0, 6).map(([slot, comp]) => (
              <span key={slot} className="nexus-tag" style={{ fontSize: 8 }}>
                {typeof comp === 'object' ? (comp.name || slot) : String(comp).slice(0, 20)}
              </span>
            ))}
            {Object.keys(build.hardpoints).length > 6 && (
              <span className="nexus-tag" style={{ fontSize: 8, color: 'var(--t3)' }}>
                +{Object.keys(build.hardpoints).length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Build URL preview */}
      {build.build_url && (
        <div style={{ padding: '0 14px 10px' }}>
          <a
            href={build.build_url} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--info)', fontSize: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ExternalLink size={10} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {build.build_url.replace(/^https?:\/\//, '').slice(0, 40)}
            </span>
          </a>
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: '8px 14px', borderTop: '0.5px solid var(--b0)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t3)', fontSize: 9 }}>
        <span>By <span style={{ color: 'var(--t1)' }}>{build.created_by_callsign || 'UNKNOWN'}</span></span>
        {build.patch_version && !build.patch_locked && <span>· v{build.patch_version}</span>}
      </div>

      {/* Actions */}
      <div style={{ padding: '6px 10px', borderTop: '0.5px solid var(--b0)', display: 'flex', gap: 4 }}>
        <button onClick={handleToggleCanonical} className="nexus-btn nexus-tooltip" data-tooltip={build.is_org_canonical ? 'Remove org standard flag' : 'Mark as the recommended org build for this ship'} style={{ flex: 1, padding: '4px 8px', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Star size={9} style={{ color: build.is_org_canonical ? 'var(--live)' : 'var(--t3)' }} />
          {build.is_org_canonical ? 'STANDARD' : 'SET STANDARD'}
        </button>
        <button onClick={() => onEdit?.(build)} className="nexus-btn nexus-tooltip" data-tooltip="Edit build details" style={{ padding: '4px 8px' }}>
          <Edit2 size={10} />
        </button>
        <button onClick={handleDelete} className="nexus-btn nexus-btn-danger nexus-tooltip" data-tooltip="Delete this build permanently" style={{ padding: '4px 8px' }}>
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}