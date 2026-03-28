import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.substring(1);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#08080A',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        width: 400, height: 400,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(192,57,43,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 440, width: '100%', textAlign: 'center',
        position: 'relative', zIndex: 1,
        animation: 'nexus-fade-in 0.3s ease-out both',
      }}>
        {/* Emblem */}
        <div style={{ marginBottom: 24 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto', opacity: 0.5 }}>
            <circle cx="28" cy="28" r="26" stroke="#E8E4DC" strokeWidth="0.5" opacity="0.3" />
            <circle cx="28" cy="28" r="18" stroke="#C0392B" strokeWidth="0.5" opacity="0.4" />
            <circle cx="28" cy="28" r="9" fill="#C0392B" opacity="0.6" />
            <circle cx="28" cy="28" r="4" fill="#E8E4DC" opacity="0.8" />
            <line x1="8" y1="8" x2="48" y2="48" stroke="#C0392B" strokeWidth="0.8" opacity="0.3" />
            <line x1="48" y1="8" x2="8" y2="48" stroke="#C0392B" strokeWidth="0.8" opacity="0.3" />
          </svg>
        </div>

        {/* Error code */}
        <div style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 64, fontWeight: 700,
          color: '#E8E4DC', letterSpacing: '0.08em',
          lineHeight: 1, marginBottom: 8, opacity: 0.15,
        }}>404</div>

        {/* Red rule */}
        <div style={{
          height: 1, width: 60, margin: '0 auto 16px',
          background: '#C0392B', opacity: 0.6,
        }} />

        {/* Title */}
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 12, color: '#C8A84B',
          letterSpacing: '0.28em', textTransform: 'uppercase',
          marginBottom: 12,
        }}>SIGNAL LOST</div>

        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 14, fontWeight: 500, color: '#E8E4DC',
          letterSpacing: '0.06em', marginBottom: 8,
        }}>
          Route Not Found
        </div>

        {/* Path display */}
        {pageName && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, color: '#5A5850',
            letterSpacing: '0.08em', marginBottom: 20,
            wordBreak: 'break-all',
          }}>
            /{pageName}
          </div>
        )}

        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, color: '#7A7470',
          lineHeight: 1.6, marginBottom: 28,
          maxWidth: 320, margin: '0 auto 28px',
        }}>
          The requested route does not exist or has been decommissioned. Check your heading and try again.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            className="nexus-btn"
            style={{
              padding: '10px 20px', fontSize: 11,
              letterSpacing: '0.12em', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            ← GO BACK
          </button>
          <button
            onClick={() => navigate('/app/industry')}
            className="nexus-btn"
            style={{
              padding: '10px 20px', fontSize: 11,
              letterSpacing: '0.12em', fontWeight: 600,
              background: 'rgba(192,57,43,0.15)',
              borderColor: 'rgba(192,57,43,0.4)',
              color: '#E8E4DC',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            RETURN TO BASE →
          </button>
        </div>

        {/* Coordinates */}
        <div style={{
          marginTop: 40,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9, color: '#4A4640',
          letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          NEXUSOS · REDSCAR NOMADS · SIGNAL LOST
        </div>
      </div>
    </div>
  );
}