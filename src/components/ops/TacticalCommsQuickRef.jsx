import React, { useState } from 'react';
import { X } from 'lucide-react';

const BREVITY_WORDS = [
  { word: 'ROGER', meaning: 'Understood' },
  { word: 'WILCO', meaning: 'Will comply' },
  { word: 'SAY AGAIN', meaning: 'Repeat last message' },
  { word: 'STAND BY', meaning: 'Need a moment' },
  { word: 'CLEAR COMMS', meaning: 'Stop talking on airways' },
  { word: 'ON ME', meaning: 'Form up' },
  { word: 'MOVE OUT', meaning: 'Start moving' },
  { word: 'SET SECURITY', meaning: '360° protection self check' },
  { word: 'HOLD', meaning: 'Stop movement' },
  { word: 'SELF CHECK', meaning: 'Verify your status' },
  { word: 'WEAPON DRY', meaning: 'Out of ammo' },
  { word: 'SET', meaning: 'In position' },
  { word: 'GREEN', meaning: 'Good to go' },
  { word: 'RELOADING', meaning: 'Currently reloading' },
  { word: 'CROSSING', meaning: 'Moving across line of fire' },
  { word: 'CEASE FIRE', meaning: 'Stop firing' },
  { word: 'CHECK FIRE', meaning: 'Stop friendly fire' },
];

export default function TacticalCommsQuickRef() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '8px 12px',
          background: 'var(--bg3)',
          border: '0.5px solid var(--b2)',
          borderRadius: 6,
          color: 'var(--cyan)',
          fontSize: 10,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg4)';
          e.currentTarget.style.borderColor = 'var(--cyan)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg3)';
          e.currentTarget.style.borderColor = 'var(--b2)';
        }}
      >
        TACTICAL COMMS
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 320,
        maxHeight: '80vh',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b2)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '0.5px solid var(--b1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ color: 'var(--cyan)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 500 }}>BREVITY WORDS</div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            padding: '2px 4px',
            display: 'flex',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BREVITY_WORDS.map(({ word, meaning }) => (
            <div key={word} style={{ borderLeft: '2px solid var(--cyan)', paddingLeft: 8 }}>
              <div style={{ color: 'var(--cyan)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>{word}</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>{meaning}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}