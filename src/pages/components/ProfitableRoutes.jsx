import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Route, TrendingUp } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

function formatProfit(value) {
  return `${Math.round(Number(value) || 0).toLocaleString()} aUEC`;
}

function formatVolume(value) {
  return `${Math.round(Number(value) || 0).toLocaleString()} SCU`;
}

export default function ProfitableRoutes() {
  const [cargoLogs, setCargoLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const records = await base44.entities.CargoLog.list('-logged_at', 200).catch(() => []);
      setCargoLogs(Array.isArray(records) ? records : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = base44.entities.CargoLog.subscribe(() => {
      load();
    });
    return () => unsubscribe?.();
  }, [load]);

  const routes = useMemo(() => {
    const grouped = new Map();

    cargoLogs.forEach((entry) => {
      const from = String(entry.origin_station || '').trim();
      const to = String(entry.destination_station || '').trim();
      if (!from || !to) {
        return;
      }

      const key = `${from}:::${to}`;
      const current = grouped.get(key) || {
        from,
        to,
        profit: 0,
        volume: 0,
        runs: 0,
        marginTotal: 0,
        lastLoggedAt: null,
      };

      current.profit += Number(entry.profit_loss || 0) || 0;
      current.volume += Number(entry.quantity_scu || 0) || 0;
      current.runs += 1;
      current.marginTotal += Number(entry.margin_pct || 0) || 0;
      current.lastLoggedAt = entry.logged_at || current.lastLoggedAt;
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .filter((route) => route.profit > 0)
      .map((route) => ({
        ...route,
        avgMargin: route.runs > 0 ? route.marginTotal / route.runs : 0,
      }))
      .sort((left, right) => right.profit - left.profit)
      .slice(0, 6);
  }, [cargoLogs]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={12} style={{ color: '#C0392B' }} />
          TOP PROFIT ROUTES (live cargo history)
        </div>
      </div>

      {routes.length === 0 ? (
        <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Route size={28} style={{ color: 'var(--t3)', opacity: 0.25 }} />
          <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600 }}>No profitable route history yet</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
            Log real cargo runs with origin, destination, and profit data to surface the best-performing lanes here.
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {routes.map((route, index) => (
            <div
              key={`${route.from}-${route.to}`}
              style={{
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--b0)',
                background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                display: 'grid',
                gridTemplateColumns: '2fr 1.1fr 1fr 0.9fr',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{route.from}</span>
                  <ArrowRight size={12} style={{ color: 'var(--t3)' }} />
                  <span>{route.to}</span>
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                  {formatVolume(route.volume)} across {route.runs} run{route.runs === 1 ? '' : 's'}
                </div>
              </div>

              <div>
                <div style={{ color: '#C0392B', fontSize: 12, fontWeight: 700 }}>
                  {formatProfit(route.profit)}
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9 }}>net profit</div>
              </div>

              <div>
                <div style={{ color: '#C8A84B', fontSize: 12, fontWeight: 700 }}>
                  {route.avgMargin.toFixed(1)}%
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9 }}>avg margin</div>
              </div>

              <div>
                <div style={{ color: 'var(--info)', fontSize: 10, fontWeight: 600 }}>
                  {new Date(route.lastLoggedAt || Date.now()).toLocaleDateString()}
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9 }}>last logged</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
