import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_SOURCE,
  mergeReferenceOptions,
  preserveLegacyReferenceOptions,
  resolveLegacyReplacement,
} from '../src/core/data/sc-reference-registry.js';
import { resolveSCReferenceOptions } from '../src/core/data/sc-reference-core.js';

test('mergeReferenceOptions prefers live cache entries over registry duplicates', () => {
  const merged = mergeReferenceOptions(
    [{
      value: 'Quantanium',
      label: 'Quantanium',
      group: 'Registry',
      source: REFERENCE_SOURCE.PATCH_REGISTRY,
    }],
    [{
      value: 'Quantanium',
      label: 'Quantanium',
      group: 'Commodities',
      source: REFERENCE_SOURCE.LIVE_CACHE,
      meta: { kind: 'Commodity' },
    }],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, REFERENCE_SOURCE.LIVE_CACHE);
  assert.equal(merged[0].group, 'Commodities');
});

test('legacy location aliases resolve to the new canonical replacement', () => {
  assert.equal(resolveLegacyReplacement('locations', 'Port Olisar'), 'Seraphim Station');
});

test('preserveLegacyReferenceOptions adds deprecated values without discarding current choices', () => {
  const options = preserveLegacyReferenceOptions([
    {
      value: 'Seraphim Station',
      label: 'Seraphim Station',
      group: 'Stanton',
      source: REFERENCE_SOURCE.PATCH_REGISTRY,
    },
  ], 'Port Olisar', 'locations');

  const deprecated = options.find((option) => option.value === 'Port Olisar');
  assert.ok(deprecated);
  assert.equal(deprecated.deprecated, true);
  assert.equal(deprecated.replacement, 'Seraphim Station');
});

test('resolveSCReferenceOptions falls back to the registry when caches are empty', () => {
  const result = resolveSCReferenceOptions({
    domain: 'systems',
    context: {},
    gameCache: { items: [], commodities: [], vehicles: [], loading: false },
  });

  assert.equal(result.loading, false);
  assert.deepEqual(
    result.options.map((option) => option.value),
    ['NYX', 'PYRO', 'STANTON'],
  );
});

test('resolveSCReferenceOptions merges tradeable cache data and preserves legacy item names', () => {
  const result = resolveSCReferenceOptions({
    domain: 'tradeable-items',
    context: { currentValue: 'Legacy Compound' },
    gameCache: {
      loading: false,
      items: [{ name: 'MedPen', type: 'Consumable', manufacturer: 'Greycat', last_synced: '2026-04-01T00:00:00.000Z' }],
      commodities: [{ name: 'Quantanium', type: 'Ore', best_sell_terminal: 'Area 18 TDD', last_synced: '2026-04-01T00:00:00.000Z' }],
      vehicles: [],
    },
  });

  assert.ok(result.options.find((option) => option.value === 'Quantanium'));
  assert.ok(result.options.find((option) => option.value === 'MedPen'));
  const legacy = result.options.find((option) => option.value === 'Legacy Compound');
  assert.ok(legacy);
  assert.equal(legacy.deprecated, true);
});
