const DEFAULT_SECRET_VALUES = {
  UEX_API_KEY: 'demo-uex-key',
  SC_API_KEY: 'demo-sc-key',
  DISCORD_CLIENT_SECRET: 'demo-discord-secret',
  DISCORD_BOT_TOKEN: 'demo-discord-bot-token',
};

const PATCH_FIXTURES = {
  LIVE: [
    {
      version: '4.7.0',
      publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      highlights: ['Refinery throughput increased across ARC-L1 and Hurston stations.', 'Mining scanner readability pass for surface nodes.'],
      affectedSystems: ['refinery', 'mining', 'cargo'],
      url: 'https://robertsspaceindustries.com',
    },
    {
      version: '4.6.3',
      publishedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
      highlights: ['Vehicle claim timers normalized.', 'Commodity terminal UX cleanup.'],
      affectedSystems: ['fleet', 'industry'],
      url: 'https://robertsspaceindustries.com',
    },
  ],
  PTU: [
    {
      version: '4.7.1',
      publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      highlights: ['Cargo economy balance pass in PTU.', 'New flight component wear telemetry surfaced in mobiGlas.'],
      affectedSystems: ['cargo', 'components', 'economy'],
      url: 'https://robertsspaceindustries.com',
    },
    {
      version: '4.7.0-rc2',
      publishedAt: new Date(Date.now() - 30 * 3600000).toISOString(),
      highlights: ['Quantum route jump-map readability improvements.'],
      affectedSystems: ['navigation'],
      url: 'https://robertsspaceindustries.com',
    },
  ],
};

const PRICE_FIXTURES = {
  Agricium: {
    stats: { average: 32, min: 27, max: 38 },
    history: [
      { label: 'Mon', price: 30 },
      { label: 'Tue', price: 31 },
      { label: 'Wed', price: 33 },
      { label: 'Thu', price: 32 },
      { label: 'Fri', price: 35 },
    ],
    stations: [
      { station_name: 'New Babbage', buy_price: 27, sell_price: 35, margin: 8, demand_rating: 'HIGH' },
      { station_name: 'Lorville', buy_price: 29, sell_price: 34, margin: 5, demand_rating: 'MED' },
      { station_name: 'Area 18', buy_price: 31, sell_price: 38, margin: 7, demand_rating: 'HIGH' },
    ],
  },
  Titanium: {
    stats: { average: 23, min: 18, max: 27 },
    history: [
      { label: 'Mon', price: 22 },
      { label: 'Tue', price: 21 },
      { label: 'Wed', price: 23 },
      { label: 'Thu', price: 24 },
      { label: 'Fri', price: 26 },
    ],
    stations: [
      { station_name: 'Grim Hex', buy_price: 18, sell_price: 24, margin: 6, demand_rating: 'MED' },
      { station_name: 'Area 18', buy_price: 21, sell_price: 27, margin: 6, demand_rating: 'HIGH' },
      { station_name: 'Levski', buy_price: 19, sell_price: 25, margin: 6, demand_rating: 'MED' },
    ],
  },
  Quantanium: {
    stats: { average: 108, min: 96, max: 126 },
    history: [
      { label: 'Mon', price: 98 },
      { label: 'Tue', price: 101 },
      { label: 'Wed', price: 108 },
      { label: 'Thu', price: 117 },
      { label: 'Fri', price: 123 },
    ],
    stations: [
      { station_name: 'ARC-L1', buy_price: 96, sell_price: 118, margin: 22, demand_rating: 'HIGH' },
      { station_name: 'Port Olisar', buy_price: 102, sell_price: 126, margin: 24, demand_rating: 'HIGH' },
      { station_name: 'Lorville', buy_price: 98, sell_price: 119, margin: 21, demand_rating: 'MED' },
    ],
  },
};

function withData(data, extra = {}) {
  return {
    ok: true,
    success: true,
    data,
    ...(data && typeof data === 'object' ? data : {}),
    ...extra,
  };
}

