import {
  FACTION_REGISTRY,
  LOCAL_REFERENCE_ENUMS,
  LOCATION_REGISTRY,
  MISSION_TYPE_REGISTRY,
  OP_TYPE_REGISTRY,
  REFERENCE_SOURCE,
  SC_REFERENCE_PATCH,
  SYSTEM_REGISTRY,
  mergeReferenceOptions,
  normalizeReferenceToken,
  normalizeReferenceValue,
  preserveLegacyReferenceOptions,
} from './sc-reference-registry.js';

function buildCacheDataset(datasetId, records, staleAfterHours) {
  const list = Array.isArray(records) ? records : [];
  const syncedAt = list.reduce((latest, record) => {
    const candidate = record?.last_synced || record?.price_synced_at || null;
    if (!candidate) return latest;
    if (!latest) return candidate;
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, null);

  const stale = !syncedAt || ((Date.now() - new Date(syncedAt).getTime()) > staleAfterHours * 60 * 60 * 1000);

  return {
    datasetId,
    sourceType: REFERENCE_SOURCE.LIVE_CACHE,
    syncedAt,
    livePatch: SC_REFERENCE_PATCH,
    registryPatch: SC_REFERENCE_PATCH,
    stale,
    count: list.length,
  };
}

function toTitleCase(value) {
  return normalizeReferenceValue(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function vehicleOption(vehicle) {
  const name = normalizeReferenceValue(vehicle?.name);
  if (!name) return null;

  const manufacturer = normalizeReferenceValue(vehicle?.manufacturer || vehicle?.stats_json?.manufacturer);
  const cargo = Number(vehicle?.cargo_scu || 0);

  return {
    value: name,
    label: name,
    group: manufacturer || 'Vehicles',
    source: REFERENCE_SOURCE.LIVE_CACHE,
    patch: SC_REFERENCE_PATCH,
    deprecated: false,
    replacement: null,
    searchTokens: [name, manufacturer, String(cargo)].filter(Boolean),
    meta: {
      manufacturer: manufacturer || null,
      kind: 'Vehicle',
      token: manufacturer ? manufacturer.slice(0, 2).toUpperCase() : 'VE',
      subtitle: cargo > 0 ? `${cargo} SCU` : 'Flight ready',
    },
  };
}

function itemOption(item) {
  const name = normalizeReferenceValue(item?.name);
  if (!name) return null;

  const category = normalizeReferenceValue(item?.category || item?.type || 'Items');
  const manufacturer = normalizeReferenceValue(item?.manufacturer || item?.brand || '');

  return {
    value: name,
    label: name,
    group: toTitleCase(category),
    source: REFERENCE_SOURCE.LIVE_CACHE,
    patch: SC_REFERENCE_PATCH,
    deprecated: false,
    replacement: null,
    searchTokens: [name, category, manufacturer].filter(Boolean),
    meta: {
      manufacturer: manufacturer || null,
      kind: 'Item',
      token: manufacturer ? manufacturer.slice(0, 2).toUpperCase() : 'IT',
      subtitle: manufacturer || category,
    },
  };
}

function commodityOption(commodity) {
  const name = normalizeReferenceValue(commodity?.name);
  if (!name) return null;

  const bestSell = normalizeReferenceValue(commodity?.best_sell_terminal);

  return {
    value: name,
    label: name,
    group: 'Commodities',
    source: REFERENCE_SOURCE.LIVE_CACHE,
    patch: SC_REFERENCE_PATCH,
    deprecated: false,
    replacement: null,
    searchTokens: [
      name,
      commodity?.type,
      commodity?.best_buy_terminal,
      commodity?.best_sell_terminal,
      commodity?.best_buy_system,
      commodity?.best_sell_system,
    ].filter(Boolean),
    meta: {
      kind: 'Commodity',
      token: 'CM',
      subtitle: bestSell ? `Best sell: ${bestSell}` : 'Live commodity cache',
      marginPct: Number(commodity?.margin_pct || 0),
    },
  };
}

function relationOption(value, label, group, meta = {}) {
  const cleanValue = normalizeReferenceValue(value);
  const cleanLabel = normalizeReferenceValue(label || value);
  if (!cleanValue || !cleanLabel) return null;

  return {
    value: cleanValue,
    label: cleanLabel,
    group,
    source: REFERENCE_SOURCE.ENTITY_RELATION,
    patch: null,
    deprecated: false,
    replacement: null,
    searchTokens: [cleanLabel, cleanValue, meta?.subtitle].filter(Boolean),
    meta,
  };
}

function registryOptionsForDomain(domain, context) {
  switch (domain) {
    case 'systems':
      return SYSTEM_REGISTRY;
    case 'locations': {
      const targetSystem = normalizeReferenceToken(context?.system);
      if (!targetSystem) return LOCATION_REGISTRY;
      return LOCATION_REGISTRY.filter((option) => normalizeReferenceToken(option?.meta?.system) === targetSystem);
    }
    case 'stations':
      return LOCATION_REGISTRY.filter((option) => /Station|Gateway|Lagrange/i.test(String(option?.meta?.kind || '')));
    case 'factions':
      return FACTION_REGISTRY;
    case 'op-types':
      return OP_TYPE_REGISTRY;
    case 'mission-types':
      return MISSION_TYPE_REGISTRY;
    default:
      return LOCAL_REFERENCE_ENUMS[domain] || [];
  }
}

function entityRelationOptionsForDomain(domain, context) {
  if (domain === 'org-ships') {
    return (Array.isArray(context?.ships) ? context.ships : [])
      .map((ship) => relationOption(
        ship?.id,
        ship?.name ? `${ship.name}${ship.model ? ` (${ship.model})` : ''}` : ship?.model,
        'Org Ships',
        {
          kind: 'Org Ship',
          token: normalizeReferenceValue(ship?.name || ship?.model || 'SH').slice(0, 2).toUpperCase(),
          subtitle: [ship?.model, ship?.status].filter(Boolean).join(' · '),
        },
      ))
      .filter(Boolean);
  }

  if (domain === 'member-callsigns') {
    return (Array.isArray(context?.members) ? context.members : [])
      .map((member) => relationOption(
        member?.callsign || member?.login_name,
        member?.callsign || member?.login_name,
        'Members',
        {
          kind: 'Member',
          token: normalizeReferenceValue(member?.callsign || member?.login_name || 'MB').slice(0, 2).toUpperCase(),
          subtitle: member?.nexus_rank || member?.role || '',
        },
      ))
      .filter(Boolean);
  }

  return [];
}

function liveCacheOptionsForDomain(domain, gameCache, context) {
  const vehicles = Array.isArray(gameCache?.vehicles) ? gameCache.vehicles : [];
  const items = Array.isArray(gameCache?.items) ? gameCache.items : [];
  const commodities = Array.isArray(gameCache?.commodities) ? gameCache.commodities : [];

  if (domain === 'tradeable-items') {
    return mergeReferenceOptions(
      commodities.map(commodityOption).filter(Boolean),
      items.map(itemOption).filter(Boolean),
    );
  }

  if (domain === 'asset-names') {
    const assetType = normalizeReferenceToken(context?.assetType);
    if (assetType === 'SHIP' || assetType === 'VEHICLE') {
      return vehicles.map(vehicleOption).filter(Boolean);
    }
    return items.map(itemOption).filter(Boolean);
  }

  if (domain === 'manufacturers') {
    const manufacturers = new Set();
    const options = [];

    [...vehicles, ...items, ...(Array.isArray(context?.ships) ? context.ships : [])].forEach((record) => {
      const name = normalizeReferenceValue(record?.manufacturer || record?.brand);
      if (!name) return;
      const key = normalizeReferenceToken(name);
      if (manufacturers.has(key)) return;
      manufacturers.add(key);
      options.push({
        value: name,
        label: name,
        group: 'Manufacturers',
        source: REFERENCE_SOURCE.LIVE_CACHE,
        patch: SC_REFERENCE_PATCH,
        deprecated: false,
        replacement: null,
        searchTokens: [name],
        meta: {
          kind: 'Manufacturer',
          token: name.slice(0, 2).toUpperCase(),
        },
      });
    });

    return options.sort((left, right) => left.label.localeCompare(right.label));
  }

  return [];
}

function specialOptions(domain, context) {
  const options = [];

  if (context?.includeBlank) {
    options.push({
      value: '',
      label: context?.blankLabel || 'None',
      group: 'Common',
      source: REFERENCE_SOURCE.LOCAL_ENUM,
      patch: SC_REFERENCE_PATCH,
      deprecated: false,
      replacement: null,
      searchTokens: ['none'],
      meta: { kind: 'Common', token: '00' },
    });
  }

  if (context?.includeAll) {
    options.push({
      value: context?.allValue || 'ALL',
      label: context?.allLabel || 'All',
      group: 'Common',
      source: REFERENCE_SOURCE.LOCAL_ENUM,
      patch: SC_REFERENCE_PATCH,
      deprecated: false,
      replacement: null,
      searchTokens: ['all'],
      meta: { kind: 'Common', token: 'AL' },
    });
  }

  if (domain === 'systems' && context?.includeAll !== true && context?.value === 'ALL') {
    options.push({
      value: 'ALL',
      label: 'All Systems',
      group: 'Common',
      source: REFERENCE_SOURCE.LOCAL_ENUM,
      patch: SC_REFERENCE_PATCH,
      deprecated: false,
      replacement: null,
      searchTokens: ['all'],
      meta: { kind: 'Common', token: 'AL' },
    });
  }

  return options;
}

export function resolveSCReferenceOptions({ domain, context = {}, gameCache = {} }) {
  const registryOptions = registryOptionsForDomain(domain, context);
  const relationOptions = entityRelationOptionsForDomain(domain, context);
  const cacheOptions = liveCacheOptionsForDomain(domain, gameCache, context);

  const options = preserveLegacyReferenceOptions(
    mergeReferenceOptions(
      specialOptions(domain, context),
      registryOptions,
      relationOptions,
      cacheOptions,
    ),
    context?.currentValues || context?.currentValue || context?.value || null,
    domain === 'stations' ? 'locations' : domain,
  );

  return {
    options,
    datasets: [
      buildCacheDataset('GameCacheVehicle', gameCache?.vehicles, 168),
      buildCacheDataset('GameCacheItem', gameCache?.items, 168),
      buildCacheDataset('GameCacheCommodity', gameCache?.commodities, 48),
    ],
    loading: Boolean(gameCache?.loading),
  };
}
