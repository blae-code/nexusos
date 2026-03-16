import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import NexusCompass from '@/components/ui/NexusCompass';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';
import { VERSE_BUILD_LABEL, useVerseStatus } from '@/lib/useVerseStatus';

const STAR_COUNT = 80;
const STAR_SIZES = [
  ...Array(48).fill(1),
  ...Array(24).fill(1.5),
  ...Array(8).fill(2),
];
const STAR_DURATIONS = [3, 5, 7];

function buildStars() {
  if (typeof window === 'undefined') {
    return [];
  }

  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const centerLeft = width / 2 - 100;
  const centerRight = width / 2 + 100;
  const centerTop = height / 2 - 200;
  const centerBottom = height / 2 + 200;

  return STAR_SIZES.map((size, index) => {
    let left = 0;
    let top = 0;

    do {
      left = Math.random() * width;
      top = Math.random() * height;
    } while (left >= centerLeft && left <= centerRight && top >= centerTop && top <= centerBottom);

    return {
      id: index,
      top: (top / height) * 100,
      left: (left / width) * 100,
      size,
      duration: STAR_DURATIONS[Math.floor(Math.random() * STAR_DURATIONS.length)],
    };
  });
}

function StatusBar({ status }) {
  const palette = status === 'offline'
    ? { dot: 'var(--danger)', text: 'OFFLINE' }
    : status === 'degraded' || status === 'unknown'
      ? { dot: 'var(--warn)', text: 'DEGRADED' }
      : { dot: 'var(--live)', text: 'ONLINE' };

  return (
    <footer
      style={{
        position: 'sticky',
        bottom: 0,
        height: 32,
        background: 'var(--bg1)',
        borderTop: '0.5px solid var(--b0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        width: '100%',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 9 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: palette.dot }} />
        <span style={{ color: 'var(--t2)', marginLeft: 6 }}>VERSE {VERSE_BUILD_LABEL}</span>
        <span style={{ color: 'var(--t3)', margin: '0 6px' }}>·</span>
        <span style={{ color: palette.dot }}>{palette.text}</span>
      </div>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>
        NEXUSOS · REDSCAR NOMADS · PRIVATE
      </span>
    </footer>
  );
}

function OnboardingChecklist({ guildLabel, supportChannelLabel, inviteUrl, steps, onClose }) {
  return (
    <div
      style={{
        width: '100%',
        marginTop: 16,
        padding: '12px 14px',
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ color: 'var(--t0)', fontSize: 10, letterSpacing: '0.12em' }}>FIRST-TIME CHECKLIST</div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 10 }}
        >
          HIDE
        </button>
      </div>

      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, marginTop: 8 }}>
        Access is role-gated through Discord for {guildLabel}. New members should complete these steps before trying to launch the app.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {steps.map((step, index) => (
          <div key={step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--bg3)',
                border: '0.5px solid var(--b2)',
                color: 'var(--t1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {index + 1}
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 10, lineHeight: 1.6 }}>{step}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="nexus-btn"
          style={{ flex: 1, textAlign: 'center', fontSize: 10 }}
        >
          JOIN DISCORD
        </a>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="nexus-btn"
          style={{ flex: 1, textAlign: 'center', fontSize: 10 }}
        >
          OPEN {supportChannelLabel.toUpperCase()}
        </a>
      </div>
    </div>
  );
}

