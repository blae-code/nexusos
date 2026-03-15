import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Columns, ChevronDown, LogOut, Key, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const RANK_COLOURS = {
  PIONEER: '#c8a84b',
  FOUNDER: '#9b6fd6',
  VOYAGER: '#4a8fd0',
  SCOUT:   '#27c96a',
  VAGRANT: '#8890a8',
  AFFILIATE: '#4a5068',
};

const BREADCRUMBS = {
  '/app': 'Overview',
  '/app/industry': 'Industry Hub',
  '/app/industry/materials': 'Industry Hub / Materials',
  '/app/industry/blueprints': 'Industry Hub / Blueprints',
  '/app/industry/craft': 'Industry Hub / Craft Queue',
  '/app/industry/refinery': 'Industry Hub / Refinery',
  '/app/scout': 'Scout Intel',
  '/app/ops': 'Op Board',
  '/app/ops/new': 'Op Board / New Op',
  '/app/fleet': 'Fleet Forge',
  '/app/profit': 'Profit Calculator',
  '/app/coffer': 'Coffer',
  '/app/rescue': 'Rescue',
  '/app/roster': 'Roster',
  '/app/archive': 'Epic Archive',
  '/app/settings': 'Settings',
  '/app/admin/keys': 'Admin / Key Management',
};

export default function NexusTopbar({ callsign, rank, layoutMode, onToggleLayout, currentPath }) {
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [patchVersion, setPatchVersion] = useState('4.0.x');
  const [onlineCount, setOnlineCount] = useState(null);

  const breadcrumb = BREADCRUMBS[currentPath] || currentPath.replace('/app/', '').replace(/\//g, ' / ');
  const rankColor = RANK_COLOURS[rank] || '#8890a8';

  const handleLogout = () => {
    localStorage.removeItem('nexus_session');
    localStorage.removeItem('nexus_discord_id');
    localStorage.removeItem('nexus_callsign');
    localStorage.removeItem('nexus_rank');
    navigate('/gate');
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('[data-user-menu]')) setUserMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <header
      className="flex items-center flex-shrink-0"
      style={{
        height: 44,
        background: 'var(--bg1)',
        borderBottom: '0.5px solid var(--b1)',
        padding: '0 12px',
        gap: 12,
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span style={{ color: 'var(--t2)', fontSize: 11, letterSpacing: '0.06em' }}>NEXUSOS</span>
        <span style={{ color: 'var(--b3)', fontSize: 11 }}>/</span>
        <span
          style={{ color: 'var(--t1)', fontSize: 11, letterSpacing: '0.04em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          {breadcrumb}
        </span>
      </div>

      {/* Centre — status pills */}
      <div className="flex items-center gap-2">
        <StatusPill dot="live" label={`LIVE ${patchVersion}`} />
        <OrgPill label="REDSCAR NOMADS" />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Online count */}
        {onlineCount !== null && (
          <div className="flex items-center gap-1.5">
            <div className="pulse-live" style={{ width: 5, height: 5 }} />
            <span style={{ color: 'var(--live)', fontSize: 11 }}>{onlineCount}</span>
          </div>
        )}

        {/* Layout toggle */}
        <button
          onClick={onToggleLayout}
          className="nexus-btn"
          style={{ padding: '4px 8px', fontSize: 10, letterSpacing: '0.06em', gap: 4 }}
          title={layoutMode === 'alt-tab' ? 'Switch to 2nd Monitor mode' : 'Switch to Alt-Tab mode'}
        >
          {layoutMode === 'alt-tab' ? (
            <><Columns size={11} /> 2ND MON</>
          ) : (
            <><Monitor size={11} /> ALT-TAB</>
          )}
        </button>

        {/* User chip */}
        <div style={{ position: 'relative' }} data-user-menu>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2"
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--b2)',
              borderRadius: 6,
              padding: '4px 8px 4px 6px',
              cursor: 'pointer',
              color: 'var(--t0)',
            }}
          >
            {/* Rank pip */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: rankColor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, letterSpacing: '0.04em', fontWeight: 600 }}>{callsign}</span>
            <ChevronDown size={11} style={{ color: 'var(--t2)' }} />
          </button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                background: 'var(--bg3)',
                border: '0.5px solid var(--b2)',
                borderRadius: 8,
                minWidth: 180,
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--b1)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>{callsign}</div>
                <div style={{ fontSize: 10, color: rankColor, letterSpacing: '0.08em', marginTop: 2 }}>{rank}</div>
              </div>
              {(rank === 'PIONEER' || rank === 'FOUNDER') && (
                <MenuLink icon={Key} label="Key Management" onClick={() => { navigate('/app/admin/keys'); setUserMenuOpen(false); }} />
              )}
              <MenuLink icon={User} label="Profile" onClick={() => setUserMenuOpen(false)} />
              <div style={{ borderTop: '0.5px solid var(--b1)', marginTop: 2 }}/>
              <MenuLink icon={LogOut} label="Sign Out" onClick={handleLogout} danger />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatusPill({ dot, label }) {
  const dotColor = dot === 'live' ? 'var(--live)' : dot === 'warn' ? 'var(--warn)' : 'var(--danger)';
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 20,
        padding: '2px 8px',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--t1)',
      }}
    >
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      {label}
    </div>
  );
}

function OrgPill({ label }) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 20,
        padding: '2px 8px',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--acc2)',
      }}
    >
      {label}
    </div>
  );
}

function MenuLink({ icon: Icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        background: hovered ? 'var(--bg4)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: danger ? 'var(--danger)' : 'var(--t1)',
        fontSize: 12,
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}