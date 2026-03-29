import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import CrawlerStatusPanel from './CrawlerStatusPanel';
import PricesTab from './tabs/PricesTab';
import MarketplaceTab from './tabs/MarketplaceTab';
import TradeBoardTab from './tabs/TradeBoardTab';
import RoutesTab from './tabs/RoutesTab';
import PriceWatchTab from './tabs/PriceWatchTab';
import AnalyticsTab from './tabs/AnalyticsTab';

const TABS = [
  { key: 'prices', label: 'PRICES' },
  { key: 'marketplace', label: 'MARKETPLACE' },
  { key: 'trade', label: 'TRADE BOARD' },
  { key: 'routes', label: 'ROUTES' },
  { key: 'alerts', label: 'PRICE WATCH' },
  { key: 'analytics', label: 'ANALYTICS' },
];

export default function MarketHub() {
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get('tab') || 'prices');
  const [lastSync, setLastSync] = useState(null);

  const loadLastSync = useCallback(async () => {
    const syncs = await base44.entities.MarketSync.list('-synced_at', 1);
    if (syncs?.[0]) setLastSync(syncs[0]);
  }, []);

  useEffect(() => { loadLastSync(); }, [loadLastSync]);

  const changeTab = (key) => {
    setTab(key);
    const url = new URL(window.location);
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 0', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 18, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>MARKET HUB</div>
              <div style={{
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 2,
              }}>UEX ECONOMY INTELLIGENCE & ORG TRADE</div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => changeTab(t.key)} style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: tab === t.key ? '#E8E4DC' : '#5A5850',
                borderBottom: tab === t.key ? '2px solid #C0392B' : '2px solid transparent',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = '#5A5850'; }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ padding: '14px 24px 0', maxWidth: 1400, margin: '0 auto' }}>
          <CrawlerStatusPanel onSynced={loadLastSync} />
        </div>
        {tab === 'prices' && <PricesTab lastSync={lastSync} onSynced={loadLastSync} />}
        {tab === 'marketplace' && <MarketplaceTab lastSync={lastSync} onSynced={loadLastSync} />}
        {tab === 'trade' && <TradeBoardTab />}
        {tab === 'routes' && <RoutesTab />}
        {tab === 'alerts' && <PriceWatchTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}