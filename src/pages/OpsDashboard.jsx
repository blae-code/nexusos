import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { Activity, Zap, Users, TrendingUp } from 'lucide-react';

const OP_STATUS_COLORS = {
  LIVE: { bg: 'rgba(74,232,48,0.1)', text: '#4AE830', border: 'rgba(74,232,48,0.3)' },
  PUBLISHED: { bg: 'rgba(200,168,75,0.1)', text: '#C8A84B', border: 'rgba(200,168,75,0.3)' },
  DRAFT: { bg: 'rgba(192,57,43,0.1)', text: '#C0392B', border: 'rgba(192,57,43,0.3)' },
};

const FLEET_STATUS_COLORS = {
  AVAILABLE: { text: '#4AE830', label: 'Available' },
  ASSIGNED: { text: '#C8A84B', label: 'Assigned' },
  MAINTENANCE: { text: '#C0392B', label: 'Maintenance' },
  DESTROYED: { text: '#8A4A4A', label: 'Destroyed' },
};

export default function OpsDashboard() {
  const { data: ops = [] } = useQuery({
    queryKey: ['ops-live'],
    queryFn: async () => {
      const result = await base44.entities.Op.filter({ status: 'LIVE' });
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 30000,
  });

  const { data: publishedOps = [] } = useQuery({
    queryKey: ['ops-published'],
    queryFn: async () => {
      const result = await base44.entities.Op.filter({ status: 'PUBLISHED' });
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 30000,
  });

  const { data: ships = [] } = useQuery({
    queryKey: ['org-ships'],
    queryFn: async () => {
      const result = await base44.entities.OrgShip.list('-last_synced', 200);
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 45000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['nexus-members'],
    queryFn: async () => {
      const result = await base44.entities.NexusUser.list('-joined_at', 200);
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 60000,
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['op-rsvps'],
    queryFn: async () => {
      const allRsvps = [];
      const allOps = [...ops, ...publishedOps];
      for (const op of allOps) {
        const opRsvps = await base44.entities.OpRsvp.filter({ op_id: op.id });
        allRsvps.push(...(Array.isArray(opRsvps) ? opRsvps : []));
      }
      return allRsvps;
    },
  });

  // Metrics calculations
  const liveOpCount = ops.length;
  const upcomingOpCount = publishedOps.length;
  const totalMembersOnOps = new Set(
    rsvps
      .map(r => r.user_id || r.callsign || r.discord_id)
      .filter(Boolean),
  ).size;

  const fleetStats = {
    total: ships.length,
    available: ships.filter(s => s.status === 'AVAILABLE').length,
    assigned: ships.filter(s => s.status === 'ASSIGNED').length,
    maintenance: ships.filter(s => s.status === 'MAINTENANCE').length,
    destroyed: ships.filter(s => s.status === 'DESTROYED').length,
  };

  const cargoCapacity = ships.reduce((sum, ship) => sum + (ship.cargo_scu || 0), 0);
  const assignedShips = ships.filter(s => s.status === 'ASSIGNED');

  return (
    <div style={{ padding: '32px', background: 'var(--bg0)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Activity size={28} style={{ color: '#4AE830' }} />
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>
              OPERATIONS COMMAND CENTER
            </h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '0.08em', margin: 0 }}>
            Real-time org performance monitoring • {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* PRIMARY METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
          {/* LIVE OPS */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(74,232,48,0.08) 0%, rgba(74,232,48,0.02) 100%)',
            border: '1px solid rgba(74,232,48,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#4AE830', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                  ACTIVE OPS
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#4AE830', lineHeight: 1 }}>
                  {liveOpCount}
                </div>
              </div>
              <Zap size={24} style={{ color: '#4AE830', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              {totalMembersOnOps} members deployed
            </div>
          </div>

          {/* UPCOMING OPS */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(200,168,75,0.08) 0%, rgba(200,168,75,0.02) 100%)',
            border: '1px solid rgba(200,168,75,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#C8A84B', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                  UPCOMING OPS
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#C8A84B', lineHeight: 1 }}>
                  {upcomingOpCount}
                </div>
              </div>
              <TrendingUp size={24} style={{ color: '#C8A84B', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              scheduled for execution
            </div>
          </div>

          {/* FLEET AVAILABLE */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(82,151,255,0.08) 0%, rgba(82,151,255,0.02) 100%)',
            border: '1px solid rgba(82,151,255,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#5297FF', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                  AVAILABLE SHIPS
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#5297FF', lineHeight: 1 }}>
                  {fleetStats.available}
                </div>
              </div>
              <Activity size={24} style={{ color: '#5297FF', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              of {fleetStats.total} total ships
            </div>
          </div>

          {/* ASSIGNED PILOTS */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(157,161,205,0.08) 0%, rgba(157,161,205,0.02) 100%)',
            border: '1px solid rgba(157,161,205,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9DA1CD', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                  ASSIGNED PILOTS
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#9DA1CD', lineHeight: 1 }}>
                  {new Set(assignedShips.map(s => s.assigned_to)).size}
                </div>
              </div>
              <Users size={24} style={{ color: '#9DA1CD', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              pilots on active assignment
            </div>
          </div>
        </div>

        {/* FLEET STATUS BREAKDOWN */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 16, letterSpacing: '0.08em' }}>
            FLEET STATUS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(fleetStats).map(([key, value]) => {
              if (key === 'total') return null;
              const color = FLEET_STATUS_COLORS[key.toUpperCase()];
              const percent = fleetStats.total > 0 ? Math.round((value / fleetStats.total) * 100) : 0;
              return (
                <div key={key} style={{
                  padding: 16,
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: 11, color: color.text, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                    {color.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: color.text, marginBottom: 8 }}>
                    {value}
                  </div>
                  <div style={{
                    height: 4,
                    background: 'var(--bg2)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: color.text,
                      transition: 'width 300ms ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>
                    {percent}% of fleet
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIVE OPERATIONS LIST */}
        {liveOpCount > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 16, letterSpacing: '0.08em' }}>
              LIVE OPERATIONS
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {ops.slice(0, 5).map((op) => {
                const rsvpCount = rsvps.filter(r => r.op_id === op.id).length;
                return (
                  <div key={op.id} style={{
                    padding: 16,
                    background: 'var(--bg1)',
                    border: '1px solid rgba(74,232,48,0.2)',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>
                        {op.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                        {op.system} • {rsvpCount} confirmed crew
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: '#4AE830',
                      color: '#000',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                    }}>
                      LIVE
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CAPACITY METRICS */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 16, letterSpacing: '0.08em' }}>
            LOGISTICS CAPACITY
          </h2>
          <div style={{
            padding: 20,
            background: 'var(--bg1)',
            border: '0.5px solid var(--b1)',
            borderRadius: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>
                TOTAL CARGO CAPACITY
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>
                {cargoCapacity.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>SCU across fleet</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>
                ACTIVE SHIPS
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#5297FF' }}>
                {fleetStats.available + fleetStats.assigned}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>operational vessels</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>
                FLEET UTILIZATION
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#9DA1CD' }}>
                {fleetStats.total > 0 ? Math.round((fleetStats.assigned / fleetStats.total) * 100) : 0}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>ships in active assignment</div>
            </div>
          </div>
        </div>

        {/* ORG SNAPSHOT */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 16, letterSpacing: '0.08em' }}>
            ORGANIZATION SNAPSHOT
          </h2>
          <div style={{
            padding: 16,
            background: 'var(--bg1)',
            border: '0.5px solid var(--b1)',
            borderRadius: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16,
            fontSize: 12,
          }}>
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 4 }}>TOTAL MEMBERS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t0)' }}>{members.length}</div>
            </div>
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 4 }}>ACTIVE DEPLOYMENTS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4AE830' }}>{liveOpCount}</div>
            </div>
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 4 }}>FLEET SIZE</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t0)' }}>{fleetStats.total} ships</div>
            </div>
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 4 }}>READINESS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#5297FF' }}>
                {fleetStats.total > 0 ? Math.round(((fleetStats.available + fleetStats.assigned) / fleetStats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* AUTO-REFRESH INDICATOR */}
        <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right' }}>
          Live data • Auto-refreshing every 30 seconds
        </div>
      </div>
    </div>
  );
}
