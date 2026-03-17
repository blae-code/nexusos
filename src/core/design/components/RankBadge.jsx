/**
 * RankBadge — inline SVG rank insignia for each Redscar Nomads rank level.
 * Props: rank (string), size (number, default 24)
 * Uses currentColor so the parent controls the tint via the CSS `color` property.
 */
import React from 'react';

const RANK_COLORS = {
  PIONEER:      'var(--warn)',
  FOUNDER:      'var(--acc2)',
  VOYAGER:      'var(--info)',
  SCOUT:        'var(--live)',
  VAGRANT:      'var(--t1)',
  AFFILIATE:    'var(--t2)',
  SYSTEM_ADMIN: 'var(--info)',
};

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function AffiliateIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <circle cx="16" cy="16" r="11" strokeWidth="0.75" opacity="0.65"/>
      <circle cx="16" cy="16" r="2"  strokeWidth="0.75"/>
    </svg>
  );
}

function VagrantIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="11" strokeWidth="0.75"/>
      <line x1="12" y1="20" x2="21" y2="11" strokeWidth="1.1"/>
      <path d="M 17 11 L 21 11 L 21 15" strokeWidth="0.9"/>
      <circle cx="16" cy="16" r="1.5" strokeWidth="0.65"/>
    </svg>
  );
}

function ScoutIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <circle cx="16" cy="16" r="10" strokeWidth="0.75"/>
      <line x1="16" y1="4"  x2="16" y2="7.5"  strokeWidth="1.2"/>
      <line x1="28" y1="16" x2="24.5" y2="16" strokeWidth="1.2"/>
      <line x1="16" y1="28" x2="16"   y2="24.5" strokeWidth="1.2"/>
      <line x1="4"  y1="16" x2="7.5"  y2="16"  strokeWidth="1.2"/>
      <line x1="23.1" y1="8.9"  x2="21.2" y2="10.8" strokeWidth="0.6"/>
      <line x1="23.1" y1="23.1" x2="21.2" y2="21.2" strokeWidth="0.6"/>
      <line x1="8.9"  y1="23.1" x2="10.8" y2="21.2" strokeWidth="0.6"/>
      <line x1="8.9"  y1="8.9"  x2="10.8" y2="10.8" strokeWidth="0.6"/>
      <path d="M 16 13 L 19 16 L 16 19 L 13 16 Z" strokeWidth="0.75"/>
    </svg>
  );
}

function VoyagerIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round">
      <circle cx="16" cy="16" r="13" strokeWidth="0.6"/>
      <circle cx="16" cy="16" r="9"  strokeWidth="0.75"/>
      <line x1="16" y1="3"  x2="16" y2="7"  strokeWidth="1.2"/>
      <line x1="29" y1="16" x2="25" y2="16" strokeWidth="1.2"/>
      <line x1="16" y1="29" x2="16" y2="25" strokeWidth="1.2"/>
      <line x1="3"  y1="16" x2="7"  y2="16" strokeWidth="1.2"/>
      <circle cx="25.2" cy="6.8"  r="0.9" strokeWidth="0.5"/>
      <circle cx="25.2" cy="25.2" r="0.9" strokeWidth="0.5"/>
      <circle cx="6.8"  cy="25.2" r="0.9" strokeWidth="0.5"/>
      <circle cx="6.8"  cy="6.8"  r="0.9" strokeWidth="0.5"/>
      <path d="M 16 12.5 L 19.5 16 L 16 19.5 L 12.5 16 Z" strokeWidth="0.75"/>
    </svg>
  );
}

function FounderIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="13.5" strokeWidth="0.6"/>
      <circle cx="16" cy="16" r="9"    strokeWidth="0.75"/>
      <line x1="16" y1="2"  x2="16" y2="7"  strokeWidth="1.4"/>
      <line x1="30" y1="16" x2="25" y2="16" strokeWidth="1.4"/>
      <line x1="16" y1="30" x2="16" y2="25" strokeWidth="1.4"/>
      <line x1="2"  y1="16" x2="7"  y2="16" strokeWidth="1.4"/>
      <path d="M 23.8 6.7  L 25.3 8.2  L 23.8 9.7  L 22.3 8.2  Z" strokeWidth="0.55"/>
      <path d="M 23.8 22.3 L 25.3 23.8 L 23.8 25.3 L 22.3 23.8 Z" strokeWidth="0.55"/>
      <path d="M 8.2  22.3 L 9.7  23.8 L 8.2  25.3 L 6.7  23.8 Z" strokeWidth="0.55"/>
      <path d="M 8.2  6.7  L 9.7  8.2  L 8.2  9.7  L 6.7  8.2  Z" strokeWidth="0.55"/>
      <line x1="16" y1="11" x2="16" y2="21" strokeWidth="0.7"/>
      <line x1="11" y1="16" x2="21" y2="16" strokeWidth="0.7"/>
      <path d="M 16 13.5 L 18.5 16 L 16 18.5 L 13.5 16 Z" strokeWidth="0.75"/>
    </svg>
  );
}

function PioneerIcon({ size }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none"
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {/* Outer ring with SW scar gap */}
      <path d="M 3.9 23 A 14 14 0 1 1 9 28.1" strokeWidth="0.6"/>
      <path d="M 9 28.1 L 7 26 L 5 24" strokeWidth="0.3"
            strokeDasharray="0.5 1.2" opacity="0.42"/>
      <circle cx="16" cy="16" r="8.5" strokeWidth="0.5"/>
      <line x1="16" y1="2"  x2="16" y2="7.5"  strokeWidth="1.5"/>
      <line x1="30" y1="16" x2="24.5" y2="16" strokeWidth="1.5"/>
      <line x1="16" y1="30" x2="16"   y2="24.5" strokeWidth="1.5"/>
      <line x1="2"  y1="16" x2="7.5"  y2="16"  strokeWidth="1.5"/>
      <path d="M 16 2 L 15 5 L 16 3.8 L 17 5 Z" strokeWidth="0.5"/>
      <line x1="16" y1="16" x2="25.9" y2="6.1"  strokeWidth="0.75"/>
      <line x1="16" y1="16" x2="25.9" y2="25.9" strokeWidth="0.75"/>
      <line x1="16" y1="16" x2="6.1"  y2="6.1"  strokeWidth="0.75"/>
      <line x1="16" y1="16" x2="10"   y2="22"   strokeWidth="0.75"/>
      <line x1="9"  y1="23" x2="6.5"  y2="25.5" strokeWidth="0.35"
            strokeDasharray="0.6 1.3" opacity="0.48"/>
      <path d="M 25.9 4.6  L 27.4 6.1  L 25.9 7.6  L 24.4 6.1  Z" strokeWidth="0.5"/>
      <path d="M 25.9 24.4 L 27.4 25.9 L 25.9 27.4 L 24.4 25.9 Z" strokeWidth="0.5"/>
      <line x1="16"   y1="7.5"  x2="16"   y2="9.5"  strokeWidth="0.8"/>
      <line x1="24.5" y1="16"   x2="22.5" y2="16"   strokeWidth="0.8"/>
      <line x1="16"   y1="24.5" x2="16"   y2="22.5" strokeWidth="0.8"/>
      <line x1="7.5"  y1="16"   x2="9.5"  y2="16"   strokeWidth="0.8"/>
      <path d="M 16 13 L 19 16 L 16 19 L 13 16 Z" strokeWidth="0.75"/>
      <circle cx="16" cy="16" r="1" strokeWidth="0.6"/>
    </svg>
  );
}

const RANK_ICONS = {
  PIONEER:      PioneerIcon,
  FOUNDER:      FounderIcon,
  VOYAGER:      VoyagerIcon,
  SCOUT:        ScoutIcon,
  VAGRANT:      VagrantIcon,
  AFFILIATE:    AffiliateIcon,
  SYSTEM_ADMIN: PioneerIcon,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RankBadge({ rank = 'AFFILIATE', size = 24 }) {
  const Icon   = RANK_ICONS[rank] || RANK_ICONS.AFFILIATE;
  const color  = RANK_COLORS[rank] || 'var(--t2)';
  const isPioneer = rank === 'PIONEER' || rank === 'SYSTEM_ADMIN';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color,
        ...(isPioneer ? { filter: 'drop-shadow(0 0 4px rgba(var(--acc-rgb), 0.45))' } : {}),
      }}
      title={rank}
    >
      <Icon size={size} />
    </span>
  );
}
