/**
 * DivisionIcon — 24×24 SVG icon for each Redscar Nomads division.
 * Props: division (string), size (number, default 20), color (optional CSS string)
 * All icons use currentColor so the parent controls tint.
 */
import React from 'react';

const DIVISION_COLORS = {
  rangers:    'var(--danger)',
  rescue:     'var(--live)',
  industrial: 'var(--warn)',
  racing:     'var(--acc2)',
  report:     'var(--info)',
};

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function RangersIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"   strokeWidth="0.7"/>
      <line x1="12" y1="1"  x2="12" y2="8"  strokeWidth="0.75"/>
      <line x1="12" y1="16" x2="12" y2="23" strokeWidth="0.75"/>
      <line x1="1"  y1="12" x2="8"  y2="12" strokeWidth="0.75"/>
      <line x1="16" y1="12" x2="23" y2="12" strokeWidth="0.75"/>
      <circle cx="12" cy="12" r="3"   strokeWidth="0.7"/>
      <circle cx="12" cy="12" r="0.9" strokeWidth="0.5"/>
    </svg>
  );
}

function RescueIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <rect x="9" y="3"  width="6" height="18" rx="0.5" strokeWidth="0.75"/>
      <rect x="3" y="9"  width="18" height="6" rx="0.5" strokeWidth="0.75"/>
      <line x1="17.5" y1="2.5" x2="22"   y2="2.5" strokeWidth="0.6"  opacity="0.7"/>
      <line x1="19"   y1="5"   x2="22.5" y2="5"   strokeWidth="0.55" opacity="0.5"/>
      <line x1="20.5" y1="7.5" x2="23"   y2="7.5" strokeWidth="0.5"  opacity="0.33"/>
    </svg>
  );
}

function IndustrialIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="2" width="4" height="10" rx="0.5" strokeWidth="0.75"/>
      <path d="M 8 12 L 12 21 L 16 12 Z" strokeWidth="0.75"/>
      <line x1="5"  y1="7"  x2="9"  y2="7"  strokeWidth="0.6"  opacity="0.65"/>
      <line x1="15" y1="7"  x2="19" y2="7"  strokeWidth="0.6"  opacity="0.65"/>
      <line x1="4"  y1="10" x2="9"  y2="10" strokeWidth="0.5"  opacity="0.42"/>
      <line x1="15" y1="10" x2="20" y2="10" strokeWidth="0.5"  opacity="0.42"/>
      <circle cx="10" cy="20"   r="0.5" strokeWidth="0.4"  opacity="0.5"/>
      <circle cx="14" cy="20"   r="0.5" strokeWidth="0.4"  opacity="0.5"/>
      <circle cx="12" cy="21.5" r="0.4" strokeWidth="0.35" opacity="0.33"/>
    </svg>
  );
}

function RacingIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <path d="M 8 6 L 17 12 L 8 18" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="2" y1="8.5"  x2="7" y2="8.5"  strokeWidth="0.9"/>
      <line x1="2" y1="12"   x2="7" y2="12"   strokeWidth="0.7"/>
      <line x1="2" y1="15.5" x2="7" y2="15.5" strokeWidth="0.5"/>
      <path d="M 14 9.5 L 20 12 L 14 14.5" strokeWidth="0.65" opacity="0.5"/>
    </svg>
  );
}

function ReportIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 5 19 C 7 14 12 9 20 4"  strokeWidth="0.9"/>
      <path d="M 5 19 L 13.5 10.5"        strokeWidth="0.5" opacity="0.5"/>
      <path d="M 5 19 L 8.5 16 L 7 13.5" strokeWidth="0.8"/>
      <path d="M 16 13.5 Q 18 11.5 20 13.5"  strokeWidth="0.65" opacity="0.75"/>
      <path d="M 17.5 16  Q 20.5 13  23.5 16" strokeWidth="0.55" opacity="0.48"/>
    </svg>
  );
}

const DIVISION_ICONS = {
  rangers:    RangersIcon,
  rescue:     RescueIcon,
  industrial: IndustrialIcon,
  racing:     RacingIcon,
  report:     ReportIcon,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DivisionIcon({ division = 'rangers', size = 20, color }) {
  const key  = (division || '').toLowerCase();
  const Icon = DIVISION_ICONS[key] || RangersIcon;
  const iconColor = color || DIVISION_COLORS[key] || 'var(--t2)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: iconColor,
      }}
      title={division}
    >
      <Icon size={size} />
    </span>
  );
}
