import React, { useEffect, useMemo, useState } from 'react';

import shipComponents from '../../../apps/armory/assets/ships/index.jsx';
import {
  normalizeAssetKey,
  resolveAssetEntry,
  resolveAssetSrc,
} from '../assets/registry.js';

const SHIP_SILHOUETTE_MAP = {
  prospector: shipComponents.Prospector,
  mole: shipComponents.Mole,
  caterpillar: shipComponents.Caterpillar,
  'c2-hercules': shipComponents.C2Hercules,
  'c2-hercules-starlifter': shipComponents.C2Hercules,
  'hull-c': shipComponents.HullC,
  arrow: shipComponents.Arrow,
  gladius: shipComponents.Gladius,
  'cutlass-black': shipComponents.CutlassBlack,
  carrack: shipComponents.Carrack,
  pisces: shipComponents.Pisces,
  razor: shipComponents.Razor,
};

function findShipFallback(assetKey, entry) {
  const candidates = [
    normalizeAssetKey(assetKey),
    normalizeAssetKey(entry?.key),
    ...(entry?.tags || []).map((tag) => normalizeAssetKey(tag)),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (SHIP_SILHOUETTE_MAP[candidate]) {
      return SHIP_SILHOUETTE_MAP[candidate];
    }
  }

  return null;
}

function normalizeDimension(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

export default function AssetImage({
  assetKey,
  alt,
  size = 28,
  width,
  height,
  fit = 'cover',
  style,
  className,
  borderRadius = 6,
}) {
  const entry = useMemo(() => resolveAssetEntry(assetKey), [assetKey]);
  const resolvedAlt = alt || entry?.key || String(assetKey || '');
  const resolvedWidth = normalizeDimension(width, size);
  const resolvedHeight = normalizeDimension(height, size);
  const resolvedSrc = entry ? resolveAssetSrc(entry.path) : null;
  const fallbackComponent = useMemo(() => findShipFallback(assetKey, entry), [assetKey, entry]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [assetKey, resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !hasError;
  const showFallback = !showImage && Boolean(fallbackComponent);
  const FallbackComponent = fallbackComponent;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: resolvedWidth,
        height: resolvedHeight,
        borderRadius,
        overflow: 'hidden',
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        flexShrink: 0,
        ...style,
      }}
    >
      <style>
        {`
          @keyframes asset-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>

      {!isLoaded && !showFallback ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--bg2) 0%, rgba(var(--acc-rgb), 0.08) 50%, var(--bg2) 100%)',
            backgroundSize: '200% 100%',
            animation: 'asset-shimmer 1.25s linear infinite',
          }}
        />
      ) : null}

      {showImage ? (
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 180ms ease',
          }}
        />
      ) : null}

      {showFallback && FallbackComponent ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--acc2)',
            background: 'rgba(var(--bg0-rgb), 0.18)',
          }}
        >
          <FallbackComponent size={Math.min(Number(resolvedWidth) || size, Number(resolvedHeight) || size) * 0.8} showHardpoints={false} />
        </div>
      ) : null}

      {!showImage && !showFallback ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t3)',
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          IMG
        </div>
      ) : null}

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(var(--bg0-rgb), 0.3)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
