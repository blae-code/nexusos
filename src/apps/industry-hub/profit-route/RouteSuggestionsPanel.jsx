/**
 * RouteSuggestionsPanel — shows top synced trade routes from TradeRoute entity.
 */
import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';

const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function RouteSuggestionsPanel({ routes }) {
  if (!routes || routes.length === 0) return null;

  return (
    <div style={{
      background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
      borderLeft: '2px solid #3498DB', borderRadius: 2, padding: 14,
    }}>
      <div style={{
        fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
        fontSize: 9, color: '#3498DB', letterSpacing: '0.22em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        <TrendingUp size={10} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        TOP ROUTES FROM MARKET DATA
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {routes.map((r, i) => (
          <div key={r.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            background: '#141410', borderRadius: 2, border: '0.5px solid rgba(200,170,100,0.06)',
          }}>
            {/* Rank */}
            <span style={{
              fontFamily: 'monospace', fontSize: 10, color: '#5A5850',
              width: 18, textAlign: 'center', flexShrink: 0,
            }}>#{i + 1}</span>

            {/* Commodity */}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: '#E8E4DC', fontWeight: 600, minWidth: 100,
            }}>{r.commodity_name}</span>

            {/* Route */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: '#9A9488', overflow: 'hidden',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.origin_terminal || '?'}
              </span>
              <ArrowRight size={10} style={{ color: '#C8A84B', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.destination_terminal || '?'}
              </span>
            </div>

            {/* Profit */}
            <span style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
              color: (r.profit_per_scu || 0) > 0 ? '#4A8C5C' : '#C0392B',
              minWidth: 70, textAlign: 'right',
            }}>
              {(r.profit_per_scu || 0).toFixed(2)}/SCU
            </span>

            {/* Margin */}
            <span style={{
              fontFamily: 'monospace', fontSize: 10, color: '#C8A84B',
              minWidth: 50, textAlign: 'right',
            }}>
              {(r.margin_pct || 0).toFixed(1)}%
            </span>

            {/* Risk */}
            {r.risk_level && (
              <span style={{
                fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 2,
                color: RISK_COLORS[r.risk_level] || '#5A5850',
                background: `${RISK_COLORS[r.risk_level] || '#5A5850'}18`,
                flexShrink: 0,
              }}>{r.risk_level}</span>
            )}

            {/* Jumps */}
            {r.jump_count > 0 && (
              <span style={{ fontSize: 9, color: '#5A5850', flexShrink: 0 }}>
                {r.jump_count}J
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 9, color: '#5A5850', marginTop: 8, textAlign: 'right' }}>
        Routes from UEX market sync · Prices may fluctuate
      </div>
    </div>
  );
}