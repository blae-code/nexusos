import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createNotification } from '../_shared/nexusNotification/entry.ts';
import { requireAdminSession, sessionNoStoreHeaders } from '../auth/_shared/issuedKey/entry.ts';

type ReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  severity: 'critical' | 'warn' | 'info';
  detail: string;
  meta?: Record<string, unknown>;
};

type CleanupTarget = {
  entity: string;
  id: string;
};

const ENTITY_AUDIT_PLAN = [
  { id: 'NexusUser', label: 'Issued users', severity: 'critical' },
  { id: 'NexusNotification', label: 'Notifications', severity: 'critical' },
  { id: 'Material', label: 'Industry materials', severity: 'critical' },
  { id: 'Blueprint', label: 'Blueprint registry', severity: 'critical' },
  { id: 'CraftQueue', label: 'Craft queue', severity: 'critical' },
  { id: 'RefineryOrder', label: 'Refinery orders', severity: 'critical' },
  { id: 'CofferLog', label: 'Org coffer', severity: 'critical' },
  { id: 'PriceSnapshot', label: 'Price snapshots', severity: 'critical' },
  { id: 'GameCacheCommodity', label: 'Commodity cache', severity: 'critical' },
  { id: 'GameCacheItem', label: 'Item cache', severity: 'warn' },
  { id: 'FabricationJob', label: 'Fabrication jobs', severity: 'warn' },
  { id: 'ScoutDeposit', label: 'Scout deposits', severity: 'critical' },
  { id: 'Op', label: 'Operations', severity: 'critical' },
  { id: 'OpRsvp', label: 'Op RSVPs', severity: 'critical' },
  { id: 'RescueCall', label: 'Rescue board', severity: 'critical' },
  { id: 'OrgShip', label: 'Fleet registry', severity: 'critical' },
  { id: 'ArmoryItem', label: 'Armory stock', severity: 'critical' },
  { id: 'Wallet', label: 'Member wallets', severity: 'critical' },
  { id: 'Transaction', label: 'Wallet transactions', severity: 'critical' },
  { id: 'Contract', label: 'Contracts', severity: 'critical' },
  { id: 'CargoLog', label: 'Cargo logs', severity: 'critical' },
  { id: 'CargoJob', label: 'Cargo jobs', severity: 'critical' },
  { id: 'Consignment', label: 'Consignments', severity: 'critical' },
  { id: 'MemberDebt', label: 'Debt tracker', severity: 'warn' },
  { id: 'PersonalAsset', label: 'Personal assets', severity: 'warn' },
];

const SAMPLE_DATA_SCAN_PLAN = [
  { entity: 'NexusUser', fields: ['login_name', 'username', 'callsign'] },
  { entity: 'NexusNotification', fields: ['title', 'body', 'type'] },
  { entity: 'Material', fields: ['material_name', 'notes'] },
  { entity: 'Blueprint', fields: ['item_name', 'owned_by_callsign'] },
  { entity: 'ScoutDeposit', fields: ['material_name', 'location_detail', 'reported_by_callsign'] },
  { entity: 'Op', fields: ['title', 'location', 'notes'] },
  { entity: 'OrgShip', fields: ['name', 'model', 'assigned_to_callsign'] },
  { entity: 'Wallet', fields: ['member_id'] },
  { entity: 'Transaction', fields: ['description', 'reference_type'] },
  { entity: 'Contract', fields: ['title', 'description', 'pickup_location', 'delivery_location'] },
  { entity: 'CargoLog', fields: ['commodity', 'origin_station', 'destination_station', 'notes'] },
  { entity: 'CargoJob', fields: ['title', 'pickup_location', 'delivery_location', 'notes'] },
  { entity: 'Consignment', fields: ['title', 'notes'] },
  { entity: 'MemberDebt', fields: ['description'] },
  { entity: 'PersonalAsset', fields: ['name', 'notes'] },
];

