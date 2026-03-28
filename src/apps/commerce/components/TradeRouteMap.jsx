import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

import MFDPanel from '../../../core/design/components/MFDPanel.jsx';

const SYSTEM_TABS = [
  { key: 'Stanton', color: 'var(--acc)' },
  { key: 'Pyro', color: 'var(--warn)' },
  { key: 'Nyx', color: 'var(--info)' },
];

const LOCATION_TYPE_COLORS = {
  'space station': 'var(--acc)',
  station: 'var(--acc)',
  orbital: 'var(--acc)',
  'planetary outpost': 'var(--info)',
  outpost: 'var(--info)',
  surface: 'var(--info)',
  'lagrange point': 'var(--t2)',
  lagrange: 'var(--t2)',
  moon: 'var(--warn)',
  'moon settlement': 'var(--warn)',
  settlement: 'var(--warn)',
};

const DEFAULT_ROUTES = [];

function normalizeText(value) {
  return String(value || '').trim();
}

function getLocationTypeColor(type) {
  const key = normalizeText(type).toLowerCase();
  return LOCATION_TYPE_COLORS[key] || 'var(--t2)';
}

function getMarginPercent(route) {
  const buyPrice = Number(route.buyPrice ?? route.buy_price ?? route.price_buy ?? route.purchase_price);
  const sellPrice = Number(route.sellPrice ?? route.sell_price ?? route.price_sell ?? route.sale_price);
  if (!Number.isFinite(buyPrice) || buyPrice <= 0 || !Number.isFinite(sellPrice)) {
    return Number.isFinite(Number(route.marginPercent ?? route.margin_percent))
      ? Number(route.marginPercent ?? route.margin_percent)
      : 0;
  }

  return ((sellPrice - buyPrice) / buyPrice) * 100;
}

function normalizeRoute(route, index) {
  const buyLocation = normalizeText(route.buyLocation || route.buyFrom || route.from || route.origin || route.source);
  const sellLocation = normalizeText(route.sellLocation || route.sellTo || route.to || route.destination || route.target);
  if (!buyLocation || !sellLocation) {
    return null;
  }

  const commodity = normalizeText(route.commodity || route.item || route.material) || 'Unknown Commodity';
  const system = normalizeText(route.system || route.systemFrom || route.systemTo) || 'Stanton';
  const buyPrice = Number(route.buyPrice ?? route.buy_price ?? route.price_buy ?? route.purchase_price ?? 0);
  const sellPrice = Number(route.sellPrice ?? route.sell_price ?? route.price_sell ?? route.sale_price ?? 0);
  const marginPercent = getMarginPercent(route);
  const distance = Number(route.distance ?? route.distance_au ?? route.hops ?? 0);
  const volume = Number(route.volume ?? route.tradeVolume ?? route.trade_volume ?? Math.max(1, sellPrice - buyPrice));
  const trend = normalizeText(route.trend || route.direction || 'up').toLowerCase();

  return {
    id: normalizeText(route.id) || `route-${index}`,
    commodity,
    system,
    buyLocation,
    sellLocation,
    buyType: normalizeText(route.buyType || route.buy_type || route.originType || route.locationTypeFrom || route.location_type_from) || 'Space Station',
    sellType: normalizeText(route.sellType || route.sell_type || route.destinationType || route.locationTypeTo || route.location_type_to) || 'Space Station',
    buyPrice: Number.isFinite(buyPrice) ? buyPrice : 0,
    sellPrice: Number.isFinite(sellPrice) ? sellPrice : 0,
    marginPercent: Number.isFinite(marginPercent) ? marginPercent : 0,
    distance: Number.isFinite(distance) ? distance : 0,
    volume: Number.isFinite(volume) ? volume : 1,
    trend,
  };
}

function determineMarginColor(marginPercent) {
  if (marginPercent > 30) {
    return 'var(--live)';
  }
  if (marginPercent >= 15) {
    return 'var(--warn)';
  }
  return 'var(--b2)';
}

