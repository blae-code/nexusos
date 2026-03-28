import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

function fmtAuec(val) {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs}`;
}

const POSITIVE_TYPES = ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT', 'TREASURY_DEPOSIT'];

export default function CofferStatusCard({ cofferLogs, onNavigate }) {
  const logs = cofferLogs || [];

  const { balance, income7d, expenses7d, recentCount } = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600000;
    let bal = 0, inc = 0, exp = 0, recent = 0;
    for (const log of logs) {
      const amt = log.amount_aUEC || 0;
      const isPositive = POSITIVE_TYPES.includes(log.entry_type);
      bal += isPositive ? amt : -amt;
      const ts = new Date(log.logged_at || log.created_date || 0).getTime();
      if (ts >= weekAgo) {
        recent++;
        if (isPositive) inc += amt; else exp += amt;
      }
    }
    return { balance: bal, income7d: inc, expenses7d: exp, recentCount: recent };
  }, [logs]);

  const netWeek = income7d - expenses7d;
  const isPositive = balance >= 0;

  return (
    <div
      className="nexus-card-clickable"
      onClick={onNavigate}
      style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '20px 22px', cursor: 'pointer',
        transition: 'border-color 150ms, transform 150ms, background 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <TrendingUp size={14} style={{ color: '#C0392B' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
          color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>ORG COFFER</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 36, color: isPositive ? '#E8E4DC' : '#C0392B', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{fmtAuec(balance)}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
        }}>aUEC</span>
      </div>

      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5A5850', marginBottom: 14 }}>
        {recentCount} transaction{recentCount !== 1 ? 's' : ''} this week
      </div>

      {/* 7-day income / expense bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4A8C5C' }}>INCOME 7D</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4A8C5C', fontVariantNumeric: 'tabular-nums' }}>+{fmtAuec(income7d)}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(200,170,100,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, background: '#4A8C5C',
              width: `${Math.min(100, income7d > 0 ? Math.max(5, (income7d / Math.max(income7d, expenses7d)) * 100) : 0)}%`,
              transition: 'width 0.6s ease-out',
            }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C0392B' }}>EXPENSES 7D</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C0392B', fontVariantNumeric: 'tabular-nums' }}>-{fmtAuec(expenses7d)}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(200,170,100,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, background: '#C0392B',
              width: `${Math.min(100, expenses7d > 0 ? Math.max(5, (expenses7d / Math.max(income7d, expenses7d)) * 100) : 0)}%`,
              transition: 'width 0.6s ease-out',
            }} />
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
        color: netWeek >= 0 ? '#4A8C5C' : '#C0392B',
      }}>
        {netWeek >= 0 ? '↑' : '↓'} NET {netWeek >= 0 ? '+' : ''}{fmtAuec(netWeek)} THIS WEEK
      </div>
    </div>
  );
}