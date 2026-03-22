import { mutateDemoState } from './_lib/store.js';

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

function makeId(prefix = 'demo') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);

  if (body.action === 'set_meta_secret') {
    const mutation = await mutateDemoState(async (state) => {
      state.meta = state.meta || {};
      state.meta.secrets = state.meta.secrets || {};
      state.meta.secrets[body.secretId] = body.value;
      return { secretId: body.secretId };
    });

    return res.status(200).json({
      ok: true,
      secretId: mutation.result.secretId,
      version: mutation.state.version,
    });
  }

  if (!body.entityType) {
    return res.status(400).json({ error: 'entityType is required' });
  }

  const mutation = await mutateDemoState(async (state) => {
    state.entities = state.entities || {};
    state.entities[body.entityType] = Array.isArray(state.entities[body.entityType]) ? state.entities[body.entityType] : [];
    const collection = state.entities[body.entityType];

    if (body.action === 'create') {
      const record = {
        id: body.data?.id || makeId(body.entityType.toLowerCase()),
        created_date: new Date().toISOString(),
        ...(body.data || {}),
      };
      collection.unshift(record);
      return { record };
    }

    const index = collection.findIndex((item) => item.id === body.id);
    if (index < 0) {
      throw new Error(`${body.entityType}:${body.id} not found`);
    }

    if (body.action === 'update') {
      collection[index] = { ...collection[index], ...(body.data || {}) };
      return { record: collection[index] };
    }

    if (body.action === 'delete') {
      collection.splice(index, 1);
      return { id: body.id };
    }

    throw new Error(`Unsupported action: ${body.action}`);
  }).catch((error) => ({ error }));

  if (mutation.error) {
    return res.status(400).json({ error: mutation.error.message || 'Mutation failed' });
  }

  return res.status(200).json({
    ok: true,
    ...(mutation.result || {}),
    version: mutation.state.version,
    updatedAt: mutation.state.updatedAt,
  });
}
