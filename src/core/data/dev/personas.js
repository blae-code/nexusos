export const DEFAULT_TEMP_ACCESS_PERSONA_ID = 'voyager';

export const DEV_PERSONAS = [
  { id: 'pioneer', userId: 'u-pioneer', callsign: 'COMMODORE_BLAE', rank: 'PIONEER', discordId: 'dev-pioneer-001', label: 'Pioneer' },
  { id: 'founder', userId: 'u-founder', callsign: 'DEV_FOUNDER', rank: 'FOUNDER', discordId: 'dev-founder-001', label: 'Founder' },
  { id: 'scout', userId: 'u-scout', callsign: 'DEV_SCOUT', rank: 'SCOUT', discordId: 'dev-scout-001', label: 'Scout' },
  { id: 'voyager', userId: 'u-voyager', callsign: 'DEV_VOYAGER', rank: 'VOYAGER', discordId: 'dev-voyager-001', label: 'Voyager' },
  { id: 'vagrant', userId: 'u-vagrant', callsign: 'DEV_VAGRANT', rank: 'VAGRANT', discordId: 'dev-vagrant-001', label: 'Vagrant' },
  { id: 'affiliate', userId: 'u-affiliate', callsign: 'DEV_AFFILIATE', rank: 'AFFILIATE', discordId: 'dev-affiliate-001', label: 'Affiliate' },
];

export function getDevPersonaById(id) {
  return DEV_PERSONAS.find((persona) => persona.id === id) || null;
}

export function isValidDevPersonaId(id) {
  return DEV_PERSONAS.some((persona) => persona.id === id);
}
