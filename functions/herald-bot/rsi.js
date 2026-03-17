const RSI_ORG_SLUG = 'REDSCAR';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const verificationCache = new Map();

function cachedResult(handle) {
  const cached = verificationCache.get(handle);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    verificationCache.delete(handle);
    return null;
  }

  return cached.value;
}

function setCachedResult(handle, value) {
  verificationCache.set(handle, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function verifyOrgMembership(rsiHandle) {
  const normalizedHandle = String(rsiHandle || '').trim().toLowerCase();
  if (!normalizedHandle) {
    return false;
  }

  const cached = cachedResult(normalizedHandle);
  if (cached !== null) {
    return cached;
  }

  const url = new URL(`https://robertsspaceindustries.com/orgs/${RSI_ORG_SLUG}/members`);
  url.searchParams.set('search', normalizedHandle);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'NexusOS Herald Bot/1.0 (+https://github.com/blae-code/nexusos)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`RSI membership lookup failed: ${response.status}`);
  }

  const html = (await response.text()).toLowerCase();
  const matched = html.includes(normalizedHandle);
  setCachedResult(normalizedHandle, matched);
  return matched;
}

export default {
  verifyOrgMembership,
};
