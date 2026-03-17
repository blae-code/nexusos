import React, { useEffect, useMemo, useRef, useState } from 'react';

import MFDPanel from '../../../core/design/components/MFDPanel.jsx';

const MISSION_ROLES = [
  { key: 'mining', label: 'Mining', color: 'var(--warn)' },
  { key: 'combat', label: 'Combat', color: 'var(--danger)' },
  { key: 'hauling', label: 'Hauling', color: 'var(--acc)' },
  { key: 'exploration', label: 'Exploration', color: 'var(--info)' },
  { key: 'medical', label: 'Medical', color: 'var(--live)' },
  { key: 'refining', label: 'Refining', color: 'var(--warn)' },
  { key: 'scouting', label: 'Scouting', color: 'var(--info)' },
  { key: 'racing', label: 'Racing', color: 'var(--acc2, var(--acc))' },
];

const ROLE_ALIASES = {
  mining: ['mining', 'miner', 'industrial mining', 'prospecting', 'salvage'],
  combat: ['combat', 'escort', 'fighter', 'security', 'interceptor', 'gunship'],
  hauling: ['hauling', 'cargo', 'freight', 'transport', 'trading', 'logistics'],
  exploration: ['exploration', 'expedition', 'command', 'support', 'survey'],
  medical: ['medical', 'rescue', 'medevac', 'triage'],
  refining: ['refining', 'refinery', 'processing', 'industrial'],
  scouting: ['scouting', 'intel', 'recon', 'reconnaissance', 'scanner', 'sensor'],
  racing: ['racing', 'race'],
};

const ROLE_TARGETS = {
  mining: 2,
  combat: 3,
  hauling: 2,
  exploration: 1,
  medical: 1,
  refining: 1,
  scouting: 2,
  racing: 1,
};

const SHIP_ROLE_INFERENCE = [
  { test: /prospector|mole|orion|roc|mining/i, roles: ['mining', 'refining'] },
  { test: /caterpillar|hercules|hull|freelancer|max|hauler|cargo/i, roles: ['hauling'] },
  { test: /arrow|gladius|hornet|sab(re|er)|fighter|combat|cutlass/i, roles: ['combat', 'scouting'] },
  { test: /carrack|pisces|terrapin|corsair|explor/i, roles: ['exploration', 'scouting'] },
  { test: /apollo|c8r|med/i, roles: ['medical'] },
  { test: /starfarer|expanse|refin/i, roles: ['refining', 'hauling'] },
  { test: /razor|m50|racing/i, roles: ['racing'] },
];

function normalizeText(value) {
  return String(value || '').trim();
}

function titleCase(value) {
  const text = normalizeText(value);
  return text ? text.replace(/\b\w/g, (match) => match.toUpperCase()) : 'Unknown';
}

function extractMemberName(record) {
  return normalizeText(
    record.callsign
    || record.member_callsign
    || record.member_name
    || record.memberName
    || record.created_by_callsign
    || record.owner_callsign
    || record.display_name
    || record.name,
  );
}

function extractShipName(record) {
  return normalizeText(
    record.ship_name
    || record.shipName
    || record.model
    || record.vehicle_name
    || record.vehicleName
    || record.name
    || record.ship?.name,
  );
}

function collectRoleTokens(record) {
  const bucket = [];
  const candidateFields = [
    record.role_tag,
    record.role,
    record.ship_role,
    record.shipClass,
    record.ship_class,
    record.class,
    record.type,
  ];

  candidateFields.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => bucket.push(normalizeText(item).toLowerCase()));
      return;
    }
    if (value && typeof value === 'string') {
      bucket.push(value.toLowerCase());
    }
  });

  ['roles', 'capabilities', 'mission_roles', 'supported_roles', 'tags'].forEach((field) => {
    const value = record[field];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string') {
          bucket.push(item.toLowerCase());
        } else if (item && typeof item === 'object') {
          Object.values(item).forEach((nestedValue) => {
            if (typeof nestedValue === 'string') {
              bucket.push(nestedValue.toLowerCase());
            }
          });
        }
      });
    }
  });

  const shipName = extractShipName(record);
  SHIP_ROLE_INFERENCE.forEach((rule) => {
    if (rule.test.test(shipName)) {
      bucket.push(...rule.roles);
    }
  });

  return bucket;
}

