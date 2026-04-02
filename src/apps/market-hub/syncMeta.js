import { base44 } from '@/core/data/base44Client';

export const MANUAL_SYNC_COOLDOWN_MS = 30 * 60 * 1000;
export const AUTO_COMMODITY_WINDOW_MS = 12 * 60 * 60 * 1000;

function toTime(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestTime(record) {
  return Math.max(
    toTime(record?.synced_at),
    toTime(record?.started_at),
    toTime(record?.created_date),
  );
}

export function timeSince(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - toTime(iso);
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function formatCountdown(iso) {
  const remaining = Math.max(0, toTime(iso) - Date.now());
  const totalMinutes = Math.ceil(remaining / 60_000);
  if (totalMinutes <= 0) return 'ready';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export async function loadSyncRecords(syncType) {
  const records = await base44.entities.MarketSync
    .filter({ sync_type: syncType }, '-synced_at', 25)
    .catch(() => []);
  return Array.isArray(records) ? records : [];
}

export function deriveSyncState(
  records,
  {
    manualCooldownMs = MANUAL_SYNC_COOLDOWN_MS,
    autoWindowMs = 0,
  } = {},
) {
  const sorted = [...(records || [])].sort((a, b) => latestTime(b) - latestTime(a));
  const running = sorted.find((record) => record.status === 'RUNNING' && toTime(record.lease_expires_at) > Date.now()) || null;
  const lastCompleted = sorted.find((record) => record.status === 'SUCCESS' || record.status === 'PARTIAL') || null;
  const lastManual = sorted.find((record) =>
    (record.status === 'SUCCESS' || record.status === 'PARTIAL') &&
    String(record.triggered_by || '').toUpperCase() !== 'AUTO'
  ) || null;
  const lastAuto = sorted.find((record) =>
    (record.status === 'SUCCESS' || record.status === 'PARTIAL') &&
    String(record.triggered_by || '').toUpperCase() === 'AUTO'
  ) || null;

  const cooldownUntil = lastManual && manualCooldownMs > 0
    ? new Date(latestTime(lastManual) + manualCooldownMs).toISOString()
    : null;
  const nextAutoEligibleAt = lastAuto && autoWindowMs > 0
    ? new Date(latestTime(lastAuto) + autoWindowMs).toISOString()
    : null;

  return {
    latest: sorted[0] || null,
    running,
    lastCompleted,
    lastManual,
    lastAuto,
    cooldownUntil,
    nextAutoEligibleAt,
    isCoolingDown: cooldownUntil ? toTime(cooldownUntil) > Date.now() : false,
  };
}