function buildGraph(routes) {
  const nodeMap = new Map();

  routes.forEach((route) => {
    const buyKey = `${route.system}:${route.buyLocation}`;
    const sellKey = `${route.system}:${route.sellLocation}`;

    if (!nodeMap.has(buyKey)) {
      nodeMap.set(buyKey, {
        id: buyKey,
        name: route.buyLocation,
        system: route.system,
        type: route.buyType,
        volume: 0,
        highestMargin: 0,
      });
    }
    if (!nodeMap.has(sellKey)) {
      nodeMap.set(sellKey, {
        id: sellKey,
        name: route.sellLocation,
        system: route.system,
        type: route.sellType,
        volume: 0,
        highestMargin: 0,
      });
    }

    const buyNode = nodeMap.get(buyKey);
    const sellNode = nodeMap.get(sellKey);
    buyNode.volume += route.volume;
    sellNode.volume += route.volume;
    buyNode.highestMargin = Math.max(buyNode.highestMargin, route.marginPercent);
    sellNode.highestMargin = Math.max(sellNode.highestMargin, route.marginPercent);
  });

  const nodes = Array.from(nodeMap.values());
  const maxVolume = Math.max(1, ...nodes.map((node) => node.volume));
  const links = routes.map((route) => ({
    ...route,
    source: `${route.system}:${route.buyLocation}`,
    target: `${route.system}:${route.sellLocation}`,
  }));

  const topNodeIds = new Set(
    nodes
      .slice()
      .sort((left, right) => right.volume - left.volume)
      .slice(0, Math.min(4, nodes.length))
      .map((node) => node.id),
  );

  return {
    nodes: nodes.map((node) => ({
      ...node,
      radius: 8 + ((node.volume / maxVolume) * 14),
      pulse: topNodeIds.has(node.id),
    })),
    links,
  };
}

function buildPlanSegments(stops, routes) {
  if (stops.length < 2) {
    return [];
  }

  const segments = [];
  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    const route = routes.find((entry) => entry.source === from.id && entry.target === to.id)
      || routes.find((entry) => entry.source === to.id && entry.target === from.id);
    if (route) {
      segments.push(route);
    }
  }
  return segments;
}

