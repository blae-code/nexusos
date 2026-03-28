/**
 * LayerControls — toggleable layer switches for the live system map.
 */
import React from 'react';
import { Layers, MapPin, AlertTriangle, Route, Crosshair, Eye, EyeOff } from 'lucide-react';

const LAYERS = [
  { id: 'deposits', label: 'DEPOSITS', icon: MapPin, color: '#4A8C5C', desc: 'Scout deposits' },
  { id: 'stations', label: 'STATIONS', icon: Crosshair, color: '#3498DB', desc: 'Terminals & outposts' },
  { id: 'hazards', label: 'HAZARDS', icon: AlertTriangle, color: '#C0392B', desc: 'Danger zones' },
  { id: 'routes', label: 'ROUTES', icon: Route, color: '#E8A020', desc: 'Trade routes' },
  { id: 'heatmap', label: 'HEATMAP', icon: Layers, color: '#8E44AD', desc: 'Density overlay' },
];

export default function LayerControls({ activeLayers, onToggle }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '8px 10px', background: 'rgba(10,9,8,0.85)',
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
        color: '#5A5850', letterSpacing: '0.15em', marginBottom: 2,
      }}>LAYERS</div>
      {LAYERS.map(layer => {
        const Icon = layer.icon;
        const active = activeLayers[layer.id];
        const EyeIcon = active ? Eye : EyeOff;
        return (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
              background: active ? `${layer.color}10` : 'transparent',
              border: `0.5px solid ${active ? `${layer.color}40` : 'transparent'}`,
              borderRadius: 2, cursor: 'pointer', width: '100%', textAlign: 'left',
              transition: 'all 120ms',
            }}
          >
            <Icon size={10} style={{ color: active ? layer.color : '#5A5850', flexShrink: 0 }} />
            <span style={{
              flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: active ? '#E8E4DC' : '#5A5850', fontWeight: 600,
              letterSpacing: '0.06em',
            }}>{layer.label}</span>
            <EyeIcon size={9} style={{ color: active ? layer.color : '#5A5850', opacity: 0.6 }} />
          </button>
        );
      })}
    </div>
  );
}