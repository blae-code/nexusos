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
  const centerLeft = width / 2 - 200;
  const centerRight = width / 2 + 200;
  const centerTop = height / 2 - 250;
  const centerBottom = height / 2 + 250;

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

function AuthKeyInput({ value, onChange, onReveal, revealing, error }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ color: 'var(--t2)', fontSize: 10, display: 'block', marginBottom: 8, letterSpacing: '0.12em' }}>
        AUTHENTICATION KEY
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={revealing ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="RSN-XXXX-XXXX-XXXX"
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--bg2)',
            border: `0.5px solid ${error ? 'var(--warn)' : 'var(--b1)'}`,
            borderRadius: 6,
            color: 'var(--t0)',
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            transition: 'border-color 0.12s',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onMouseDown={() => onReveal(true)}
          onMouseUp={() => onReveal(false)}
          onMouseLeave={() => onReveal(false)}
          onTouchStart={() => onReveal(true)}
          onTouchEnd={() => onReveal(false)}
          style={{
            position: 'absolute',
            right: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 6px',
          }}
        >
          <Eye size={14} />
        </button>
      </div>
      {error && (
        <div style={{ color: 'var(--warn)', fontSize: 9, marginTop: 6, letterSpacing: '0.04em' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function StatusBar({ status }) {
  const palette = status === 'offline'
    ? { dot: 'var(--danger)', text: 'OFFLINE' }
    : status === 'degraded' || status === 'unknown'
      ? { dot: 'var(--warn)', text: 'DEGRADED' }
      : { dot: 'var(--live)', text: 'ONLINE' };

  return (
    <div
      style={{
        height: 28,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        fontSize: 8,
        color: 'var(--t3)',
        letterSpacing: '0.08em',
        gap: 6,
      }}
    >
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: palette.dot }} />
      <span>{palette.text}</span>
    </div>
  );
}



export default function AccessGate() {
  const { isAuthenticated, loading, user } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [authKey, setAuthKey] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [stars, setStars] = useState([]);

  useEffect(() => {
    setStars(buildStars());
  }, []);

  useEffect(() => {
    if (authError) {
      setShakeKey((k) => k + 1);
    }
  }, [authError]);

  const handleAuthenticate = async () => {
    setAuthenticating(true);
    setAuthError('');

    try {
      // For now, validate the format and set session
      if (!authKey.match(/^RSN-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}$/i)) {
        setAuthError('Invalid key format. Use RSN-XXXX-XXXX-XXXX');
        setAuthenticating(false);
        return;
      }

      // Mock auth — replace with real validation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Update session or navigate
      window.location.href = '/app/industry';
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
      setAuthenticating(false);
    }
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={user?.onboarding_complete === false ? '/onboarding' : '/app/industry'} replace />;
  }

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
          className={authError ? 'nexus-shake' : ''}
          style={{
            width: 400,
            maxWidth: '100%',
            background: 'var(--bg1)',
            border: `0.5px solid ${authError ? 'var(--warn)' : 'var(--b2)'}`,
            borderTop: `1px solid var(--b3)`,
            borderRadius: 12,
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <NexusCompass size={40} />

          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.25em', textAlign: 'center', marginTop: 12 }}>
            REDSCAR NOMADS
          </div>
          <div style={{ fontSize: 18, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.2em', textAlign: 'center', marginTop: 6 }}>
            NEXUSOS
          </div>

          <div style={{ width: '100%', marginTop: 32 }}>
            <AuthKeyInput
              value={authKey}
              onChange={setAuthKey}
              onReveal={setRevealing}
              revealing={revealing}
              error={authError}
            />

            <button
              onClick={handleAuthenticate}
              disabled={authenticating || !authKey}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '10px 16px',
                background: authenticating || !authKey ? 'var(--bg2)' : 'var(--bg3)',
                border: `0.5px solid var(--b2)`,
                borderRadius: 6,
                color: authenticating || !authKey ? 'var(--t2)' : 'var(--t0)',
                fontSize: 11,
                letterSpacing: '0.12em',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: authenticating || !authKey ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s',
                opacity: !authKey ? 0.4 : 1,
              }}
            >
              {authenticating ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
            </button>
          </div>
        </div>
      </div>

      <StatusBar status={verseStatus} />
    </div>
  );
}