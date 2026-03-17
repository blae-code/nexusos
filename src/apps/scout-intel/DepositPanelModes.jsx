/**
 * DepositPanelModes — DefaultMode and DetailMode sub-components for DepositPanel,
 * along with shared helper components and utilities.
 */
import React, { useState, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { ChevronLeft, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function qColor(pct) {
  if ((pct || 0) >= 80) return 'var(--live)';
  if ((pct || 0) >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

export const RISK_COLORS = {
  LOW:     'var(--live)',
  MEDIUM:  'var(--warn)',
  HIGH:    'var(--warn)',
  EXTREME: 'var(--danger)',
};

// ─── Section header ────────────────────────────────────────────────────────────

export function SectionHead({ children }) {
  return (
    <div style={{
      color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em',
      textTransform: 'uppercase', padding: '8px 0 4px',
    }}>
      {children}
    </div>
  );
}

// ─── Top deposit row ───────────────────────────────────────────────────────────

export function TopDepositRow({ deposit, onClick }) {
  const col = qColor(deposit.quality_pct);
  const now = Date.now();
  const age = now - new Date(deposit.reported_at || 0).getTime();
  const isRecent = age < 86400000; // 24h

  return (
    <div
      onClick={() => onClick(deposit)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px', borderRadius: 5,
        background: 'var(--bg2)', border: '0.5px solid var(--b1)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
    >
      {/* Quality % */}
      <span style={{
        color: col, fontSize: 16, fontWeight: 700, minWidth: 36,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>
        {Math.round(deposit.quality_pct || 0)}%
      </span>

      {/* Detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: 'var(--t0)', fontSize: 11, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {deposit.material_name || '—'}
        </div>
        <div style={{
          color: 'var(--t2)', fontSize: 9,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {deposit.system_name} · {deposit.location_detail || '—'}
        </div>
      </div>

      {/* Freshness chip */}
      <span style={{
        fontSize: 8, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
        border: `0.5px solid ${isRecent ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b1)'}`,
        background: isRecent ? 'rgba(var(--live-rgb), 0.06)' : 'transparent',
        color: isRecent ? 'var(--live)' : 'var(--t3)',
        letterSpacing: '0.06em',
      }}>
        {isRecent ? 'FRESH' : relativeTime(deposit.reported_at)}
      </span>
    </div>
  );
}

// ─── Crafting gap row ──────────────────────────────────────────────────────────

export function GapRow({ name, have, need, bestDeposit }) {
  const pct = Math.min(100, need > 0 ? Math.round((have / need) * 100) : 100);
  const met = pct >= 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: 'var(--t1)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{
          fontSize: 9, fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 6,
          color: met ? 'var(--live)' : 'var(--warn)',
        }}>
          {have.toFixed(0)} / {need.toFixed(0)} SCU
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: met ? 'var(--live)' : 'var(--warn)',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {!met && bestDeposit && (
        <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.04em' }}>
          Best: {bestDeposit.quality_pct}% {bestDeposit.system_name && `· ${bestDeposit.system_name}`}
        </div>
      )}
    </div>
  );
}

// ─── Scout leaderboard row ────────────────────────────────────────────────────

export function LeaderRow({ rank: pos, callsign, count, avgQuality }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0', borderBottom: '0.5px solid var(--b0)',
    }}>
      <span style={{ color: 'var(--t3)', fontSize: 10, minWidth: 14, textAlign: 'right' }}>{pos}</span>
      <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {callsign || '—'}
      </span>
      <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      <span style={{
        fontSize: 9, padding: '1px 5px', borderRadius: 4,
        background: 'var(--bg3)', border: '0.5px solid var(--b1)',
        color: qColor(avgQuality), fontVariantNumeric: 'tabular-nums',
      }}>
        {Math.round(avgQuality)}%
      </span>
    </div>
  );
}

// ─── DetailRow ────────────────────────────────────────────────────────────────

export function DetailRow({ label, value, color = 'var(--t1)' }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color, fontSize: 11 }}>{value}</span>
    </div>
  );
}

// ─── DEFAULT MODE ─────────────────────────────────────────────────────────────

