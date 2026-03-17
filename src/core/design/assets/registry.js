import arrowSvg from '../../../apps/armory/assets/ships/arrow.svg';
import c2HerculesSvg from '../../../apps/armory/assets/ships/c2-hercules.svg';
import carrackSvg from '../../../apps/armory/assets/ships/carrack.svg';
import caterpillarSvg from '../../../apps/armory/assets/ships/caterpillar.svg';
import cutlassBlackSvg from '../../../apps/armory/assets/ships/cutlass-black.svg';
import gladiusSvg from '../../../apps/armory/assets/ships/gladius.svg';
import hullCSvg from '../../../apps/armory/assets/ships/hull-c.svg';
import moleSvg from '../../../apps/armory/assets/ships/mole.svg';
import piscesSvg from '../../../apps/armory/assets/ships/pisces.svg';
import prospectorSvg from '../../../apps/armory/assets/ships/prospector.svg';
import razorSvg from '../../../apps/armory/assets/ships/razor.svg';

const PUBLIC_TOKEN_PREFIX = '../public/tokens';
const PUBLIC_TOKEN_RUNTIME_PREFIX = '/tokens';

function normalizeAssetKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function publicTokenPath(filename) {
  return `${PUBLIC_TOKEN_PREFIX}/${filename}`;
}

function runtimeTokenPath(filename) {
  return `${PUBLIC_TOKEN_RUNTIME_PREFIX}/${filename}`;
}

function makeEntry(path, type, tags) {
  return { path, type, tags };
}

function buildColorFamily(prefix, colors, type, tags = []) {
  return Object.fromEntries(
    colors.map((color) => [
      normalizeAssetKey(`${prefix}-${color}`),
      makeEntry(publicTokenPath(`token-${prefix}-${color}.png`), type, [...tags, prefix, color]),
    ]),
  );
}

function buildNumberFamily(type = 'icon') {
  const colors = ['blue', 'cyan', 'green', 'purple', 'purple-1', 'purple-2', 'red', 'yellow'];
  const entries = {};
  for (let number = 0; number <= 13; number += 1) {
    colors.forEach((color) => {
      const key = normalizeAssetKey(`number-${number}-${color}`);
      entries[key] = makeEntry(publicTokenPath(`token-number-${number}-${color}.png`), type, ['number', String(number), color]);
    });
  }
  return entries;
}

const shipRuntimePathMap = {
  'apps/armory/assets/ships/arrow.svg': arrowSvg,
  'apps/armory/assets/ships/c2-hercules.svg': c2HerculesSvg,
  'apps/armory/assets/ships/carrack.svg': carrackSvg,
  'apps/armory/assets/ships/caterpillar.svg': caterpillarSvg,
  'apps/armory/assets/ships/cutlass-black.svg': cutlassBlackSvg,
  'apps/armory/assets/ships/gladius.svg': gladiusSvg,
  'apps/armory/assets/ships/hull-c.svg': hullCSvg,
  'apps/armory/assets/ships/mole.svg': moleSvg,
  'apps/armory/assets/ships/pisces.svg': piscesSvg,
  'apps/armory/assets/ships/prospector.svg': prospectorSvg,
  'apps/armory/assets/ships/razor.svg': razorSvg,
};

