import { fetchUexData } from '../uexRetry/entry.ts';

const UEX_API_BASE = 'https://uexcorp.space/api/2.0';
const UEX_TIMEOUT_MS = 20_000;
const UEX_REQUEST_GAP_MS = 1_500;
const ENTITY_BATCH_SIZE = 20;
const ENTITY_BATCH_PAUSE_MS = 350;
const MARKET_SYNC_LEASE_MS = 20 * 60 * 1000;
const AUTO_COMMODITY_INTERVAL_MS = 12 * 60 * 60 * 1000;
export const MANUAL_SYNC_COOLDOWN_MS = 30 * 60 * 1000;

type GenericRecord = Record<string, any>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function toTime(value: string | undefined | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function norm(value: unknown) {
  return safeString(value).toLowerCase();
}

function isCompletedStatus(status: unknown) {
  return status === 'SUCCESS' || status === 'PARTIAL';
}

function latestSyncTime(record: GenericRecord | null | undefined) {
  return Math.max(
    toTime(safeString(record?.synced_at)),
    toTime(safeString(record?.started_at)),
    toTime(safeString(record?.created_date)),
  );
}

function average(values: number[]) {
  const filtered = values.filter((value) => value > 0);
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function minPositive(values: number[]) {
  const filtered = values.filter((value) => value > 0);
  return filtered.length > 0 ? Math.min(...filtered) : 0;
}

function maxPositive(values: number[]) {
  const filtered = values.filter((value) => value > 0);
  return filtered.length > 0 ? Math.max(...filtered) : 0;
}

function makeStationPriceKey(commodityWikiId: string, terminalName: string, systemName: string) {
  return `${commodityWikiId}::${norm(terminalName)}::${norm(systemName)}`;
}

function makeRouteKey(commodityName: string, originTerminal: string, destinationTerminal: string) {
  return `${norm(commodityName)}|${norm(originTerminal)}|${norm(destinationTerminal)}`;
}

function riskLevel(systemName: string) {
  const system = safeString(systemName).toUpperCase();
  if (system.includes('NYX')) return 'HIGH';
  if (system.includes('PYRO')) return 'HIGH';
  return 'LOW';
}

function createResponse({
  ok = true,
  syncType,
  status,
  skipReason = null,
  cooldownUntil = null,
  recordsSynced = 0,
  durationMs = 0,
  errors = [],
  meta = {},
}: {
  ok?: boolean;
  syncType: string;
  status: 'completed' | 'skipped' | 'failed';
  skipReason?: 'cooldown' | 'running' | 'auto_window' | null;
  cooldownUntil?: string | null;
  recordsSynced?: number;
  durationMs?: number;
  errors?: string[];
  meta?: GenericRecord;
}) {
  return {
    ok,
    sync_type: syncType,
    status,
    skip_reason: skipReason,
    cooldown_until: cooldownUntil,
    records_synced: recordsSynced,
    duration_ms: durationMs,
    errors,
    ...meta,
  };
}

async function listSyncRecords(base44: any, syncType: string) {
  const records = await base44.asServiceRole.entities.MarketSync
    .filter({ sync_type: syncType }, '-synced_at', 50)
    .catch(() => []);
  return Array.isArray(records) ? records : [];
}

export async function acquireUexSyncLease(
  base44: any,
  {
    syncType,
    triggerMode,
    triggeredBy,
    manualCooldownMs = MANUAL_SYNC_COOLDOWN_MS,
    autoMinIntervalMs = 0,
    leaseMs = MARKET_SYNC_LEASE_MS,
  }: {
    syncType: string;
    triggerMode: 'auto' | 'manual';
    triggeredBy?: string;
    manualCooldownMs?: number;
    autoMinIntervalMs?: number;
    leaseMs?: number;
  },
) {
  const nowMs = Date.now();
  const syncs = await listSyncRecords(base44, syncType);

  const running = syncs
    .filter((sync: GenericRecord) => sync.status === 'RUNNING')
    .sort((a: GenericRecord, b: GenericRecord) => latestSyncTime(b) - latestSyncTime(a));

  for (const stale of running) {
    const leaseExpiresAt = toTime(safeString(stale.lease_expires_at));
    if (leaseExpiresAt > nowMs) {
      return {
        ok: false,
        response: createResponse({
          ok: false,
          syncType,
          status: 'skipped',
          skipReason: 'running',
          cooldownUntil: safeString(stale.lease_expires_at) || null,
        }),
      };
    }

    await base44.asServiceRole.entities.MarketSync.update(stale.id, {
      status: 'FAILED',
      error_message: 'Lease expired before completion',
      synced_at: nowIso(),
      lease_expires_at: nowIso(),
    }).catch(() => null);
  }

  const completed = syncs
    .filter((sync: GenericRecord) => isCompletedStatus(sync.status))
    .sort((a: GenericRecord, b: GenericRecord) => latestSyncTime(b) - latestSyncTime(a));

  if (triggerMode === 'auto' && autoMinIntervalMs > 0) {
    const lastAuto = completed.find((sync: GenericRecord) => safeString(sync.triggered_by) === 'AUTO');
    const lastAutoAt = latestSyncTime(lastAuto);
    if (lastAutoAt > 0 && nowMs - lastAutoAt < autoMinIntervalMs) {
      return {
        ok: false,
        response: createResponse({
          ok: false,
          syncType,
          status: 'skipped',
          skipReason: 'auto_window',
          cooldownUntil: new Date(lastAutoAt + autoMinIntervalMs).toISOString(),
        }),
      };
    }
  }

  if (triggerMode === 'manual' && manualCooldownMs > 0) {
    const lastManual = completed.find((sync: GenericRecord) => safeString(sync.triggered_by) !== 'AUTO');
    const lastManualAt = latestSyncTime(lastManual);
    if (lastManualAt > 0 && nowMs - lastManualAt < manualCooldownMs) {
      return {
        ok: false,
        response: createResponse({
          ok: false,
          syncType,
          status: 'skipped',
          skipReason: 'cooldown',
          cooldownUntil: new Date(lastManualAt + manualCooldownMs).toISOString(),
        }),
      };
    }
  }

  const startedAt = nowIso();
  const lease = await base44.asServiceRole.entities.MarketSync.create({
    sync_type: syncType,
    status: 'RUNNING',
    started_at: startedAt,
    synced_at: startedAt,
    lease_expires_at: new Date(nowMs + leaseMs).toISOString(),
    triggered_by: triggerMode === 'auto' ? 'AUTO' : safeString(triggeredBy) || 'MANUAL',
  });

  return { ok: true, lease, startedAtMs: nowMs };
}

export async function finalizeUexSyncLease(
  base44: any,
  lease: GenericRecord,
  {
    status,
    recordsSynced = 0,
    durationMs = 0,
    errorMessage = '',
  }: {
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    recordsSynced?: number;
    durationMs?: number;
    errorMessage?: string;
  },
) {
  const completedAt = nowIso();
  await base44.asServiceRole.entities.MarketSync.update(lease.id, {
    status,
    records_synced: recordsSynced,
    duration_ms: durationMs,
    error_message: errorMessage ? errorMessage.slice(0, 300) : '',
    synced_at: completedAt,
    lease_expires_at: completedAt,
  });
}

function createUexFetcher() {
  const apiKey = safeString(Deno.env.get('UEX_API_KEY'));
  if (!apiKey) {
    throw new Error('UEX_API_KEY not configured');
  }

  let requestCount = 0;

  return async (path: string) => {
    if (requestCount > 0) {
      await sleep(UEX_REQUEST_GAP_MS);
    }
    requestCount += 1;
    return await fetchUexData(`${UEX_API_BASE}${path}`, {
      timeoutMs: UEX_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  };
}

async function runInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  {
    batchSize = ENTITY_BATCH_SIZE,
    pauseMs = ENTITY_BATCH_PAUSE_MS,
  }: {
    batchSize?: number;
    pauseMs?: number;
  } = {},
) {
  for (let index = 0; index < items.length; index += batchSize) {
    const chunk = items.slice(index, index + batchSize);
    await Promise.allSettled(chunk.map((item) => worker(item)));
    if (index + batchSize < items.length) {
      await sleep(pauseMs);
    }
  }
}

function buildCommodityRouteRecords(commodityIndex: Record<string, GenericRecord>, now: string) {
  const records: GenericRecord[] = [];

  Object.values(commodityIndex).forEach((commodity: GenericRecord) => {
    const buyOffers = [...(commodity.buyOffers || [])].sort((a, b) => a.price - b.price);
    const sellOffers = [...(commodity.sellOffers || [])].sort((a, b) => b.price - a.price);
    const bestBuy = buyOffers[0];
    const bestSell = sellOffers[0];
    if (!bestBuy || !bestSell) return;
    if (!bestBuy.terminal || !bestSell.terminal) return;
    if (norm(bestBuy.terminal) === norm(bestSell.terminal)) return;

    const profitPerScu = safeNumber(bestSell.price) - safeNumber(bestBuy.price);
    if (profitPerScu <= 0) return;

    const marginPct = safeNumber(bestBuy.price) > 0
      ? (profitPerScu / safeNumber(bestBuy.price)) * 100
      : 0;

    records.push({
      route_key: makeRouteKey(commodity.name, bestBuy.terminal, bestSell.terminal),
      commodity_name: commodity.name,
      origin_terminal: bestBuy.terminal,
      origin_system: bestBuy.system || 'STANTON',
      destination_terminal: bestSell.terminal,
      destination_system: bestSell.system || 'STANTON',
      buy_price: safeNumber(bestBuy.price),
      sell_price: safeNumber(bestSell.price),
      profit_per_scu: profitPerScu,
      margin_pct: Math.round(marginPct * 100) / 100,
      investment_required: 0,
      max_scu: 0,
      risk_level: riskLevel(bestSell.system || bestBuy.system),
      jump_count: 0,
      route_score: Math.round(profitPerScu * Math.max(marginPct, 1)),
      synced_at: now,
    });
  });

  return records;
}

async function upsertTradeRoutes(
  base44: any,
  routeRecords: GenericRecord[],
) {
  const existingRoutes = await base44.asServiceRole.entities.TradeRoute
    .list('-synced_at', 1500)
    .catch(() => []);

  const existingByKey: Record<string, GenericRecord> = {};
  (existingRoutes || []).forEach((route: GenericRecord) => {
    existingByKey[makeRouteKey(route.commodity_name, route.origin_terminal, route.destination_terminal)] = route;
  });

  let synced = 0;
  await runInBatches(routeRecords, async (record) => {
    const routeKey = record.route_key;
    const existing = existingByKey[routeKey];
    const payload = { ...record };
    delete payload.route_key;

    if (existing) {
      await base44.asServiceRole.entities.TradeRoute.update(existing.id, payload);
    } else {
      await base44.asServiceRole.entities.TradeRoute.create(payload);
    }
    synced += 1;
  });

  return { synced };
}

function buildCommodityIndex(
  commodities: GenericRecord[],
  averages: GenericRecord[],
  rawPrices: GenericRecord[],
  now: string,
) {
  const byName: Record<string, GenericRecord> = {};
  const byWikiId: Record<string, GenericRecord> = {};
  const averagesByName: Record<string, GenericRecord> = {};

  (commodities || []).forEach((commodity: GenericRecord) => {
    const name = safeString(commodity.name || commodity.commodity_name);
    if (!name) return;
    const wikiId = safeString(commodity.id || commodity.uuid || commodity.wiki_id || commodity.id_commodity);
    const record = {
      wikiId: wikiId || `uex-${norm(name)}`,
      name,
      type: safeString(commodity.commodity_type || commodity.type),
      tradeVolume: safeNumber(commodity.trade_volume),
    };
    byName[norm(name)] = record;
    if (wikiId) byWikiId[wikiId] = record;
  });

  (averages || []).forEach((entry: GenericRecord) => {
    const name = safeString(entry.name || entry.commodity_name);
    if (!name) return;
    averagesByName[norm(name)] = entry;
    const wikiId = safeString(entry.id_commodity || entry.id || entry.wiki_id);
    if (wikiId && !byWikiId[wikiId]) {
      byWikiId[wikiId] = {
        wikiId,
        name,
        type: safeString(entry.commodity_type || entry.type),
        tradeVolume: safeNumber(entry.trade_volume),
      };
    }
  });

  const stationRowsByKey: Record<string, GenericRecord> = {};
  const index: Record<string, GenericRecord> = {};

  const ensureCommodity = (seed: GenericRecord) => {
    const key = norm(seed.name);
    if (!key) return null;
    if (!index[key]) {
      index[key] = {
        wikiId: seed.wikiId || `uex-${key}`,
        name: seed.name,
        type: seed.type || '',
        tradeVolume: safeNumber(seed.tradeVolume),
        avgBuy: 0,
        avgSell: 0,
        buyMin: 0,
        sellMax: 0,
        caxScore: 0,
        buyOffers: [],
        sellOffers: [],
        stationRows: [],
      };
    }
    return index[key];
  };

  rawPrices.forEach((row: GenericRecord) => {
    const name = safeString(row.commodity_name || row.name);
    if (!name) return;

    const rowWikiId = safeString(row.id_commodity || row.id || row.wiki_id);
    const seed = byWikiId[rowWikiId] || byName[norm(name)] || {
      wikiId: rowWikiId || `uex-${norm(name)}`,
      name,
      type: safeString(row.commodity_type || row.type),
      tradeVolume: safeNumber(row.trade_volume),
    };
    const commodity = ensureCommodity(seed);
    if (!commodity) return;

    const terminalName = safeString(
      row.terminal_name ||
      row.terminal_buy_name ||
      row.terminal_sell_name ||
      row.station_name,
    );
    const stationName = safeString(row.station_name || terminalName);
    const systemName = safeString(
      row.system_name ||
      row.system_buy_name ||
      row.system_sell_name ||
      'STANTON',
    );
    const priceBuy = safeNumber(row.price_buy || row.buy_price);
    const priceSell = safeNumber(row.price_sell || row.sell_price);

    if (priceBuy > 0) {
      commodity.buyOffers.push({ price: priceBuy, terminal: terminalName || stationName, system: systemName });
    }
    if (priceSell > 0) {
      commodity.sellOffers.push({ price: priceSell, terminal: terminalName || stationName, system: systemName });
    }

    const stationPriceKey = makeStationPriceKey(commodity.wikiId, terminalName || stationName, systemName);
    const existingRow = stationRowsByKey[stationPriceKey] || {
      station_price_key: stationPriceKey,
      commodity_wiki_id: commodity.wikiId,
      commodity_name: commodity.name,
      terminal_name: terminalName || stationName,
      station_name: stationName || terminalName,
      system_name: systemName || 'STANTON',
      price_buy: 0,
      price_sell: 0,
      last_synced: now,
    };

    stationRowsByKey[stationPriceKey] = {
      ...existingRow,
      price_buy: priceBuy > 0 ? priceBuy : existingRow.price_buy,
      price_sell: priceSell > 0 ? priceSell : existingRow.price_sell,
      last_synced: now,
    };
  });

  Object.values(byName).forEach((seed) => {
    ensureCommodity(seed);
  });
  Object.values(averagesByName).forEach((entry: GenericRecord) => {
    const name = safeString(entry.name || entry.commodity_name);
    if (!name) return;
    ensureCommodity({
      wikiId: safeString(entry.id_commodity || entry.id || entry.wiki_id) || `uex-${norm(name)}`,
      name,
      type: safeString(entry.commodity_type || entry.type),
      tradeVolume: safeNumber(entry.trade_volume),
    });
  });

  Object.values(index).forEach((commodity: GenericRecord) => {
    const avg = averagesByName[norm(commodity.name)] || {};
    commodity.avgBuy = safeNumber(avg.price_buy_avg) || average(commodity.buyOffers.map((offer: GenericRecord) => safeNumber(offer.price)));
    commodity.avgSell = safeNumber(avg.price_sell_avg) || average(commodity.sellOffers.map((offer: GenericRecord) => safeNumber(offer.price)));
    commodity.buyMin = safeNumber(avg.price_buy_min) || minPositive(commodity.buyOffers.map((offer: GenericRecord) => safeNumber(offer.price)));
    commodity.sellMax = safeNumber(avg.price_sell_max) || maxPositive(commodity.sellOffers.map((offer: GenericRecord) => safeNumber(offer.price)));
    commodity.caxScore = safeNumber(avg.cax_score);
    commodity.type = commodity.type || safeString(avg.commodity_type || avg.type);
    commodity.tradeVolume = commodity.tradeVolume || safeNumber(avg.trade_volume);
    commodity.stationRows = Object.values(stationRowsByKey).filter((row: GenericRecord) => norm(row.commodity_name) === norm(commodity.name));
  });

  return { commodityIndex: index, stationRows: Object.values(stationRowsByKey) };
}

export async function runTradeRouteSync(
  base44: any,
  {
    triggerMode = 'manual',
    triggeredBy = 'MANUAL',
    stationRows = null,
  }: {
    triggerMode?: 'auto' | 'manual';
    triggeredBy?: string;
    stationRows?: GenericRecord[] | null;
  } = {},
) {
  const leaseResult = await acquireUexSyncLease(base44, {
    syncType: 'TRADE_ROUTES',
    triggerMode,
    triggeredBy,
    manualCooldownMs: 0,
    autoMinIntervalMs: 0,
  });

  if (!leaseResult.ok) {
    return leaseResult.response;
  }

  const { lease, startedAtMs } = leaseResult;

  try {
    const rows = Array.isArray(stationRows)
      ? stationRows
      : await base44.asServiceRole.entities.CommodityStationPrice.list('-last_synced', 5000).catch(() => []);

    const commodityIndex: Record<string, GenericRecord> = {};
    (rows || []).forEach((row: GenericRecord) => {
      const name = safeString(row.commodity_name);
      if (!name) return;
      const key = norm(name);
      if (!commodityIndex[key]) {
        commodityIndex[key] = {
          name,
          buyOffers: [],
          sellOffers: [],
        };
      }
      if (safeNumber(row.price_buy) > 0) {
        commodityIndex[key].buyOffers.push({
          price: safeNumber(row.price_buy),
          terminal: safeString(row.terminal_name || row.station_name),
          system: safeString(row.system_name || 'STANTON'),
        });
      }
      if (safeNumber(row.price_sell) > 0) {
        commodityIndex[key].sellOffers.push({
          price: safeNumber(row.price_sell),
          terminal: safeString(row.terminal_name || row.station_name),
          system: safeString(row.system_name || 'STANTON'),
        });
      }
    });

    const routeRecords = buildCommodityRouteRecords(commodityIndex, nowIso());
    const result = await upsertTradeRoutes(base44, routeRecords);
    const durationMs = Date.now() - startedAtMs;

    await finalizeUexSyncLease(base44, lease, {
      status: 'SUCCESS',
      recordsSynced: result.synced,
      durationMs,
    });

    return createResponse({
      syncType: 'TRADE_ROUTES',
      status: 'completed',
      recordsSynced: result.synced,
      durationMs,
      meta: { routes_synced: result.synced },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startedAtMs;
    await finalizeUexSyncLease(base44, lease, {
      status: 'FAILED',
      durationMs,
      errorMessage: message,
    });
    return createResponse({
      ok: false,
      syncType: 'TRADE_ROUTES',
      status: 'failed',
      durationMs,
      errors: [message],
    });
  }
}

export async function runCommodityMarketSync(
  base44: any,
  {
    triggerMode = 'manual',
    triggeredBy = 'MANUAL',
  }: {
    triggerMode?: 'auto' | 'manual';
    triggeredBy?: string;
  } = {},
) {
  const leaseResult = await acquireUexSyncLease(base44, {
    syncType: 'COMMODITY_PRICES',
    triggerMode,
    triggeredBy,
    manualCooldownMs: MANUAL_SYNC_COOLDOWN_MS,
    autoMinIntervalMs: AUTO_COMMODITY_INTERVAL_MS,
  });

  if (!leaseResult.ok) {
    return leaseResult.response;
  }

  const { lease, startedAtMs } = leaseResult;
  const errors: string[] = [];

  try {
    const fetchCollection = createUexFetcher();
    let commodities: GenericRecord[] = [];
    let averages: GenericRecord[] = [];

    try {
      commodities = await fetchCollection('/commodities');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`commodities: ${message}`);
    }

    try {
      averages = await fetchCollection('/commodities_averages');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`averages: ${message}`);
    }

    const rawPrices = await fetchCollection('/commodities_prices_all');
    const now = nowIso();

    const [
      existingCommodities,
      existingStationRows,
      existingSnapshots,
      existingAlerts,
    ] = await Promise.all([
      base44.asServiceRole.entities.GameCacheCommodity.list('name', 2000).catch(() => []),
      base44.asServiceRole.entities.CommodityStationPrice.list('-last_synced', 5000).catch(() => []),
      base44.asServiceRole.entities.PriceSnapshot.list('-snapped_at', 2000).catch(() => []),
      base44.asServiceRole.entities.PriceAlert.filter({ is_active: true }).catch(() => []),
    ]);

    const { commodityIndex, stationRows } = buildCommodityIndex(commodities, averages, rawPrices, now);

    const existingCommodityByWikiId: Record<string, GenericRecord> = {};
    const existingCommodityByName: Record<string, GenericRecord> = {};
    (existingCommodities || []).forEach((record: GenericRecord) => {
      if (safeString(record.wiki_id)) existingCommodityByWikiId[safeString(record.wiki_id)] = record;
      if (safeString(record.name)) existingCommodityByName[norm(record.name)] = record;
    });

    const existingStationByKey: Record<string, GenericRecord> = {};
    (existingStationRows || []).forEach((record: GenericRecord) => {
      existingStationByKey[safeString(record.station_price_key)] = record;
    });

    const previousSnapshotsByName: Record<string, GenericRecord> = {};
    (existingSnapshots || []).forEach((record: GenericRecord) => {
      const key = norm(record.commodity_name);
      if (key && !previousSnapshotsByName[key]) previousSnapshotsByName[key] = record;
    });

    const alertsByName: Record<string, GenericRecord[]> = {};
    (existingAlerts || []).forEach((alert: GenericRecord) => {
      const key = norm(alert.commodity_name);
      if (!key) return;
      if (!alertsByName[key]) alertsByName[key] = [];
      alertsByName[key].push(alert);
    });

    let commoditiesSynced = 0;
    let snapshotsSynced = 0;
    let alertsTriggered = 0;
    let stationPricesSynced = 0;

    const commodityRecords = Object.values(commodityIndex).map((commodity: GenericRecord) => {
      const bestBuy = [...commodity.buyOffers].sort((a: GenericRecord, b: GenericRecord) => a.price - b.price)[0] || {};
      const bestSell = [...commodity.sellOffers].sort((a: GenericRecord, b: GenericRecord) => b.price - a.price)[0] || {};
      const buyPrice = safeNumber(bestBuy.price) || commodity.buyMin || commodity.avgBuy;
      const sellPrice = safeNumber(bestSell.price) || commodity.sellMax || commodity.avgSell;
      const margin = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
      const previousSnapshot = previousSnapshotsByName[norm(commodity.name)];
      const prevBuy = safeNumber(previousSnapshot?.curr_buy_avg) || commodity.avgBuy;
      const prevSell = safeNumber(previousSnapshot?.curr_sell_avg) || commodity.avgSell;
      const buyChange = prevBuy > 0 ? ((commodity.avgBuy - prevBuy) / prevBuy) * 100 : 0;
      const sellChange = prevSell > 0 ? ((commodity.avgSell - prevSell) / prevSell) * 100 : 0;

      let trend = 'STABLE';
      if (sellChange > 2) trend = 'UP';
      else if (sellChange < -2) trend = 'DOWN';

      return {
        commodity,
        commodityData: {
          wiki_id: commodity.wikiId,
          name: commodity.name,
          type: commodity.type || '',
          buy_price_uex: buyPrice,
          sell_price_uex: sellPrice,
          buy_min_uex: commodity.buyMin,
          sell_max_uex: commodity.sellMax,
          best_buy_terminal: safeString(bestBuy.terminal),
          best_sell_terminal: safeString(bestSell.terminal),
          best_buy_system: safeString(bestBuy.system),
          best_sell_system: safeString(bestSell.system),
          margin_pct: Math.round(margin * 100) / 100,
          price_trend: trend,
          npc_avg_buy: commodity.avgBuy,
          npc_avg_sell: commodity.avgSell,
          cax_score: commodity.caxScore || 0,
          trade_volume_uex: commodity.tradeVolume || 0,
          price_synced_at: now,
          last_synced: now,
        },
        snapshotData: {
          commodity_name: commodity.name,
          prev_buy_avg: prevBuy,
          prev_sell_avg: prevSell,
          curr_buy_avg: commodity.avgBuy,
          curr_sell_avg: commodity.avgSell,
          buy_change_pct: Math.round(buyChange * 100) / 100,
          sell_change_pct: Math.round(sellChange * 100) / 100,
          alert_triggered: false,
          alert_type: 'NONE',
          best_sell_station: safeString(bestSell.terminal),
          best_sell_price: sellPrice,
          best_buy_station: safeString(bestBuy.terminal),
          best_buy_price: buyPrice,
          margin_pct: Math.round(margin * 100) / 100,
          snapped_at: now,
        },
        buyPrice,
        sellPrice,
        margin,
      };
    });

    await runInBatches(commodityRecords, async (item) => {
      const existing = existingCommodityByWikiId[item.commodity.wikiId] || existingCommodityByName[norm(item.commodity.name)];
      if (existing) {
        await base44.asServiceRole.entities.GameCacheCommodity.update(existing.id, item.commodityData);
      } else {
        await base44.asServiceRole.entities.GameCacheCommodity.create(item.commodityData);
      }
      commoditiesSynced += 1;
    });

    await runInBatches(commodityRecords, async (item) => {
      const key = norm(item.commodity.name);
      const alerts = alertsByName[key] || [];
      let alertTriggered = false;

      for (const alert of alerts) {
        let triggered = false;
        switch (alert.alert_type) {
          case 'SELL_ABOVE':
            triggered = item.sellPrice > safeNumber(alert.threshold_aUEC);
            break;
          case 'SELL_BELOW':
            triggered = item.sellPrice < safeNumber(alert.threshold_aUEC);
            break;
          case 'BUY_ABOVE':
            triggered = item.buyPrice > safeNumber(alert.threshold_aUEC);
            break;
          case 'BUY_BELOW':
            triggered = item.buyPrice < safeNumber(alert.threshold_aUEC);
            break;
          case 'MARGIN_ABOVE':
            triggered = item.margin > safeNumber(alert.threshold_aUEC);
            break;
        }

        if (!triggered) continue;
        alertTriggered = true;
        alertsTriggered += 1;
        await base44.asServiceRole.entities.PriceAlert.update(alert.id, {
          last_triggered_at: now,
          trigger_count: safeNumber(alert.trigger_count) + 1,
        });
      }

      const snapshotPayload = {
        ...item.snapshotData,
        alert_triggered: alertTriggered,
        alert_type: alertTriggered
          ? (safeNumber(item.snapshotData.sell_change_pct) >= 0 ? 'SPIKE' : 'DROP')
          : 'NONE',
      };
      const existing = previousSnapshotsByName[key];
      if (existing) {
        await base44.asServiceRole.entities.PriceSnapshot.update(existing.id, snapshotPayload);
      } else if (
        safeNumber(snapshotPayload.curr_buy_avg) > 0 ||
        safeNumber(snapshotPayload.curr_sell_avg) > 0 ||
        safeNumber(snapshotPayload.best_buy_price) > 0 ||
        safeNumber(snapshotPayload.best_sell_price) > 0
      ) {
        await base44.asServiceRole.entities.PriceSnapshot.create(snapshotPayload);
      }
      snapshotsSynced += 1;
    });

    await runInBatches(stationRows, async (stationRow: GenericRecord) => {
      const existing = existingStationByKey[stationRow.station_price_key];
      if (existing) {
        await base44.asServiceRole.entities.CommodityStationPrice.update(existing.id, stationRow);
      } else {
        await base44.asServiceRole.entities.CommodityStationPrice.create(stationRow);
      }
      stationPricesSynced += 1;
    });

    const seenStationKeys = new Set(stationRows.map((row: GenericRecord) => row.station_price_key));
    const staleStationRows = (existingStationRows || []).filter(
      (record: GenericRecord) => !seenStationKeys.has(safeString(record.station_price_key)),
    );
    await runInBatches(staleStationRows, async (record: GenericRecord) => {
      await base44.asServiceRole.entities.CommodityStationPrice.delete(record.id);
    });

    const routeResult = await runTradeRouteSync(base44, {
      triggerMode,
      triggeredBy,
      stationRows,
    });

    const durationMs = Date.now() - startedAtMs;
    const completedStatus = errors.length > 0 ? 'PARTIAL' : 'SUCCESS';
    const recordsSynced = commoditiesSynced + snapshotsSynced + stationPricesSynced + safeNumber(routeResult.routes_synced);

    await finalizeUexSyncLease(base44, lease, {
      status: completedStatus,
      recordsSynced,
      durationMs,
      errorMessage: errors.join(' | '),
    });

    return createResponse({
      syncType: 'COMMODITY_PRICES',
      status: 'completed',
      recordsSynced,
      durationMs,
      errors,
      meta: {
        commodities_synced: commoditiesSynced,
        snapshots_synced: snapshotsSynced,
        station_prices_synced: stationPricesSynced,
        routes_synced: safeNumber(routeResult.routes_synced),
        alerts_triggered: alertsTriggered,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startedAtMs;
    await finalizeUexSyncLease(base44, lease, {
      status: 'FAILED',
      durationMs,
      errorMessage: message,
    });
    return createResponse({
      ok: false,
      syncType: 'COMMODITY_PRICES',
      status: 'failed',
      durationMs,
      errors: [message],
    });
  }
}

export async function runMarketplaceSync(
  base44: any,
  {
    triggerMode = 'manual',
    triggeredBy = 'MANUAL',
  }: {
    triggerMode?: 'auto' | 'manual';
    triggeredBy?: string;
  } = {},
) {
  const leaseResult = await acquireUexSyncLease(base44, {
    syncType: 'MARKETPLACE_LISTINGS',
    triggerMode,
    triggeredBy,
    manualCooldownMs: MANUAL_SYNC_COOLDOWN_MS,
    autoMinIntervalMs: 0,
  });

  if (!leaseResult.ok) {
    return leaseResult.response;
  }

  const { lease, startedAtMs } = leaseResult;

  try {
    const fetchCollection = createUexFetcher();
    const listings = await fetchCollection('/marketplace_listings');
    const [members, existingListings] = await Promise.all([
      base44.asServiceRole.entities.NexusUser.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.UEXListing.filter({ is_active: true }, '-synced_at', 500).catch(() => []),
    ]);

    const memberHandles = new Set<string>();
    const memberCallsigns = new Set<string>();
    (members || []).forEach((member: GenericRecord) => {
      if (safeString(member.uex_handle)) memberHandles.add(norm(member.uex_handle));
      if (safeString(member.callsign)) memberCallsigns.add(norm(member.callsign));
    });

    const existingByListingId: Record<string, GenericRecord> = {};
    (existingListings || []).forEach((listing: GenericRecord) => {
      if (safeString(listing.uex_listing_id)) existingByListingId[safeString(listing.uex_listing_id)] = listing;
    });

    const now = nowIso();
    let created = 0;
    let updated = 0;
    let removed = 0;
    let orgMemberListings = 0;
    const seenIds = new Set<string>();

    await runInBatches(listings || [], async (listing: GenericRecord) => {
      const listingId = safeString(listing.id_listing || listing.id);
      if (!listingId) return;
      seenIds.add(listingId);

      const sellerHandle = safeString(listing.seller_handle || listing.username);
      const isOrgMember = memberHandles.has(norm(sellerHandle)) || memberCallsigns.has(norm(sellerHandle));
      if (isOrgMember) orgMemberListings += 1;

      const payload = {
        uex_listing_id: listingId,
        listing_type: safeString(listing.listing_type || 'WTS').toUpperCase(),
        item_name: safeString(listing.item_name || listing.name),
        item_category: safeString(listing.item_category || listing.category),
        price_aUEC: safeNumber(listing.price || listing.price_aUEC),
        quantity: safeNumber(listing.quantity) || 1,
        quality_score: safeNumber(listing.quality),
        condition: safeString(listing.condition),
        seller_handle: sellerHandle,
        seller_org: safeString(listing.seller_org || listing.org_tag),
        system_location: safeString(listing.system || listing.system_location),
        description: safeString(listing.description),
        listing_url: safeString(listing.url || listing.listing_url) || `https://uexcorp.space/marketplace/${listingId}`,
        is_org_member: isOrgMember,
        is_active: true,
        synced_at: now,
        expires_at: safeString(listing.expires_at),
      };

      const existing = existingByListingId[listingId];
      if (existing) {
        await base44.asServiceRole.entities.UEXListing.update(existing.id, payload);
        updated += 1;
      } else {
        await base44.asServiceRole.entities.UEXListing.create(payload);
        created += 1;
      }
    });

    const staleListings = (existingListings || []).filter(
      (listing: GenericRecord) => !seenIds.has(safeString(listing.uex_listing_id)),
    );
    await runInBatches(staleListings, async (listing: GenericRecord) => {
      await base44.asServiceRole.entities.UEXListing.update(listing.id, { is_active: false });
      removed += 1;
    });

    const durationMs = Date.now() - startedAtMs;
    const recordsSynced = created + updated;
    await finalizeUexSyncLease(base44, lease, {
      status: 'SUCCESS',
      recordsSynced,
      durationMs,
    });

    return createResponse({
      syncType: 'MARKETPLACE_LISTINGS',
      status: 'completed',
      recordsSynced,
      durationMs,
      meta: {
        total: Array.isArray(listings) ? listings.length : 0,
        new: created,
        updated,
        removed,
        org_member_listings: orgMemberListings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startedAtMs;
    await finalizeUexSyncLease(base44, lease, {
      status: 'FAILED',
      durationMs,
      errorMessage: message,
    });
    return createResponse({
      ok: false,
      syncType: 'MARKETPLACE_LISTINGS',
      status: 'failed',
      durationMs,
      errors: [message],
    });
  }
}