export default function AccessGate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading, source } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [stars, setStars] = useState([]);
  const [authHealth, setAuthHealth] = useState({
    loaded: false,
    oauthReady: true,
    guildLabel: 'REDSCAR NOMADS',
    supportChannelLabel: '#nexusos-ops',
    inviteUrl: 'https://discord.gg/redscar',
    onboardingSteps: FALLBACK_ONBOARDING_STEPS,
  });

  const redirectTo = searchParams.get('redirect_to') || '/app/industry';
  const errorCode = searchParams.get('error');
  const errorMessage = localError
    || ERROR_MESSAGES[errorCode]
    || (authHealth.loaded && authHealth.oauthReady === false ? 'DISCORD LOGIN TEMPORARILY UNAVAILABLE' : '');
  const errorDetail = ERROR_DETAILS[errorCode]
    || (authHealth.loaded && authHealth.oauthReady === false
      ? 'The deployed app is missing required Discord auth configuration. Contact a Redscar operator before retrying.'
      : '');
  const showOnboarding = searchParams.get('new') === '1';

  useEffect(() => {
    setStars(buildStars());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAuthHealth = async () => {
      try {
        const health = await authApi.getHealth();
        if (cancelled || !health) {
          return;
        }

        setAuthHealth({
          loaded: true,
          oauthReady: health.oauth_ready !== false,
          guildLabel: health.guild_label || 'REDSCAR NOMADS',
          supportChannelLabel: health.support_channel_label || '#nexusos-ops',
          inviteUrl: health.invite_url || 'https://discord.gg/redscar',
          onboardingSteps: Array.isArray(health.onboarding_steps) && health.onboarding_steps.length > 0
            ? health.onboarding_steps
            : FALLBACK_ONBOARDING_STEPS,
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('[AccessGate] auth health unavailable:', error?.message || error);
          setAuthHealth((current) => ({ ...current, loaded: true }));
        }
      }
    };

    loadAuthHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (errorMessage) {
      setShakeKey((value) => value + 1);
      setStarting(false);
    }
  }, [errorMessage]);

  if (!loading && isAuthenticated) {
    const target = searchParams.get('redirect_to')
      || (source === 'admin' ? '/app/admin/todo' : '/app/industry');
    return <Navigate to={target} replace />;
  }

  const startDiscordAuth = () => {
    if (authHealth.loaded && authHealth.oauthReady === false) {
      setLocalError('DISCORD LOGIN TEMPORARILY UNAVAILABLE');
      return;
    }

    try {
      setStarting(true);
      setLocalError('');
      window.location.assign(authApi.getDiscordStartUrl(redirectTo));
    } catch (error) {
      console.warn('[AccessGate] failed to start Discord OAuth:', error?.message || error);
      setStarting(false);
      setLocalError('DISCORD AUTH UNAVAILABLE');
    }
  };

  const updateOnboardingParam = (enabled) => {
    const nextParams = new URLSearchParams(searchParams);
    if (enabled) {
      nextParams.set('new', '1');
    } else {
      nextParams.delete('new');
    }
    setSearchParams(nextParams);
  };

  return (
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
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
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          key={shakeKey}
          className={`access-gate-card${errorMessage ? ' nexus-shake' : ''}`}
          style={{
            width: 360,
            background: 'var(--bg1)',
            border: `0.5px solid ${errorMessage ? 'var(--warn)' : 'var(--b2)'}`,
            borderRadius: 12,
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <NexusCompass size={44} />

          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.25em', textAlign: 'center', marginTop: 8 }}>
            REDSCAR NOMADS
          </div>
          <div style={{ fontSize: 24, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.22em', textAlign: 'center', marginTop: 4 }}>
            NEXUSOS
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.18em', textAlign: 'center', marginTop: 2 }}>
            ACCESS GATE
          </div>

          <div style={{ width: '100%', marginTop: 28 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--t2)',
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Member access is verified through Discord role sync for {authHealth.guildLabel}.
            </div>

            <div
              style={{
                fontSize: 10,
                color: 'var(--t3)',
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              First login seeds your callsign from your Discord server nickname. You can edit it later in Profile Settings.
            </div>

            <button
              type="button"
              onClick={startDiscordAuth}
              disabled={starting || loading || (authHealth.loaded && authHealth.oauthReady === false)}
              className="nexus-btn nexus-btn-solid"
              style={{
                width: '100%',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                letterSpacing: '0.14em',
                borderColor: errorMessage ? 'var(--warn)' : 'var(--b2)',
              }}
            >
              {starting || loading ? (
                <span className="nexus-loading-dots" style={{ color: 'var(--t0)' }} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                'CONTINUE WITH DISCORD →'
              )}
            </button>

            <div
              style={{
                minHeight: errorDetail ? 36 : 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                marginTop: 8,
                fontSize: 10,
                color: errorMessage ? 'var(--warn)' : 'transparent',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {errorMessage ? <AlertTriangle size={10} /> : null}
                <span>{errorMessage || '.'}</span>
              </div>
              {errorDetail ? (
                <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.6, maxWidth: 260 }}>
                  {errorDetail}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 14, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a
                href={authHealth.inviteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 10,
                  color: 'var(--acc)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = 'var(--acc2)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = 'var(--acc)';
                }}
              >
                Request access via {authHealth.supportChannelLabel}
              </a>

              {!showOnboarding ? (
                <button
                  type="button"
                  onClick={() => updateOnboardingParam(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--t3)',
                    cursor: 'pointer',
                    fontSize: 9,
                    fontFamily: 'var(--font)',
                  }}
                >
                  First time here? View onboarding →
                </button>
              ) : null}
            </div>

            {showOnboarding ? (
              <OnboardingChecklist
                guildLabel={authHealth.guildLabel}
                supportChannelLabel={authHealth.supportChannelLabel}
                inviteUrl={authHealth.inviteUrl}
                steps={authHealth.onboardingSteps}
                onClose={() => updateOnboardingParam(false)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <StatusBar status={verseStatus} />
    </div>
  );
}