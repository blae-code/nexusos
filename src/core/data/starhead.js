const importMetaWithEnv = /** @type {{ env?: Record<string, string | undefined> }} */ (import.meta);
const env = importMetaWithEnv.env || {};

const STARHEAD_API_URL = env.VITE_STARHEAD_API_URL || 'https://api.starhead.io';
const STARHEAD_API_KEY = env.VITE_STARHEAD_API_KEY || '';
const REQUEST_TIMEOUT_MS = 10000;
const COMMODITY_TTL_MS = 5 * 60 * 1000;
const SHIP_TTL_MS = 5 * 60 * 1000;

let commodityCache = {
  expiresAt: 0,
  value: null,
};

const shipCache = new Map();
const rateLimitState = {
  resetAt: 0,
};

/**
 * Returns the epoch time after which requests may resume.
 *
 * @returns {number}
 */
function getRateLimitResetAt() {
  return Number(rateLimitState.resetAt || 0);
}

/**
 * Sets the current module-wide rate-limit reset time.
 *
 * @param {number} resetAt
 */
function setRateLimitResetAt(resetAt) {
  rateLimitState.resetAt = Math.max(0, Number(resetAt || 0));
}

/**
 * Returns true when a previous 429 told the client to back off.
 *
 * @returns {boolean}
 */
function isRateLimited() {
  return Date.now() < getRateLimitResetAt();
}

/**
 * Reads a numeric retry delay from common rate-limit headers.
 *
 * @param {Headers} headers
 * @returns {number}
 */
