const INTERNAL_ROUTE_MARKERS = ['/gate', '/AccessGate', '/app'];

function trimTrailingSlash(value) {
  if (!value || value === '/') {
    return '';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getAppBasePath(pathname) {
  if (typeof window === 'undefined') {
    return '';
  }

  const windowWithBasePath = /** @type {Window & { __NEXUSOS_BASE_PATH__?: string }} */ (window);

  if (typeof windowWithBasePath.__NEXUSOS_BASE_PATH__ === 'string') {
    return trimTrailingSlash(windowWithBasePath.__NEXUSOS_BASE_PATH__);
  }

  const currentPath = pathname || window.location.pathname || '/';
  if (currentPath === '/') {
    return '';
  }

  let markerIndex = Number.POSITIVE_INFINITY;
  for (const marker of INTERNAL_ROUTE_MARKERS) {
    const index = currentPath.indexOf(marker);
    if (index >= 0) {
      markerIndex = Math.min(markerIndex, index);
    }
  }

  if (Number.isFinite(markerIndex)) {
    return trimTrailingSlash(currentPath.slice(0, markerIndex));
  }

  return trimTrailingSlash(currentPath);
}

export function withAppBase(path) {
  const basePath = getAppBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}` || '/';
}
