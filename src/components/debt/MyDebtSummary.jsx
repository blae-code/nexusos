/**
 * MyDebtSummary — Member's personal debt overview with payment capability.
 * Props: { callsign, debts, onPayment }
 */
import React, { useState } from 'react';
import { AlertTriangle, Check, Clock, DollarSign, Camera } from 'lucide-react';
import DebtPaymentUpload from '@/components/debt/DebtPaymentUpload';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1, background: '#0F0F0D', minWidth: 100,
      border: `0.5px solid ${color}22`, borderRadius: 2, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Icon size={10} style={{ color }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
        fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

export default function MyDebtSummary({ callsign, debts = [], onPayment }) {
  const [screenshotDebt, setScreenshotDebt] = useState(null);
  const myDebts = debts.filter(d => d.debtor_callsign === callsign);
  const outstanding = myDebts.filter(d => d.status === 'OUTSTANDING' || d.status === 'PARTIAL');
  const totalOwed = outstanding.reduce((s, d) => s + ((d.amount_aUEC || 0) - (d.amount_paid || 0)), 0);
  const totalPaid = myDebts.reduce((s, d) => s + (d.amount_paid || 0), 0);
  const paidCount = myDebts.filter(d => d.status === 'PAID' || d.status === 'FORGIVEN').length;

  if (myDebts.length === 0) {
    return (
      <div style={{
        background: 'rgba(46,219,122,0.04)',
        border: '0.5px solid rgba(46,219,122,0.20)',
        borderLeft: '2px solid #2edb7a',
        borderRadius: 2, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Check size={14} style={{ color: '#2edb7a' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#2edb7a',
        }}>You have no outstanding debts. All clear.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatCard icon={AlertTriangle} label="TOTAL OWED" value={`${fmtAuec(totalOwed)} aUEC`} color="#C0392B" />
        <StatCard icon={DollarSign} label="TOTAL PAID" value={`${fmtAuec(totalPaid)} aUEC`} color="#2edb7a" />
        <StatCard icon={Clock} label="ACTIVE DEBTS" value={String(outstanding.length)} color="#C8A84B" />
        <StatCard icon={Check} label="SETTLED" value={String(paidCount)} color="#2edb7a" />
      </div>

      {/* Debt cards */}
      {outstanding.map(debt => {
        const remaining = (debt.amount_aUEC || 0) - (debt.amount_paid || 0);
        const paidPct = debt.amount_aUEC > 0 ? ((debt.amount_paid || 0) / debt.amount_aUEC) * 100 : 0;
        const isOverdue = debt.due_date && new Date(debt.due_date) < new Date();

        return (
          <div key={debt.id} style={{
            background: '#0F0F0D',
            border: `0.5px solid ${isOverdue ? 'rgba(192,57,43,0.30)' : 'rgba(200,170,100,0.10)'}`,
            borderLeft: `2px solid ${isOverdue ? '#C0392B' : '#C8A84B'}`,
            borderRadius: 2, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                  color: '#E8E4DC', fontWeight: 600,
                }}>{debt.description || debt.debt_type?.replace(/_/g, ' ')}</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  color: '#5A5850', marginTop: 2,
                }}>
                  Issued by {debt.creditor_callsign || 'ORG'}
                  {debt.issued_at ? ` · ${new Date(debt.issued_at).toLocaleDateString()}` : ''}
                  {isOverdue && <span style={{ color: '#C0392B', marginLeft: 8 }}>⚠ OVERDUE</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
                  fontWeight: 700, color: '#C0392B', fontVariantNumeric: 'tabular-nums',
                }}>{fmtAuec(remaining)}</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
                }}>of {fmtAuec(debt.amount_aUEC)} aUEC</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 3, borderRadius: 1.5, marginBottom: 10,
              background: 'rgba(200,170,100,0.06)', overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, paidPct)}%`, height: '100%', borderRadius: 1.5,
                background: '#2edb7a', transition: 'width 300ms',
              }} />
            </div>

            {/* Payment history */}
            {(debt.payments || []).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
                  color: '#5A5850', letterSpacing: '0.15em', marginBottom: 4,
                }}>PAYMENT HISTORY</div>
                {(debt.payments || []).map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '3px 0',
                    borderBottom: '0.5px solid rgba(200,170,100,0.03)',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  }}>
                    <span style={{ color: '#5A5850' }}>{p.date ? new Date(p.date).toLocaleDateString() : '—'}</span>
                    <span style={{ color: '#2edb7a', fontWeight: 600 }}>+{fmtAuec(p.amount)}</span>
                    <span style={{ color: '#5A5850', flex: 1 }}>{p.source || ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pay buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onPayment?.(debt)}
                className="nexus-btn primary"
                style={{ flex: 1, padding: '8px 0', fontSize: 11 }}
              >
                MANUAL PAYMENT
              </button>
              <button
                onClick={() => setScreenshotDebt(debt)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 11, borderRadius: 2,
                  cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600, letterSpacing: '0.08em',
                  background: 'rgba(122,174,204,0.06)',
                  border: '0.5px solid rgba(122,174,204,0.20)',
                  color: '#7AAECC', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 5,
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(122,174,204,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(122,174,204,0.06)'; }}
              >
                <Camera size={11} /> PAY VIA SCREENSHOT
              </button>
            </div>
          </div>
        );
      })}

      {screenshotDebt && (
        <DebtPaymentUpload
          debt={screenshotDebt}
          callsign={callsign}
          onComplete={() => { setScreenshotDebt(null); onPayment?.(null); }}
          onCancel={() => setScreenshotDebt(null)}
        />
      )}
    </div>
  );
}