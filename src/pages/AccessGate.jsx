import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import NexusCompass from '@/core/design/NexusCompass';
import { authApi } from '@/core/data/auth-api';
import { IS_DEV_MODE, DEV_PERSONAS, setDevPersona } from '@/core/data/dev';
import { useSession } from '@/core/data/SessionContext';
import { useVerseStatus } from '@/core/data/useVerseStatus';

const STAR_SIZES = [
  ...Array(48).fill(1),
  ...Array(24).fill(1.5),
  ...Array(8).fill(2),
];
const STAR_DURATIONS = [3, 5, 7];

function buildStars() {
  if (typeof window === 'undefined') return [];
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const minX = (width / 2) - 100;
  const maxX = (width / 2) + 100;
  const minY = (height / 2) - 200;
  const maxY = (height / 2) + 200;

  return STAR_SIZES.map((size, id) => {
    let x;
    let y;

    do {
      x = Math.random() * width;
      y = Math.random() * height;
    } while (x >= minX && x <= maxX && y >= minY && y <= maxY);

    return {
      id,
      top: (y / height) * 100,
      left: (x / width) * 100,
      size,
      duration: STAR_DURATIONS[Math.floor(Math.random() * STAR_DURATIONS.length)],
      delay: -(Math.random() * 7),
      opacity: 0.15 + (Math.random() * 0.65),
    };
  });
}

function getErrorMessage(errorCode, supportChannelLabel) {
  switch (errorCode) {
    case 'not_in_guild':
      return `You must join the Redscar Discord first. If you already joined, give Discord a moment to sync and try again. Support: ${supportChannelLabel}.`;
    case 'role_not_allowed':
      return `Your Discord account is in the server, but it does not have a Redscar member role yet. Contact leadership in ${supportChannelLabel}.`;
    case 'expired_state':
    case 'state_mismatch':
      return 'Your Discord sign-in session expired before it completed. Start the Discord flow again.';
    case 'token_exchange_failed':
    case 'discord_request_failed':
    case 'callback_failed':
      return 'Discord sign-in could not be completed. Retry once, then contact leadership if the issue persists.';
    default:
      return '';
  }
}

function StatusBar({ status }) {
  const map = {
    offline: { dot: 'var(--danger)', label: 'OFFLINE' },
    degraded: { dot: 'var(--warn)', label: 'DEGRADED' },
    unknown: { dot: 'var(--warn)', label: 'DEGRADED' },
  };
  const cfg = map[status] || { dot: 'var(--live)', label: 'LIVE' };

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        width: '100%',
        height: 32,
        background: 'var(--bg1)',
        borderTop: '0.5px solid var(--b0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
        <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em' }}>VERSE 4.7.0</span>
        <span style={{ margin: '0 6px', fontSize: 9, color: 'var(--t3)' }}>·</span>
        <span style={{ fontSize: 9, color: cfg.dot, letterSpacing: '0.1em' }}>{cfg.label}</span>
      </div>
      <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>
        NEXUSOS · REDSCAR NOMADS · PRIVATE
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="nexus-loading-dots" style={{ color: 'var(--t0)' }}>
      <span />
      <span />
      <span />
    </span>
  );
}

function isBase44Preview() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('base44.com') || window.location.hostname === 'localhost';
}

