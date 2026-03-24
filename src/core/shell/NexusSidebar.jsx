import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';
import {
  LayoutDashboard, Crosshair, LifeBuoy, Activity, Factory, Radar, Map,
  Shield, Wrench, Package, Ship, CheckCircle, Users, Users2, BookOpen,
  GraduationCap, Key, ShieldAlert, Settings, LogOut,
} from 'lucide-react';

const ICON_PROPS = { size: 14, strokeWidth: 1.5 };

const NAV_CONFIG = [
  {
    group: 'COMMAND',
    collapsible: false,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app/industry' },
    ],
  },
  {
    group: 'OPERATIONS',
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: Crosshair, label: 'Ops Board', path: '/app/ops', exact: true },
      { label: 'Timeline', path: '/app/ops/timeline', sub: true },
      { label: 'Create Op', path: '/app/ops/new', sub: true },
      { icon: LifeBuoy, label: 'Rescue Board', path: '/app/ops/rescue' },
      { icon: Activity, label: 'Ops Dashboard', path: '/app/command' },
    ],
  },
  {
    group: 'INDUSTRY',
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: Factory, label: 'Overview', path: '/app/industry', exact: true },
      { label: 'Coffer', path: '/app/industry/coffer', sub: true },
      { label: 'Materials', path: '/app/industry/ledger', sub: true },
      { label: 'Commerce', path: '/app/industry/commerce', sub: true },
      { label: 'Logistics', path: '/app/industry/logistics', sub: true },
      { label: 'Cargo', path: '/app/industry/cargo', sub: true },
      { label: 'Profit', path: '/app/industry/profit', sub: true },
    ],
  },
  {
    group: 'SCOUT INTEL',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: Radar, label: 'Scout Intel', path: '/app/scout' },
      { icon: Map, label: 'Route Planner', path: '/app/scout/routes' },
    ],
  },
  {
    group: 'ARMORY',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: Shield, label: 'Armory', path: '/app/armory', exact: true },
      { icon: Wrench, label: 'Fleet Forge', path: '/app/armory/fleet' },
      { icon: Package, label: 'Inventory', path: '/app/armory/inventory' },
      { icon: Ship, label: 'Org Fleet', path: '/app/armory/org-fleet' },
      { icon: CheckCircle, label: 'Fleet Readiness', path: '/app/armory/readiness' },
      { icon: Users, label: 'Crew Schedule', path: '/app/armory/schedule' },
    ],
  },
  {
    group: 'ORG',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: Users2, label: 'Org Roster', path: '/app/roster' },
      { icon: BookOpen, label: 'Handbook', path: '/app/handbook' },
      { icon: GraduationCap, label: 'Training', path: '/app/training' },
    ],
  },
  {
    group: 'ADMINISTRATION',
    collapsible: true,
    defaultOpen: false,
    adminOnly: true,
    items: [
      { icon: Key, label: 'Key Management', path: '/app/keys' },
      { icon: ShieldAlert, label: 'Admin Settings', path: '/app/admin/settings' },
    ],
  },
];

function NavItem({ item }) {
  const Icon = item.icon;
  const isSub = item.sub;

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isSub
          ? `7px 16px 7px ${isActive ? '30px' : '32px'}`
          : `9px 16px 9px ${isActive ? '18px' : '20px'}`,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: isSub ? 11 : 12,
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 150ms',
        color: isActive ? '#E8E4DC' : isSub ? '#5A5850' : '#9A9488',
        background: isActive ? 'rgba(192,57,43,0.12)' : 'transparent',
        borderLeft: isActive ? '2px solid #C0392B' : '2px solid transparent',
      })}
    >
      {Icon && <Icon {...ICON_PROPS} />}
      {!Icon && isSub && <span style={{ width: 14 }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
    </NavLink>
  );
}

function NavGroup({ config, isAdmin }) {
  const [open, setOpen] = useState(config.defaultOpen ?? true);

  if (config.adminOnly && !isAdmin) return null;

  if (!config.collapsible) {
    return (
      <div>
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 10,
          color: '#C8A84B',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          padding: '20px 16px 5px',
        }}>
          {config.group}
        </div>
        {config.items.map((item) => <NavItem key={item.path} item={item} />)}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 10,
          color: '#C8A84B',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          padding: '20px 16px 5px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{config.group}</span>
        <span style={{ color: '#5A5850', fontSize: 9 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && config.items.map((item) => <NavItem key={item.path} item={item} />)}
    </div>
  );
}

export default function NexusSidebar() {
  const { isAdmin, logout } = useSession();

  return (
    <nav style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 220,
      background: '#08080A',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Red left rail */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        background: '#C0392B',
        zIndex: 10,
      }} />

      {/* Wordmark */}
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: '#E8E4DC' }}>NEXUS</span>
          <span style={{ color: '#C0392B' }}>OS</span>
        </span>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, paddingBottom: 24 }}>
        {NAV_CONFIG.map((config) => (
          <NavGroup key={config.group} config={config} isAdmin={isAdmin} />
        ))}
      </div>

      {/* Bottom section */}
      <div style={{
        marginTop: 'auto',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
      }}>
        <NavLink
          to="/app/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: `9px 0 9px ${isActive ? '0' : '4px'}`,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 150ms',
            color: isActive ? '#E8E4DC' : '#9A9488',
          })}
        >
          <Settings {...ICON_PROPS} />
          <span>Settings</span>
        </NavLink>
        <button
          type="button"
          onClick={() => logout('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 0 9px 4px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 150ms',
            color: '#5A5850',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#C0392B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5850'; }}
        >
          <LogOut {...ICON_PROPS} />
          <span>Logout</span>
        </button>
      </div>

      {/* Hover styles */}
      <style>{`
        nav a:hover:not([style*="rgba(192,57,43"]) {
          color: #E8E4DC !important;
          background: rgba(200,170,100,0.06) !important;
        }
      `}</style>
    </nav>
  );
}