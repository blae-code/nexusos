/**
 * marketIntelligence — Algorithmic market analysis engine.
 *
 * Actions:
 *   dashboard    — full dashboard data: trends, volatility, arbitrage, signals
 *   history      — price history for a single commodity
 *   snapshot     — store current PriceSnapshot data as PriceHistory records
 *
 * All analytics are purely algorithmic — no LLM calls, zero extra cost.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Math utilities ──────────────────────────────────────────────────────────

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += points[i]; sumXY += i * points[i]; sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const ssTot = points.reduce((s, y) => { const d = y - sumY / n; return s + d * d; }, 0);
  const ssRes = points.reduce((s, y, i) => { const d = y - (intercept + slope * i); return s + d * d; }, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function movingAverage(data, window) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function stdDev(data) {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length - 1));
}

function pctChange(oldVal, newVal) {
  if (!oldVal || oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

// ── Analysis engine ─────────────────────────────────────────────────────────

function analyzeCommodity(history) {
  if (!history || history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.snapped_at).getTime() - new Date(b.snapped_at).getTime());
  const sellPrices = sorted.map(h => h.sell_avg || 0).filter(p => p > 0);
  const buyPrices = sorted.map(h => h.buy_avg || 0).filter(p => p > 0);
  if (sellPrices.length < 2) return null;

  const latest = sorted[sorted.length - 1];
  const currentSell = latest.sell_avg || 0;
  const currentBuy = latest.buy_avg || 0;

  const ma7 = movingAverage(sellPrices, 7);
  const ma14 = movingAverage(sellPrices, 14);
  const regression = linearRegression(sellPrices);
  const slopePerDay = regression.slope;
  const trendStrength = Math.abs(regression.r2);
  const volatility = currentSell > 0 ? (stdDev(sellPrices) / currentSell) * 100 : 0;

  const change1d = sellPrices.length >= 2 ? pctChange(sellPrices[sellPrices.length - 2], sellPrices[sellPrices.length - 1]) : 0;
  const change7d = sellPrices.length >= 7 ? pctChange(sellPrices[sellPrices.length - 7], sellPrices[sellPrices.length - 1]) : 0;
  const change30d = sellPrices.length >= 14 ? pctChange(sellPrices[0], sellPrices[sellPrices.length - 1]) : 0;

  let signal = 'HOLD';
  const shortMA = ma7[ma7.length - 1] || 0;
  const longMA = ma14[ma14.length - 1] || 0;
  if (shortMA > longMA * 1.02 && slopePerDay > 0 && trendStrength > 0.3) {
    signal = slopePerDay > (currentSell * 0.02) ? 'STRONG_BUY' : 'BUY';
  } else if (shortMA < longMA * 0.98 && slopePerDay < 0 && trendStrength > 0.3) {
    signal = slopePerDay < -(currentSell * 0.02) ? 'STRONG_SELL' : 'SELL';
  }

  const predictions = [];
  for (let i = 1; i <= 7; i++) {
    predictions.push(Math.max(0, Math.round((regression.intercept + regression.slope * (sellPrices.length + i - 1)) * 100) / 100));
  }

  const momentumWindow = Math.min(5, ma7.length);
  const recentMA = ma7.slice(-momentumWindow);
  const momentum = recentMA.length >= 2 ? pctChange(recentMA[0], recentMA[recentMA.length - 1]) : 0;

  return {
    commodity_name: latest.commodity_name,
    current_sell: currentSell,
    current_buy: currentBuy,
    data_points: sellPrices.length,
    trend_direction: slopePerDay > 0 ? 'UP' : slopePerDay < 0 ? 'DOWN' : 'FLAT',
    trend_slope: Math.round(slopePerDay * 100) / 100,
    trend_strength: Math.round(trendStrength * 100),
    trend_r2: Math.round(regression.r2 * 100) / 100,
    change_1d: Math.round(change1d * 100) / 100,
    change_7d: Math.round(change7d * 100) / 100,
    change_30d: Math.round(change30d * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    volatility_rating: volatility > 15 ? 'HIGH' : volatility > 5 ? 'MEDIUM' : 'LOW',
    signal,
    momentum: Math.round(momentum * 100) / 100,
    ma7_current: Math.round((shortMA || 0) * 100) / 100,
    ma14_current: Math.round((longMA || 0) * 100) / 100,
    predictions,
    arbitrage: {
      buy_station: latest.best_buy_station || '',
      buy_price: latest.best_buy_price || 0,
      sell_station: latest.best_sell_station || '',
      sell_price: latest.best_sell_price || 0,
      profit_per_scu: (latest.best_sell_price || 0) - (latest.best_buy_price || 0),
      margin_pct: latest.margin_pct || 0,
    },
    sparkline: sellPrices.slice(-30).map(v => Math.round(v * 100) / 100),
    history: sorted.map(h => ({
      date: h.snapped_at,
      sell: h.sell_avg || 0,
      buy: h.buy_avg || 0,
      margin: h.margin_pct || 0,
    })),
  };
}

// ── Request handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body?.action ?? '';

    if (action === 'dashboard') {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const allHistory = await base44.asServiceRole.entities.PriceHistory.filter(
        { snapped_at: { $gte: cutoff } }, 'snapped_at', 5000
      );

      const byCommodity = {};
      for (const h of allHistory) {
        const key = (h.commodity_name || '').toLowerCase();
        if (!key) continue;
        if (!byCommodity[key]) byCommodity[key] = [];
        byCommodity[key].push(h);
      }

      const analyses = [];
      for (const [, history] of Object.entries(byCommodity)) {
        const result = analyzeCommodity(history);
        if (result) analyses.push(result);
      }
      analyses.sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));

      const arbitrage = analyses
        .filter(a => a.arbitrage.profit_per_scu > 0)
        .sort((a, b) => b.arbitrage.margin_pct - a.arbitrage.margin_pct)
        .slice(0, 10);
      const signals = analyses.filter(a => a.signal !== 'HOLD');
      const volatile = [...analyses].sort((a, b) => b.volatility - a.volatility).slice(0, 10);

      return Response.json({
        commodities: analyses,
        arbitrage,
        signals,
        volatile,
        summary: {
          total_commodities: analyses.length,
          trending_up: analyses.filter(a => a.trend_direction === 'UP').length,
          trending_down: analyses.filter(a => a.trend_direction === 'DOWN').length,
          high_volatility: analyses.filter(a => a.volatility_rating === 'HIGH').length,
          strong_signals: signals.length,
          best_arbitrage: arbitrage[0] || null,
          data_range_days: 30,
        },
      });
    }

    if (action === 'history') {
      const name = (body?.commodity_name || '').toLowerCase();
      if (!name) return Response.json({ error: 'commodity_name required' }, { status: 400 });
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const history = await base44.asServiceRole.entities.PriceHistory.filter(
        { commodity_name: name, snapped_at: { $gte: cutoff } }, 'snapped_at', 1000
      );
      return Response.json({ analysis: analyzeCommodity(history), history_count: history.length });
    }

    if (action === 'snapshot') {
      const snapshots = await base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 200);
      const now = new Date().toISOString();
      const records = snapshots
        .filter(s => s.commodity_name && ((s.curr_sell_avg || 0) > 0 || (s.curr_buy_avg || 0) > 0))
        .map(s => ({
          commodity_name: s.commodity_name.toLowerCase(),
          buy_avg: s.curr_buy_avg || 0,
          sell_avg: s.curr_sell_avg || 0,
          best_buy_price: s.best_buy_price || 0,
          best_sell_price: s.best_sell_price || 0,
          best_buy_station: s.best_buy_station || '',
          best_sell_station: s.best_sell_station || '',
          margin_pct: s.margin_pct || 0,
          snapped_at: now,
        }));

      if (records.length > 0) {
        await base44.asServiceRole.entities.PriceHistory.bulkCreate(records);
      }

      const cutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const oldRecords = await base44.asServiceRole.entities.PriceHistory.filter(
        { snapped_at: { $lt: cutoff } }, 'snapped_at', 500
      );
      for (const r of oldRecords) {
        await base44.asServiceRole.entities.PriceHistory.delete(r.id);
      }

      return Response.json({ stored: records.length, cleaned: oldRecords.length, snapped_at: now });
    }

    return Response.json({ error: 'Invalid action. Use: dashboard, history, snapshot' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[marketIntelligence] error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});