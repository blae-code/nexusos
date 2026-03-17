import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { MapPin, Plus, X, TrendingUp, Fuel, Clock, Package } from 'lucide-react';
import ProfitableRoutes from './components/ProfitableRoutes';
import CommodityDemandChart from './components/CommodityDemandChart';

const STATIONS = [
  'New Babbage',
  'Port Olisar',
  'Klescher',
  'Levski',
  'Grim Hex',
  'Area 18',
  'Loreville',
  'Arccorp',
];

const SHIP_CLASSES = ['Fighter', 'Heavy Fighter', 'Miner', 'Hauler', 'Salvager', 'Explorer'];

export default function RoutePlanner() {
  const [selectedStations, setSelectedStations] = useState([]);
  const [shipClass, setShipClass] = useState('Hauler');
  const [cargoAmount, setCargoAmount] = useState(100);
  const [commodityPrice, setCommodityPrice] = useState(150);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStation = (station) => {
    if (!selectedStations.includes(station)) {
      setSelectedStations([...selectedStations, station]);
    }
  };

  const removeStation = (index) => {
    setSelectedStations(selectedStations.filter((_, i) => i !== index));
  };

  const calculateRoute = useCallback(async () => {
    if (selectedStations.length < 2) {
      setError('Select at least 2 stations');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('routePlanner', {
        stations: selectedStations,
        shipClass,
        cargoAmount: parseInt(cargoAmount),
        commodityPrice: parseFloat(commodityPrice),
      });
      setRoute(res.data?.route);
    } catch (err) {
      setError(err.message || 'Route calculation failed');
      console.error('[RoutePlanner]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStations, shipClass, cargoAmount, commodityPrice]);

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Controls */}
      <div
        style={{
          background: 'var(--bg1)',
          borderBottom: '0.5px solid var(--b1)',
          padding: '16px',
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Route Planner
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 11 }}>
              Select stations, cargo specs, and calculate profit margins
            </div>
          </div>

          {/* Station Selection */}
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>
              STATIONS
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {STATIONS.map((station) => (
                <button
                  key={station}
                  onClick={() => addStation(station)}
                  disabled={selectedStations.includes(station)}
                  style={{
                    padding: '6px 10px',
                    background: selectedStations.includes(station) ? 'rgba(192,57,43,0.12)' : 'var(--bg2)',
                    border: `0.5px solid ${selectedStations.includes(station) ? 'rgba(192,57,43,0.3)' : 'var(--b0)'}`,
                    borderRadius: 4,
                    color: selectedStations.includes(station) ? 'var(--t0)' : 'var(--t1)',
                    fontSize: 10,
                    cursor: selectedStations.includes(station) ? 'not-allowed' : 'pointer',
                    opacity: selectedStations.includes(station) ? 1 : 0.7,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {station}
                </button>
              ))}
            </div>

            {selectedStations.length > 0 && (
              <div
                style={{
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b0)',
                  borderRadius: 4,
                  padding: '10px 12px',
                }}
              >
                <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 6, letterSpacing: '0.08em' }}>
                  ROUTE SEQUENCE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {selectedStations.map((station, i) => (
                    <React.Fragment key={station}>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: 'var(--bg1)',
                          borderRadius: 3,
                          fontSize: 10,
                          color: 'var(--t0)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {station}
                        <button
                          onClick={() => removeStation(i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--t2)',
                            cursor: 'pointer',
                            display: 'flex',
                          }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                      {i < selectedStations.length - 1 && (
                        <span style={{ color: 'var(--t2)', fontSize: 10 }}>→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ship & Cargo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 4, display: 'block' }}>
                SHIP CLASS
              </label>
              <select
                value={shipClass}
                onChange={(e) => setShipClass(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b0)',
                  borderRadius: 4,
                  color: 'var(--t1)',
                  fontSize: 10,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {SHIP_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 4, display: 'block' }}>
                CARGO (SCU)
              </label>
              <input
                type="number"
                value={cargoAmount}
                onChange={(e) => setCargoAmount(e.target.value)}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b0)',
                  borderRadius: 4,
                  color: 'var(--t1)',
                  fontSize: 10,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 4, display: 'block' }}>
                PRICE/SCU (aUEC)
              </label>
              <input
                type="number"
                value={commodityPrice}
                onChange={(e) => setCommodityPrice(e.target.value)}
                min="1"
                step="10"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b0)',
                  borderRadius: 4,
                  color: 'var(--t1)',
                  fontSize: 10,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateRoute}
            disabled={loading || selectedStations.length < 2}
            style={{
              padding: '8px 14px',
              background: loading || selectedStations.length < 2 ? 'var(--bg2)' : 'var(--live)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--bg0)',
              fontSize: 11,
              fontWeight: 600,
              cursor: loading || selectedStations.length < 2 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: loading || selectedStations.length < 2 ? 0.5 : 1,
            }}
          >
            {loading ? 'CALCULATING...' : 'CALCULATE ROUTE'}
          </button>

          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(var(--danger-rgb), 0.1)', border: '0.5px solid rgba(var(--danger-rgb), 0.2)', borderRadius: 4, color: 'var(--danger)', fontSize: 10 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Demand & Routes Visualizations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CommodityDemandChart />
            <ProfitableRoutes />
          </div>

          {/* Route Results */}
          {route ? (
          <div>
            {/* Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  label: 'TOTAL DISTANCE',
                  value: `${route.summary.totalDistance} km`,
                  icon: MapPin,
                  color: 'var(--acc)',
                },
                {
                  label: 'TRANSIT TIME',
                  value: `${route.summary.totalTransitTime} min`,
                  icon: Clock,
                  color: 'var(--info)',
                },
                {
                  label: 'FUEL COST',
                  value: `${route.summary.totalFuelCost.toLocaleString()} aUEC`,
                  icon: Fuel,
                  color: 'var(--warn)',
                },
                {
                  label: 'CARGO VALUE',
                  value: `${route.summary.cargoValue.toLocaleString()} aUEC`,
                  icon: Package,
                  color: 'var(--live)',
                },
                {
                  label: 'NET PROFIT',
                  value: `${route.summary.netProfit.toLocaleString()} aUEC`,
                  icon: TrendingUp,
                  color: route.summary.netProfit > 0 ? 'var(--live)' : 'var(--danger)',
                },
                {
                  label: 'PROFIT MARGIN',
                  value: `${route.summary.profitMargin}%`,
                  icon: TrendingUp,
                  color: route.summary.profitMargin > 0 ? 'var(--live)' : 'var(--danger)',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    style={{
                      background: 'var(--bg1)',
                      border: '0.5px solid var(--b1)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon size={12} style={{ color: card.color }} />
                      <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>
                        {card.label}
                      </span>
                    </div>
                    <div style={{ color: card.color, fontSize: 14, fontWeight: 700 }}>
                      {card.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Route Legs */}
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600 }}>
                ROUTE LEGS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {route.legs.map((leg, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg1)',
                      border: '0.5px solid var(--b1)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>
                        {leg.from}
                      </span>
                      <span style={{ color: 'var(--t2)', fontSize: 10 }}>→</span>
                      <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>
                        {leg.to}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, color: 'var(--t2)', fontSize: 10 }}>
                      <span>{leg.distance} km</span>
                      <span>{leg.transitTime} min</span>
                      <span style={{ color: 'var(--warn)' }}>
                        {leg.fuelCost.toLocaleString()} aUEC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--t2)', paddingTop: 40 }}>
              <MapPin size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>Select stations and calculate a route to see profit projections</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}