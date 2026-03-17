/**
 * SplitCalc — post-op aUEC split calculator.
 * Props: { op, rsvps, callsign }
 */
import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

function formatAUEC(n) {
  if (!n || isNaN(n)) return '0';
  return Math.round(n).toLocaleString();
}

// ─── Mode chip ────────────────────────────────────────────────────────────────

function ModeChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', fontSize: 10, letterSpacing: '0.07em',
        borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
        border: active ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
        background: active ? 'var(--bg5)' : 'var(--bg3)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

// ─── SplitCalc ────────────────────────────────────────────────────────────────

export default function SplitCalc({ op, rsvps = [] }) {
  const confirmed   = rsvps.filter(r => r.status === 'CONFIRMED');
  const crewCount   = confirmed.length;
  const isExclusive = op.access_type === 'EXCLUSIVE';
  const buyInCost   = op.buy_in_cost || 0;

  const [mode, setMode]           = useState('EVEN');
  const [totalInput, setTotalInput] = useState('');
  const [bonusPct, setBonusPct]   = useState(10);
  const [contributions, setContributions] = useState(() =>
    crewCount > 0 ? confirmed.map((_, i) => i === crewCount - 1 ? 100 - Math.floor(100 / crewCount) * (crewCount - 1) : Math.floor(100 / crewCount)) : []
  );
  const [logging, setLogging]     = useState(false);
  const [logged, setLogged]       = useState(false);

  const totalRaw   = parseFloat(totalInput) || 0;
  const buyInTotal = isExclusive ? buyInCost * crewCount : 0;
  const available  = Math.max(0, totalRaw - buyInTotal);

  // ── Per-member split calculation ───────────────────

  const splits = useMemo(() => {
    if (crewCount === 0) return [];

    if (mode === 'EVEN') {
      const each = available / crewCount;
      return confirmed.map(r => ({ ...r, amount: each }));
    }

    if (mode === 'BY_ROLE') {
      const pioneers = confirmed.filter(r => PIONEER_RANKS.includes(r.rank));
      const bonusPool = available * (bonusPct / 100) * pioneers.length;
      const remainder = available - bonusPool;
      const baseShare = crewCount > 0 ? remainder / crewCount : 0;
      return confirmed.map(r => ({
        ...r,
        amount: PIONEER_RANKS.includes(r.rank)
          ? baseShare + available * (bonusPct / 100)
          : baseShare,
      }));
    }

    if (mode === 'BY_CONTRIBUTION') {
      return confirmed.map((r, i) => ({
        ...r,
        amount: available * ((contributions[i] || 0) / 100),
      }));
    }

    return confirmed.map(r => ({ ...r, amount: 0 }));
  }, [mode, available, confirmed, crewCount, bonusPct, contributions]);

  // ── Contribution slider handler ────────────────────

  const setContrib = (index, value) => {
    if (index === crewCount - 1) return; // Last slider is auto-adjusted
    const capped = Math.max(0, Math.min(100, value));
    const next   = [...contributions];
    next[index]  = capped;
    const sumOfOthers = next.slice(0, crewCount - 1).reduce((s, v) => s + v, 0);
    next[crewCount - 1] = Math.max(0, 100 - sumOfOthers);
    setContributions(next);
  };

  const contribSum = contributions.reduce((s, v) => s + v, 0);
  const contribOk  = Math.abs(contribSum - 100) < 1;

  // ── Log to coffer ──────────────────────────────────

  const handleLogSplit = async () => {
    if (!totalRaw || logging || logged) return;
    setLogging(true);
    try {
      await Promise.all(
        splits.map(member =>
          base44.entities.CofferLog.create({
            entry_type:           'OP_SPLIT',
            amount_aUEC:          Math.round(member.amount),
            op_id:                op.id,
            logged_by_callsign:   member.callsign,
            source_type:          'MANUAL',
          })
        )
      );
      setLogged(true);
    } catch {
      // log split failed — logged state unchanged
    }
    setLogging(false);
  };

  // ── Render ─────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Total input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 5 }}>TOTAL aUEC</div>
          <input
            className="nexus-input"
            type="number"
            min="0"
            value={totalInput}
            onChange={e => setTotalInput(e.target.value)}
            placeholder="0"
            style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}
          />
        </div>
        {isExclusive && buyInCost > 0 && (
          <div style={{
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(var(--warn-rgb), 0.06)',
            border: '0.5px solid rgba(var(--warn-rgb), 0.2)',
            color: 'var(--t1)', fontSize: 10,
          }}>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 2 }}>BUY-IN DEDUCTED</div>
            <div style={{ color: 'var(--warn)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              −{formatAUEC(buyInTotal)} aUEC
            </div>
          </div>
        )}
      </div>

      {/* Available pool */}
      {totalRaw > 0 && isExclusive && (
        <div style={{ color: 'var(--t2)', fontSize: 10 }}>
          Available for split:{' '}
          <span style={{ color: 'var(--t0)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {formatAUEC(available)} aUEC
          </span>
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 4 }}>
        <ModeChip label="EVEN"            active={mode === 'EVEN'}            onClick={() => setMode('EVEN')} />
        <ModeChip label="BY ROLE"         active={mode === 'BY_ROLE'}         onClick={() => setMode('BY_ROLE')} />
        <ModeChip label="BY CONTRIBUTION" active={mode === 'BY_CONTRIBUTION'} onClick={() => setMode('BY_CONTRIBUTION')} />
      </div>

      {/* BY_ROLE: lead bonus config */}
      {mode === 'BY_ROLE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>Pioneer lead bonus:</span>
          <input
            className="nexus-input"
            type="number" min="0" max="50" step="1"
            value={bonusPct}
            onChange={e => setBonusPct(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
            style={{ width: 60, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
          />
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>%</span>
        </div>
      )}

      {/* BY_CONTRIBUTION: sum warning */}
      {mode === 'BY_CONTRIBUTION' && !contribOk && (
        <div style={{ color: 'var(--warn)', fontSize: 10 }}>
          Contributions sum to {contribSum}% — adjust sliders (last auto-adjusts)
        </div>
      )}

      {/* Split table */}
      {crewCount === 0 ? (
        <div style={{ color: 'var(--t2)', fontSize: 11, padding: '10px 0' }}>No confirmed crew</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {splits.map((member, i) => (
            <div key={member.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', borderRadius: 6,
              background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            }}>
              {/* Callsign */}
              <span style={{ flex: 1, color: 'var(--t0)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.callsign}
              </span>
              {/* Role */}
              {member.role && (
                <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.05em', flexShrink: 0 }}>
                  {member.role.toUpperCase()}
                </span>
              )}
              {/* Contribution slider — BY_CONTRIBUTION mode */}
              {mode === 'BY_CONTRIBUTION' && (
                <input
                  type="range" min="0" max="100" step="1"
                  value={contributions[i] || 0}
                  onChange={e => setContrib(i, parseInt(e.target.value))}
                  disabled={i === crewCount - 1}
                  style={{ width: 80, opacity: i === crewCount - 1 ? 0.5 : 1 }}
                />
              )}
              {/* % label in contribution mode */}
              {mode === 'BY_CONTRIBUTION' && (
                <span style={{ color: 'var(--t2)', fontSize: 10, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {contributions[i] || 0}%
                </span>
              )}
              {/* Amount */}
              <span style={{
                color: totalRaw > 0 ? 'var(--live)' : 'var(--t3)',
                fontSize: 12, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'right',
              }}>
                {totalRaw > 0 ? `${formatAUEC(member.amount)} aUEC` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Log to coffer */}
      {crewCount > 0 && totalRaw > 0 && (
        <button
          onClick={handleLogSplit}
          disabled={logging || logged}
          className="nexus-btn"
          style={{
            width: '100%', justifyContent: 'center', padding: '9px 0',
            fontSize: 11, letterSpacing: '0.08em',
            background: logged ? 'rgba(var(--live-rgb), 0.06)' : 'var(--bg3)',
            borderColor: logged ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b2)',
            color: logged ? 'var(--live)' : 'var(--t0)',
            opacity: logging ? 0.6 : 1,
          }}
        >
          {logged ? '✓ SPLIT LOGGED TO COFFER' : logging ? 'LOGGING...' : 'LOG SPLIT TO COFFER →'}
        </button>
      )}
    </div>
  );
}