function inferRoles(record) {
  const tokens = collectRoleTokens(record);
  const roles = new Set();

  Object.entries(ROLE_ALIASES).forEach(([roleKey, aliases]) => {
    if (tokens.some((token) => aliases.some((alias) => token.includes(alias)))) {
      roles.add(roleKey);
    }
  });

  return roles;
}

function encodePlan(plan) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(plan))));
  } catch {
    return '';
  }
}

function FleetStrengthBar({ roleScores }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Fleet Strength
        </span>
        <span style={{ color: 'var(--t2)', fontSize: 10 }}>
          {`${Math.round(Object.values(roleScores).reduce((sum, value) => sum + value, 0) / MISSION_ROLES.length)}% ready`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MISSION_ROLES.length}, minmax(0, 1fr))`, gap: 5 }}>
        {MISSION_ROLES.map((role) => (
          <div
            key={role.key}
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--b1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: 28,
                display: 'flex',
                alignItems: 'flex-end',
                background: 'rgba(var(--bg0-rgb), 0.18)',
              }}
            >
              <div
                style={{
                  width: `${roleScores[role.key] || 0}%`,
                  height: '100%',
                  background: role.color,
                  opacity: 0.72,
                  transition: 'width 420ms ease-out',
                }}
              />
            </div>
            <div style={{ padding: '5px 6px 6px', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {role.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CapabilityRadar({ roleScores, drawProgress }) {
  const size = 360;
  const center = size / 2;
  const radius = 128;
  const angleStep = (Math.PI * 2) / MISSION_ROLES.length;

  const axes = MISSION_ROLES.map((role, index) => {
    const angle = (-Math.PI / 2) + (index * angleStep);
    const outerX = center + (Math.cos(angle) * radius);
    const outerY = center + (Math.sin(angle) * radius);
    const labelX = center + (Math.cos(angle) * (radius + 22));
    const labelY = center + (Math.sin(angle) * (radius + 22));
    return { role, angle, outerX, outerY, labelX, labelY };
  });

  const polygonPoints = axes.map(({ role, angle }) => {
    const score = ((roleScores[role.key] || 0) / 100) * drawProgress;
    const pointRadius = radius * score;
    const x = center + (Math.cos(angle) * pointRadius);
    const y = center + (Math.sin(angle) * pointRadius);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="360" role="img" aria-label="Fleet capability radar">
        {gridLevels.map((level) => {
          const points = axes.map(({ angle }) => {
            const x = center + (Math.cos(angle) * radius * level);
            const y = center + (Math.sin(angle) * radius * level);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="var(--b1)"
              strokeWidth="0.5"
              opacity={level === 1 ? 1 : 0.65}
            />
          );
        })}

        {axes.map(({ role, outerX, outerY, labelX, labelY }) => (
          <g key={role.key}>
            <line x1={center} y1={center} x2={outerX} y2={outerY} stroke="var(--b1)" strokeWidth="0.5" />
            <text
              x={labelX}
              y={labelY}
              fill="var(--t3)"
              fontSize="9"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontFamily: 'var(--font)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              {role.label.toUpperCase()}
            </text>
          </g>
        ))}

        <polygon
          points={axes.map(({ angle }) => {
            const x = center + (Math.cos(angle) * radius);
            const y = center + (Math.sin(angle) * radius);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="var(--b1)"
          strokeWidth="0.5"
        />

        <polygon
          points={polygonPoints}
          fill="rgba(var(--acc-rgb), 0.3)"
          stroke="var(--acc)"
          strokeWidth="1"
          style={{ transition: 'all 420ms ease-out' }}
        />

        {axes.map(({ role, angle }) => {
          const score = ((roleScores[role.key] || 0) / 100) * drawProgress;
          const pointRadius = radius * score;
          const x = center + (Math.cos(angle) * pointRadius);
          const y = center + (Math.sin(angle) * pointRadius);
          return <circle key={`${role.key}-point`} cx={x} cy={y} r="3" fill="var(--acc)" />;
        })}
      </svg>
    </div>
  );
}

export default function FleetMatrix({
  fleetData = [],
  onGapIdentified,
  interactive = true,
}) {
  const matrixRef = useRef(null);
  const [viewMode, setViewMode] = useState('matrix');
  const [builderMode, setBuilderMode] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [planner, setPlanner] = useState(null);
  const [plannedCells, setPlannedCells] = useState({});
  const [roleFilter, setRoleFilter] = useState(null);
  const [shareState, setShareState] = useState('Share Plan');
  const [drawProgress, setDrawProgress] = useState(0);

  const rows = useMemo(() => {
    const map = new Map();

    (Array.isArray(fleetData) ? fleetData : []).forEach((record, index) => {
      const shipName = extractShipName(record);
      if (!shipName) {
        return;
      }

      const memberName = extractMemberName(record) || `Crew ${index + 1}`;
      const roles = inferRoles(record);
      const key = shipName.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          shipName,
          members: new Set(),
          roleCoverage: new Map(),
        });
      }

      const row = map.get(key);
      row.members.add(memberName);
      roles.forEach((roleKey) => {
        if (!row.roleCoverage.has(roleKey)) {
          row.roleCoverage.set(roleKey, new Set());
        }
        row.roleCoverage.get(roleKey).add(memberName);
      });
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        members: Array.from(row.members).sort(),
        roleCoverage: new Map(
          Array.from(row.roleCoverage.entries()).map(([roleKey, members]) => [roleKey, Array.from(members).sort()]),
        ),
      }))
      .sort((left, right) => left.shipName.localeCompare(right.shipName));
  }, [fleetData]);

  const availableShips = useMemo(
    () => rows.map((row) => row.shipName),
    [rows],
  );

  const globalCoverage = useMemo(() => {
    const coverage = Object.fromEntries(MISSION_ROLES.map((role) => [role.key, 0]));
    rows.forEach((row) => {
      MISSION_ROLES.forEach((role) => {
        if (row.roleCoverage.has(role.key)) {
          coverage[role.key] += Math.max(1, row.roleCoverage.get(role.key).length);
        }
      });
    });
    return coverage;
  }, [rows]);

  const roleScores = useMemo(() => {
    return Object.fromEntries(
      MISSION_ROLES.map((role) => {
        const score = Math.min(100, Math.round((globalCoverage[role.key] / ROLE_TARGETS[role.key]) * 100));
        return [role.key, score];
      }),
    );
  }, [globalCoverage]);

  const gapRoles = useMemo(() => {
    return MISSION_ROLES.filter((role) => (globalCoverage[role.key] || 0) === 0);
  }, [globalCoverage]);

  useEffect(() => {
    if (onGapIdentified) {
      onGapIdentified(gapRoles.map((role) => role.key));
    }
  }, [gapRoles, onGapIdentified]);

  useEffect(() => {
    let frameId = 0;
    let startTime = 0;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min(1, (timestamp - startTime) / 520);
      setDrawProgress(progress);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    setDrawProgress(0);
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [roleScores]);

  function getCellStatus(row, roleKey) {
    if (row.roleCoverage.has(roleKey)) {
      return 'covered';
    }
    if (plannedCells[`${row.key}:${roleKey}`]) {
      return 'planned';
    }
    if ((globalCoverage[roleKey] || 0) === 0) {
      return 'gap';
    }
    return 'empty';
  }

  function handleCellClick(event, row, role) {
    if (!interactive) {
      return;
    }

    const status = getCellStatus(row, role.key);
    const rect = event.currentTarget.getBoundingClientRect();
    const matrixRect = matrixRef.current?.getBoundingClientRect();
    const position = matrixRect
      ? {
          x: rect.left - matrixRect.left + (rect.width / 2),
          y: rect.bottom - matrixRect.top + 8,
        }
      : {
          x: rect.left + (rect.width / 2),
          y: rect.bottom + 8,
        };

    if (builderMode && status !== 'covered') {
      setTooltip(null);
      setPlanner({
        x: position.x,
        y: position.y,
        rowKey: row.key,
        roleKey: role.key,
        shipName: row.shipName,
      });
      return;
    }

    setPlanner(null);
    setTooltip({
      x: position.x,
      y: position.y,
      roleLabel: role.label,
      shipName: row.shipName,
      members: row.roleCoverage.get(role.key) || [],
      status,
    });
  }

  function handlePlanSelect(shipName) {
    if (!planner) {
      return;
    }

    const selectedRow = rows.find((row) => row.shipName === shipName);
    if (!selectedRow) {
      return;
    }

    setPlannedCells((current) => ({
      ...current,
      [`${selectedRow.key}:${planner.roleKey}`]: {
        shipName,
        roleKey: planner.roleKey,
      },
    }));
    setRoleFilter(planner.roleKey);
    setPlanner(null);
  }

  async function handleSharePlan() {
    const planEntries = Object.values(plannedCells);
    if (planEntries.length === 0) {
      setShareState('No Plan');
      window.setTimeout(() => setShareState('Share Plan'), 1200);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('fleetPlan', encodePlan(planEntries));

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setShareState('Copied');
      } else {
        setShareState('Unavailable');
      }
    } catch {
      setShareState('Copy Failed');
    }

    window.setTimeout(() => setShareState('Share Plan'), 1400);
  }

  return (
    <MFDPanel
      label="FLEET COMPOSITION"
      statusDot={gapRoles.length > 0 ? 'var(--danger)' : 'var(--live)'}
      action={(
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="nexus-btn"
            type="button"
            onClick={() => setViewMode('matrix')}
            style={{
              padding: '5px 10px',
              background: viewMode === 'matrix' ? 'var(--bg3)' : 'var(--bg2)',
              borderColor: viewMode === 'matrix' ? 'var(--b2)' : 'var(--b1)',
              color: viewMode === 'matrix' ? 'var(--t0)' : 'var(--t2)',
            }}
          >
            Matrix
          </button>
          <button
            className="nexus-btn"
            type="button"
            onClick={() => setViewMode('radar')}
            style={{
              padding: '5px 10px',
              background: viewMode === 'radar' ? 'var(--bg3)' : 'var(--bg2)',
              borderColor: viewMode === 'radar' ? 'var(--b2)' : 'var(--b1)',
              color: viewMode === 'radar' ? 'var(--t0)' : 'var(--t2)',
            }}
          >
            Radar
          </button>
          <button
            className="nexus-btn"
            type="button"
            onClick={() => {
              setBuilderMode((current) => !current);
              setTooltip(null);
              setPlanner(null);
            }}
            style={{
              padding: '5px 10px',
              background: builderMode ? 'rgba(var(--warn-rgb), 0.12)' : 'var(--bg2)',
              borderColor: builderMode ? 'var(--warn)' : 'var(--b1)',
              color: builderMode ? 'var(--warn)' : 'var(--t2)',
            }}
          >
            Fleet Builder
          </button>
        </div>
      )}
    >
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg0)' }}>
        <FleetStrengthBar roleScores={roleScores} />

        {viewMode === 'matrix' ? (
          <div
            ref={matrixRef}
            style={{
              position: 'relative',
              background: 'var(--bg1)',
              border: '0.5px solid var(--b1)',
              borderRadius: 6,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `180px repeat(${MISSION_ROLES.length}, 32px)`,
                gap: 8,
                padding: '12px 12px 14px',
                alignItems: 'center',
                minWidth: 180 + (MISSION_ROLES.length * 40),
              }}
            >
              <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Fleet Asset
              </div>
              {MISSION_ROLES.map((role) => (
                <div
                  key={role.key}
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    textAlign: 'center',
                    color: roleFilter === role.key ? 'var(--t0)' : 'var(--t3)',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    opacity: roleFilter && roleFilter !== role.key ? 0.4 : 1,
                  }}
                >
                  {role.label}
                </div>
              ))}

              {rows.length === 0 ? (
                <div
                  style={{
                    gridColumn: `1 / span ${MISSION_ROLES.length + 1}`,
                    padding: '28px 0',
                    textAlign: 'center',
                    color: 'var(--t2)',
                    fontSize: 11,
                  }}
                >
                  No fleet records available.
                </div>
              ) : rows.map((row) => (
                <React.Fragment key={row.key}>
                  <div
                    style={{
                      paddingRight: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      opacity: roleFilter ? 0.9 : 1,
                    }}
                  >
                    <span style={{ color: 'var(--t0)', fontSize: 11 }}>{row.shipName}</span>
                    <span style={{ color: 'var(--t3)', fontSize: 9 }}>
                      {`${row.members.length} crew record${row.members.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {MISSION_ROLES.map((role) => {
                    const status = getCellStatus(row, role.key);
                    const isDimmed = Boolean(roleFilter && roleFilter !== role.key);
                    const cellStyles = {
                      empty: {
                        background: 'var(--bg2)',
                        border: '0.5px solid var(--b1)',
                      },
                      covered: {
                        background: 'rgba(var(--acc-rgb), 0.2)',
                        border: '0.5px solid var(--acc)',
                      },
                      gap: {
                        background: 'rgba(var(--danger-rgb), 0.1)',
                        border: '0.5px dashed var(--danger-b)',
                      },
                      planned: {
                        background: 'rgba(var(--warn-rgb), 0.16)',
                        border: '0.5px solid var(--warn)',
                      },
                    }[status];

                    return (
                      <button
                        key={`${row.key}:${role.key}`}
                        type="button"
                        onClick={(event) => handleCellClick(event, row, role)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 4,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: interactive ? 'pointer' : 'default',
                          opacity: isDimmed ? 0.28 : 1,
                          transition: 'opacity 180ms ease, transform 120ms ease',
                          ...cellStyles,
                        }}
                        aria-label={`${row.shipName} ${role.label} ${status}`}
                      >
                        {status === 'covered' ? (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)' }} />
                        ) : null}
                        {status === 'planned' ? (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }} />
                        ) : null}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {tooltip ? (
              <div
                style={{
                  position: 'absolute',
                  top: tooltip.y,
                  left: tooltip.x,
                  transform: 'translateX(-50%)',
                  minWidth: 220,
                  maxWidth: 280,
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b2)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  zIndex: 120,
                }}
              >
                <div style={{ color: 'var(--t0)', fontSize: 10, marginBottom: 4 }}>{`${tooltip.shipName} · ${tooltip.roleLabel}`}</div>
                <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {tooltip.status === 'covered' ? 'Confirmed Coverage' : tooltip.status === 'planned' ? 'Planned Coverage' : 'Coverage Gap'}
                </div>
                {tooltip.members.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tooltip.members.map((member) => (
                      <span key={member} style={{ color: 'var(--t2)', fontSize: 10 }}>
                        {member}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--warn)', fontSize: 10 }}>No confirmed crew coverage.</div>
                )}
              </div>
            ) : null}

            {planner ? (
              <div
                style={{
                  position: 'absolute',
                  top: planner.y,
                  left: planner.x,
                  transform: 'translateX(-50%)',
                  minWidth: 220,
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b2)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  zIndex: 120,
                }}
              >
                <div style={{ color: 'var(--t0)', fontSize: 10, marginBottom: 3 }}>Assign planned coverage</div>
                <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 8 }}>
                  {`Choose a ship to cover ${titleCase(planner.roleKey)}.`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {availableShips.map((shipName) => (
                    <button
                      key={shipName}
                      type="button"
                      className="nexus-btn"
                      onClick={() => handlePlanSelect(shipName)}
                      style={{ justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                      {shipName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg1)',
              border: '0.5px solid var(--b1)',
              borderRadius: 6,
              padding: '10px 10px 16px',
            }}
          >
            <CapabilityRadar roleScores={roleScores} drawProgress={drawProgress} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {gapRoles.length > 0 ? gapRoles.map((role) => (
              <button
                key={role.key}
                type="button"
                className="nexus-btn"
                onClick={() => setRoleFilter((current) => (current === role.key ? null : role.key))}
                style={{
                  padding: '5px 9px',
                  background: 'rgba(var(--danger-rgb), 0.12)',
                  borderColor: roleFilter === role.key ? 'var(--danger)' : 'var(--danger-b)',
                  color: 'var(--danger)',
                }}
              >
                {`${role.label} GAP`}
              </button>
            )) : (
              <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'var(--live-b)', background: 'var(--live-bg)' }}>
                No critical coverage gaps
              </span>
            )}
          </div>

          {builderMode ? (
            <button
              type="button"
              className="nexus-btn"
              onClick={handleSharePlan}
              style={{
                padding: '6px 10px',
                background: 'rgba(var(--warn-rgb), 0.12)',
                borderColor: 'var(--warn)',
                color: 'var(--warn)',
              }}
            >
              {shareState}
            </button>
          ) : null}
        </div>
      </div>
    </MFDPanel>
  );
}
