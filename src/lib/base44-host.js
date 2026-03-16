import { getAppParams } from '@/lib/app-params';
import { safeLocalStorage } from '@/lib/safe-storage';

export function getBase44Origin() {
  const { serverUrl } = getAppParams();
  if (serverUrl) {
    return serverUrl;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function getBase44OriginUrl() {
  const { fromUrl } = getAppParams();
  if (fromUrl) {
    return fromUrl;
  }

  if (typeof window !== 'undefined') {
    return window.location.href;
  }

  return '';
}

export function getBase44AccessToken() {
  const { token } = getAppParams();
  return token
    || safeLocalStorage.getItem('base44_access_token')
    || safeLocalStorage.getItem('token')
    || '';
}

/** @returns {Record<string, string>} */
export function getBase44Headers(options = {}) {
  const { includeAuth = true, accept = 'application/json' } = options;
  const params = getAppParams();
  /** @type {Record<string, string>} */
  const headers = {};

  if (accept) {
    headers.Accept = accept;
  }

  const token = includeAuth ? getBase44AccessToken() : '';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (params.appId) {
    headers['X-App-Id'] = params.appId;
    headers['Base44-App-Id'] = params.appId;
  }

  if (params.serverUrl) {
    headers['Base44-Api-Url'] = params.serverUrl;
  }

  if (params.functionsVersion) {
    headers['Base44-Functions-Version'] = params.functionsVersion;
  }

  const originUrl = getBase44OriginUrl();
  if (originUrl) {
    headers['X-Origin-URL'] = originUrl;
  }

  return headers;
}

export function buildBase44Url(path) {
  const origin = getBase44Origin();
  if (!origin) {
    throw new Error('Base44 origin unavailable');
  }

  return new URL(path, origin);
}
