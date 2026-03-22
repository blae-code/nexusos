import { kv } from '@vercel/kv';
import { getInitialMockState } from '../../../src/core/data/dev/mockStore.js';

const MEMORY_KEY = '__NEXUSOS_SHARED_DEMO_STATE__';
const DEMO_NAMESPACE = process.env.DEMO_SANDBOX_NAMESPACE || 'default';
const DEMO_SEED_VERSION = process.env.DEMO_SANDBOX_SEED_VERSION || 'v1';
const DEMO_STATE_KEY = `nexusos:demo:${DEMO_NAMESPACE}:${DEMO_SEED_VERSION}`;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function buildSeedState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    seedVersion: DEMO_SEED_VERSION,
    meta: {
      mode: 'shared',
      namespace: DEMO_NAMESPACE,
      secrets: {},
    },
    entities: getInitialMockState(),
  };
}

function getMemoryState() {
  if (!globalThis[MEMORY_KEY]) {
    globalThis[MEMORY_KEY] = buildSeedState();
  }

  return clone(globalThis[MEMORY_KEY]);
}

function setMemoryState(state) {
  globalThis[MEMORY_KEY] = clone(state);
  return clone(globalThis[MEMORY_KEY]);
}

export async function getDemoState() {
  if (!hasKvConfig()) {
    return getMemoryState();
  }

  const state = await kv.get(DEMO_STATE_KEY);
  if (!state || state.seedVersion !== DEMO_SEED_VERSION) {
    const seeded = buildSeedState();
    await kv.set(DEMO_STATE_KEY, seeded);
    return seeded;
  }

  return state;
}

export async function saveDemoState(state) {
  const next = clone(state);
  if (!hasKvConfig()) {
    return setMemoryState(next);
  }

  await kv.set(DEMO_STATE_KEY, next);
  return next;
}

export async function mutateDemoState(mutator) {
  const state = await getDemoState();
  const draft = clone(state);
  const result = await mutator(draft);
  draft.version = Number(draft.version || 0) + 1;
  draft.updatedAt = new Date().toISOString();
  const saved = await saveDemoState(draft);
  return { state: saved, result };
}

export async function resetDemoState() {
  const seeded = buildSeedState();
  return saveDemoState(seeded);
}
