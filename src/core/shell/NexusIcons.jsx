import React from 'react';

function iconProps(size) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };
}

export function IndustryIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M2.5 13.5H13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M3.5 12V9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M7.5 12V6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M11.5 12V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function OpBoardIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="2.5" y="2.5" width="4" height="4" stroke="currentColor" strokeWidth="1" />
      <rect x="9.5" y="2.5" width="4" height="4" stroke="currentColor" strokeWidth="1" />
      <rect x="2.5" y="9.5" width="4" height="4" stroke="currentColor" strokeWidth="1" />
      <rect x="9.5" y="9.5" width="4" height="4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function ScoutIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <path d="M8 1.5V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8 13V14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M1.5 8H3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M13 8H14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function FleetIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M8 2.5L12.5 8L8 13.5L3.5 8L8 2.5Z" stroke="currentColor" strokeWidth="1" />
      <path d="M5.5 8H10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8 5.5V10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function BlueprintIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 2.5H10.5L12.5 4.5V13.5H4V2.5Z" stroke="currentColor" strokeWidth="1" />
      <path d="M10.5 2.5V4.5H12.5" stroke="currentColor" strokeWidth="1" />
      <path d="M6 7H10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M6 9.5H10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function CofferIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <ellipse cx="8" cy="4.5" rx="4.5" ry="2" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 4.5V8.5C3.5 9.6 5.5 10.5 8 10.5C10.5 10.5 12.5 9.6 12.5 8.5V4.5" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 8.5V11.5C3.5 12.6 5.5 13.5 8 13.5C10.5 13.5 12.5 12.6 12.5 11.5V8.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function RescueIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1" />
      <path d="M8 5.2V10.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M5.2 8H10.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function RosterIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 12.8C4.2 10.9 5.9 9.8 8 9.8C10.1 9.8 11.8 10.9 12.5 12.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.4 1.4" />
      <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function AltTabIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="2.5" y="3.5" width="11" height="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function SecondMonitorIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="2.5" y="3.5" width="3" height="9" stroke="currentColor" strokeWidth="1" />
      <rect x="6.5" y="3.5" width="3" height="9" stroke="currentColor" strokeWidth="1" />
      <rect x="10.5" y="3.5" width="3" height="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function MoreIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="4" cy="8" r="0.9" fill="currentColor" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function KeyIcon({ size = 16 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="5.5" cy="8" r="3" stroke="currentColor" strokeWidth="1" />
      <circle cx="5.5" cy="8" r="1.2" fill="currentColor" />
      <path d="M8.5 8H13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M11.5 8V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M13.5 8V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
