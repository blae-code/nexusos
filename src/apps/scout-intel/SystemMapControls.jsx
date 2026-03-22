/**
 * SystemMapControls — Chip, MaterialChip, and IconBtn helpers used by SystemMap toolbar.
 */
import React, { useState, useRef } from 'react';

const SYSTEM_ACTIVE_BORDER = {
  STANTON: 'var(--info)',
  PYRO:    'var(--danger)',
  NYX:     'var(--acc2)',
};

const SYSTEM_ACTIVE_BG = {
  STANTON: 'color-mix(in srgb, var(--info) 8%, transparent)',
  PYRO:    'color-mix(in srgb, var(--danger) 8%, transparent)',
  NYX:     'color-mix(in srgb, var(--acc2) 8%, transparent)',
};

// ─── Shared chip button styles ────────────────────────────────────────────────

const chipBase = {
  padding: '4px 10px', fontSize: 10, letterSpacing: '0.07em',
  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
  whiteSpace: 'nowrap', transition: 'background 0.1s',
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({ label, active, onClick, systemChip }) {
  const systemKey = systemChip && label ? label.toUpperCase() : null;
  const activeBorder = systemKey && SYSTEM_ACTIVE_BORDER[systemKey]
    ? SYSTEM_ACTIVE_BORDER[systemKey]
    : 'var(--acc)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--bg2)'; }}
      style={{
        ...chipBase,
        border: active ? `0.5px solid ${activeBorder}` : '0.5px solid var(--b1)',
        background: active ? SYSTEM_ACTIVE_BG[systemKey] || `color-mix(in srgb, ${activeBorder} 8%, transparent)` : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

// ─── MaterialTooltipPanel internals ───────────────────────────────────────────

function TRow({ label, value, highlight }) {
  const valueColor =
    highlight === 'live'  ? 'var(--live)'  :
    highlight === 'warn'  ? 'var(--warn)'  :
    'var(--t1)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ color: valueColor, fontSize: 9, letterSpacing: '0.06em', fontWeight: 500, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function MaterialTooltipPanel({ data }) {
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 300,
      background: 'var(--bg3)',
      border: '0.5px solid var(--b2)',
      borderRadius: 3,
      padding: '10px 12px',
      minWidth: 192,
      maxWidth: 230,
      pointerEvents: 'none',
    }}>
      {/* Material name */}
      <div style={{
        color: 'var(--t0)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.1em', marginBottom: 3,
      }}>
        {(data.fullName || '').toUpperCase()}
      </div>

      {/* Type / tier line */}
      {(data.type || data.tier) && (
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.07em', marginBottom: 8 }}>
          {[data.type, data.tier].filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ borderTop: '0.5px solid var(--b1)', marginBottom: 8 }} />

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <TRow label="DEPOSITS" value={data.count ?? '—'} />
        <TRow
          label="BEST QUAL"
          value={data.bestQuality != null ? `${data.bestQuality}%` : '—'}
          highlight={data.bestQuality >= 80 ? 'live' : data.bestQuality >= 60 ? 'warn' : null}
        />
        <TRow
          label="T2-READY"
          value={data.count > 0 ? `${data.t2Count} of ${data.count}` : '—'}
          highlight={data.t2Count > 0 ? 'live' : null}
        />
        {data.systems?.length > 0 && (
          <TRow label="SYSTEMS" value={data.systems.join(' · ')} />
        )}
        {data.uses && (
          <TRow label="USED FOR" value={data.uses} />
        )}
      </div>

      {/* Description */}
      {data.desc && (
        <>
          <div style={{ borderTop: '0.5px solid var(--b1)', marginTop: 8, marginBottom: 8 }} />
          <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.55, letterSpacing: '0.03em' }}>
            {data.desc}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MaterialChip — material filter chip with rich hover tooltip ───────────────

/**
 * Props:
 *   materialName  string    — full material name (used for first-letter label)
 *   active        boolean
 *   onClick       fn
 *   tooltipData   object    — { fullName, type, tier, desc, uses, count, bestQuality, t2Count, systems }
 */
export function MaterialChip({ materialName, active, onClick, tooltipData }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), 280);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  const activeBorder = 'var(--acc)';

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={onClick}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--bg2)'; }}
        style={{
          ...chipBase,
          border: active ? `0.5px solid ${activeBorder}` : '0.5px solid var(--b1)',
          background: active
            ? `color-mix(in srgb, ${activeBorder} 8%, transparent)`
            : 'var(--bg2)',
          color: active ? 'var(--t0)' : 'var(--t2)',
          fontWeight: active ? 600 : 400,
        }}
      >
        {materialName[0]}
      </button>
      {visible && tooltipData && (
        <MaterialTooltipPanel data={tooltipData} />
      )}
    </div>
  );
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────

export function IconBtn({ icon: Icon, active, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 3, cursor: 'pointer',
        border: active ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--warn)' : 'var(--t2)',
      }}
    >
      <Icon size={11} />
    </button>
  );
}
