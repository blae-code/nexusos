import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: { bg: 'rgba(var(--danger-rgb), 0.12)', border: 'var(--danger)', text: 'var(--danger)' },
  HIGH: { bg: 'rgba(var(--warn-rgb), 0.12)', border: 'var(--warn)', text: 'var(--warn)' },
  MEDIUM: { bg: 'rgba(var(--info-rgb), 0.12)', border: 'var(--info)', text: 'var(--info)' },
  LOW: { bg: 'rgba(var(--live-rgb), 0.12)', border: 'var(--live)', text: 'var(--live)' },
};

export default function PatchDigestHeader() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLatestPatch = async () => {
      try {
        const digests = await base44.entities.PatchDigest.list('-processed_at', 1);
        if (digests && digests.length > 0) {
          setDigest(digests[0]);
        }
      } catch {
        // patch digest load failed — header stays empty
      } finally {
        setLoading(false);
      }
    };

    loadLatestPatch();
  }, []);

  if (loading || !digest) {
    return null;
  }

  const severity = SEVERITY_COLORS[digest.severity] || SEVERITY_COLORS.MEDIUM;

  return (
    <div
      style={{
        background: severity.bg,
        border: `0.5px solid ${severity.border}`,
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: severity.text + '20',
          border: `0.5px solid ${severity.text}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {digest.severity === 'CRITICAL' && <AlertTriangle size={12} style={{ color: severity.text }} />}
        {digest.severity !== 'CRITICAL' && (
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: severity.text,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: severity.text, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em' }}>
            PATCH {digest.patch_version}
          </span>
          <span style={{ color: 'var(--t3)', fontSize: 8 }}>
            {digest.severity}
          </span>
        </div>

        <p style={{ color: 'var(--t0)', fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
          {digest.industry_summary}
        </p>

        {/* Affected Systems */}
        {digest.affected_systems && digest.affected_systems.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {digest.affected_systems.map(system => (
              <span
                key={system}
                style={{
                  fontSize: 8,
                  padding: '2px 6px',
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--b2)',
                  borderRadius: 3,
                  color: 'var(--t1)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {system}
              </span>
            ))}
          </div>
        )}

        {/* Key Changes */}
        {digest.key_changes && digest.key_changes.length > 0 && (
          <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 8 }}>
            <div style={{ marginBottom: 4, color: 'var(--t1)', fontWeight: 500 }}>Key Changes:</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {digest.key_changes.slice(0, 3).map((kc, idx) => (
                <li key={idx} style={{ lineHeight: 1.4 }}>
                  <strong>{kc.system}:</strong> {kc.change}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link */}
        {digest.comm_link_url && (
          <a
            href={digest.comm_link_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 9,
              color: 'var(--info)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 4,
              border: '0.5px solid var(--info)',
              background: 'rgba(var(--info-rgb), 0.06)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(var(--info-rgb), 0.12)';
              e.currentTarget.style.borderColor = 'var(--info)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(var(--info-rgb), 0.06)';
              e.currentTarget.style.borderColor = 'var(--info)';
            }}
          >
            Read Full Patch <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
}