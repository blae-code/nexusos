import React, { useState } from 'react';

// Shown on AccessGate — email allowlist based admin bypass (no Discord required).
export default function AdminLoginPanel({ onLogin, logging, error }) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) onLogin(email.trim());
  };

  if (!expanded) {
    return (
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#8A8478',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          System Admin Access
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ height: '0.5px', background: 'rgba(232,228,220,0.08)', marginBottom: 16 }} />
      <div style={{ fontSize: 10, color: '#8A8478', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        System Admin Access
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          autoFocus
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(200,168,75,0.3)',
            borderRadius: '3px',
            color: '#E8E4DC',
            fontSize: 12,
            fontFamily: "'Barlow', sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={logging || !email.trim()}
          style={{
            display: 'block',
            width: '100%',
            background: logging ? 'rgba(200,168,75,0.05)' : 'rgba(200,168,75,0.1)',
            color: logging ? '#8A8478' : '#C8A84B',
            border: '0.5px solid rgba(200,168,75,0.3)',
            borderRadius: '3px',
            padding: '10px 20px',
            cursor: logging ? 'not-allowed' : 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'all 0.15s ease',
          }}
        >
          {logging ? 'AUTHENTICATING...' : 'ENTER AS SYSTEM ADMIN'}
        </button>
      </form>
      {error && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#C0392B', lineHeight: 1.5 }}>
          {error}
        </div>
      )}
    </div>
  );
}