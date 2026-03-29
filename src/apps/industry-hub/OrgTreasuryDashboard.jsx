/**
 * OrgTreasuryDashboard — financial analytics for the org coffer.
 * Shows income/expense trends, breakdown by type, and projections.
 * Props: { cofferLogs }
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { TrendingUp, TrendingDown, Coins, BarChart3, PieChart, Calendar } from 'lucide-react';

function formatAUEC(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function StatCard({ icon: Icon, label, value, valueColor, subtext, trend }) {
  return (
    <div style={{
      flex: 1, minWidth: 140,
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={12} style={{ color: valueColor || '#9A9488' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26,
        fontWeight: 700, color: valueColor || '#E8E4DC',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
      {(subtext || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {trend !== undefined && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: trend >= 0 ? '#2edb7a' : '#C0392B',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(trend)}%
            </span>
          )}
          {subtext && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
            }}>{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownBar({ entries }) {
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {entries.map(e => (
          <div key={e.label} style={{
            flex: e.value, background: e.color, minWidth: e.value > 0 ? 2 : 0,
            transition: 'flex 400ms ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        {entries.filter(e => e.value > 0).map(e => (
          <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: e.color }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#9A9488',
            }}>{e.label}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#E8E4DC', fontWeight: 600,
            }}>{formatAUEC(e.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyChart({ weeklyData }) {
  const max = Math.max(...weeklyData.map(w => Math.max(w.income, w.expense)), 1);

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <BarChart3 size={10} /> WEEKLY ACTIVITY (LAST 8 WEEKS)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {weeklyData.map((w, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 60 }}>
              <div style={{
                width: 8, borderRadius: '2px 2px 0 0',
                height: `${Math.max(2, (w.income / max) * 60)}px`,
                background: '#2edb7a',
                transition: 'height 400ms ease',
              }} />
              <div style={{
                width: 8, borderRadius: '2px 2px 0 0',
                height: `${Math.max(2, (w.expense / max) * 60)}px`,
                background: '#C0392B',
                transition: 'height 400ms ease',
              }} />
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
              color: '#5A5850',
            }}>{w.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 4, borderRadius: 1, background: '#2edb7a' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488' }}>Income</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 4, borderRadius: 1, background: '#C0392B' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488' }}>Expense</span>
        </div>
      </div>
    </div>
  );
}

export default function OrgTreasuryDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.CofferLog.list('-logged_at', 500).catch(() => []);
    setLogs(data || []);
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);

  useEffect(() => {
    const unsub = base44.entities.CofferLog.subscribe(scheduleRefresh);
    return () => unsub();
  }, [scheduleRefresh]);

  const analytics = useMemo(() => {
    const positive = ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT'];
    const totalIn = logs.filter(e => positive.includes(e.entry_type)).reduce((s, e) => s + (e.amount_aUEC || 0), 0);
    const totalOut = logs.filter(e => e.entry_type === 'EXPENSE').reduce((s, e) => s + (e.amount_aUEC || 0), 0);
    const net = totalIn - totalOut;

    // By type breakdown
    const byType = {};
    logs.forEach(e => {
      const type = e.entry_type || 'OTHER';
      byType[type] = (byType[type] || 0) + (e.amount_aUEC || 0);
    });

    // Weekly data (last 8 weeks)
    const now = Date.now();
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekLogs = logs.filter(e => {
        const t = new Date(e.logged_at || e.created_date).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const income = weekLogs.filter(e => positive.includes(e.entry_type)).reduce((s, e) => s + (e.amount_aUEC || 0), 0);
      const expense = weekLogs.filter(e => e.entry_type === 'EXPENSE').reduce((s, e) => s + (e.amount_aUEC || 0), 0);
      weeklyData.push({ label: `W${8 - i}`, income, expense });
    }

    // Trend (this week vs last week)
    const thisWeekIn = weeklyData[7]?.income || 0;
    const lastWeekIn = weeklyData[6]?.income || 0;
    const trend = lastWeekIn > 0 ? Math.round(((thisWeekIn - lastWeekIn) / lastWeekIn) * 100) : 0;

    // Average daily income
    const daysWithLogs = new Set(logs.map(e => new Date(e.logged_at || e.created_date).toDateString())).size;
    const avgDaily = daysWithLogs > 0 ? Math.round(totalIn / daysWithLogs) : 0;

    // Top sources
    const incomeBreakdown = [
      { label: 'Sales', value: byType.SALE || 0, color: '#2edb7a' },
      { label: 'Craft Sales', value: byType.CRAFT_SALE || 0, color: '#4A8C5C' },
      { label: 'Op Splits', value: byType.OP_SPLIT || 0, color: '#C8A84B' },
      { label: 'Deposits', value: byType.DEPOSIT || 0, color: '#7AAECC' },
    ];

    return { totalIn, totalOut, net, trend, avgDaily, weeklyData, incomeBreakdown, logCount: logs.length };
  }, [logs]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' }}>
      {/* Top stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard icon={TrendingUp} label="TOTAL INCOME" value={`${formatAUEC(analytics.totalIn)} aUEC`} valueColor="#2edb7a" trend={analytics.trend} subtext="vs last week" />
        <StatCard icon={TrendingDown} label="TOTAL EXPENSES" value={`${formatAUEC(analytics.totalOut)} aUEC`} valueColor="#C0392B" />
        <StatCard icon={Coins} label="NET BALANCE" value={`${formatAUEC(analytics.net)} aUEC`} valueColor={analytics.net >= 0 ? '#2edb7a' : '#C0392B'} />
        <StatCard icon={Calendar} label="AVG DAILY" value={`${formatAUEC(analytics.avgDaily)} aUEC`} valueColor="#C8A84B" subtext={`across ${analytics.logCount} entries`} />
      </div>

      {/* Income breakdown */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '14px 16px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <PieChart size={10} /> INCOME SOURCES
        </div>
        <BreakdownBar entries={analytics.incomeBreakdown} />
      </div>

      {/* Weekly chart */}
      <WeeklyChart weeklyData={analytics.weeklyData} />
    </div>
  );
}
