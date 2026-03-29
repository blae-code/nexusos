import React, { useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Plus, Copy, Lock, Archive, Download, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Treemap,
} from 'recharts';

import FleetMatrix from '@/apps/armory/components/FleetMatrix';
import { fleetPlanningApi } from '@/core/data/fleet-planning-api';

const MISSION_ROLES = ['mining', 'combat', 'hauling', 'exploration', 'refining', 'scouting', 'racing', 'support'];

function chartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', padding: '8px 10px', fontSize: 10 }}>
      <div style={{ color: 'var(--t0)', marginBottom: 4 }}>{label || payload[0]?.payload?.label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>{entry.name || entry.dataKey}: {entry.value}</div>
      ))}
    </div>
  );
}

function groupAssignmentsByUnit(assignments, units) {
  return units.map((unit) => ({
    ...unit,
    assignments: assignments.filter((assignment) => assignment.unit_id === unit.id),
  }));
}

function normalizeShoppingTotals(entries = []) {
  const counts = new Map();
  (entries || []).forEach((entry) => {
    const label = String(entry?.label || entry?.component_name || entry?.slot_type || 'MISSING');
    counts.set(label, (counts.get(label) || 0) + (Number(entry?.value || 1) || 1));
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value })).slice(0, 12);
}

function roleCoverageRows(roleCoverage = []) {
  return roleCoverage.map((unit) => ({
    unit_id: unit.unit_id,
    unit_name: unit.unit_name,
    targets: unit.targets || {},
    counts: unit.counts || {},
  }));
}

