import React, { useEffect, useState } from 'react';
import { authApi } from '@/core/data/auth-api';
import { Copy, AlertTriangle, CheckCircle } from 'lucide-react';

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

export default function Setup() {
  const [stars] = useState(() => buildStars());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [state, setState] = useState('idle'); // idle | loading | success | already | error
  const [key, setKey] = useState('');
  const [loginName, setLoginName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEnabled, setRecoveryEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handle = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  const handleBootstrap = async ({ recovery = false } = {}) => {
    setState('loading');
    setErrorMsg('');
    try {
      const data = await authApi.bootstrapSystemAdmin({
        recoveryToken: recovery ? recoveryToken.trim() : undefined,
      });

      if (data?.key) {
        setKey(data.key);
        setLoginName(data.login_name || data.username || 'system-admin');
        setCallsign(data.callsign || 'SYSTEM-ADMIN');
        setRecoveryEnabled(Boolean(data.recovery_enabled));
        setState('success');
      } else if (data?.error === 'already_bootstrapped') {
        setLoginName(data.login_name || data.username || 'system-admin');
        setCallsign(data.callsign || 'SYSTEM-ADMIN');
        setRecoveryEnabled(Boolean(data.recovery_enabled));
        setState('already');
      } else if (data?.error === 'invalid_recovery_token') {
        setLoginName(data.login_name || data.username || 'system-admin');
        setCallsign(data.callsign || 'SYSTEM-ADMIN');
        setRecoveryEnabled(true);
        setErrorMsg(data?.message || 'Recovery token rejected.');
        setState('error');
      } else {
        setErrorMsg(data?.message || data?.error || 'Bootstrap failed.');
        setState('error');
      }
    } catch (error) {
      setErrorMsg(error?.message || 'Bootstrap failed.');
      setState('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0908', overflow: 'hidden', fontFamily: "'Barlow Condensed', 'Barlow', sans-serif" }}>

      {/* Background layers */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 150% 80% at 30% 20%, rgba(139,40,40,0.15) 0%, transparent 40%),
          radial-gradient(ellipse 100% 100% at 70% 70%, rgba(50,30,60,0.08) 0%, transparent 50%),
          linear-gradient(180deg, #0A0908 0%, #12090D 50%, #0A0908 100%)
        `,
        zIndex: 0,
      }} />

      {/* Starfield */}
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

      {/* Interactive nebula */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 50% 40% at ${mousePos.x / winW * 100}% ${mousePos.y / winH * 100}%, rgba(192,57,43,0.15) 0%, transparent 65%)`,
        filter: 'blur(40px)', transition: 'background 50ms ease-out',
      }} />

      {/* Amber core */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 85%, rgba(200,168,75,0.08) 0%, transparent 60%)',
        filter: 'blur(50px)',
      }} />

      {/* Left-anchored panel */}
      <div style={{
        position: 'absolute', left: '10vw', top: '50%', transform: 'translateY(-50%)',
        width: 460,
        background: 'rgba(15, 15, 13, 0.92)', backdropFilter: 'blur(12px)',
        borderLeft: '2.5px solid #C0392B',
        borderTop: '1px solid rgba(232, 228, 220, 0.08)',
        borderRight: '1px solid rgba(232, 228, 220, 0.04)',
        borderBottom: '1px solid rgba(232, 228, 220, 0.04)',
        boxShadow: '0 0 60px rgba(192, 57, 43, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(232, 228, 220, 0.1)',
        padding: '56px 44px 48px 44px', boxSizing: 'border-box', zIndex: 1,
        animation: 'setup-panel-in 0.8s ease-out',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="https://www.redscar.org/images/RedScarFUll.png" alt="Redscar Nomads" style={{
            height: 48, width: 'auto', filter: 'brightness(1.05) drop-shadow(0 2px 8px rgba(192,57,43,0.3))',
          }} />
        </div>

        {/* Red rule */}
        <div style={{ height: 1, background: '#C0392B', marginBottom: 40, opacity: 0.8 }} />

        {/* Title */}
        <div style={{
          fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 42,
          color: '#E8E4DC', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
          marginBottom: 6,
        }}>
          SYSTEM
        </div>
        <div style={{
          fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 42,
          color: '#E8E4DC', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
          marginBottom: 8,
        }}>
          INITIALISATION
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'Earth Orbiter', 'Barlow Condensed', sans-serif", fontWeight: 400,
          fontSize: 12, color: '#C8A84B', letterSpacing: '0.25em', textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          BOOTSTRAP · ONE-TIME SETUP
        </div>

        {/* Body */}
        <div style={{
          fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 14, color: '#9A9488',
          lineHeight: 1.7, marginBottom: 32,
        }}>
          Generate the SYSTEM-ADMIN credentials. The access key is shown once, while the issued username remains fixed as the admin login for Base44 development. If this account is already bootstrapped, an optional recovery token can mint a fresh key.
        </div>

        {/* === IDLE STATE === */}
        {state === 'idle' && (
          <button
            onClick={() => handleBootstrap()}
            style={{
              display: 'block', width: '100%',
              background: '#C0392B', color: '#F0EDE5',
              border: '1px solid rgba(192,57,43,0.7)', borderRadius: 2,
              padding: '14px 24px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase',
              boxShadow: '0 8px 24px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E84C3D'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#C0392B'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            INITIALISE SYSTEM ADMIN
          </button>
        )}

        {/* === LOADING STATE === */}
        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="nexus-loading-dots" style={{ color: '#C8A84B', fontSize: 14 }}>
              <span /><span /><span />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#9A9488', letterSpacing: '0.1em' }}>
              GENERATING KEY...
            </div>
          </div>
        )}

        {/* === SUCCESS STATE === */}
        {state === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Warning */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              background: 'rgba(192,57,43,0.1)', border: '0.5px solid rgba(192,57,43,0.4)',
              borderRadius: 2,
            }}>
              <AlertTriangle size={14} style={{ color: '#C0392B', flexShrink: 0 }} />
              <span style={{ color: '#C0392B', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                THIS KEY WILL NOT BE SHOWN AGAIN. STORE IT SECURELY.
              </span>
            </div>

            {/* Key display */}
            <div style={{
              padding: '20px 20px',
              background: '#08080A',
              border: '1px solid rgba(200,168,75,0.35)',
              borderRadius: 2,
            }}>
              <div style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
                CALLSIGN
              </div>
              <div style={{ fontSize: 16, color: '#E8E4DC', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 16 }}>
                {callsign || 'SYSTEM-ADMIN'}
              </div>

              <div style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
                USERNAME
              </div>
              <div style={{ fontSize: 16, color: '#E8E4DC', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 16 }}>
                {loginName || 'system-admin'}
              </div>

              <div style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
                ACCESS KEY
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <code style={{
                  flex: 1, color: '#C8A84B', fontSize: 18, fontFamily: 'monospace', fontWeight: 700,
                  letterSpacing: '0.08em', wordBreak: 'break-all',
                }}>
                  {key}
                </code>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '6px 14px', background: 'transparent',
                    border: '0.5px solid rgba(200,168,75,0.3)', borderRadius: 2,
                    color: copied ? '#4AE830' : '#C8A84B', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                    letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: 600, flexShrink: 0,
                  }}
                >
                  {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
                  {copied ? 'COPIED' : 'COPY KEY'}
                </button>
              </div>
            </div>

            {/* Next step */}
            <div style={{
              fontSize: 12, color: '#9A9488', lineHeight: 1.7,
              fontFamily: "'Barlow', sans-serif",
            }}>
              Use username <strong style={{ color: '#E8E4DC' }}>{loginName || 'system-admin'}</strong> and this key at the <a href="/" style={{ color: '#C8A84B', textDecoration: 'underline' }}>Access Gate</a> to log in.
            </div>
          </div>
        )}

        {/* === ALREADY BOOTSTRAPPED === */}
        {state === 'already' && (
          <div style={{
            padding: '20px 18px',
            background: 'rgba(200,168,75,0.06)', border: '0.5px solid rgba(200,168,75,0.2)',
            borderRadius: 2, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#C8A84B', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              SYSTEM ALREADY INITIALISED
            </div>
            <div style={{ fontSize: 12, color: '#9A9488', lineHeight: 1.6 }}>
              The admin account already exists. Sign in with username <strong style={{ color: '#E8E4DC' }}>{loginName || 'system-admin'}</strong>, or regenerate the key from Key Management after login.
            </div>
            {recoveryEnabled && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                <button
                  type="button"
                  onClick={() => setShowRecovery((current) => !current)}
                  style={{
                    padding: '10px 14px',
                    background: 'transparent',
                    border: '0.5px solid rgba(200,168,75,0.25)',
                    borderRadius: 2,
                    color: '#C8A84B',
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {showRecovery ? 'Hide Emergency Recovery' : 'Emergency Recovery'}
                </button>
                {showRecovery && (
                  <>
                    <div style={{ fontSize: 11, color: '#9A9488', lineHeight: 1.6 }}>
                      Enter the `SYSTEM_ADMIN_BOOTSTRAP_SECRET` value from Base44 environment settings to mint a fresh auth key without any existing admin session.
                    </div>
                    <input
                      type="password"
                      value={recoveryToken}
                      onChange={(e) => setRecoveryToken(e.target.value)}
                      placeholder="ENTER RECOVERY TOKEN"
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: '#141410',
                        border: '0.5px solid rgba(200,170,100,0.10)',
                        borderRadius: 2,
                        color: '#E8E4DC',
                        fontSize: 12,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      disabled={!recoveryToken.trim()}
                      onClick={() => handleBootstrap({ recovery: true })}
                      style={{
                        padding: '12px 16px',
                        background: recoveryToken.trim() ? '#C0392B' : '#5A2620',
                        border: '1px solid rgba(192,57,43,0.7)',
                        borderRadius: 2,
                        color: '#F0EDE5',
                        cursor: recoveryToken.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Regenerate System Admin Key
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* === ERROR STATE === */}
        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.3)',
              borderRadius: 2, fontSize: 12, color: '#C8A84B', lineHeight: 1.6,
            }}>
              {errorMsg}
            </div>
            <button
              onClick={() => setState('idle')}
              style={{
                padding: '10px 20px', background: 'transparent',
                border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2,
                color: '#9A9488', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 32,
        background: '#0A0908', borderTop: '0.5px solid rgba(200,170,100,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#C8A84B',
            animation: 'pulse 2s ease-in-out infinite', display: 'inline-block',
          }} />
          BOOTSTRAP MODE
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#8A8478',
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

        @keyframes setup-panel-in {
          0% { opacity: 0; transform: translateY(-50%) translateX(-20px); }
          100% { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}
