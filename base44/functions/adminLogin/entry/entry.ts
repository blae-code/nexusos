// Admin login bypass — email-allowlist based, no Discord required.
// This endpoint only verifies the allowlist and returns an admin sandbox profile.

const ADMIN_ALLOWLIST = [
  { email: 'blae@katrasoluta.com', callsign: 'SYSTEM-ADMIN', rank: 'PIONEER' },
  { email: 'nicdel26@gmail.com', callsign: 'NICDEL', rank: 'PIONEER' },
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  const adminEntry = ADMIN_ALLOWLIST.find((candidate) => candidate.email.toLowerCase() === email);
  if (!adminEntry) {
    return Response.json({ error: 'Access denied — email not authorised' }, { status: 403 });
  }

  return Response.json({
    ok: true,
    id: `admin:${email.replace(/[^a-z0-9]/g, '_')}`,
    email,
    name: 'System Administrator',
    callsign: adminEntry.callsign,
    rank: adminEntry.rank,
    redirect: '/app/industry',
    mode: 'admin_sandbox',
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
});
