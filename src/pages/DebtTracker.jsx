/**
 * DebtTracker — Full debt management page.
 * Leadership sees all debts + issuance form.
 * Members see their own debts + payment flow.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus } from 'lucide-react';
import DebtIssuanceForm from '@/components/debt/DebtIssuanceForm';
import DebtLedgerTable from '@/components/debt/DebtLedgerTable';
import MyDebtSummary from '@/components/debt/MyDebtSummary';
import PaymentDialog from '@/components/debt/PaymentDialog';

const LEADER_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

export default function DebtTracker() {
  const ctx = useOutletContext() || {};
  const callsign = ctx['callsign'] || 'UNKNOWN';
  const rank = ctx['rank'] || 'AFFILIATE';
  const canManage = LEADER_RANKS.includes(rank);

  const [debts, setDebts] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null);
  const [viewTab, setViewTab] = useState(canManage ? 'ledger' : 'my-debts');
  const [statusFilter, setStatusFilter] = useState('active');

  const load = useCallback(async () => {
    const [d, m] = await Promise.all([
      base44.entities.MemberDebt.list('-issued_at', 200),
      base44.entities.NexusUser.list('-joined_at', 200),
    ]);
    setDebts(d || []);
    setMembers(m || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.MemberDebt.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const handlePayment = async (debt, amount, source, note) => {
    const newPaid = (debt.amount_paid || 0) + amount;
    const isFullyPaid = newPaid >= debt.amount_aUEC;
    const payment = { amount, date: new Date().toISOString(), source: source || 'MANUAL', note };
    const payments = [...(debt.payments || []), payment];

    await base44.entities.MemberDebt.update(debt.id, {
      amount_paid: newPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIAL',
      payments,
    });
    setPayingDebt(null);
    load();
  };

  const handleForgive = async (debt) => {
    await base44.entities.MemberDebt.update(debt.id, { status: 'FORGIVEN' });
    load();
  };

  const filteredDebts = debts.filter(d => {
    if (statusFilter === 'active') return d.status === 'OUTSTANDING' || d.status === 'PARTIAL';
    if (statusFilter === 'settled') return d.status === 'PAID' || d.status === 'FORGIVEN';
    return true;
  });

  // Summary stats
  const totalOutstanding = debts
    .filter(d => d.status === 'OUTSTANDING' || d.status === 'PARTIAL')
    .reduce((s, d) => s + ((d.amount_aUEC || 0) - (d.amount_paid || 0)), 0);
  const totalRecovered = debts.reduce((s, d) => s + (d.amount_paid || 0), 0);
  const activeCount = debts.filter(d => d.status === 'OUTSTANDING' || d.status === 'PARTIAL').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              DEBT TRACKER
            </div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 13, color: '#9A9488', marginTop: 2 }}>
              Track material & ship debts across org members
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                background: '#C0392B', border: 'none', borderRadius: 2, cursor: 'pointer',
                color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 12, textTransform: 'uppercase', padding: '9px 16px',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#9B2D20'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#C0392B'; }}
            >
              <Plus size={12} /> ISSUE DEBT
            </button>
          )}
        </div>

        {/* Org-wide stats (leadership) */}
        {canManage && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'OUTSTANDING', value: `${(totalOutstanding / 1000).toFixed(0)}K aUEC`, color: '#C0392B' },
              { label: 'RECOVERED', value: `${(totalRecovered / 1000).toFixed(0)}K aUEC`, color: '#2edb7a' },
              { label: 'ACTIVE DEBTS', value: String(activeCount), color: '#C8A84B' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: '#0F0F0D',
                border: `0.5px solid ${s.color}22`,
                borderLeft: `2px solid ${s.color}`,
                borderRadius: 2, padding: '8px 12px',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.15em' }}>{s.label}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'my-debts', label: 'MY DEBTS' },
            ...(canManage ? [{ id: 'ledger', label: 'ORG LEDGER' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setViewTab(t.id)} style={{
              padding: '8px 14px', background: 'transparent', border: 'none',
              borderBottom: viewTab === t.id ? '2px solid #C0392B' : '2px solid transparent',
              color: viewTab === t.id ? '#E8E4DC' : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
            }}>{t.label}</button>
          ))}

          {viewTab === 'ledger' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {['active', 'settled', 'all'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} style={{
                  padding: '4px 10px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  background: statusFilter === f ? 'rgba(200,168,75,0.12)' : 'transparent',
                  border: `0.5px solid ${statusFilter === f ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
                  color: statusFilter === f ? '#C8A84B' : '#5A5850',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>{f}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* Issuance form */}
        {showForm && canManage && (
          <div style={{ marginBottom: 16 }}>
            <DebtIssuanceForm
              members={members}
              onCreated={() => { setShowForm(false); load(); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {viewTab === 'my-debts' && (
          <MyDebtSummary
            callsign={callsign}
            debts={debts}
            onPayment={setPayingDebt}
          />
        )}

        {viewTab === 'ledger' && canManage && (
          <DebtLedgerTable
            debts={filteredDebts}
            canManage={canManage}
            onPayment={setPayingDebt}
            onForgive={handleForgive}
            onDispute={() => {}}
          />
        )}
      </div>

      {/* Payment dialog */}
      {payingDebt && (
        <PaymentDialog
          debt={payingDebt}
          onConfirm={handlePayment}
          onCancel={() => setPayingDebt(null)}
        />
      )}
    </div>
  );
}