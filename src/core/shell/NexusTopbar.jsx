import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LogOut, ScrollText, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import NexusCompass from '@/core/design/NexusCompass';
import { RankBadge } from '@/core/design';
import { useSession } from '@/core/data/SessionContext';
import { appVersion } from '@/core/data/generated/versioning';
import { VERSE_BUILD_LABEL } from '@/core/data/useVerseStatus';
import { AltTabIcon, SecondMonitorIcon } from './NexusIcons';
import { StatusPill, VersionPill } from './TopbarPills';
import { LayoutButton, Divider, MenuLink, ChangelogPanel } from './TopbarMenu';
import { IS_DEV_MODE } from '@/core/data/dev';




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
    return { module: 'Industry', tab: industryTabLabels[tabParam] || 'Overview' };
  }
  if (pathname === '/app/scout') {
    const tabParam = params.get('tab');
    const scoutTabs = { deposits: 'Deposits', routes: 'Routes' };
    return { module: 'Intel', tab: scoutTabs[tabParam] || 'Deposits' };
  }
  if (pathname === '/app/ops') return { module: 'Operations', tab: null };
  if (pathname === '/app/ops/new') return { module: 'Operations', tab: 'New Op' };
  if (pathname.startsWith('/app/ops/')) return { module: 'Operations', tab: 'Live Op' };
  if (pathname === '/app/fleet') return { module: 'Fleet Forge', tab: null };
  if (pathname === '/app/coffer') return { module: 'Coffer', tab: null };
  if (pathname === '/app/rescue') return { module: 'Rescue Board', tab: null };
  if (pathname === '/app/roster') return { module: 'Roster', tab: null };
  if (pathname === '/app/armory') {
    const tabParam = params.get('tab');
    const armoryTabs = { inventory: 'Inventory', checkout: 'Checkout', activity: 'Activity' };
    return { module: 'Armory', tab: armoryTabs[tabParam] || null };
  }
  if (pathname === '/app/archive') return { module: 'Archive', tab: null };
  if (pathname === '/app/commerce') return { module: 'Commerce', tab: null };
  if (pathname === '/app/logistics') return { module: 'Logistics', tab: null };
  if (pathname === '/app/profit') return { module: 'Profit Calc', tab: null };
  if (pathname === '/app/ledger') return { module: 'Material Ledger', tab: null };
  if (pathname === '/app/handbook') return { module: 'Org Handbook', tab: null };
  if (pathname === '/app/profile' || pathname === '/app/settings') return { module: 'Settings', tab: null };
  if (pathname === '/app/admin/todo') return { module: 'Admin', tab: 'Setup TODO' };
  return { module: 'NexusOS', tab: null };
}

