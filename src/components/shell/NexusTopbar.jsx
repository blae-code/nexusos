import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, ScrollText, User, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NexusCompass from '@/components/ui/NexusCompass';
import changelogRaw from '../../../CHANGELOG.md?raw';
import versionData from '../../../version.json';
import { useSession } from '@/lib/SessionContext';
import { VERSE_BUILD_LABEL } from '@/lib/useVerseStatus';
import { AltTabIcon, MoreIcon, SecondMonitorIcon } from './NexusIcons';

const RANK_COLOURS = {
  PIONEER: 'var(--warn)',
  FOUNDER: 'var(--acc2)',
  VOYAGER: 'var(--info)',
  SCOUT: 'var(--live)',
  VAGRANT: 'var(--t1)',
  AFFILIATE: 'var(--t2)',
};

const EXTRA_LINKS = [
  { label: 'Profit Calculator', path: '/app/profit' },
  { label: 'Epic Archive', path: '/app/archive' },
  { label: 'Material Ledger', path: '/app/ledger' },
];

function ChangelogDialog({ onClose }) {
  const lines = changelogRaw.split('\n');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(7,8,11,0.88)',
        padding: 18,
      }}
    >
      <div
        className="nexus-fade-in"
        style={{
          width: 460,
          maxHeight: 560,
          background: 'var(--bg2)',
          border: '0.5px solid var(--b2)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '0.5px solid var(--b1)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'var(--t0)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 600 }}>
            CHANGELOG
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--t2)',
              padding: 2,
              display: 'flex',
            }}
          >
            <X size={13} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
          {lines.map((line, index) => {
            if (line.startsWith('## ')) {
              return (
                <div
                  key={index}
                  style={{
                    color: 'var(--t0)',
                    fontSize: 11,
                    fontWeight: 600,
                    paddingBottom: 5,
                    marginBottom: 6,
                    marginTop: index === 0 ? 0 : 14,
                    borderBottom: '0.5px solid var(--b0)',
                  }}
                >
                  {line.replace(/^## /, '')}
                </div>
              );
            }

            if (line.startsWith('# ')) {
              return null;
            }

            return (
              <div key={index} style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
                {line || '\u00a0'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getBreadcrumb(pathname, search) {
  const params = new URLSearchParams(search || '');
  const industryTab = {
    overview: 'Overview',
    materials: 'Materials',
    blueprints: 'Blueprints',
    craft: 'Craft Queue',
    refinery: 'Refinery',
  };

  if (pathname === '/app/industry') {
    return { module: 'Industry Hub', tab: industryTab[params.get('tab')] || 'Overview' };
  }
  if (pathname === '/app/scout') return { module: 'Scout Intel', tab: 'Deposits' };
  if (pathname === '/app/ops') return { module: 'Op Board', tab: 'Live Feed' };
  if (pathname === '/app/ops/new') return { module: 'Op Board', tab: 'Create Op' };
  if (pathname.startsWith('/app/ops/')) return { module: 'Op Board', tab: 'Live Op' };
  if (pathname === '/app/fleet') return { module: 'Fleet Forge', tab: 'Builds' };
  if (pathname === '/app/coffer') return { module: 'Coffer', tab: 'Ledger' };
  if (pathname === '/app/rescue') return { module: 'Rescue', tab: 'Board' };
  if (pathname === '/app/roster') return { module: 'Roster', tab: 'Members' };
  if (pathname === '/app/archive') return { module: 'Epic Archive', tab: 'History' };
  if (pathname === '/app/profit') return { module: 'Profit Calc', tab: 'Routes' };
  if (pathname === '/app/ledger') return { module: 'Material Ledger', tab: 'Alerts' };
  if (pathname === '/app/profile' || pathname === '/app/settings') return { module: 'Profile', tab: 'Settings' };
  if (pathname === '/app/admin/todo') return { module: 'Admin', tab: 'Setup TODO' };
  return { module: 'NexusOS', tab: 'Overview' };
}

export default function NexusTopbar({ layoutMode, onSelectLayout, verseStatus }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, source } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const userMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const rankColor = RANK_COLOURS[user?.rank] || 'var(--t1)';
  const showPtuPill = VERSE_BUILD_LABEL.toUpperCase().includes('PTU');

  useEffect(() => {
    let cancelled = false;

    const loadOnlineCount = async () => {
      try {
        const members = await base44.entities.NexusUser.list('-joined_at', 200);
        if (!cancelled) {
          setOnlineCount((members || []).filter((member) => !member.key_revoked).length);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusTopbar] online count failed:', error?.message || error);
          setOnlineCount(null);
        }
      }
    };

    loadOnlineCount();
    const intervalId = window.setInterval(loadOnlineCount, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const extraLinks = source === 'admin' || ['PIONEER', 'FOUNDER'].includes(user?.rank)
    ? [...EXTRA_LINKS, { label: 'Setup TODO', path: '/app/admin/todo' }]
    : EXTRA_LINKS;

  return (
    <>
      <header
        style={{
          height: 44,
          background: 'var(--bg1)',
          borderBottom: '0.5px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NexusCompass />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--t0)',
                letterSpacing: '0.2em',
                fontFamily: 'var(--font)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--t0)' }}>NEXUS</span>
              <span style={{ color: 'var(--t2)' }}>OS</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, minWidth: 0 }}>
            <span style={{ color: 'var(--t3)' }}>/</span>
            <span style={{ color: 'var(--t2)', whiteSpace: 'nowrap' }}>{breadcrumb.module}</span>
            <span style={{ color: 'var(--t3)' }}>/</span>
            <span style={{ color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {breadcrumb.tab}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <StatusPill verseStatus={verseStatus} />
          {showPtuPill ? <div className="nexus-pill nexus-pill-warn">PTU</div> : null}
          <div className="nexus-pill nexus-pill-neu">REDSCAR NOMADS</div>
          <VersionPill version={versionData.version} full={versionData.full} date={versionData.date} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 10,
            color: 'var(--t2)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LayoutButton
              active={layoutMode === 'ALT-TAB'}
              title="ALT-TAB"
              onClick={() => onSelectLayout('ALT-TAB')}
              icon={<AltTabIcon size={16} />}
            />
            <LayoutButton
              active={layoutMode === '2ND MONITOR'}
              title="2ND MONITOR"
              onClick={() => onSelectLayout('2ND MONITOR')}
              icon={<SecondMonitorIcon size={16} />}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--live)',
                animation: 'pulse-dot 2.5s ease-in-out infinite',
              }}
            />
            <span style={{ color: 'var(--t2)', fontSize: 10 }}>
              {onlineCount !== null ? `${onlineCount} online` : 'online'}
            </span>
          </div>

          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMoreMenuOpen((open) => !open)} style={menuButtonStyle(moreMenuOpen)} title="More destinations">
              <MoreIcon size={16} />
            </button>
            {moreMenuOpen && (
              <DropdownContainer width={190}>
                {extraLinks.map((item) => (
                  <MenuLink
                    key={item.path}
                    label={item.label}
                    onClick={() => {
                      navigate(item.path);
                      setMoreMenuOpen(false);
                    }}
                  />
                ))}
              </DropdownContainer>
            )}
          </div>

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen((open) => !open)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                background: userMenuOpen ? 'var(--bg3)' : 'var(--bg2)',
                border: `0.5px solid ${userMenuOpen ? 'var(--b2)' : 'var(--b1)'}`,
                borderRadius: 4,
                cursor: 'pointer',
                color: 'var(--t1)',
                transition: 'border-color 0.12s',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: rankColor,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10 }}>{user?.callsign || 'UNKNOWN'}</span>
              <ChevronDown size={11} style={{ color: 'var(--t3)' }} />
            </button>

            {userMenuOpen && (
              <DropdownContainer width={180}>
                <div style={{ padding: '8px 14px' }}>
                  <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>{user?.callsign || 'UNKNOWN'}</div>
                  <div style={{ marginTop: 5 }}>
                    <span className="nexus-pill nexus-pill-neu" style={{ color: rankColor, borderColor: 'var(--b2)' }}>
                      {user?.rank || 'AFFILIATE'}
                    </span>
                  </div>
                </div>
                <Divider />
                <MenuLink
                  icon={User}
                  label="Profile settings"
                  onClick={() => {
                    navigate('/app/profile');
                    setUserMenuOpen(false);
                  }}
                />
                <MenuLink
                  icon={ScrollText}
                  label="Changelog"
                  onClick={() => {
                    setShowChangelog(true);
                    setUserMenuOpen(false);
                  }}
                />
                <Divider />
                <MenuLink
                  icon={LogOut}
                  label="Sign out"
                  danger
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout('/gate');
                  }}
                />
              </DropdownContainer>
            )}
          </div>
        </div>
      </header>

      {showChangelog && <ChangelogDialog onClose={() => setShowChangelog(false)} />}
    </>
  );
}

