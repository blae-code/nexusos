/**
 * heartbeat — lightweight presence ping.
 * Updates the current user's last_seen_at timestamp.
 * Called every ~3 minutes from the frontend.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const enc = new TextEncoder();
const NO_STORE = { 'Cache-Control': 'no-store' };

function toBase64Url(bytes) { return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function fromBase64Url(v) { const p = v.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(v.length / 4) * 4, '='); return Uint8Array.from(atob(p), c => c.charCodeAt(0)); }
function parseCookies(req) { const raw = req.headers.get('cookie') || ''; return raw.split(';').reduce((a, p) => { const t = p.trim(); if (!t) return a; const i = t.indexOf('='); if (i === -1) return a; a[t.slice(0, i)] = decodeURIComponent(t.slice(i + 1)); return a; }, {}); }
async function signValue(v, s) { const k = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const sig = await crypto.subtle.sign('HMAC', k, enc.encode(v)); return toBase64Url(new Uint8Array(sig)); }

async function resolveUser(req) {
  const secret = Deno.env.get('SESSION_SIGNING_SECRET');
  if (!secret) return null;
  const token = parseCookies(req)['nexus_member_session'];
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (sig !== await signValue(body, secret)) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!d.exp || d.exp < Date.now() || !d.user_id) return null;
    return d.user_id;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405, headers: NO_STORE });
  }

  try {
    const userId = await resolveUser(req);
    if (!userId) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.NexusUser.update(userId, {
      last_seen_at: new Date().toISOString(),
    });

    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[heartbeat]', error);
    return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
});