function getEntities(state, entityType) {
  return Array.isArray(state?.entities?.[entityType]) ? state.entities[entityType] : [];
}

function getMaterials(state) {
  return getEntities(state, 'Material');
}

function getBlueprints(state) {
  return getEntities(state, 'Blueprint');
}

function getCraftQueue(state) {
  return getEntities(state, 'CraftQueue');
}

function getDeposits(state) {
  return getEntities(state, 'ScoutDeposit');
}

function getFleetShips(state) {
  return getEntities(state, 'OrgShip');
}

function getCurrentSecrets(state) {
  return {
    ...DEFAULT_SECRET_VALUES,
    ...(state?.meta?.secrets || {}),
  };
}

function buildInsightPayload(payload, state) {
  if (payload?.context === 'scout_route') {
    return {
      title: 'Scout route ready',
      detail: `Prioritize ${payload.material_name || 'the marked deposit'} with a ${payload.risk_level || 'MEDIUM'}-risk escort profile.`,
      recommendation: `Route Prospectors to ${payload.location_detail || 'the marked site'} and stage escort cover one jump out. ${payload.quality_pct || 0}% quality makes this worth a coordinated run.`,
      action_1_label: 'REFRESH',
      action_1_prompt: 'refresh-scout-route',
    };
  }

  const materials = getMaterials(state);
  const blueprints = getBlueprints(state);
  const lowStock = materials
    .filter((item) => Number(item.quantity_scu || item.current_stock || 0) < Number(item.alert_threshold || 0))
    .sort((left, right) => (left.quantity_scu || left.current_stock || 0) - (right.quantity_scu || right.current_stock || 0));
  const priorityBlueprint = blueprints.find((item) => item.is_priority);

  if (lowStock[0]) {
    return {
      title: `${lowStock[0].material_name || lowStock[0].name} is below reserve`,
      detail: `Stock is sitting at ${(lowStock[0].quantity_scu || lowStock[0].current_stock || 0).toFixed(0)} SCU against a ${(lowStock[0].target_stock || lowStock[0].alert_threshold || 0).toFixed(0)} SCU target.`,
      action_1_label: 'TOP DEPOSITS',
      action_1_prompt: 'show-top-deposits',
      action_2_label: 'PRIORITY CRAFTS',
      action_2_prompt: 'show-priority-crafts',
    };
  }

  return {
    title: 'Industry sandbox stable',
    detail: priorityBlueprint
      ? `${priorityBlueprint.item_name} is the current priority craft and materials are within nominal range.`
      : 'No priority blueprint pressure detected in the shared sandbox.',
    action_1_label: 'REFRESH',
    action_1_prompt: 'refresh-industry-state',
  };
}

function buildRouteSummary(stations, cargoAmount, commodityPrice) {
  const legs = [];
  for (let index = 0; index < stations.length - 1; index += 1) {
    const from = stations[index];
    const to = stations[index + 1];
    const distance = 125 + index * 58;
    const transitTime = 7 + index * 3;
    const fuelCost = 400 + index * 170;
    legs.push({ from, to, distance, transitTime, fuelCost });
  }

  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
  const totalTransitTime = legs.reduce((sum, leg) => sum + leg.transitTime, 0);
  const totalFuelCost = legs.reduce((sum, leg) => sum + leg.fuelCost, 0);
  const cargoValue = Math.round(cargoAmount * commodityPrice);
  const netProfit = Math.max(0, Math.round(cargoValue * 0.18 - totalFuelCost));
  const profitMargin = cargoValue > 0 ? Number(((netProfit / cargoValue) * 100).toFixed(1)) : 0;

  return {
    summary: {
      totalDistance,
      totalTransitTime,
      totalFuelCost,
      cargoValue,
      netProfit,
      profitMargin,
    },
    legs,
  };
}

