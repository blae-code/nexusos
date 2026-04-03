import React from 'react';
import { Flame, Wrench, Package, FileText, BarChart3, Boxes, List } from 'lucide-react';

const NAV_ACTIONS = [
  { icon: Boxes,     label: 'INVENTORY',    tab: 'inventory' },
  { icon: Flame,     label: 'NEW REFINERY', tab: 'refinery' },
  { icon: Wrench,    label: 'CRAFT QUEUE',  tab: 'craft' },
  { icon: Package,   label: 'MARKETPLACE',  tab: 'marketplace' },
  { icon: FileText,  label: 'REQUISITIONS', tab: 'requisitions' },
  { icon: List,      label: 'MATERIALS',    tab: 'materials' },
  { icon: BarChart3, label: 'ANALYTICS',    tab: 'analytics' },
];

export default function QuickActionsCard({ onTabChange, onLogHaul }) {
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

      {/* LOG HAUL — primary CTA spanning full width */}
      <button
        onClick={onLogHaul}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 12px', borderRadius: 2, cursor: 'pointer', marginBottom: 8,
          background: 'rgba(192,57,43,0.14)',
          border: '0.5px solid rgba(192,57,43,0.40)',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#E8E4DC',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(192,57,43,0.24)';
          e.currentTarget.style.borderColor = '#C0392B';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(192,57,43,0.14)';
          e.currentTarget.style.borderColor = 'rgba(192,57,43,0.40)';
        }}
      >
        ⛏ LOG HAUL
      </button>

      {/* Secondary nav grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {NAV_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onTabChange(action.tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 10px', borderRadius: 2, cursor: 'pointer',
                background: 'rgba(200,170,100,0.04)',
                border: '0.5px solid rgba(200,170,100,0.10)',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#9A9488',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(200,170,100,0.08)';
                e.currentTarget.style.borderColor = 'rgba(200,170,100,0.25)';
                e.currentTarget.style.color = '#E8E4DC';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(200,170,100,0.04)';
                e.currentTarget.style.borderColor = 'rgba(200,170,100,0.10)';
                e.currentTarget.style.color = '#9A9488';
              }}
            >
              <Icon size={11} style={{ flexShrink: 0 }} />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
