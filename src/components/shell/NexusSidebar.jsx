import React from 'react';
import { Link } from 'react-router-dom';
import {
  Factory, Map, Crosshair, Wrench, Calculator,
  Coins, ShieldAlert, Users, BookOpen,
  Settings, ClipboardList
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: Factory,       label: 'Industry Hub',   path: '/app/industry',    badge: null },
  { icon: Map,           label: 'Scout Intel',     path: '/app/scout',       badge: null },
  { icon: Crosshair,     label: 'Op Board',        path: '/app/ops',         badge: null },
  { icon: Wrench,        label: 'Fleet Forge',     path: '/app/fleet',       badge: null },
  { icon: Calculator,    label: 'Profit Calc',     path: '/app/profit',      badge: null },
  null, // divider
  { icon: Coins,         label: 'Coffer',          path: '/app/coffer',      badge: null },
  { icon: ShieldAlert,   label: 'Rescue',          path: '/app/rescue',      badge: null },
  { icon: Users,         label: 'Roster',          path: '/app/roster',      badge: null },
  { icon: BookOpen,      label: 'Epic Archive',    path: '/app/archive',     badge: null },
  null, // divider
  { icon: ClipboardList, label: 'Setup TODO',      path: '/app/admin/todo',  badge: '!' },
  { icon: Settings,      label: 'Settings',        path: '/app/settings',    badge: null },
];

export default function NexusSidebar({ currentPath }) {
  return (
    <nav
      className="flex flex-col items-center py-3 gap-1 flex-shrink-0"
      style={{
        width: 50,
        background: 'var(--bg1)',
        borderRight: '0.5px solid var(--b1)',
        height: '100vh',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center mb-2"
        style={{ width: 34, height: 34 }}
      >
        <CompassIcon size={22} />
      </div>

      <div style={{ width: '100%', borderBottom: '0.5px solid var(--b1)', marginBottom: 4 }} />

      {NAV_ITEMS.map((item, i) => {
        if (item === null) {
          return (
            <div
              key={`div-${i}`}
              style={{ width: '60%', borderBottom: '0.5px solid var(--b1)', margin: '4px auto' }}
            />
          );
        }

        const Icon = item.icon;
        const isActive = currentPath.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className="nexus-tooltip"
            data-tip={item.label}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 7,
              border: isActive ? '0.5px solid var(--b2)' : '0.5px solid transparent',
              background: isActive ? 'var(--bg3)' : 'transparent',
              color: isActive ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 0.15s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--t1)'; }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}}
          >
            <Icon size={15} />
            {item.badge && (
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 6,
                  height: 6,
                  background: 'var(--warn)',
                  borderRadius: '50%',
                  border: '1px solid var(--bg1)',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function CompassIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--acc)" strokeWidth="0.5"/>
      <circle cx="12" cy="12" r="1.5" fill="var(--acc2)"/>
      <polygon points="12,3 10.5,10 12,9 13.5,10" fill="var(--t0)" opacity="0.9"/>
      <polygon points="12,21 13.5,14 12,15 10.5,14" fill="var(--t2)" opacity="0.6"/>
      <polygon points="21,12 14,13.5 15,12 14,10.5" fill="var(--t2)" opacity="0.6"/>
      <polygon points="3,12 10,10.5 9,12 10,13.5" fill="var(--t2)" opacity="0.6"/>
    </svg>
  );
}