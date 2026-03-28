import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import moment from 'moment';
import PriceTrendChart from './analytics/PriceTrendChart';
import CommoditySelector from './analytics/CommoditySelector';
import ProfitRouteRanker from './analytics/ProfitRouteRanker';
import MarginHeatmap from './analytics/MarginHeatmap';
import VolatilityTable from './analytics/VolatilityTable';

function StatCard({ label, value, color = '#E8E4DC' }) {
  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '16px 20px',
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color, letterSpacing: '0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function fmt(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

const SUB_TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'trends', label: 'PRICE TRENDS' },
  { id: 'routes', label: 'PROFIT ROUTES' },
  { id: 'margins', label: 'MARGIN MAP' },
  { id: 'volatility', label: 'VOLATILITY' },
];

export default function AnalyticsTab() {
  const [logs, setLogs] = useState([]);
  const [cofferLogs, setCofferLogs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('overview');
  const [selectedCommodity, setSelectedCommodity] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cl, cfl, tr, ps, cm] = await Promise.all([
      base44.entities.CargoLog.list('-logged_at', 200),
      base44.entities.CofferLog.list('-logged_at', 200),
      base44.entities.TradeRoute.list('-route_score', 500),
      base44.entities.PriceSnapshot.list('-snapped_at', 500).catch(() => []),
      base44.entities.GameCacheCommodity.list('-margin_pct', 500).catch(() => []),
    ]);
    setLogs(cl || []);
    setCofferLogs(cfl || []);
    setRoutes(tr || []);
    setSnapshots(ps || []);
    setCommodities(cm || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  const totalVolume = logs.reduce((s, l) => s + (l.total_revenue || l.amount_aUEC || 0), 0);
  const bestMargin = logs.reduce((best, l) => Math.max(best, l.margin_pct || 0), 0);
  const activeRoutes = routes.length;

  // Commodity breakdown
  const byCommodity = {};
  logs.forEach(l => {
    const name = l.commodity || l.commodity_name || 'Unknown';
    byCommodity[name] = (byCommodity[name] || 0) + (l.total_revenue || l.amount_aUEC || 0);
  });
  const commodityData = Object.entries(byCommodity).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Profit by member
  const byMember = {};
  cofferLogs.forEach(l => {
    if (l.entry_type === 'SALE' || l.entry_type === 'CRAFT_SALE') {
      const cs = l.logged_by_callsign || 'Unknown';
      byMember[cs] = (byMember[cs] || 0) + (l.amount_aUEC || 0);
    }
  });
  const memberData = Object.entries(byMember).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Recent transactions
  const recent = logs.slice(0, 20);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 16 }}>MARKET ANALYTICS</div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: subTab === t.id ? '#E8E4DC' : '#5A5850',
            borderBottom: subTab === t.id ? '2px solid #C0392B' : '2px solid transparent',
            transition: 'color 120ms',
          }}
          onMouseEnter={e => { if (subTab !== t.id) e.currentTarget.style.color = '#9A9488'; }}
          onMouseLeave={e => { if (subTab !== t.id) e.currentTarget.style.color = '#5A5850'; }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview sub-tab (original content) */}
      {subTab === 'overview' && (
        <div>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="TOTAL TRADE VOLUME" value={`${fmt(totalVolume)} aUEC`} />
            <StatCard label="BEST MARGIN TRADE" value={`${bestMargin.toFixed(1)}%`} color="#4A8C5C" />
            <StatCard label="ACTIVE ROUTES" value={String(routes.length)} color="#C8A84B" />
            <StatCard label="PRICE SNAPSHOTS" value={String(snapshots.length)} color="#3498DB" />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <ChartPanel title="TOP COMMODITIES BY VOLUME">
              {commodityData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={commodityData}>
                    <CartesianGrid stroke="rgba(200,170,100,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="#C8A84B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
            <ChartPanel title="PROFIT BY MEMBER">
              {memberData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={memberData}>
                    <CartesianGrid stroke="rgba(200,170,100,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="#C0392B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </div>

          {/* Recent transactions */}
          <ChartPanel title="RECENT TRANSACTIONS">
            {recent.length === 0 ? <NoData text="NO TRANSACTIONS RECORDED" /> : recent.map((l, i) => (
              <div key={l.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                borderBottom: i < recent.length - 1 ? '0.5px solid rgba(200,170,100,0.06)' : 'none',
              }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B', minWidth: 80 }}>
                  {l.logged_at ? moment(l.logged_at).format('MMM D HH:mm') : '—'}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC', flex: 1 }}>
                  {l.commodity || l.commodity_name || l.description || '—'}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: (l.profit_loss || l.amount_aUEC || 0) >= 0 ? '#4A8C5C' : '#C0392B' }}>
                  {(l.profit_loss || l.amount_aUEC || 0) >= 0 ? '+' : ''}{fmt(l.profit_loss || l.amount_aUEC || 0)} aUEC
                </span>
              </div>
            ))}
          </ChartPanel>
        </div>
      )}

      {/* Price Trends sub-tab */}
      {subTab === 'trends' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
          <ChartPanel title="COMMODITY">
            <CommoditySelector commodities={commodities} selected={selectedCommodity} onSelect={setSelectedCommodity} />
          </ChartPanel>
          <ChartPanel title="PRICE HISTORY">
            <PriceTrendChart snapshots={snapshots} commodityName={selectedCommodity} />
          </ChartPanel>
        </div>
      )}

      {/* Profit Routes sub-tab */}
      {subTab === 'routes' && (
        <ChartPanel title="MOST PROFITABLE ROUTES — RISK-ADJUSTED RANKING">
          <ProfitRouteRanker routes={routes} commodities={commodities} />
        </ChartPanel>
      )}

      {/* Margin Map sub-tab */}
      {subTab === 'margins' && (
        <ChartPanel title="COMMODITY MARGINS — LATEST SNAPSHOT">
          <MarginHeatmap snapshots={snapshots} />
        </ChartPanel>
      )}

      {/* Volatility sub-tab */}
      {subTab === 'volatility' && (
        <ChartPanel title="PRICE VOLATILITY — BIGGEST MOVERS">
          <VolatilityTable snapshots={snapshots} />
        </ChartPanel>
      )}
    </div>
  );
}

const TT_STYLE = { background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 11 };

function ChartPanel({ title, children }) {
  return (
    <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 16 }}>
      <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function NoData({ text = 'NO DATA' }) {
  return <div style={{ color: '#5A5850', fontSize: 10, textAlign: 'center', padding: 20 }}>{text}</div>;
}