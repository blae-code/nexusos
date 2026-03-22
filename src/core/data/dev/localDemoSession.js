import { buildDevSession, getDevPersona } from './index';
import { mockStore } from './mockStore';

function resolvePersonaRecord(persona) {
  if (!persona?.userId) {
    return null;
  }

  return mockStore.get('NexusUser', persona.userId) || null;
}

export function getLocalDemoSession() {
  const persona = getDevPersona();
  if (!persona) {
    return null;
  }

  const record = resolvePersonaRecord(persona);
  return buildDevSession(persona, record || {});
}

export function getLocalDemoUser() {
  return getLocalDemoSession()?.user || null;
}
