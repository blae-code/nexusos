import { base44 } from '@/core/data/base44Client';

async function invokePlannerFunction(name, payload = {}) {
  const response = await base44.functions.invoke(name, payload);
  const data = response?.data || response || {};
  if (data?.ok === false) {
    throw new Error(data?.error || 'request_failed');
  }
  return data;
}

async function listEntityCandidates(entityNames, sortField = '-updated_date', limit = 200) {
  for (const entityName of entityNames) {
    try {
      const entity = base44.entities?.[entityName];
      if (!entity?.list) continue;
      const result = await entity.list(sortField, limit);
      return Array.isArray(result) ? result : [];
    } catch {
      // entity missing in this deployment
    }
  }
  return [];
}

async function filterEntityCandidates(entityNames, filter) {
  for (const entityName of entityNames) {
    try {
      const entity = base44.entities?.[entityName];
      if (!entity?.filter) continue;
      const result = await entity.filter(filter);
      return Array.isArray(result) ? result : [];
    } catch {
      // entity missing in this deployment
    }
  }
  return [];
}

async function mutateEntity(entityName, action, ...args) {
  const entity = base44.entities?.[entityName];
  if (!entity?.[action]) {
    throw new Error(`${entityName}_${action}_unavailable`);
  }
  return await entity[action](...args);
}

export const fleetPlanningApi = {
  getCatalog(filters = {}) {
    return invokePlannerFunction('fleetCatalog', filters);
  },

  getSnapshot(scenarioId) {
    return invokePlannerFunction('fleetPlanningSnapshot', scenarioId ? { scenarioId } : {});
  },

  listScenarios() {
    return listEntityCandidates(['FleetScenario'], '-updated_date', 100);
  },

  listUnits() {
    return listEntityCandidates(['OrgUnit'], 'display_order', 250);
  },

  listAssignments(scenarioId) {
    return scenarioId ? filterEntityCandidates(['FleetScenarioAssignment'], { scenario_id: scenarioId }) : listEntityCandidates(['FleetScenarioAssignment'], '-updated_date', 500);
  },

  listBuilds() {
    return listEntityCandidates(['FleetBuild'], '-updated_date', 500);
  },

  listOrgShips() {
    return listEntityCandidates(['OrgShip'], 'name', 500);
  },

  createScenario(payload) {
    return mutateEntity('FleetScenario', 'create', payload);
  },

  updateScenario(id, payload) {
    return mutateEntity('FleetScenario', 'update', id, payload);
  },

  createAssignment(payload) {
    return mutateEntity('FleetScenarioAssignment', 'create', payload);
  },

  updateAssignment(id, payload) {
    return mutateEntity('FleetScenarioAssignment', 'update', id, payload);
  },

  deleteAssignment(id) {
    return mutateEntity('FleetScenarioAssignment', 'delete', id);
  },

  createBuild(payload) {
    return mutateEntity('FleetBuild', 'create', payload);
  },

  updateBuild(id, payload) {
    return mutateEntity('FleetBuild', 'update', id, payload);
  },
};
