// Active in Vite dev server OR when VITE_DEMO_MODE=true is baked into the build.
const meta = /** @type {{ env?: { DEV?: boolean; VITE_DEMO_MODE?: string } }} */ (import.meta);

export const IS_DEV_MODE = meta.env?.DEV === true || meta.env?.VITE_DEMO_MODE === 'true';

const DEV_SESSION_KEY = 'nexus_dev_persona';

export const DEV_PERSONAS = [
  { id: 'pioneer',   callsign: 'COMMODORE_BLAE', rank: 'PIONEER',   discordId: 'dev-pioneer-001',   label: 'Pioneer' },
  { id: 'founder',   callsign: 'DEV_FOUNDER',    rank: 'FOUNDER',    discordId: 'dev-founder-001',   label: 'Founder' },
  { id: 'scout',     callsign: 'DEV_SCOUT',      rank: 'SCOUT',      discordId: 'dev-scout-001',     label: 'Scout' },
  { id: 'voyager',   callsign: 'DEV_VOYAGER',    rank: 'VOYAGER',    discordId: 'dev-voyager-001',   label: 'Voyager' },
  { id: 'vagrant',   callsign: 'DEV_VAGRANT',    rank: 'VAGRANT',    discordId: 'dev-vagrant-001',   label: 'Vagrant' },
  { id: 'affiliate', callsign: 'DEV_AFFILIATE',  rank: 'AFFILIATE',  discordId: 'dev-affiliate-001', label: 'Affiliate' },
];

export function getDevPersona() {
  if (!IS_DEV_MODE || typeof sessionStorage === 'undefined') return null;
  const id = sessionStorage.getItem(DEV_SESSION_KEY);
  return DEV_PERSONAS.find(p => p.id === id) || null;
}

export function setDevPersona(id) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(DEV_SESSION_KEY, id);
  }
}

export function clearDevPersona() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(DEV_SESSION_KEY);
  }
}

export function buildDevSession(persona) {
  return {
    authenticated: true,
    source: 'member',
    user: {
      id: `dev-user-${persona.id}`,
      discordId: persona.discordId,
      callsign: persona.callsign,
      rank: persona.rank,
      discordRoles: [persona.rank],
      joinedAt: '2025-01-01T00:00:00Z',
    },
  };
}
