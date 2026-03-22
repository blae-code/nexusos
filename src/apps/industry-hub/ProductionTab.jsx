/**
 * ProductionTab — Active fabrication jobs tracker.
 * Shows active/complete jobs, allows starting new ones, completing, and cancelling.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus, CheckCircle, XCircle, Clock, Package, BarChart3, MapPin } from 'lucide-react';
import NewFabJobDialog from './NewFabJobDialog';
import ProductionMargins from './ProductionMargins';
import CapacityPlanner from './CapacityPlanner';

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function timeUntil(isoStr) {
  if (!isoStr) return '—';
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return 'READY';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return `${hr}h ${rm}m`;
}

function formatDuration(mins) {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function JobRow({ job, onComplete, onCancel }) {
  const isActive = job.status === 'ACTIVE';
  const isComplete = job.status === 'COMPLETE';
  const remaining = timeUntil(job.estimated_completion);
  const isReady = remaining === 'READY';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4,
      borderLeft: `2px solid ${isComplete ? 'var(--live)' : isReady ? '#C8A84B' : 'var(--info)'}`,
    }}>
      {/* Status indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: isComplete ? 'var(--live)' : isReady ? '#C8A84B' : 'var(--info)',
        animation: isActive && !isReady ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.blueprint_name}
          </span>
          <span style={{ color: job.tier === 'T2' ? 'var(--warn)' : 'var(--t2)', fontSize: 9, flexShrink: 0 }}>{job.tier}</span>
          <span style={{ color: 'var(--t3)', fontSize: 9, flexShrink: 0 }}>{job.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 10, color: 'var(--t2)' }}>
          <span>×{job.quantity * (job.output_per_craft || 1)}</span>
          {job.fabricator_location && <span>{job.fabricator_location}</span>}
          {job.started_by_callsign && <span>by {job.started_by_callsign}</span>}
          <span>{relativeTime(job.started_at)}</span>
        </div>
      </div>

      {/* Time remaining */}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Clock size={10} style={{ color: isReady ? '#C8A84B' : 'var(--t2)' }} />
          <span style={{
            color: isReady ? '#C8A84B' : 'var(--t1)',
            fontSize: 11, fontFamily: 'monospace', fontWeight: isReady ? 600 : 400,
          }}>
            {remaining}
          </span>
        </div>
      )}

      {/* Total craft time */}
      <div style={{ fontSize: 9, color: 'var(--t3)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
        {formatDuration(job.crafting_time_min)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {isActive && (
          <>
            <button
              onClick={() => onComplete(job)}
              className="nexus-btn"
              style={{ padding: '3px 8px', fontSize: 9, color: 'var(--live)', borderColor: 'rgba(74,232,48,0.2)' }}
              title="Mark complete"
            >
              <CheckCircle size={10} />
            </button>
            <button
              onClick={() => onCancel(job)}
              className="nexus-btn"
              style={{ padding: '3px 8px', fontSize: 9, color: 'var(--t3)' }}
              title="Cancel job"
            >
              <XCircle size={10} />
            </button>
          </>
        )}
        {isComplete && (
          <span style={{ color: 'var(--live)', fontSize: 9, fontWeight: 600 }}>DONE</span>
        )}
        {job.status === 'CANCELLED' && (
          <span style={{ color: 'var(--t3)', fontSize: 9 }}>CANCELLED</span>
        )}
      </div>
    </div>
  );
}

export default function ProductionTab({ blueprints, materials, callsign, onRefresh }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [view, setView] = useState('jobs'); // 'jobs' | 'margins' | 'capacity'

  const loadJobs = useCallback(async () => {
    try {
      const data = await base44.entities.FabricationJob.list('-started_at', 100);
      setJobs(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 30s to update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => [...prev]); // force re-render for timers
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (job) => {
    await base44.entities.FabricationJob.update(job.id, {
      status: 'COMPLETE',
      completed_at: new Date().toISOString(),
    });
    loadJobs();
    onRefresh();
  };

  const handleCancel = async (job) => {
    await base44.entities.FabricationJob.update(job.id, { status: 'CANCELLED' });
    loadJobs();
  };

  const handleJobCreated = () => {
    loadJobs();
    onRefresh(); // refresh materials since they were consumed
  };

  const filtered = jobs.filter(j => {
    if (statusFilter === 'ALL') return true;
    return j.status === statusFilter;
  });

  const activeCount = jobs.filter(j => j.status === 'ACTIVE').length;
  const readyCount = jobs.filter(j => j.status === 'ACTIVE' && timeUntil(j.estimated_completion) === 'READY').length;
  const completeCount = jobs.filter(j => j.status === 'COMPLETE').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Header bar */}
      <div style={{
        padding: '10px 16px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--info)', animation: activeCount > 0 ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
            <span style={{ color: 'var(--t1)', fontSize: 11 }}>{activeCount} active</span>
          </div>
          {readyCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8A84B' }} />
              <span style={{ color: '#C8A84B', fontSize: 11 }}>{readyCount} ready</span>
            </div>
          )}
          <span style={{ color: 'var(--t3)', fontSize: 10 }}>{completeCount} completed</span>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 3 }}>
          {['ACTIVE', 'COMPLETE', 'CANCELLED', 'ALL'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="nexus-btn"
              style={{
                padding: '3px 9px', fontSize: 9,
                background: statusFilter === s ? 'var(--bg4)' : 'var(--bg2)',
                borderColor: statusFilter === s ? 'var(--b3)' : 'var(--b1)',
                color: statusFilter === s ? 'var(--t0)' : 'var(--t2)',
              }}
            >{s}</button>
          ))}
        </div>

        {/* View toggles */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[
            { id: 'jobs', label: 'JOBS', icon: Package },
            { id: 'capacity', label: 'CAPACITY', icon: MapPin },
            { id: 'margins', label: 'MARGINS', icon: BarChart3 },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="nexus-btn"
              style={{
                padding: '4px 10px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
                background: view === v.id ? 'var(--bg4)' : 'var(--bg2)',
                borderColor: view === v.id ? 'var(--b3)' : 'var(--b1)',
                color: view === v.id ? (v.id === 'margins' ? '#C8A84B' : v.id === 'capacity' ? 'var(--acc2)' : 'var(--t0)') : 'var(--t2)',
              }}
            >
              <v.icon size={10} /> {v.label}
            </button>
          ))}
        </div>

        {/* New job button */}
        <button
          onClick={() => setShowNewDialog(true)}
          className="nexus-btn nexus-btn-solid"
          style={{ padding: '5px 14px', fontSize: 10, flexShrink: 0 }}
        >
          <Plus size={11} /> NEW JOB
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {view === 'margins' ? (
          <ProductionMargins jobs={jobs} blueprints={blueprints} />
        ) : view === 'capacity' ? (
          <CapacityPlanner jobs={jobs} onJobsChanged={loadJobs} />
        ) : (
          <>
            {filtered.map(job => (
              <JobRow key={job.id} job={job} onComplete={handleComplete} onCancel={handleCancel} />
            ))}
            {filtered.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 40, color: 'var(--t2)' }}>
                <Package size={28} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: 11 }}>
                  {statusFilter === 'ACTIVE' ? 'No active fabrication jobs — start one from a blueprint' : 'No jobs match this filter'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* New job dialog */}
      {showNewDialog && (
        <NewFabJobDialog
          blueprints={blueprints}
          materials={materials}
          onClose={() => setShowNewDialog(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}