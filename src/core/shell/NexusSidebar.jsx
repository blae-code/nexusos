import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';
import {
  Crosshair, LayoutGrid, Clock, PlusCircle, LifeBuoy, Archive,
  Activity, Factory, BookOpen, GraduationCap, Radar, Map,
  Shield, Wrench, Package, Ship, CheckCircle, Users,
  Key, ShieldAlert, ClipboardList, User, Settings, LogOut,
} from 'lucide-react';

/* ── NAV DATA ──────────────────────────────────────────────────────────────── */

const NAV = [
  {
    label: 'COMMAND',
    items: [
      { icon: Activity, label: 'COMMAND CENTRE', path: '/app/command' },
      {
        icon: Crosshair, label: 'OPS BOARD', path: '/app/ops',
        children: [
          { label: 'ACTIVE OPS', path: '/app/ops' },
          { label: 'TIMELINE', path: '/app/ops/timeline' },
          { label: 'CREATE OP', path: '/app/ops/new' },
          { label: 'RESCUE', path: '/app/ops/rescue' },
          { label: 'ARCHIVE', path: '/app/ops/archive' },
        ],
      },
    ],
  },
  {
    label: 'INDUSTRIAL',
    items: [
      {
        icon: Factory, label: 'INDUSTRY HUB', path: '/app/industry',
        children: [
          { label: 'OVERVIEW', path: '/app/industry' },
          { label: 'MATERIALS', path: '/app/industry/ledger' },
          { label: 'REFINERY', path: '/app/industry/logistics' },
          { label: 'CARGO', path: '/app/industry/cargo' },
          { label: 'COFFER', path: '/app/industry/coffer' },
          { label: 'COMMERCE', path: '/app/industry/commerce' },
          { label: 'PROFIT CALC', path: '/app/industry/profit' },
        ],
      },
      {
        icon: Radar, label: 'SCOUT INTEL', path: '/app/scout',
        children: [
          { label: 'DEPOSITS', path: '/app/scout' },
          { label: 'ROUTE PLANNER', path: '/app/scout/routes' },
        ],
      },
    ],
  },
  {
    label: 'FLEET & ARMORY',
    items: [
      {
        icon: Shield, label: 'ARMORY', path: '/app/armory',
        children: [
          { label: 'LOADOUTS', path: '/app/armory' },
          { label: 'FLEET FORGE', path: '/app/armory/fleet' },
          { label: 'ORG FLEET', path: '/app/armory/org-fleet' },
          { label: 'INVENTORY', path: '/app/armory/inventory' },
          { label: 'CREW', path: '/app/armory/schedule' },
          { label: 'READINESS', path: '/app/armory/readiness' },
        ],
      },
    ],
  },
  {
    label: 'KNOWLEDGE',
    items: [
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
  { icon: User, label: 'PROFILE', path: '/app/profile' },
  { icon: Settings, label: 'SETTINGS', path: '/app/settings' },
];

/* ── STYLES ────────────────────────────────────────────────────────────────── */

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
    fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  scrollArea: {
    flex: 1, overflowY: 'auto', paddingBottom: 24,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(200,170,100,0.2) transparent',
  },
  groupLabel: {
    fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
    fontSize: 10, color: '#C8A84B', textTransform: 'uppercase',
    letterSpacing: '0.28em', padding: '18px 20px 6px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 12, fontWeight: 500, color: '#9A9488',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    padding: '9px 20px 9px 24px',
    textDecoration: 'none', cursor: 'pointer',
    transition: 'background 150ms, color 150ms',
    borderLeft: '2px solid transparent',
  },
  navItemActive: {
    background: 'rgba(192,57,43,0.12)', color: '#E8E4DC',
    borderLeft: '2px solid #C0392B', paddingLeft: 22,
  },
  subItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 400, color: '#5A5850',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '7px 20px 7px 36px',
    textDecoration: 'none', cursor: 'pointer',
    transition: 'background 150ms, color 150ms',
    borderLeft: '2px solid transparent',
  },
  subItemActive: {
    background: 'rgba(192,57,43,0.12)', color: '#E8E4DC',
    borderLeft: '2px solid #C0392B', paddingLeft: 34,
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
    padding: '9px 20px 9px 24px',
    background: 'none', border: 'none', cursor: 'pointer',
    width: '100%', textAlign: 'left',
    transition: 'color 150ms',
  },
};

/* ── HELPERS ───────────────────────────────────────────────────────────────── */

function isExact(pathname, path) {
  return pathname === path;
}

function isUnder(pathname, path) {
  return pathname === path || pathname.startsWith(path + '/');
}

/* ── COMPONENTS ────────────────────────────────────────────────────────────── */

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

/* ── MAIN EXPORT ───────────────────────────────────────────────────────────── */

export default function NexusSidebar() {
  const { pathname } = useLocation();
  const { isAdmin, logout } = useSession();

  return (
    <nav style={S.root}>
      {/* Red left rail */}
      <div style={S.rail} />

      {/* Wordmark */}
      <div style={S.wordmark}>
        <span style={S.wordmarkText}>
          <span style={{ color: '#E8E4DC' }}>NEXUS</span>
          <span style={{ color: '#C0392B' }}>OS</span>
        </span>
      </div>

      {/* Scrollable nav */}
      <div style={S.scrollArea}>
        {NAV.map((group) => {
          if (group.adminOnly && !isAdmin) return null;

          return (
            <div key={group.label}>
              <div style={S.groupLabel}>{group.label}</div>

              {group.items.map((item) => {
                const parentActive = isUnder(pathname, item.path);

                return (
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
                        active={
                          child.path === item.path
                            ? isExact(pathname, child.path)
                            : isUnder(pathname, child.path)
                        }
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
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