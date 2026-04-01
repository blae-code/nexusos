/**
 * OpTypeSelector — Categorised op type picker.
 * Types are grouped into four operational categories.
 */
import React, { useState } from 'react';
import NexusToken from '@/core/design/NexusToken';
import { T } from '@/core/data/tokenMap';

const CATEGORIES = [
  {
    id: 'INDUSTRY',
    label: 'Industry',
    desc: 'Resource extraction, salvage, logistics',
    types: [
      { id: 'MINING',           label: 'Mining',          desc: 'Ship or ground vehicle mining operations.',          token: T('hex-green'),        accent: '#4A8C5C', glow: 'rgba(74,140,92,0.12)' },
      { id: 'ROCKBREAKER',      label: 'Rockbreaker',     desc: 'Multi-crew asteroid cracking — breach, lens, fire.', token: T('hex-cyan'),         accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
      { id: 'SALVAGE',          label: 'Salvage',         desc: 'Wreck salvage — bulk hull or component recovery.',    token: T('mechanics-orange'), accent: '#C8A84B', glow: 'rgba(200,168,75,0.12)' },
      { id: 'CARGO',            label: 'Cargo Run',       desc: 'Trade hauling and commodity logistics.',              token: T('fuel-yellow'),      accent: '#D8BC70', glow: 'rgba(216,188,112,0.12)' },
    ],
  },
  {
    id: 'COMBAT',
    label: 'Combat & Security',
    desc: 'Patrol, strike, escort, SAR',
    types: [
      { id: 'COMBAT',           label: 'Combat',          desc: 'Direct engagement — bounties, PvP, assault.',         token: T('target-red'),       accent: '#C0392B', glow: 'rgba(192,57,43,0.15)' },
      { id: 'PATROL',           label: 'Patrol',          desc: 'Sector patrol and area threat deterrence.',            token: T('target-alt-blue'),  accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
      { id: 'ESCORT',           label: 'Escort',          desc: 'Convoy or VIP protection along a route.',             token: T('shelter-blue'),     accent: '#5B8FB9', glow: 'rgba(91,143,185,0.12)' },
      { id: 'RESCUE',           label: 'Rescue',          desc: 'Medical evac, distress response, SAR.',               token: T('hospital-green'),   accent: '#4A8C5C', glow: 'rgba(74,140,92,0.12)' },
    ],
  },
  {
    id: 'INTEL',
    label: 'Intel & Special',
    desc: 'Reconnaissance and classified operations',
    types: [
      { id: 'RECON',            label: 'Recon',           desc: 'Scouting, deposit survey, intel gathering.',          token: T('objective-blue'),   accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
      { id: 'S17',              label: 'Section 17',      desc: 'Classified. Need-to-know briefing at staging.',       token: T('penta-violet'),     accent: '#9B59B6', glow: 'rgba(155,89,182,0.15)' },
    ],
  },
  {
    id: 'PROGRESSION',
    label: 'Progression',
    desc: 'Faction standing and blueprint acquisition',
    types: [
      { id: 'REP_GRIND',        label: 'Rep Grind',       desc: 'Faction reputation missions — build standing.',       token: T('objective-blue'),   accent: '#7AAECC', glow: 'rgba(122,174,204,0.12)' },
      { id: 'BLUEPRINT_GRIND',  label: 'Blueprint Grind', desc: 'Schematic acquisition and unlock runs.',              token: T('mechanics-orange'), accent: '#C8A84B', glow: 'rgba(200,168,75,0.12)' },
    ],
  },
];

const ALL_TYPES = CATEGORIES.flatMap(c => c.types);

export default function OpTypeSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const selected = ALL_TYPES.find(t => t.id === value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative' }}>
      {/* Ambient glow behind selected card */}
      {selected && (
        <div style={{
          position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 300, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${selected.glow} 0%, transparent 70%)`,
          pointerEvents: 'none', transition: 'background 500ms', opacity: 0.6, zIndex: 0,
        }} />
      )}

      {CATEGORIES.map((cat, catIdx) => (
        <div key={cat.id} style={{ position: 'relative', zIndex: 1 }}>
          {/* Category header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 10, color: '#5A5850', letterSpacing: '0.2em',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
              opacity: 0, animation: `nexus-fade-in 200ms ease-out both ${catIdx * 60}ms`,
            }}>{cat.label}</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(200,170,100,0.07)' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: '#3A3830', letterSpacing: '0.1em', textTransform: 'uppercase',
              opacity: 0, animation: `nexus-fade-in 200ms ease-out both ${catIdx * 60}ms`,
            }}>{cat.desc}</span>
          </div>

          {/* Type cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cat.types.length <= 2 ? cat.types.length : 'auto-fill'}, minmax(160px, 1fr))`,
            gap: 6,
          }}>
            {cat.types.map((type, typeIdx) => {
              const isSelected = value === type.id;
              const isHovered  = hovered === type.id;
              const animDelay  = catIdx * 60 + typeIdx * 35;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onChange(type.id)}
                  onMouseEnter={() => setHovered(type.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: 8, padding: '13px 14px',
                    background: isSelected
                      ? `linear-gradient(135deg, ${type.glow} 0%, #0F0F0D 100%)`
                      : isHovered ? '#141410' : '#0C0C0A',
                    border: `0.5px solid ${isSelected ? type.accent : isHovered ? 'rgba(200,170,100,0.14)' : 'rgba(200,170,100,0.06)'}`,
                    borderLeft: isSelected ? `2px solid ${type.accent}` : '0.5px solid rgba(200,170,100,0.06)',
                    borderRadius: 2, cursor: 'pointer',
                    transition: 'all 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    textAlign: 'left',
                    opacity: 0,
                    animation: `nexus-fade-in 250ms ease-out both ${animDelay}ms`,
                    position: 'relative', overflow: 'hidden',
                    boxShadow: isSelected ? `0 4px 16px ${type.glow}` : 'none',
                  }}
                >
                  {/* Hover shimmer */}
                  {isHovered && !isSelected && (
                    <div style={{
                      position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
                      background: 'linear-gradient(90deg, transparent 40%, rgba(200,170,100,0.025) 50%, transparent 60%)',
                      animation: 'shimmer 1.2s ease-out forwards', pointerEvents: 'none',
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%' }}>
                    <div style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 2,
                      background: isSelected ? `${type.accent}18` : 'rgba(200,170,100,0.03)',
                      border: `0.5px solid ${isSelected ? `${type.accent}40` : 'rgba(200,170,100,0.07)'}`,
                      transition: 'all 180ms', flexShrink: 0,
                    }}>
                      <NexusToken src={type.token} size={18} alt={type.label} />
                    </div>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                      fontSize: 12, color: isSelected ? type.accent : '#E8E4DC',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      transition: 'color 180ms', flex: 1, minWidth: 0,
                    }}>{type.label}</span>
                  </div>

                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400,
                    fontSize: 9, color: '#4A4840', lineHeight: 1.4,
                  }}>{type.desc}</span>

                  {/* Selected pulse */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 7, right: 9,
                      width: 7, height: 7, borderRadius: '50%',
                      background: type.accent, boxShadow: `0 0 7px ${type.accent}`,
                      animation: 'pulse-dot 2s ease-in-out infinite',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
