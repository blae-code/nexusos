export const CORE_PRODUCT_SURFACES = new Set(['industry', 'market']);

const FUTURE_FEATURES = [
  {
    key: 'operations',
    title: 'Operations Command',
    accent: '#C0392B',
    paths: ['/app/ops'],
    teaser: 'Ops Board, rescue workflows, and live mission command',
    description: 'Operations planning, live mission command, rescue flows, and archive tooling are deferred while this release locks industrial logging and market intelligence.',
  },
  {
    key: 'intel',
    title: 'Scout Intelligence',
    accent: '#7AAECC',
    paths: ['/app/scout'],
    teaser: 'Deposit intel, route planning, and map overlays',
    description: 'Scout-driven deposit mapping, route planning, and spatial intel overlays are parked for a later release cycle.',
  },
  {
    key: 'fleet',
    title: 'Fleet And Armory',
    accent: '#4A8C5C',
    paths: ['/app/armory'],
    teaser: 'Checkout workflows, ship readiness, and fleet ops',
    description: 'Fleet readiness, checkout operations, and armory management remain in design while Industry inventory stays the active custody surface.',
  },
  {
    key: 'org',
    title: 'Org Console',
    accent: '#C8A84B',
    paths: ['/app/roster', '/app/handbook', '/app/training'],
    teaser: 'Roster, handbook, debt tracking, and training',
    description: 'Org management, handbook, debt tracking, and training surfaces are hidden until the industrial release is stable.',
  },
  {
    key: 'pilot',
    title: 'Pilot Settings',
    accent: '#9A9488',
    paths: ['/app/settings', '/app/profile'],
    teaser: 'Profile, wallet, and personal configuration',
    description: 'Pilot profile and settings screens are deferred while the current release concentrates on materials, crafting, and market workflows.',
  },
  {
    key: 'admin',
    title: 'Admin Console',
    accent: '#8E44AD',
    paths: ['/app/admin', '/app/keys'],
    teaser: 'Keys, admin settings, readiness, and raw data tools',
    description: 'Administrative utilities are intentionally out of the current product path and will return after the industry-first release hardens.',
  },
];

export function getFutureFeatureDescriptor(pathname = '') {
  return FUTURE_FEATURES.find((feature) =>
    feature.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
  ) || null;
}

export const FUTURE_FEATURE_TEASERS = FUTURE_FEATURES.map((feature) => ({
  key: feature.key,
  title: feature.title,
  accent: feature.accent,
  teaser: feature.teaser,
}));
