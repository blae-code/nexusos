/**
 * MarketIntelligence — Standalone market analytics dashboard.
 * Algorithmic trend detection, volatility heatmaps, arbitrage finder,
 * and predictive price overlays using 30 days of PriceHistory data.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, TrendingUp, Activity, Zap, BarChart3, Search } from 'lucide-react';
import MarketSummaryBar from './MarketSummaryBar';
import TrendTable from './TrendTable';
import CommodityDetailPanel from './CommodityDetailPanel';
import ArbitragePanel from './ArbitragePanel';
import VolatilityHeatmap from './VolatilityHeatmap';
import SignalsPanel from './SignalsPanel';

const TABS = [
  { id: 'trends', label: 'TREND ANALYSIS', icon: TrendingUp },
  { id: 'volatility', label: 'VOLATILITY', icon: Activity },
  { id: 'arbitrage', label: 'ARBITRAGE', icon: Zap },
  { id: 'signals', label: 'SIGNALS', icon: BarChart3 },
];

export default function MarketIntelligence() {
  const [tab, setTab] = useState('trends');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [search, setSearch] = useState('');

  const loadDashboard = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('marketIntelligence', { action: 'dashboard' });
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load market intelligence');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadDashboard(false); }, [loadDashboard]);

  const handleSnapshot = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('marketIntelligence', { action: 'snapshot' });
      await loadDashboard(true);
    } catch (err) {
      setError(err?.message || 'Snapshot failed');
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>Loading market intelligence…</span>
        </div>
      </div>
    );
  }

  const commodities = data?.commodities || [];
  const filtered = search
    ? commodities.filter(c => (c.commodity_name || '').toLowerCase().includes(search.toLowerCase()))
    : commodities;

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Summary bar */}
      <MarketSummaryBar summary={data?.summary} />

      {/* Tab bar + actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', flexShrink: 0,
        padding: '0 16px',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedCommodity(null); }} style={{
            padding: '10px 14px', background: 'transparent', border: 'none',
            borderBottom: tab === t.id ? '2px solid #C0392B' : '2px solid transparent',
            color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
            fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'color 120ms',
          }}>
            <t.icon size={11} />
            {t.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
          <Search size={10} style={{ color: 'var(--t3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search commodities…"
            style={{
              background: 'transparent', border: 'none', color: 'var(--t1)',
              fontSize: 10, width: 120, outline: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          />
        </div>

        <button onClick={handleSnapshot} disabled={refreshing} className="nexus-btn"
          style={{ padding: '4px 10px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'SYNCING…' : 'SNAPSHOT'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 16px', color: 'var(--danger)', fontSize: 10, background: 'rgba(192,57,43,0.06)' }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {selectedCommodity ? (
          <CommodityDetailPanel
            commodity={selectedCommodity}
            onBack={() => setSelectedCommodity(null)}
          />
        ) : (
          <div className="nexus-fade-in" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {tab === 'trends' && <TrendTable commodities={filtered} onSelect={setSelectedCommodity} />}
            {tab === 'volatility' && <VolatilityHeatmap commodities={filtered} onSelect={setSelectedCommodity} />}
            {tab === 'arbitrage' && <ArbitragePanel arbitrage={data?.arbitrage || []} onSelect={setSelectedCommodity} />}
            {tab === 'signals' && <SignalsPanel signals={data?.signals || []} onSelect={setSelectedCommodity} />}
          </div>
        )}
      </div>
    </div>
  );
}