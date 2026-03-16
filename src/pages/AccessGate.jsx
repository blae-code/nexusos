import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import NexusCompass from '@/components/ui/NexusCompass';
import { authApi } from '@/lib/auth-api';
import { useSession } from '@/lib/SessionContext';
import { VERSE_BUILD_LABEL, useVerseStatus } from '@/lib/useVerseStatus';

const STAR_COUNT = 80;

const ERROR_MESSAGES = {
  not_in_guild: 'REDSCAR MEMBERSHIP REQUIRED',
  role_not_allowed: 'DISCORD ROLE NOT AUTHORIZED',
  expired_state: 'LOGIN WINDOW EXPIRED - TRY AGAIN',
  auth_failed: 'DISCORD AUTH FAILED - TRY AGAIN',
};

function buildStars() {
  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const size = index < 48 ? 1 : index < 72 ? 1.5 : 2;
    let top = Math.random() * 100;
    let left = Math.random() * 100;

    while (top >= 30 && top <= 70 && left >= 25 && left <= 75) {
      top = Math.random() * 100;
      left = Math.random() * 100;
    }

    const durations = [3, 5, 7];

    return {
      id: index,
      top,
      left,
      size,
      duration: durations[Math.floor(Math.random() * durations.length)],
    };
  });
}

function StatusBar({ status }) {
  const palette = status === 'offline'
    ? { color: 'var(--danger)', label: 'OFFLINE' }
    : status === 'degraded' || status === 'unknown'
      ? { color: 'var(--warn)', label: status === 'unknown' ? 'UNKNOWN' : 'DEGRADED' }
      : { color: 'var(--live)', label: 'ONLINE' };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: palette.color }} />
        <span style={{ color: 'var(--t2)' }}>VERSE</span>
        <span style={{ color: 'var(--t3)' }}>/</span>
        <span style={{ color: palette.color }}>{palette.label}</span>
        <span style={{ color: 'var(--t3)' }}>/</span>
        <span style={{ color: 'var(--t3)' }}>{VERSE_BUILD_LABEL}</span>
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
      setShakeKey((key) => key + 1);
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
          zIndex: 0,
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
              pointerEvents: 'none',
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
          position: 'relative',
          padding: '24px 16px',
        }}
      >
        <div
          key={shakeKey}
          className={errorMessage ? 'nexus-shake' : undefined}
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
            zIndex: 1,
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
              borderRadius: '0 0 1px 1px',
            }}
          />

          <div style={{ marginBottom: 8 }}>
            <NexusCompass size={44} />
          </div>

          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.25em', marginBottom: 4, textAlign: 'center' }}>
            REDSCAR NOMADS
          </div>
          <div style={{ fontSize: 24, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.22em', marginBottom: 2, textAlign: 'center' }}>
            NEXUSOS
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.18em', marginBottom: 28, textAlign: 'center' }}>
            ACCESS GATE
          </div>

          <div style={{ width: '100%' }}>
            <div
              style={{
                color: 'var(--t2)',
                fontSize: 10,
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: 18,
              }}
            >
              Member access now uses Discord OAuth with Redscar role verification.
            </div>

            <button
              type="button"
              onClick={startDiscordAuth}
              disabled={starting || loading}
              className="nexus-btn nexus-btn-solid"
              style={{
                width: '100%',
                height: 40,
                fontSize: 12,
                letterSpacing: '0.14em',
                marginTop: 20,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                borderColor: errorMessage ? 'var(--warn)' : 'var(--b2)',
              }}
            >
              {starting || loading ? (
                <span className="nexus-loading-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                'CONTINUE WITH DISCORD'
              )}
            </button>

            <div
              style={{
                minHeight: 20,
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
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
                rel="noopener noreferrer"
                style={{
                  fontSize: 10,
                  color: 'var(--acc)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Request access
                <ExternalLink size={11} />
              </a>
            </div>

            {showOnboarding && (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <a
                  href="https://discord.gg/redscar"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 9, color: 'var(--t3)', cursor: 'pointer' }}
                >
                  First time here?
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar status={verseStatus} />
    </div>
  );
}
