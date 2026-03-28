import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  buildScoutDepositRecord,
  errorResponse,
  normalizeLookup,
  okResponse,
  requirePostJson,
  requireSessionUser,
  NexusWriteError,
} from '../_shared/nexusWriteValidation/entry.ts';
import { createNotification } from '../_shared/nexusNotification/entry.ts';

Deno.serve(async (req) => {
  try {
    const body = await requirePostJson(req);
    const base44 = createClientFromRequest(req);
    const user = await requireSessionUser(req);

    const record = buildScoutDepositRecord(body, user);
    const recentDeposits = await base44.asServiceRole.entities.ScoutDeposit.list('-reported_at', 100);

    const duplicate = (recentDeposits || []).find((deposit: any) => {
      const isSameMaterial = normalizeLookup(deposit.material_name) === normalizeLookup(record.material_name);
      const isSameSystem = normalizeLookup(deposit.system_name) === normalizeLookup(record.system_name);
      const isSameLocation = normalizeLookup(deposit.location_detail) === normalizeLookup(record.location_detail);
      const reportedAt = new Date(deposit.reported_at || 0).getTime();
      const withinHour = Number.isFinite(reportedAt) && (Date.now() - reportedAt) <= 3600000;
      return isSameMaterial && isSameSystem && isSameLocation && withinHour;
    });

    if (duplicate) {
      throw new NexusWriteError('duplicate_scout_deposit', 409, { existing_id: duplicate.id });
    }

    const deposit = await base44.asServiceRole.entities.ScoutDeposit.create(record);

    if (Number(record.quality_score || 0) >= 800) {
      try {
        await createNotification(base44, {
          type: 'SCOUT_T2_DEPOSIT',
          title: `${record.material_name} deposit logged`,
          body: `${record.material_name} @ ${(Number(record.quality_score || 0) / 10).toFixed(0)}% in ${record.system_name}${record.location_detail ? ` · ${record.location_detail}` : ''}.`,
          severity: 'INFO',
          target_user_id: null,
          source_module: 'SCOUT',
          source_id: deposit.id,
        });
      } catch (notificationError) {
        console.warn('[createScoutDeposit] notification failed:', notificationError?.message || notificationError);
      }
    }

    return okResponse({ deposit });
  } catch (error) {
    return errorResponse(error);
  }
});
