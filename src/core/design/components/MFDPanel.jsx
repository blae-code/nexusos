import React from 'react';

/**
 * MFDPanel — Star Citizen MFD-styled data panel
 *
 * Props:
 *   label       string   — header label text (displayed in CAPS)
 *   status      'ok'|'warn'|'danger'|'info'  — controls left accent bar colour
 *   dataPoints  Array<{ label, value, unit?, status? }>  — grid of data cells
 *   cols        number   — grid columns (default: 2)
 *   children    ReactNode — rendered inside the panel body (instead of or after dataPoints)
 *   style       object   — applied to outer container
 *
 * MFDDataPoint — standalone data cell usable outside of MFDPanel
 *   label, value, unit?, status?
 */

const ACCENT_COLOR = {
  ok: 'var(--live)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export function MFDDataPoint({ label, value, unit, status, style }) {
  const valueColor = status ? (ACCENT_COLOR[status] || 'var(--t0)') : 'var(--t0)';

  return (
    <div
      style={{
        padding: '8px 10px',
        border: '0.5px solid var(--b1)',
        background: 'var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 8,
          color: 'var(--t2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: valueColor,
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 9, color: 'var(--t2)', fontFamily: 'inherit' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function MFDPanel({ label, status = 'ok', dataPoints, cols = 2, children, style }) {
  const accentColor = ACCENT_COLOR[status] || ACCENT_COLOR.ok;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg2)',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            width: 3,
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            padding: '7px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: 'var(--t1)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {label}
          </span>
          {status !== 'ok' && (
            <span
              style={{
                fontSize: 8,
                color: accentColor,
                letterSpacing: '0.1em',
                marginLeft: 'auto',
                fontFamily: 'inherit',
              }}
            >
              {status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: dataPoints && dataPoints.length > 0 ? 0 : '10px 12px' }}>
        {dataPoints && dataPoints.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: '0.5px',
              background: 'var(--b1)',
            }}
          >
            {dataPoints.map((dp, i) => (
              <MFDDataPoint
                key={i}
                label={dp.label}
                value={dp.value}
                unit={dp.unit}
                status={dp.status}
                style={{ borderRadius: 0, border: 'none' }}
              />
            ))}
          </div>
        )}
        {children && (
          <div style={{ padding: dataPoints && dataPoints.length > 0 ? '10px 12px' : 0 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default MFDPanel;
