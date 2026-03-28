/**
 * OpPublishOverlay — Dramatic full-screen publish confirmation with compass spin.
 */
import React from 'react';

export default function OpPublishOverlay({ opName, visible }) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(8,8,10,0.95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      animation: 'nexus-fade-in 200ms ease-out both',
    }}>
      <style>{`
        @keyframes compass-spin-publish {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
          40% { transform: rotate(180deg) scale(1.1); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
        @keyframes glow-pulse-publish {
          0%, 100% { box-shadow: 0 0 40px rgba(192,57,43,0.2); }
          50% { box-shadow: 0 0 80px rgba(192,57,43,0.4); }
        }
        @keyframes text-reveal {
          from { opacity: 0; transform: translateY(8px); letter-spacing: 0.6em; }
          to { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }
        @keyframes checkline-draw {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(192,57,43,0.08) 0%, transparent 70%)',
        animation: 'glow-pulse-publish 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Spinning compass */}
      <div style={{ animation: 'compass-spin-publish 800ms ease-out both' }}>
        <svg width="64" height="64" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.4" opacity="0.3" />
          <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.5" opacity="0.6" />
          <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.85" />
          <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
          <line x1="22" y1="2" x2="22" y2="7.5" stroke="#E8E4DC" strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="22,2 20.2,12 22,10.5 23.8,12" fill="#E8E4DC" opacity="0.9" />
        </svg>
      </div>

      {/* Checkmark */}
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
        <polyline
          points="10 20 17 27 30 14"
          fill="none" stroke="#4A8C5C" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="48"
          style={{ animation: 'checkline-draw 500ms 400ms ease-out forwards', strokeDashoffset: 48 }}
        />
      </svg>

      {/* Text */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
        fontSize: 14, color: '#4A8C5C',
        letterSpacing: '0.3em', textTransform: 'uppercase',
        animation: 'text-reveal 500ms 300ms ease-out both',
      }}>OP AUTHORIZED</div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
        fontSize: 18, color: '#E8E4DC',
        textAlign: 'center', maxWidth: 400,
        animation: 'text-reveal 500ms 500ms ease-out both',
        opacity: 0,
      }}>{opName}</div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400,
        fontSize: 10, color: '#5A5850',
        letterSpacing: '0.15em', textTransform: 'uppercase',
        animation: 'text-reveal 500ms 700ms ease-out both',
        opacity: 0,
      }}>REDIRECTING TO MISSION COMMAND...</div>
    </div>
  );
}