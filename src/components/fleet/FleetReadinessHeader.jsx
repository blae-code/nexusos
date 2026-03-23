import React from 'react';
import { RefreshCw, Anchor, Zap, Package, Users, Fuel, Server } from 'lucide-react';

const VERSE_COLORS = {
  online:   { color: '#4AE830', label: 'VERSE ONLINE' },
  degraded: { color: '#C8A84B', label: 'VERSE DEGRADED' },
  offline:  { color: '#C0392B', label: 'VERSE OFFLINE' },
  unknown:  { color: '#8A8478', label: 'VERSE UNKNOWN' },
};

export default function FleetReadinessHeader({
  stats, verseStatus, hydrogenFuel, lastRefresh, refreshing, onRefresh, uexVehiclesCount
}) {
  const vc = VERSE_COLORS[verseStatus] || VERSE_COLORS.unknown;
  const utilization = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0;

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg1) 0%, var(--bg0) 100%)',
      borderBottom: '0.5px solid var(--b1)',
      padding: '14px 20px',
      flexShrink: 0,
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Anchor size={18} style={{ color: '#C8A84B' }} />
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em' }}>
            FLEET READINESS
          </div>
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>
            REDSCAR NOMADS · LIVE SHIP STATUS
          </div>
        </div>
        <div style={{ flex: 1 }} />

        {/* Verse status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', background: `${vc.color}12`,
          border: `0.5px solid ${vc.color}40`, borderRadius: 3,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: vc.color, animation: verseStatus === 'online' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
          <span style={{ color: vc.color, fontSize: 9, letterSpacing: '0.1em', fontWeight: 600 }}>{vc.label}</span>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: 'var(--bg2)',
            border: '0.5px solid var(--b1)', borderRadius: 3,
            color: 'var(--t2)', cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: 9, letterSpacing: '0.08em', fontFamily: 'inherit',
            opacity: refreshing ? 0.65 : 1,
          }}
        >
          <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'REFRESHING…' : 'REFRESH'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <StatPill icon={Anchor} label="TOTAL SHIPS" value={stats.total} color="var(--t0)" />
        <StatPill icon={Zap} label="AVAILABLE" value={stats.available} color="#4AE830" />
        <StatPill icon={Server} label="ASSIGNED" value={stats.assigned} color="#C8A84B" />
        <StatPill icon={RefreshCw} label="MAINTENANCE" value={stats.maintenance} color="#FF6B35" />
        <StatPill icon={Package} label="TOTAL CARGO" value={`${(stats.total_cargo_scu || 0).toLocaleString()} SCU`} color="#5297FF" />
        <StatPill icon={Users} label="ACTIVE PILOTS" value={stats.unique_pilots} color="#9DA1CD" />
        <StatPill
          icon={Fuel}
          label="H² FUEL PRICE"
          value={hydrogenFuel ? `${(hydrogenFuel.buy || 0).toLocaleString()} aUEC` : '—'}
          color="#C8A84B"
          detail={hydrogenFuel ? `sell ${(hydrogenFuel.sell || 0).toLocaleString()}` : null}
        />
        <StatPill label="UEX VEHICLES" value={uexVehiclesCount} color="var(--t2)" icon={Anchor} detail="enriched" />
      </div>

      {/* Utilization bar */}
      {stats.total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>FLEET UTILIZATION</span>
            <span style={{ color: 'var(--t2)', fontSize: 8 }}>{utilization}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${utilization}%`, background: 'linear-gradient(90deg, #4AE830, #C8A84B)', borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {lastRefresh && (
        <div style={{ marginTop: 6, fontSize: 8, color: 'var(--t3)', textAlign: 'right' }}>
          Last updated {lastRefresh.toLocaleTimeString()} · Auto-refresh every 90s
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color, detail = null }) {
  return (
    <div style={{
      padding: '8px 10px', background: 'var(--bg2)',
      border: '0.5px solid var(--b0)', borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={9} style={{ color: 'var(--t3)', flexShrink: 0 }} />
        <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ color, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{value}</span>
      {detail && <span style={{ color: 'var(--t3)', fontSize: 8 }}>{detail}</span>}
    </div>
  );
}