function getRetryDelayMs(headers) {
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  const resetAfter = headers.get('x-ratelimit-reset-after');
  if (resetAfter) {
    const seconds = Number(resetAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  return 60 * 1000;
}

/**
 * Waits for a bounded time interval.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Creates request headers for StarHead.
 *
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
  };

  if (STARHEAD_API_KEY) {
    headers.Authorization = `Bearer ${STARHEAD_API_KEY}`;
    headers['X-API-Key'] = STARHEAD_API_KEY;
  }

  return headers;
}

/**
 * Builds a StarHead URL from a relative path and search params.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {URL}
 */
function buildUrl(path, params = {}) {
  const url = new URL(path, STARHEAD_API_URL.endsWith('/') ? STARHEAD_API_URL : `${STARHEAD_API_URL}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

/**
 * Fetches JSON from StarHead while respecting 429 responses.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {Promise<any | null>}
 */
async function fetchJson(path, params = {}) {
  if (isRateLimited()) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, params), {
      method: 'GET',
      headers: buildHeaders(),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryDelayMs = getRetryDelayMs(response.headers);
      setRateLimitResetAt(Date.now() + retryDelayMs);
      await wait(Math.min(retryDelayMs, 1500));
      return null;
    }

    if (!response.ok) {
      return null;
    }

    setRateLimitResetAt(0);
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Returns the first array-like payload inside a StarHead response.
 *
 * @param {any} payload
 * @returns {any[]}
 */
function extractArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.commodities)) {
    return payload.commodities;
  }
  if (Array.isArray(payload?.prices)) {
    return payload.prices;
  }
  if (Array.isArray(payload?.ships)) {
    return payload.ships;
  }
  return [];
}

/**
 * Normalizes a commodity price row from StarHead into a single shape.
 *
 * @param {any} row
 * @returns {{commodity: string, location: string, system: string | null, terminal: string | null, buyPrice: number | null, sellPrice: number | null, updatedAt: string | null} | null}
 */
function normalizeCommodityRow(row) {
  const commodity = row?.commodity_name || row?.commodity || row?.name || row?.item_name;
  const location = row?.location_name || row?.location || row?.terminal_name || row?.station_name;
  if (!commodity || !location) {
    return null;
  }

  const buyPrice = Number(row?.buy_price ?? row?.buyPrice ?? row?.purchase_price ?? row?.price_buy);
  const sellPrice = Number(row?.sell_price ?? row?.sellPrice ?? row?.price_sell ?? row?.sale_price);

  return {
    commodity: String(commodity),
    location: String(location),
    system: row?.system_name || row?.system || null,
    terminal: row?.terminal_name || row?.terminal || null,
    buyPrice: Number.isFinite(buyPrice) ? buyPrice : null,
    sellPrice: Number.isFinite(sellPrice) ? sellPrice : null,
    updatedAt: row?.updated_at || row?.updatedAt || row?.timestamp || null,
  };
}

/**
 * Normalizes a ship payload from StarHead.
 *
 * @param {any} ship
 * @returns {{name: string, slug: string | null, scmSpeed: number | null, maxSpeed: number | null, cargoScu: number | null, crew: number | null, shields: number | null, hull: number | null, pitch: number | null, yaw: number | null, roll: number | null, quantumFuel: number | null, hydrogenFuel: number | null, hardpoints: any[] | null, loadout: any[] | null} | null}
 */
function normalizeShip(ship) {
  const name = ship?.name || ship?.ship_name || ship?.vehicle_name;
  if (!name) {
    return null;
  }

  const scmSpeed = Number(ship?.scm_speed ?? ship?.speed_scm ?? ship?.metrics?.scm);
  const maxSpeed = Number(ship?.max_speed ?? ship?.speed_max ?? ship?.metrics?.max);
  const cargoScu = Number(ship?.cargo_scu ?? ship?.cargo ?? ship?.metrics?.cargo);
  const crew = Number(ship?.crew ?? ship?.crew_size ?? ship?.metrics?.crew);
  const shields = Number(ship?.shields ?? ship?.shield_hp ?? ship?.metrics?.shields);
  const hull = Number(ship?.hull ?? ship?.hull_hp ?? ship?.metrics?.hull);
  const pitch = Number(ship?.pitch ?? ship?.rotation_pitch ?? ship?.maneuver?.pitch);
  const yaw = Number(ship?.yaw ?? ship?.rotation_yaw ?? ship?.maneuver?.yaw);
  const roll = Number(ship?.roll ?? ship?.rotation_roll ?? ship?.maneuver?.roll);
  const quantumFuel = Number(ship?.quantum_fuel ?? ship?.fuel_quantum ?? ship?.fuel?.quantum);
  const hydrogenFuel = Number(ship?.hydrogen_fuel ?? ship?.fuel_hydrogen ?? ship?.fuel?.hydrogen);

  return {
    name: String(name),
    slug: ship?.slug || ship?.id || null,
    scmSpeed: Number.isFinite(scmSpeed) ? scmSpeed : null,
    maxSpeed: Number.isFinite(maxSpeed) ? maxSpeed : null,
    cargoScu: Number.isFinite(cargoScu) ? cargoScu : null,
    crew: Number.isFinite(crew) ? crew : null,
    shields: Number.isFinite(shields) ? shields : null,
    hull: Number.isFinite(hull) ? hull : null,
    pitch: Number.isFinite(pitch) ? pitch : null,
    yaw: Number.isFinite(yaw) ? yaw : null,
    roll: Number.isFinite(roll) ? roll : null,
    quantumFuel: Number.isFinite(quantumFuel) ? quantumFuel : null,
    hydrogenFuel: Number.isFinite(hydrogenFuel) ? hydrogenFuel : null,
    hardpoints: Array.isArray(ship?.hardpoints) ? ship.hardpoints : Array.isArray(ship?.weapons) ? ship.weapons : null,
    loadout: Array.isArray(ship?.loadout) ? ship.loadout : Array.isArray(ship?.components) ? ship.components : null,
  };
}

/**
 * Returns commodity price rows from cache when still fresh.
 *
 * @returns {any[] | null}
 */
function getCachedCommodityPrices() {
  if (commodityCache.expiresAt > Date.now()) {
    return commodityCache.value;
  }
  return null;
}

/**
 * Caches the latest normalized commodity prices.
 *
 * @param {any[] | null} rows
 */
function setCachedCommodityPrices(rows) {
  commodityCache = {
    value: rows,
    expiresAt: Date.now() + COMMODITY_TTL_MS,
  };
}

/**
 * Returns a cached normalized ship record when still fresh.
 *
 * @param {string} shipName
 * @returns {any | null}
 */
function getCachedShip(shipName) {
  const cacheKey = shipName.trim().toLowerCase();
  const cached = shipCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  return null;
}

/**
 * Stores a normalized ship record in cache.
 *
 * @param {string} shipName
 * @param {any} value
 */
function setCachedShip(shipName, value) {
  shipCache.set(shipName.trim().toLowerCase(), {
    value,
    expiresAt: Date.now() + SHIP_TTL_MS,
  });
}

/**
 * Scores a candidate commodity name against a query.
 *
 * @param {string} query
 * @param {string} candidate
 * @returns {number}
 */
function fuzzyScore(query, candidate) {
  const q = query.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();

  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 80;
  if (c.includes(q)) return 60;

  let score = 0;
  let index = 0;
  for (const char of q) {
    index = c.indexOf(char, index);
    if (index === -1) return 0;
    score += 8;
    index += 1;
  }
  return score;
}

/**
 * Fetches all current commodity buy/sell prices across locations.
 * Results are cached in memory for 5 minutes.
 *
 * @returns {Promise<any[] | null>}
 */
export async function getCommodityPrices() {
  const cached = getCachedCommodityPrices();
  if (cached) {
    return cached;
  }

  const payload =
    await fetchJson('/commodities/prices')
    || await fetchJson('/commodity-prices')
    || await fetchJson('/commodities');

  const rows = extractArray(payload)
    .map(normalizeCommodityRow)
    .filter(Boolean);

  if (rows.length === 0) {
    return null;
  }

  setCachedCommodityPrices(rows);
  return rows;
}

/**
 * Returns optimized buy-low / sell-high routes for a commodity.
 * The current implementation returns best single-leg routes and respects `maxHops` by suppressing output when below 1.
 *
 * @param {string} commodity
 * @param {number} [maxHops=1]
 * @returns {Promise<any[] | null>}
 */
export async function getTradeRoutes(commodity, maxHops = 1) {
  if (!commodity || Number(maxHops) < 1) {
    return [];
  }

  const prices = await getCommodityPrices();
  if (!prices) {
    return null;
  }

  const target = String(commodity).trim().toLowerCase();
  const rows = prices.filter((row) => row.commodity.trim().toLowerCase() === target);
  if (rows.length === 0) {
    return [];
  }

  const buyRows = rows.filter((row) => Number.isFinite(row.buyPrice) && row.buyPrice > 0);
  const sellRows = rows.filter((row) => Number.isFinite(row.sellPrice) && row.sellPrice > 0);
  const routes = [];

  for (const buy of buyRows) {
    for (const sell of sellRows) {
      if (buy.location === sell.location && buy.terminal === sell.terminal) {
        continue;
      }

      const margin = Number(sell.sellPrice) - Number(buy.buyPrice);
      if (margin <= 0) {
        continue;
      }

      routes.push({
        commodity: buy.commodity,
        buyFrom: buy.location,
        buyTerminal: buy.terminal,
        buyPrice: buy.buyPrice,
        sellTo: sell.location,
        sellTerminal: sell.terminal,
        sellPrice: sell.sellPrice,
        estimatedMargin: margin,
        hops: 1,
        systemFrom: buy.system,
        systemTo: sell.system,
      });
    }
  }

  routes.sort((left, right) => right.estimatedMargin - left.estimatedMargin);
  return routes.slice(0, 50);
}

/**
 * Returns ship performance metrics for a named ship.
 *
 * @param {string} shipName
 * @returns {Promise<any | null>}
 */
export async function getShipStats(shipName) {
  if (!shipName) {
    return null;
  }

  const cached = getCachedShip(shipName);
  if (cached) {
    return cached;
  }

  const query = String(shipName).trim();
  const payload =
    await fetchJson('/ships/search', { q: query })
    || await fetchJson('/ships', { search: query })
    || await fetchJson(`/ships/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`);

  const candidates = extractArray(payload);
  const ship = (candidates.length > 0 ? candidates : [payload])
    .map(normalizeShip)
    .find(Boolean);

  if (!ship) {
    return null;
  }

  setCachedShip(shipName, ship);
  return ship;
}

/**
 * Performs a fuzzy search across commodity names using the current StarHead commodity dataset.
 *
 * @param {string} query
 * @returns {Promise<string[] | null>}
 */
export async function searchCommodity(query) {
  if (!query || !String(query).trim()) {
    return [];
  }

  const prices = await getCommodityPrices();
  if (!prices) {
    return null;
  }

  const uniqueNames = [...new Set(prices.map((row) => row.commodity))];
  return uniqueNames
    .map((name) => ({ name, score: fuzzyScore(String(query), name) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 12)
    .map((entry) => entry.name);
}
