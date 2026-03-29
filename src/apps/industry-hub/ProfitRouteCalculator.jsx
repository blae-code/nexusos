/**
 * ProfitRouteCalculator — pick commodity + buy/sell locations,
 * auto-fills market prices, factors travel distance & volatility.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import RouteInputForm from './profit-route/RouteInputForm';
import RouteResultCard from './profit-route/RouteResultCard';
import RouteSuggestionsPanel from './profit-route/RouteSuggestionsPanel';
import { Calculator } from 'lucide-react';

export default function ProfitRouteCalculator() {
  const [commodities, setCommodities] = useState([]);
  const [tradeRoutes, setTradeRoutes] = useState([]);
  const [priceSnapshots, setPriceSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calcResult, setCalcResult] = useState(null);

  const load = useCallback(async () => {
    const [comms, routes, snaps] = await Promise.all([
      base44.entities.GameCacheCommodity.list('name', 300).catch(() => []),
      base44.entities.TradeRoute.list('-synced_at', 200).catch(() => []),
      base44.entities.PriceSnapshot.list('-snapped_at', 200).catch(() => []),
    ]);
    setCommodities(comms || []);
    setTradeRoutes(routes || []);
    setPriceSnapshots(snaps || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build lookup maps
  const commodityMap = useMemo(() => {
    const map = {};
    for (const c of commodities) map[(c.name || '').toUpperCase()] = c;
    return map;
  }, [commodities]);

  const snapshotMap = useMemo(() => {
    const map = {};
    for (const s of priceSnapshots) {
      const key = (s.commodity_name || '').toUpperCase();
      if (!map[key]) map[key] = s;
    }
    return map;
  }, [priceSnapshots]);

  const handleCalculate = (params) => {
    const { commodity, buyLocation, sellLocation, scu } = params;
    const key = (commodity || '').toUpperCase();
    const comm = commodityMap[key];
    const snap = snapshotMap[key];

    // Prices: prefer snapshot best prices, fall back to commodity cache
    const buyPrice = params.buyPriceOverride || snap?.best_buy_price || comm?.buy_price_uex || comm?.npc_avg_buy || 0;
    const sellPrice = params.sellPriceOverride || snap?.best_sell_price || comm?.sell_price_uex || comm?.npc_avg_sell || 0;
    const quantity = parseFloat(scu) || 1;

    // Volatility from snapshot or commodity trend
    const trend = comm?.price_trend || 'STABLE';
    const buyChange = snap?.buy_change_pct || 0;
    const sellChange = snap?.sell_change_pct || 0;
    const volatility = Math.abs(buyChange) + Math.abs(sellChange);
    const volatilityRating = volatility > 20 ? 'HIGH' : volatility > 8 ? 'MEDIUM' : 'LOW';

    // Travel distance — find matching route or estimate by system
    const matchingRoute = tradeRoutes.find(r =>
      (r.commodity_name || '').toUpperCase() === key &&
      ((r.origin_terminal || '').toUpperCase().includes((buyLocation || '').toUpperCase()) ||
       (r.destination_terminal || '').toUpperCase().includes((sellLocation || '').toUpperCase()))
    );
    const jumpCount = matchingRoute?.jump_count || estimateJumps(buyLocation, sellLocation);
    const riskLevel = matchingRoute?.risk_level || estimateRisk(buyLocation, sellLocation);

    // Core calculations
    const investment = quantity * buyPrice;
    const revenue = quantity * sellPrice;
    const profitPerScu = sellPrice - buyPrice;
    const totalProfit = quantity * profitPerScu;
    const marginPct = buyPrice > 0 ? ((profitPerScu / buyPrice) * 100) : 0;

    // Time estimate: ~5min per jump + 10min load/unload
    const travelMinutes = (jumpCount * 5) + 10;
    const profitPerMinute = travelMinutes > 0 ? totalProfit / travelMinutes : 0;

    // Risk-adjusted score: profit/min penalized by volatility & risk
    const riskMultiplier = riskLevel === 'HIGH' ? 0.6 : riskLevel === 'MEDIUM' ? 0.8 : 1.0;
    const volatilityMultiplier = volatilityRating === 'HIGH' ? 0.7 : volatilityRating === 'MEDIUM' ? 0.85 : 1.0;
    const routeScore = profitPerMinute * riskMultiplier * volatilityMultiplier;

    setCalcResult({
      commodity, buyLocation, sellLocation, quantity,
      buyPrice, sellPrice, profitPerScu, totalProfit,
      investment, revenue, marginPct,
      jumpCount, travelMinutes, riskLevel,
      trend, volatility, volatilityRating,
      buyChange, sellChange,
      profitPerMinute, routeScore,
      bestBuyStation: snap?.best_buy_station || comm?.best_buy_terminal,
      bestSellStation: snap?.best_sell_station || comm?.best_sell_terminal,
    });
  };

  // Top suggested routes from TradeRoute data
  const topRoutes = useMemo(() =>
    [...tradeRoutes]
      .filter(r => r.profit_per_scu > 0)
      .sort((a, b) => (b.route_score || b.margin_pct || 0) - (a.route_score || a.margin_pct || 0))
      .slice(0, 6),
    [tradeRoutes]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Calculator size={15} style={{ color: '#C8A84B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>PROFIT ROUTE CALCULATOR</span>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#5A5850', lineHeight: 1.5,
        }}>
          Select a commodity and buy/sell locations to calculate risk-adjusted profit margins
          with travel distance and market volatility factored in.
        </div>
      </div>

      {/* Input form */}
      <RouteInputForm
        commodities={commodities}
        commodityMap={commodityMap}
        snapshotMap={snapshotMap}
        onCalculate={handleCalculate}
      />

      {/* Result */}
      {calcResult && <RouteResultCard result={calcResult} />}

      {/* Suggested routes */}
      {topRoutes.length > 0 && (
        <RouteSuggestionsPanel routes={topRoutes} commodityMap={commodityMap} />
      )}
    </div>
  );
}

// Helpers — jump/risk estimation by location keywords
function estimateJumps(buy, sell) {
  const b = (buy || '').toUpperCase();
  const s = (sell || '').toUpperCase();
  const isPyro = (loc) => loc.includes('PYRO') || loc.includes('RUIN') || loc.includes('CHECKMATE');
  const isNyx = (loc) => loc.includes('NYX') || loc.includes('LEVSKI');
  const isStanton = (loc) => !isPyro(loc) && !isNyx(loc);
  if (isStanton(b) && isStanton(s)) return 1;
  if ((isStanton(b) && isPyro(s)) || (isPyro(b) && isStanton(s))) return 3;
  if ((isStanton(b) && isNyx(s)) || (isNyx(b) && isStanton(s))) return 4;
  if (isPyro(b) && isPyro(s)) return 1;
  return 2;
}

function estimateRisk(buy, sell) {
  const combined = ((buy || '') + (sell || '')).toUpperCase();
  if (combined.includes('PYRO') || combined.includes('RUIN') || combined.includes('GRIM HEX')) return 'HIGH';
  if (combined.includes('NYX') || combined.includes('LEVSKI') || combined.includes('CHECKMATE')) return 'MEDIUM';
  return 'LOW';
}