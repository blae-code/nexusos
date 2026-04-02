/**
 * OpReadinessPanel — cross-references live/upcoming ops against ship mission_readiness
 * and OrgAsset availability. Shows which ships are fit for each op type, which assets
 * are unassigned, and where the fleet gaps are.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Zap } from 'lucide-react';

// Map op.type → ship mission_readiness dimension key
const OP_TYPE_READINESS_DIM = {
  COMBAT:          'combat',
  PATROL:          'combat',
  ESCORT:          'combat',
  S17:             'combat',
  MINING:          'mining',
  ROCKBREAKER:     'mining',
  CARGO:           'hauling',
  SALVAGE:         'salvage',
  RECON:           'exploration',
  RESCUE:          'medical',
  REP_GRIND:       'combat',
  BLUEPRINT_GRIND: 'exploration',
};

const DIM_COLORS = {
  combat:      '#C0392B',
  mining:      '#C8A84B',
  hauling:     '#3498DB',
  salvage:     '#8E44AD',
  exploration: '#27AE60',
  medical:     '#E8A020',
};

const OP_STATUS_LIVE = ['STAGING', 'ACTIVE', 'PLANNING'];
const READINESS_THRESHOLD = 50; // ships with score ≥ this are "fit"

function OpReadinessCard({ op, ships, orgAssets }) {
  const dim = OP_TYPE_READINESS_DIM[op.type] || null;
  const dimColor = dim ? DIM_COLORS[dim] : '#9A9488';

  const fitShips = useMemo(() => {
    if (!dim) return ships.filter((s) => s.status === 'AVAILABLE' || s.status === 'ASSIGNED');
    return ships
      .filter((s) => s.status !== 'DESTROYED' && s.status !== 'ARCHIVED')
      .map((s) => ({
        ...s,
        score: Number((s.mission_readiness || {})[dim] || 0),
      }))
      .filter((s) => s.score >= READINESS_THRESHOLD)
      .sort((a, b) => b.score - a.score);
  }, [dim, ships]);

  const availableAssets = useMemo(() => {
    return orgAssets.filter((a) => !a.assigned_to_callsign && a.status !== 'RETIRED' && a.status !== 'LOST');
  }, [orgAssets]);

  const startDate = op.scheduled_at || op.created_date;
  const opTime = startDate ? new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div style={{
      background: '#0A0C10',
      border: `0.5px solid ${dimColor}28`,
      borderLeft: `2px solid ${dimColor}`,
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
            color: '#E8E4DC', letterSpacing: '0.04em',
          }}>
            {op.name || 'Unnamed Op'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2,
              color: dimColor, background: `${dimColor}18`, border: `0.5px solid ${dimColor}40`,
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
            }}>
              {(op.type || 'UNKNOWN').replace(/_/g, ' ')}
            </span>
            {op.status && (
              <span style={{
                fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2,
                color: op.status === 'ACTIVE' ? '#4A8C5C' : '#9A9488',
                background: op.status === 'ACTIVE' ? 'rgba(74,140,92,0.12)' : 'rgba(154,148,136,0.08)',
                border: `0.5px solid ${op.status === 'ACTIVE' ? '#4A8C5C40' : '#9A948840'}`,
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
              }}>
                {op.status}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#5A5850' }}>
          {[op.system || op.system_name, op.location, opTime].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {dim ? `FIT SHIPS — ${dim.toUpperCase()} ≥${READINESS_THRESHOLD}` : 'AVAILABLE SHIPS'}
            <span style={{ color: fitShips.length > 0 ? '#4A8C5C' : '#C0392B', marginLeft: 6 }}>
              {fitShips.length}
            </span>
          </div>
          {fitShips.length === 0 ? (
            <div style={{ fontSize: 9, color: '#C0392B', opacity: 0.7 }}>
              No ships meet the readiness threshold — check loadout and mission_readiness scores.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {fitShips.slice(0, 8).map((s) => (
                <div key={s.id} style={{
                  fontSize: 8, padding: '2px 6px', borderRadius: 2,
                  background: 'rgba(200,170,100,0.06)', border: '0.5px solid rgba(200,170,100,0.12)',
                  color: '#9A9488', whiteSpace: 'nowrap',
                }}>
                  {s.name}
                  {dim && s.score > 0 && (
                    <span style={{ color: dimColor, marginLeft: 4 }}>{s.score}</span>
                  )}
                </div>
              ))}
              {fitShips.length > 8 && (
                <div style={{ fontSize: 8, color: '#5A5850', padding: '2px 0' }}>+{fitShips.length - 8} more</div>
              )}
            </div>
          )}
        </div>

        {availableAssets.length > 0 && (
          <div>
            <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
              UNASSIGNED ASSETS
              <span style={{ color: '#9A9488', marginLeft: 6 }}>{availableAssets.length}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {availableAssets.slice(0, 6).map((a) => (
                <div key={a.id} style={{
                  fontSize: 8, padding: '2px 6px', borderRadius: 2,
                  background: 'rgba(52,152,219,0.06)', border: '0.5px solid rgba(52,152,219,0.15)',
                  color: '#5A7A9A', whiteSpace: 'nowrap',
                }}>
                  {a.name || a.serial_number || a.id}
                </div>
              ))}
              {availableAssets.length > 6 && (
                <div style={{ fontSize: 8, color: '#5A5850', padding: '2px 0' }}>+{availableAssets.length - 6} more</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpReadinessPanel({ ships = [], orgAssets = [] }) {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.Op.filter(
      { status__in: OP_STATUS_LIVE },
      '-created_date',
      50
    ).catch(async () => {
      // Fallback: list all and filter client-side if __in not supported
      const all = await base44.entities.Op.list('-created_date', 100).catch(() => []);
      return (all || []).filter((op) => OP_STATUS_LIVE.includes(op.status));
    });
    setOps(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const liveOps = useMemo(() => ops.filter((op) => OP_STATUS_LIVE.includes(op.status)), [ops]);

  if (loading) {
    return <div style={{ fontSize: 10, color: '#5A5850', padding: '20px 0' }}>Loading ops...</div>;
  }

  if (liveOps.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Zap size={24} style={{ opacity: 0.12, marginBottom: 8 }} />
        <div style={{ fontSize: 10, color: '#5A5850' }}>
          No active or upcoming ops — readiness cross-reference will appear here when ops are staged.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {liveOps.map((op) => (
        <OpReadinessCard key={op.id} op={op} ships={ships} orgAssets={orgAssets} />
      ))}
    </div>
  );
}
