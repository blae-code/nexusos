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
  { id: 'AdminActionLog', label: 'Admin audit log', severity: 'critical' },
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
  'AdminActionLog',
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

async function listSessionEntityRecords(base44: any, entityName: string, limit = 5) {
  const entity = base44.entities?.[entityName];
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

function isOk(checks: ReadinessCheck[]) {
  return checks.every((check) => check.ok);
}

function summarizeFailures(checks: ReadinessCheck[]) {
  return checks.filter((check) => !check.ok).map((check) => ({
    id: check.id,
    severity: check.severity,
    detail: check.detail,
    meta: check.meta,
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

async function runSessionSurfaceCheck(
  base44: any,
  config: {
    id: string;
    label: string;
    entityNames: string[];
    okDetail: string;
    failurePrefix: string;
    mode: 'live_write' | 'shared_entity';
  },
): Promise<ReadinessCheck> {
  const unavailable: string[] = [];

  for (const entityName of config.entityNames) {
    try {
      await listSessionEntityRecords(base44, entityName, 1);
    } catch {
      unavailable.push(entityName);
    }
  }

  const ok = unavailable.length === 0;
  return {
    id: config.id,
    label: config.label,
    ok,
    severity: 'critical',
    detail: ok
      ? config.okDetail
      : `${config.failurePrefix} ${unavailable.join(', ')}`,
    meta: {
      runtime_mode: ok ? config.mode : (config.id === 'rescue_surface' ? 'local_cache' : 'read_only'),
      missing_entities: unavailable,
    },
  };
}

async function runLiveFunctionCheck(
  checks: ReadinessCheck[],
  cleanupTargets: CleanupTarget[],
  req: Request,
  config: {
    id: string;
    label: string;
    pathname: string;
    body?: Record<string, unknown>;
    method?: 'GET' | 'POST';
    validate: (response: { ok: boolean; status: number; data: any }) => boolean;
    successDetail: (response: { ok: boolean; status: number; data: any }) => string;
    failureDetail?: (response: { ok: boolean; status: number; data: any }) => string;
    meta?: (response: { ok: boolean; status: number; data: any }) => Record<string, unknown> | undefined;
    collectCleanupTargets?: (response: { ok: boolean; status: number; data: any }) => CleanupTarget[];
  },
) {
  try {
    const response = await invokeLiveFunction(req, config.pathname, {
      method: config.method || 'POST',
      body: config.body ? JSON.stringify(config.body) : undefined,
    });
    const ok = config.validate(response);
    const nextCleanupTargets = config.collectCleanupTargets ? config.collectCleanupTargets(response) : [];
    cleanupTargets.push(...nextCleanupTargets);
    checks.push({
      id: config.id,
      label: config.label,
      ok,
      severity: 'critical',
      detail: ok
        ? config.successDetail(response)
        : (config.failureDetail
          ? config.failureDetail(response)
          : `${config.label} failed: ${textValue(response.data?.error) || response.status}`),
      meta: config.meta ? config.meta(response) : undefined,
    });
  } catch (error) {
    checks.push({
      id: config.id,
      label: config.label,
      ok: false,
      severity: 'critical',
      detail: `${config.label} failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
  }
}

async function runAdminControlPlaneAudit(
  base44: any,
  req: Request,
): Promise<{ checks: ReadinessCheck[]; cleanupTargets: CleanupTarget[] }> {
  const checks: ReadinessCheck[] = [];
  const cleanupTargets: CleanupTarget[] = [];

  let seedLogId = '';
  try {
    const created = await base44.asServiceRole.entities.AdminActionLog.create({
      acted_by_user_id: 'prod-readiness',
      acted_by_callsign: 'PROD-READINESS',
      action_type: 'READINESS_SELF_TEST',
      entity_name: 'SYSTEM',
      record_id: 'admin-action-log-self-test',
      record_label: 'AdminActionLog self-test',
      reason: 'prod_readiness',
      strategy: 'self_test',
      before_snapshot: { mode: 'write_check' },
      after_snapshot: { ok: true },
      created_at: new Date().toISOString(),
    });
    seedLogId = textValue(created?.id);
    if (seedLogId) {
      cleanupTargets.push({ entity: 'AdminActionLog', id: seedLogId });
    }

    const verify = seedLogId
      ? await base44.asServiceRole.entities.AdminActionLog.filter({ id: seedLogId }).catch(() => [])
      : [];

    checks.push({
      id: 'admin_action_log_entity',
      label: 'Admin audit log entity',
      ok: Boolean(seedLogId) && Array.isArray(verify) && verify.length > 0,
      severity: 'critical',
      detail: seedLogId && Array.isArray(verify) && verify.length > 0
        ? 'AdminActionLog accepted a write and was immediately readable.'
        : 'AdminActionLog write or readback failed.',
      meta: { area: 'admin_control_plane', entity: 'AdminActionLog' },
    });
  } catch (error) {
    checks.push({
      id: 'admin_action_log_entity',
      label: 'Admin audit log entity',
      ok: false,
      severity: 'critical',
      detail: `AdminActionLog write failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      meta: { area: 'admin_control_plane', entity: 'AdminActionLog' },
    });
  }

  try {
    const listEntities = await invokeLiveFunction(req, '/api/functions/adminData', {
      method: 'POST',
      body: JSON.stringify({ action: 'list_entities' }),
    });

    const entities = toArray(listEntities.data?.entities);
    const hasAdminActionLog = entities.some((item) => textValue(item?.id) === 'AdminActionLog');

    checks.push({
      id: 'admin_data_entities',
      label: 'Admin data entity registry',
      ok: listEntities.ok && entities.length > 0 && hasAdminActionLog,
      severity: 'critical',
      detail: listEntities.ok && entities.length > 0 && hasAdminActionLog
        ? `adminData listed ${entities.length} registered entities for the admin session.`
        : `adminData entity listing failed: ${textValue(listEntities.data?.error) || listEntities.status}`,
      meta: { area: 'admin_control_plane' },
    });
  } catch (error) {
    checks.push({
      id: 'admin_data_entities',
      label: 'Admin data entity registry',
      ok: false,
      severity: 'critical',
      detail: `adminData list_entities failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      meta: { area: 'admin_control_plane' },
    });
  }

  try {
    const notification = await createNotification(base44, {
      type: 'ADMIN_SELF_TEST',
      title: 'Admin data self test',
      body: 'Temporary admin data record fetch/edit check.',
      severity: 'INFO',
      source_module: 'ADMIN',
    });

    const notificationId = textValue(notification?.id);
    if (notificationId) {
      cleanupTargets.push({ entity: 'NexusNotification', id: notificationId });
    }

    const getRecord = await invokeLiveFunction(req, '/api/functions/adminData', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get_record',
        entity: 'NexusNotification',
        id: notificationId,
      }),
    });

    const updateRecord = await invokeLiveFunction(req, '/api/functions/adminData', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_record',
        entity: 'NexusNotification',
        id: notificationId,
        patch: { body: 'Temporary admin data record fetch/edit check. Updated.' },
      }),
    });

    const recentLogs = await base44.asServiceRole.entities.AdminActionLog.list('-created_at', 20).catch(() => []);
    toArray(recentLogs)
      .filter((record) => textValue(record?.entity_name) === 'NexusNotification' && textValue(record?.record_id) === notificationId)
      .forEach((record) => {
        const logId = textValue(record?.id);
        if (logId) {
          cleanupTargets.push({ entity: 'AdminActionLog', id: logId });
        }
      });

    checks.push({
      id: 'admin_data_record_flow',
      label: 'Admin data record fetch/edit',
      ok: getRecord.ok && updateRecord.ok && textValue(updateRecord.data?.record?.body).includes('Updated'),
      severity: 'critical',
      detail: getRecord.ok && updateRecord.ok
        ? 'adminData fetched and edited a representative NexusNotification record with an admin session.'
        : `adminData record flow failed: ${textValue(updateRecord.data?.error || getRecord.data?.error) || updateRecord.status || getRecord.status}`,
      meta: { area: 'admin_control_plane', entity: 'NexusNotification' },
    });
  } catch (error) {
    checks.push({
      id: 'admin_data_record_flow',
      label: 'Admin data record fetch/edit',
      ok: false,
      severity: 'critical',
      detail: `adminData record flow failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
      meta: { area: 'admin_control_plane', entity: 'NexusNotification' },
    });
  }

  for (const [id, label, action] of [
    ['admin_ops_patch_refresh', 'Admin patch refresh', 'refresh_patch_digest'],
    ['admin_ops_self_test', 'Admin patch intelligence self-test', 'run_patch_intelligence_self_test'],
  ] as const) {
    try {
      const actionStartedAt = new Date().toISOString();
      const response = await invokeLiveFunction(req, '/api/functions/adminOps', {
        method: 'POST',
        body: JSON.stringify({ action, reason: 'prod_readiness' }),
      });

      const recentLogs = await base44.asServiceRole.entities.AdminActionLog.list('-created_at', 12).catch(() => []);
      toArray(recentLogs)
        .filter((record) => {
          const createdAt = textValue(record?.created_at);
          return textValue(record?.record_id) === action
            && createdAt
            && createdAt >= actionStartedAt;
        })
        .forEach((record) => {
          const logId = textValue(record?.id);
          if (logId) {
            cleanupTargets.push({ entity: 'AdminActionLog', id: logId });
          }
        });

      const result = response.data?.result || {};
      checks.push({
        id,
        label,
        ok: response.ok && response.data?.ok === true,
        severity: 'critical',
        detail: response.ok && response.data?.ok === true
          ? `${action} returned a structured adminOps success payload.`
          : `${action} failed: ${textValue(response.data?.error) || response.status}`,
        meta: { area: 'admin_control_plane', action, result },
      });
    } catch (error) {
      checks.push({
        id,
        label,
        ok: false,
        severity: 'critical',
        detail: `${action} failed: ${error instanceof Error ? error.message : 'unknown_error'}`,
        meta: { area: 'admin_control_plane', action },
      });
    }
  }

  return { checks, cleanupTargets };
}

async function runIntegrationAudit(base44: any, req: Request, adminUserId: string): Promise<{ checks: ReadinessCheck[]; cleanupTargets: CleanupTarget[] }> {
  const checks: ReadinessCheck[] = [];
  const cleanupTargets: CleanupTarget[] = [];
  const scoutRoutePayload = {
    deposits: [
      { material: 'Quantanium', system: 'Stanton', location: 'ARC-L1 Belt', quality: 92, volume: 'LARGE', risk: 'HIGH', reporter: 'SCOUT-1' },
      { material: 'Taranite', system: 'Stanton', location: 'Wala Ridge', quality: 88, volume: 'MEDIUM', risk: 'MEDIUM', reporter: 'SCOUT-2' },
      { material: 'Gold', system: 'Pyro', location: 'Bloom Front', quality: 81, volume: 'SMALL', risk: 'LOW', reporter: 'SCOUT-3' },
    ],
    ship_class: 'MINER',
    max_risk: 'HIGH',
    include_refueling: true,
    minimum_quality: 80,
  };

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

  checks.push(await runSessionSurfaceCheck(base44, {
    id: 'commerce_surface',
    label: 'Commerce write surfaces',
    entityNames: ['Wallet', 'Transaction', 'Contract', 'CofferLog', 'CargoLog'],
    okDetail: 'Commerce is in live-write mode for the current admin session.',
    failurePrefix: 'Commerce would degrade to read-only for the current admin session because these entities are unavailable:',
    mode: 'live_write',
  }));

  checks.push(await runSessionSurfaceCheck(base44, {
    id: 'logistics_surface',
    label: 'Logistics write surfaces',
    entityNames: ['CargoJob', 'Consignment', 'OrgShip', 'Material', 'GameCacheCommodity'],
    okDetail: 'Logistics is in live-write mode for the current admin session.',
    failurePrefix: 'Logistics would degrade to read-only for the current admin session because these entities are unavailable:',
    mode: 'live_write',
  }));

  checks.push(await runSessionSurfaceCheck(base44, {
    id: 'rescue_surface',
    label: 'Rescue shared-state mode',
    entityNames: ['RescueCall'],
    okDetail: 'Rescue board is using the shared RescueCall entity for the current admin session.',
    failurePrefix: 'Rescue would fall back to local cache for the current admin session because these entities are unavailable:',
    mode: 'shared_entity',
  }));

  const adminControlAudit = await runAdminControlPlaneAudit(base44, req);
  checks.push(...adminControlAudit.checks);
  cleanupTargets.push(...adminControlAudit.cleanupTargets);

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

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'generate_insight',
    label: 'generateInsight',
    pathname: '/api/functions/generateInsight',
    body: { context: 'prod_readiness' },
    validate: (response) => response.ok && Boolean(response.data?.insight),
    successDetail: () => 'generateInsight returned a live response.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'generate_insight_scout_route',
    label: 'generateInsight (scout route)',
    pathname: '/api/functions/generateInsight',
    body: {
      context: 'scout_route',
      deposit_id: 'readiness-deposit',
      material_name: 'Quantanium',
      system_name: 'Stanton',
      location_detail: 'ARC-L1 Belt',
      quality_pct: 92,
      risk_level: 'HIGH',
    },
    validate: (response) => response.ok && Boolean(response.data?.insight?.detail),
    successDetail: () => 'generateInsight returned a scout-route recommendation.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'predictive_analytics',
    label: 'predictiveAnalytics',
    pathname: '/api/functions/predictiveAnalytics',
    body: { action: 'trade_intel' },
    validate: (response) => response.ok && Array.isArray(response.data?.intel),
    successDetail: () => 'predictiveAnalytics returned trade intel.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'route_planner',
    label: 'routePlanner',
    pathname: '/api/functions/routePlanner',
    body: {
      stations: ['Area 18', 'Loreville', 'Port Olisar'],
      shipClass: 'HAULER',
      cargoAmount: 96,
      commodityPrice: 42,
    },
    validate: (response) => response.ok && Array.isArray(response.data?.route?.legs),
    successDetail: () => 'routePlanner returned a deterministic route.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'scout_route_optimizer',
    label: 'scoutRouteOptimizer',
    pathname: '/api/functions/scoutRouteOptimizer',
    body: scoutRoutePayload,
    validate: (response) => response.ok && Array.isArray(response.data?.waypoints),
    successDetail: () => 'scoutRouteOptimizer returned an AI route plan.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'crafting_optimiser',
    label: 'craftingOptimiser',
    pathname: '/api/functions/craftingOptimiser',
    body: {
      materials: [
        { material_name: 'Quantanium', quantity_scu: 12, quality_pct: 92 },
        { material_name: 'Taranite', quantity_scu: 6, quality_pct: 88 },
      ],
      blueprints: [
        {
          item_name: 'Quantum Injector',
          tier: 'T2',
          category: 'COMPONENT',
          recipe_materials: [
            { material: 'Quantanium', quantity_scu: 8, min_quality: 80 },
            { material: 'Taranite', quantity_scu: 4, min_quality: 80 },
          ],
        },
      ],
      craftQueue: [
        {
          id: 'cq-readiness',
          blueprint_name: 'Quantum Injector',
          quantity: 1,
          status: 'OPEN',
          priority_flag: true,
          requested_by_callsign: 'SYSTEM-ADMIN',
        },
      ],
    },
    validate: (response) => response.ok && Array.isArray(response.data?.optimized_sequence),
    successDetail: () => 'craftingOptimiser returned a valid sequence.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'refinery_calculator',
    label: 'refineryCalculator',
    pathname: '/api/functions/refineryCalculator',
    body: {
      material_name: 'Quantanium',
      quantity_scu: 12,
      quality_pct: 91,
      refinery_method: 'FERRON_EXCHANGE',
      station: 'ARC-L1',
    },
    validate: (response) => response.ok && Number.isFinite(Number(response.data?.estimated_output_scu)),
    successDetail: () => 'refineryCalculator returned a batch forecast.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'refinery_efficiency',
    label: 'refineryEfficiencyCalculator',
    pathname: '/api/functions/refineryEfficiencyCalculator',
    body: {
      material_name: 'Quantanium',
      raw_scu: 12,
      refinery_method: 'FERRON',
      material_quality: 91,
    },
    validate: (response) => response.ok && Number.isFinite(Number(response.data?.efficiency_score)),
    successDetail: () => 'refineryEfficiencyCalculator returned an efficiency report.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'phase_briefing',
    label: 'phaseBriefing',
    pathname: '/api/functions/phaseBriefing',
    body: {
      op_id: 'readiness-op',
      op_name: 'Readiness Drill',
      phase_name: 'Ingress',
      phase_number: 1,
      total_phases: 3,
      crew_list: [{ callsign: 'SYSTEM-ADMIN', role: 'Lead' }],
      objectives: ['Confirm launch corridor'],
      threats: ['Minor interdiction risk'],
    },
    validate: (response) => response.ok && response.data?.success === true && Boolean(response.data?.briefing),
    successDetail: () => 'phaseBriefing returned a tactical brief.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'op_wrap_up',
    label: 'opWrapUp',
    pathname: '/api/functions/opWrapUp',
    body: {
      op_id: 'readiness-op',
      op_name: 'Readiness Drill',
      op_type: 'CHECK',
      duration_minutes: 45,
      crew_list: [{ callsign: 'SYSTEM-ADMIN', role: 'Lead' }],
      session_log: [{ time: 'T+00', message: 'Readiness drill started' }],
      materials_logged: [{ material_name: 'Quantanium', quantity_scu: 8, quality_pct: 82 }],
      total_value_aUEC: 50000,
    },
    validate: (response) => response.ok && Boolean(response.data?.debrief_text),
    successDetail: () => 'opWrapUp returned a debrief.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'ocr_extract',
    label: 'OCR extract',
    pathname: '/api/functions/ocrExtract',
    body: {
      file_url: appUrlPath('/fixtures/ocr-transaction.svg'),
      source_type: 'OCR_UPLOAD',
    },
    validate: (response) => response.ok && response.data?.success === true,
    successDetail: (response) => `ocrExtract processed the live fixture as ${textValue(response.data?.screenshot_type) || 'UNKNOWN'}.`,
    meta: (response) => ({
      screenshot_type: response.data?.screenshot_type || null,
      records_created: response.data?.records_created || 0,
    }),
    collectCleanupTargets: (response) => toArray(response.data?.created_records)
      .map((record) => ({
        entity: textValue(record.entity),
        id: textValue(record.id),
      }))
      .filter((record) => record.entity && record.id),
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'org_health_agent',
    label: 'orgHealthAgent',
    pathname: '/api/functions/orgHealthAgent',
    body: { mode: 'self_test' },
    validate: (response) => response.ok && response.data?.ok === true && response.data?.mutations_performed === false,
    successDetail: () => 'orgHealthAgent self-test completed without mutations.',
  });

  await runLiveFunctionCheck(checks, cleanupTargets, req, {
    id: 'patch_intelligence_agent',
    label: 'patchIntelligenceAgent',
    pathname: '/api/functions/patchIntelligenceAgent',
    body: { mode: 'self_test' },
    validate: (response) => response.ok && response.data?.ok === true && response.data?.mutations_performed === false,
    successDetail: () => 'patchIntelligenceAgent self-test completed without mutations.',
  });

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
