import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Approximate fuel consumption rates (aUEC per km) by ship class
const FUEL_RATES = {
  fighter: 0.08,
  heavy_fighter: 0.12,
  miner: 0.15,
  hauler: 0.20,
  salvager: 0.18,
  explorer: 0.10,
  medical: 0.14,
  default: 0.12,
};

// Station coordinates (simplified Star Citizen universe)
const STATIONS = {
  'New Babbage': { x: 0, y: 0, system: 'Stanton' },
  'Port Olisar': { x: 100, y: 150, system: 'Stanton' },
  'Klescher': { x: 200, y: 80, system: 'Stanton' },
  'Levski': { x: 50, y: 200, system: 'Stanton' },
  'Grim Hex': { x: 300, y: 120, system: 'Stanton' },
  'Area 18': { x: 20, y: 50, system: 'Stanton' },
  'Loreville': { x: 150, y: 180, system: 'Stanton' },
  'Arccorp': { x: 100, y: 100, system: 'Stanton' },
};

function calculateDistance(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateRoute(stations, shipClass, cargoAmount, commodityPrice) {
  if (stations.length < 2) {
    throw new Error('At least 2 stations required');
  }

  const fuelRate = FUEL_RATES[shipClass] || FUEL_RATES.default;
  let totalDistance = 0;
  let totalFuelCost = 0;
  let totalTransitTime = 0; // minutes
  const legs = [];

  // Calculate each leg of the journey
  for (let i = 0; i < stations.length - 1; i++) {
    const from = STATIONS[stations[i]];
    const to = STATIONS[stations[i + 1]];

    if (!from || !to) {
      throw new Error(`Station not found: ${!from ? stations[i] : stations[i + 1]}`);
    }

    const distance = calculateDistance(from, to);
    const fuelCost = Math.round(distance * fuelRate * 25); // 25 aUEC per unit fuel
    const transitTime = Math.round((distance / 200) * 60); // ~200 km/min cruise speed

    totalDistance += distance;
    totalFuelCost += fuelCost;
    totalTransitTime += transitTime;

    legs.push({
      from: stations[i],
      to: stations[i + 1],
      distance: Math.round(distance),
      fuelCost,
      transitTime,
    });
  }

  // Revenue calculation
  const cargoValue = Math.round(cargoAmount * commodityPrice);
  const netProfit = cargoValue - totalFuelCost;
  const profitMargin = cargoValue > 0 ? ((netProfit / cargoValue) * 100).toFixed(1) : 0;

  return {
    legs,
    summary: {
      totalDistance: Math.round(totalDistance),
      totalFuelCost,
      totalTransitTime,
      cargoAmount,
      commodityPrice,
      cargoValue,
      netProfit,
      profitMargin: parseFloat(profitMargin),
      roi: cargoValue > 0 ? ((netProfit / totalFuelCost) * 100).toFixed(1) : 0,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'POST required' }, { status: 400 });
    }

    const body = await req.json();
    const { stations, shipClass, cargoAmount, commodityPrice } = body;

    if (!stations || !Array.isArray(stations) || !shipClass || !commodityPrice) {
      return Response.json(
        { error: 'stations, shipClass, and commodityPrice required' },
        { status: 400 }
      );
    }

    const route = calculateRoute(
      stations,
      shipClass.toLowerCase(),
      cargoAmount || 100,
      commodityPrice || 1
    );

    return Response.json({ route, stations: STATIONS });
  } catch (error) {
    console.error('[routePlanner]', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
