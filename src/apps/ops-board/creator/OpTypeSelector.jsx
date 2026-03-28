/**
 * OpTypeSelector — Hero op type picker with large cards, icons, and ambient glow.
 */
import React, { useState } from 'react';
import NexusToken from '@/core/design/NexusToken';
import { T } from '@/core/data/tokenMap';

const OP_TYPES = [
  { id: 'ROCKBREAKER', label: 'Rockbreaker', desc: 'Asteroid mining — breach, harvest, extract.', token: T('hex-cyan'), accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
  { id: 'MINING', label: 'Mining', desc: 'Ship or hand mining operations.', token: T('hex-green'), accent: '#4A8C5C', glow: 'rgba(74,140,92,0.12)' },
  { id: 'SALVAGE', label: 'Salvage', desc: 'Wreck salvage and component recovery.', token: T('mechanics-orange'), accent: '#C8A84B', glow: 'rgba(200,168,75,0.12)' },
  { id: 'PATROL', label: 'Patrol', desc: 'Sector patrol and threat deterrence.', token: T('target-alt-blue'), accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
  { id: 'COMBAT', label: 'Combat', desc: 'Direct engagement — bounties and PvP.', token: T('target-red'), accent: '#C0392B', glow: 'rgba(192,57,43,0.15)' },
  { id: 'ESCORT', label: 'Escort', desc: 'Convoy escort and VIP protection.', token: T('shelter-blue'), accent: '#5B8FB9', glow: 'rgba(91,143,185,0.12)' },
  { id: 'CARGO', label: 'Cargo Run', desc: 'Trade hauling and commodity runs.', token: T('fuel-yellow'), accent: '#D8BC70', glow: 'rgba(216,188,112,0.12)' },
  { id: 'RECON', label: 'Recon', desc: 'Scouting, exploration, and intel.', token: T('objective-blue'), accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
  { id: 'RESCUE', label: 'Rescue', desc: 'Medical evac and search & rescue.', token: T('hospital-green'), accent: '#4A8C5C', glow: 'rgba(74,140,92,0.12)' },
  { id: 'S17', label: 'Section 17', desc: 'Classified special operations.', token: T('penta-violet'), accent: '#9B59B6', glow: 'rgba(155,89,182,0.15)' },
];

export default function OpTypeSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const selected = OP_TYPES.find(t => t.id === value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* Ambient glow behind selected card */}
      {selected && (
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 200, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${selected.glow} 0%, transparent 70%)`,
          pointerEvents: 'none', transition: 'opacity 400ms',
          opacity: 0.8, zIndex: 0,
        }} />
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 8, position: 'relative', zIndex: 1,
      }}>
        {OP_TYPES.map((type, i) => {
          const isSelected = value === type.id;
          const isHovered = hovered === type.id;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              onMouseEnter={() => setHovered(type.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 8, padding: '14px 16px',
                background: isSelected
                  ? `linear-gradient(135deg, ${type.glow} 0%, #0F0F0D 100%)`
                  : isHovered ? '#141410' : '#0C0C0A',
                border: `1px solid ${isSelected ? type.accent : isHovered ? 'rgba(200,170,100,0.15)' : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isSelected ? `3px solid ${type.accent}` : '1px solid rgba(200,170,100,0.06)',
                borderRadius: 3, cursor: 'pointer',
                transition: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                textAlign: 'left',
                opacity: 0,
                animation: `nexus-fade-in 250ms ease-out both ${i * 40}ms`,
                position: 'relative', overflow: 'hidden',
                boxShadow: isSelected ? `0 4px 20px ${type.glow}` : 'none',
              }}
            >
              {/* Shine sweep on hover */}
              {isHovered && !isSelected && (
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
                  background: 'linear-gradient(90deg, transparent 40%, rgba(200,170,100,0.03) 50%, transparent 60%)',
                  animation: 'shimmer 1.2s ease-out forwards',
                  pointerEvents: 'none',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <div style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 2,
                  background: isSelected ? `${type.accent}18` : 'rgba(200,170,100,0.04)',
                  border: `0.5px solid ${isSelected ? `${type.accent}44` : 'rgba(200,170,100,0.08)'}`,
                  transition: 'all 200ms',
                  flexShrink: 0,
                }}>
                  <NexusToken src={type.token} size={20} alt={type.label} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    fontSize: 13, color: isSelected ? type.accent : '#E8E4DC',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    transition: 'color 200ms',
                  }}>{type.label}</div>
                </div>
              </div>

              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400,
                fontSize: 10, color: '#5A5850', lineHeight: 1.4,
              }}>{type.desc}</div>

              {/* Selection indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  width: 8, height: 8, borderRadius: '50%',
                  background: type.accent,
                  boxShadow: `0 0 8px ${type.accent}`,
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}