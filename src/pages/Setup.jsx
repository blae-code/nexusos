import React from 'react';

export default function Setup() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0908 0%, #12090D 100%)',
      color: '#E8E4DC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      boxSizing: 'border-box',
      fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
    }}>
      <div style={{
        width: 'min(560px, 100%)',
        background: 'rgba(15, 15, 13, 0.94)',
        borderLeft: '2px solid #C0392B',
        borderTop: '1px solid rgba(232, 228, 220, 0.08)',
        borderRight: '1px solid rgba(232, 228, 220, 0.04)',
        borderBottom: '1px solid rgba(232, 228, 220, 0.04)',
        padding: '40px 36px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif",
          fontSize: 38,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Setup Archived
        </div>
        <div style={{
          fontSize: 12,
          color: '#C8A84B',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          Manual Credentials Only
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 14,
          color: '#9A9488',
          lineHeight: 1.8,
        }}>
          The legacy bootstrap and recovery workflow has been retired. Use the manually issued
          <strong style={{ color: '#E8E4DC' }}> system-admin </strong>
          credentials at the Access Gate.
        </div>
      </div>
    </div>
  );
}