function StatusPill({ verseStatus }) {
  const palette = verseStatus === 'offline'
    ? { className: 'nexus-pill-danger', dot: 'var(--danger)', label: 'VERSE OFFLINE' }
    : verseStatus === 'degraded' || verseStatus === 'unknown'
      ? { className: 'nexus-pill-warn', dot: 'var(--warn)', label: verseStatus === 'unknown' ? 'VERSE UNKNOWN' : 'VERSE DEGRADED' }
      : { className: 'nexus-pill-live', dot: 'var(--live)', label: `VERSE LIVE ${VERSE_BUILD_LABEL}` };

  return (
    <div className={`nexus-pill ${palette.className}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: palette.dot,
        }}
      />
      {palette.label}
    </div>
  );
}

function VersionPill({ version, full, date }) {
  const [hovered, setHovered] = useState(false);
  const tooltip = `${full} - ${date}`;

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
    >
      <div className="nexus-pill nexus-pill-neu">v{version}</div>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b2)',
            borderRadius: 6,
            padding: '6px 8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <div style={{ color: 'var(--t1)', fontSize: 9 }}>{full}</div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>{date}</div>
        </div>
      )}
    </div>
  );
}

function LayoutButton({ active, title, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 28,
        borderRadius: 'var(--r-md)',
        border: `0.5px solid ${active ? 'var(--b2)' : 'transparent'}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        background: active ? 'var(--bg3)' : 'transparent',
        color: active ? 'var(--t1)' : 'var(--t2)',
      }}
      onMouseEnter={(event) => {
        if (!active) {
          event.currentTarget.style.background = 'var(--bg2)';
          event.currentTarget.style.borderColor = 'var(--b1)';
        }
      }}
      onMouseLeave={(event) => {
        if (!active) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      {icon}
    </button>
  );
}

function DropdownContainer({ children, width }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 8,
        minWidth: width,
        padding: '6px 0',
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--b1)', margin: '4px 0' }} />;
}

function MenuLink({ icon: Icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '8px 14px',
        fontSize: 10,
        color: danger ? 'var(--danger)' : 'var(--t1)',
        cursor: 'pointer',
        transition: 'background 0.1s',
        background: hovered ? 'var(--bg3)' : 'transparent',
        border: 'none',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {Icon ? <Icon size={13} /> : null}
      {label}
    </button>
  );
}

function menuButtonStyle(active) {
  return {
    width: 30,
    height: 28,
    borderRadius: 'var(--r-md)',
    border: `0.5px solid ${active ? 'var(--b2)' : 'transparent'}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    background: active ? 'var(--bg3)' : 'transparent',
    color: active ? 'var(--t1)' : 'var(--t2)',
  };
}
