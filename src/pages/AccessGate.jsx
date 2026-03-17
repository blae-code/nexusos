import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import NexusCompass from '@/core/design/NexusCompass';
import { authApi } from '@/core/data/auth-api';
import { IS_DEV_MODE, DEV_PERSONAS, setDevPersona } from '@/core/data/dev';
import { useSession } from '@/core/data/SessionContext';
import { useVerseStatus } from '@/core/data/useVerseStatus';

const COLORS = {
  void: '#08080A',
  panel: '#0F0F0D',
  accentRed: '#C8391A',
  accentAmber: '#C47A1A',
  textPrimary: '#E8E4DC',
  textSecondary: '#8A8478',
  borderDefault: 'rgba(200, 170, 100, 0.10)',
  borderAccent: 'rgba(200, 170, 100, 0.15)',
};

function buildStars() {
  if (typeof window === 'undefined') return [];
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);

  // ~80 small stars scattered across entire viewport, avoiding nothing (full void)
  const starCount = 80;
  return Array.from({ length: starCount }, (_, id) => ({
    id,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.2 + 0.6,
    opacity: Math.random() * 0.4 + 0.3,
  }));
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

function StatusBar() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: COLORS.void,
        borderTop: `0.5px solid ${COLORS.borderAccent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: COLORS.accentAmber,
            animation: 'pulse-verse 2s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 11, color: COLORS.accentAmber, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          VERSE 4.7.0
        </span>
      </div>
      <div style={{ fontSize: 11, color: COLORS.textSecondary, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        REDSCAR · NOMADS · ETERNAL VOYAGE
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 6, color: COLORS.textPrimary }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textPrimary, animation: 'pulse-dot 1s ease-in-out infinite' }} />
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textPrimary, animation: 'pulse-dot 1s ease-in-out infinite 0.15s' }} />
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textPrimary, animation: 'pulse-dot 1s ease-in-out infinite 0.3s' }} />
    </span>
  );
}

export default function AccessGate() {
  const location = useLocation();
  const { isAuthenticated, loading, user, refreshSession } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [stars, setStars] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(!IS_DEV_MODE);
  const [launching, setLaunching] = useState(false);
  const [healthError, setHealthError] = useState('');

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

        @keyframes pulse-verse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          background: COLORS.void,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          paddingBottom: 32,
        }}
      >
        {/* Starfield background */}
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
                background: COLORS.textPrimary,
                opacity: star.opacity,
              }}
            />
          ))}
          {/* Faint radial amber bloom low on screen */}
          <div
            style={{
              position: 'absolute',
              bottom: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '150%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(180, 90, 20, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Left-anchored terminal panel */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 400,
            marginLeft: '10vw',
            background: COLORS.panel,
            borderLeft: `2px solid ${COLORS.accentRed}`,
            borderTop: `0.5px solid ${COLORS.borderAccent}`,
            borderRight: `0.5px solid ${COLORS.borderDefault}`,
            borderBottom: `0.5px solid ${COLORS.borderDefault}`,
            borderRadius: 2,
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Barlow', sans-serif",
          }}
        >
          {/* Compass icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ filter: 'invert(1) sepia(1) hue-rotate(325deg) brightness(1.1)' }}>
              <NexusCompass size={36} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: COLORS.accentRed, marginBottom: 12 }} />

          {/* Label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.accentAmber,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: 8,
            }}
          >
            REDSCAR NOMADS
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.textPrimary,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            NEXUSOS
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: COLORS.textSecondary,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: 24,
            }}
          >
            ACCESS GATE
          </div>

          {/* Body copy */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: COLORS.textSecondary,
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            Continue with Discord to verify your Redscar Nomads membership and launch the app.
          </div>

          {/* Dev persona selector or Discord button */}
          {IS_DEV_MODE ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {DEV_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => {
                    setDevPersona(persona.id);
                    refreshSession();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: COLORS.accentRed,
                    border: 'none',
                    borderRadius: 2,
                    cursor: 'pointer',
                    color: COLORS.textPrimary,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#A82D14'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.accentRed; }}
                >
                  {persona.callsign} — {persona.rank}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDiscordContinue}
              disabled={!health?.oauth_ready || launching || healthLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: !health?.oauth_ready || healthLoading ? COLORS.textSecondary : COLORS.accentRed,
                border: 'none',
                borderRadius: 2,
                cursor: health?.oauth_ready && !launching && !healthLoading ? 'pointer' : 'not-allowed',
                color: COLORS.textPrimary,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'background 0.2s',
                opacity: health?.oauth_ready ? 1 : 0.6,
                marginBottom: 20,
              }}
              onMouseEnter={(e) => {
                if (health?.oauth_ready && !launching && !healthLoading) {
                  e.currentTarget.style.background = '#A82D14';
                }
              }}
              onMouseLeave={(e) => {
                if (health?.oauth_ready && !launching && !healthLoading) {
                  e.currentTarget.style.background = COLORS.accentRed;
                }
              }}
            >
              {launching ? <LoadingDots /> : 'CONTINUE WITH DISCORD →'}
            </button>
          )}

          {/* Error messages */}
          {(authError || healthError || (!IS_DEV_MODE && health && !health.oauth_ready)) && (
            <div
              style={{
                color: COLORS.accentAmber,
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.6,
                marginBottom: 20,
                fontFamily: "'Barlow', sans-serif",
              }}
            >
              {authError || healthError || (
                <span>
                  Discord sign-in is not fully configured. Contact leadership in {health?.support_channel_label || '#nexusos-ops'}.
                </span>
              )}
            </div>
          )}

          {/* Footer link */}
          {!IS_DEV_MODE && (
            <a
              href={health?.invite_url || 'https://discord.gg/redscar'}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12,
                color: COLORS.textSecondary,
                textDecoration: 'none',
                transition: 'color 0.2s',
                fontFamily: "'Barlow', sans-serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.accentAmber; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textSecondary; }}
            >
              Request access via #nexusos-ops
            </a>
          )}
        </div>

        <StatusBar />
      </div>
    </>
  );
}