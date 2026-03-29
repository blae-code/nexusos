/**
 * OpWrapUpPanel — Post-op financial close-out panel.
 * Shows when op status is COMPLETE. Revenue logging, expense tracking,
 * per-member payout ledger with payment status, and debrief generation.
 * Props: { op, rsvps, callsign, rank, onUpdate }
 */
import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { DollarSign, Plus, Check, X, FileText, Users, AlertTriangle, Coins } from 'lucide-react';
import { OPS_LEADER_RANKS } from './rankPolicies';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  return Math.round(n).toLocaleString();
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
      color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
      marginBottom: 8, paddingBottom: 6,
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
    }}>{children}</div>
  );
}

function SaleRow({ sale, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <span style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC' }}>
        {sale.description || 'Sale'}
      </span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>
        {sale.seller || '—'}
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
        color: '#2edb7a', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right',
      }}>+{fmtAuec(sale.amount)}</span>
      {onRemove && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
        }}><X size={10} /></button>
      )}
    </div>
  );
}

function ExpenseRow({ expense, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <span style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC' }}>
        {expense.description || 'Expense'}
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
        color: '#C0392B', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right',
      }}>-{fmtAuec(expense.amount)}</span>
      {onRemove && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
        }}><X size={10} /></button>
      )}
    </div>
  );
}

function PayoutRow({ member, payout, taxAmount, paymentStatus, onStatusChange }) {
  const statusColors = { PENDING: '#C8A84B', PAID: '#2edb7a', DISPUTED: '#C0392B' };
  const status = paymentStatus || 'PENDING';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 2,
      background: status === 'PAID' ? 'rgba(46,219,122,0.03)' : 'transparent',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: statusColors[status] || '#5A5850', flexShrink: 0,
      }} />
      <span style={{
        flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, color: '#E8E4DC', fontWeight: 500,
      }}>{member.callsign || '—'}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', textTransform: 'uppercase',
      }}>{member.role || ''}</span>
      {taxAmount > 0 && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#C0392B',
        }}>-{fmtAuec(taxAmount)} tax</span>
      )}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
        color: '#E8E4DC', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        minWidth: 80, textAlign: 'right',
      }}>{fmtAuec(payout)}</span>
      {onStatusChange && (
        <button
          onClick={() => onStatusChange(status === 'PAID' ? 'PENDING' : 'PAID')}
          style={{
            padding: '3px 8px', borderRadius: 2,
            background: status === 'PAID' ? 'rgba(46,219,122,0.08)' : 'rgba(200,168,75,0.08)',
            border: `0.5px solid ${status === 'PAID' ? 'rgba(46,219,122,0.25)' : 'rgba(200,168,75,0.25)'}`,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: statusColors[status] || '#5A5850',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          {status === 'PAID' ? <><Check size={9} /> PAID</> : <><Coins size={9} /> MARK PAID</>}
        </button>
      )}
    </div>
  );
}

