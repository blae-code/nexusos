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
{ label: 'Tactical Comms', info: true },
{ label: 'Profile Settings', path: '/app/profile' }];


export default function PortraitNavDrawer({ isOpen, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`nav-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none' }} />

      
      {/* Drawer */}
      <div className={`nav-drawer ${isOpen ? 'open' : ''}`}>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {NAV_ITEMS.map((item, index) => {
            if (item === null) {
              return <div key={`divider-${index}`} style={{ height: '0.5px', background: 'var(--b0)', margin: '8px 0' }} />;
            }
            if (item.info) {
              return (
                <div
                  key={item.label}
                  style={{
                    padding: '12px 16px',
                    color: 'var(--info)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    borderBottom: '0.5px solid var(--b0)',
                    cursor: 'default'
                  }}
                  title="Open in ops context">

                  {item.label}
                </div>);

            }
            return null;

























          })}
        </nav>
      </div>
    </>);

}