import React, { useMemo, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { withAppBase } from '@/core/data/app-base-path';
import { authApi } from '@/core/data/auth-api';

import { useSession } from '@/core/data/SessionContext';

function buildStars() {
  if (typeof window === 'undefined') return [];
  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 0.6 + 0.8,
      opacity: Math.random() * 0.3 + 0.15,
      duration: Math.random() * 3 + 2,
    });
  }
  for (let i = 80; i < 120; i++) {
    stars.push({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 0.7 + 1.5,
      opacity: Math.random() * 0.3 + 0.3,
      duration: Math.random() * 3 + 2,
    });
  }
  return stars;
}

function normalizeAuthenticatedDestination(rawDestination, onboardingComplete) {
  if (onboardingComplete === false) return '/onboarding';
  if (!rawDestination) return '/app/industry';
  if (!rawDestination.startsWith('/') || rawDestination.startsWith('//')) return '/app/industry';
  if (rawDestination === '/onboarding' || rawDestination.startsWith('/app')) return rawDestination;
  return '/app/industry';
}

export default function AccessGate() {
  const location = useLocation();
  const { isAuthenticated, loading, user, refreshSession } = useSession();

  const stars = useMemo(() => buildStars(), []);
  const [username, setUsername] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [systemReady, setSystemReady] = useState(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const authenticatedDestination = useMemo(
    () => normalizeAuthenticatedDestination(searchParams.get('redirect_to'), user?.onboarding_complete),
    [searchParams, user?.onboarding_complete],
  );



  useEffect(() => {
    authApi.getHealth().then(r => setSystemReady(r?.ok ?? false)).catch(() => setSystemReady(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !authKey.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const loginRes = await authApi.login(username.trim(), authKey.trim(), { rememberMe });

      if (loginRes.error === 'key_revoked') {
        setError('This access key has been revoked. Contact leadership.');
        setSubmitting(false);
        return;
      }

      if (loginRes.error) {
        setError('Invalid username or auth key.');
        setSubmitting(false);
        return;
      }

      if (loginRes.success) {
        await refreshSession();
        const dest = loginRes.onboarding_complete === false ? '/onboarding' : '/app/industry';
        window.location.assign(withAppBase(dest));
        return;
      }

      setError('Authentication failed. Try again.');
    } catch {
      setError('Connection error. Try again.');
    }

    setSubmitting(false);
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={authenticatedDestination} replace />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#08080A', overflow: 'hidden' }}>

      {/* LAYER 1 — Background video */}
      <video
        autoPlay muted loop playsInline
        src="/video/nexus-boot-loop.mp4"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.18 }}
      />

      {/* LAYER 2 — Stars */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {stars.map((star) => (
          <div key={star.id} style={{
            position: 'absolute',
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#E8E4DC',
            opacity: star.opacity,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* LAYER 3 — Ambient blooms */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(180,90,20,0.11), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '40%', background: 'radial-gradient(ellipse 60% 50% at 80% 10%, rgba(192,57,43,0.07), transparent)', zIndex: 2, pointerEvents: 'none' }} />

      {/* LAYER 4 — Panel */}
      <div style={{
        position: 'absolute',
        left: '10vw',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 400,
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        padding: '52px 40px 44px',
        zIndex: 10,
        boxSizing: 'border-box',
      }}>

        {/* 1. EMBLEM */}
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.75" opacity="0.4" />
            <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.75" opacity="0.55" />
            <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.85" />
            <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
            <line x1="22" y1="2" x2="22" y2="8" stroke="#E8E4DC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="36" x2="22" y2="42" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <line x1="2" y1="22" x2="8" y2="22" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <line x1="36" y1="22" x2="42" y2="22" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <polygon points="22,2 20.2,12.5 22,10.8 23.8,12.5" fill="#E8E4DC" opacity="0.9" />
          </svg>
        </div>

        {/* 2. RED RULE */}
        <div style={{ height: 1, background: '#C0392B', opacity: 0.7, marginBottom: 16 }} />

        {/* 3. ORG LABEL */}
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, fontWeight: 500, color: '#C8A84B', letterSpacing: '0.28em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          REDSCAR NOMADS
        </div>

        {/* 4. TITLE */}
        <div style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 58, fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.05em',
          textTransform: 'uppercase', lineHeight: 1, marginBottom: 6,
        }}>
          NEXUSOS
        </div>

        {/* 5. SUBTITLE */}
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 12, color: '#C8A84B', letterSpacing: '0.22em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>
          ACCESS GATE
        </div>

        {/* 6. FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 6a. USERNAME */}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ENTER CALLSIGN"
            autoComplete="username"
            style={{
              width: '100%', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '11px 14px', outline: 'none', boxSizing: 'border-box',
              marginBottom: 10,
            }}
            onFocus={(e) => { e.target.style.borderColor = '#C8A84B'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.12)'; }}
          />

          {/* 6b. KEY */}
          <input
            type="password"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            placeholder="ENTER ACCESS KEY"
            autoComplete="current-password"
            style={{
              width: '100%', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, letterSpacing: '0.12em',
              padding: '11px 14px', outline: 'none', boxSizing: 'border-box',
              marginBottom: 24,
            }}
            onFocus={(e) => { e.target.style.borderColor = '#C8A84B'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.12)'; }}
          />

          {/* 6c. CTA */}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !authKey.trim()}
            style={{
              width: '100%', background: submitting ? 'rgba(192,57,43,0.7)' : '#C0392B',
              color: '#E8E4DC', border: 'none', borderRadius: 2,
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
              padding: '13px 20px', cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
              opacity: (!username.trim() || !authKey.trim()) ? 0.5 : submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#9B2D20'; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#C0392B'; }}
          >
            {submitting ? 'AUTHENTICATING...' : 'CONTINUE →'}
          </button>
        </form>

        {/* 7. ERROR */}
        {error && (
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            color: '#C8A84B', letterSpacing: '0.12em', textTransform: 'uppercase',
            marginTop: 14,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* LAYER 5 — Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 32,
        background: 'rgba(8,8,10,0.9)', borderTop: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 20,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 500,
          color: '#C8A84B', letterSpacing: '0.15em', animation: 'pulse 3s ease-in-out infinite',
        }}>
          ● VERSE 4.7.0
        </span>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 400,
          color: '#5A5850', letterSpacing: '0.15em',
        }}>
          REDSCAR · NOMADS · ETERNAL VOYAGE
        </span>
      </div>

      {/* FONT IMPORTS + KEYFRAMES */}
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@400;500&display=swap');

        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        input::placeholder {
          color: #5A5850;
        }
      `}</style>
    </div>
  );
}