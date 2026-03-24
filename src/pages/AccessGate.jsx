import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { withAppBase } from '@/core/data/app-base-path';
import { authApi } from '@/core/data/auth-api';
import { useSession } from '@/core/data/SessionContext';

function normalizeAuthenticatedDestination(rawDestination, onboardingComplete) {
  if (onboardingComplete === false) {
    if (rawDestination && rawDestination.startsWith('/app')) {
      return `/onboarding?redirect_to=${encodeURIComponent(rawDestination)}`;
    }
    return '/onboarding';
  }
  if (!rawDestination) return '/app/industry';
  if (!rawDestination.startsWith('/') || rawDestination.startsWith('//')) return '/app/industry';
  if (rawDestination === '/onboarding' || rawDestination.startsWith('/app')) return rawDestination;
  return '/app/industry';
}

export default function AccessGate() {
  const location = useLocation();
  const { isAuthenticated, loading, startupIssue, user, refreshSession } = useSession();

  const stars = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.4 + 0.8,
      opacity: Math.random() * 0.4 + 0.15,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 4,
    }));
  }, []);

  const [username, setUsername] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const authenticatedDestination = useMemo(
    () => normalizeAuthenticatedDestination(searchParams.get('redirect_to'), user?.onboarding_complete),
    [searchParams, user?.onboarding_complete],
  );
  const accessNotice = useMemo(() => {
    if (searchParams.get('session_expired') === '1') {
      return 'Session expired. Sign in again to continue.';
    }
    if (startupIssue) {
      return startupIssue;
    }
    return '';
  }, [searchParams, startupIssue]);

  useEffect(() => {
    authApi.getHealth().then((result) => setHealth(result || { ok: false })).catch(() => setHealth({ ok: false }));
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !authKey.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const loginRes = await authApi.login(username.trim(), authKey.trim(), { rememberMe });

      if (loginRes.error === 'key_revoked') {
        setError('ACCESS REVOKED — Your auth key has been revoked by a Pioneer. Contact org leadership for a new key.');
        setSubmitting(false);
        return;
      }

      if (loginRes.error === 'login_failed') {
        setError('SERVICE UNAVAILABLE — The authentication service is temporarily unreachable. Wait a moment and try again.');
        setSubmitting(false);
        return;
      }

      if (loginRes.error === 'not_found') {
        setError('UNKNOWN USER — No account found with that username. Check your spelling or contact a Pioneer to verify your invite.');
        setSubmitting(false);
        return;
      }

      if (loginRes.error) {
        setError('INVALID CREDENTIALS — The username or auth key is incorrect. Both are case-sensitive. Check your key and try again.');
        setSubmitting(false);
        return;
      }

      if (loginRes.success) {
        await refreshSession();
        const dest = normalizeAuthenticatedDestination(searchParams.get('redirect_to'), loginRes.onboarding_complete);
        window.location.assign(withAppBase(dest));
        return;
      }

      setError('Authentication failed. Try again.');
    } catch {
      setError('CONNECTION FAILED — Cannot reach the NexusOS server. Check your internet connection and try again.');
    }

    setSubmitting(false);
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={authenticatedDestination} replace />;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: '#08080A', fontFamily: "'Barlow', sans-serif"
    }}>

      {/* BACKGROUND VIDEO */}
      <video autoPlay muted loop playsInline style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', zIndex: 0, opacity: 0.18
      }} src="/video/nexus-boot-loop.mp4" />

      {/* STARFIELD */}
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            background: '#E8E4DC',
            opacity: star.opacity,
            zIndex: 1,
            animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* AMBIENT BLOOM — warm amber lower-centre */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(180,90,20,0.11), transparent)',
      }} />

      {/* RED BLOOM — faint, upper right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '40%',
        zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 80% 10%, rgba(192,57,43,0.07), transparent)',
      }} />

      {/* PANEL — left anchored at 10vw */}
      <div style={{
        position: 'absolute',
        left: '10vw', top: '50%',
        transform: 'translateY(-50%)',
        width: '400px',
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: '2px',
        padding: '52px 40px 44px',
        boxSizing: 'border-box',
        zIndex: 10,
      }}>

        {/* EMBLEM */}
        <div style={{ marginBottom: '18px' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" opacity="0.4"/>
            <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" opacity="0.55"/>
            <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.85"/>
            <circle cx="22" cy="22" r="3" fill="#E8E4DC"/>
            <line x1="22" y1="2" x2="22" y2="7.5" stroke="#E8E4DC" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="22" y1="36.5" x2="22" y2="42" stroke="#E8E4DC" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
            <line x1="2" y1="22" x2="7.5" y2="22" stroke="#E8E4DC" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
            <line x1="36.5" y1="22" x2="42" y2="22" stroke="#E8E4DC" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
            <polygon points="22,2 20.2,12 22,10.5 23.8,12" fill="#E8E4DC" opacity="0.9"/>
          </svg>
        </div>

        {/* RED RULE */}
        <div style={{ height: '1px', background: '#C0392B', opacity: 0.7, marginBottom: '16px' }} />

        {/* ORG LABEL */}
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: '11px', fontWeight: 500,
          color: '#C8A84B', letterSpacing: '0.28em',
          textTransform: 'uppercase', marginBottom: '8px',
        }}>Redscar Nomads</div>

        {/* MAIN TITLE */}
        <div style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: '58px', fontWeight: 700,
          color: '#E8E4DC', letterSpacing: '0.05em',
          textTransform: 'uppercase', lineHeight: 1, marginBottom: '6px',
        }}>NEXUSOS</div>

        {/* SUBTITLE */}
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: '12px', color: '#C8A84B',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          marginBottom: '18px',
        }}>Access Gate</div>

        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '11px',
          color: '#8C877D',
          letterSpacing: '0.08em',
          lineHeight: 1.6,
          marginBottom: '22px',
          textTransform: 'uppercase',
        }}>
          Use your issued username and access key. Callsign can change later in NexusOS settings.
        </div>






        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* USERNAME INPUT */}
          <input
            type="text"
            placeholder="ENTER ISSUED USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: '2px',
              color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px', fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '11px 14px',
              outline: 'none',
              transition: 'border-color 0.15s',
              marginBottom: '10px',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#C8A84B'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.12)'; }}
          />

          {/* KEY INPUT */}
          <input
            type="password"
            placeholder="ENTER ACCESS KEY"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            autoComplete="current-password"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: '2px',
              color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px', fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '11px 14px',
              outline: 'none',
              transition: 'border-color 0.15s',
              marginBottom: '24px',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#C8A84B'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(200,170,100,0.12)'; }}
          />

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            cursor: 'pointer',
            color: '#8C877D',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 13,
                height: 13,
                margin: 0,
                accentColor: '#C0392B',
                cursor: 'pointer',
              }}
            />
            Remember This Device
          </label>



          {/* CTA BUTTON */}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !authKey.trim()}
            style={{
              width: '100%',
              background: submitting ? '#7B2218' : '#C0392B',
              color: '#E8E4DC',
              border: 'none', borderRadius: '2px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              padding: '13px 20px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
              opacity: (!username.trim() || !authKey.trim()) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#9B2D20'; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#C0392B'; }}
          >
            {submitting ? 'AUTHENTICATING...' : 'CONTINUE \u2192'}
          </button>
        </form>

        {/* STATUS MESSAGE */}
        {(error || accessNotice) && (
          <div style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: error ? 'rgba(192,57,43,0.08)' : 'rgba(200,168,75,0.08)',
            border: `0.5px solid ${error ? 'rgba(192,57,43,0.25)' : 'rgba(200,168,75,0.25)'}`,
            borderRadius: '2px',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '11px', fontWeight: 600,
              color: error ? '#C0392B' : '#C8A84B', letterSpacing: '0.08em',
              lineHeight: 1.5,
            }}>{(error || accessNotice).split(' — ')[0]}</div>
            {(error || accessNotice).includes(' — ') && (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '10px', fontWeight: 400,
                color: '#9A9488', letterSpacing: '0.06em',
                lineHeight: 1.5, marginTop: 4,
              }}>{(error || accessNotice).split(' — ').slice(1).join(' — ')}</div>
            )}
          </div>
        )}

        {/* HELP TOGGLE */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          style={{
            marginTop: '14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '10px', color: '#5A5850', letterSpacing: '0.1em',
            textTransform: 'uppercase', textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {showHelp ? 'HIDE HELP' : 'NEED HELP SIGNING IN?'}
        </button>

        {showHelp && (
          <div style={{
            marginTop: '10px', padding: '12px',
            background: 'rgba(200,170,100,0.04)',
            border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: '2px',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', lineHeight: 1.8, letterSpacing: '0.06em' }}>
              <div style={{ color: '#C8A84B', fontSize: 9, letterSpacing: '0.15em', marginBottom: 6 }}>GETTING STARTED</div>
              <div>1. <strong style={{ color: '#E8E4DC' }}>New members:</strong> A Pioneer must issue you a username and auth key first. Ask your org leadership.</div>
              <div>2. <strong style={{ color: '#E8E4DC' }}>Username</strong> is the name you were issued (not your callsign — that can be changed later).</div>
              <div>3. <strong style={{ color: '#E8E4DC' }}>Auth Key</strong> is a long code starting with RSN-. Enter it exactly as received.</div>
              <div>4. <strong style={{ color: '#E8E4DC' }}>Lost your key?</strong> Contact a Pioneer — keys can be regenerated but not recovered.</div>
              <div style={{ marginTop: 8, color: '#5A5850' }}>
                Admin first-time setup? Use the System Admin Bootstrap in Key Management after logging in.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FIXED FOOTER */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '32px', background: 'rgba(8,8,10,0.9)',
        borderTop: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px', zIndex: 20,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '11px', fontWeight: 500,
          letterSpacing: '0.15em',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#C8A84B' }}>
            <span style={{ animation: 'pulse 3s ease-in-out infinite', color: '#C8A84B' }}>{"\u25CF"}</span>
            VERSE 4.7.0
          </span>
          {health && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: health.ok ? '#4A8C5C' : '#C0392B' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: health.ok ? '#4A8C5C' : '#C0392B' }} />
              {health.ok ? 'AUTH ONLINE' : 'AUTH OFFLINE'}
            </span>
          )}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '11px', fontWeight: 400, color: '#5A5850',
          letterSpacing: '0.15em',
        }}>REDSCAR {"\u00B7"} NOMADS {"\u00B7"} ETERNAL VOYAGE</div>
      </div>

      {/* KEYFRAMES + FONT IMPORTS */}
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=Barlow:wght@300;400;500&display=swap');

        @keyframes twinkle {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.08; }
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
          letter-spacing: 0.12em;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
        }
      `}</style>

    </div>
  );
}