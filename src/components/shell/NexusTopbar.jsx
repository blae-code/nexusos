import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LogOut, ScrollText, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import NexusCompass from '@/components/ui/NexusCompass';
import NexusToken from '@/components/ui/NexusToken';
import { rankToken } from '@/lib/tokenMap';
import { useSession } from '@/lib/SessionContext';
import { appVersion } from '@/lib/generated/versioning';
import { VERSE_BUILD_LABEL } from '@/lib/useVerseStatus';
import { AltTabIcon, MoreIcon, SecondMonitorIcon } from './NexusIcons';
import { StatusPill, VersionPill } from './TopbarPills';
import { LayoutButton, DropdownContainer, Divider, MenuLink, ChangelogPanel } from './TopbarMenu';

const RANK_COLOURS = {
  PIONEER: 'var(--warn)',
  FOUNDER: 'var(--acc2)',
  VOYAGER: 'var(--info)',
  SCOUT: 'var(--live)',
  VAGRANT: 'var(--t1)',
  AFFILIATE: 'var(--t2)',
  SYSTEM_ADMIN: 'var(--info)',
};

const EXTRA_LINKS = [
  { label: 'Profit Calculator', path: '/app/profit' },
  { label: 'Epic Archive', path: '/app/archive' },
  { label: 'Material Ledger', path: '/app/ledger' },
];

function getBreadcrumb(pathname, search) {
  const params = new URLSearchParams(search || '');

  const industryTabLabels = {
    overview: 'Overview',
    materials: 'Materials',
    blueprints: 'Blueprints',
    craft: 'Craft Queue',
    refinery: 'Refinery',
  };

  if (pathname === '/app/industry') {
    const tabParam = params.get('tab');
    return { module: 'Industry Hub', tab: industryTabLabels[tabParam] || 'Overview' };
  }
  if (pathname === '/app/scout') {
    const tabParam = params.get('tab');
    const scoutTabs = { deposits: 'Deposits', routes: 'Routes' };
    return { module: 'Scout Intel', tab: scoutTabs[tabParam] || 'Deposits' };
  }
  if (pathname === '/app/ops') return { module: 'Op Board', tab: null };
  if (pathname === '/app/ops/new') return { module: 'Op Board', tab: 'New Op' };
  if (pathname.startsWith('/app/ops/')) return { module: 'Op Board', tab: 'Live Op' };
  if (pathname === '/app/fleet') return { module: 'Fleet Forge', tab: null };
  if (pathname === '/app/coffer') return { module: 'Coffer', tab: null };
  if (pathname === '/app/rescue') return { module: 'Rescue Board', tab: null };
  if (pathname === '/app/roster') return { module: 'Roster', tab: null };
  if (pathname === '/app/armory') {
    const tabParam = params.get('tab');
    const armoryTabs = { inventory: 'Inventory', checkout: 'Checkout', activity: 'Activity' };
    return { module: 'Armory', tab: armoryTabs[tabParam] || null };
  }
  if (pathname === '/app/archive') return { module: 'Epic Archive', tab: null };
  if (pathname === '/app/profit') return { module: 'Profit Calc', tab: null };
  if (pathname === '/app/ledger') return { module: 'Material Ledger', tab: null };
  if (pathname === '/app/handbook') return { module: 'Org Handbook', tab: null };
  if (pathname === '/app/profile' || pathname === '/app/settings') return { module: 'Profile', tab: 'Settings' };
  if (pathname === '/app/admin/todo') return { module: 'Admin', tab: 'Setup TODO' };
  if (pathname === '/app/admin/keys') return { module: 'Admin', tab: 'Key Management' };
  return { module: 'NexusOS', tab: null };
}

