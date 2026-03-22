import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Shown on AccessGate for Base44 platform admins who have no Discord account.
// Calls the adminLogin backend function which validates their Base44 role.
export default function AdminLoginPanel({ onLogin, logging, error }) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    // Check if the current Base44 platform session is admin
    base44.auth.me()
      .then(user => { if (user?.role === 'admin') setIsPlatformAdmin(true); })
      .catch(() => {});
  }, []);

  if (!isPlatformAdmin) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        height: '0.5px',
        background: 'rgba(232,228,220,0.08)',
        marginBottom: 16,
      }} />
      <div style={{
        fontSize: 10,
        color: '#8A8478',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        System Admin Access
      </div>
      <button
        onClick={onLogin}
        disabled={logging}
        style={{
          display: 'block',
          width: '100%',
          background: logging ? 'var(--bg3, #1a1916)' : 'rgba(200,168,75,0.1)',
          color: logging ? '#8A8478' : '#C8A84B',
          border: '0.5px solid rgba(200,168,75,0.3)',
          borderRadius: '3px',
          padding: '11px 20px',
          cursor: logging ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 600,
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!logging) {
            e.currentTarget.style.background = 'rgba(200,168,75,0.18)';
            e.currentTarget.style.borderColor = 'rgba(200,168,75,0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!logging) {
            e.currentTarget.style.background = 'rgba(200,168,75,0.1)';
            e.currentTarget.style.borderColor = 'rgba(200,168,75,0.3)';
          }
        }}
      >
        {logging ? 'AUTHENTICATING...' : 'ENTER AS SYSTEM ADMIN'}
      </button>
      {error && (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: '#C0392B',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}