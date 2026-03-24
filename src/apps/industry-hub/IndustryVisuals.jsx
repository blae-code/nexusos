import React from 'react';

function resolveGlyphType(materialName, type) {
  const name = String(materialName || '').toUpperCase();

  if (name.includes('CMR') || name.includes('POWDER') || type === 'SALVAGE') {
    return 'salvage';
  }

  if (name.includes('TARANITE') || name.includes('QUANTAINIUM')) {
    return 'rare';
  }

  if (name.includes('LARANITE') || name.includes('BEXALITE') || type === 'REFINED') {
    return 'dense';
  }

  if (name.includes('JANALITE') || name.includes('SURFACE') || type === 'CRAFTED') {
    return 'surface';
  }

  return 'ore';
}

export function MaterialGlyph({ material, materialName, type, size = 11 }) {
  const stroke = 'currentColor';
  const dimension = String(size);
  const glyphType = resolveGlyphType(material?.material_name || materialName, material?.material_type || type);

  if (glyphType === 'dense') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1.5L10 3.8V8.2L6 10.5L2 8.2V3.8L6 1.5Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  if (glyphType === 'rare') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1.2L10.4 6L6 10.8L1.6 6L6 1.2Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  if (glyphType === 'salvage') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" stroke={stroke} strokeWidth="1" />
        <circle cx="6" cy="6" r="1.1" fill={stroke} />
      </svg>
    );
  }

  if (glyphType === 'surface') {
    return (
      <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 4L4.6 1.6H8.1L10.3 4.4L8.6 10.3H3.5L1.7 6.7L2 4Z" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg width={dimension} height={dimension} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5L10.5 10.5H1.5L6 1.5Z" stroke={stroke} strokeWidth="1" />
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
  const isCraftReady = status.label === 'CRAFT-READY';
  const isRefineFirst = status.label === 'REFINE FIRST';

  const pillBg = isCraftReady ? 'rgba(200,168,75,0.12)' : isRefineFirst ? 'rgba(192,57,43,0.15)' : 'var(--bg2)';
  const pillBorder = isCraftReady ? '#C8A84B' : isRefineFirst ? '#C0392B' : 'var(--b1)';
  const pillColor = isCraftReady ? '#C8A84B' : isRefineFirst ? '#C0392B' : '#9A9488';

  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 2,
        border: `0.5px solid ${pillBorder}`,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        color: pillColor,
        background: pillBg,
      }}
    >
      {status.label}
    </span>
  );
}

export function BlueprintStatusDot({ isPriority, owned }) {
  const background = isPriority ? '#C0392B' : owned ? '#C8A84B' : '#5A5850';

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
        fontSize: 10,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        color: '#E8E4DC',
        background: '#C0392B',
        padding: '2px 6px',
        borderRadius: 2,
        border: 'none',
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
        fontSize: 10,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        color: '#C8A84B',
        background: 'rgba(200,168,75,0.12)',
        border: '0.5px solid #C8A84B',
        padding: '2px 6px',
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