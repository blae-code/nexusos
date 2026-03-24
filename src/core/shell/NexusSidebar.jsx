import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';
import SidebarWidget from './SidebarWidget';
import {
  Crosshair, LayoutGrid, Clock, PlusCircle, LifeBuoy, Archive,
  Activity, Factory, BookOpen, GraduationCap, Radar,
  Shield, Wrench, Package, Ship, Users,
  Key, ShieldAlert, ClipboardList, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  {
    label: 'OPERATIONS',
    items: [
      {
        icon: Crosshair, label: 'OPS BOARD', path: '/app/ops',
        children: [
          { label: 'TIMELINE', path: '/app/ops/timeline' },
          { label: 'CREATE OP', path: '/app/ops/new' },
        ],
      },
      { icon: LifeBuoy, label: 'RESCUE BOARD', path: '/app/ops/rescue' },
    ],
  },
  {
    label: 'INDUSTRY',
    items: [
      { icon: Factory, label: 'INDUSTRY HUB', path: '/app/industry' },
    ],
  },
  {
    label: 'SCOUT INTEL',
    items: [
      { icon: Radar, label: 'SCOUT INTEL', path: '/app/scout' },
    ],
  },
  {
    label: 'ARMORY',
    collapsed: true,
    items: [
      { icon: Shield, label: 'ARMORY', path: '/app/armory' },
      { icon: Ship, label: 'FLEET', path: '/app/armory/fleet' },
      { icon: Package, label: 'INVENTORY', path: '/app/armory/inventory' },
    ],
  },
  {
    label: 'ORG',
    collapsed: true,
    items: [
      {
        icon: Users, label: 'ORG ROSTER', path: '/app/roster',
        children: [
          { label: 'DEBT TRACKER', path: '/app/roster/debts' },
        ],
      },
      { icon: BookOpen, label: 'HANDBOOK', path: '/app/handbook' },
      { icon: GraduationCap, label: 'TRAINING', path: '/app/training' },
    ],
  },
  {
    label: 'ADMINISTRATION',
    adminOnly: true,
    items: [
      { icon: Key, label: 'KEY MANAGEMENT', path: '/app/keys' },
      { icon: ShieldAlert, label: 'ADMIN SETTINGS', path: '/app/admin/settings' },
      { icon: ClipboardList, label: 'TASK BOARD', path: '/app/admin/todo' },
    ],
  },
];

const BOTTOM = [
  { icon: Settings, label: 'SETTINGS', path: '/app/settings' },
];

const ICON_PROPS = { size: 14, strokeWidth: 1.5, style: { flexShrink: 0 } };

const S = {
  root: {
    position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
    background: '#08080A',
    borderRight: '0.5px solid rgba(200,170,100,0.10)',
    zIndex: 100,
    display: 'flex', flexDirection: 'column',
  },
  rail: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
    background: '#C0392B', zIndex: 10,
  },
  wordmark: {
    height: 48, display: 'flex', alignItems: 'center', paddingLeft: 20,
    borderBottom: '0.5px solid rgba(200,170,100,0.08)', flexShrink: 0,
  },
  wordmarkText: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  scrollArea: {
    flex: 1, overflowY: 'auto', paddingBottom: 24,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(200,170,100,0.2) transparent',
  },
  groupLabel: {
    fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
    fontSize: 10, color: '#C8A84B', textTransform: 'uppercase',
    letterSpacing: '0.28em', padding: '20px 16px 5px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12, fontWeight: 500, color: '#9A9488',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    padding: '9px 16px 9px 20px',
    textDecoration: 'none', cursor: 'pointer',
    transition: 'background 150ms, color 150ms',
    borderLeft: '2px solid transparent',
  },
  navItemActive: {
    background: 'rgba(192,57,43,0.12)', color: '#E8E4DC',
    borderLeft: '2px solid #C0392B', paddingLeft: 18,
  },
  subItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 400, color: '#5A5850',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '7px 16px 7px 32px',
    textDecoration: 'none', cursor: 'pointer',
    transition: 'background 150ms, color 150ms',
    borderLeft: '2px solid transparent',
  },
  subItemActive: {
    background: 'rgba(192,57,43,0.12)', color: '#E8E4DC',
    borderLeft: '2px solid #C0392B', paddingLeft: 30,
  },
  verseTag: {
    padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6,
  },
  bottom: {
    marginTop: 'auto', flexShrink: 0,
    borderTop: '0.5px solid rgba(200,170,100,0.08)',
    padding: '8px 0',
  },
  logout: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12, fontWeight: 500, color: '#9A9488',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    padding: '9px 16px 9px 20px',
    background: 'none', border: 'none', cursor: 'pointer',
    width: '100%', textAlign: 'left',
    transition: 'color 150ms',
  },
};

function isExact(pathname, path) { return pathname === path; }
function isUnder(pathname, path) { return pathname === path || pathname.startsWith(path + '/'); }

function NavItem({ icon: Icon, label, path, active }) {
  return (
    <Link
      to={path}
      style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}
      onMouseEnter={!active ? (e) => { e.currentTarget.style.background = 'rgba(200,170,100,0.06)'; e.currentTarget.style.color = '#E8E4DC'; } : undefined}
      onMouseLeave={!active ? (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9488'; } : undefined}
    >
      <Icon {...ICON_PROPS} />
      {label}
    </Link>
  );
}

function SubItem({ label, path, active }) {
  return (
    <Link
      to={path}
      style={{ ...S.subItem, ...(active ? S.subItemActive : {}) }}
      onMouseEnter={!active ? (e) => { e.currentTarget.style.background = 'rgba(200,170,100,0.06)'; e.currentTarget.style.color = '#9A9488'; } : undefined}
      onMouseLeave={!active ? (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5A5850'; } : undefined}
    >
      {label}
    </Link>
  );
}

export default function NexusSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, logout } = useSession();

  return (
    <nav style={S.root}>
      <div style={S.rail} />
      <div style={S.wordmark}>
        <span style={S.wordmarkText}>
          <span style={{ color: '#E8E4DC' }}>NEXUS</span>
          <span style={{ color: '#C0392B' }}>OS</span>
        </span>
      </div>

      <div style={S.scrollArea}>
        {NAV.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          return (
            <div key={group.label}>
              <div style={S.groupLabel}>{group.label}</div>
              {group.items.map((item) => (
                <React.Fragment key={item.path + item.label}>
                  <NavItem
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    active={!item.children ? isUnder(pathname, item.path) : false}
                  />
                  {item.children && item.children.map((child) => (
                    <SubItem
                      key={child.path + child.label}
                      label={child.label}
                      path={child.path}
                      active={isExact(pathname, child.path)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>

      {/* Verse tag */}
      <div style={S.verseTag}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4A8C5C', animation: 'pulse 3s ease-in-out infinite', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.15em' }}>VERSE 4.7.0</span>
      </div>

      <SidebarWidget />

      <div style={S.bottom}>
        {BOTTOM.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            active={isExact(pathname, item.path)}
          />
        ))}
        <button
          type="button"
          onClick={() => logout('/')}
          style={S.logout}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#C0392B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9A9488'; }}
        >
          <LogOut {...ICON_PROPS} />
          SIGN OUT
        </button>
      </div>
    </nav>
  );
}