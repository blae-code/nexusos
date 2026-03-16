import React from 'react';

export function MaterialGlyph({ type, size = 11 }) {
  const stroke = 'currentColor';
  const dimension = String(size);

  if (type === 'RAW') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1.5L10.5 10.5H1.5L6 1.5Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'REFINED') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1.5L10 3.8V8.2L6 10.5L2 8.2V3.8L6 1.5Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'SALVAGE') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1.5L10.5 6L6 10.5L1.5 6L6 1.5Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'CRAFTED') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="9" height="9" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4L5 1.5H8.5L10.5 4.5L8.5 10.5H3.5L1.5 6.5L2.5 4Z" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

export function getMaterialStatus(material) {
  if (material?.t2_eligible) {
    return {
      label: 'CRAFT-READY',
      color: 'var(--live)',
      borderColor: 'var(--live-b)',
      background: 'var(--live-bg)',
    };
  }

  if (material?.material_type === 'RAW') {
    return {
      label: 'REFINE FIRST',
      color: 'var(--warn)',
      borderColor: 'var(--warn-b)',
      background: 'var(--warn-bg)',
    };
  }

  if ((material?.quality_pct || 0) < 60) {
    return {
      label: 'T1 ONLY',
      color: 'var(--t2)',
      borderColor: 'var(--b1)',
      background: 'var(--bg2)',
    };
  }

  return {
    label: 'BELOW T2',
    color: 'var(--warn)',
    borderColor: 'var(--warn-b)',
    background: 'var(--warn-bg)',
  };
}

export function MaterialStatusPill({ material }) {
  const status = getMaterialStatus(material);

  return (
    <span
      style={{
        fontSize: 9,
        padding: '3px 7px',
        borderRadius: 3,
        border: `0.5px solid ${status.borderColor}`,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        color: status.color,
        background: status.background,
      }}
    >
      {status.label}
    </span>
  );
}

export function BlueprintStatusDot({ isPriority, owned }) {
  const background = isPriority ? 'var(--warn)' : owned ? 'var(--acc2)' : 'var(--t3)';

  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        flexShrink: 0,
        background,
      }}
    />
  );
}

export function BlueprintPriorityTag() {
  return (
    <span
      style={{
        fontSize: 9,
        color: 'var(--warn)',
        padding: '1px 5px',
        border: '0.5px solid var(--warn-b)',
        background: 'var(--warn-bg)',
        borderRadius: 2,
      }}
    >
      PRIORITY
    </span>
  );
}

export function BlueprintHolderChip({ holder }) {
  return (
    <span
      style={{
        fontSize: 9,
        color: 'var(--acc)',
        padding: '1px 5px',
        border: '0.5px solid var(--b2)',
        background: 'var(--bg3)',
        borderRadius: 2,
      }}
    >
      {holder}
    </span>
  );
}

export function InsightInfoIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
      <path d="M7 5.1V8.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="7" cy="10.6" r="0.8" fill="currentColor" />
    </svg>
  );
}
