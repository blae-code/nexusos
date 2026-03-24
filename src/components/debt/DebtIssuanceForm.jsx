/**
 * DebtIssuanceForm — Leadership form to issue a new debt entry.
 * Props: { members, onCreated, onCancel }
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Plus } from 'lucide-react';

const DEBT_TYPES = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'SHIP_LOAN', label: 'Ship Loan' },
  { value: 'CREDIT_ADVANCE', label: 'Credit Advance' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];

export default function DebtIssuanceForm({ members = [], onCreated, onCancel }) {
  const [form, setForm] = useState({
    debtor_callsign: '',
    debt_type: 'MATERIAL',
    description: '',
    amount_aUEC: '',
    due_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const amount = parseInt(form.amount_aUEC);
    if (!form.debtor_callsign || !amount || amount <= 0) return;
    setSaving(true);
    await base44.entities.MemberDebt.create({
      debtor_callsign: form.debtor_callsign,
      debt_type: form.debt_type,
      description: form.description.trim(),
      amount_aUEC: amount,
      amount_paid: 0,
      status: 'OUTSTANDING',
      issued_at: new Date().toISOString(),
      due_date: form.due_date || null,
      payments: [],
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    onCreated?.();
  };

  const callsigns = members.map(m => m.callsign).filter(Boolean).sort();

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderLeft: '2px solid #C8A84B',
      borderRadius: 2, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#C8A84B', letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>ISSUE NEW DEBT</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>MEMBER *</label>
          <select className="nexus-input" value={form.debtor_callsign} onChange={e => set('debtor_callsign', e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
            <option value="">Select member...</option>
            {callsigns.map(cs => <option key={cs} value={cs}>{cs}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>TYPE *</label>
          <select className="nexus-input" value={form.debt_type} onChange={e => set('debt_type', e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
            {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>DESCRIPTION *</label>
        <input className="nexus-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. 50 SCU Quantanium for Nyx push" style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>AMOUNT (aUEC) *</label>
          <input className="nexus-input" type="number" min="1" value={form.amount_aUEC} onChange={e => set('amount_aUEC', e.target.value)} placeholder="0" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>DUE DATE</label>
          <input className="nexus-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={{ width: '100%', colorScheme: 'dark' }} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 4 }}>NOTES</label>
        <input className="nexus-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, padding: '7px 14px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
        }}>CANCEL</button>
        <button
          onClick={handleSubmit}
          disabled={saving || !form.debtor_callsign || !form.amount_aUEC}
          className="nexus-btn primary"
          style={{ padding: '7px 16px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={10} /> {saving ? 'ISSUING...' : 'ISSUE DEBT'}
        </button>
      </div>
    </div>
  );
}