import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '@/core/data/auth-api';
import { IS_DEV_MODE, DEV_PERSONAS, setDevPersona } from '@/core/data/dev';
import { useSession } from '@/core/data/SessionContext';

function buildStars() {
  if (typeof window === 'undefined') return [];
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);

  // ~120 stars with varied sizes scattered across entire viewport
  const starCount = 120;
  return Array.from({ length: starCount }, (_, id) => ({
    id,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.4 + 0.8,
    opacity: Math.random() * 0.4 + 0.3,
  }));
}

function getErrorMessage(errorCode, supportChannelLabel) {
  switch (errorCode) {
    case 'not_in_guild':
      return `You must join the Redscar Discord first. If you already joined, give Discord a moment to sync and try again. Support: ${supportChannelLabel}.`;
    case 'role_not_allowed':
      return `Your Discord account is in the server, but it does not have a Redscar member role yet. Contact leadership in ${supportChannelLabel}.`;
    case 'expired_state':
    case 'state_mismatch':
      return 'Your Discord sign-in session expired before it completed. Start the Discord flow again.';
    case 'token_exchange_failed':
    case 'discord_request_failed':
      return 'Discord could not be reached. Check your connection and try again. If the problem persists, contact leadership.';
    case 'callback_failed':
    case 'auth_failed':
      return 'Discord sign-in could not be completed. Retry once, then contact leadership if the issue persists.';
    default:
      return '';
  }
}

