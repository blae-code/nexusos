/**
 * Debug function to test entity access with service role.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Test 1: Read NexusUser with service role
    let nexusUserResult;
    try {
      const users = await base44.asServiceRole.entities.NexusUser.list('-created_date', 3);
      nexusUserResult = { ok: true, count: (users || []).length, sample: (users || []).map(u => u.callsign).slice(0, 3) };
    } catch (err) {
      nexusUserResult = { ok: false, error: err?.message || String(err), status: err?.response?.status };
    }

    // Test 2: Read OrgShip with service role
    let orgShipResult;
    try {
      const ships = await base44.asServiceRole.entities.OrgShip.list('-created_date', 3);
      orgShipResult = { ok: true, count: (ships || []).length };
    } catch (err) {
      orgShipResult = { ok: false, error: err?.message || String(err), status: err?.response?.status };
    }

    // Test 3: Read Material with service role
    let materialResult;
    try {
      const mats = await base44.asServiceRole.entities.Material.list('-created_date', 3);
      materialResult = { ok: true, count: (mats || []).length };
    } catch (err) {
      materialResult = { ok: false, error: err?.message || String(err), status: err?.response?.status };
    }

    return Response.json({
      nexusUser: nexusUserResult,
      orgShip: orgShipResult,
      material: materialResult,
    });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
});