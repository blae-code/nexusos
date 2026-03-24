/**
 * PaymentDialog — Modal for recording a payment against a debt.
 * Props: { debt, onConfirm, onCancel }
 */
import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

function fmtAuec(n) { return Math.round(n || 0).toLocaleString(); }

export default function PaymentDialog({ debt, onConfirm, onCancel }) {
  const remaining = (debt.amount_aUEC || 0) - (debt.amount_paid || 0);
  const [amount, setAmount] = useState(String(remaining));
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const payAmount = Math.min(parseInt(amount) || 0, remaining);

  const handleConfirm = async () => {
    if (payAmount <= 0) return;
    setSaving(true);
    await onConfirm(debt, payAmount, source, note);
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'nexus-fade-in 150ms ease-out both',
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxWidth: '90vw',
          background: '#0F0F0D',
          border: '0.5px solid rgba(200,170,100,0.20)',
          borderLeft: '2px solid #2edb7a',
          borderRadius: 2, padding: 24,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
          color: '#E8E4DC', fontWeight: 700,
        }}>Record Payment</div>

        <div style={{
          background: 'rgba(200,170,100,0.04)',
          border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, padding: '10px 12px',
        }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC' }}>
            {debt.description || debt.debt_type}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
            {debt.debtor_callsign} · {fmtAuec(remaining)} aUEC remaining
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>PAYMENT AMOUNT (aUEC)</label>
          <input className="nexus-input" type="number" min="1" max={remaining} value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', fontSize: 16, fontWeight: 700 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>SOURCE</label>
            <select className="nexus-input" value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
              <option value="">Manual</option>
              <option value="OP_PAYOUT">Op Payout</option>
              <option value="DIRECT_TRANSFER">Direct Transfer</option>
              <option value="WALLET_DEDUCTION">Wallet Deduction</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>NOTE</label>
            <input className="nexus-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Quick amount buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[Math.round(remaining * 0.25), Math.round(remaining * 0.5), remaining].filter(v => v > 0).map(v => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 2, cursor: 'pointer',
                background: parseInt(amount) === v ? 'rgba(46,219,122,0.08)' : 'transparent',
                border: `0.5px solid ${parseInt(amount) === v ? 'rgba(46,219,122,0.25)' : 'rgba(200,170,100,0.10)'}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: parseInt(amount) === v ? '#2edb7a' : '#5A5850',
                textAlign: 'center',
              }}
            >
              {v === remaining ? 'PAY FULL' : `${fmtAuec(v)} aUEC`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '8px 16px', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          }}>CANCEL</button>
          <button
            onClick={handleConfirm}
            disabled={saving || payAmount <= 0}
            className="nexus-btn primary"
            style={{ padding: '8px 20px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <DollarSign size={11} />
            {saving ? 'PROCESSING...' : `PAY ${fmtAuec(payAmount)} aUEC`}
          </button>
        </div>
      </div>
    </div>
  );
}