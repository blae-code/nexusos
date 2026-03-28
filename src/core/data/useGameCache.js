/**
 * useGameCache — shared hook to load GameCacheItem, GameCacheCommodity, and GameCacheVehicle
 * into fast lookup structures for autocomplete across the app.
 */
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';

let _cache = null;
let _loading = false;
let _listeners = [];

function notify() { _listeners.forEach(fn => fn()); }

async function loadOnce() {
  if (_cache || _loading) return;
  _loading = true;
  const [items, commodities, vehicles] = await Promise.all([
    base44.entities.GameCacheItem.list('name', 500).catch(() => []),
    base44.entities.GameCacheCommodity.list('name', 500).catch(() => []),
    base44.entities.GameCacheVehicle.list('name', 500).catch(() => []),
  ]);
  _cache = { items: items || [], commodities: commodities || [], vehicles: vehicles || [] };
  _loading = false;
  notify();
}

export function useGameCache() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    _listeners.push(listener);
    loadOnce();
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);

  const loading = !_cache;

  const itemNames = useMemo(() => {
    if (!_cache) return [];
    return _cache.items.map(i => i.name).filter(Boolean).sort();
  }, [_cache?.items]);

  const commodityNames = useMemo(() => {
    if (!_cache) return [];
    return _cache.commodities.map(c => c.name).filter(Boolean).sort();
  }, [_cache?.commodities]);

  const vehicleNames = useMemo(() => {
    if (!_cache) return [];
    return _cache.vehicles.map(v => v.name).filter(Boolean).sort();
  }, [_cache?.vehicles]);

  // Unified name set for material/commodity/item autocomplete
  const allNames = useMemo(() => {
    const s = new Set();
    itemNames.forEach(n => s.add(n));
    commodityNames.forEach(n => s.add(n));
    return [...s].sort();
  }, [itemNames, commodityNames]);

  return {
    loading,
    items: _cache?.items || [],
    commodities: _cache?.commodities || [],
    vehicles: _cache?.vehicles || [],
    itemNames,
    commodityNames,
    vehicleNames,
    allNames,
  };
}