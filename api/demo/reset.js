import { resetDemoState } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const state = await resetDemoState();
  return res.status(200).json({
    ok: true,
    version: state.version,
    updatedAt: state.updatedAt,
  });
}
