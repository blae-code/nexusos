import { safeLocalStorage } from '@/lib/safe-storage';

export const RESCUE_CALLS_STORAGE_KEY = 'nexus_rescue_calls';
const RESCUE_CALLS_EVENT = 'nexusos:rescue-calls-updated';

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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESCUE_CALLS_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function getActiveRescueCount(calls = loadRescueCalls()) {
  return calls.filter((call) => call.status !== 'RESOLVED').length;
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

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(RESCUE_CALLS_EVENT, handleCustomEvent);
  };
}
