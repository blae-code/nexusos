/**
 * IndustryAnalyticsTab — top-level analytics container for Industry Hub.
 * Uses coffer logs, refinery orders, price snapshots, and material data
 * to forecast resource shortages and suggest optimal refinery timing.
 */
import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import ShortageForecaster from './ShortageForecaster';
import RefineryTimingAdvisor from './RefineryTimingAdvisor';
import CofferTrendAnalysis from './CofferTrendAnalysis';
import PriceTrendPanel from './PriceTrendPanel';

const SUB_TABS = [
  { id: 'shortages', label: 'SHORTAGE FORECAST', icon: AlertTriangle },
  { id: 'refinery', label: 'REFINERY TIMING', icon: Clock },
  { id: 'coffer', label: 'COFFER TRENDS', icon: DollarSign },
  { id: 'prices', label: 'PRICE SIGNALS', icon: TrendingUp },
];

export default function IndustryAnalyticsTab({
  materials, refineryOrders, cofferLogs, priceSnapshots, craftQueue, blueprints,
}) {
  const [subTab, setSubTab] = useState('shortages');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 16px',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '10px 16px', background: 'transparent', border: 'none',
              borderBottom: subTab === t.id ? '2px solid #C0392B' : '2px solid transparent',
              color: subTab === t.id ? '#E8E4DC' : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap', transition: 'color 150ms',
            }}
            onMouseEnter={e => { if (subTab !== t.id) e.currentTarget.style.color = '#9A9488'; }}
            onMouseLeave={e => { if (subTab !== t.id) e.currentTarget.style.color = '#5A5850'; }}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="nexus-fade-in" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {subTab === 'shortages' && (
          <ShortageForecaster
            materials={materials}
            craftQueue={craftQueue}
            blueprints={blueprints}
            refineryOrders={refineryOrders}
          />
        )}
        {subTab === 'refinery' && (
          <RefineryTimingAdvisor
            refineryOrders={refineryOrders}
            priceSnapshots={priceSnapshots}
            cofferLogs={cofferLogs}
            materials={materials}
          />
        )}
        {subTab === 'coffer' && (
          <CofferTrendAnalysis cofferLogs={cofferLogs} />
        )}
        {subTab === 'prices' && (
          <PriceTrendPanel priceSnapshots={priceSnapshots} />
        )}
      </div>
    </div>
  );
}