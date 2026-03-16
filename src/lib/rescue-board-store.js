import { base44 } from '@/api/base44Client';
import { safeLocalStorage } from '@/lib/safe-storage';

export const RESCUE_CALLS_STORAGE_KEY = 'nexus_rescue_calls';
const RESCUE_CALLS_EVENT = 'nexusos:rescue-calls-updated';

function getRescueEntity() {
  const entities = /** @type {any} */ (base44?.entities);
  return entities?.RescueCall && typeof entities.RescueCall.list === 'function'
    ? entities.RescueCall
    : null;
}

function emitRescueCalls(calls) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESCUE_CALLS_EVENT, { detail: calls }));
  }
}

function normalizeCall(call) {
  if (!call || typeof call !== 'object') {
    return null;
  }

  return {
    id: call.id,
    location: call.location || '',
    system: call.system || 'STANTON',
    situation: call.situation || '',
    callsign: call.callsign || 'UNKNOWN',
    ts: call.ts || new Date().toISOString(),
    status: call.status || 'OPEN',
    responder: call.responder || '',
  };
}

function sortCalls(calls) {
  return [...calls].sort((left, right) => new Date(right.ts).getTime() - new Date(left.ts).getTime());
}

export function loadRescueCalls() {
  try {
    const raw = safeLocalStorage.getItem(RESCUE_CALLS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortCalls(parsed.map(normalizeCall).filter(Boolean));
  } catch {
    return [];
  }
}

export function saveRescueCalls(calls) {
  const normalized = sortCalls((Array.isArray(calls) ? calls : []).map(normalizeCall).filter(Boolean));
  safeLocalStorage.setItem(RESCUE_CALLS_STORAGE_KEY, JSON.stringify(normalized));
  emitRescueCalls(normalized);
  return normalized;
}

export function getActiveRescueCount(calls = loadRescueCalls()) {
  return calls.filter((call) => call.status !== 'RESOLVED').length;
}

export async function refreshRescueCalls() {
  const entity = getRescueEntity();
  if (!entity) {
    return loadRescueCalls();
  }

  try {
    const remoteCalls = await entity.list('-created_date', 100);
    return saveRescueCalls(remoteCalls || []);
  } catch (error) {
    console.warn('[rescue-board-store] remote refresh failed, using local cache:', error?.message || error);
    return loadRescueCalls();
  }
}

export async function createRescueCall(call) {
  const normalized = normalizeCall({ id: call?.id || `local_${Date.now()}`, ...call });
  if (!normalized) {
    return loadRescueCalls();
  }

  const entity = getRescueEntity();
  if (entity) {
    try {
      const created = normalizeCall(await entity.create(normalized));
      if (created) {
        const current = loadRescueCalls().filter((item) => String(item.id) !== String(created.id));
        return saveRescueCalls([created, ...current]);
      }
    } catch (error) {
      console.warn('[rescue-board-store] remote create failed, falling back locally:', error?.message || error);
    }
  }

  return saveRescueCalls([normalized, ...loadRescueCalls()]);
}

export async function updateRescueCall(id, updates) {
  const entity = getRescueEntity();
  if (entity) {
    try {
      const updated = normalizeCall(await entity.update(id, updates));
      if (updated) {
        const current = loadRescueCalls().filter((item) => String(item.id) !== String(id));
        return saveRescueCalls([updated, ...current]);
      }
    } catch (error) {
      console.warn('[rescue-board-store] remote update failed, falling back locally:', error?.message || error);
    }
  }

  const nextCalls = loadRescueCalls().map((call) => (
    String(call.id) === String(id) ? normalizeCall({ ...call, ...updates }) : call
  ));
  return saveRescueCalls(nextCalls);
}

export function subscribeToRescueCalls(listener) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key !== RESCUE_CALLS_STORAGE_KEY) {
      return;
    }

    listener(loadRescueCalls());
  };

  const handleCustomEvent = (event) => {
    listener(Array.isArray(event.detail) ? event.detail : loadRescueCalls());
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(RESCUE_CALLS_EVENT, handleCustomEvent);

  const entity = getRescueEntity();
  const unsubscribeRemote = entity?.subscribe
    ? entity.subscribe(() => {
        refreshRescueCalls().then(listener).catch(() => listener(loadRescueCalls()));
      })
    : () => {};

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(RESCUE_CALLS_EVENT, handleCustomEvent);
    unsubscribeRemote();
  };
}
