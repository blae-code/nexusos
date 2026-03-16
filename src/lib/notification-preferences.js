import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeLocalStorage } from '@/lib/safe-storage';

export const NOTIFICATION_PREFS_STORAGE_KEY = 'nexusos_notification_prefs';
export const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  ops: true,
  rescue: true,
  scout: false,
});

function normalizePreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ops: source.ops !== false,
    rescue: source.rescue !== false,
    scout: source.scout === true,
  };
}

export function loadNotificationPreferences() {
  try {
    const raw = safeLocalStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }

    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function saveNotificationPreferences(preferences) {
  const normalized = normalizePreferences(preferences);
  safeLocalStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.requestPermission();
}

/**
 * @param {{
 *   title?: string;
 *   body?: string;
 *   tag?: string;
 *   silent?: boolean;
 *   onClickUrl?: string;
 * }=} options
 */
export function notifyBrowser({ title, body, tag, silent = false, onClickUrl } = {}) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title || 'NexusOS', {
    body,
    tag,
    silent,
  });

  if (onClickUrl) {
    notification.onclick = () => {
      try {
        window.focus();
        window.location.assign(onClickUrl);
      } finally {
        notification.close();
      }
    };
  }

  return notification;
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(() => loadNotificationPreferences());
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== NOTIFICATION_PREFS_STORAGE_KEY) {
        return;
      }

      setPreferences(loadNotificationPreferences());
      setPermission(getBrowserNotificationPermission());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setPreference = useCallback((key, nextValue) => {
    setPreferences((current) => {
      const normalized = saveNotificationPreferences({
        ...current,
        [key]: typeof nextValue === 'function' ? nextValue(current[key]) : nextValue,
      });
      return normalized;
    });
    setPermission(getBrowserNotificationPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  return useMemo(() => ({
    preferences,
    permission,
    browserSupported: permission !== 'unsupported',
    setPreference,
    requestPermission,
  }), [permission, preferences, requestPermission, setPreference]);
}
