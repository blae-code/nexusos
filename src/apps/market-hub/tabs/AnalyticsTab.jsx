import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import moment from 'moment';

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

export default function AnalyticsTab() {
  const [logs, setLogs] = useState([]);
  const [cofferLogs, setCofferLogs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cl, cfl, tr] = await Promise.all([
      base44.entities.CargoLog.list('-logged_at', 200),
      base44.entities.CofferLog.list('-logged_at', 200),
      base44.entities.TradeRoute.filter({ is_flagged: true }),
    ]);
    setLogs(cl || []);
    setCofferLogs(cfl || []);
    setRoutes(tr || []);
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

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard label="TOTAL TRADE VOLUME" value={`${fmt(totalVolume)} aUEC`} />
        <StatCard label="BEST MARGIN TRADE" value={`${bestMargin.toFixed(1)}%`} color="#4A8C5C" />
        <StatCard label="ACTIVE FLAGGED ROUTES" value={String(activeRoutes)} color="#C8A84B" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Commodity volume */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 16 }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 14 }}>TOP COMMODITIES BY VOLUME</div>
          {commodityData.length === 0 ? (
            <div style={{ color: '#5A5850', fontSize: 10, textAlign: 'center', padding: 20 }}>NO DATA</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={commodityData}>
                <CartesianGrid stroke="rgba(200,170,100,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} />
                <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 11 }} />
                <Bar dataKey="value" fill="#C8A84B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit by member */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 16 }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 14 }}>PROFIT BY MEMBER</div>
          {memberData.length === 0 ? (
            <div style={{ color: '#5A5850', fontSize: 10, textAlign: 'center', padding: 20 }}>NO DATA</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberData}>
                <CartesianGrid stroke="rgba(200,170,100,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} />
                <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 11 }} />
                <Bar dataKey="value" fill="#C0392B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 16 }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 14 }}>RECENT TRANSACTIONS</div>
        {recent.length === 0 ? (
          <div style={{ color: '#5A5850', fontSize: 10, textAlign: 'center', padding: 20 }}>NO TRANSACTIONS RECORDED</div>
        ) : recent.map((l, i) => (
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
      </div>
    </div>
  );
}