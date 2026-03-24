const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 4;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number) {
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(8_000, 600 * (2 ** Math.max(0, attempt - 1))) + jitter;
}

export async function fetchUexData<T = unknown>(
  url: string,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  }: {
    timeoutMs?: number;
    maxAttempts?: number;
  } = {},
): Promise<T[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'NexusOS/1.0 (Redscar Nomads)' },
      });

      if (!response.ok) {
        const error = new Error(`UEX ${response.status}`);
        if (!RETRYABLE_STATUSES.has(response.status) || attempt === maxAttempts) {
          throw error;
        }
        lastError = error;
      } else {
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      lastError = normalizedError;

      if (attempt === maxAttempts) {
        throw normalizedError;
      }
    }

    await sleep(backoffDelayMs(attempt));
  }

  throw lastError || new Error('UEX request failed');
}
