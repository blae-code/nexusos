/**
 * DepositRiskOverlay — Environmental risk data visualization for deposits.
 * Shows risk level distribution, threat density, and risk-weighted recommendations.
 * Props: { deposits }
 */
import React, { useMemo } from 'react';
import { AlertTriangle, Shield, TrendingUp, MapPin } from 'lucide-react';

const RISK_CONFIG = {
  LOW:     { color: '#2edb7a', bg: 'rgba(46,219,122,0.08)', label: 'LOW RISK' },
  MEDIUM:  { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)', label: 'MEDIUM RISK' },
  HIGH:    { color: '#C0392B', bg: 'rgba(192,57,43,0.08)', label: 'HIGH RISK' },
  EXTREME: { color: '#8A2020', bg: 'rgba(138,32,32,0.08)', label: 'EXTREME RISK' },
};

function RiskStat({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{
      flex: 1, background: '#0F0F0D',
      border: `0.5px solid ${color}33`,
      borderRadius: 2, padding: '10px 12px', minWidth: 80,
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
        fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{count}</div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginTop: 4,
      }}>{label}</div>
      <div style={{
        height: 2, borderRadius: 1, marginTop: 6,
        background: 'rgba(200,170,100,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 1,
          background: color, transition: 'width 400ms ease',
        }} />
      </div>
    </div>
  );
}

function DepositRiskRow({ deposit }) {
  const riskCfg = RISK_CONFIG[deposit.risk_level] || RISK_CONFIG.LOW;
  const qualityColor = (deposit.quality_score || 0) >= 800 ? '#2edb7a'
    : (deposit.quality_score || 0) >= 600 ? '#C8A84B' : '#9A9488';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 2,
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: riskCfg.color, flexShrink: 0,
      }} />
      <span style={{
        flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, color: '#E8E4DC', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{deposit.material_name}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: '#5A5850', display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <MapPin size={9} /> {deposit.system_name}
      </span>
      {deposit.quality_score > 0 && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: qualityColor, fontVariantNumeric: 'tabular-nums',
        }}>Q{deposit.quality_score}</span>
      )}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: riskCfg.color, background: riskCfg.bg,
        border: `0.5px solid ${riskCfg.color}33`,
        padding: '2px 6px', borderRadius: 2,
        letterSpacing: '0.06em', fontWeight: 600,
      }}>{deposit.risk_level || 'N/A'}</span>
    </div>
  );
}

function SystemRiskSummary({ deposits }) {
  const systemData = useMemo(() => {
    const systems = {};
    deposits.forEach(d => {
      const sys = d.system_name || 'UNKNOWN';
      if (!systems[sys]) systems[sys] = { total: 0, high: 0, avgQuality: 0, qualitySum: 0 };
      systems[sys].total++;
      if (d.risk_level === 'HIGH' || d.risk_level === 'EXTREME') systems[sys].high++;
      if (d.quality_score) { systems[sys].qualitySum += d.quality_score; }
    });
    return Object.entries(systems).map(([name, data]) => ({
      name,
      ...data,
      avgQuality: data.qualitySum > 0 ? Math.round(data.qualitySum / data.total) : 0,
      dangerPct: data.total > 0 ? Math.round((data.high / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [deposits]);

  const SYSTEM_COLORS = { STANTON: '#5297FF', PYRO: '#C0392B', NYX: '#D8BC70' };

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>SYSTEM RISK SUMMARY</div>
      {systemData.map(sys => (
        <div key={sys.name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
            color: SYSTEM_COLORS[sys.name.toUpperCase()] || '#E8E4DC',
            fontWeight: 600, minWidth: 70,
          }}>{sys.name}</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488',
          }}>{sys.total} deposits</span>
          <div style={{ flex: 1 }} />
          {sys.dangerPct > 0 && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: '#C0392B', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <AlertTriangle size={9} /> {sys.dangerPct}% high risk
            </span>
          )}
          {sys.avgQuality > 0 && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: sys.avgQuality >= 800 ? '#2edb7a' : sys.avgQuality >= 600 ? '#C8A84B' : '#9A9488',
              fontVariantNumeric: 'tabular-nums',
            }}>avg Q{sys.avgQuality}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DepositRiskOverlay({ deposits = [] }) {
  const riskCounts = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 };
    deposits.forEach(d => {
      const risk = d.risk_level || 'LOW';
      if (counts[risk] !== undefined) counts[risk]++;
    });
    return counts;
  }, [deposits]);

  const total = deposits.length;

  // High-value targets: high quality + manageable risk
  const recommendations = useMemo(() => {
    return deposits
      .filter(d => (d.quality_score || 0) >= 700 && d.risk_level !== 'EXTREME')
      .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      .slice(0, 5);
  }, [deposits]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Risk distribution */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
          <RiskStat key={level} label={cfg.label} count={riskCounts[level]} total={total} color={cfg.color} />
        ))}
      </div>

      {/* System summary */}
      <SystemRiskSummary deposits={deposits} />

      {/* Recommended targets */}
      {recommendations.length > 0 && (
        <div style={{
          background: '#0F0F0D',
          border: '0.5px solid rgba(46,219,122,0.15)',
          borderLeft: '2px solid #2edb7a',
          borderRadius: 2, padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#2edb7a', letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <TrendingUp size={10} /> HIGH-VALUE TARGETS (Q700+ · LOW-MED RISK)
          </div>
          {recommendations.map(d => <DepositRiskRow key={d.id} deposit={d} />)}
        </div>
      )}

      {/* Full deposit risk list */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '12px 14px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Shield size={10} /> ALL DEPOSITS BY RISK
        </div>
        {deposits.length === 0 ? (
          <div style={{
            padding: '16px 0', textAlign: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
          }}>No deposits reported.</div>
        ) : (
          [...deposits]
            .sort((a, b) => {
              const order = { EXTREME: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
              return (order[a.risk_level] ?? 3) - (order[b.risk_level] ?? 3);
            })
            .slice(0, 20)
            .map(d => <DepositRiskRow key={d.id} deposit={d} />)
        )}
      </div>
    </div>
  );
}