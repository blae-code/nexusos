const memoryLocalStorage = new Map();
const memorySessionStorage = new Map();

let localStorageAvailable;
let sessionStorageAvailable;

function getWindowStorage(type) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return type === 'localStorage'
      ? window.localStorage
      : window.sessionStorage;
  } catch {
    return null;
  }
}

function canUseStorage(type) {
  const availableFlag = type === 'localStorage' ? localStorageAvailable : sessionStorageAvailable;
  if (typeof availableFlag === 'boolean') {
    return availableFlag;
  }

  const storage = getWindowStorage(type);
  if (!storage) {
    if (type === 'localStorage') localStorageAvailable = false;
    else sessionStorageAvailable = false;
    return false;
  }

  try {
    const testKey = `__nexusos_${type}_probe__`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    if (type === 'localStorage') localStorageAvailable = true;
    else sessionStorageAvailable = true;
    return true;
  } catch {
    if (type === 'localStorage') localStorageAvailable = false;
    else sessionStorageAvailable = false;
    return false;
  }
}

function createSafeStorage(type, memoryStore) {
  return {
    getItem(key) {
      if (!canUseStorage(type)) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }

      try {
        return getWindowStorage(type)?.getItem(key) ?? null;
      } catch {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    },
    setItem(key, value) {
      const nextValue = String(value);
      if (!canUseStorage(type)) {
        memoryStore.set(key, nextValue);
        return;
      }

      try {
        getWindowStorage(type)?.setItem(key, nextValue);
      } catch {
        memoryStore.set(key, nextValue);
      }
    },
    removeItem(key) {
      memoryStore.delete(key);
      if (!canUseStorage(type)) {
        return;
      }

      try {
        getWindowStorage(type)?.removeItem(key);
      } catch {
        // Ignore restricted runtime removals.
      }
    },
  };
}

export const safeLocalStorage = createSafeStorage('localStorage', memoryLocalStorage);
export const safeSessionStorage = createSafeStorage('sessionStorage', memorySessionStorage);