export default function TradeRouteMap({
  routeData = DEFAULT_ROUTES,
  onRouteSelect,
  onPlanChange,
  height = 460,
  interactive = true,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const viewportRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const [system, setSystem] = useState('Stanton');
  const [selectedCommodity, setSelectedCommodity] = useState('ALL');
  const [marginThreshold, setMarginThreshold] = useState(10);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [graphState, setGraphState] = useState({ nodes: [], links: [] });
  const [zoomLevel, setZoomLevel] = useState('x1.0');
  const [builderMode, setBuilderMode] = useState(false);
  const [plannedStops, setPlannedStops] = useState([]);
  const [shareState, setShareState] = useState('Share Plan');
  const [resetSeed, setResetSeed] = useState(0);

  const normalizedRoutes = useMemo(
    () => (Array.isArray(routeData) && routeData.length > 0 ? routeData : DEFAULT_ROUTES)
      .map(normalizeRoute)
      .filter(Boolean),
    [routeData],
  );

  const commodityOptions = useMemo(() => {
    return ['ALL', ...new Set(normalizedRoutes.map((route) => route.commodity))];
  }, [normalizedRoutes]);

  const filteredRoutes = useMemo(() => {
    return normalizedRoutes.filter((route) => {
      if (route.system !== system) {
        return false;
      }
      if (selectedCommodity !== 'ALL' && route.commodity !== selectedCommodity) {
        return false;
      }
      return route.marginPercent >= marginThreshold;
    });
  }, [marginThreshold, normalizedRoutes, selectedCommodity, system]);

  const graph = useMemo(() => buildGraph(filteredRoutes), [filteredRoutes]);

  const topTickerRoutes = useMemo(() => {
    return filteredRoutes
      .slice()
      .sort((left, right) => right.marginPercent - left.marginPercent)
      .slice(0, 5);
  }, [filteredRoutes]);

  const plannedSegments = useMemo(
    () => buildPlanSegments(plannedStops, graph.links),
    [graph.links, plannedStops],
  );

  useEffect(() => {
    if (onPlanChange) {
      onPlanChange({
        stops: plannedStops,
        segments: plannedSegments,
        totalMarginPercent: plannedSegments.reduce((sum, route) => sum + route.marginPercent, 0),
      });
    }
  }, [onPlanChange, plannedSegments, plannedStops]);

  useEffect(() => {
    if (!svgRef.current || !viewportRef.current) {
      return undefined;
    }

    const width = containerRef.current?.clientWidth || 960;
    const nodes = graph.nodes.map((node, index) => ({
      ...node,
      x: width / 2 + ((index % 4) - 1.5) * 80,
      y: height / 2 + (Math.floor(index / 4) - 0.5) * 70,
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links = graph.links.map((link) => ({
      ...link,
      source: nodeById.get(link.source),
      target: nodeById.get(link.target),
    })).filter((link) => link.source && link.target);

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((node) => node.id).distance((link) => 120 - Math.min(40, link.marginPercent)).strength(0.25))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((node) => node.radius + 18))
      .on('tick', () => {
        setGraphState({
          nodes: nodes.map((node) => ({ ...node })),
          links: links.map((link) => ({ ...link })),
        });
      });

    simulation.alpha(1).restart();
    simulationRef.current = simulation;
    return () => simulation.stop();
  }, [graph.links, graph.nodes, height, resetSeed]);

  useEffect(() => {
    if (!svgRef.current || !viewportRef.current) {
      return undefined;
    }

    const svg = d3.select(svgRef.current);
    const viewport = d3.select(viewportRef.current);
    const zoom = d3.zoom()
      .scaleExtent([0.6, 2.4])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString());
        setZoomLevel(`x${event.transform.k.toFixed(1)}`);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  useEffect(() => {
    if (!interactive || !svgRef.current) {
      return undefined;
    }

    const selection = d3.select(svgRef.current).selectAll('.trade-node');
    const dragBehavior = d3.drag()
      .on('start', (event, node) => {
        if (!simulationRef.current) {
          return;
        }
        if (!event.active) {
          simulationRef.current.alphaTarget(0.25).restart();
        }
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event, node) => {
        if (!simulationRef.current) {
          return;
        }
        if (!event.active) {
          simulationRef.current.alphaTarget(0);
        }
        node.fx = null;
        node.fy = null;
      });

    selection.call(dragBehavior);
    return () => {
      selection.on('.drag', null);
    };
  }, [graphState.nodes, interactive]);

  function openTooltip(content, event) {
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top + 10,
      ...content,
    });
  }

  function handleNodeClick(node, event) {
    if (!interactive) {
      return;
    }

    if (builderMode) {
      setSelectedRouteId(null);
      setTooltip(null);
      setSelectedNodeId(null);
      setPlannedStops((current) => {
        if (current.length === 0) {
          return [node];
        }
        if (current[current.length - 1]?.id === node.id) {
          return current;
        }
        return [...current, node];
      });
      return;
    }

    setSelectedRouteId(null);
    setTooltip(null);
    setSelectedNodeId((current) => (current === node.id ? null : node.id));
    openTooltip(
      {
        type: 'node',
        title: node.name,
        subtitle: `${node.type} · ${node.system}`,
        body: `${node.volume.toFixed(0)} trade volume`,
      },
      event,
    );
  }

  function handleRouteClick(route, event) {
    if (!interactive) {
      return;
    }

    setSelectedNodeId(null);
    setSelectedRouteId(route.id);
    openTooltip(
      {
        type: 'route',
        title: `${route.buyLocation} → ${route.sellLocation}`,
        subtitle: route.commodity,
        body: [
          `Buy ${route.buyPrice.toFixed(1)} aUEC`,
          `Sell ${route.sellPrice.toFixed(1)} aUEC`,
          `Margin ${route.marginPercent.toFixed(1)}%`,
          `Distance ${route.distance.toFixed(1)} AU`,
        ],
      },
      event,
    );
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  }

  function handleBackgroundReset() {
    setSelectedNodeId(null);
    setSelectedRouteId(null);
    setHoveredNodeId(null);
    setTooltip(null);
    setPlannedStops([]);
    setResetSeed((current) => current + 1);
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(260).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }

  async function handleSharePlan() {
    if (plannedStops.length < 2) {
      setShareState('No Route');
      window.setTimeout(() => setShareState('Share Plan'), 1200);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('tradePlan', btoa(encodeURIComponent(JSON.stringify(plannedStops.map((stop) => stop.id)))));

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareState('Copied');
    } catch {
      setShareState('Copy Failed');
    }
    window.setTimeout(() => setShareState('Share Plan'), 1400);
  }

  return (
    <MFDPanel
      label="TRADE ROUTE MAP"
      statusDot={topTickerRoutes.length > 0 ? 'var(--live)' : 'var(--t2)'}
      action={(
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="nexus-btn"
            onClick={() => setBuilderMode((current) => !current)}
            style={{
              padding: '5px 10px',
              background: builderMode ? 'rgba(var(--warn-rgb), 0.12)' : 'var(--bg2)',
              borderColor: builderMode ? 'var(--warn)' : 'var(--b1)',
              color: builderMode ? 'var(--warn)' : 'var(--t2)',
            }}
          >
            Route Planner
          </button>
        </div>
      )}
    >
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg0)' }}>
        <style>
          {`
            @keyframes trade-node-pulse {
              0%, 100% { opacity: 0.65; }
              50% { opacity: 1; }
            }
            @keyframes trade-flow {
              0% { stroke-dashoffset: 18; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes trade-ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}
        </style>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SYSTEM_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="nexus-btn"
                onClick={() => {
                  setSystem(tab.key);
                  setSelectedNodeId(null);
                  setSelectedRouteId(null);
                  setTooltip(null);
                  setPlannedStops([]);
                }}
                style={{
                  padding: '5px 11px',
                  background: system === tab.key ? 'var(--bg3)' : 'var(--bg2)',
                  borderColor: system === tab.key ? tab.color : 'var(--b1)',
                  color: system === tab.key ? 'var(--t0)' : 'var(--t2)',
                }}
              >
                {tab.key}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {commodityOptions.map((commodity) => (
              <button
                key={commodity}
                type="button"
                className="nexus-btn"
                onClick={() => setSelectedCommodity(commodity)}
                style={{
                  padding: '4px 9px',
                  background: selectedCommodity === commodity ? 'rgba(var(--acc-rgb), 0.14)' : 'var(--bg2)',
                  borderColor: selectedCommodity === commodity ? 'var(--acc)' : 'var(--b1)',
                  color: selectedCommodity === commodity ? 'var(--t0)' : 'var(--t2)',
                }}
              >
                {commodity}
              </button>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', minWidth: 220 }}>
              <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Margin
              </span>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={marginThreshold}
                onChange={(event) => setMarginThreshold(Number(event.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: 'var(--t2)', fontSize: 10, minWidth: 42 }}>{`${marginThreshold}%`}</span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            position: 'relative',
            height,
            background: 'var(--bg0)',
            border: '0.5px solid var(--b1)',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            onDoubleClick={handleBackgroundReset}
            style={{ display: 'block' }}
          >
            <rect x="0" y="0" width="100%" height="100%" fill="transparent" />
            <g ref={viewportRef}>
              {graphState.links.map((route) => {
                const isRouteSelected = selectedRouteId === route.id;
                const connectedToSelectedNode = selectedNodeId
                  ? route.source.id === selectedNodeId || route.target.id === selectedNodeId
                  : false;
                const dimmed = selectedNodeId
                  ? !connectedToSelectedNode
                  : selectedRouteId
                    ? !isRouteSelected
                    : false;
                const isPlanned = plannedSegments.some((segment) => segment.id === route.id);

                return (
                  <g key={route.id}>
                    <line
                      x1={route.source.x}
                      y1={route.source.y}
                      x2={route.target.x}
                      y2={route.target.y}
                      stroke={determineMarginColor(route.marginPercent)}
                      strokeWidth={Math.max(0.5, Math.min(3, 0.5 + (route.marginPercent / 12)))}
                      strokeDasharray={isPlanned ? '0' : '6 4'}
                      strokeLinecap="round"
                      opacity={dimmed ? 0.2 : isRouteSelected ? 1 : 0.78}
                      style={isPlanned ? undefined : { animation: 'trade-flow 1.2s linear infinite' }}
                    />
                    <line
                      x1={route.source.x}
                      y1={route.source.y}
                      x2={route.target.x}
                      y2={route.target.y}
                      stroke="transparent"
                      strokeWidth={14}
                      onClick={(event) => handleRouteClick(route, event)}
                    />
                  </g>
                );
              })}

              {graphState.nodes.map((node) => {
                const connectedToSelected = selectedNodeId
                  ? node.id === selectedNodeId || graphState.links.some((link) => (
                    (link.source.id === selectedNodeId && link.target.id === node.id)
                    || (link.target.id === selectedNodeId && link.source.id === node.id)
                  ))
                  : true;
                const dimmed = selectedNodeId ? !connectedToSelected : false;
                const planned = plannedStops.some((stop) => stop.id === node.id);

                return (
                  <g
                    key={node.id}
                    className="trade-node"
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                    onClick={(event) => handleNodeClick(node, event)}
                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                  >
                    <circle
                      r={node.radius + 8}
                      fill="transparent"
                    />
                    <circle
                      r={node.radius}
                      fill={getLocationTypeColor(node.type)}
                      opacity={dimmed ? 0.2 : 0.2}
                      stroke={planned ? 'var(--warn)' : getLocationTypeColor(node.type)}
                      strokeWidth={planned ? 1.1 : 0.8}
                      style={node.pulse ? { animation: 'trade-node-pulse 2.2s ease-in-out infinite' } : undefined}
                    />
                    <circle
                      r={Math.max(3.2, node.radius * 0.32)}
                      fill={planned ? 'var(--warn)' : getLocationTypeColor(node.type)}
                      opacity={dimmed ? 0.2 : 0.92}
                    />
                    {hoveredNodeId === node.id ? (
                      <text
                        x={node.radius + 8}
                        y={-node.radius - 6}
                        fill="var(--t3)"
                        fontSize="8"
                        style={{ fontFamily: 'var(--font)', pointerEvents: 'none' }}
                      >
                        {node.name}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {`${system} route mesh`}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              color: 'var(--t3)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}
          >
            {`Zoom ${zoomLevel}`}
          </div>

          {tooltip ? (
            <div
              style={{
                position: 'absolute',
                top: tooltip.y,
                left: tooltip.x,
                minWidth: 220,
                maxWidth: 280,
                background: 'var(--bg2)',
                border: '0.5px solid var(--b2)',
                borderRadius: 6,
                padding: '10px 12px',
                zIndex: 5,
              }}
            >
              <div style={{ color: 'var(--t0)', fontSize: 10, marginBottom: 4 }}>{tooltip.title}</div>
              <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 6 }}>{tooltip.subtitle}</div>
              {Array.isArray(tooltip.body) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tooltip.body.map((line) => (
                    <span key={line} style={{ color: 'var(--t2)', fontSize: 10 }}>
                      {line}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--t2)', fontSize: 10 }}>{tooltip.body}</div>
              )}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            overflow: 'hidden',
            border: '0.5px solid var(--b1)',
            borderRadius: 6,
            background: 'var(--bg1)',
            padding: '8px 0',
          }}
        >
          <div style={{ padding: '0 12px', color: 'var(--t3)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Profit Ticker
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                display: 'inline-flex',
                gap: 28,
                whiteSpace: 'nowrap',
                animation: topTickerRoutes.length > 0 ? 'trade-ticker 18s linear infinite' : 'none',
                paddingRight: 28,
                minWidth: '200%',
              }}
            >
              {[...topTickerRoutes, ...topTickerRoutes].map((route, index) => (
                <span
                  key={`${route.id}-${index}`}
                  style={{
                    color: route.trend === 'down' ? 'var(--danger)' : 'var(--live)',
                    fontSize: 10,
                    fontFamily: 'var(--font)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {`${route.commodity} ${route.buyLocation}→${route.sellLocation} ${route.marginPercent.toFixed(1)}%`}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Mining', 'Combat', 'Hauling', 'Exploration'].map((gapRole) => {
              const roleKey = gapRole.toLowerCase();
              const hasCoverage = filteredRoutes.some((route) => route.commodity.toLowerCase().includes(roleKey) || route.buyType.toLowerCase().includes(roleKey));
              if (hasCoverage) {
                return null;
              }
              return (
                <button
                  key={gapRole}
                  type="button"
                  className="nexus-btn"
                  onClick={() => setSelectedCommodity('ALL')}
                  style={{
                    padding: '5px 9px',
                    background: 'rgba(var(--danger-rgb), 0.12)',
                    borderColor: 'var(--danger-b)',
                    color: 'var(--danger)',
                  }}
                >
                  {`${gapRole} gap`}
                </button>
              );
            })}
          </div>

          {builderMode ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginLeft: 'auto',
              }}
            >
              <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {plannedStops.length > 0
                  ? plannedStops.map((stop) => stop.name).join(' → ')
                  : 'Select start node'}
              </span>
              <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'var(--warn-b)', background: 'var(--warn-bg)' }}>
                {`${plannedSegments.reduce((sum, route) => sum + route.marginPercent, 0).toFixed(1)}% projected`}
              </span>
              <button type="button" className="nexus-btn" onClick={() => setPlannedStops([])} style={{ padding: '5px 8px' }}>
                Reset Plan
              </button>
              <button
                type="button"
                className="nexus-btn"
                onClick={handleSharePlan}
                style={{
                  padding: '5px 10px',
                  background: 'rgba(var(--warn-rgb), 0.12)',
                  borderColor: 'var(--warn)',
                  color: 'var(--warn)',
                }}
              >
                {shareState}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </MFDPanel>
  );
}