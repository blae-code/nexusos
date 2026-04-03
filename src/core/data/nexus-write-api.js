import { base44 } from '@/core/data/base44Client';

async function invokeWrite(name, payload) {
  const response = await base44.functions.invoke(name, payload);
  const data = response?.data || response || {};

  if (!data?.ok) {
    throw new Error(data?.error || 'request_failed');
  }

  return data;
}

export const nexusWriteApi = {
  createScoutDeposit(payload) {
    return invokeWrite('createScoutDeposit', payload);
  },

  createMaterial(payload) {
    return invokeWrite('createMaterial', payload);
  },

  updateMaterial(materialId, payload) {
    return invokeWrite('createMaterial', {
      action: 'update',
      material_id: materialId,
      ...payload,
    });
  },

  createRefineryOrder(payload) {
    return invokeWrite('createRefineryOrder', payload);
  },

  collectRefineryOrder(orderId) {
    return invokeWrite('createRefineryOrder', {
      action: 'collect',
      order_id: orderId,
    });
  },

  createCraftQueue(payload) {
    return invokeWrite('createCraftQueue', payload);
  },

  claimCraftQueue(queueId) {
    return invokeWrite('createCraftQueue', {
      action: 'claim',
      queue_id: queueId,
    });
  },

  updateCraftQueueStatus(queueId, status) {
    return invokeWrite('createCraftQueue', {
      action: 'status',
      queue_id: queueId,
      status,
    });
  },

  createCargoLog(payload) {
    // Direct entity write — no server function wrapper needed
    return base44.entities.CargoLog.create(payload);
  },

  upsertOpRsvp(payload) {
    return invokeWrite('upsertOpRsvp', payload);
  },

  declineOpRsvp(opId, payload = {}) {
    return invokeWrite('upsertOpRsvp', {
      action: 'decline',
      op_id: opId,
      ...payload,
    });
  },
};
