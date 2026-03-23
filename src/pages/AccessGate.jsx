import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { withAppBase } from '@/core/data/app-base-path';
import { authApi } from '@/core/data/auth-api';
import { VERSE_BUILD_LABEL } from '@/core/data/useVerseStatus';
import { useSession } from '@/core/data/SessionContext';

function buildStars() {
  if (typeof window === 'undefined') return [];
  return Array.from({ length: 120 }, (_, id) => ({
    id,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.4 + 0.8,
    opacity: Math.random() * 0.4 + 0.3,
  }));
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

  const [stars, setStars] = useState([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [callsign, setCallsign] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [systemReady, setSystemReady] = useState(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const authenticatedDestination = useMemo(
    () => normalizeAuthenticatedDestination(searchParams.get('redirect_to'), user?.onboarding_complete),
    [searchParams, user?.onboarding_complete],
  );

  useEffect(() => {
    setStars(buildStars());
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    authApi.getHealth().then(r => setSystemReady(r?.ok ?? false)).catch(() => setSystemReady(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!callsign.trim() || !authKey.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      // Try login first
      const loginRes = await authApi.login(callsign.trim(), authKey.trim());

      if (loginRes.error === 'key_revoked') {
        setError('This access key has been revoked. Contact leadership.');
        setSubmitting(false);
        return;
      }

      if (loginRes.error === 'invalid_credentials') {
        // Try register
        const regRes = await authApi.register(callsign.trim(), authKey.trim());

        if (regRes.error === 'key_revoked') {
          setError('This access key has been revoked. Contact leadership.');
          setSubmitting(false);
          return;
        }

        if (regRes.error === 'already_registered') {
          setError('Invalid callsign or key.');
          setSubmitting(false);
          return;
        }

        if (regRes.error) {
          setError('Invalid callsign or key.');
          setSubmitting(false);
          return;
        }

        if (regRes.success && regRes.isNew) {
          await refreshSession();
          window.location.assign(withAppBase('/onboarding'));
          return;
        }
      }

      if (loginRes.error) {
        setError('Invalid callsign or key.');
        setSubmitting(false);
        return;
      }

      if (loginRes.success) {
        await refreshSession();
        const dest = loginRes.onboarding_complete ? '/app/industry' : '/onboarding';
        window.location.assign(withAppBase(dest));
        return;
      }

      setError('Authentication failed. Try again.');
    } catch (err) {
      setError('Connection error. Try again.');
    }

    setSubmitting(false);
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={authenticatedDestination} replace />;
  }

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0908', overflow: 'hidden', fontFamily: "'Barlow Condensed', 'Barlow', sans-serif" }}>

      {/* CINEMATIC BACKGROUND */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 150% 80% at 30% 20%, rgba(139,40,40,0.15) 0%, transparent 40%),
          radial-gradient(ellipse 100% 100% at 70% 70%, rgba(50,30,60,0.08) 0%, transparent 50%),
          linear-gradient(180deg, #0A0908 0%, #12090D 50%, #0A0908 100%)
        `,
        zIndex: 0,
      }} />

      {/* STARFIELD */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {stars.map((star) => (
          <div key={star.id} style={{
            position: 'absolute', top: `${star.top}%`, left: `${star.left}%`,
            width: `${star.size}px`, height: `${star.size}px`, borderRadius: '50%',
            background: '#F0EDE5',
            boxShadow: `0 0 ${star.size * 1.5}px rgba(240,237,229,${star.opacity * 0.6})`,
            opacity: star.opacity,
            animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* RED NEBULA — Interactive */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 50% 40% at ${mousePos.x / winW * 100}% ${mousePos.y / winH * 100}%, rgba(192,57,43,0.15) 0%, transparent 65%)`,
        filter: 'blur(40px)', transition: 'background 50ms ease-out',
      }} />

      {/* AMBER CORE */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 85%, rgba(200,168,75,0.08) 0%, transparent 60%)',
        filter: 'blur(50px)',
      }} />

      {/* LEFT-ANCHORED PANEL */}
      <div style={{
        position: 'absolute', left: '10vw', top: '50%', transform: 'translateY(-50%)',
        width: '420px',
        background: 'rgba(15, 15, 13, 0.92)', backdropFilter: 'blur(12px)',
        borderLeft: '2.5px solid #C0392B',
        borderTop: '1px solid rgba(232, 228, 220, 0.08)',
        borderRight: '1px solid rgba(232, 228, 220, 0.04)',
        borderBottom: '1px solid rgba(232, 228, 220, 0.04)',
        boxShadow: '0 0 60px rgba(192, 57, 43, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(232, 228, 220, 0.1)',
        padding: '56px 44px 48px 44px', boxSizing: 'border-box', zIndex: 1,
        animation: 'panel-fade-in 0.8s ease-out',
      }}>

        {/* LOGO */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'panel-fade-in 0.8s ease-out 0.1s both' }}>
          <img src="https://www.redscar.org/images/RedScarFUll.png" alt="Redscar Nomads" style={{
            height: 48, width: 'auto', filter: 'brightness(1.05) drop-shadow(0 2px 8px rgba(192,57,43,0.3))',
          }} />
        </div>

        {/* RED RULE */}
        <div style={{ height: '1px', background: '#C0392B', marginBottom: '40px', opacity: 0.8, animation: 'panel-fade-in 0.8s ease-out 0.2s both' }} />

        {/* TITLE */}
        <div style={{
          fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '62px',
          color: '#E8E4DC', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
          animation: 'panel-fade-in 0.8s ease-out 0.4s both',
        }}>
          NEXUSOS
        </div>

        {/* SUBTITLE */}
        <div style={{
          fontFamily: "'Earth Orbiter', 'EarthOrbiter', 'Barlow Condensed', sans-serif", fontWeight: 400,
          fontSize: '12px', color: '#C8A84B', letterSpacing: '0.25em', textTransform: 'uppercase',
          marginTop: '6px', marginBottom: '28px', animation: 'panel-fade-in 0.8s ease-out 0.5s both',
        }}>
          ACCESS GATE
        </div>

        {/* BODY TEXT */}
        <div style={{
          fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: '14px', color: '#9A9488',
          lineHeight: 1.7, marginBottom: '32px', animation: 'panel-fade-in 0.8s ease-out 0.6s both',
        }}>
          Enter your callsign and access key to launch NexusOS. Keys are issued by Redscar leadership.
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'panel-fade-in 0.8s ease-out 0.7s both' }}>
          <input
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="ENTER CALLSIGN"
            autoComplete="username"
            style={{
              width: '100%', padding: '12px 16px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: '2px',
              color: '#E8E4DC', fontSize: '12px', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(192,57,43,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.10)'; }}
          />

          <input
            type="password"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            placeholder="ENTER ACCESS KEY"
            autoComplete="current-password"
            style={{
              width: '100%', padding: '12px 16px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: '2px',
              color: '#E8E4DC', fontSize: '12px', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 500, letterSpacing: '0.1em', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(192,57,43,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.10)'; }}
          />

          <button
            type="submit"
            disabled={submitting || !callsign.trim() || !authKey.trim()}
            style={{
              display: 'block', width: '100%',
              background: submitting ? '#5A2620' : '#C0392B',
              color: '#F0EDE5',
              border: '1px solid rgba(192,57,43,0.7)', borderRadius: '2px',
              padding: '14px 24px', cursor: submitting ? 'wait' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase',
              marginTop: '4px', transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
              opacity: (!callsign.trim() || !authKey.trim()) ? 0.5 : 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.background = '#E84C3D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.background = '#C0392B';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {submitting ? 'CONNECTING...' : 'CONTINUE →'}
          </button>
        </form>

        {/* ERROR STATE */}
        {error && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: '#C8A84B',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginTop: '16px', lineHeight: 1.6, padding: '12px 14px',
            background: 'rgba(200,168,75,0.08)', border: '0.5px solid rgba(200,168,75,0.2)',
            borderRadius: '2px',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* FIXED FOOTER */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '32px',
        background: '#0A0908', borderTop: '0.5px solid rgba(200,170,100,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', color: '#C8A84B',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: systemReady ? '#4AE830' : '#C8A84B',
            animation: 'pulse 2s ease-in-out infinite', display: 'inline-block',
          }} />
          {systemReady ? 'SYSTEM ONLINE' : 'VERSE ' + VERSE_BUILD_LABEL}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', color: '#8A8478',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          REDSCAR · NOMADS · ETERNAL VOYAGE
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@400;500;600;700&display=swap');
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');

        @keyframes twinkle {
          0%, 100% { opacity: var(--star-opacity, 0.6); }
          50% { opacity: calc(var(--star-opacity, 0.6) * 0.4); }
        }

        @keyframes panel-fade-in {
          0% { opacity: 0; transform: translateY(-50%) translateX(-20px); }
          100% { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}