import { buildLogoutCookies, buildPersonaCookies, resolveDemoSession } from './_lib/session.js';
import { getDemoState } from './_lib/store.js';
import { isValidDevPersonaId } from '../../src/core/data/dev/personas.js';

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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const state = await getDemoState();
    return res.status(200).json(resolveDemoSession(req, state));
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);
  const state = await getDemoState();

  if (body.action === 'logout') {
    res.setHeader('Set-Cookie', buildLogoutCookies(req));
    return res.status(200).json({ ok: true, authenticated: false, source: 'sandbox' });
  }

  if (body.action !== 'set_persona' || !body.persona_id) {
    return res.status(400).json({ error: 'persona_id is required' });
  }

  if (!isValidDevPersonaId(body.persona_id)) {
    return res.status(400).json({ error: 'Unknown persona_id' });
  }

  res.setHeader('Set-Cookie', buildPersonaCookies(req, body.persona_id));
  return res.status(200).json(resolveDemoSession({
    ...req,
    headers: {
      ...req.headers,
      cookie: `nexus_demo_persona=${body.persona_id}`,
    },
  }, state));
}
