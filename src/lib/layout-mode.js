export const LAYOUT_STORAGE_KEY = 'nexusos_layout_mode';

const LEGACY_KEYS = ['nexus_layout'];
const DEFAULT_LAYOUT_MODE = 'ALT-TAB';

export function normalizeLayoutMode(value) {
  if (!value) return DEFAULT_LAYOUT_MODE;

  const normalized = String(value).trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (normalized === 'ALT TAB' || normalized === 'ALT-TAB') {
    return 'ALT-TAB';
  }
  if (normalized === '2ND MONITOR' || normalized === '2ND MON') {
    return '2ND MONITOR';
  }

  return DEFAULT_LAYOUT_MODE;
}

export function getStoredLayoutMode() {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT_MODE;
  }

  const currentValue = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (currentValue) {
    const normalized = normalizeLayoutMode(currentValue);
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, normalized);
    return normalized;
  }

  for (const key of LEGACY_KEYS) {
    const legacyValue = window.localStorage.getItem(key);
    if (legacyValue) {
      const normalized = normalizeLayoutMode(legacyValue);
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, normalized);
      window.localStorage.removeItem(key);
      return normalized;
    }
  }

  return DEFAULT_LAYOUT_MODE;
}

export function setStoredLayoutMode(value) {
  const normalized = normalizeLayoutMode(value);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, normalized);
  }
  return normalized;
}
