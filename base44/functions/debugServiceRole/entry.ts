import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Test 1: Try listing NexusUser with asServiceRole
    let nexusUserResult = null;
    let nexusUserError = null;
    try {
      const users = await base44.asServiceRole.entities.NexusUser.list('-created_date', 3);
      nexusUserResult = { count: (users || []).length, first: (users || [])[0]?.callsign || null };
    } catch (e) {
      nexusUserError = e.message || String(e);
    }

    // Test 2: Try listing Op with asServiceRole (a different entity for comparison)
    let opResult = null;
    let opError = null;
    try {
      const ops = await base44.asServiceRole.entities.Op.list('-created_date', 3);
      opResult = { count: (ops || []).length };
    } catch (e) {
      opError = e.message || String(e);
    }

    // Test 3: Try listing NexusUser with regular (non-service) role
    let regularResult = null;
    let regularError = null;
    try {
      const users = await base44.entities.NexusUser.list('-created_date', 3);
      regularResult = { count: (users || []).length };
    } catch (e) {
      regularError = e.message || String(e);
    }

    return Response.json({
      ok: true,
      tests: {
        nexusUser_serviceRole: nexusUserError ? { error: nexusUserError } : nexusUserResult,
        op_serviceRole: opError ? { error: opError } : opResult,
        nexusUser_regular: regularError ? { error: regularError } : regularResult,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});