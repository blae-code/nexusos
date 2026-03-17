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



export default function SplitCalc({ op, rsvps = [] }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const crewCount = confirmed.length;
  const isExclusive = op.access_type === 'EXCLUSIVE';
  const buyInCost = op.buy_in_cost || 0;

  const [totalInput, setTotalInput] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const [customPayouts, setCustomPayouts] = useState({});
  const [logging, setLogging] = useState(false);
  const [loggedConfirm, setLoggedConfirm] = useState(false);

  useEffect(() => {
    if (loggedConfirm) {
      const timer = setTimeout(() => setLoggedConfirm(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loggedConfirm]);

  const totalRaw = parseFloat(totalInput) || 0;
  const buyInTotal = isExclusive ? buyInCost * crewCount : 0;
  const available = Math.max(0, totalRaw - buyInTotal);

  const splits = useMemo(() => {
    if (crewCount === 0) return [];
    if (equalSplit) {
      const each = available / crewCount;
      return confirmed.map(r => ({ ...r, amount: each }));
    }
    return confirmed.map(r => ({ ...r, amount: parseFloat(customPayouts[r.id] || 0) }));
  }, [available, confirmed, crewCount, equalSplit, customPayouts]);

  const handleLogSplit = async () => {
    if (!totalRaw || logging || loggedConfirm) return;
    setLogging(true);
    try {
      await Promise.all(
        splits.map(member =>
          base44.entities.CofferLog.create({
            entry_type: 'OP_SPLIT',
            amount_aUEC: Math.round(member.amount),
            op_id: op.id,
            logged_by_callsign: member.callsign,
            source_type: 'MANUAL',
          })
        )
      );
      setLoggedConfirm(true);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes split-confirm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Header */}
      <div>
        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Split Calculator
        </span>
      </div>

      {/* Total haul display */}
      {totalRaw > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <span style={{ fontSize: 18, color: 'var(--t0)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {formatAUEC(totalRaw)}
          </span>
          <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Gross Haul
          </span>
        </div>
      )}

      {/* Equal split toggle */}
      {crewCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setEqualSplit(!equalSplit)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              background: equalSplit ? 'var(--acc)' : 'var(--bg3)',
              border: `0.5px solid ${equalSplit ? 'var(--acc)' : 'var(--b1)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {equalSplit && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </button>
          <span style={{ fontSize: 9, color: 'var(--t2)', fontFamily: 'var(--font)' }}>
            Equal split
          </span>
        </div>
      )}

      {/* Buy-in deduction warning line */}
      {isExclusive && buyInCost > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 36,
            paddingTop: 8,
            borderTop: `0.5px solid var(--warn-b)`,
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--warn)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em', flex: 1 }}>
            Buy-in Deduction
          </span>
          <span style={{ fontSize: 11, color: 'var(--warn)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
            −{formatAUEC(buyInCost)} aUEC
          </span>
        </div>
      )}

      {/* Crew payout rows */}
      {crewCount === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font)', padding: '8px 0' }}>
          No confirmed crew
        </div>
      ) : (
        splits.map((member, i) => (
          <div key={member.id || i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, borderBottom: '0.5px solid var(--b0)' }}>
              {/* Callsign */}
              <span style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'var(--font)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.callsign}
              </span>

              {/* Payout (editable or display) */}
              {!equalSplit ? (
                <input
                  type="number"
                  min="0"
                  value={customPayouts[member.id] || ''}
                  onChange={e => setCustomPayouts(p => ({ ...p, [member.id]: e.target.value }))}
                  placeholder="0"
                  style={{
                    width: 100,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  className="nexus-input"
                />
              ) : (
                <span style={{ fontSize: 13, color: 'var(--t0)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', minWidth: 100, textAlign: 'right' }}>
                  {totalRaw > 0 ? `${formatAUEC(member.amount)} aUEC` : '—'}
                </span>
              )}
            </div>

            {/* Net payout line (EXCLUSIVE only) */}
            {isExclusive && (
              <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)' }}>
                Net after buy-in: {formatAUEC(Math.max(0, member.amount - buyInCost))} aUEC
              </span>
            )}
          </div>
        ))
      )}

      {/* Log split button */}
      {crewCount > 0 && totalRaw > 0 && (
        <button
          onClick={handleLogSplit}
          disabled={logging || loggedConfirm}
          className="nexus-btn primary"
          style={{
            width: '100%',
            padding: '10px 0',
            fontSize: 11,
            fontFamily: 'var(--font)',
            letterSpacing: '0.08em',
            opacity: logging ? 0.6 : loggedConfirm ? 1 : 1,
            color: loggedConfirm ? 'var(--live)' : undefined,
            background: loggedConfirm ? 'rgba(var(--live-rgb), 0.08)' : undefined,
            borderColor: loggedConfirm ? 'rgba(var(--live-rgb), 0.3)' : undefined,
            animation: loggedConfirm ? 'split-confirm-pulse 400ms ease-in-out' : undefined,
            cursor: logging || loggedConfirm ? 'not-allowed' : 'pointer',
            pointerEvents: loggedConfirm ? 'none' : 'auto',
          }}
        >
          {loggedConfirm ? 'Split logged ✓' : logging ? 'Logging...' : 'Log Split to Coffer →'}
        </button>
      )}
    </div>
  );
}