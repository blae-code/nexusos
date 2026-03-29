import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

const SHIP_ROLES = [
  { id: 'pilot', label: 'Pilot', color: '#C0392B' },
  { id: 'copilot', label: 'Co-Pilot', color: '#C8A84B' },
  { id: 'engineer', label: 'Engineer', color: '#4A8C5C' },
  { id: 'gunner', label: 'Gunner', color: '#C0392B' },
  { id: 'medic', label: 'Medic', color: '#4A8C5C' },
  { id: 'scanner', label: 'Scanner Op', color: '#9A9488' },
  { id: 'cargo', label: 'Cargo Specialist', color: '#5A5850' },
];

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER'];
const RANK_HIERARCHY = {
  PIONEER: 0,
  FOUNDER: 1,
  QUARTERMASTER: 2,
  VOYAGER: 3,
  SCOUT: 4,
  VAGRANT: 5,
  AFFILIATE: 6,
};

export default function CrewScheduler() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank || 'AFFILIATE';
  const canManageAssignments = LEADER_RANKS.includes(rank);
  const [operations, setOperations] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOp, setSelectedOp] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [filterStatus, setFilterStatus] = useState('PUBLISHED');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load upcoming operations
      const ops = await base44.entities.Op.filter({
        status: { $in: ['PUBLISHED', 'LIVE'] },
      }, '-scheduled_at', 50);

      // Load crew roster
      const members = await listMemberDirectory({ sort: '-joined_at', limit: 200 });

      setOperations(ops || []);
      setCrew(members || []);

      // Initialize assignments from RSVP data
      if (ops && ops.length > 0) {
        const initAssignments = {};
        for (const op of ops) {
          initAssignments[op.id] = {};
        }
        const rsvps = await base44.entities.OpRsvp.list('-created_date', 500);
        rsvps?.forEach((rsvp) => {
          if (initAssignments[rsvp.op_id]) {
            const userKey = rsvp.user_id || rsvp.callsign;
            if (userKey) {
              initAssignments[rsvp.op_id][userKey] = rsvp.role || 'crew';
            }
          }
        });
        setAssignments(initAssignments);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
      console.error('[CrewScheduler]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageAssignments) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canManageAssignments, loadData]);

  const handleAssignRole = async (opId, crewId, role) => {
    if (!canManageAssignments) return;
    try {
      setAssignments((prev) => ({
        ...prev,
        [opId]: {
          ...prev[opId],
          [crewId]: role,
        },
      }));

      const member = crew.find((m) => m.id === crewId);
      if (role) {
        await nexusWriteApi.upsertOpRsvp({
          op_id: opId,
          user_id: crewId,
          callsign: member?.callsign || 'Unknown',
          role,
          status: 'CONFIRMED',
          ship: '',
        });
      } else {
        await nexusWriteApi.declineOpRsvp(opId, {
          user_id: crewId,
          callsign: member?.callsign || 'Unknown',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to assign role');
      console.error('[CrewScheduler assign]', err);
    }
  };

  if (!canManageAssignments && !loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <Users size={30} style={{ color: 'var(--t3)', opacity: 0.35, marginBottom: 10 }} />
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em' }}>
            Crew Scheduler requires Voyager or Quartermaster clearance.
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
            This view assigns other members to operation roles and is restricted to fleet leadership.
          </div>
        </div>
      </div>
    );
  }

  const getAvailableCrew = (opId) => {
    const op = operations.find((o) => o.id === opId);
    const minRankLevel = op?.min_rank ? RANK_HIERARCHY[op.min_rank] : 999;

    return crew.filter((member) => {
      const rankLevel = RANK_HIERARCHY[member.nexus_rank] || 999;
      return rankLevel <= minRankLevel;
    });
  };

  const formatScheduleTime = (isoStr) => {
    if (!isoStr) return 'Not scheduled';
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOps = operations.filter((op) =>
    filterStatus === 'all' ? true : op.status === filterStatus
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--bg1)',
          borderBottom: '0.5px solid var(--b1)',
          padding: '16px',
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>Crew Scheduler</div>
            <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 2 }}>
              Assign crew to operations and track duty shifts
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(200,168,75,0.1)',
                border: '0.5px solid rgba(200,168,75,0.2)',
                borderRadius: 3,
                color: '#C8A84B',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {['PUBLISHED', 'LIVE', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '6px 12px',
                  background: filterStatus === status ? 'var(--bg3)' : 'var(--bg2)',
                  border: `0.5px solid ${filterStatus === status ? 'var(--b2)' : 'var(--b0)'}`,
                  borderRadius: 3,
                  color: filterStatus === status ? 'var(--t0)' : 'var(--t2)',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: filterStatus === status ? 600 : 400,
                }}
              >
                {status === 'all' ? 'All Ops' : `${status}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, minHeight: 0 }}>
          {/* Ops List */}
          <div
            style={{
              background: 'var(--bg1)',
              border: '0.5px solid var(--b1)',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
              <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>
                OPERATIONS ({filteredOps.length})
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {filteredOps.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--t2)', fontSize: 11 }}>
                  No operations scheduled
                </div>
              ) : (
                filteredOps.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderBottom: '0.5px solid var(--b0)',
                      background: selectedOp?.id === op.id ? 'rgba(192,57,43,0.12)' : 'transparent',
                      borderLeft: selectedOp?.id === op.id ? '2px solid #C0392B' : 'none',
                      color: 'var(--t1)',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedOp?.id !== op.id) {
                        e.currentTarget.style.background = 'rgba(200,170,100,0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedOp?.id !== op.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{op.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--t2)', display: 'flex', gap: 8 }}>
                      <span>{op.type}</span>
                      <span>
                        {op.status === 'LIVE' && (
                          <span style={{ color: '#C0392B', fontWeight: 600 }}>● LIVE</span>
                        )}
                        {op.status === 'PUBLISHED' && (
                          <span style={{ color: '#C8A84B' }}>PUBLISHED</span>
                        )}
                      </span>
                    </div>
                    {op.scheduled_at && (
                      <div style={{ fontSize: 9, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} />
                        {formatScheduleTime(op.scheduled_at)}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Assignment Panel */}
          <div
            style={{
              background: 'var(--bg1)',
              border: '0.5px solid var(--b1)',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selectedOp ? (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
                  <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {selectedOp.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', gap: 12 }}>
                    <span>{selectedOp.type}</span>
                    <span>{selectedOp.system}</span>
                    {selectedOp.scheduled_at && (
                      <span>{formatScheduleTime(selectedOp.scheduled_at)}</span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {SHIP_ROLES.map((role) => (
                      <div key={role.id}>
                        <div
                          style={{
                            padding: '8px 10px',
                            background: `${role.color}20`,
                            borderLeft: `2px solid ${role.color}`,
                            marginBottom: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: role.color,
                          }}
                        >
                          {role.label}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {getAvailableCrew(selectedOp.id).map((member) => {
                            const isAssigned = assignments[selectedOp.id]?.[member.id] === role.id;
                            return (
                              <button
                                key={member.id}
                                onClick={() => handleAssignRole(selectedOp.id, member.id, isAssigned ? null : role.id)}
                                style={{
                                  textAlign: 'left',
                                  padding: '8px 10px',
                                  background: isAssigned ? `${role.color}15` : 'var(--bg2)',
                                  border: `0.5px solid ${isAssigned ? role.color : 'var(--b0)'}`,
                                  borderRadius: 3,
                                  color: 'var(--t1)',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>{member.callsign}</span>
                                {isAssigned && <CheckCircle2 size={12} style={{ color: role.color }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--t2)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Users size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 12 }}>Select an operation to assign crew</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
