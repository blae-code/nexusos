const importMetaWithEnv = /** @type {{ env?: Record<string, string | undefined> }} */ (import.meta);
const env = importMetaWithEnv.env || {};

const UEX_API_URL = env.VITE_UEX_API_URL || 'https://api.uexcorp.space/2.0';
const UEX_API_KEY = env.VITE_UEX_API_KEY || '';
const REQUEST_TIMEOUT_MS = 10000;
const PRICE_TTL_MS = 5 * 60 * 1000;

let priceCache = {
  expiresAt: 0,
  value: null,
};

const rateLimitState = {
  resetAt: 0,
};

/**
 * Reads the current rate-limit reset time.
 *
 * @returns {number}
 */
function getRateLimitResetAt() {
  return Number(rateLimitState.resetAt || 0);
}

/**
 * Stores the current rate-limit reset time.
 *
 * @param {number} resetAt
 */
function setRateLimitResetAt(resetAt) {
  rateLimitState.resetAt = Math.max(0, Number(resetAt || 0));
}

/**
 * Returns true while the UEX client is waiting out a rate limit.
 *
 * @returns {boolean}
 */
function isRateLimited() {
  return Date.now() < getRateLimitResetAt();
}

/**
 * Creates standard request headers for UEX.
 *
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
  };

  if (UEX_API_KEY) {
    headers.Authorization = `Bearer ${UEX_API_KEY}`;
    headers['X-API-Key'] = UEX_API_KEY;
  }

  return headers;
}

/**
 * Creates a URL for the UEX API.
 *
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {URL}
 */
function buildUrl(path, params = {}) {
  const url = new URL(path, UEX_API_URL.endsWith('/') ? UEX_API_URL : `${UEX_API_URL}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

/**
 * Derives a backoff interval from response headers.
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
 * Waits for a bounded delay.
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
 * Performs a JSON request against UEX and fails closed with null.
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
 * Extracts the first array-like payload from a UEX response.
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
  if (Array.isArray(payload?.prices)) {
    return payload.prices;
  }
  if (Array.isArray(payload?.history)) {
    return payload.history;
  }
  return [];
}

/**
 * Normalizes a UEX price row.
 *
 * @param {any} row
 * @returns {{commodity: string, terminal: string, system: string | null, buyPrice: number | null, sellPrice: number | null, updatedAt: string | null} | null}
 */
function normalizePriceRow(row) {
  const commodity = row?.commodity_name || row?.commodity || row?.name || row?.item_name;
  const terminal = row?.terminal_name || row?.terminal || row?.location_name || row?.location;
  if (!commodity || !terminal) {
    return null;
  }

  const buyPrice = Number(row?.buy_price ?? row?.price_buy ?? row?.buyPrice);
  const sellPrice = Number(row?.sell_price ?? row?.price_sell ?? row?.sellPrice);

  return {
    commodity: String(commodity),
    terminal: String(terminal),
    system: row?.system_name || row?.system || null,
    buyPrice: Number.isFinite(buyPrice) ? buyPrice : null,
    sellPrice: Number.isFinite(sellPrice) ? sellPrice : null,
    updatedAt: row?.updated_at || row?.updatedAt || row?.timestamp || null,
  };
}

/**
 * Returns cached price data when still fresh.
 *
 * @returns {any[] | null}
 */
function getCachedPrices() {
  if (priceCache.expiresAt > Date.now()) {
    return priceCache.value;
  }
  return null;
}

/**
 * Stores normalized UEX prices in cache.
 *
 * @param {any[] | null} rows
 */
function setCachedPrices(rows) {
  priceCache = {
    value: rows,
    expiresAt: Date.now() + PRICE_TTL_MS,
  };
}

/**
 * Fetches UEX commodity price data for use as a secondary source.
 *
 * @returns {Promise<any[] | null>}
 */
export async function getCommodityPrices() {
  const cached = getCachedPrices();
  if (cached) {
    return cached;
  }

  const payload =
    await fetchJson('/commodities/prices')
    || await fetchJson('/commodities')
    || await fetchJson('/market/prices');

  const rows = extractArray(payload)
    .map(normalizePriceRow)
    .filter(Boolean);

  if (rows.length === 0) {
    return null;
  }

  setCachedPrices(rows);
  return rows;
}

/**
 * Returns all known prices for a specific trading terminal.
 *
 * @param {string} terminal
 * @returns {Promise<any[] | null>}
 */
export async function getTerminalPrices(terminal) {
  if (!terminal) {
    return [];
  }

  const terminalQuery = String(terminal).trim().toLowerCase();
  const directPayload =
    await fetchJson('/terminals/prices', { terminal: terminalQuery })
    || await fetchJson(`/terminals/${encodeURIComponent(terminalQuery)}/prices`);

  const directRows = extractArray(directPayload)
    .map(normalizePriceRow)
    .filter(Boolean);

  if (directRows.length > 0) {
    return directRows;
  }

  const prices = await getCommodityPrices();
  if (!prices) {
    return null;
  }

  return prices.filter((row) => row.terminal.trim().toLowerCase().includes(terminalQuery));
}

/**
 * Returns historical price trend data for a commodity over the requested number of days.
 *
 * @param {string} commodity
 * @param {number} [days=7]
 * @returns {Promise<any[] | null>}
 */
export async function getPriceHistory(commodity, days = 7) {
  if (!commodity) {
    return [];
  }

  const payload =
    await fetchJson('/commodities/history', { commodity, days })
    || await fetchJson(`/commodities/${encodeURIComponent(String(commodity).trim().toLowerCase())}/history`, { days });

  const rows = extractArray(payload);
  if (rows.length === 0) {
    return null;
  }

  return rows.map((row) => {
    const buyPrice = Number(row?.buy_price ?? row?.price_buy ?? row?.buyPrice);
    const sellPrice = Number(row?.sell_price ?? row?.price_sell ?? row?.sellPrice);
    return {
      at: row?.date || row?.timestamp || row?.recorded_at || null,
      buyPrice: Number.isFinite(buyPrice) ? buyPrice : null,
      sellPrice: Number.isFinite(sellPrice) ? sellPrice : null,
      terminal: row?.terminal_name || row?.terminal || null,
      system: row?.system_name || row?.system || null,
    };
  });
}
