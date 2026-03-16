import React from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Industry Hub', path: '/app/industry' },
  { label: 'Scout Intel', path: '/app/scout' },
  { label: 'Op Board', path: '/app/ops' },
  { label: 'Fleet Forge', path: '/app/fleet' },
  { label: 'Profit Calculator', path: '/app/profit' },
  { label: 'Coffer Ledger', path: '/app/coffer' },
  { label: 'Material Ledger', path: '/app/ledger' },
  { label: 'Rescue Board', path: '/app/rescue' },
  { label: 'Roster', path: '/app/roster' },
  { label: 'Archive', path: '/app/archive' },
  { label: 'Profile', path: '/app/profile' },
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
          {NAV_ITEMS.map(item => (
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
          ))}
        </nav>
      </div>
    </>
  );
}