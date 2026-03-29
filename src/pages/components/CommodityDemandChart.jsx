import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';

function normalizeName(value) {
  return String(value || '').trim();
}

function formatShortDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function resolveSellAverage(snapshot) {
  return Number(
    snapshot.curr_sell_avg
    || snapshot.sell_avg
    || snapshot.sell_price_avg
    || snapshot.sell_price_uex
    || snapshot.sell_price
    || 0,
  ) || 0;
}

export default function CommodityDemandChart() {
  const [chartType, setChartType] = useState('demand');
  const [cargoLogs, setCargoLogs] = useState([]);
  const [priceSnapshots, setPriceSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, snapshots] = await Promise.all([
        base44.entities.CargoLog.list('-logged_at', 200).catch(() => []),
        base44.entities.PriceSnapshot.list('-snapped_at', 300).catch(() => []),
      ]);
      setCargoLogs(Array.isArray(logs) ? logs : []);
      setPriceSnapshots(Array.isArray(snapshots) ? snapshots : []);
    } finally {
      setLoading(false);
    }
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => {
    void refreshNow();
  }, [refreshNow]);

  useEffect(() => {
    const unsubscribers = [
      base44.entities.CargoLog.subscribe(scheduleRefresh),
      base44.entities.PriceSnapshot.subscribe(scheduleRefresh),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [scheduleRefresh]);

  const demandData = useMemo(() => {
    const grouped = new Map();
    cargoLogs.forEach((entry) => {
      const name = normalizeName(entry.commodity || entry.commodity_name);
      if (!name) {
        return;
      }

      const current = grouped.get(name) || {
        name,
        demand: 0,
        profit: 0,
        trades: 0,
      };

      current.demand += Number(entry.quantity_scu || 0) || 0;
      current.profit += Number(entry.profit_loss || 0) || 0;
      current.trades += 1;
      grouped.set(name, current);
    });

    return Array.from(grouped.values())
      .sort((left, right) => right.demand - left.demand)
      .slice(0, 8);
  }, [cargoLogs]);

  const priceSeries = useMemo(() => {
    const grouped = new Map();

    priceSnapshots.forEach((snapshot) => {
      const name = normalizeName(snapshot.commodity_name || snapshot.name);
      const snappedAt = snapshot.snapped_at || snapshot.created_at || snapshot.created_date;
      const sellAverage = resolveSellAverage(snapshot);

      if (!name || !snappedAt || sellAverage <= 0) {
        return;
      }

      const current = grouped.get(name) || [];
      current.push({
        snappedAt,
        value: sellAverage,
      });
      grouped.set(name, current);
    });

    const selectedSeries = Array.from(grouped.entries())
      .map(([name, points]) => [name, points.sort((left, right) => new Date(left.snappedAt).getTime() - new Date(right.snappedAt).getTime())])
      .filter(([, points]) => points.length >= 2)
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, 3);

    if (selectedSeries.length === 0) {
      return { data: [], keys: [] };
    }

    const allDates = Array.from(new Set(selectedSeries.flatMap(([, points]) => points.map((point) => point.snappedAt))))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())
      .slice(-8);

    const rows = allDates.map((snappedAt) => {
      const row = {
        label: formatShortDate(snappedAt),
        snappedAt,
      };

      selectedSeries.forEach(([name, points]) => {
        const match = points.find((point) => point.snappedAt === snappedAt);
        row[name] = match?.value ?? null;
      });

      return row;
    });

    return {
      data: rows,
      keys: selectedSeries.map(([name]) => name),
    };
  }, [priceSnapshots]);

  const colors = ['#C0392B', '#C8A84B', '#4A8C5C'];

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>
          COMMODITY TRENDS
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['demand', 'prices'].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                padding: '4px 8px',
                background: chartType === type ? 'var(--bg3)' : 'transparent',
                border: `0.5px solid ${chartType === type ? 'var(--b2)' : 'var(--b0)'}`,
                borderRadius: 3,
                color: chartType === type ? 'var(--t0)' : 'var(--t2)',
                fontSize: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {type === 'demand' ? 'Demand' : 'Prices'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
          <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : chartType === 'demand' ? (
        demandData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--t2)' }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--t2)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--b1)',
                    borderRadius: 4,
                  }}
                  labelStyle={{ color: 'var(--t0)' }}
                />
                <Bar dataKey="demand" fill="#C0392B" />
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {demandData.slice(0, 4).map((item) => (
                <div key={item.name} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 4 }}>
                  <div style={{ color: 'var(--t2)', fontSize: 8, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>
                    {Math.round(item.demand).toLocaleString()} SCU
                  </div>
                  <div style={{ color: item.profit >= 0 ? 'var(--live)' : 'var(--danger)', fontSize: 8, marginTop: 4 }}>
                    {item.profit >= 0 ? '+' : ''}{Math.round(item.profit).toLocaleString()} aUEC
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <BarChart3 size={28} style={{ color: 'var(--t3)', opacity: 0.25 }} />
            <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600 }}>No live demand history</div>
            <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
              Demand view populates from real cargo logs only. Record cargo movement to see volume and profit by commodity.
            </div>
          </div>
        )
      ) : priceSeries.keys.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={priceSeries.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--t2)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--t2)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 4,
                }}
                labelStyle={{ color: 'var(--t0)' }}
              />
              {priceSeries.keys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[index] || '#9DA1CD'} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {priceSeries.keys.map((key, index) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'var(--bg2)', borderRadius: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[index] || '#9DA1CD' }} />
                <span style={{ color: 'var(--t1)', fontSize: 9 }}>{key}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <AlertTriangle size={28} style={{ color: 'var(--t3)', opacity: 0.25 }} />
          <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600 }}>No live price snapshots</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
            Price mode only renders recorded snapshot history. Run the price sync pipeline before using this panel for market movement.
          </div>
        </div>
      )}
    </div>
  );
}