function buildDepositRoute(payload) {
  const deposits = Array.isArray(payload?.deposits) ? payload.deposits : [];
  const targetMaterial = payload?.target_material;
  const target = deposits
    .filter((item) => (item.material_name || '').toLowerCase() === String(targetMaterial || '').toLowerCase())
    .sort((left, right) => Number(right.quality_pct || 0) - Number(left.quality_pct || 0))[0];

  if (!target) {
    return withData({ error: 'No suitable deposits match the selected material.' });
  }

  return withData({
    recommendation: `Stage a ${payload?.risk_tolerance || 'MEDIUM'}-risk run to ${target.location_detail || target.system_name}.`,
    route: {
      summary: {
        totalDistance: 164,
        totalTransitTime: 14,
        totalFuelCost: 740,
        cargoValue: Math.round((target.quality_pct || 60) * 1200),
        netProfit: Math.round((target.quality_pct || 60) * 180),
        profitMargin: 22.4,
      },
      legs: [
        { from: 'Home Base', to: target.system_name || 'Target System', distance: 96, transitTime: 8, fuelCost: 410 },
        { from: target.system_name || 'Target System', to: target.location_detail || 'Extraction Site', distance: 68, transitTime: 6, fuelCost: 330 },
      ],
    },
    target,
  });
}

function buildRefineryForecast(payload) {
  const inputScu = Number(payload?.quantity_scu || 0);
  const inputQuality = Number(payload?.quality_pct || 0);
  const baseYield = Number(payload?.base_yield_pct || 72);
  const stationBonus = Number(payload?.station_bonus_pct || 0);
  const yieldPct = Math.max(30, Math.min(98, Math.round((baseYield + stationBonus + inputQuality * 0.08) * 10) / 10));
  const estimatedOutputScu = Number((inputScu * (yieldPct / 100)).toFixed(1));
  const qualityRetainedPct = Math.max(40, Math.min(99, Math.round((inputQuality - 6 + stationBonus) * 10) / 10));
  const processingMinutes = Math.max(20, Math.round(inputScu * 1.6));
  const costAUEC = Math.max(2500, Math.round(inputScu * 82));
  const completesAt = new Date(Date.now() + processingMinutes * 60000).toISOString();

  return withData({
    input_scu: inputScu,
    input_quality: inputQuality,
    estimated_output_scu: estimatedOutputScu,
    yield_pct: yieldPct,
    quality_retained_pct: qualityRetainedPct,
    processing_minutes: processingMinutes,
    cost_aUEC: costAUEC,
    completes_at: completesAt,
    notes: `${payload?.refinery_method || 'CORMACK'} at ${payload?.station || 'ARC-L1'} is running nominally in sandbox mode.`,
  });
}

function buildRefineryEfficiency(payload) {
  const rawQty = Number(payload?.raw_quantity || payload?.rawQty || payload?.input_scu || 100);
  const rawCost = Number(payload?.raw_price || payload?.rawPrice || 42) * rawQty;
  const yieldPct = 78;
  const refinedScu = Number((rawQty * (yieldPct / 100)).toFixed(1));
  const refiningCost = Math.round(rawQty * 61);
  const totalCost = rawCost + refiningCost;
  const refinedSellValue = Math.round(refinedScu * (Number(payload?.sell_price || payload?.sellPrice || 88)));
  const grossProfit = refinedSellValue - totalCost;
  const roiPercent = totalCost > 0 ? Number(((grossProfit / totalCost) * 100).toFixed(1)) : 0;

  return withData({
    yield_pct: yieldPct,
    refined_scu: refinedScu,
    processing_minutes: Math.round(rawQty * 1.4),
    cost_aUEC: refiningCost,
    gross_profit: grossProfit,
    roi_percent: roiPercent,
    market_note: 'Sandbox projection based on nominal Stanton refinery throughput.',
    raw_input_cost: rawCost,
    refining_cost: refiningCost,
    total_cost: totalCost,
    refined_sell_value: refinedSellValue,
  });
}

