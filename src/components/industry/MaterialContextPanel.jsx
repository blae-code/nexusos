import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { DollarSign, Layers, Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function Section({ icon: Icon, label, children, color }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Icon size={10} style={{ color: color || 'var(--t3)' }} />
        <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function MiniCard({ label, value, color }) {
  return (
    <div style={{ padding: '6px 8px', background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, minWidth: 80 }}>
      <div style={{ fontSize: 7, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: color || 'var(--t0)', fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

export default function MaterialContextPanel({ materialName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materialName) return;
    setLoading(true);
    base44.functions.invoke('materialContext', { material_name: materialName })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [materialName]);

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t2)' }}><span /><span /><span /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 14, color: 'var(--t3)', fontSize: 10 }}>
        No cross-module data available for this material.
      </div>
    );
  }

  const { uex_price, volatility, refinery_orders, blueprints, cargo_logs } = data;
  const activeRefinery = refinery_orders.filter(o => o.status === 'ACTIVE' || o.status === 'READY');

  return (
    <div style={{
      padding: '12px 14px', background: 'var(--bg1)',
      borderTop: '0.5px solid var(--b1)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* UEX Market Prices */}
      {uex_price && (
        <Section icon={DollarSign} label="UEX MARKET PRICES" color="#C8A84B">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <MiniCard label="BUY AVG" value={`${fmt(uex_price.buy_avg)}`} color="#4AE830" />
            <MiniCard label="SELL AVG" value={`${fmt(uex_price.sell_avg)}`} color="#C8A84B" />
            <MiniCard label="BUY MIN" value={`${fmt(uex_price.buy_min)}`} />
            <MiniCard label="SELL MAX" value={`${fmt(uex_price.sell_max)}`} color="#C8A84B" />
            {uex_price.best_buy_terminal && (
              <MiniCard label="BEST BUY AT" value={uex_price.best_buy_terminal} color="var(--info)" />
            )}
            {uex_price.best_sell_terminal && (
              <MiniCard label="BEST SELL AT" value={uex_price.best_sell_terminal} color="#C8A84B" />
            )}
          </div>
        </Section>
      )}

      {/* Volatility */}
      {volatility && volatility.alert_type !== 'NONE' && (
        <Section icon={AlertTriangle} label="PRICE VOLATILITY" color={volatility.alert_type === 'SPIKE' ? '#4AE830' : '#C0392B'}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <MiniCard
              label="BUY Δ"
              value={`${volatility.buy_change_pct > 0 ? '+' : ''}${volatility.buy_change_pct}%`}
              color={volatility.buy_change_pct > 0 ? '#4AE830' : '#C0392B'}
            />
            <MiniCard
              label="SELL Δ"
              value={`${volatility.sell_change_pct > 0 ? '+' : ''}${volatility.sell_change_pct}%`}
              color={volatility.sell_change_pct > 0 ? '#4AE830' : '#C0392B'}
            />
            <MiniCard label="MARGIN" value={`${volatility.margin_pct}%`} color="var(--info)" />
            <MiniCard
              label="ALERT"
              value={volatility.alert_type}
              color={volatility.alert_type === 'SPIKE' ? '#4AE830' : '#C0392B'}
            />
          </div>
        </Section>
      )}

      {/* Active Refinery Orders */}
      {activeRefinery.length > 0 && (
        <Section icon={Clock} label={`ACTIVE REFINERY ORDERS (${activeRefinery.length})`} color="var(--warn)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeRefinery.map(o => {
              const isReady = o.status === 'READY';
              return (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                  background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, fontSize: 10,
                }}>
                  <span style={{ color: isReady ? 'var(--live)' : 'var(--warn)', fontWeight: 600, fontSize: 8 }}>{o.status}</span>
                  <span style={{ color: 'var(--t1)' }}>{o.quantity_scu} SCU</span>
                  <span style={{ color: 'var(--t2)' }}>{o.method || '—'}</span>
                  <span style={{ color: 'var(--t2)' }}>{o.station || '—'}</span>
                  {o.submitted_by_callsign && <span style={{ color: 'var(--t3)', marginLeft: 'auto' }}>{o.submitted_by_callsign}</span>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Blueprints Requiring This Material */}
      {blueprints.length > 0 && (
        <Section icon={Layers} label={`BLUEPRINTS REQUIRING THIS (${blueprints.length})`} color="var(--info)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blueprints.map(bp => (
              <div key={bp.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, fontSize: 10,
              }}>
                <span style={{ color: 'var(--t0)', fontWeight: 500 }}>{bp.item_name}</span>
                <span style={{ color: 'var(--t2)' }}>{bp.tier} · {bp.category}</span>
                <span style={{ color: 'var(--t2)' }}>Needs {bp.required_scu} SCU @ {bp.min_quality}%</span>
                {bp.is_priority && <span style={{ color: 'var(--warn)', fontSize: 8, fontWeight: 600 }}>PRIORITY</span>}
                {bp.owned_by_callsign && <span style={{ color: 'var(--t3)', marginLeft: 'auto' }}>{bp.owned_by_callsign}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent Cargo Logs */}
      {cargo_logs.length > 0 && (
        <Section icon={Package} label={`RECENT CARGO ACTIVITY (${cargo_logs.length})`} color="#4AE830">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {cargo_logs.slice(0, 5).map(l => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px',
                background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, fontSize: 10,
              }}>
                <span style={{
                  color: l.transaction_type === 'LOAD' ? 'var(--info)' : '#4AE830',
                  fontWeight: 600, fontSize: 8, minWidth: 40,
                }}>{l.transaction_type}</span>
                <span style={{ color: 'var(--t1)' }}>{l.quantity_scu} SCU</span>
                {l.origin_station && <span style={{ color: 'var(--t2)' }}>from {l.origin_station}</span>}
                {l.destination_station && <span style={{ color: 'var(--t2)' }}>→ {l.destination_station}</span>}
                {l.profit_loss != null && (
                  <span style={{ color: l.profit_loss >= 0 ? '#4AE830' : '#C0392B', fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {l.profit_loss >= 0 ? '+' : ''}{fmt(l.profit_loss)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state if nothing from cross-modules */}
      {!uex_price && activeRefinery.length === 0 && blueprints.length === 0 && cargo_logs.length === 0 && (
        <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', padding: 8 }}>
          No cross-module data found for this material.
        </div>
      )}
    </div>
  );
}