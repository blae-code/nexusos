import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { RefreshCw, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  AVAILABLE: { bg: 'rgba(74,232,48,0.1)', text: '#4AE830', border: 'rgba(74,232,48,0.3)' },
  ASSIGNED: { bg: 'rgba(200,168,75,0.1)', text: '#C8A84B', border: 'rgba(200,168,75,0.3)' },
  MAINTENANCE: { bg: 'rgba(200,168,75,0.15)', text: '#C8A84B', border: 'rgba(200,168,75,0.3)' },
  DESTROYED: { bg: 'rgba(192,57,43,0.1)', text: '#C0392B', border: 'rgba(192,57,43,0.3)' },
  ARCHIVED: { bg: 'rgba(80,80,80,0.1)', text: '#8A8478', border: 'rgba(80,80,80,0.3)' },
};

const CLASS_ICONS = {
  FIGHTER: '⚔️',
  HEAVY_FIGHTER: '⚔️⚔️',
  MINER: '⛏️',
  HAULER: '📦',
  SALVAGER: '♻️',
  MEDICAL: '🏥',
  EXPLORER: '🔭',
  GROUND_VEHICLE: '🚗',
  OTHER: '🛸',
};

export default function OrgFleet() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: ships = [], isLoading, error } = useQuery({
    queryKey: ['org-ships'],
    queryFn: () => base44.entities.OrgShip.list('-last_synced', 200),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      try {
        const response = await base44.functions.invoke('fleetyardsRosterSync', {});
        return response.data;
      } finally {
        setSyncing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-ships'] });
    },
  });

  return (
    <div style={{ padding: '32px', background: 'var(--bg0)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--t0)', margin: 0, marginBottom: 8 }}>
              ORGANIZATION FLEET
            </h1>
            <p style={{ fontSize: 12, color: 'var(--t2)', letterSpacing: '0.08em', margin: 0 }}>
              REDSCAR NOMADS SHIP ROSTER
            </p>
          </div>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncing || syncMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: syncing ? 'var(--bg3)' : 'var(--bg2)',
              border: '0.5px solid var(--b2)',
              borderRadius: 3,
              color: 'var(--t1)',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.65 : 1,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'SYNCING...' : 'SYNC FLEET'}
          </button>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ padding: 16, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>TOTAL SHIPS</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--t0)' }}>{ships.length}</div>
          </div>
          <div style={{ padding: 16, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>AVAILABLE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#4AE830' }}>
              {ships.filter(s => s.status === 'AVAILABLE').length}
            </div>
          </div>
          <div style={{ padding: 16, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>ASSIGNED</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#C8A84B' }}>
              {ships.filter(s => s.status === 'ASSIGNED').length}
            </div>
          </div>
          <div style={{ padding: 16, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.08em', marginBottom: 8 }}>MAINTENANCE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#C0392B' }}>
              {ships.filter(s => s.status === 'MAINTENANCE').length}
            </div>
          </div>
        </div>

        {/* ROSTER TABLE */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>Loading fleet roster...</div>
        ) : error ? (
          <div style={{ padding: 20, background: 'rgba(192,57,43,0.1)', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 6, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: '#C0392B', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ color: '#C0392B', fontWeight: 600, marginBottom: 4 }}>Failed to load fleet</div>
              <div style={{ color: 'var(--t2)', fontSize: 12 }}>{error?.message || 'Unknown error'}</div>
            </div>
          </div>
        ) : ships.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}>
            No ships in roster. Sync from FleetYards to populate.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>SHIP NAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>MODEL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>CLASS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>ASSIGNED PILOT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>CARGO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t2)', fontWeight: 600, letterSpacing: '0.08em' }}>CREW</th>
                </tr>
              </thead>
              <tbody>
                {ships.map((ship) => {
                  const statusColor = STATUS_COLORS[ship.status] || STATUS_COLORS.OTHER;
                  return (
                    <tr key={ship.id} style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg0)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--t0)', fontWeight: 600 }}>{ship.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--t1)' }}>{ship.model}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 16 }}>{CLASS_ICONS[ship.class] || '?'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: statusColor.bg,
                          color: statusColor.text,
                          border: `0.5px solid ${statusColor.border}`,
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                        }}>
                          {ship.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--t1)' }}>
                        {ship.assigned_to_callsign || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t1)' }}>
                        {ship.cargo_scu || 0} SCU
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--t1)' }}>
                        {ship.crew_size || 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* LAST SYNC */}
        {ships.length > 0 && ships[0]?.last_synced && (
          <div style={{ marginTop: 24, fontSize: 10, color: 'var(--t3)', textAlign: 'right' }}>
            Last synced: {new Date(ships[0].last_synced).toLocaleString()}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}