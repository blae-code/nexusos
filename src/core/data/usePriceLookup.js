/**
 * usePriceLookup — shared hook that builds a price lookup map from PriceSnapshot.
 * Returns { prices, loading } where prices is a Map keyed by lowercase commodity name.
 */
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';

export function usePriceLookup() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PriceSnapshot.list('-snapped_at', 300)
      .then(data => setSnapshots(data || []))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, []);

  const prices = useMemo(() => {
    const map = new Map();
    snapshots.forEach(p => {
      const key = (p.commodity_name || '').toLowerCase().trim();
      if (!key) return;
      // Keep the most recent snapshot per commodity (list is sorted by -snapped_at)
      if (!map.has(key)) {
        map.set(key, {
          buyAvg: p.curr_buy_avg || 0,
          sellAvg: p.curr_sell_avg || 0,
          bestBuy: p.best_buy_price || 0,
          bestSell: p.best_sell_price || 0,
          bestBuyStation: p.best_buy_station || '',
          bestSellStation: p.best_sell_station || '',
          marginPct: p.margin_pct || 0,
          alertType: p.alert_type || 'NONE',
          snappedAt: p.snapped_at,
        });
      }
    });
    return map;
  }, [snapshots]);

  return { prices, loading, snapshots };
}

/**
 * Compute craft cost analysis for a blueprint given a price lookup map.
 * Returns null if no blueprint or recipe.
 */
export function computeCraftAnalysis(bp, prices) {
  if (!bp) return null;
  const recipe = Array.isArray(bp.recipe_materials) ? bp.recipe_materials : [];
  if (recipe.length === 0) return null;

  let totalMaterialCost = 0;
  let allPriced = true;
  const breakdown = recipe.map(r => {
    const matName = (r.material_name || r.material || '').toLowerCase().trim();
    const priceData = prices.get(matName);
    const scuNeeded = r.quantity_scu || 0;
    const costPerScu = priceData ? (priceData.bestBuy || priceData.buyAvg || 0) : 0;
    const lineCost = costPerScu * scuNeeded;
    totalMaterialCost += lineCost;
    if (!priceData || costPerScu === 0) allPriced = false;
    return {
      name: r.material_name || r.material,
      scu: scuNeeded,
      pricePerScu: costPerScu,
      total: lineCost,
      hasPrice: !!(priceData && costPerScu > 0),
      station: priceData?.bestBuyStation || '',
      alertType: priceData?.alertType || 'NONE',
    };
  });

  const refineryCostEst = totalMaterialCost * 0.10;
  const totalCraftCost = totalMaterialCost + refineryCostEst;

  // Market value: use price snapshot sell price for the crafted item itself, fallback to blueprint estimate
  const itemKey = (bp.item_name || '').toLowerCase().trim();
  const itemPrice = prices.get(itemKey);
  const liveMarketValue = itemPrice ? (itemPrice.bestSell || itemPrice.sellAvg || 0) : 0;
  const marketValue = liveMarketValue > 0 ? liveMarketValue : (bp.aUEC_value_est || 0);
  const marketValueSource = liveMarketValue > 0 ? 'LIVE' : (bp.aUEC_value_est ? 'ESTIMATE' : 'NONE');

  const profit = marketValue - totalCraftCost;
  const margin = marketValue > 0 ? Math.round((profit / marketValue) * 100) : 0;
  const cheaperToBuy = profit < 0;

  return {
    breakdown,
    totalMaterialCost,
    refineryCostEst,
    totalCraftCost,
    marketValue,
    marketValueSource,
    profit,
    margin,
    cheaperToBuy,
    allPriced,
  };
}

export function fmtAuec(v) {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}