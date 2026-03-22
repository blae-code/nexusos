import { getDemoState } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const state = await getDemoState();
  if (req.query?.meta === '1') {
    return res.status(200).json({
      version: state.version,
      updatedAt: state.updatedAt,
      meta: state.meta,
    });
  }

  return res.status(200).json(state);
}
