import React from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Industry Hub', path: '/app/industry' },
  { label: 'Op Board', path: '/app/ops' },
  { label: 'Scout Intel', path: '/app/scout' },
  { label: 'Fleet Forge', path: '/app/fleet' },
  { label: 'Blueprint Registry', path: '/app/industry?tab=blueprints' },
  null,
  { label: 'Coffer', path: '/app/coffer' },
  { label: 'Rescue', path: '/app/rescue' },
  { label: 'Roster', path: '/app/roster' },
  null,
  { label: 'Org Handbook', path: '/app/handbook' },
  { label: 'Tactical Comms', path: '/app/handbook?section=tactical-comms' },
  { label: 'Profile Settings', path: '/app/profile' },
];

export default function PortraitNavDrawer({ isOpen, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`nav-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none' }}
      />

      {/* Drawer */}
      <div className={`nav-drawer ${isOpen ? 'open' : ''}`}>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {NAV_ITEMS.map((item, index) => {
            if (item === null) {
              return <div key={`divider-${index}`} style={{ height: '0.5px', background: 'var(--b0)', margin: '8px 0' }} />;
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={{
                  padding: '12px 16px',
                  color: 'var(--t1)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  borderBottom: '0.5px solid var(--b0)',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg2)';
                  e.currentTarget.style.color = 'var(--t0)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--t1)';
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
