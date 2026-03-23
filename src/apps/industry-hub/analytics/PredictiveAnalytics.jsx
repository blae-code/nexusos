/**
 * PredictiveAnalytics — Top-level container that loads all four analytics
 * panels and presents them in a sub-tab layout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, TrendingUp, Zap, Package, BarChart3 } from 'lucide-react';
import MarketForecastPanel from './MarketForecastPanel';
import ProductionRecsPanel from './ProductionRecsPanel';
import DemandForecastPanel from './DemandForecastPanel';
import TradeIntelPanel from './TradeIntelPanel';

const SUB_TABS = [
  { id: 'market',     label: 'MARKET FORECAST',     icon: TrendingUp },
  { id: 'production', label: 'PRODUCTION RECS',     icon: Zap },
  { id: 'demand',     label: 'DEMAND FORECAST',     icon: Package },
  { id: 'trade',      label: 'TRADE INTEL',         icon: BarChart3 },
];

export default function PredictiveAnalytics() {
  const [subTab, setSubTab] = useState('market');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ market: null, production: null, demand: null, trade: null });
  const [error, setError] = useState(null);

  const loadAll = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [marketRes, prodRes, demandRes, tradeRes] = await Promise.all([
        base44.functions.invoke('predictiveAnalytics', { action: 'market_forecast' }),
        base44.functions.invoke('predictiveAnalytics', { action: 'production_recs' }),
        base44.functions.invoke('predictiveAnalytics', { action: 'demand_forecast' }),
        base44.functions.invoke('predictiveAnalytics', { action: 'trade_intel' }),
      ]);

      setData({
        market:     marketRes?.data?.forecasts     || [],
        production: prodRes?.data?.recommendations || [],
        demand:     demandRes?.data?.demand         || [],
        trade:      tradeRes?.data?.intel           || [],
      });
    } catch (err) {
      setError(err?.message || 'Failed to load analytics');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAll(false); }, [loadAll]);

  // Aggregate quick stats across all panels
  const quickStats = React.useMemo(() => {
    const strongSignals = (data.market || []).filter(f => f.signal === 'STRONG_BUY' || f.signal === 'STRONG_SELL').length;
    const craftReady = (data.production || []).filter(r => r.recommendation === 'CRAFT_NOW').length;
    const shortages = (data.demand || []).filter(d => d.status === 'CRITICAL' || d.status === 'SHORT').length;
    const topTrades = (data.trade || []).filter(t => t.rating === 'TOP_TIER').length;
    return { strongSignals, craftReady, shortages, topTrades };
  }, [data]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>Crunching data across all modules…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Quick stat summary + refresh */}
      <div style={{
        padding: '10px 16px', background: 'var(--bg1)',
        borderBottom: '0.5px solid var(--b1)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 14, flex: 1, flexWrap: 'wrap' }}>
          {quickStats.strongSignals > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} style={{ color: '#C8A84B' }} />
              <span style={{ color: '#C8A84B', fontSize: 10, fontWeight: 600 }}>{quickStats.strongSignals} strong signal{quickStats.strongSignals !== 1 ? 's' : ''}</span>
            </div>
          )}
          {quickStats.craftReady > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={11} style={{ color: '#4AE830' }} />
              <span style={{ color: '#4AE830', fontSize: 10, fontWeight: 600 }}>{quickStats.craftReady} ready to craft</span>
            </div>
          )}
          {quickStats.shortages > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Package size={11} style={{ color: '#C0392B' }} />
              <span style={{ color: '#C0392B', fontSize: 10, fontWeight: 600 }}>{quickStats.shortages} material shortage{quickStats.shortages !== 1 ? 's' : ''}</span>
            </div>
          )}
          {quickStats.topTrades > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BarChart3 size={11} style={{ color: 'var(--info)' }} />
              <span style={{ color: 'var(--info)', fontSize: 10, fontWeight: 600 }}>{quickStats.topTrades} top-tier route{quickStats.topTrades !== 1 ? 's' : ''}</span>
            </div>
          )}
          {quickStats.strongSignals === 0 && quickStats.craftReady === 0 && quickStats.shortages === 0 && quickStats.topTrades === 0 && (
            <span style={{ color: 'var(--t3)', fontSize: 10 }}>All systems nominal — no urgent actions detected</span>
          )}
        </div>

        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="nexus-btn"
          style={{
            padding: '4px 10px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
            color: refreshing ? 'var(--t3)' : 'var(--t1)',
          }}
        >
          <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'REFRESHING…' : 'REFRESH'}
        </button>
      </div>

      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 16px',
        borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', flexShrink: 0,
      }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '10px 14px',
              background: 'transparent', border: 'none',
              borderBottom: subTab === t.id ? '2px solid var(--acc2)' : '2px solid transparent',
              color: subTab === t.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 120ms ease',
            }}
          >
            <t.icon size={10} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 16px', color: '#C0392B', fontSize: 10, background: 'rgba(192,57,43,0.06)' }}>
          {error}
        </div>
      )}

      {/* Panel content */}
      <div className="nexus-fade-in" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {subTab === 'market' && <MarketForecastPanel data={data.market} />}
        {subTab === 'production' && <ProductionRecsPanel data={data.production} />}
        {subTab === 'demand' && <DemandForecastPanel data={data.demand} />}
        {subTab === 'trade' && <TradeIntelPanel data={data.trade} />}
      </div>
    </div>
  );
}