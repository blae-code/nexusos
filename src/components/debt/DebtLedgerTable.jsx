/**
 * DebtLedgerTable — Shows all debt entries with status, progress, actions.
 * Props: { debts, canManage, onPayment, onForgive, onDispute }
 */
import React from 'react';
import { AlertTriangle, Check, XCircle, Clock } from 'lucide-react';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  return Math.round(n).toLocaleString();
}

const STATUS_CFG = {
  OUTSTANDING: { color: '#C0392B', label: 'OUTSTANDING', icon: AlertTriangle },
  PARTIAL:     { color: '#C8A84B', label: 'PARTIAL',     icon: Clock },
  PAID:        { color: '#2edb7a', label: 'PAID',        icon: Check },
  FORGIVEN:    { color: '#7AAECC', label: 'FORGIVEN',    icon: XCircle },
  DISPUTED:    { color: '#C0392B', label: 'DISPUTED',    icon: AlertTriangle },
};

const TYPE_COLORS = {
  MATERIAL: '#C8A84B',
  SHIP_LOAN: '#7AAECC',
  CREDIT_ADVANCE: '#2edb7a',
  EQUIPMENT: '#D8BC70',
  OTHER: '#9A9488',
};

export default function DebtLedgerTable({ debts = [], canManage, onPayment, onForgive, onDispute }) {
  if (debts.length === 0) {
    return (
      <div style={{
        padding: '30px 0', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
      }}>No debt entries found.</div>
    );
  }

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: canManage ? '120px 80px 1fr 90px 90px 70px 120px' : '120px 80px 1fr 90px 90px 70px',
        gap: 6, padding: '8px 12px', background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      }}>
        {['MEMBER', 'TYPE', 'DESCRIPTION', 'OWED', 'PAID', 'STATUS', ...(canManage ? ['ACTIONS'] : [])].map(h => (
          <span key={h} style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
            fontSize: 9, color: '#5A5850', letterSpacing: '0.15em',
          }}>{h}</span>
        ))}
      </div>

      {debts.map(debt => {
        const cfg = STATUS_CFG[debt.status] || STATUS_CFG.OUTSTANDING;
        const remaining = (debt.amount_aUEC || 0) - (debt.amount_paid || 0);
        const paidPct = debt.amount_aUEC > 0 ? Math.min(100, ((debt.amount_paid || 0) / debt.amount_aUEC) * 100) : 0;
        const isOverdue = debt.due_date && new Date(debt.due_date) < new Date() && debt.status !== 'PAID' && debt.status !== 'FORGIVEN';
        const StatusIcon = cfg.icon;

        return (
          <div key={debt.id} style={{
            display: 'grid',
            gridTemplateColumns: canManage ? '120px 80px 1fr 90px 90px 70px 120px' : '120px 80px 1fr 90px 90px 70px',
            gap: 6, padding: '10px 12px', alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.04)',
            background: isOverdue ? 'rgba(192,57,43,0.03)' : 'transparent',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isOverdue ? 'rgba(192,57,43,0.06)' : '#1A1A16'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isOverdue ? 'rgba(192,57,43,0.03)' : 'transparent'; }}
          >
            {/* Member */}
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC', fontWeight: 600 }}>
                {debt.debtor_callsign}
              </div>
              {isOverdue && (
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#C0392B' }}>OVERDUE</span>
              )}
            </div>

            {/* Type */}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              color: TYPE_COLORS[debt.debt_type] || '#9A9488',
              textTransform: 'uppercase',
            }}>{(debt.debt_type || 'OTHER').replace(/_/g, ' ')}</span>

            {/* Description + progress */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{debt.description || '—'}</div>
              <div style={{
                height: 2, borderRadius: 1, marginTop: 4,
                background: 'rgba(200,170,100,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${paidPct}%`, height: '100%', borderRadius: 1,
                  background: paidPct >= 100 ? '#2edb7a' : '#C8A84B',
                  transition: 'width 300ms',
                }} />
              </div>
            </div>

            {/* Owed */}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: '#C0392B', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            }}>{fmtAuec(remaining)}</span>

            {/* Paid */}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: '#2edb7a', fontVariantNumeric: 'tabular-nums',
            }}>{fmtAuec(debt.amount_paid)}</span>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <StatusIcon size={9} style={{ color: cfg.color }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: cfg.color, fontWeight: 600,
              }}>{cfg.label}</span>
            </div>

            {/* Actions */}
            {canManage && (
              <div style={{ display: 'flex', gap: 4 }}>
                {debt.status !== 'PAID' && debt.status !== 'FORGIVEN' && (
                  <>
                    <button
                      onClick={() => onPayment?.(debt)}
                      style={{
                        padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                        background: 'rgba(46,219,122,0.08)', border: '0.5px solid rgba(46,219,122,0.25)',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#2edb7a',
                      }}
                    >PAY</button>
                    <button
                      onClick={() => onForgive?.(debt)}
                      style={{
                        padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                        background: 'rgba(122,174,204,0.08)', border: '0.5px solid rgba(122,174,204,0.25)',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#7AAECC',
                      }}
                    >FORGIVE</button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}