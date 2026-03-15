import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, AlertTriangle, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ─── Star Field ─────────────────────────────────────────
const STAR_COUNT = 80;

function StarField() {
  const stars = React.useMemo(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      duration: (Math.random() * 4 + 2).toFixed(1),
      delay: (Math.random() * 5).toFixed(1),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--duration': `${s.duration}s`,
            '--delay': `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Compass Emblem SVG ──────────────────────────────────
function CompassEmblem() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" stroke="#272b3c" strokeWidth="0.5"/>
      <circle cx="32" cy="32" r="24" stroke="#1e2130" strokeWidth="0.5"/>
      <circle cx="32" cy="32" r="3" fill="#5a6080"/>
      {/* N */}
      <polygon points="32,4 29,16 32,14 35,16" fill="#7a8098" opacity="0.9"/>
      {/* S */}
      <polygon points="32,60 35,48 32,50 29,48" fill="#4a5068" opacity="0.6"/>
      {/* E */}
      <polygon points="60,32 48,29 50,32 48,35" fill="#4a5068" opacity="0.6"/>
      {/* W */}
      <polygon points="4,32 16,35 14,32 16,29" fill="#4a5068" opacity="0.6"/>
      {/* Cross hairs */}
      <line x1="32" y1="18" x2="32" y2="46" stroke="#272b3c" strokeWidth="0.5" strokeDasharray="2 3"/>
      <line x1="18" y1="32" x2="46" y2="32" stroke="#272b3c" strokeWidth="0.5" strokeDasharray="2 3"/>
      {/* Outer tick marks */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 32 + 27 * Math.cos(rad);
        const y1 = 32 + 27 * Math.sin(rad);
        const x2 = 32 + 30 * Math.cos(rad);
        const y2 = 32 + 30 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#272b3c" strokeWidth="0.5"/>;
      })}
    </svg>
  );
}

// ─── Server Status Bar ───────────────────────────────────
function StatusBar({ verseStatus }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-2"
      style={{ background: 'rgba(7,8,11,0.95)', borderTop: '0.5px solid var(--b1)' }}
    >
      <div className="flex items-center gap-3">
        {verseStatus === 'online' ? (
          <>
            <div className="pulse-live"/>
            <span style={{ color: 'var(--live)', fontSize: 11, letterSpacing: '0.08em' }}>VERSE ONLINE</span>
          </>
        ) : verseStatus === 'degraded' ? (
          <>
            <div style={{ width: 6, height: 6, background: 'var(--warn)', borderRadius: '50%' }}/>
            <span style={{ color: 'var(--warn)', fontSize: 11, letterSpacing: '0.08em' }}>VERSE DEGRADED</span>
          </>
        ) : verseStatus === 'offline' ? (
          <>
            <div style={{ width: 6, height: 6, background: 'var(--danger)', borderRadius: '50%' }}/>
            <span style={{ color: 'var(--danger)', fontSize: 11, letterSpacing: '0.08em' }}>VERSE OFFLINE</span>
          </>
        ) : (
          <>
            <div style={{ width: 6, height: 6, background: 'var(--t2)', borderRadius: '50%' }}/>
            <span style={{ color: 'var(--t2)', fontSize: 11, letterSpacing: '0.08em' }}>CHECKING STATUS...</span>
          </>
        )}
      </div>
      <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em' }}>
        NEXUSOS · REDSCAR NOMADS · PRIVATE
      </span>
    </div>
  );
}

// ─── Access Gate ─────────────────────────────────────────
export default function AccessGate() {
  const [callsign, setCallsign] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verseStatus, setVerseStatus] = useState('checking');

  // Format auth key input as RSN-XXXX-XXXX-XXXX
  const handleAuthKeyChange = (e) => {
    let raw = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    setAuthKey(raw);
    setError('');
  };

  const handleCallsignChange = (e) => {
    setCallsign(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!callsign.trim()) { setError('CALLSIGN REQUIRED'); return; }
    if (!authKey.trim()) { setError('AUTH KEY REQUIRED'); return; }

    const keyPattern = /^RSN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyPattern.test(authKey)) {
      setError('INVALID KEY FORMAT — RSN-XXXX-XXXX-XXXX');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await base44.functions.invoke('authGate', {
        callsign: callsign.trim().toUpperCase(),
        auth_key: authKey.trim(),
      });

      if (result.data?.success) {
        // Store session
        localStorage.setItem('nexus_session', result.data.session_token);
        localStorage.setItem('nexus_discord_id', result.data.discord_id);
        localStorage.setItem('nexus_callsign', result.data.callsign);
        localStorage.setItem('nexus_rank', result.data.nexus_rank);
        window.location.href = '/app';
      } else {
        setError(result.data?.error || 'AUTHENTICATION FAILED');
      }
    } catch {
      setError('SYSTEM ERROR — TRY AGAIN');
    } finally {
      setLoading(false);
    }
  };

  // Poll verse status
  useEffect(() => {
    const check = async () => {
      try {
        const r = await base44.functions.invoke('verseStatus', {});
        setVerseStatus(r.data?.status || 'unknown');
      } catch {
        setVerseStatus('unknown');
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen scanlines"
      style={{ background: 'var(--bg0)', overflow: 'hidden' }}
    >
      <StarField />

      {/* Radial glow behind card */}
      <div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(ellipse at center, rgba(90,96,128,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Auth Card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-4"
        style={{ marginBottom: 40 }}
      >
        {/* Emblem */}
        <div className="flex flex-col items-center gap-3">
          <CompassEmblem />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 6 }}>
              REDSCAR NOMADS
            </div>
            <div style={{ color: 'var(--t0)', fontSize: 28, letterSpacing: '0.12em', fontWeight: 700, lineHeight: 1 }}>
              NEXUSOS
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 6 }}>
              ACCESS GATE
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full nexus-card"
          style={{ borderColor: 'var(--b1)', gap: 0, padding: '24px' }}
        >
          {/* Separator line */}
          <div style={{ borderBottom: '0.5px solid var(--b1)', marginBottom: 20, paddingBottom: 0 }}/>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 mb-4 p-2"
              style={{
                background: 'rgba(224,72,72,0.08)',
                border: '0.5px solid rgba(224,72,72,0.3)',
                borderRadius: 5,
                color: 'var(--warn)',
                fontSize: 11,
                letterSpacing: '0.06em',
              }}
            >
              <AlertTriangle size={12} style={{ flexShrink: 0 }}/>
              <span>{error}</span>
            </div>
          )}

          {/* Callsign */}
          <div className="mb-3">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
              CALLSIGN
            </label>
            <input
              className="nexus-input"
              type="text"
              placeholder="NOMAD-01"
              value={callsign}
              onChange={handleCallsignChange}
              autoComplete="off"
              spellCheck="false"
              disabled={loading}
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
          </div>

          {/* Auth Key */}
          <div className="mb-5">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
              AUTH KEY
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="nexus-input"
                type={showKey ? 'text' : 'password'}
                placeholder="RSN-XXXX-XXXX-XXXX"
                value={authKey}
                onChange={handleAuthKeyChange}
                autoComplete="off"
                spellCheck="false"
                disabled={loading}
                style={{ paddingRight: 40, letterSpacing: showKey ? '0.08em' : '0.18em' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--t2)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 2,
                }}
              >
                {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="nexus-btn primary w-full justify-center"
            style={{
              padding: '10px 0',
              letterSpacing: '0.1em',
              fontSize: 12,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>◌</span>
                AUTHENTICATING...
              </>
            ) : (
              'AUTHENTICATE →'
            )}
          </button>
        </div>

        {/* Footer link */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '0.5px solid var(--b1)', paddingTop: 16, color: 'var(--t2)', fontSize: 11 }}>
            New to NexusOS?&nbsp;
            <a
              href="https://discord.gg/redscar"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--acc2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Request access via Discord
              <ExternalLink size={11}/>
            </a>
          </div>
        </div>
      </form>

      <StatusBar verseStatus={verseStatus} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}