function buildFleetReadiness(state) {
  const ships = getFleetShips(state);
  const stats = {
    total: ships.length,
    available: ships.filter((ship) => ship.status === 'AVAILABLE').length,
    assigned: ships.filter((ship) => ship.status === 'ASSIGNED').length,
    maintenance: ships.filter((ship) => ship.status === 'MAINTENANCE').length,
    destroyed: ships.filter((ship) => ship.status === 'DESTROYED').length,
    cargo_scu: ships.reduce((sum, ship) => sum + Number(ship.cargo_scu || 0), 0),
  };

  return withData({
    ships,
    stats,
    verse_status: 'LIVE',
    hydrogen_fuel: 78,
    uex_vehicles_count: ships.length,
  });
}

function buildSetupStatus(state) {
  const items = {
    DISCORD_GUILD_ID: true,
    DISCORD_BOT_TOKEN: true,
    DISCORD_CLIENT_ID: true,
    DISCORD_CLIENT_SECRET: true,
    DISCORD_REDIRECT_URI: true,
    SESSION_SIGNING_SECRET: true,
    APP_URL: true,
    VITE_BASE44_APP_ID: true,
  };

  const details = {
    DISCORD_GUILD_ID: 'Demo sandbox uses repo-backed temporary access instead of live Discord auth.',
    DISCORD_BOT_TOKEN: 'Demo sandbox secret present in preview-only config store.',
    DISCORD_CLIENT_ID: 'Production OAuth is intentionally untouched; demo flow bypasses it.',
    APP_URL: 'Collaboration preview is designed for a dedicated Vercel deployment.',
  };

  return withData({
    items,
    details,
    checked_at: new Date().toISOString(),
    mode: state?.meta?.mode || 'demo',
  });
}

function buildSecretStatus(state) {
  return withData(getCurrentSecrets(state));
}

function buildPhaseBrief(payload) {
  const opLabel = payload?.phase_name || `Phase ${Number(payload?.phase_index || 0) + 1}`;
  const segments = [
    `PHASE BRIEF :: ${opLabel}`,
    payload?.threat_notes ? `Threats: ${payload.threat_notes}` : 'Threats: No elevated contacts reported in sandbox telemetry.',
    payload?.material_status ? `Material status: ${payload.material_status}` : 'Material status: Holds green for the next leg.',
    payload?.custom_notes ? `Notes: ${payload.custom_notes}` : 'Notes: Maintain cohesion and report deviations through NexusOS.',
  ];

  return withData({
    brief_text: segments.join('\n'),
    discord_posted: Boolean(payload?.post_to_discord),
  });
}

function buildCraftingOptimiser(state) {
  const queue = getCraftQueue(state)
    .filter((item) => !['COMPLETE', 'CANCELLED'].includes(item.status))
    .map((item, index) => ({
      request_id: item.id,
      queue_id: item.id,
      blueprint_name: item.item_name,
      priority_score: Math.max(60, 92 - index * 7),
      feasibility: index === 0 ? 'READY' : index === 1 ? 'PARTIAL' : 'WAITING',
      rationale: index === 0 ? 'Material stock is already in reserve.' : 'Stage after the priority craft clears.',
    }));

  return withData({
    optimized_sequence: queue,
  });
}

function buildOcrExtract(payload) {
  const isRefinery = String(payload?.source_type || '').includes('REFINERY');
  return withData({
    screenshot_type: isRefinery ? 'REFINERY_ORDER' : 'INVENTORY',
    records_created: 1,
    confidence: 0.91,
    notes: isRefinery
      ? 'Sandbox OCR inferred a refinery batch and queued it for operator review.'
      : 'Sandbox OCR inferred a material inventory screenshot and logged one material batch.',
  });
}