function menuButtonStyle(active) {
  return {
    width: 30,
    height: 28,
    borderRadius: 6,
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

export default function NexusTopbar({ layoutMode, onSelectLayout, verseStatus }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, source } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const userMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const changelogRef = useRef(null);

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const extraLinks = source === 'admin' || ['PIONEER', 'FOUNDER'].includes(user?.rank)
    ? [...EXTRA_LINKS, { label: 'Setup TODO', path: '/app/admin/todo' }]
    : EXTRA_LINKS;

  const showPtuPill = VERSE_BUILD_LABEL.toUpperCase().includes('PTU');
  const rankColor = RANK_COLOURS[user?.rank] || 'var(--t1)';

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
    const handleMouseDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (showChangelog && changelogRef.current && !changelogRef.current.contains(event.target)) {
        setShowChangelog(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMoreMenuOpen(false);
        setShowChangelog(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showChangelog]);

  return (
    <div style={{ position: 'relative', flexShrink: 0, height: 'var(--topbar-h)' }}>
      <header
        style={{
          height: 'var(--topbar-h)',
          background: 'var(--bg0)',
          borderBottom: '0.5px solid var(--b1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          gap: 12,
          position: 'relative',
          zIndex: 20,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NexusCompass size={22} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--t0)',
                letterSpacing: '0.2em',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--t0)' }}>NEXUS</span>
              <span style={{ color: 'var(--t2)' }}>OS</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--t2)', whiteSpace: 'nowrap' }}>{breadcrumb.module}</span>
            {breadcrumb.tab && (
              <>
                <span style={{ color: 'var(--t2)' }}>/</span>
                <span style={{ color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {breadcrumb.tab}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <StatusPill verseStatus={verseStatus} />
          {showPtuPill ? <div className="nexus-pill nexus-pill-warn">PTU</div> : null}
          <div className="nexus-pill nexus-pill-neu">REDSCAR NOMADS</div>
          <VersionPill version={appVersion.version} full={appVersion.full} date={appVersion.date} />
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
            <button
              type="button"
              onClick={() => setMoreMenuOpen((open) => !open)}
              style={menuButtonStyle(moreMenuOpen)}
              title="More destinations"
            >
              <MoreIcon size={16} />
            </button>
            {moreMenuOpen ? (
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
            ) : null}
          </div>

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: userMenuOpen ? 'var(--bg3)' : 'var(--bg2)',
                border: `0.5px solid ${userMenuOpen ? 'var(--b2)' : 'var(--b1)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
            >
              <NexusToken
                src={rankToken(source === 'admin' ? 'PIONEER' : (user?.rank || 'AFFILIATE'))}
                size={16}
                alt={source === 'admin' ? 'SYSTEM_ADMIN' : (user?.rank || 'AFFILIATE')}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--t0)', lineHeight: 1, fontFamily: 'inherit' }}>
                  {source === 'admin' ? 'System Administrator' : (user?.callsign || 'UNKNOWN')}
                </span>
                <span style={{ fontSize: 9, color: 'var(--t3)', lineHeight: 1, letterSpacing: '0.08em' }}>
                  {source === 'admin' ? 'SUDO' : (user?.rank || 'AFFILIATE')}
                </span>
              </div>
              <ChevronDown size={11} style={{ color: 'var(--t3)', marginLeft: 2 }} />
            </button>

            {userMenuOpen ? (
              <DropdownContainer width={180}>
                <MenuLink
                  icon={User}
                  label="Profile"
                  disabled={signingOut}
                  onClick={() => {
                    navigate('/app/profile');
                    setUserMenuOpen(false);
                  }}
                />
                <MenuLink
                  icon={User}
                  label="Preferences"
                  disabled={signingOut}
                  onClick={() => {
                    navigate('/app/settings');
                    setUserMenuOpen(false);
                  }}
                />
                <MenuLink
                  icon={ScrollText}
                  label="Changelog"
                  disabled={signingOut}
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
                  disabled={signingOut}
                  spinner={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    await logout('/');
                  }}
                />
              </DropdownContainer>
            ) : null}
          </div>
        </div>
      </header>

      {showChangelog ? (
        <div ref={changelogRef}>
          <ChangelogPanel onClose={() => setShowChangelog(false)} />
        </div>
      ) : null}
    </div>
  );
}