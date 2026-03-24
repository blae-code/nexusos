/**
 * IndustryVisuals — Phase 3 design-system aligned.
 * MaterialGlyph, MaterialStatusPill, BlueprintStatusDot,
 * BlueprintPriorityTag, BlueprintHolderChip, InsightInfoIcon.
 */
import React from 'react';

/* ═══ Material Glyph ═══════════════════════════════════════════════════════ */

function resolveGlyphType(materialName, type) {
  const name = String(materialName || '').toUpperCase();
  if (name.includes('CMR') || name.includes('POWDER') || type === 'DISMANTLED_SCRAP') return 'salvage';
  if (name.includes('TARANITE') || name.includes('QUANTAINIUM')) return 'rare';
  if (name.includes('LARANITE') || name.includes('BEXALITE') || type === 'CM_REFINED') return 'dense';
  if (name.includes('JANALITE') || name.includes('SURFACE')) return 'surface';
  return 'ore';
}

export function MaterialGlyph({ material, materialName, type, size = 11 }) {
  const stroke = 'currentColor';
  const d = String(size);
  const g = resolveGlyphType(material?.material_name || materialName, material?.material_type || type);

  if (g === 'dense') return <svg width={d} height={d} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5L10 3.8V8.2L6 10.5L2 8.2V3.8L6 1.5Z" stroke={stroke} strokeWidth="1" /></svg>;
  if (g === 'rare') return <svg width={d} height={d} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.2L10.4 6L6 10.8L1.6 6L6 1.2Z" stroke={stroke} strokeWidth="1" /></svg>;
  if (g === 'salvage') return <svg width={d} height={d} viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.5" stroke={stroke} strokeWidth="1" /><circle cx="6" cy="6" r="1.1" fill={stroke} /></svg>;
  if (g === 'surface') return <svg width={d} height={d} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4L4.6 1.6H8.1L10.3 4.4L8.6 10.3H3.5L1.7 6.7L2 4Z" stroke={stroke} strokeWidth="1" /></svg>;
  return <svg width={d} height={d} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5L10.5 10.5H1.5L6 1.5Z" stroke={stroke} strokeWidth="1" /></svg>;
}

/* ═══ Material Status ═══════════════════════════════════════════════════════ */

export function getMaterialStatus(material) {
  const q = material?.quality_score || 0;
  const mt = material?.material_type || '';

  if (material?.t2_eligible || q >= 800) {
    return { label: 'CRAFT-READY', color: '#C8A84B', borderColor: 'rgba(200,168,75,0.25)', background: 'rgba(200,168,75,0.12)' };
  }
  if (['CMR', 'CMP', 'CMS', 'ORE', 'DISMANTLED_SCRAP'].includes(mt)) {
    return { label: 'REFINE FIRST', color: '#C0392B', borderColor: 'rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.15)' };
  }
  return { label: 'BELOW T2', color: '#5A5850', borderColor: 'rgba(90,88,80,0.25)', background: 'rgba(90,88,80,0.15)' };
}

export function MaterialStatusPill({ material }) {
  const s = getMaterialStatus(material);
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2,
      border: `0.5px solid ${s.borderColor}`, color: s.color, background: s.background,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

/* ═══ Blueprint Visual Components ═══════════════════════════════════════════ */

export function BlueprintStatusDot({ isPriority, owned }) {
  return (
    <div style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: isPriority ? '#C0392B' : owned ? '#C8A84B' : '#5A5850',
    }} />
  );
}

export function BlueprintPriorityTag() {
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', color: '#E8E4DC', background: '#C0392B',
      padding: '2px 6px', borderRadius: 2,
    }}>PRIORITY</span>
  );
}

export function BlueprintHolderChip({ holder }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', color: '#C8A84B',
      background: 'rgba(200,168,75,0.12)', border: '0.5px solid #C8A84B',
      padding: '2px 6px', borderRadius: 2,
    }}>{holder}</span>
  );
}

/* ═══ Insight Info Icon ═════════════════════════════════════════════════════ */

export function InsightInfoIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
      <path d="M7 5.1V8.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="7" cy="10.6" r="0.8" fill="currentColor" />
    </svg>
  );
}