export const ships = {
  prospector: makeEntry('apps/armory/assets/ships/prospector.svg', 'icon', ['ship', 'mining', 'misc', 'prospector']),
  mole: makeEntry('apps/armory/assets/ships/mole.svg', 'icon', ['ship', 'mining', 'argo', 'mole']),
  caterpillar: makeEntry('apps/armory/assets/ships/caterpillar.svg', 'icon', ['ship', 'drake', 'freighter', 'caterpillar']),
  'c2-hercules': makeEntry('apps/armory/assets/ships/c2-hercules.svg', 'icon', ['ship', 'freighter', 'crusader', 'c2', 'hercules']),
  'hull-c': makeEntry('apps/armory/assets/ships/hull-c.svg', 'icon', ['ship', 'freighter', 'misc', 'hull-c']),
  arrow: makeEntry('apps/armory/assets/ships/arrow.svg', 'icon', ['ship', 'fighter', 'anvil', 'arrow']),
  gladius: makeEntry('apps/armory/assets/ships/gladius.svg', 'icon', ['ship', 'fighter', 'aegis', 'gladius']),
  'cutlass-black': makeEntry('apps/armory/assets/ships/cutlass-black.svg', 'icon', ['ship', 'drake', 'escort', 'cutlass-black']),
  carrack: makeEntry('apps/armory/assets/ships/carrack.svg', 'icon', ['ship', 'support', 'exploration', 'anvil', 'carrack']),
  pisces: makeEntry('apps/armory/assets/ships/pisces.svg', 'icon', ['ship', 'support', 'shuttle', 'anvil', 'pisces']),
  razor: makeEntry('apps/armory/assets/ships/razor.svg', 'icon', ['ship', 'racing', 'mirai', 'razor']),
};

export const locations = {
  stanton: makeEntry(publicTokenPath('token-circle-blue.png'), 'emblem', ['system', 'stanton', 'location']),
  pyro: makeEntry(publicTokenPath('token-circle-orange.png'), 'emblem', ['system', 'pyro', 'location']),
  nyx: makeEntry(publicTokenPath('token-circle-cyan.png'), 'emblem', ['system', 'nyx', 'location']),
  'space-station': makeEntry(publicTokenPath('token-shelter-blue.png'), 'icon', ['location', 'space-station', 'orbital', 'station']),
  'planetary-outpost': makeEntry(publicTokenPath('token-shelter-cyan.png'), 'icon', ['location', 'planetary-outpost', 'outpost']),
  'lagrange-point': makeEntry(publicTokenPath('token-objective-blue.png'), 'icon', ['location', 'lagrange-point', 'lagrange']),
  'moon-settlement': makeEntry(publicTokenPath('token-shelter-yellow.png'), 'icon', ['location', 'moon-settlement', 'moon']),
  ...buildColorFamily('hospital', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['location', 'medical']),
  ...buildColorFamily('shelter', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['location', 'shelter']),
};

export const orgs = {
  'redscar-nomads': makeEntry(publicTokenPath('token-penta-red.png'), 'emblem', ['org', 'redscar', 'nomads', 'emblem']),
};

export const commodities = {
  agricium: makeEntry(publicTokenPath('token-hex-cyan.png'), 'icon', ['commodity', 'ore', 'agricium']),
  laranite: makeEntry(publicTokenPath('token-hex-yellow.png'), 'icon', ['commodity', 'ore', 'laranite']),
  quantanium: makeEntry(publicTokenPath('token-hex-green.png'), 'icon', ['commodity', 'ore', 'quantanium']),
  taranite: makeEntry(publicTokenPath('token-hex-red.png'), 'icon', ['commodity', 'ore', 'taranite']),
  titanium: makeEntry(publicTokenPath('token-hex-blue.png'), 'icon', ['commodity', 'ore', 'titanium']),
  copper: makeEntry(publicTokenPath('token-hex-orange.png'), 'icon', ['commodity', 'ore', 'copper']),
  gold: makeEntry(publicTokenPath('token-hex-yellow.png'), 'icon', ['commodity', 'ore', 'gold']),
  diamond: makeEntry(publicTokenPath('token-square-cyan.png'), 'icon', ['commodity', 'mineral', 'diamond']),
  corundum: makeEntry(publicTokenPath('token-square-grey.png'), 'icon', ['commodity', 'mineral', 'corundum']),
  quartz: makeEntry(publicTokenPath('token-square-blue.png'), 'icon', ['commodity', 'mineral', 'quartz']),
  inert: makeEntry(publicTokenPath('token-square-grey.png'), 'icon', ['commodity', 'ore', 'inert']),
  'medical-supplies': makeEntry(publicTokenPath('token-hospital-green.png'), 'icon', ['commodity', 'medical-supplies', 'medical']),
  'processed-food': makeEntry(publicTokenPath('token-food-orange.png'), 'icon', ['commodity', 'food', 'processed-food']),
  'distilled-spirits': makeEntry(publicTokenPath('token-food-purple.png'), 'icon', ['commodity', 'spirits', 'distilled-spirits']),
  altruciatoxin: makeEntry(publicTokenPath('token-energy-red.png'), 'icon', ['commodity', 'altruciatoxin', 'chemical']),
  ...buildColorFamily('ammunition', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['commodity', 'ammunition']),
  ...buildColorFamily('energy', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['commodity', 'energy']),
  ...buildColorFamily('food', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['commodity', 'food']),
  ...buildColorFamily('fuel', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['commodity', 'fuel']),
  ...buildColorFamily('mechanics', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['commodity', 'mechanics']),
};