const CLEANUP_ALLOWLIST = new Set([
  'NexusUser',
  'NexusNotification',
  'Material',
  'RefineryOrder',
  'CofferLog',
  'ScoutDeposit',
  'Op',
  'OpRsvp',
  'OrgShip',
  'ArmoryItem',
  'Wallet',
  'Transaction',
  'Contract',
  'CargoLog',
  'CargoJob',
  'Consignment',
  'MemberDebt',
  'PersonalAsset',
]);

const SAMPLE_DATA_PATTERN = /(?:^|[\s:_-])(qa|demo|sample|example|mock|seed|fixture|playwright|e2e|prod-readiness|test)(?:$|[\s:_-])/i;

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status, headers: sessionNoStoreHeaders() });
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isOk(checks: ReadinessCheck[]) {
  return checks.every((check) => check.ok);
}

function summarizeFailures(checks: ReadinessCheck[]) {
  return checks.filter((check) => !check.ok).map((check) => ({
    id: check.id,
    severity: check.severity,
    detail: check.detail,
  }));
}

function appUrlPath(pathname: string) {
  const appUrl = textValue(Deno.env.get('APP_URL'));
  if (!appUrl) {
    throw new Error('APP_URL not configured');
  }
  return new URL(pathname, appUrl).toString();
}

