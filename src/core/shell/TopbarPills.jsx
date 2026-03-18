/**
 * TopbarPills — StatusPill and VersionPill used by NexusTopbar.
 */
import React, { useState } from 'react';
import { VERSE_BUILD_LABEL } from '@/core/data/useVerseStatus';

export function StatusPill({ verseStatus }) {
  if (verseStatus === 'offline') {
    return <div className="nexus-pill nexus-pill-danger">OFFLINE</div>;
  }

  if (verseStatus === 'degraded' || verseStatus === 'unknown') {
    return <div className="nexus-pill nexus-pill-warn">DEGRADED</div>;
  }

  return <div className="nexus-pill nexus-pill-live">LIVE {VERSE_BUILD_LABEL}</div>;
}

export function VersionPill({ version, full, date }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="nexus-pill nexus-pill-neu">v{version}</div>
      {hovered ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b2)',
            borderRadius: 3,
            padding: '6px 8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          <div style={{ color: 'var(--t1)', fontSize: 9 }}>{full}</div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>{date}</div>
        </div>
      ) : null}
    </div>
  );
}