const memoryStorage = new Map();
let localStorageAvailable;

function getMemoryValue(key) {
  return memoryStorage.has(key) ? memoryStorage.get(key) : null;
}

function canUseLocalStorage() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof localStorageAvailable === 'boolean') {
    return localStorageAvailable;
  }

  try {
    const testKey = '__nexusos_storage_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    localStorageAvailable = true;
    return true;
  } catch {
    localStorageAvailable = false;
    return false;
  }
}

function readLocalStorage(key) {
  if (!canUseLocalStorage()) {
    return getMemoryValue(key);
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return getMemoryValue(key);
  }
}

function writeLocalStorage(key, value) {
  const nextValue = String(value);

  if (!canUseLocalStorage()) {
    memoryStorage.set(key, nextValue);
    return;
  }

  try {
    window.localStorage.setItem(key, nextValue);
  } catch {
    memoryStorage.set(key, nextValue);
  }
}

function removeLocalStorage(key) {
  memoryStorage.delete(key);

  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removals in restricted runtimes.
  }
}

export const safeLocalStorage = {
  getItem(key) {
    return readLocalStorage(key);
  },
  setItem(key, value) {
    writeLocalStorage(key, value);
  },
  removeItem(key) {
    removeLocalStorage(key);
  },
};