async function invokeLiveFunction(req: Request, pathname: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const cookie = req.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(appUrlPath(pathname), {
    ...init,
    headers,
  });
  const data = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function listEntityRecords(base44: any, entityName: string, limit = 25) {
  const entity = base44.asServiceRole.entities[entityName];
  if (!entity || typeof entity.list !== 'function') {
    throw new Error('entity_not_available');
  }

  const records = await entity.list('-created_date', limit).catch(async () => {
    return await entity.list().catch(() => {
      throw new Error('entity_unreadable');
    });
  });

  return toArray(records);
}

async function runEntityAudit(base44: any): Promise<ReadinessCheck[]> {
  const results = await Promise.all(ENTITY_AUDIT_PLAN.map(async (entityConfig) => {
    try {
      const records = await listEntityRecords(base44, entityConfig.id, 5);
      return {
        id: entityConfig.id,
        label: entityConfig.label,
        ok: true,
        severity: entityConfig.severity,
        detail: `${records.length} record${records.length === 1 ? '' : 's'} readable from ${entityConfig.id}.`,
        meta: { entity: entityConfig.id, record_count: records.length },
      } satisfies ReadinessCheck;
    } catch (error) {
      return {
        id: entityConfig.id,
        label: entityConfig.label,
        ok: false,
        severity: entityConfig.severity,
        detail: `${entityConfig.id} unavailable: ${error instanceof Error ? error.message : 'unknown_error'}`,
      } satisfies ReadinessCheck;
    }
  }));

  return results;
}

async function runIntegrationAudit(base44: any, req: Request, adminUserId: string): Promise<{ checks: ReadinessCheck[]; cleanupTargets: CleanupTarget[] }> {
  const checks: ReadinessCheck[] = [];
  const cleanupTargets: CleanupTarget[] = [];

  const uexKey = textValue(Deno.env.get('UEX_API_KEY'));
  if (!uexKey) {
    checks.push({
      id: 'uex_api',
      label: 'UEX market data',
      ok: false,
      severity: 'critical',
      detail: 'UEX_API_KEY not configured.',
    });
  } else {
    try {
      const response = await fetch('https://api.uexcorp.space/api/v2/body/Stanton', {
        headers: { Authorization: `Bearer ${uexKey}` },
      });
      checks.push({
        id: 'uex_api',
        label: 'UEX market data',
        ok: response.ok,
        severity: 'critical',
        detail: response.ok ? 'UEX market endpoint responded successfully.' : `UEX returned ${response.status}.`,
      });
    } catch (error) {
      checks.push({
        id: 'uex_api',
        label: 'UEX market data',
        ok: false,
        severity: 'critical',
        detail: `UEX request failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    }
  }

  const scKey = textValue(Deno.env.get('SC_API_KEY'));
  if (!scKey) {
    checks.push({
      id: 'sc_api',
      label: 'RSI / StarCitizen API',
      ok: false,
      severity: 'critical',
      detail: 'SC_API_KEY not configured.',
    });
  } else {
    try {
      const response = await fetch(`https://api.starcitizen-api.com/api/v2/live/vehicles?key=${encodeURIComponent(scKey)}`);
      checks.push({
        id: 'sc_api',
        label: 'RSI / StarCitizen API',
        ok: response.ok,
        severity: 'critical',
        detail: response.ok ? 'StarCitizen API responded successfully.' : `StarCitizen API returned ${response.status}.`,
      });
    } catch (error) {
      checks.push({
        id: 'sc_api',
        label: 'RSI / StarCitizen API',
        ok: false,
        severity: 'critical',
        detail: `StarCitizen API request failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    }
  }

  const fleetYardsHandle = textValue(Deno.env.get('FLEETYARDS_HANDLE'));
  if (!fleetYardsHandle) {
    checks.push({
      id: 'fleetyards',
      label: 'FleetYards sync',
      ok: false,
      severity: 'critical',
      detail: 'FLEETYARDS_HANDLE not configured.',
    });
  } else {
    try {
      const response = await fetch(`https://api.fleetyards.net/v1/orgs/${encodeURIComponent(fleetYardsHandle)}`);
      checks.push({
        id: 'fleetyards',
        label: 'FleetYards sync',
        ok: response.ok,
        severity: 'critical',
        detail: response.ok ? `FleetYards org ${fleetYardsHandle} reachable.` : `FleetYards returned ${response.status}.`,
      });
    } catch (error) {
      checks.push({
        id: 'fleetyards',
        label: 'FleetYards sync',
        ok: false,
        severity: 'critical',
        detail: `FleetYards request failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    }
  }

  try {
    const authRoundtrip = await invokeLiveFunction(req, '/api/functions/auth/roundtrip', { method: 'POST' });
    checks.push({
      id: 'auth_roundtrip',
      label: 'Auth roundtrip',
      ok: authRoundtrip.ok && authRoundtrip.data?.ok === true,
      severity: 'critical',
      detail: authRoundtrip.ok && authRoundtrip.data?.ok === true
        ? 'Auth roundtrip passed.'
        : `Auth roundtrip failed: ${textValue(authRoundtrip.data?.error) || authRoundtrip.status}`,
      meta: authRoundtrip.data || {},
    });
  } catch (error) {
    checks.push({
      id: 'auth_roundtrip',
      label: 'Auth roundtrip',
      ok: false,
      severity: 'critical',
      detail: `Auth roundtrip request failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    const sessionCheck = await invokeLiveFunction(req, '/api/functions/auth/session', { method: 'GET' });
    checks.push({
      id: 'session_cookie',
      label: 'Session cookie health',
      ok: sessionCheck.ok && sessionCheck.data?.authenticated === true,
      severity: 'critical',
      detail: sessionCheck.ok && sessionCheck.data?.authenticated === true
        ? 'Issued-key session cookie is valid on the live app URL.'
        : `Session validation failed: ${textValue(sessionCheck.data?.error) || sessionCheck.status}`,
    });
  } catch (error) {
    checks.push({
      id: 'session_cookie',
      label: 'Session cookie health',
      ok: false,
      severity: 'critical',
      detail: `Session validation failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: 'Return JSON {"ok":true}.',
      response_json_schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
        },
        required: ['ok'],
      },
    });
    checks.push({
      id: 'llm_core',
      label: 'Core LLM integration',
      ok: true,
      severity: 'critical',
      detail: 'Core LLM integration responded successfully.',
    });
  } catch (error) {
    checks.push({
      id: 'llm_core',
      label: 'Core LLM integration',
      ok: false,
      severity: 'critical',
      detail: `Core LLM invocation failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    const response = await invokeLiveFunction(req, '/api/functions/generateInsight', {
      method: 'POST',
      body: JSON.stringify({ context: 'prod_readiness' }),
    });
    checks.push({
      id: 'generate_insight',
      label: 'generateInsight',
      ok: response.ok && Boolean(response.data?.insight),
      severity: 'critical',
      detail: response.ok && response.data?.insight
        ? 'generateInsight returned a live response.'
        : `generateInsight failed: ${textValue(response.data?.error) || response.status}`,
    });
  } catch (error) {
    checks.push({
      id: 'generate_insight',
      label: 'generateInsight',
      ok: false,
      severity: 'critical',
      detail: `generateInsight failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    const response = await invokeLiveFunction(req, '/api/functions/predictiveAnalytics', {
      method: 'POST',
      body: JSON.stringify({ action: 'trade_intel' }),
    });
    checks.push({
      id: 'predictive_analytics',
      label: 'predictiveAnalytics',
      ok: response.ok && Array.isArray(response.data?.intel),
      severity: 'critical',
      detail: response.ok && Array.isArray(response.data?.intel)
        ? 'predictiveAnalytics returned trade intel.'
        : `predictiveAnalytics failed: ${textValue(response.data?.error) || response.status}`,
    });
  } catch (error) {
    checks.push({
      id: 'predictive_analytics',
      label: 'predictiveAnalytics',
      ok: false,
      severity: 'critical',
      detail: `predictiveAnalytics failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    const ocrResponse = await invokeLiveFunction(req, '/api/functions/ocrExtract', {
      method: 'POST',
      body: JSON.stringify({
        file_url: appUrlPath('/fixtures/ocr-transaction.svg'),
        source_type: 'OCR_UPLOAD',
      }),
    });

    const createdRecords = toArray(ocrResponse.data?.created_records);
    createdRecords.forEach((record) => {
      const entity = textValue(record.entity);
      const id = textValue(record.id);
      if (entity && id) {
        cleanupTargets.push({ entity, id });
      }
    });

    checks.push({
      id: 'ocr_extract',
      label: 'OCR extract',
      ok: ocrResponse.ok && ocrResponse.data?.success === true,
      severity: 'critical',
      detail: ocrResponse.ok && ocrResponse.data?.success === true
        ? `ocrExtract processed the live fixture as ${textValue(ocrResponse.data?.screenshot_type) || 'UNKNOWN'}.`
        : `ocrExtract failed: ${textValue(ocrResponse.data?.error) || ocrResponse.status}`,
      meta: {
        screenshot_type: ocrResponse.data?.screenshot_type || null,
        records_created: ocrResponse.data?.records_created || 0,
      },
    });
  } catch (error) {
    checks.push({
      id: 'ocr_extract',
      label: 'OCR extract',
      ok: false,
      severity: 'critical',
      detail: `ocrExtract failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  try {
    const notification = await createNotification(base44, {
      type: 'READINESS_AUDIT',
      title: 'Prod readiness audit',
      body: 'Temporary readiness notification check.',
      severity: 'INFO',
      target_user_id: adminUserId,
      source_module: 'ADMIN',
    });

    cleanupTargets.push({ entity: 'NexusNotification', id: notification.id });
    checks.push({
      id: 'notifications',
      label: 'Notifications',
      ok: Boolean(notification?.id),
      severity: 'critical',
      detail: notification?.id ? 'Notification entity accepted a live write.' : 'Notification create returned no id.',
    });
  } catch (error) {
    checks.push({
      id: 'notifications',
      label: 'Notifications',
      ok: false,
      severity: 'critical',
      detail: `Notification write failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }

  return { checks, cleanupTargets };
}

async function cleanupTargets(base44: any, targets: CleanupTarget[]) {
  const cleaned: CleanupTarget[] = [];
  const failures: Array<CleanupTarget & { error: string }> = [];

  for (const target of targets) {
    const entityName = textValue(target.entity);
    const id = textValue(target.id);

    if (!entityName || !id) {
      continue;
    }

    if (!CLEANUP_ALLOWLIST.has(entityName)) {
      failures.push({ entity: entityName, id, error: 'entity_not_allowlisted' });
      continue;
    }

    try {
      const entity = base44.asServiceRole.entities[entityName];
      if (!entity || typeof entity.delete !== 'function') {
        throw new Error('entity_not_deletable');
      }
      await entity.delete(id);
      cleaned.push({ entity: entityName, id });
    } catch (error) {
      failures.push({
        entity: entityName,
        id,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  return {
    ok: failures.length === 0,
    cleaned,
    failures,
  };
}

async function runSampleDataAudit(base44: any) {
  const flaggedRecords: Array<Record<string, unknown>> = [];

  for (const config of SAMPLE_DATA_SCAN_PLAN) {
    try {
      const records = await listEntityRecords(base44, config.entity, 200);

      records.forEach((record) => {
        config.fields.forEach((field) => {
          const value = textValue(record?.[field]);
          if (!value) {
            return;
          }

          if (!SAMPLE_DATA_PATTERN.test(value)) {
            return;
          }

          flaggedRecords.push({
            entity: config.entity,
            id: textValue(record?.id),
            field,
            value,
          });
        });
      });
    } catch {
      flaggedRecords.push({
        entity: config.entity,
        id: null,
        field: '_entity',
        value: 'entity_unavailable',
      });
    }
  }

  const checks: ReadinessCheck[] = [
    {
      id: 'sample_data',
      label: 'Sample / QA record audit',
      ok: flaggedRecords.length === 0,
      severity: 'critical',
      detail: flaggedRecords.length === 0
        ? 'No obvious QA, demo, mock, or fixture records were detected in the live entity surfaces.'
        : `${flaggedRecords.length} suspicious record field${flaggedRecords.length === 1 ? '' : 's'} flagged for review.`,
      meta: { flagged_count: flaggedRecords.length },
    },
  ];

  return {
    checks,
    flagged_records: flaggedRecords,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonError('method_not_allowed', 405);
    }

    const adminSession = await requireAdminSession(req);
    if (!adminSession) {
      return jsonError('forbidden', 403);
    }

    const base44 = createClientFromRequest(req);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = textValue(body.action) || 'full_audit';

    if (action === 'entity_audit') {
      const checks = await runEntityAudit(base44);
      return Response.json({
        ok: isOk(checks),
        action,
        checks,
        failures: summarizeFailures(checks),
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'integration_audit') {
      const audit = await runIntegrationAudit(base44, req, adminSession.user.id);
      const cleanup = await cleanupTargets(base44, audit.cleanupTargets);
      return Response.json({
        ok: isOk(audit.checks) && cleanup.ok,
        action,
        checks: audit.checks,
        failures: summarizeFailures(audit.checks),
        cleanup,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'sample_data_audit') {
      const audit = await runSampleDataAudit(base44);
      return Response.json({
        ok: isOk(audit.checks),
        action,
        checks: audit.checks,
        failures: summarizeFailures(audit.checks),
        flagged_records: audit.flagged_records,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'cleanup_records') {
      const targets = toArray(body.records as CleanupTarget[]);
      const cleanup = await cleanupTargets(base44, targets);
      return Response.json({
        ok: cleanup.ok,
        action,
        cleaned: cleanup.cleaned,
        failures: cleanup.failures,
      }, { headers: sessionNoStoreHeaders() });
    }

    if (action === 'full_audit') {
      const entityChecks = await runEntityAudit(base44);
      const integrationAudit = await runIntegrationAudit(base44, req, adminSession.user.id);
      const sampleAudit = await runSampleDataAudit(base44);
      const cleanup = await cleanupTargets(base44, integrationAudit.cleanupTargets);

      const checks = [
        ...entityChecks,
        ...integrationAudit.checks,
        ...sampleAudit.checks,
      ];

      return Response.json({
        ok: isOk(checks) && cleanup.ok,
        action,
        checks,
        failures: [
          ...summarizeFailures(entityChecks),
          ...summarizeFailures(integrationAudit.checks),
          ...summarizeFailures(sampleAudit.checks),
          ...cleanup.failures.map((failure) => ({
            id: `${failure.entity}:${failure.id}`,
            severity: 'warn',
            detail: `Cleanup failed for ${failure.entity}/${failure.id}: ${failure.error}`,
          })),
        ],
        cleanup,
        flagged_records: sampleAudit.flagged_records,
      }, { headers: sessionNoStoreHeaders() });
    }

    return jsonError('invalid_action', 400);
  } catch (error) {
    console.error('[prodReadiness]', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'unknown_error',
    }, { status: 500, headers: sessionNoStoreHeaders() });
  }
});
