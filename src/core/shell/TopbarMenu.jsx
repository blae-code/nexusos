/**
 * TopbarMenu — LayoutButton, DropdownContainer, Divider, MenuLink, ChangelogPanel
 * helpers used by NexusTopbar.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { changelogText } from '@/core/data/generated/versioning';

export function LayoutButton({ active, title, onClick, icon }) {
  const tooltipText = title === 'ALT-TAB' ? 'Standard layout' : '2nd monitor layout';
  return (
    <button
      type="button"
      onClick={onClick}
      className="nexus-tooltip"
      data-tooltip={tooltipText}
      style={{
        width: 30,
        height: 28,
        borderRadius: 3,
        border: `0.5px solid ${active ? 'rgba(192,57,43,0.5)' : 'transparent'}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
        background: active ? 'rgba(192,57,43,0.12)' : 'transparent',
        color: active ? '#E8E4DC' : '#7A7470',
      }}
      onMouseEnter={(event) => {
        if (!active) {
          event.currentTarget.style.background = 'rgba(200,170,100,0.07)';
          event.currentTarget.style.borderColor = 'rgba(200,168,75,0.18)';
          event.currentTarget.style.color = '#E8E4DC';
        }
      }}
      onMouseLeave={(event) => {
        if (!active) {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.borderColor = 'transparent';
          event.currentTarget.style.color = '#7A7470';
        }
      }}
    >
      {icon}
    </button>
  );
}

export function DropdownContainer({ children, width }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        background: 'rgba(12,11,9,0.97)',
        backdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(200,170,100,0.12)',
        borderLeft: '2px solid #C0392B',
        borderRadius: '0 3px 3px 0',
        minWidth: width || 180,
        padding: '5px 0',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(192,57,43,0.08), inset 0 1px 0 rgba(232,228,220,0.05)',
      }}
    >
      {children}
    </div>
  );
}

export function Divider() {
  return (
    <div style={{
      height: '0.5px',
      background: 'linear-gradient(90deg, rgba(192,57,43,0.3), rgba(200,170,100,0.15), transparent)',
      margin: '4px 0',
    }} />
  );
}

export function MenuLink({ icon: Icon, label, onClick, danger, disabled, spinner }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        width: '100%',
        height: 30,
        padding: '0 12px',
        fontSize: 11,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: danger
          ? (hovered ? '#E84C3D' : 'rgba(192,57,43,0.8)')
          : (hovered ? '#E8E4DC' : '#9A9488'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: hovered && !disabled
          ? (danger ? 'rgba(192,57,43,0.08)' : 'rgba(200,170,100,0.05)')
          : 'transparent',
        border: 'none',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      {Icon ? <Icon size={12} style={{ flexShrink: 0, opacity: 0.7 }} /> : null}
      {label}
      {spinner ? (
        <span style={{ marginLeft: 4, display: 'inline-flex', gap: 2 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: 'var(--danger)',
                animation: `loading-dot 1s ease-in-out ${i * 0.15}s infinite`,
                display: 'inline-block',
              }}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}

export function ChangelogPanel({ onClose }) {
  const lines = changelogText.split(/\r?\n/);

  return (
    <div
      className="nexus-fade-in"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 16,
        width: 460,
        maxHeight: 560,
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 160,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '0.5px solid var(--b1)',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--t0)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 600 }}>
          CHANGELOG
        </span>
        <button
          type="button"
          onClick={onClose}
          className="nexus-tooltip"
          data-tooltip="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--t2)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={13} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
        {lines.map((line, index) => {
          if (line.startsWith('## ')) {
            return (
              <div
                key={index}
                style={{
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontWeight: 600,
                  paddingBottom: 5,
                  marginBottom: 6,
                  marginTop: index === 0 ? 0 : 14,
                  borderBottom: '0.5px solid var(--b0)',
                }}
              >
                {line.replace(/^## /, '')}
              </div>
            );
          }

          if (line.startsWith('# ')) {
            return null;
          }

          return (
            <div key={index} style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
              {line || '\u00a0'}
            </div>
          );
        })}
      </div>
    </div>
  );
}