export default function AccessGate() {
  const location = useLocation();
  const { isAuthenticated, loading, user, refreshSession } = useSession();

  const [stars, setStars] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(!IS_DEV_MODE);
  const [launching, setLaunching] = useState(false);
  const [healthError, setHealthError] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const authError = useMemo(
    () => getErrorMessage(searchParams.get('error'), health?.support_channel_label || '#nexusos-ops'),
    [health?.support_channel_label, searchParams],
  );

  useEffect(() => {
    setStars(buildStars());
  }, []);

  useEffect(() => {
    if (IS_DEV_MODE) {
      setHealth({
        oauth_ready: true,
        guild_label: 'REDSCAR NOMADS',
        support_channel_label: '#nexusos-ops',
        invite_url: 'https://discord.gg/redscar',
        onboarding_steps: [
          'Choose a simulation persona.',
          'Review the shell and app surfaces.',
          'Switch to live auth in production by disabling demo mode.',
        ],
      });
      setHealthLoading(false);
      return;
    }

    let active = true;
    setHealthLoading(true);

    authApi.getHealth()
      .then((response) => {
        if (!active) return;
        setHealth(response);
        setHealthError(response.ok ? '' : 'Discord sign-in readiness could not be verified.');
      })
      .catch((error) => {
        if (!active) return;
        setHealth(null);
        setHealthError(error?.message || 'Discord sign-in readiness could not be verified.');
      })
      .finally(() => {
        if (active) {
          setHealthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDiscordContinue = () => {
    if (launching || healthLoading) {
      return;
    }

    setLaunching(true);
    const redirectTo = searchParams.get('redirect_to') || '/app/industry';
    try {
      const url = authApi.getDiscordStartUrl(redirectTo);
      window.location.href = url;
    } catch (error) {
      console.error('[AccessGate] Discord redirect failed:', error);
      setLaunching(false);
    }
  };

  if (!loading && isAuthenticated) {
    return <Navigate to={user?.onboarding_complete === false ? '/onboarding' : '/app/industry'} replace />;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0908',
        overflow: 'hidden',
        fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
      }}
    >
      {/* CINEMATIC BACKGROUND — Deep space with subtle nebula */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 150% 80% at 30% 20%, rgba(139,40,40,0.15) 0%, transparent 40%),
            radial-gradient(ellipse 100% 100% at 70% 70%, rgba(50,30,60,0.08) 0%, transparent 50%),
            linear-gradient(180deg, #0A0908 0%, #12090D 50%, #0A0908 100%)
          `,
          zIndex: 0,
        }}
      />

      {/* STARFIELD — High-quality stars with variable opacity */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
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
              background: '#F0EDE5',
              boxShadow: `0 0 ${star.size * 1.5}px rgba(240,237,229,${star.opacity * 0.6})`,
              opacity: star.opacity,
              animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* RED NEBULA — Primary accent bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 65% 15%, rgba(192,57,43,0.12) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      {/* AMBER CORE — Warm accent at bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 85%, rgba(200,168,75,0.08) 0%, transparent 60%)',
          filter: 'blur(50px)',
        }}
      />

      {/* LEFT-ANCHORED PANEL — Premium cinema-grade glass morphism */}
      <div
        style={{
          position: 'absolute',
          left: '10vw',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '420px',
          background: 'rgba(15, 15, 13, 0.92)',
          backdropFilter: 'blur(12px)',
          borderLeft: '2.5px solid #C0392B',
          borderTop: '1px solid rgba(232, 228, 220, 0.08)',
          borderRight: '1px solid rgba(232, 228, 220, 0.04)',
          borderBottom: '1px solid rgba(232, 228, 220, 0.04)',
          boxShadow: `
            0 0 60px rgba(192, 57, 43, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(232, 228, 220, 0.1)
          `,
          padding: '56px 44px 48px 44px',
          boxSizing: 'border-box',
          zIndex: 1,
          animation: 'panel-fade-in 0.8s ease-out',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" stroke="#E8E4DC" strokeWidth="0.75" opacity="0.45"/>
            <circle cx="24" cy="24" r="16" stroke="#C0392B" strokeWidth="0.75" opacity="0.6"/>
            <circle cx="24" cy="24" r="8" fill="#C0392B" opacity="0.85"/>
            <circle cx="24" cy="24" r="3.5" fill="#E8E4DC"/>
            <line x1="24" y1="2" x2="24" y2="8.5" stroke="#E8E4DC" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="24" y1="39.5" x2="24" y2="46" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
            <line x1="2" y1="24" x2="8.5" y2="24" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
            <line x1="39.5" y1="24" x2="46" y2="24" stroke="#E8E4DC" strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
            <polygon points="24,2 22,13.5 24,11.5 26,13.5" fill="#E8E4DC" opacity="0.9"/>
          </svg>
        </div>

        {/* RED RULE */}
        <div style={{ height: '1px', background: '#C0392B', marginBottom: '16px', opacity: 0.8 }} />

        {/* ORG LABEL */}
        <div
          style={{
            fontFamily: "'Earth Orbiter', 'EarthOrbiter', 'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '11px',
            color: '#C8A84B',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '6px',
            marginTop: '8px',
            textAlign: 'left',
          }}
        >
          REDSCAR NOMADS
        </div>

        {/* MAIN TITLE */}
        <div
          style={{
            fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '62px',
            color: '#E8E4DC',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          NEXUSOS
        </div>

        {/* SUBTITLE */}
        <div
          style={{
            fontFamily: "'Earth Orbiter', 'EarthOrbiter', 'Barlow Condensed', sans-serif",
            fontWeight: 400,
            fontSize: '12px',
            color: '#C8A84B',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginTop: '6px',
            marginBottom: '28px',
          }}
        >
          ACCESS GATE
        </div>

        {/* BODY */}
         <div
           style={{
             fontFamily: "'Barlow', sans-serif",
             fontWeight: 400,
             fontSize: '14px',
             color: '#9A9488',
             lineHeight: 1.7,
             marginBottom: '32px',
           }}
         >
          Continue with Discord to verify your Redscar Nomads membership and launch the app.
        </div>

        {/* CTA BUTTON */}
        {IS_DEV_MODE ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {DEV_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  setDevPersona(persona.id);
                  refreshSession();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: '#C0392B',
                  color: '#E8E4DC',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '14px 24px',
                  cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#9B2D20';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#C0392B';
                }}
              >
                {persona.callsign} — {persona.rank}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={handleDiscordContinue}
            disabled={launching || healthLoading}
            style={{
              display: 'block',
              width: '100%',
              background: launching || healthLoading ? '#7B2218' : '#C0392B',
              color: '#E8E4DC',
              border: 'none',
              borderRadius: '2px',
              padding: '14px 24px',
              cursor: launching || healthLoading ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
              transition: 'background 0.15s',
              opacity: launching || healthLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (
                health?.oauth_ready &&
                !launching &&
                !healthLoading
              ) {
                e.currentTarget.style.background = '#9B2D20';
              }
            }}
            onMouseLeave={(e) => {
              if (
                health?.oauth_ready &&
                !launching &&
                !healthLoading
              ) {
                e.currentTarget.style.background = '#C0392B';
              }
            }}
          >
            {launching || healthLoading ? 'CONNECTING...' : 'CONTINUE WITH DISCORD →'}
          </button>
        )}

        {/* ERROR STATE */}
        {(authError || healthError) && (
          <div
            style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: '13px',
              color: '#C8A84B',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            {authError || healthError}
          </div>
        )}

        {/* FOOTER LINK */}
        {!IS_DEV_MODE && (
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '12px',
              color: '#8A8478',
              letterSpacing: '0.05em',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'color 0.2s',
              marginTop: '12px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#C8A84B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8A8478';
            }}
          >
            Request access via #nexusos-ops
          </div>
        )}
      </div>

      {/* FIXED FOOTER */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '32px',
          background: '#0A0908',
          borderTop: '0.5px solid rgba(200,170,100,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '11px',
            color: '#C8A84B',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ animation: 'pulse 2s ease-in-out infinite' }}>●</span>
          VERSE 4.7.0
        </div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '11px',
            color: '#8A8478',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          REDSCAR · NOMADS · ETERNAL VOYAGE
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@400;500;600;700&display=swap');
        @import url('https://fonts.cdnfonts.com/css/beyond-mars');
        @import url('https://fonts.cdnfonts.com/css/earth-orbiter');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes nexus-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}