export const ui = {
  mining: makeEntry(publicTokenPath('token-hex-cyan.png'), 'emblem', ['ui', 'op-type', 'mining']),
  salvage: makeEntry(publicTokenPath('token-mechanics-orange.png'), 'emblem', ['ui', 'op-type', 'salvage']),
  combat: makeEntry(publicTokenPath('token-target-red.png'), 'emblem', ['ui', 'op-type', 'combat']),
  escort: makeEntry(publicTokenPath('token-target-alt-blue.png'), 'emblem', ['ui', 'op-type', 'escort']),
  rescue: makeEntry(publicTokenPath('token-hospital-green.png'), 'emblem', ['ui', 'op-type', 'rescue']),
  exploration: makeEntry(publicTokenPath('token-objective-blue.png'), 'emblem', ['ui', 'op-type', 'exploration']),
  delivery: makeEntry(publicTokenPath('token-fuel-yellow.png'), 'emblem', ['ui', 'op-type', 'delivery']),
  scouting: makeEntry(publicTokenPath('token-circle-green.png'), 'emblem', ['ui', 'op-type', 'scouting']),
  hauling: makeEntry(publicTokenPath('token-fuel-cyan.png'), 'emblem', ['ui', 'op-type', 'hauling']),
  racing: makeEntry(publicTokenPath('token-triangle-violet.png'), 'emblem', ['ui', 'op-type', 'racing']),
  ...buildColorFamily('circle', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'circle']),
  ...buildColorFamily('hex', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'hex']),
  ...buildColorFamily('objective', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'objective']),
  ...buildColorFamily('penta', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet'], 'icon', ['ui', 'shape', 'penta']),
  ...buildColorFamily('square', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'square']),
  ...buildColorFamily('target', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'target']),
  ...buildColorFamily('target-alt', ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'], 'icon', ['ui', 'shape', 'target-alt']),
  ...buildColorFamily('triangle', ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'yellow', 'violet'], 'icon', ['ui', 'shape', 'triangle']),
  ...buildNumberFamily('icon'),
};

export const misc = {};

export const assetRegistry = {
  ships,
  locations,
  orgs,
  commodities,
  ui,
  misc,
};

export const assetRuntimeSrcMap = {
  ...Object.fromEntries(
    Object.values(assetRegistry)
      .flatMap((category) => Object.values(category))
      .filter((entry) => entry.path.startsWith(PUBLIC_TOKEN_PREFIX))
      .map((entry) => [entry.path, entry.path.replace(PUBLIC_TOKEN_PREFIX, PUBLIC_TOKEN_RUNTIME_PREFIX)]),
  ),
  ...shipRuntimePathMap,
};

export const assetLookup = Object.fromEntries(
  Object.values(assetRegistry)
    .flatMap((category) => Object.entries(category))
    .flatMap(([key, entry]) => {
      const fullEntry = { key, ...entry };
      const aliases = [normalizeAssetKey(key), ...(entry.tags || []).map((tag) => normalizeAssetKey(tag))];
      return [...new Set(aliases)].map((alias) => [alias, fullEntry]);
    }),
);

export function resolveAssetEntry(key) {
  const normalized = normalizeAssetKey(key);
  return assetLookup[normalized] || null;
}

export function resolveAssetSrc(path) {
  return assetRuntimeSrcMap[path] || null;
}

export { normalizeAssetKey };
