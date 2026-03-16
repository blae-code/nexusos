import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import NexusCompass from '@/components/ui/NexusCompass';
import { authApi } from '@/lib/auth-api';
import { useSession } from '@/lib/SessionContext';
import { VERSE_BUILD_LABEL, useVerseStatus } from '@/lib/useVerseStatus';

const STAR_COUNT = 80;
const STAR_SIZES = [
  ...Array(48).fill(1),
  ...Array(24).fill(1.5),
  ...Array(8).fill(2),
];
const STAR_DURATIONS = [3, 5, 7];

const ERROR_MESSAGES = {
  not_in_guild: 'REDSCAR MEMBERSHIP REQUIRED',
  role_not_allowed: 'DISCORD ROLE NOT AUTHORIZED',
  expired_state: 'LOGIN WINDOW EXPIRED - TRY AGAIN',
  auth_failed: 'DISCORD AUTH FAILED - TRY AGAIN',
};

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

export default function AccessGate() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, source } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [stars, setStars] = useState([]);

  const redirectTo = searchParams.get('redirect_to') || '/app/industry';
  const errorCode = searchParams.get('error');
  const errorMessage = localError || ERROR_MESSAGES[errorCode] || '';
  const showOnboarding = searchParams.get('new') === '1';

  useEffect(() => {
    setStars(buildStars());
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
                marginBottom: 20,
              }}
            >
              Member access is verified through Discord role sync.
            </div>

            <button
              type="button"
              onClick={startDiscordAuth}
              disabled={starting || loading}
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
                minHeight: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                marginTop: 8,
                fontSize: 10,
                color: errorMessage ? 'var(--warn)' : 'transparent',
              }}
            >
              {errorMessage ? <AlertTriangle size={10} /> : null}
              <span>{errorMessage || '.'}</span>
            </div>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <a
                href="https://discord.gg/redscar"
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
                Request access via #nexusos-ops
              </a>
            </div>

            {showOnboarding ? (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <a
                  href="https://discord.gg/redscar"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 9,
                    color: 'var(--t3)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = 'var(--t2)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'var(--t3)';
                  }}
                >
                  First time here? View onboarding →
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <StatusBar status={verseStatus} />
    </div>
  );
}
