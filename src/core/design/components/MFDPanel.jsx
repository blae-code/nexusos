import React from 'react';

export default function MFDPanel({ label, action = null, statusDot = null, children }) {
  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 1px 0 rgba(var(--b3-rgb), 0.6)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(180deg, transparent 0, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px)',
          pointerEvents: 'none',
        }}
      />
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          height: 32,
          background: 'var(--bg2)',
          borderBottom: '0.5px solid var(--b1)',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {statusDot ? (
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusDot,
                flexShrink: 0,
              }}
            />
          ) : null}
          <span
            style={{
              fontSize: 9,
              color: 'var(--t3)',
              letterSpacing: '0.18em',
              fontFamily: 'var(--font)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </div>
        {action ? <div style={{ position: 'relative', zIndex: 1 }}>{action}</div> : null}
      </header>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </section>
  );
}
