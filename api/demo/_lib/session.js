import {
  DEFAULT_TEMP_ACCESS_PERSONA_ID,
  DEV_PERSONAS,
  isValidDevPersonaId,
} from '../../../src/core/data/dev/personas.js';
import { isSecureRequest, parseCookies, serializeCookie } from './cookies.js';

export const DEMO_PERSONA_COOKIE = 'nexus_demo_persona';
export const DEMO_SIGNED_OUT_COOKIE = 'nexus_demo_signed_out';

function findPersonaById(id) {
  return DEV_PERSONAS.find((persona) => persona.id === id) || null;
}

function getPersonaFromCookies(req) {
  const cookies = parseCookies(req);
  if (cookies[DEMO_SIGNED_OUT_COOKIE] === '1' && !cookies[DEMO_PERSONA_COOKIE]) {
    return null;
  }

  return findPersonaById(cookies[DEMO_PERSONA_COOKIE] || DEFAULT_TEMP_ACCESS_PERSONA_ID);
}

function buildSessionUser(persona, state) {
  const records = Array.isArray(state?.entities?.NexusUser) ? state.entities.NexusUser : [];
  const record = records.find((item) => item.id === persona.userId) || {};
  return {
    id: record.id || persona.userId,
    discordId: record.discord_id || persona.discordId,
    callsign: record.callsign || persona.callsign,
    rank: record.nexus_rank || record.rank || persona.rank,
    discordRoles: record.discord_roles || [persona.rank],
    joinedAt: record.joined_at || '2025-01-01T00:00:00Z',
    onboarding_complete: record.onboarding_complete ?? true,
    wallet_balance: record.wallet_balance || 0,
  };
}

export function resolveDemoSession(req, state) {
  const persona = getPersonaFromCookies(req);
  if (!persona) {
    return {
      authenticated: false,
      source: 'sandbox',
      status: 401,
    };
  }

  return {
    authenticated: true,
    source: 'sandbox',
    persona_id: persona.id,
    user: buildSessionUser(persona, state),
  };
}

export function buildPersonaCookies(req, personaId) {
  const secure = isSecureRequest(req);
  return [
    serializeCookie(DEMO_PERSONA_COOKIE, personaId, { maxAge: 60 * 60 * 24 * 30, sameSite: 'Lax', secure }),
    serializeCookie(DEMO_SIGNED_OUT_COOKIE, '0', { maxAge: 0, sameSite: 'Lax', secure }),
  ];
}

export function buildLogoutCookies(req) {
  const secure = isSecureRequest(req);
  return [
    serializeCookie(DEMO_PERSONA_COOKIE, '', { maxAge: 0, sameSite: 'Lax', secure }),
    serializeCookie(DEMO_SIGNED_OUT_COOKIE, '1', { maxAge: 60 * 60 * 24 * 30, sameSite: 'Lax', secure }),
  ];
}
