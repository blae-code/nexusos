import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const SEVERITY_STYLE = {
  high:   { color: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.08)',   border: 'rgba(var(--danger-rgb), 0.25)' },
  medium: { color: 'var(--warn)',   bg: 'rgba(var(--warn-rgb), 0.08)', border: 'rgba(var(--warn-rgb), 0.25)' },
  low:    { color: 'var(--info)',   bg: 'rgba(74,143,208,0.08)', border: 'rgba(74,143,208,0.25)' },
};

const CATEGORY_LABEL = {
  mining:     'MINING',
  crafting:   'CRAFTING',
  salvage:    'SALVAGE',
  materials:  'MATERIALS',
  blueprints: 'BLUEPRINTS',
  refinery:   'REFINERY',
  economy:    'ECONOMY',
  components: 'COMPONENTS',
  pyro:       'PYRO',
  nyx:        'NYX',
};

export default function PatchDigestCard({ digest, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  if (!digest) return null;

  const changes = Array.isArray(digest.changes_json) ? digest.changes_json : [];
  const highCount = changes.filter(c => c.severity === 'high').length;
  const previewChanges = expanded ? changes : changes.slice(0, 3);

  const patchDate = digest.published_at
    ? new Date(digest.published_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `0.5px solid ${highCount > 0 ? 'rgba(var(--warn-rgb), 0.4)' : 'var(--b2)'}`,
      borderRadius: 8,
      margin: '0 16px',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderBottom: expanded ? '0.5px solid var(--b1)' : 'none',
        background: highCount > 0 ? 'rgba(var(--warn-rgb), 0.04)' : 'transparent',
      }}>
        {/* Version badge */}
        <span style={{
          color: 'var(--warn)',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.1em',
          background: 'rgba(var(--warn-rgb), 0.1)',
          border: '0.5px solid rgba(var(--warn-rgb), 0.3)',
          borderRadius: 4,
          padding: '1px 7px',
          flexShrink: 0,
        }}>
          PATCH {digest.patch_version}
        </span>

        {/* Summary */}
        <span style={{ color: 'var(--t1)', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {digest.industry_summary
            ? digest.industry_summary.split('.')[0] + '.'
            : `${changes.length} industry changes detected`}
        </span>

        {/* Change count pill */}
        {changes.length > 0 && (
          <span style={{
            color: highCount > 0 ? 'var(--warn)' : 'var(--t2)',
            fontSize: 9,
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}>
            {changes.length} CHANGES{highCount > 0 ? ` · ${highCount} HIGH` : ''}
          </span>
        )}

        {/* Date */}
        {patchDate && (
          <span style={{ color: 'var(--t3)', fontSize: 9, flexShrink: 0 }}>{patchDate}</span>
        )}

        {/* Expand toggle */}
        {changes.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 2, flexShrink: 0 }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 2, flexShrink: 0 }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Change list */}
      {expanded && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {previewChanges.map((change, i) => {
            const sev = SEVERITY_STYLE[change.severity] || SEVERITY_STYLE.low;
            const catLabel = CATEGORY_LABEL[change.category?.toLowerCase()] || (change.category?.toUpperCase() ?? '—');
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 8px',
                background: sev.bg,
                border: `0.5px solid ${sev.border}`,
                borderRadius: 5,
              }}>
                <span style={{
                  color: sev.color,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  flexShrink: 0,
                  minWidth: 70,
                  marginTop: 1,
                }}>
                  {catLabel}
                </span>
                <span style={{ color: 'var(--t1)', fontSize: 11, flex: 1, lineHeight: 1.5 }}>
                  {change.change_summary}
                </span>
                {change.affected_systems?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {change.affected_systems.map((s, si) => (
                      <span key={si} style={{
                        color: 'var(--t2)',
                        fontSize: 9,
                        border: '0.5px solid var(--b2)',
                        borderRadius: 3,
                        padding: '1px 5px',
                      }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show more / less */}
          {changes.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t2)',
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: '4px 0',
                textAlign: 'left',
              }}
            >
              {expanded ? '▲ SHOW LESS' : `▼ +${changes.length - 3} MORE`}
            </button>
          )}

          {/* Full comm-link link */}
          {digest.comm_link_url && (
            <a
              href={digest.comm_link_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.06em', textDecoration: 'none', marginTop: 2 }}
            >
              VIEW FULL COMM-LINK →
            </a>
          )}
        </div>
      )}
    </div>
  );
}