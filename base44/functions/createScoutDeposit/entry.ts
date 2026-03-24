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

Deno.serve(async (req) => {
  try {
    const body = await requirePostJson(req);
    const base44 = createClientFromRequest(req);
    const user = await requireSessionUser(base44);

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
    return okResponse({ deposit });
  } catch (error) {
    return errorResponse(error);
  }
});
