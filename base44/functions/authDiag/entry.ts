/**
 * POST /authDiag — Diagnose service role access to NexusUser entity.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const results = {};

  try {
    const base44 = createClientFromRequest(req);
    results.sdk_created = true;

    // Test 1: Try asServiceRole entities list
    try {
      const users = await base44.asServiceRole.entities.NexusUser.list('-created_date', 3);
      results.service_role_list = { ok: true, count: (users || []).length };
    } catch (e) {
      results.service_role_list = { ok: false, error: e.message, status: e.response?.status };
    }

    // Test 2: Try user-scoped entities list
    try {
      const users = await base44.entities.NexusUser.list('-created_date', 3);
      results.user_scope_list = { ok: true, count: (users || []).length };
    } catch (e) {
      results.user_scope_list = { ok: false, error: e.message, status: e.response?.status };
    }

    // Test 3: Try asServiceRole filter
    try {
      const users = await base44.asServiceRole.entities.NexusUser.filter({}, '-created_date', 3);
      results.service_role_filter = { ok: true, count: (users || []).length };
    } catch (e) {
      results.service_role_filter = { ok: false, error: e.message, status: e.response?.status };
    }

    // Test 4: Check auth.me
    try {
      const me = await base44.auth.me();
      results.auth_me = { ok: true, email: me?.email, role: me?.role };
    } catch (e) {
      results.auth_me = { ok: false, error: e.message };
    }

    // Test 5: Check if SESSION_SIGNING_SECRET is set
    results.signing_secret_set = Boolean(Deno.env.get('SESSION_SIGNING_SECRET')?.trim());
    results.app_url = Deno.env.get('APP_URL') || 'not set';

  } catch (e) {
    results.top_level_error = e.message;
  }

  return Response.json(results);
});