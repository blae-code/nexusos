export function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function formatAuec(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString()} aUEC`;
}

export function formatCompactAuec(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M aUEC`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}k aUEC`;
  }
  return `${Math.round(amount).toLocaleString()} aUEC`;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function parseManifestText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colonMatch = line.match(/^(.*?)[,:]\s*(\d+(?:\.\d+)?)$/);
      const timesMatch = line.match(/^(.*?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
      const trailingMatch = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)$/);
      const match = colonMatch || timesMatch || trailingMatch;

      if (!match) {
        return {
          name: line,
          quantity_scu: 1,
        };
      }

      return {
        name: String(match[1] || '').trim(),
        quantity_scu: Number(match[2] || 0) || 1,
      };
    })
    .filter((item) => item.name);
}

export function serializeManifestText(items) {
  return toArray(items)
    .map((item) => `${item.name || item.commodity_name || item.material_name || 'Unknown'}: ${Number(item.quantity_scu || item.quantity || 0) || 1}`)
    .join('\n');
}

export function summarizeManifest(items, maxItems = 3) {
  const manifestItems = toArray(items);
  if (manifestItems.length === 0) {
    return 'No manifest attached';
  }

  const preview = manifestItems
    .slice(0, maxItems)
    .map((item) => `${item.name || item.commodity_name || item.material_name || 'Unknown'} x${Number(item.quantity_scu || item.quantity || 0) || 1}`)
    .join(', ');

  if (manifestItems.length <= maxItems) {
    return preview;
  }

  return `${preview} +${manifestItems.length - maxItems} more`;
}

export function buildPriceLookup(materials = [], commodities = []) {
  const lookup = new Map();

  toArray(materials).forEach((item) => {
    const key = normalizeName(item.material_name || item.name);
    if (!key) {
      return;
    }

    const candidate = Number(
      item.market_price_auec
      || item.market_value_aUEC
      || item.market_value
      || item.estimated_value_aUEC
      || item.unit_price_aUEC
      || item.value_aUEC
      || 0,
    ) || 0;

    if (candidate > 0) {
      lookup.set(key, Math.max(candidate, lookup.get(key) || 0));
    }
  });

  toArray(commodities).forEach((item) => {
    const key = normalizeName(item.commodity_name || item.name);
    if (!key) {
      return;
    }

    const candidate = Number(
      item.sell_price
      || item.buy_price
      || item.baseline_price
      || item.price
      || 0,
    ) || 0;

    if (candidate > 0) {
      lookup.set(key, Math.max(candidate, lookup.get(key) || 0));
    }
  });

  return lookup;
}

export function calculateManifestValue(items, priceLookup) {
  return toArray(items).reduce((sum, item) => {
    const name = item.name || item.commodity_name || item.material_name;
    const quantity = Number(item.quantity_scu || item.quantity || 0) || 0;
    const unitPrice = Number(item.unit_price_aUEC || item.unit_price || priceLookup?.get(normalizeName(name)) || 0) || 0;
    return sum + quantity * unitPrice;
  }, 0);
}

export function resolveRiskTier(requestedTier, manifestValue) {
  const normalized = String(requestedTier || '').trim().toUpperCase();
  if (['GREEN', 'AMBER', 'RED'].includes(normalized)) {
    return normalized;
  }

  if (manifestValue > 5000000) {
    return 'RED';
  }
  if (manifestValue >= 500000) {
    return 'AMBER';
  }
  return 'GREEN';
}

export function collateralMultiplierForTier(tier) {
  if (tier === 'RED') return 0.5;
  if (tier === 'AMBER') return 0.25;
  return 0.1;
}
