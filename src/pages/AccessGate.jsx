import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/SessionContext';
import { useVerseStatus } from '@/lib/useVerseStatus';
import { IS_DEV_MODE, DEV_PERSONAS, setDevPersona } from '@/lib/dev';

const STAR_SIZES = [
  ...Array(48).fill(1),
  ...Array(24).fill(1.5),
  ...Array(8).fill(2),
];
const STAR_DURATIONS = [4, 6, 9];

function buildStars() {
  if (typeof window === 'undefined') return [];
  const w = Math.max(window.innerWidth, 1);
  const h = Math.max(window.innerHeight, 1);
  const cx = w / 2;
  const cy = h / 2;
  const R = 200;

  return STAR_SIZES.map((size, id) => {
    let lx, ly;
    do {
      lx = Math.random() * w;
      ly = Math.random() * h;
    } while (Math.hypot(lx - cx, ly - cy) < R);

    return {
      id,
      top: (ly / h) * 100,
      left: (lx / w) * 100,
      size,
      duration: STAR_DURATIONS[Math.floor(Math.random() * STAR_DURATIONS.length)],
      delay: -(Math.random() * 9),
      opacity: 0.2 + Math.random() * 0.2,
    };
  });
}

// ── Status bar ────────────────────────────────────────────────────────────────