export default function AccessGate() {
  const location = useLocation();
  const { isAuthenticated, loading, user, refreshSession, setPreviewMode } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [stars, setStars] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(!IS_DEV_MODE);
  const [launching, setLaunching] = useState(false);
  const [healthError, setHealthError] = useState('');
  const isPreview = isBase44Preview();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const authError = useMemo(
    () => getErrorMessage(searchParams.get('error'), health?.support_channel_label || '#nexusos-ops'),
    [health?.support_channel_label, searchParams],
  );

  useEffect(() => {
    setStars(buildStars());
  }, []);

  useEffect(() => {
    if (IS_DEV_MODE) {
      setHealth({
        oauth_ready: true,
        guild_label: 'REDSCAR NOMADS',
        support_channel_label: '#nexusos-ops',
        invite_url: 'https://discord.gg/redscar',
        onboarding_steps: [
          'Choose a simulation persona.',
          'Review the shell and app surfaces.',
          'Switch to live auth in production by disabling demo mode.',
        ],
      });
      setHealthLoading(false);
      return;
    }

    let active = true;
    setHealthLoading(true);

    authApi.getHealth()
      .then((response) => {
        if (!active) return;
        setHealth(response);
        setHealthError(response.ok ? '' : 'Discord sign-in readiness could not be verified.');
      })
      .catch((error) => {
        if (!active) return;
        setHealth(null);
        setHealthError(error?.message || 'Discord sign-in readiness could not be verified.');
      })
      .finally(() => {
        if (active) {
          setHealthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDiscordContinue = () => {
    if (!health?.oauth_ready || launching) {
      return;
    }

    setLaunching(true);
    const redirectTo = searchParams.get('redirect_to') || '/app/industry';
    window.location.assign(authApi.getDiscordStartUrl(redirectTo));
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={user?.onboarding_complete === false ? '/onboarding' : '/app/industry'} replace />;
  }

  // In Base44 preview, bypass auth and show app with mock Pioneer user
  if (isPreview && !IS_DEV_MODE) {
    return <Navigate to="/app/industry" replace />;
  }

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.15; }
        }
      `}</style>

      <div
        style={{
          background: 'var(--bg0)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {stars.map((star) => (
            <div
              key={star.id}
              style={{
                position: 'absolute',
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                borderRadius: '50%',
                background: 'white',
                opacity: star.opacity,
                animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg1)',
            border: '0.5px solid var(--b2)',
            borderRadius: 12,
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              width: '80%',
              height: 1,
              background: 'var(--b3)',
            }}
          />

          <NexusCompass size={44} />
          <div style={{ height: 8 }} />
          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.25em', textAlign: 'center' }}>REDSCAR NOMADS</div>
          <div style={{ height: 4 }} />
          <div style={{ fontSize: 24, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.22em', textAlign: 'center' }}>NEXUSOS</div>
          <div style={{ height: 2 }} />
          <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.18em', textAlign: 'center' }}>ACCESS GATE</div>
          <div style={{ height: 18 }} />

          <div style={{ width: '100%', color: 'var(--t2)', fontSize: 11, lineHeight: 1.7, textAlign: 'center' }}>
            {IS_DEV_MODE
              ? 'Simulation mode is active. Choose any Redscar persona below to launch the shell without live Discord SSO.'
              : `Continue with Discord to verify membership in ${health?.guild_label || 'REDSCAR NOMADS'} and launch the app.`}
          </div>

          <div style={{ height: 18 }} />

          {IS_DEV_MODE ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEV_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className="nexus-btn"
                  onClick={() => {
                    setDevPersona(persona.id);
                    refreshSession();
                  }}
                  style={{ width: '100%', height: 40, justifyContent: 'space-between' }}
                >
                  <span>{persona.callsign}</span>
                  <span style={{ color: 'var(--acc2)' }}>{persona.rank}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDiscordContinue}
              disabled={!health?.oauth_ready || launching || healthLoading}
              className="nexus-btn nexus-btn-solid"
              style={{
                width: '100%',
                height: 40,
                justifyContent: 'center',
                opacity: health?.oauth_ready ? 1 : 0.55,
              }}
            >
              {launching ? <LoadingDots /> : 'CONTINUE WITH DISCORD ->'}
            </button>
          )}

          <div style={{ minHeight: 36, width: '100%', marginTop: 12 }}>
            {authError ? (
              <div style={{ color: 'var(--warn)', fontSize: 10, lineHeight: 1.6, textAlign: 'center' }}>{authError}</div>
            ) : null}
            {!authError && healthError ? (
              <div style={{ color: 'var(--warn)', fontSize: 10, lineHeight: 1.6, textAlign: 'center' }}>{healthError}</div>
            ) : null}
            {!authError && !healthError && !IS_DEV_MODE && health && !health.oauth_ready ? (
              <div style={{ color: 'var(--warn)', fontSize: 10, lineHeight: 1.6, textAlign: 'center' }}>
                Discord sign-in is not fully configured for this deployment yet. Contact leadership in {health.support_channel_label || '#nexusos-ops'}.
              </div>
            ) : null}
          </div>

          {!IS_DEV_MODE && Array.isArray(health?.onboarding_steps) ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {health.onboarding_steps.map((step, index) => (
                <div key={step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--acc2)', minWidth: 10 }}>{index + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ height: 14 }} />

          {!IS_DEV_MODE ? (
            <a
              href={health?.invite_url || 'https://discord.gg/redscar'}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 10, color: 'var(--acc)', textDecoration: 'none' }}
            >
              Request access via {health?.support_channel_label || '#nexusos-ops'}
            </a>
          ) : null}

          {searchParams.get('new') === '1' ? (
            <Link
              to="/onboarding"
              style={{ marginTop: 6, fontSize: 9, color: 'var(--t3)', textDecoration: 'none' }}
            >
              First time here? View onboarding {'->'}
            </Link>
          ) : null}
        </div>

        <StatusBar status={verseStatus} />
      </div>
    </>
  );
}