function menuButtonStyle(active) {
  return {
    width: 30,
    height: 28,
    borderRadius: 3,
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
  const [onlineCount, setOnlineCount] = useState(null);
  const [cofferBalance, setCofferBalance] = useState(null);
  const [rescueCount, setRescueCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const userMenuRef = useRef(null);
  const changelogRef = useRef(null);

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );



  const showPtuPill = VERSE_BUILD_LABEL.toUpperCase().includes('PTU');

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const [members, cofferEntries, rescueCalls] = await Promise.all([
          base44.entities.NexusUser.list('-joined_at', 200),
          base44.entities.CofferLog.list('-logged_at', 1),
          base44.entities.Op.filter({ status: 'LIVE' }),
        ]);
        
        if (cancelled) return;
        
        setOnlineCount((members || []).length);
        
        // Sum recent coffer entries (last 100 to get org balance)
        const cofferRecent = await base44.entities.CofferLog.list('-logged_at', 100);
        const balance = (cofferRecent || []).reduce((sum, entry) => {
          return entry.entry_type === 'SALE' || entry.entry_type === 'CRAFT_SALE' 
            ? sum + (entry.amount_aUEC || 0)
            : sum - (entry.amount_aUEC || 0);
        }, 0);
        setCofferBalance(Math.max(0, balance));
        
        // Count active rescue calls
        setRescueCount((rescueCalls || []).length);
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusTopbar] metrics load failed:', error?.message || error);
        }
      }
    };

    loadMetrics();
    const intervalId = window.setInterval(loadMetrics, 60000);

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
  }, [showChangelog, setShowChangelog]);

  return (
    <div style={{ position: 'relative', flexShrink: 0, height: 'var(--topbar-h)' }}>
      <header
        style={{
          height: 'var(--topbar-h)',
          background: 'linear-gradient(180deg, #0D0C0A 0%, #0A0908 100%)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          gap: 12,
          position: 'relative',
          zIndex: 20,
          boxSizing: 'border-box',
          boxShadow: 'inset 0 1px 0 rgba(232,228,220,0.04), 0 1px 0 rgba(192,57,43,0.08)',
        }}
      >
        {/* Red bloom at left edge — echoes sidebar stripe */}
        <div style={{
          position: 'absolute',
          left: 52,
          top: 0,
          bottom: 0,
          width: 60,
          background: 'radial-gradient(ellipse 100% 100% at 0% 50%, rgba(192,57,43,0.10) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NexusCompass size={22} />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.22em',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: '#E8E4DC' }}>NEXUS</span>
              <span style={{ color: '#C0392B', opacity: 0.9 }}>OS</span>
            </span>
          </div>

          {/* Tactical separator */}
          <div style={{ width: '0.5px', height: 16, background: 'rgba(200,170,100,0.18)', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            <span style={{ color: '#C8A84B', whiteSpace: 'nowrap', fontWeight: 600 }}>{breadcrumb.module}</span>
            {breadcrumb.tab && (
              <>
                <span style={{ color: 'rgba(200,170,100,0.25)', fontSize: 9, letterSpacing: 0 }}>▸</span>
                <span style={{ color: '#E8E4DC', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {breadcrumb.tab}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <StatusPill verseStatus={verseStatus} />
          {IS_DEV_MODE ? (
            <div
              className="nexus-pill nexus-pill-warn"
              title="Simulation environment — data is synthetic"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
              SIM
            </div>
          ) : null}
          {showPtuPill ? <div className="nexus-pill nexus-pill-warn">PTU</div> : null}
          <div className="nexus-pill nexus-pill-neu">REDSCAR NOMADS</div>
          <VersionPill version={appVersion.version} full={appVersion.full} date={appVersion.date} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
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

          {/* Coffer balance */}
          {cofferBalance !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              background: 'rgba(200,168,75,0.05)',
              border: '0.5px solid rgba(200,168,75,0.12)',
              borderRadius: 3,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/app/coffer')}
            title="Org Coffer">
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#C8A84B',
                display: 'inline-block',
                flexShrink: 0,
              }} />
              <span style={{ color: '#C8A84B', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {cofferBalance ? (cofferBalance / 1000000).toFixed(1) : '0'} <span style={{ opacity: 0.6, fontWeight: 400 }}>M aUEC</span>
              </span>
            </div>
          )}

          {/* Member count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            background: 'rgba(200,168,75,0.05)',
            border: '0.5px solid rgba(200,168,75,0.12)',
            borderRadius: 3,
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#C8A84B',
              display: 'inline-block',
              animation: 'pulse-dot 2.5s ease-in-out infinite',
              boxShadow: '0 0 4px rgba(200,168,75,0.5)',
              flexShrink: 0,
            }} />
            <span style={{ color: '#C8A84B', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {onlineCount !== null ? `${onlineCount}` : '—'} <span style={{ opacity: 0.6, fontWeight: 400 }}>MBR</span>
            </span>
          </div>

          {/* Rescue count badge */}
          {rescueCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              background: 'rgba(192,57,43,0.1)',
              border: '0.5px solid rgba(192,57,43,0.25)',
              borderRadius: 3,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/app/rescue')}
            title="Active rescue calls">
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#C0392B',
                display: 'inline-block',
                animation: 'pulse-dot 2.5s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ color: '#C0392B', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rescueCount} <span style={{ opacity: 0.6, fontWeight: 400 }}>RESCUE</span>
              </span>
            </div>
          )}

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: userMenuOpen ? 'rgba(192,57,43,0.10)' : 'rgba(15,14,12,0.8)',
                border: `0.5px solid ${userMenuOpen ? 'rgba(192,57,43,0.5)' : 'rgba(200,170,100,0.15)'}`,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
                boxShadow: userMenuOpen ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <RankBadge
                rank={source === 'admin' ? 'PIONEER' : (user?.rank || 'AFFILIATE')}
                size={16}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <span style={{ fontSize: 11, color: '#E8E4DC', lineHeight: 1, fontFamily: 'inherit' }}>
                  {source === 'admin' ? 'System Administrator' : (user?.callsign || 'UNKNOWN')}
                </span>
                <span style={{ fontSize: 9, color: '#9A9488', lineHeight: 1, letterSpacing: '0.08em' }}>
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