function buildFleetSync(state, payload) {
  const ships = getFleetShips(state);
  const vehicleByModel = {
    'MISC Prospector': { cargo: { max: 32 }, crew: { min: 1, max: 1 }, role: 'Mining' },
    'Drake Cutlass Red': { cargo: { max: 12 }, crew: { min: 2, max: 2 }, role: 'Medical' },
    'ARGO RAFT': { cargo: { max: 96 }, crew: { min: 1, max: 2 }, role: 'Hauling' },
    'Aegis Gladius': { cargo: { max: 0 }, crew: { min: 1, max: 1 }, role: 'Escort' },
  };

  if (payload?.action === 'org') {
    return withData({
      org: {
        name: 'Redscar Nomads',
        handle: 'RSNM',
        focus: 'Industry / Scout / Operations',
        members: getEntities(state, 'NexusUser').length,
      },
    });
  }

  if (payload?.action === 'vehicle') {
    return withData({
      vehicle: vehicleByModel[payload?.ship_type] || { cargo: { max: 24 }, crew: { min: 1, max: 2 }, role: 'Utility' },
    });
  }

  return withData({
    ships: ships.map((ship) => ({
      id: ship.id,
      name: ship.name,
      label: ship.name,
      type: ship.model,
      cargo: ship.cargo_scu,
      status: ship.status === 'AVAILABLE' ? 'idle' : ship.status === 'ASSIGNED' ? 'active' : ship.status === 'MAINTENANCE' ? 'maintenance' : 'destroyed',
      manufacturer: ship.model.split(' ')[0],
      fleet_role: ship.class,
      pledge_cost: ship.cargo_scu ? ship.cargo_scu * 1200 : 90000,
    })),
  });
}

function buildUexSync(payload) {
  const commodities = Object.keys(PRICE_FIXTURES).map((name, index) => ({
    id: `commodity-${index + 1}`,
    name,
  }));

  if (payload?.action === 'prices') {
    const selected = commodities.find((item) => item.id === payload?.commodity_id) || commodities[0];
    const priceData = PRICE_FIXTURES[selected.name] || PRICE_FIXTURES.Agricium;
    return withData({
      commodity: selected,
      ...priceData,
    });
  }

  return withData({ commodities });
}

export async function invokeDemoFunction(name, payload = {}, context = {}) {
  const state = typeof context.getState === 'function' ? await context.getState() : { entities: {}, meta: {} };

  switch (name) {
    case 'verseStatus':
      return withData({ status: 'LIVE' });
    case 'generateInsight':
      return withData(buildInsightPayload(payload, state));
    case 'getPatchData':
      return withData({ patches: (PATCH_FIXTURES[payload?.branch || 'LIVE'] || PATCH_FIXTURES.LIVE).slice(0, Number(payload?.limit || 3)) });
    case 'ocrExtract':
      return buildOcrExtract(payload);
    case 'uexPriceSync':
      return buildUexSync(payload);
    case 'refineryEfficiencyCalculator':
      return buildRefineryEfficiency(payload);
    case 'refineryCalculator':
      return buildRefineryForecast(payload);
    case 'craftingOptimiser':
      return buildCraftingOptimiser(state);
    case 'phaseBriefing':
      return buildPhaseBrief(payload);
    case 'routePlanner':
      if (Array.isArray(payload?.deposits)) {
        return buildDepositRoute(payload);
      }
      return withData({
        route: buildRouteSummary(payload?.stations || [], Number(payload?.cargoAmount || 0), Number(payload?.commodityPrice || 0)),
      });
    case 'fleetyardsSync':
      return buildFleetSync(state, payload);
    case 'fleetReadiness':
      return buildFleetReadiness(state);
    case 'setupStatus':
      return buildSetupStatus(state);
    case 'getSecretStatus':
      return buildSecretStatus(state);
    case 'saveSecret':
      if (typeof context.saveSecret === 'function') {
        await context.saveSecret(payload?.secretId, payload?.value);
      }
      return withData({ saved: true, secretId: payload?.secretId });
    case 'fleetyardsRosterSync':
      return withData({
        synced: true,
        ships_synced: getFleetShips(state).length,
        updated_at: new Date().toISOString(),
      });
    case 'heraldBot':
      return withData({
        dispatched: true,
        action: payload?.action || 'noop',
      });
    default:
      return withData({
        message: `[DEMO] ${name} is stubbed for collaboration mode.`,
      });
  }
}