export default function OpWrapUpPanel({ op, rsvps = [], callsign, rank, onUpdate }) {
  const canEdit = OPS_LEADER_RANKS.includes(rank);
  const wrapUp = op?.wrap_up_data || {};
  const payoutCfg = op?.payout_config || {};

  const [sales, setSales] = useState(wrapUp.sales || []);
  const [expenses, setExpenses] = useState(wrapUp.expenses || []);
  const [paymentStatuses, setPaymentStatuses] = useState(wrapUp.payment_statuses || {});
  const [newSale, setNewSale] = useState({ description: '', amount: '', seller: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingDebrief, setGeneratingDebrief] = useState(false);

  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const splitMode = payoutCfg.split_mode || 'EQUAL';
  const orgCutPct = payoutCfg.org_cut_pct || 0;
  const includeTax = payoutCfg.include_transfer_tax !== false;
  const taxRate = 0.005; // 0.5% SC mo.Trader tax

  const totalRevenue = sales.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const orgCut = Math.round(totalRevenue * (orgCutPct / 100));
  const netPool = Math.max(0, totalRevenue - totalExpenses - orgCut);

  const payouts = useMemo(() => {
    if (confirmed.length === 0) return [];
    const perMember = netPool / confirmed.length;
    return confirmed.map(m => {
      const raw = splitMode === 'EQUAL' ? perMember : perMember;
      const tax = includeTax ? Math.round(raw * taxRate) : 0;
      return { ...m, payout: Math.round(raw - tax), tax };
    });
  }, [confirmed, netPool, splitMode, includeTax, taxRate]);

  const paidCount = Object.values(paymentStatuses).filter(s => s === 'PAID').length;

  const saveWrapUp = useCallback(async (nextSales, nextExpenses, nextStatuses) => {
    setSaving(true);
    const data = {
      sales: nextSales || sales,
      expenses: nextExpenses || expenses,
      payment_statuses: nextStatuses || paymentStatuses,
      split_mode: splitMode,
      include_tax: includeTax,
    };
    await base44.entities.Op.update(op.id, { wrap_up_data: data });
    setSaving(false);
    onUpdate?.();
  }, [op?.id, sales, expenses, paymentStatuses, splitMode, includeTax, onUpdate]);

  const addSale = () => {
    const amount = parseFloat(newSale.amount);
    if (!amount) return;
    const next = [...sales, { ...newSale, amount, id: Date.now() }];
    setSales(next);
    setNewSale({ description: '', amount: '', seller: '' });
    setShowSaleForm(false);
    saveWrapUp(next, null, null);
  };

  const addExpense = () => {
    const amount = parseFloat(newExpense.amount);
    if (!amount) return;
    const next = [...expenses, { ...newExpense, amount, id: Date.now() }];
    setExpenses(next);
    setNewExpense({ description: '', amount: '' });
    setShowExpenseForm(false);
    saveWrapUp(null, next, null);
  };

  const removeSale = (idx) => { const next = sales.filter((_, i) => i !== idx); setSales(next); saveWrapUp(next, null, null); };
  const removeExpense = (idx) => { const next = expenses.filter((_, i) => i !== idx); setExpenses(next); saveWrapUp(null, next, null); };

  const updatePaymentStatus = (memberId, status) => {
    const next = { ...paymentStatuses, [memberId]: status };
    setPaymentStatuses(next);
    saveWrapUp(null, null, next);
  };

  const generateDebrief = async () => {
    setGeneratingDebrief(true);
    try {
      const res = await base44.functions.invoke('opWrapUp', {
        op_id: op.id,
        op_name: op.name,
        duration_minutes: op.started_at && op.ended_at
          ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000) : 0,
        crew: confirmed.map(r => r.callsign).filter(Boolean),
        logs: Array.isArray(op.session_log) ? op.session_log : [],
        materials: (Array.isArray(op.session_log) ? op.session_log : []).filter(e => e.type === 'MATERIAL'),
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
      });
      if (res.data?.debrief) {
        await base44.entities.Op.update(op.id, { wrap_up_report: res.data.debrief });
        onUpdate?.();
      }
    } finally {
      setGeneratingDebrief(false);
    }
  };

  const LABEL = {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
    color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase',
    display: 'block', marginBottom: 5,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Financial summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {[
          { label: 'REVENUE', value: totalRevenue, color: '#2edb7a', icon: DollarSign },
          { label: 'EXPENSES', value: totalExpenses, color: '#C0392B', icon: AlertTriangle },
          { label: 'ORG CUT', value: orgCut, color: '#C8A84B', icon: Coins },
          { label: 'NET POOL', value: netPool, color: '#E8E4DC', icon: Users },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0F0F0D',
            border: `0.5px solid ${s.color}22`,
            borderLeft: `2px solid ${s.color}`,
            borderRadius: 2, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <s.icon size={10} style={{ color: s.color }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
                color: '#5A5850', letterSpacing: '0.15em',
              }}>{s.label}</span>
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
              fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums',
            }}>{fmtAuec(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Revenue section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>REVENUE</SectionLabel>
          {canEdit && (
            <button onClick={() => setShowSaleForm(!showSaleForm)} style={{
              background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, padding: '3px 8px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
              display: 'flex', alignItems: 'center', gap: 3,
            }}><Plus size={9} /> ADD SALE</button>
          )}
        </div>
        {showSaleForm && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, animation: 'nexus-fade-in 150ms ease-out both' }}>
            <input className="nexus-input" placeholder="Description" value={newSale.description} onChange={e => setNewSale(s => ({ ...s, description: e.target.value }))} style={{ flex: 2, fontSize: 11 }} />
            <input className="nexus-input" placeholder="Seller" value={newSale.seller} onChange={e => setNewSale(s => ({ ...s, seller: e.target.value }))} style={{ flex: 1, fontSize: 11 }} />
            <input className="nexus-input" type="number" placeholder="aUEC" value={newSale.amount} onChange={e => setNewSale(s => ({ ...s, amount: e.target.value }))} style={{ width: 90, fontSize: 11 }} />
            <button onClick={addSale} className="nexus-btn primary" style={{ padding: '5px 10px', fontSize: 9 }}>ADD</button>
          </div>
        )}
        {sales.length === 0 ? (
          <div style={{ color: '#5A5850', fontSize: 11, padding: '8px 0' }}>No revenue logged yet.</div>
        ) : sales.map((s, i) => <SaleRow key={s.id || i} sale={s} onRemove={canEdit ? () => removeSale(i) : null} />)}
      </div>

      {/* Expenses section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>EXPENSES</SectionLabel>
          {canEdit && (
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} style={{
              background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, padding: '3px 8px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
              display: 'flex', alignItems: 'center', gap: 3,
            }}><Plus size={9} /> ADD EXPENSE</button>
          )}
        </div>
        {showExpenseForm && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, animation: 'nexus-fade-in 150ms ease-out both' }}>
            <input className="nexus-input" placeholder="Description" value={newExpense.description} onChange={e => setNewExpense(s => ({ ...s, description: e.target.value }))} style={{ flex: 2, fontSize: 11 }} />
            <input className="nexus-input" type="number" placeholder="aUEC" value={newExpense.amount} onChange={e => setNewExpense(s => ({ ...s, amount: e.target.value }))} style={{ width: 90, fontSize: 11 }} />
            <button onClick={addExpense} className="nexus-btn primary" style={{ padding: '5px 10px', fontSize: 9 }}>ADD</button>
          </div>
        )}
        {expenses.length === 0 ? (
          <div style={{ color: '#5A5850', fontSize: 11, padding: '8px 0' }}>No expenses logged.</div>
        ) : expenses.map((e, i) => <ExpenseRow key={e.id || i} expense={e} onRemove={canEdit ? () => removeExpense(i) : null} />)}
      </div>

      {/* Payout ledger */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>PAYOUT LEDGER — {splitMode} SPLIT</SectionLabel>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: paidCount === confirmed.length && confirmed.length > 0 ? '#2edb7a' : '#C8A84B',
          }}>{paidCount}/{confirmed.length} PAID</span>
        </div>
        {includeTax && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#C0392B', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <AlertTriangle size={9} /> 0.5% mo.Trader transfer tax applied
          </div>
        )}
        {payouts.length === 0 ? (
          <div style={{ color: '#5A5850', fontSize: 11, padding: '8px 0' }}>No crew to pay out.</div>
        ) : payouts.map(m => (
          <PayoutRow
            key={m.id}
            member={m}
            payout={m.payout}
            taxAmount={m.tax}
            paymentStatus={paymentStatuses[m.id]}
            onStatusChange={canEdit ? (status) => updatePaymentStatus(m.id, status) : null}
          />
        ))}
        {orgCutPct > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', marginTop: 4,
            background: 'rgba(200,168,75,0.04)',
            border: '0.5px solid rgba(200,168,75,0.15)',
            borderRadius: 2,
          }}>
            <Coins size={10} style={{ color: '#C8A84B' }} />
            <span style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B' }}>
              ORG TREASURY ({orgCutPct}%)
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
              fontWeight: 700, color: '#C8A84B', fontVariantNumeric: 'tabular-nums',
            }}>{fmtAuec(orgCut)} aUEC</span>
          </div>
        )}
      </div>

      {/* Debrief section */}
      <div>
        <SectionLabel>TACTICAL DEBRIEF</SectionLabel>
        {op.wrap_up_report ? (
          <div style={{
            background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: 14,
            fontFamily: "'Barlow', sans-serif", fontSize: 12,
            color: '#9A9488', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>{op.wrap_up_report}</div>
        ) : (
          <button
            onClick={generateDebrief}
            disabled={generatingDebrief}
            className="nexus-btn primary"
            style={{ padding: '10px 16px', fontSize: 11, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <FileText size={12} />
            {generatingDebrief ? 'GENERATING DEBRIEF...' : 'GENERATE TACTICAL DEBRIEF'}
          </button>
        )}
      </div>
    </div>
  );
}
