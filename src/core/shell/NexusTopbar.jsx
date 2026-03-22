import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LogOut, ScrollText, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { authApi } from '@/core/data/auth-api';
import NexusCompass from '@/core/design/NexusCompass';
import { RankBadge } from '@/core/design';
import { useSession } from '@/core/data/SessionContext';
import { appVersion } from '@/core/data/generated/versioning';
import { VERSE_BUILD_LABEL } from '@/core/data/useVerseStatus';
import { AltTabIcon, SecondMonitorIcon } from './NexusIcons';
import { StatusPill, VersionPill } from './TopbarPills';
import { LayoutButton, Divider, MenuLink, ChangelogPanel, DropdownContainer } from './TopbarMenu';
import { DEV_PERSONAS, IS_DEV_MODE, IS_LOCAL_SIMULATION_MODE, IS_SHARED_SANDBOX_MODE } from '@/core/data/dev';




function getBreadcrumb(pathname, search) {
  const params = new URLSearchParams(search || '');

  const industryTabLabels = {
    overview: 'Overview',
    materials: 'Materials',
    blueprints: 'Blueprints',
    craft: 'Craft Queue',
    refinery: 'Refinery',
    coffer: 'Coffer',
    ledger: 'Material Ledger',
    commerce: 'Commerce',
    profit: 'Profit Calc',
  };

  const scoutTabLabels = {
    deposits: 'Deposits',
    routes: 'Routes',
  };

  const opsTabLabels = {
    rescue: 'Rescue Board',
    archive: 'Archive',
    new: 'New Op',
  };

  const armoryTabLabels = {
    inventory: 'Inventory',
    checkout: 'Checkout',
    activity: 'Activity',
    fleet: 'Fleet Forge',
    schedule: 'Crew Scheduler',
    'org-fleet': 'Org Fleet',
  };

  // Nested routes
  if (pathname.startsWith('/app/industry')) {
    const segment = pathname.split('/')[3];
    const tabParam = params.get('tab');
    return { module: 'Industry', tab: industryTabLabels[segment] || industryTabLabels[tabParam] || 'Overview' };
  }
  if (pathname.startsWith('/app/scout')) {
    const segment = pathname.split('/')[3];
    return { module: 'Intel', tab: scoutTabLabels[segment] || 'Deposits' };
  }
  if (pathname.startsWith('/app/ops')) {
    const segment = pathname.split('/')[3];
    if (segment === 'new') return { module: 'Operations', tab: 'New Op' };
    if (segment === 'rescue') return { module: 'Operations', tab: 'Rescue Board' };
    if (segment === 'archive') return { module: 'Operations', tab: 'Archive' };
    if (segment && segment !== 'new' && !segment.match(/^[a-z0-9]+$/i)) return { module: 'Operations', tab: 'Live Op' };
    return { module: 'Operations', tab: null };
  }
  if (pathname.startsWith('/app/armory')) {
    const segment = pathname.split('/')[3];
    const tabParam = params.get('tab');
    return { module: 'Armory', tab: armoryTabLabels[segment] || armoryTabLabels[tabParam] || null };
  }

  // Legacy fallbacks
  if (pathname === '/app/roster') return { module: 'Roster', tab: null };
  if (pathname === '/app/profile' || pathname === '/app/settings') return { module: 'Settings', tab: null };
  if (pathname === '/app/admin/todo') return { module: 'Admin', tab: 'Setup TODO' };
  if (pathname === '/app/admin/settings') return { module: 'Admin', tab: 'Settings' };
  if (pathname === '/app/handbook') return { module: 'Org Handbook', tab: null };
  if (pathname === '/app/training') return { module: 'Training', tab: null };
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
  const { user, logout, patchUser, refreshSession, source } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const [cofferBalance, setCofferBalance] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [rescueCount, setRescueCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const userMenuRef = useRef(null);
  const changelogRef = useRef(null);

  const breadcrumb = useMemo(
    () => getBreadcrumb(location.pathname, location.search),
    [location.pathname, location.search],
  );



  const showPtuPill = VERSE_BUILD_LABEL.toUpperCase().includes('PTU');
  const sandboxLabel = IS_SHARED_SANDBOX_MODE ? 'COLLAB' : 'SIM';

  const handlePersonaSwitch = async (personaId) => {
    setSandboxBusy(true);
    try {
      await authApi.setDemoPersona(personaId);
      await refreshSession();
      navigate('/app/industry');
      setUserMenuOpen(false);
    } finally {
      setSandboxBusy(false);
    }
  };

  const handleReplayOnboarding = async () => {
    if (!user?.id) return;

    setSandboxBusy(true);
    try {
      await base44.entities.NexusUser.update(user.id, {
        onboarding_complete: false,
        consent_given: false,
        consent_timestamp: null,
      });
      patchUser({ onboarding_complete: false });
      setUserMenuOpen(false);
      navigate('/onboarding');
    } finally {
      setSandboxBusy(false);
    }
  };

  const handleSandboxReset = async () => {
    setSandboxBusy(true);
    try {
      await authApi.resetDemoSandbox();
      await refreshSession();
      navigate('/app/industry');
      setUserMenuOpen(false);
    } finally {
      setSandboxBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const [members, cofferEntries, rescueCalls, userWallet] = await Promise.all([
          base44.entities.NexusUser.list('-joined_at', 200),
          base44.entities.CofferLog.list('-logged_at', 1),
          base44.entities.Op.filter({ status: 'LIVE' }),
          base44.auth.me(),
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
        
        // Personal wallet balance
        setWalletBalance(userWallet?.wallet_balance || 0);
        
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
      if (showChangelog && changelogRef.current && !changelogRef.current.contains(event.target)) {
        setShowChangelog(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
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
            <img 
              src="https://www.redscar.org/images/2223.png" 
              alt="Redscar Nomads" 
              style={{ 
                height: 20, 
                width: 'auto',
                filter: 'brightness(0.98) drop-shadow(0 0 2px rgba(192,57,43,0.25))',
              }} 
            />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.20em',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: '#E8E4DC' }}>NEXUS</span>
              <span style={{ color: '#C0392B', opacity: 0.85 }}>OS</span>
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

        {/* ORG METRICS SECTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusPill verseStatus={verseStatus} />
          {IS_DEV_MODE ? (
            <div
              className="nexus-pill nexus-pill-warn"
              title={IS_SHARED_SANDBOX_MODE ? 'Shared collaboration sandbox — data is synthetic and shared across collaborators' : 'Local simulation environment — data is synthetic'}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
              {sandboxLabel}
            </div>
          ) : null}
          {showPtuPill ? <div className="nexus-pill nexus-pill-warn">PTU</div> : null}

          {/* Separator */}
          <div style={{ width: '0.5px', height: 14, background: 'rgba(200,170,100,0.2)' }} />

          {/* Personal Wallet */}
          {walletBalance !== null && (
            <div
              onClick={() => navigate('/app/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: 'rgba(192,57,43,0.08)',
                border: '0.5px solid rgba(192,57,43,0.15)',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(192,57,43,0.12)';
                e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(192,57,43,0.08)';
                e.currentTarget.style.borderColor = 'rgba(192,57,43,0.15)';
              }}
              title="Personal Wallet"
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
              <span style={{ color: '#C0392B', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {(walletBalance / 1000000).toFixed(1)}M aUEC
              </span>
            </div>
          )}

          {/* Coffer */}
          {cofferBalance !== null && (
            <div
              onClick={() => navigate('/app/industry/coffer')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: 'rgba(200,168,75,0.08)',
                border: '0.5px solid rgba(200,168,75,0.15)',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(200,168,75,0.12)';
                e.currentTarget.style.borderColor = 'rgba(200,168,75,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(200,168,75,0.08)';
                e.currentTarget.style.borderColor = 'rgba(200,168,75,0.15)';
              }}
              title="Organization Coffer"
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8A84B', flexShrink: 0 }} />
              <span style={{ color: '#C8A84B', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {(cofferBalance / 1000000).toFixed(1)}M aUEC
              </span>
            </div>
          )}

          {/* Members */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              background: 'rgba(200,168,75,0.08)',
              border: '0.5px solid rgba(200,168,75,0.15)',
              borderRadius: 3,
            }}
            title="Active Members"
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8A84B', animation: 'pulse-dot 2.5s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ color: '#C8A84B', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {onlineCount ?? '—'}
            </span>
          </div>

          {/* Rescue */}
          {rescueCount > 0 && (
            <div
              onClick={() => navigate('/app/rescue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: 'rgba(192,57,43,0.12)',
                border: '0.5px solid rgba(192,57,43,0.3)',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(192,57,43,0.18)';
                e.currentTarget.style.borderColor = 'rgba(192,57,43,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(192,57,43,0.12)';
                e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)';
              }}
              title="Active Rescue Calls"
              >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 2.5s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ color: '#C0392B', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" }}>
               {rescueCount}
              </span>
              </div>
              )}

              {/* Separator */}
              <div style={{ width: '0.5px', height: 14, background: 'rgba(200,170,100,0.2)' }} />
        </div>

        {/* USER & CONTROLS SECTION */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            color: 'var(--t2)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LayoutButton
              active={layoutMode === 'ALT-TAB'}
              title="ALT-TAB"
              onClick={() => onSelectLayout('ALT-TAB')}
              icon={<AltTabIcon size={14} />}
            />
            <LayoutButton
              active={layoutMode === '2ND MONITOR'}
              title="2ND MONITOR"
              onClick={() => onSelectLayout('2ND MONITOR')}
              icon={<SecondMonitorIcon size={14} />}
            />
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
              <DropdownContainer width={IS_DEV_MODE ? 240 : 180}>
                <MenuLink
                  icon={User}
                  label="Profile"
                  disabled={signingOut || sandboxBusy}
                  onClick={() => {
                    navigate('/app/profile');
                    setUserMenuOpen(false);
                  }}
                />
                <MenuLink
                  icon={User}
                  label="Preferences"
                  disabled={signingOut || sandboxBusy}
                  onClick={() => {
                    navigate('/app/settings');
                    setUserMenuOpen(false);
                  }}
                />
                <MenuLink
                  icon={ScrollText}
                  label="Changelog"
                  disabled={signingOut || sandboxBusy}
                  onClick={() => {
                    setShowChangelog(true);
                    setUserMenuOpen(false);
                  }}
                />
                {IS_DEV_MODE ? (
                  <>
                    <Divider />
                    <div style={{ padding: '7px 12px 4px', color: '#C8A84B', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      {IS_SHARED_SANDBOX_MODE ? 'Sandbox Roles' : 'Local Personas'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 8px' }}>
                      {DEV_PERSONAS.map((persona) => (
                        <button
                          key={persona.id}
                          type="button"
                          disabled={sandboxBusy || user?.rank === persona.rank}
                          onClick={() => handlePersonaSwitch(persona.id)}
                          style={{
                            padding: '5px 8px',
                            fontSize: 9,
                            letterSpacing: '0.08em',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            textTransform: 'uppercase',
                            color: user?.rank === persona.rank ? '#E8E4DC' : '#9A9488',
                            background: user?.rank === persona.rank ? 'rgba(192,57,43,0.10)' : 'rgba(200,170,100,0.04)',
                            border: `0.5px solid ${user?.rank === persona.rank ? 'rgba(192,57,43,0.35)' : 'rgba(200,170,100,0.12)'}`,
                            borderRadius: 3,
                            cursor: sandboxBusy || user?.rank === persona.rank ? 'default' : 'pointer',
                            opacity: sandboxBusy ? 0.65 : 1,
                          }}
                        >
                          {persona.rank}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 6 }}>
                      <MenuLink
                        icon={ScrollText}
                        label="Replay Onboarding"
                        disabled={signingOut || sandboxBusy}
                        onClick={handleReplayOnboarding}
                      />
                      {IS_SHARED_SANDBOX_MODE ? (
                        <MenuLink
                          icon={ScrollText}
                          label="Reset Shared Sandbox"
                          disabled={signingOut || sandboxBusy}
                          onClick={handleSandboxReset}
                        />
                      ) : null}
                    </div>
                  </>
                ) : null}
                <Divider />
                <MenuLink
                  icon={LogOut}
                  label="Sign out"
                  danger
                  disabled={signingOut || sandboxBusy}
                  spinner={signingOut || sandboxBusy}
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
