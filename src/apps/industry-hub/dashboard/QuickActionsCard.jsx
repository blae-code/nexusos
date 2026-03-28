import React from 'react';
import { Plus, Flame, Wrench, Package, FileText, BarChart3 } from 'lucide-react';

const ACTIONS = [
  { icon: Plus, label: 'LOG MATERIAL', tab: 'materials', tone: 'primary' },
  { icon: Flame, label: 'NEW REFINERY', tab: 'refinery', tone: 'default' },
  { icon: Wrench, label: 'CRAFT QUEUE', tab: 'craft', tone: 'default' },
  { icon: Package, label: 'MARKETPLACE', tab: 'marketplace', tone: 'default' },
  { icon: FileText, label: 'REQUISITIONS', tab: 'requisitions', tone: 'default' },
  { icon: BarChart3, label: 'ANALYTICS', tab: 'analytics', tone: 'default' },
];

export default function QuickActionsCard({ onTabChange, navigate }) {
  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '20px 22px',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
        color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>QUICK ACTIONS</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ACTIONS.map(action => {
          const Icon = action.icon;
          const isPrimary = action.tone === 'primary';
          return (
            <button
              key={action.label}
              onClick={() => onTabChange(action.tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 2, cursor: 'pointer',
                background: isPrimary ? 'rgba(192,57,43,0.12)' : 'rgba(200,170,100,0.04)',
                border: `0.5px solid ${isPrimary ? 'rgba(192,57,43,0.3)' : 'rgba(200,170,100,0.10)'}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isPrimary ? '#E8E4DC' : '#9A9488',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isPrimary ? 'rgba(192,57,43,0.2)' : 'rgba(200,170,100,0.08)';
                e.currentTarget.style.borderColor = isPrimary ? '#C0392B' : 'rgba(200,170,100,0.25)';
                e.currentTarget.style.color = '#E8E4DC';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isPrimary ? 'rgba(192,57,43,0.12)' : 'rgba(200,170,100,0.04)';
                e.currentTarget.style.borderColor = isPrimary ? 'rgba(192,57,43,0.3)' : 'rgba(200,170,100,0.10)';
                e.currentTarget.style.color = isPrimary ? '#E8E4DC' : '#9A9488';
              }}
            >
              <Icon size={12} style={{ flexShrink: 0 }} />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}