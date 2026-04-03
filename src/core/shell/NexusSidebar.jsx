import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';
import { FUTURE_FEATURE_TEASERS } from '@/core/shell/futureFeatures';
import SidebarWidget from './SidebarWidget';
import {
  Factory, TrendingUp, Boxes,
  LogOut,
} from 'lucide-react';

const NAV = [
  {
    label: 'ACTIVE SURFACES',
    items: [
      {
        icon: Factory,
        label: 'INDUSTRY HUB',
        path: '/app/industry',
        match: ({ pathname, searchParams }) => pathname === '/app/industry' && searchParams.get('tab') !== 'inventory',
      },
      {
        icon: Boxes,
        label: 'INVENTORY',
        path: '/app/industry?tab=inventory',
        match: ({ pathname, searchParams }) => pathname === '/app/industry' && searchParams.get('tab') === 'inventory',
      },
      { icon: TrendingUp, label: 'MARKET HUB', path: '/app/market' },
    ],
  },
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
    fontSize: 10, color: 'var(--t2)', textTransform: 'uppercase',
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
  futureWrap: {
    margin: '12px 10px 6px',
    padding: '10px 12px',
    background: '#0F0F0D',
    border: '0.5px solid rgba(200,170,100,0.10)',
    borderRadius: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  futureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
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
function isItemActive(item, pathname, searchParams) {
  if (typeof item.match === 'function') {
    return item.match({ pathname, searchParams });
  }
  return !item.children ? isUnder(pathname, item.path) : false;
}

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

export default function NexusSidebar({ mobileOpen, onClose }) {
  const { pathname, search } = useLocation();
  const { logout } = useSession();
  const searchParams = new URLSearchParams(search);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="nexus-sidebar-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, display: 'none',
          }}
        />
      )}
      <nav
        className={`nexus-sidebar ${mobileOpen ? 'nexus-sidebar-open' : ''}`}
        style={S.root}
      >
        <div style={S.rail} />
        <div style={S.wordmark}>
          <span style={S.wordmarkText}>
            <span style={{ color: '#E8E4DC' }}>NEXUS</span>
            <span style={{ color: '#C0392B' }}>OS</span>
          </span>
        </div>

        <div style={S.scrollArea}>
        {NAV.map((group) => {
          return (
            <div key={group.label}>
              <div style={S.groupLabel}>{group.label}</div>
              {group.items.map((item) => (
                <React.Fragment key={item.path + item.label}>
                  <NavItem
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    active={isItemActive(item, pathname, searchParams)}
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

        <div style={S.groupLabel}>FUTURE FEATURES</div>
        <div style={S.futureWrap}>
          {FUTURE_FEATURE_TEASERS.map((feature) => (
            <div key={feature.key} style={S.futureItem}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: feature.accent,
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#E8E4DC',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  {feature.title}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  color: '#5A5850',
                  lineHeight: 1.35,
                  marginTop: 1,
                }}>
                  {feature.teaser}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verse tag */}
      <div style={S.verseTag}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4A8C5C', animation: 'pulse 3s ease-in-out infinite', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>VERSE 4.7.0</span>
      </div>

      <SidebarWidget />

      <div style={S.bottom}>
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
    </>
  );
}
