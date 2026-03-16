import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { authApi } from '@/lib/auth-api';
import { useSession } from '@/lib/SessionContext';
import { VERSE_BUILD_LABEL, useVerseStatus } from '@/lib/useVerseStatus';
import { CompassMark } from '@/components/shell/NexusIcons';

const STAR_COUNT = 80;
const STAR_ZONE = {
  minX: 34,
  maxX: 66,
  minY: 22,
  maxY: 78,
};

const ERROR_MESSAGES = {
  not_in_guild: 'REDSCAR MEMBERSHIP REQUIRED',
  role_not_allowed: 'DISCORD ROLE NOT AUTHORIZED',
  expired_state: 'LOGIN WINDOW EXPIRED — TRY AGAIN',
  auth_failed: 'DISCORD AUTH FAILED — TRY AGAIN',
};

function generateStar(index) {
  const size = index < 48 ? 1 : index < 72 ? 1.5 : 2;
  let x = 0;
  let y = 0;

  do {
    x = Math.random() * 100;
    y = Math.random() * 100;
  } while (x > STAR_ZONE.minX && x < STAR_ZONE.maxX && y > STAR_ZONE.minY && y < STAR_ZONE.maxY);

  const durations = [3, 5, 7];

  return {
    id: index,
    x,
    y,
    size,
    duration: durations[Math.floor(Math.random() * durations.length)],
    delay: (Math.random() * 5).toFixed(2),
  };
}

function StarField() {
  const stars = useMemo(
    () => Array.from({ length: STAR_COUNT }, (_, index) => generateStar(index)),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function StatusBar({ status }) {
  const palette = status === 'offline'
    ? { color: 'var(--danger)', label: 'OFFLINE' }
    : status === 'degraded'
      ? { color: 'var(--warn)', label: 'DEGRADED' }
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
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 9 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: palette.color }} />
        <span style={{ color: 'var(--t2)', marginLeft: 6 }}>VERSE {VERSE_BUILD_LABEL}</span>
        <span style={{ color: 'var(--t3)', margin: '0 6px' }}>·</span>
        <span style={{ color: palette.color }}>{palette.label}</span>
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

  const redirectTo = searchParams.get('redirect_to') || '/app/industry';
  const errorCode = searchParams.get('error');
  const errorMessage = localError || ERROR_MESSAGES[errorCode] || '';
  const showOnboarding = searchParams.get('new') === '1';

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
        minHeight: '100vh',
        background: 'var(--bg0)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <StarField />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          padding: '24px 16px',
        }}
      >
        <div
          key={shakeKey}
          className={`gate-card${errorMessage ? ' nexus-shake' : ''}`}
          style={{
            width: 360,
            background: 'var(--bg1)',
            border: '0.5px solid var(--b2)',
            borderRadius: 12,
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div style={{ color: 'var(--acc2)' }}>
            <CompassMark size={44} />
          </div>

          <div style={{ marginTop: 8, color: 'var(--t3)', fontSize: 9, letterSpacing: '0.25em', textAlign: 'center' }}>
            REDSCAR NOMADS
          </div>
          <div style={{ marginTop: 4, color: 'var(--t0)', fontSize: 24, fontWeight: 500, letterSpacing: '0.22em', textAlign: 'center' }}>
            NEXUSOS
          </div>
          <div style={{ marginTop: 2, color: 'var(--t2)', fontSize: 10, letterSpacing: '0.18em', textAlign: 'center' }}>
            ACCESS GATE
          </div>

          <div style={{ marginTop: 28, width: '100%' }}>
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
              className="nexus-btn"
              style={{
                width: '100%',
                height: 40,
                background: 'var(--bg3)',
                border: `0.5px solid ${errorMessage ? 'var(--warn)' : 'var(--b2)'}`,
                borderRadius: 'var(--r-md)',
                fontSize: 12,
                color: 'var(--t0)',
                letterSpacing: '0.14em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {starting || loading ? (
                <span className="nexus-loading-dots" aria-hidden="true">
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
                marginTop: 12,
                color: errorMessage ? 'var(--warn)' : 'transparent',
                fontSize: 10,
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Request access via #nexusos-ops
                <ExternalLink size={11} />
              </a>
            </div>

            {showOnboarding && (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <a
                  href="https://discord.gg/redscar"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 9, color: 'var(--t3)' }}
                >
                  First time here? View onboarding →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar status={verseStatus} />

      <style>{`
        .gate-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          width: 80%;
          height: 1px;
          background: var(--b3);
        }
      `}</style>
    </div>
  );
}
