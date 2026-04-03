import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BootScreen() {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: '#08080A',
      zIndex: 0
    }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
        src="/video/nexus-boot-loop02.mp4"
      />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        zIndex: 1
      }} />
      <button
        onClick={() => navigate('/gate')}
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          background: 'rgba(200,170,100,0.08)',
          border: '0.5px solid rgba(200,170,100,0.3)',
          borderRadius: 3,
          color: 'rgba(200,170,100,0.7)',
          fontFamily: "'Barlow Condensed', monospace, sans-serif",
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          padding: '8px 20px',
          cursor: 'pointer',
        }}
      >
        ENTER NEXUSOS →
      </button>
    </div>
  );
}