function StatusBar({ status }) {
  const map = {
    offline:  { dot: 'var(--danger)', label: 'SERVERS OFFLINE' },
    degraded: { dot: 'var(--warn)',   label: 'SERVERS DEGRADED' },
    unknown:  { dot: 'var(--warn)',   label: 'SERVERS DEGRADED' },
  };
  const cfg = map[status] || { dot: 'var(--live)', label: 'SERVERS LIVE' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 14, borderTop: '0.5px solid var(--b1)' }}>
      <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em' }}>
        RSN SECURE CHANNEL
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
        <span style={{ fontSize: 8, color: cfg.dot, letterSpacing: '0.10em' }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ── Eye icon (SVG, no external dep) ──────────────────────────────────────────

function EyeIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Pulsing dots (loading state) ──────────────────────────────────────────────

function LoadingDots() {
  return (
    <span className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
      <span /><span /><span />
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccessGate() {
  const { isAuthenticated, loading, user, refreshSession } = useSession();
  const { status: verseStatus } = useVerseStatus();

  const [authKey, setAuthKey]           = useState('');
  const [revealing, setRevealing]       = useState(false);
  const [authenticating, setAuth]       = useState(false);
  const [authError, setAuthError]       = useState('');
  const [shakeKey, setShakeKey]         = useState(0);
  const [stars, setStars]               = useState([]);
  const [mounted, setMounted]           = useState(false);
  const [arrowHover, setArrowHover]     = useState(false);
  const [eyeHover, setEyeHover]         = useState(false);

  useEffect(() => {
    setStars(buildStars());
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (authError) setShakeKey(k => k + 1);
  }, [authError]);

  const handleKeyChange = (val) => {
    setAuthKey(val);
    if (authError) setAuthError('');
  };

  const handleAuthenticate = async () => {
    if (!authKey || authenticating) return;
    setAuth(true);
    setAuthError('');

    try {
      if (!authKey.match(/^RSN-[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}$/i)) {
        setAuthError('Invalid key. Verify your key and try again.');
        setAuth(false);
        return;
      }

      await new Promise(r => setTimeout(r, 400));
      window.location.href = '/app/industry';
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
      setAuth(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAuthenticate();
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={user?.onboarding_complete === false ? '/onboarding' : '/app/industry'} replace />;
  }

  const canSubmit = !!authKey && !authenticating;

  return (
    <>
      {/* Keyframe injections */}
      <style>{`
        @keyframes gate-star-pulse-4 {
          0%,100% { opacity: var(--star-op, 0.25); }
          50%      { opacity: calc(var(--star-op, 0.25) * 0.3); }
        }
        @keyframes gate-star-pulse-6 {
          0%,100% { opacity: var(--star-op, 0.25); }
          50%      { opacity: calc(var(--star-op, 0.25) * 0.25); }
        }
        @keyframes gate-star-pulse-9 {
          0%,100% { opacity: var(--star-op, 0.25); }
          50%      { opacity: calc(var(--star-op, 0.25) * 0.2); }
        }
        @keyframes gate-card-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gate-stars-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gate-status-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        @keyframes gate-shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-6px); }
          30%     { transform: translateX(6px); }
          45%     { transform: translateX(-5px); }
          60%     { transform: translateX(5px); }
          75%     { transform: translateX(-3px); }
          90%     { transform: translateX(3px); }
        }
        .gate-error-fade {
          animation: gate-error-in 0.15s ease-out both;
        }
        @keyframes gate-error-in {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gate-arrow {
          display: inline-block;
          transition: transform 150ms ease;
        }
        .gate-arrow-hover {
          transform: translateX(3px);
        }
      `}</style>

      {/* Root */}
      <div style={{
        background: 'var(--bg0)',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
          opacity: 0.4,
        }} />

        {/* Star field */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          animation: mounted ? 'gate-stars-in 600ms ease-out both' : 'none',
        }}>
          {stars.map(star => {
            const animName = `gate-star-pulse-${star.duration}`;
            return (
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
                  '--star-op': star.opacity,
                  opacity: star.opacity,
                  animation: `${animName} ${star.duration}s ${star.delay}s ease-in-out infinite`,
                }}
              />
            );
          })}
        </div>

        {/* Card */}
        <div
          key={shakeKey}
          style={{
            position: 'relative',
            zIndex: 3,
            width: 400,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg1)',
            border: `0.5px solid ${IS_DEV_MODE ? 'rgba(240,168,36,0.3)' : 'rgba(90,96,128,0.15)'}`,
            borderRadius: 12,
            padding: '36px 32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            boxShadow: '0 0 60px 0 rgba(0,0,0,0.6), 0 0 120px 0 rgba(0,0,0,0.4)',
            animation: mounted
              ? `gate-card-in 400ms ease-out both, ${shakeKey > 0 ? 'gate-shake 350ms ease-out both' : 'none'}`
              : 'none',
          }}
        >
          {/* Top highlight line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            width: '80%',
            height: '1px',
            background: 'var(--b3)',
            borderRadius: 1,
          }} />

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', letterSpacing: '0.3em', marginBottom: 8 }}>
                REDSCAR NOMADS
              </div>
              <div style={{ fontSize: 22, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.15em' }}>
                NEXUS OS
              </div>
            </div>
            {/* Online status dot / SIM indicator */}
            {IS_DEV_MODE ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 20 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 7, color: 'rgba(240,168,36,0.7)', letterSpacing: '0.18em' }}>SIM</span>
              </div>
            ) : (
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--live)',
                flexShrink: 0,
                animation: 'gate-status-pulse 3s ease-in-out infinite',
                marginTop: 24,
              }} />
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'var(--b1)', margin: '16px 0 24px' }} />

          {IS_DEV_MODE ? (
            /* ── Demo persona picker ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.15em', marginBottom: 4 }}>
                EXPLORE THE APP
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.5 }}>
                Launch a demo session as any org rank to explore the full interface.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {DEV_PERSONAS.map(persona => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => { setDevPersona(persona.id); refreshSession(); }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg2)',
                      border: '0.5px solid var(--b1)',
                      borderRadius: 6,
                      color: 'var(--t0)',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--b2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--b1)'; }}
                  >
                    <span>{persona.callsign}</span>
                    <span style={{ color: 'var(--acc)', fontSize: 9, letterSpacing: '0.1em' }}>{persona.rank}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Key auth ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <label style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.15em', marginBottom: 8, display: 'block' }}>
                AUTHENTICATION KEY
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type={revealing ? 'text' : 'password'}
                  value={authKey}
                  onChange={e => handleKeyChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={authenticating}
                  placeholder="RSN-XXXX-XXXX-XXXX"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    background: 'var(--bg2)',
                    border: `0.5px solid ${authError ? 'var(--warn)' : 'var(--b1)'}`,
                    borderRadius: 6,
                    color: 'var(--t0)',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    letterSpacing: '0.08em',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                    opacity: authenticating ? 0.6 : 1,
                  }}
                />
                {/* Hold-to-reveal eye */}
                <button
                  type="button"
                  onMouseDown={() => setRevealing(true)}
                  onMouseUp={() => setRevealing(false)}
                  onMouseLeave={() => { setRevealing(false); setEyeHover(false); }}
                  onMouseEnter={() => setEyeHover(true)}
                  onTouchStart={() => setRevealing(true)}
                  onTouchEnd={() => setRevealing(false)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}
                >
                  <EyeIcon color={eyeHover ? 'var(--t1)' : 'var(--t3)'} />
                </button>
              </div>

              {/* Error message */}
              {authError && (
                <div className="gate-error-fade" style={{ color: 'var(--warn)', fontSize: 9, marginTop: 7, letterSpacing: '0.04em' }}>
                  {authError}
                </div>
              )}

              {/* Help text */}
              <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: authError ? 6 : 8, lineHeight: 1.5 }}>
                Keys are issued by org Pioneers. Contact your recruiter if you have not received one.
              </div>
            </div>
          )}

          {/* ── Authenticate button (key auth mode only) ── */}
          {!IS_DEV_MODE && (
            <button
              type="button"
              onClick={handleAuthenticate}
              disabled={!canSubmit}
              onMouseEnter={() => setArrowHover(true)}
              onMouseLeave={() => setArrowHover(false)}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '11px 16px',
                background: canSubmit ? 'var(--bg3)' : 'var(--bg2)',
                border: `0.5px solid ${canSubmit ? 'var(--b2)' : 'var(--b1)'}`,
                borderRadius: 6,
                color: canSubmit ? 'var(--t0)' : 'var(--t2)',
                fontSize: 11,
                letterSpacing: '0.12em',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: !authKey ? 0.4 : 1,
                transition: 'background 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {authenticating ? (
                <LoadingDots />
              ) : (
                <>
                  <span>AUTHENTICATE</span>
                  <span className={`gate-arrow ${arrowHover && canSubmit ? 'gate-arrow-hover' : ''}`}>→</span>
                </>
              )}
            </button>
          )}

          {/* ── Status bar ── */}
          <div style={{ marginTop: 24 }}>
            <StatusBar status={verseStatus} />
          </div>
        </div>
      </div>
    </>
  );
}