export function DefaultMode({ deposits, materials, blueprints, onSelectDeposit }) {
  // Top 5 fresh deposits by quality
  const topDeposits = deposits
    .filter(d => !d.is_stale)
    .sort((a, b) => (b.quality_pct || 0) - (a.quality_pct || 0))
    .slice(0, 5);

  // Crafting gaps: priority blueprints → missing/short materials
  const gaps = [];
  blueprints
    .filter(bp => bp.is_priority)
    .forEach(bp => {
      (bp.recipe_materials || []).forEach(ing => {
        const name = ing.material_name;
        if (!name) return;
        const stock = materials.find(
          m => (m.material_name || '').toLowerCase() === name.toLowerCase()
        );
        const have = stock ? (stock.quantity_scu || 0) : 0;
        const need = ing.quantity_scu || 0;
        if (need > 0 && have < need) {
          // Find best scout deposit for this material
          const bestDep = deposits
            .filter(d => !d.is_stale && (d.material_name || '').toLowerCase() === name.toLowerCase())
            .sort((a, b) => (b.quality_pct || 0) - (a.quality_pct || 0))[0] || null;
          gaps.push({ name, have, need, bestDeposit: bestDep });
        }
      });
    });
  const uniqueGaps = gaps.filter((g, i) => gaps.findIndex(x => x.name === g.name) === i).slice(0, 6);

  // Scout leaderboard
  const scouts = {};
  deposits.forEach(d => {
    const key = d.reported_by_callsign || d.reported_by || '—';
    if (!scouts[key]) scouts[key] = { count: 0, totalQ: 0 };
    scouts[key].count++;
    scouts[key].totalQ += (d.quality_pct || 0);
  });
  const leaderboard = Object.entries(scouts)
    .map(([callsign, s]) => ({ callsign, count: s.count, avgQuality: s.totalQ / s.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <>
      <SectionHead>TOP DEPOSITS</SectionHead>
      {topDeposits.length === 0 ? (
        <div style={{ color: 'var(--t3)', fontSize: 11, padding: '8px 0' }}>No fresh deposits</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topDeposits.map(d => (
            <TopDepositRow key={d.id} deposit={d} onClick={onSelectDeposit} />
          ))}
        </div>
      )}

      {uniqueGaps.length > 0 && (
        <>
          <SectionHead>CRAFTING GAPS</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uniqueGaps.map(g => (
              <GapRow
                key={g.name}
                name={g.name}
                have={g.have}
                need={g.need}
                bestDeposit={g.bestDeposit}
              />
            ))}
          </div>
        </>
      )}

      {leaderboard.length > 0 && (
        <>
          <SectionHead>SCOUTS</SectionHead>
          <div>
            {leaderboard.map((s, i) => (
              <LeaderRow
                key={s.callsign}
                rank={i + 1}
                callsign={s.callsign}
                count={s.count}
                avgQuality={s.avgQuality}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── DETAIL MODE ──────────────────────────────────────────────────────────────

export function DetailMode({ deposit, liveOp, callsign, onBack, onDepositUpdated }) {
  const [routeResult,  setRouteResult]  = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [loggedToOp,   setLoggedToOp]  = useState(false);

  const col = qColor(deposit.quality_pct);
  const riskCol = RISK_COLORS[(deposit.risk_level || '').toUpperCase()] || 'var(--t2)';

  const handleVote = useCallback(async (type) => {
    const updates = type === 'confirm'
      ? { confirmed_votes: (deposit.confirmed_votes || 0) + 1 }
      : (() => {
          const sv = (deposit.stale_votes || 0) + 1;
          return { stale_votes: sv, is_stale: sv >= 3 };
        })();
    await base44.entities.ScoutDeposit.update(deposit.id, updates);
    onDepositUpdated();
  }, [deposit, onDepositUpdated]);

  const handlePlanRun = async () => {
    setRouteLoading(true);
    try {
      const result = await base44.functions.invoke('generateInsight', {
        context: 'scout_route',
        deposit_id: deposit.id,
        material_name: deposit.material_name,
        system_name: deposit.system_name,
        location_detail: deposit.location_detail,
        quality_pct: deposit.quality_pct,
        risk_level: deposit.risk_level,
      });
      setRouteResult(result);
    } catch {
      setRouteResult({ recommendation: 'Route data unavailable.' });
    }
    setRouteLoading(false);
  };

  const handleLogToOp = async () => {
    if (!liveOp || loggedToOp) return;
    const entry = {
      t:      new Date().toISOString(),
      type:   'PING',
      author: callsign,
      text:   `Scout ping: ${Math.round(deposit.quality_pct || 0)}% ${deposit.material_name} · ${deposit.location_detail} (${deposit.risk_level} risk)`,
    };
    await base44.entities.Op.update(liveOp.id, {
      session_log: [...(liveOp.session_log || []), entry],
    });
    setLoggedToOp(true);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 2 }}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deposit.material_name || '—'}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deposit.system_name} · {deposit.location_detail}
          </div>
        </div>
        {deposit.is_stale && (
          <span style={{
            fontSize: 8, padding: '2px 5px', borderRadius: 4, flexShrink: 0,
            border: '0.5px solid rgba(var(--warn-rgb), 0.3)',
            background: 'rgba(var(--warn-rgb), 0.06)',
            color: 'var(--warn)', letterSpacing: '0.08em',
          }}>
            STALE
          </span>
        )}
      </div>

      {/* Quality bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>QUALITY</span>
          <span style={{ color: col, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {Math.round(deposit.quality_pct || 0)}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${deposit.quality_pct || 0}%`,
            background: col, transition: 'width 0.3s ease',
          }} />
        </div>
        {(deposit.quality_pct || 0) >= 80 && (
          <div style={{ color: 'var(--live)', fontSize: 8, letterSpacing: '0.08em', marginTop: 3 }}>T2 ELIGIBLE</div>
        )}
      </div>

      {/* Stats */}
      <div style={{ borderTop: '0.5px solid var(--b0)', borderBottom: '0.5px solid var(--b0)', padding: '4px 0', marginBottom: 10 }}>
        <DetailRow label="VOLUME"   value={deposit.volume_estimate} />
        <DetailRow label="RISK"     value={deposit.risk_level}     color={riskCol} />
        <DetailRow label="SHIP"     value={deposit.ship_type} />
        <DetailRow label="SCOUT"    value={deposit.reported_by_callsign} color="var(--acc)" />
        <DetailRow label="REPORTED" value={relativeTime(deposit.reported_at)} />
        <DetailRow label="CONFIRMS" value={deposit.confirmed_votes || 0} color="var(--live)" />
        <DetailRow label="STALE ▲" value={deposit.stale_votes || 0}    color="var(--warn)" />
      </div>

      {/* Notes */}
      {deposit.notes && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 3 }}>NOTES</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, fontStyle: 'italic', lineHeight: 1.5 }}>
            {deposit.notes}
          </div>
        </div>
      )}

      {/* Vote buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => handleVote('confirm')}
          className="nexus-btn"
          style={{
            flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10,
            background: 'rgba(var(--live-rgb), 0.06)',
            borderColor: 'rgba(var(--live-rgb), 0.25)',
            color: 'var(--live)',
          }}
        >
          <CheckCircle size={10} /> CONFIRM
        </button>
        <button
          onClick={() => handleVote('stale')}
          className="nexus-btn"
          style={{
            flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10,
            background: 'rgba(var(--warn-rgb), 0.06)',
            borderColor: 'rgba(var(--warn-rgb), 0.25)',
            color: 'var(--warn)',
          }}
        >
          <AlertTriangle size={10} /> MARK STALE
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button
          onClick={handlePlanRun}
          disabled={routeLoading}
          className="nexus-btn"
          style={{
            justifyContent: 'center', padding: '7px 0', fontSize: 10,
            letterSpacing: '0.08em', opacity: routeLoading ? 0.6 : 1,
          }}
        >
          <Navigation size={10} />
          {routeLoading ? 'PLOTTING...' : 'PLAN RUN →'}
        </button>

        {liveOp && (
          <button
            onClick={handleLogToOp}
            disabled={loggedToOp}
            className="nexus-btn"
            style={{
              justifyContent: 'center', padding: '7px 0', fontSize: 10,
              letterSpacing: '0.08em',
              background: loggedToOp ? 'rgba(var(--live-rgb), 0.06)' : undefined,
              borderColor: loggedToOp ? 'rgba(var(--live-rgb), 0.3)' : undefined,
              color: loggedToOp ? 'var(--live)' : undefined,
            }}
          >
            {loggedToOp ? '✓ LOGGED TO OP' : `LOG TO OP: ${liveOp.name}`}
          </button>
        )}
      </div>

      {/* Route recommendation strip */}
      {routeResult && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 6,
          background: 'var(--bg2)', border: '0.5px solid var(--b1)',
        }}>
          <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}>
            ROUTE RECOMMENDATION
          </div>
          <div style={{ color: 'var(--t1)', fontSize: 10, lineHeight: 1.5 }}>
            {routeResult.recommendation || routeResult.insight || routeResult.text || 'No recommendation available.'}
          </div>
        </div>
      )}
    </>
  );
}
