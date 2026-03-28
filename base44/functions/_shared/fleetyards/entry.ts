const FLEETYARDS_API_BASE = 'https://api.fleetyards.net/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'NexusOS/1.0 (Redscar Nomads)',
};

function tv(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeFleetYardsHandle(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const fleetsIndex = segments.findIndex((segment) => segment.toLowerCase() === 'fleets');
    if (fleetsIndex !== -1 && segments[fleetsIndex + 1]) {
      return decodeURIComponent(segments[fleetsIndex + 1]).trim();
    }
    if (segments.length > 0) {
      return decodeURIComponent(segments[segments.length - 1]).trim();
    }
  } catch {
    // Treat as a raw handle below.
  }

  return trimmed.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
}

function buildFleetHandleCandidates(value: unknown) {
  const normalized = normalizeFleetYardsHandle(value);
  if (!normalized) return [];
  return uniqueStrings([
    normalized,
    normalized.toLowerCase(),
    normalized.toUpperCase(),
  ]);
}

async function readFleetYardsError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  } catch {
    // Fall through to plain-text handling.
  }

  try {
    const text = (await response.text()).trim();
    if (text) return text.slice(0, 240);
  } catch {
    // Ignore parse failures and return the fallback below.
  }

  return fallback;
}

async function fetchFleetYards(path: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetch(`${FLEETYARDS_API_BASE}${path}`, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export function getFleetYardsAuthCookie() {
  return tv(Deno.env.get('FLEETYARDS_AUTH_COOKIE') || Deno.env.get('FLEETYARDS_COOKIE'));
}

export function hasFleetYardsRosterAuth() {
  return Boolean(getFleetYardsAuthCookie());
}

async function fetchFleetYardsWithAuth(path: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers = new Headers(DEFAULT_HEADERS);
  const cookie = getFleetYardsAuthCookie();
  if (cookie) {
    headers.set('Cookie', cookie);
  }

  return fetch(`${FLEETYARDS_API_BASE}${path}`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function resolveFleetYardsFleet(handle: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const requestedHandle = normalizeFleetYardsHandle(handle);
  const candidates = buildFleetHandleCandidates(handle);

  if (!candidates.length) {
    throw new Error('FleetYards handle is empty.');
  }

  for (const candidate of candidates) {
    const response = await fetchFleetYards(`/fleets/${encodeURIComponent(candidate)}`, timeoutMs);
    if (response.ok) {
      const fleet = await response.json();
      return {
        fleet,
        requestedHandle,
        resolvedHandle: candidate,
        slug: String(fleet?.slug || candidate).trim(),
      };
    }

    if (response.status === 404) {
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('FleetYards fleet metadata requires authenticated access.');
    }

    throw new Error(await readFleetYardsError(response, `FleetYards ${response.status}`));
  }

  throw new Error(`FleetYards fleet not found for "${requestedHandle}". Use the FleetYards fleet slug or RSI SID.`);
}

export async function fetchFleetYardsFleetVehicles(handle: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const resolved = await resolveFleetYardsFleet(handle, timeoutMs);
  const response = await fetchFleetYardsWithAuth(`/fleets/${encodeURIComponent(resolved.slug)}/vehicles`, timeoutMs);

  if (response.ok) {
    const payload = await response.json();
    const vehicles = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.vehicles)
        ? payload.vehicles
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    return {
      ...resolved,
      vehicles,
    };
  }

  if (response.status === 401 || response.status === 403) {
    if (!hasFleetYardsRosterAuth()) {
      throw new Error(`FleetYards vehicle roster for "${resolved.slug}" requires FLEETYARDS_AUTH_COOKIE. Paste an authenticated FleetYards Cookie header into that deployment secret.`);
    }
    throw new Error(`FleetYards vehicle roster for "${resolved.slug}" rejected the configured FLEETYARDS_AUTH_COOKIE.`);
  }

  if (response.status === 404) {
    throw new Error(`FleetYards vehicle roster is unavailable for "${resolved.slug}".`);
  }

  throw new Error(await readFleetYardsError(response, `FleetYards ${response.status}`));
}
