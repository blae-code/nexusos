// Active in Vite dev server, a baked demo build, or an explicit temporary-access build.
const meta = /** @type {{ env?: { DEV?: boolean; VITE_DEMO_MODE?: string; VITE_BYPASS_ACCESS_GATE?: string; VITE_TEMP_ACCESS_MODE?: string; VITE_SANDBOX_MODE?: string; VITE_SANDBOX_API_BASE?: string } }} */ (import.meta);
import { safeLocalStorage } from '@/core/data/safe-storage';
import {
  DEFAULT_TEMP_ACCESS_PERSONA_ID,
  DEV_PERSONAS,
  getDevPersonaById,
} from './personas';
export {
  DEFAULT_TEMP_ACCESS_PERSONA_ID,
  DEV_PERSONAS,
  getDevPersonaById,
} from './personas';

const RUNTIME_BYPASS_STORAGE_KEY = 'nexus_runtime_access_gate_bypass';

function normalizeBypassParam(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'on', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no'].includes(normalized)) return false;
  return null;
}

function replaceUrlSearch(nextSearchParams) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = `${window.location.pathname}${nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : ''}${window.location.hash}`;

  try {
    window.history.replaceState({}, document.title, nextUrl);
  } catch {
    // Ignore history mutations in restricted host environments.
  }
}

function resolveRuntimeBypassFlag() {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = searchParams.get('bypass_access_gate');
  const normalizedQuery = normalizeBypassParam(queryValue);
  if (normalizedQuery !== null) {
    if (normalizedQuery) {
      safeLocalStorage.setItem(RUNTIME_BYPASS_STORAGE_KEY, '1');
    } else {
      safeLocalStorage.removeItem(RUNTIME_BYPASS_STORAGE_KEY);
    }
    searchParams.delete('bypass_access_gate');
    replaceUrlSearch(searchParams);
    return normalizedQuery;
  }

  return safeLocalStorage.getItem(RUNTIME_BYPASS_STORAGE_KEY) === '1';
}

export const IS_ACCESS_GATE_BYPASSED = meta.env?.VITE_BYPASS_ACCESS_GATE === 'true' || resolveRuntimeBypassFlag();
export const IS_TEMP_ACCESS_MODE = meta.env?.VITE_TEMP_ACCESS_MODE === 'true';
export const IS_LOCAL_SIMULATION_MODE = meta.env?.DEV === true || meta.env?.VITE_DEMO_MODE === 'true' || IS_ACCESS_GATE_BYPASSED;
export const SANDBOX_MODE = meta.env?.VITE_SANDBOX_MODE || (IS_TEMP_ACCESS_MODE ? 'shared' : 'local');
export const IS_SHARED_SANDBOX_MODE = IS_TEMP_ACCESS_MODE && SANDBOX_MODE === 'shared';
export const SANDBOX_API_BASE = meta.env?.VITE_SANDBOX_API_BASE || '';
export const IS_DEV_MODE = IS_LOCAL_SIMULATION_MODE || IS_TEMP_ACCESS_MODE;

const DEV_SESSION_KEY = 'nexus_dev_persona';
const DEV_SIGNED_OUT_VALUE = '__signed_out__';

export function getDevPersona() {
  if (!IS_DEV_MODE) return null;

  const id = safeLocalStorage.getItem(DEV_SESSION_KEY);
  if (id === DEV_SIGNED_OUT_VALUE) {
    if (IS_ACCESS_GATE_BYPASSED) {
      return getDevPersonaById(DEFAULT_TEMP_ACCESS_PERSONA_ID);
    }
    return null;
  }
  if (id) {
    return getDevPersonaById(id);
  }

  if (IS_TEMP_ACCESS_MODE || IS_ACCESS_GATE_BYPASSED) {
    return getDevPersonaById(DEFAULT_TEMP_ACCESS_PERSONA_ID);
  }

  return null;
}

export function setDevPersona(id) {
  safeLocalStorage.setItem(DEV_SESSION_KEY, id);
}

export function clearDevPersona() {
  if (IS_TEMP_ACCESS_MODE) {
    safeLocalStorage.setItem(DEV_SESSION_KEY, DEV_SIGNED_OUT_VALUE);
    return;
  }

  safeLocalStorage.removeItem(DEV_SESSION_KEY);
}

export function buildDevSession(persona, userOverrides = {}) {
  const joinedAt = userOverrides.joined_at || userOverrides.joinedAt || '2025-01-01T00:00:00Z';
  const discordRoles = userOverrides.discord_roles || userOverrides.discordRoles || [persona.rank];
  const onboardingComplete = userOverrides.onboarding_complete ?? true;

  return {
    authenticated: true,
    source: 'member',
    user: {
      id: userOverrides.id || persona.userId,
      discordId: userOverrides.discord_id || userOverrides.discordId || persona.discordId,
      callsign: userOverrides.callsign || persona.callsign,
      rank: userOverrides.nexus_rank || userOverrides.rank || persona.rank,
      discordRoles,
      joinedAt,
      onboarding_complete: onboardingComplete,
    },
  };
}

export function disableRuntimeAccessGateBypass() {
  safeLocalStorage.removeItem(RUNTIME_BYPASS_STORAGE_KEY);
}