export default function FleetForgePlanner({
  snapshot,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onRefresh,
  user,
}) {
  const plannerRef = useRef(null);
  const [draftScenarioName, setDraftScenarioName] = useState('');
  const [draftUnitId, setDraftUnitId] = useState('');
  const [draftBuildId, setDraftBuildId] = useState('');
  const [busy, setBusy] = useState(false);
  const [shoppingVisible, setShoppingVisible] = useState(false);

  const scenario = snapshot?.scenario || scenarios.find((entry) => entry.id === selectedScenarioId) || null;
  const units = useMemo(() => (Array.isArray(snapshot?.units) ? [...snapshot.units].sort((left, right) => (left.display_order || 0) - (right.display_order || 0)) : []), [snapshot?.units]);
  const assignments = Array.isArray(snapshot?.assignments) ? snapshot.assignments : [];
  const builds = Array.isArray(snapshot?.builds) ? snapshot.builds : [];
  const groupedUnits = useMemo(() => groupAssignmentsByUnit(assignments, units), [assignments, units]);
  const readinessData = Array.isArray(snapshot?.aggregates?.readiness_by_unit) ? snapshot.aggregates.readiness_by_unit : [];
  const classDistribution = Array.isArray(snapshot?.aggregates?.class_distribution) ? snapshot.aggregates.class_distribution : [];
  const shoppingTotals = useMemo(() => normalizeShoppingTotals(snapshot?.aggregates?.shopping_totals), [snapshot?.aggregates?.shopping_totals]);
  const roleCoverage = useMemo(() => roleCoverageRows(snapshot?.aggregates?.role_coverage), [snapshot?.aggregates?.role_coverage]);

  const matrixData = useMemo(() => assignments.map((assignment) => ({
    ship_name: assignment.ship_name,
    role_tag: assignment.mission_role,
    callsign: assignment.pilot_callsign,
  })), [assignments]);

  const scenarioLocked = String(scenario?.status || '').toUpperCase() === 'LOCKED' || String(scenario?.status || '').toUpperCase() === 'ARCHIVED';

  React.useEffect(() => {
    if (!draftUnitId && units[0]?.id) {
      setDraftUnitId(units[0].id);
    }
  }, [draftUnitId, units]);

  React.useEffect(() => {
    if (!draftBuildId && builds[0]?.id) {
      setDraftBuildId(builds[0].id);
    }
  }, [builds, draftBuildId]);

  async function createScenario() {
    const name = draftScenarioName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await fleetPlanningApi.createScenario({
        name,
        description: '',
        scope_level: 'FLEET',
        created_by_user_id: user?.id || null,
        status: 'DRAFT',
        shared_live: true,
        baseline_mode: 'STOCK',
      });
      setDraftScenarioName('');
      onSelectScenario?.(created?.id || null);
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function duplicateScenario() {
    if (!scenario) return;
    setBusy(true);
    try {
      const created = await fleetPlanningApi.createScenario({
        name: `${scenario.name || 'Scenario'} Copy`,
        description: scenario.description || '',
        scope_level: scenario.scope_level || 'FLEET',
        root_unit_id: scenario.root_unit_id || null,
        created_by_user_id: user?.id || null,
        status: 'DRAFT',
        shared_live: scenario.shared_live !== false,
        baseline_mode: scenario.baseline_mode || 'STOCK',
      });
      await Promise.all(assignments.map((assignment) => fleetPlanningApi.createAssignment({
        scenario_id: created.id,
        unit_id: assignment.unit_id,
        org_ship_id: assignment.org_ship_id || null,
        fleet_build_id: assignment.fleet_build_id || null,
        pilot_user_id: assignment.pilot_user_id || null,
        mission_role: assignment.mission_role,
        position_label: assignment.position_label,
        status: assignment.status || 'PLANNED',
        notes: assignment.notes || '',
      })));
      onSelectScenario?.(created.id);
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function updateScenario(patch) {
    if (!scenario?.id) return;
    setBusy(true);
    try {
      await fleetPlanningApi.updateScenario(scenario.id, patch);
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function applyOrgStandard() {
    if (!assignments.length) return;
    setBusy(true);
    try {
      const canonicalByShip = new Map(builds.filter((build) => build.is_org_canonical || build.canonical_level !== 'PERSONAL').map((build) => [build.ship_name, build]));
      await Promise.all(assignments.map((assignment) => {
        const canonical = canonicalByShip.get(assignment.ship_name);
        if (!canonical || canonical.id === assignment.fleet_build_id) return null;
        return fleetPlanningApi.updateAssignment(assignment.id, {
          fleet_build_id: canonical.id,
          status: 'PLANNED',
        });
      }).filter(Boolean));
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function createAssignment() {
    if (!scenario?.id || !draftUnitId || !draftBuildId) return;
    const build = builds.find((entry) => entry.id === draftBuildId);
    setBusy(true);
    try {
      await fleetPlanningApi.createAssignment({
        scenario_id: scenario.id,
        unit_id: draftUnitId,
        fleet_build_id: draftBuildId,
        mission_role: String(build?.role_tag || 'support').toLowerCase(),
        status: 'PLANNED',
        updated_by_user_id: user?.id || null,
      });
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  async function exportBrief() {
    if (!plannerRef.current) return;
    const canvas = await html2canvas(plannerRef.current, { backgroundColor: '#07080b', scale: 1.5 });
    const image = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(image, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${(scenario?.name || 'fleet-brief').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  }

  async function onDragEnd(result) {
    if (!result.destination || scenarioLocked) return;
    if (result.destination.droppableId === result.source.droppableId && result.destination.index === result.source.index) return;
    const assignmentId = result.draggableId;
    setBusy(true);
    try {
      await fleetPlanningApi.updateAssignment(assignmentId, { unit_id: result.destination.droppableId });
      await onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', height: '100%', minHeight: 0 }}>
      <div style={{ borderRight: '0.5px solid var(--b1)', padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.14em' }}>LIVE SCENARIOS</div>
        <div className="nexus-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="nexus-input" value={draftScenarioName} onChange={(event) => setDraftScenarioName(event.target.value)} placeholder="Create scenario" />
          <button type="button" className="nexus-btn primary" disabled={busy} onClick={createScenario}><Plus size={12} /> Create Scenario</button>
        </div>

        <div className="nexus-card" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scenarios.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="nexus-btn"
              onClick={() => onSelectScenario?.(entry.id)}
              style={{ justifyContent: 'space-between', background: selectedScenarioId === entry.id ? 'var(--bg3)' : 'var(--bg2)', borderColor: selectedScenarioId === entry.id ? 'var(--b2)' : 'var(--b1)' }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{entry.name}</span>
              <span style={{ color: 'var(--t2)', fontSize: 9 }}>{String(entry.status || 'DRAFT').toUpperCase()}</span>
            </button>
          ))}
          {!scenarios.length && <div style={{ padding: 8, color: 'var(--t2)', fontSize: 10 }}>No shared scenarios yet.</div>}
        </div>

        <div className="nexus-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>SCENARIO ACTIONS</div>
          <button type="button" className="nexus-btn" disabled={!scenario || busy} onClick={duplicateScenario}><Copy size={12} /> Duplicate Scenario</button>
          <button type="button" className="nexus-btn" disabled={!scenario || busy || scenarioLocked} onClick={() => updateScenario({ status: 'LOCKED', locked_at: new Date().toISOString() })}><Lock size={12} /> Lock Scenario</button>
          <button type="button" className="nexus-btn" disabled={!scenario || busy} onClick={() => updateScenario({ status: 'ARCHIVED', archived_at: new Date().toISOString() })}><Archive size={12} /> Archive Scenario</button>
          <button type="button" className="nexus-btn" disabled={!scenario || busy} onClick={applyOrgStandard}><RefreshCw size={12} /> Apply Org Standard</button>
          <button type="button" className="nexus-btn" disabled={!scenario || busy} onClick={exportBrief}><Download size={12} /> Export Brief</button>
        </div>
      </div>

      <div ref={plannerRef} style={{ padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>COLLABORATIVE PLANNING</div>
            <div style={{ color: 'var(--t0)', fontSize: 18, fontWeight: 700 }}>{scenario?.name || 'Select or create a scenario'}</div>
            <div style={{ color: 'var(--t2)', fontSize: 10 }}>{scenario?.description || 'Squad, wing, and fleet readiness planning with live shared assignments.'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['STOCK', 'ORG_STANDARD', 'CUSTOM'].map((mode) => (
              <button key={mode} type="button" className="nexus-btn" disabled={!scenario || busy || scenarioLocked} onClick={() => updateScenario({ baseline_mode: mode })} style={{ background: String(scenario?.baseline_mode || 'STOCK') === mode ? 'var(--bg3)' : 'var(--bg2)' }}>
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {!scenario ? (
          <div className="nexus-card" style={{ padding: 18, color: 'var(--t2)', fontSize: 11 }}>Create a FleetScenario record to start collaborative planning.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <div className="nexus-card" style={{ padding: 12, height: 260 }}>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>READINESS BY UNIT</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessData}>
                    <CartesianGrid stroke="var(--b0)" vertical={false} />
                    <XAxis dataKey="unit_name" stroke="var(--t3)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                    <YAxis stroke="var(--t3)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                    <Tooltip content={chartTooltip} />
                    <Bar dataKey="readiness_score" fill="var(--acc)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="nexus-card" style={{ padding: 12, height: 260 }}>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>CLASS COMPOSITION</div>
                {classDistribution.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={classDistribution.map((entry) => ({ name: entry.label, size: entry.value }))} dataKey="size" stroke="var(--b1)" fill="var(--acc)" />
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--t2)', fontSize: 11 }}>No class distribution data yet.</div>
                )}
              </div>

              <div className="nexus-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>SCENARIO HEALTH</div>
                <div style={{ color: 'var(--t0)', fontSize: 28, fontWeight: 700 }}>{snapshot?.aggregates?.standardization_score || 0}%</div>
                <div style={{ color: 'var(--t2)', fontSize: 10 }}>Standardization score against saved org-standard builds.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 10 }}>
                    <div style={{ color: 'var(--t3)', fontSize: 9 }}>Assignments</div>
                    <div style={{ color: 'var(--t0)', fontSize: 18, fontWeight: 700 }}>{assignments.length}</div>
                  </div>
                  <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', padding: 10 }}>
                    <div style={{ color: 'var(--t3)', fontSize: 9 }}>Shortfalls</div>
                    <div style={{ color: 'var(--warn)', fontSize: 18, fontWeight: 700 }}>{shoppingTotals.reduce((sum, entry) => sum + entry.value, 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="nexus-card" style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>ADD TO SCENARIO</div>
                <select className="nexus-input" value={draftUnitId} onChange={(event) => setDraftUnitId(event.target.value)}>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>BUILD</div>
                <select className="nexus-input" value={draftBuildId} onChange={(event) => setDraftBuildId(event.target.value)}>
                  {builds.map((build) => <option key={build.id} value={build.id}>{build.build_name} · {build.ship_name}</option>)}
                </select>
              </div>
              <button type="button" className="nexus-btn primary" disabled={!units.length || !builds.length || busy || scenarioLocked} onClick={createAssignment}><Plus size={12} /> Add Assignment</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 12 }}>
              <div className="nexus-card" style={{ padding: 12 }}>
                <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 10 }}>ROLE COVERAGE RADAR</div>
                <FleetMatrix fleetData={matrixData} interactive={false} />
              </div>

              <div className="nexus-card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>READINESS HEATMAP</div>
                  <button type="button" className="nexus-btn" onClick={() => setShoppingVisible((current) => !current)}>{shoppingVisible ? 'Hide' : 'Show'} Shopping</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${MISSION_ROLES.length}, minmax(0, 1fr))`, gap: 4, alignItems: 'stretch' }}>
                  <div />
                  {MISSION_ROLES.map((role) => <div key={role} style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase' }}>{role}</div>)}
                  {roleCoverage.map((unit) => (
                    <React.Fragment key={unit.unit_id}>
                      <div style={{ color: 'var(--t0)', fontSize: 11 }}>{unit.unit_name}</div>
                      {MISSION_ROLES.map((role) => {
                        const count = Number(unit.counts?.[role] || 0);
                        const target = Number(unit.targets?.[role] || 0);
                        const ratio = target ? Math.min(1, count / target) : (count ? 1 : 0);
                        return (
                          <div key={`${unit.unit_id}-${role}`} style={{ minHeight: 28, border: '0.5px solid var(--b1)', background: `rgba(90,96,128,${0.08 + ratio * 0.34})`, color: ratio >= 1 ? 'var(--live)' : count ? 'var(--warn)' : 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                            {count}/{target}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                {shoppingVisible ? (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {shoppingTotals.map((entry) => (
                      <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--t2)', fontSize: 10 }}>
                        <span>{entry.label}</span>
                        <span style={{ color: 'var(--warn)' }}>{entry.value}</span>
                      </div>
                    ))}
                    {!shoppingTotals.length && <div style={{ color: 'var(--t3)', fontSize: 10 }}>No current shopping shortfalls.</div>}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="nexus-card" style={{ padding: 12 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 12 }}>LIVE ASSIGNMENT BOARD</div>
              {!units.length ? (
                <div style={{ color: 'var(--t2)', fontSize: 11 }}>No OrgUnit structure exists yet. Add OrgUnit records in Base44 to unlock squad, wing, and fleet planning columns.</div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${groupedUnits.length}, minmax(260px, 1fr))`, gap: 12, overflowX: 'auto' }}>
                    {groupedUnits.map((unit) => (
                      <Droppable key={unit.id} droppableId={unit.id}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', minHeight: 240, padding: 10 }}>
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 700 }}>{unit.name}</div>
                              <div style={{ color: 'var(--t2)', fontSize: 10 }}>{unit.unit_type} · {unit.assignments.length} assignments</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {unit.assignments.map((assignment, index) => (
                                <Draggable key={assignment.id} draggableId={assignment.id} index={index} isDragDisabled={scenarioLocked}>
                                  {(dragProvided) => (
                                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps} style={{ ...dragProvided.draggableProps.style, background: 'var(--bg1)', border: '0.5px solid var(--b1)', padding: 10 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <div>
                                          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{assignment.ship_name || 'Unassigned Hull'}</div>
                                          <div style={{ color: 'var(--t2)', fontSize: 10 }}>{assignment.build_name || 'No linked build'} · {String(assignment.mission_role || 'role').toUpperCase()}</div>
                                        </div>
                                        <div style={{ color: 'var(--acc)', fontSize: 16, fontWeight: 700 }}>{assignment.readiness_score || 0}</div>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 8 }}>
                                        <div style={{ background: 'var(--bg2)', padding: 6 }}><div style={{ color: 'var(--t3)', fontSize: 9 }}>FIT</div><div style={{ color: 'var(--t0)', fontSize: 11 }}>{assignment.fit_score || 0}</div></div>
                                        <div style={{ background: 'var(--bg2)', padding: 6 }}><div style={{ color: 'var(--t3)', fontSize: 9 }}>SOURCE</div><div style={{ color: 'var(--t0)', fontSize: 11 }}>{assignment.source_score || 0}</div></div>
                                        <div style={{ background: 'var(--bg2)', padding: 6 }}><div style={{ color: 'var(--t3)', fontSize: 9 }}>AVAIL</div><div style={{ color: 'var(--t0)', fontSize: 11 }}>{assignment.availability_score || 0}</div></div>
                                      </div>
                                      <div style={{ marginTop: 8, color: 'var(--t2)', fontSize: 10 }}>{assignment.pilot_callsign || 'No pilot assigned'}{assignment.position_label ? ` · ${assignment.position_label}` : ''}</div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {!unit.assignments.length && <div style={{ border: '0.5px dashed var(--b1)', padding: 16, color: 'var(--t3)', fontSize: 10, textAlign: 'center' }}>Drag assignments here</div>}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </DragDropContext>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
