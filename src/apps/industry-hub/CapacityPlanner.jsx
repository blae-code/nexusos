/**
 * CapacityPlanner — Groups active fabrication jobs by fabricator location.
 * Shows total remaining time per location, a visual queue, and allows
 * re-assigning jobs to different locations or bumping priority (sort order).
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Clock, ArrowRight, ChevronUp, ChevronDown, MapPin } from 'lucide-react';

function formatDuration(mins) {
  if (!mins || mins <= 0) return '0m';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeRemainingMin(isoStr) {
  if (!isoStr) return 0;
  const diff = new Date(isoStr).getTime() - Date.now();
  return Math.max(0, diff / 60000);
}

function LocationCard({ location, jobs, allLocations, onReassign, onReorder }) {
  const [reassigningId, setReassigningId] = useState(null);
  const [targetLocation, setTargetLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Sort jobs: soonest completion first (natural queue order)
  const sorted = [...jobs].sort((a, b) => {
    const aT = a.estimated_completion ? new Date(a.estimated_completion).getTime() : Infinity;
    const bT = b.estimated_completion ? new Date(b.estimated_completion).getTime() : Infinity;
    return aT - bT;
  });

  const totalRemainingMin = sorted.reduce((s, j) => s + timeRemainingMin(j.estimated_completion), 0);
  const readyCount = sorted.filter(j => timeRemainingMin(j.estimated_completion) <= 0).length;
  const maxRemaining = Math.max(...sorted.map(j => timeRemainingMin(j.estimated_completion)), 0);
  const otherLocations = allLocations.filter(l => l !== location);

  const handleReassign = async (jobId) => {
    if (!targetLocation.trim()) return;
    setSaving(true);
    await onReassign(jobId, targetLocation.trim());
    setSaving(false);
    setReassigningId(null);
    setTargetLocation('');
  };

  // Load bar: fraction of total capacity (longest remaining / some reference)
  const loadPct = maxRemaining > 0 ? Math.min(100, (maxRemaining / 480) * 100) : 0; // 8h = 100%
  const loadColor = loadPct > 75 ? '#C0392B' : loadPct > 40 ? '#C8A84B' : '#4AE830';

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 5,
      overflow: 'hidden',
    }}>
      {/* Location header */}
      <div style={{
        padding: '10px 14px', background: 'var(--bg2)',
        borderBottom: '0.5px solid var(--b1)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <MapPin size={12} style={{ color: 'var(--acc2)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
            {location || 'UNASSIGNED'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 10, color: 'var(--t2)' }}>
            <span>{sorted.length} job{sorted.length !== 1 ? 's' : ''}</span>
            {readyCount > 0 && <span style={{ color: '#C8A84B' }}>{readyCount} ready</span>}
          </div>
        </div>

        {/* Time stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} style={{ color: 'var(--t2)' }} />
            <span style={{ color: 'var(--t0)', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
              {formatDuration(maxRemaining)}
            </span>
          </div>
          <span style={{ color: 'var(--t3)', fontSize: 8 }}>until last job done</span>
        </div>
      </div>

      {/* Load bar */}
      <div style={{ height: 3, background: 'var(--bg3)' }}>
        <div style={{ width: `${loadPct}%`, height: '100%', background: loadColor, transition: 'width 0.3s' }} />
      </div>

      {/* Job queue */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((job, idx) => {
          const remaining = timeRemainingMin(job.estimated_completion);
          const isReady = remaining <= 0;
          const isReassigning = reassigningId === job.id;

          return (
            <div key={job.id} style={{
              padding: '7px 14px',
              borderBottom: idx < sorted.length - 1 ? '0.5px solid var(--b0)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Position badge */}
                <div style={{
                  width: 18, height: 18, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isReady ? 'rgba(200,168,75,0.15)' : 'var(--bg3)',
                  border: `0.5px solid ${isReady ? 'rgba(200,168,75,0.3)' : 'var(--b1)'}`,
                  color: isReady ? '#C8A84B' : 'var(--t2)', fontSize: 9, fontWeight: 600, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {/* Job info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.blueprint_name}
                    </span>
                    <span style={{ color: job.tier === 'T2' ? 'var(--warn)' : 'var(--t3)', fontSize: 8, flexShrink: 0 }}>{job.tier}</span>
                    <span style={{ color: 'var(--t3)', fontSize: 8, flexShrink: 0 }}>×{job.quantity * (job.output_per_craft || 1)}</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 1 }}>
                    {job.started_by_callsign && <span>{job.started_by_callsign} · </span>}
                    {formatDuration(job.crafting_time_min)} total
                  </div>
                </div>

                {/* Time remaining */}
                <span style={{
                  fontSize: 10, fontFamily: 'monospace', flexShrink: 0,
                  color: isReady ? '#C8A84B' : 'var(--t1)', fontWeight: isReady ? 600 : 400,
                }}>
                  {isReady ? 'READY' : formatDuration(remaining)}
                </span>

                {/* Priority shift buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                  {idx > 0 && (
                    <button
                      onClick={() => onReorder(job.id, sorted[idx - 1].id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t2)', display: 'flex' }}
                      title="Move up in queue"
                    >
                      <ChevronUp size={12} />
                    </button>
                  )}
                  {idx < sorted.length - 1 && (
                    <button
                      onClick={() => onReorder(sorted[idx + 1].id, job.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t2)', display: 'flex' }}
                      title="Move down in queue"
                    >
                      <ChevronDown size={12} />
                    </button>
                  )}
                </div>

                {/* Reassign button */}
                <button
                  onClick={() => { setReassigningId(isReassigning ? null : job.id); setTargetLocation(''); }}
                  className="nexus-btn"
                  style={{
                    padding: '2px 7px', fontSize: 8, flexShrink: 0,
                    color: isReassigning ? 'var(--info)' : 'var(--t3)',
                    borderColor: isReassigning ? 'var(--info)' : 'var(--b1)',
                  }}
                  title="Reassign to another location"
                >
                  <ArrowRight size={9} />
                </button>
              </div>

              {/* Reassign form */}
              {isReassigning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 26, marginTop: 2 }}>
                  {otherLocations.length > 0 ? (
                    <select
                      value={targetLocation}
                      onChange={e => setTargetLocation(e.target.value)}
                      style={{
                        flex: 1, padding: '4px 8px', background: 'var(--bg2)', border: '0.5px solid var(--b2)',
                        borderRadius: 3, color: 'var(--t0)', fontSize: 10, fontFamily: 'inherit',
                      }}
                    >
                      <option value="">Select location…</option>
                      {otherLocations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : null}
                  <input
                    value={targetLocation}
                    onChange={e => setTargetLocation(e.target.value)}
                    placeholder="Or type new location…"
                    style={{
                      flex: 1, padding: '4px 8px', background: 'var(--bg2)', border: '0.5px solid var(--b2)',
                      borderRadius: 3, color: 'var(--t0)', fontSize: 10, fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={() => handleReassign(job.id)}
                    disabled={!targetLocation.trim() || saving}
                    className="nexus-btn"
                    style={{
                      padding: '3px 10px', fontSize: 9, flexShrink: 0,
                      color: targetLocation.trim() ? 'var(--live)' : 'var(--t3)',
                      borderColor: targetLocation.trim() ? 'rgba(74,232,48,0.3)' : 'var(--b1)',
                    }}
                  >
                    {saving ? '…' : 'MOVE'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CapacityPlanner({ jobs, onJobsChanged }) {
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'ACTIVE'), [jobs]);

  // Group by fabricator_location
  const groups = useMemo(() => {
    const map = {};
    for (const job of activeJobs) {
      const loc = job.fabricator_location || '';
      if (!map[loc]) map[loc] = [];
      map[loc].push(job);
    }
    // Sort locations: most loaded first
    return Object.entries(map).sort((a, b) => {
      const maxA = Math.max(...a[1].map(j => timeRemainingMin(j.estimated_completion)), 0);
      const maxB = Math.max(...b[1].map(j => timeRemainingMin(j.estimated_completion)), 0);
      return maxB - maxA;
    });
  }, [activeJobs]);

  const allLocations = useMemo(() => groups.map(([loc]) => loc).filter(Boolean), [groups]);

  const totalJobs = activeJobs.length;
  const totalLocations = groups.length;
  const overallMaxMin = Math.max(...activeJobs.map(j => timeRemainingMin(j.estimated_completion)), 0);

  const handleReassign = async (jobId, newLocation) => {
    await base44.entities.FabricationJob.update(jobId, { fabricator_location: newLocation });
    onJobsChanged();
  };

  // Priority swap: swap estimated_completion times to re-order
  const handleReorder = async (moveUpId, moveDownId) => {
    const up = activeJobs.find(j => j.id === moveUpId);
    const down = activeJobs.find(j => j.id === moveDownId);
    if (!up || !down) return;
    // Swap their estimated completions
    await Promise.all([
      base44.entities.FabricationJob.update(moveUpId, { estimated_completion: down.estimated_completion }),
      base44.entities.FabricationJob.update(moveDownId, { estimated_completion: up.estimated_completion }),
    ]);
    onJobsChanged();
  };

  if (activeJobs.length === 0) {
    return (
      <div style={{ padding: '24px 16px', color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No active jobs to plan capacity for. Start a fabrication job first.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>LOCATIONS</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc2)', fontFamily: 'monospace' }}>{totalLocations}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>ACTIVE JOBS</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--info)', fontFamily: 'monospace' }}>{totalJobs}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>LONGEST QUEUE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: overallMaxMin > 240 ? '#C0392B' : 'var(--t0)', fontFamily: 'monospace' }}>
            {formatDuration(overallMaxMin)}
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 4 }}>AVG JOBS / LOC</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', fontFamily: 'monospace' }}>
            {totalLocations > 0 ? (totalJobs / totalLocations).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {/* Location cards */}
      {groups.map(([location, locJobs]) => (
        <LocationCard
          key={location}
          location={location}
          jobs={locJobs}
          allLocations={allLocations}
          onReassign={handleReassign}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
}