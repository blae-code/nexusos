import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import {
  AUTH_ONBOARDING_REQUIRED_FIELDS,
  resolveIssuedKeySession,
  sessionNoStoreHeaders,
  verifyAuthUserReadback,
} from '../auth/_shared/issuedKey/entry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: sessionNoStoreHeaders() });
  }

  try {
    const resolved = await resolveIssuedKeySession(req);
    if (!resolved?.user?.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: sessionNoStoreHeaders() });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'invalid_body' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    const consentGiven = body?.consent_given === true;
    const aiEnabled = body?.ai_features_enabled !== false;

    if (!consentGiven) {
      return Response.json({ error: 'consent_required' }, { status: 400, headers: sessionNoStoreHeaders() });
    }

    if (resolved.user.onboarding_complete) {
      return Response.json({ success: true, already_complete: true }, { headers: sessionNoStoreHeaders() });
    }

    const now = new Date().toISOString();
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.NexusUser.update(resolved.user.id, {
      consent_given: true,
      consent_timestamp: now,
      consent_version: body?.consent_version || '1.0',
      ai_features_enabled: aiEnabled,
      onboarding_complete: true,
    });

    const readback = await verifyAuthUserReadback(base44, resolved.user.id, {
      onboarding_complete: true,
      consent_given: true,
      consent_timestamp: now,
    }, AUTH_ONBOARDING_REQUIRED_FIELDS);

    if (!readback.ok) {
      return Response.json({
        error: 'schema_persist_failed',
        field_checks: readback.field_checks,
      }, { status: 500, headers: sessionNoStoreHeaders() });
    }

    return Response.json({ success: true }, { headers: sessionNoStoreHeaders() });
  } catch (error) {
    console.error('[completeOnboarding]', error);
    return Response.json({ error: 'onboarding_failed' }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
