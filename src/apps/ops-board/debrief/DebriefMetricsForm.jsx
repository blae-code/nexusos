/**
 * DebriefMetricsForm — outcome, rating, objectives, financials.
 */
import React from 'react';
import { Target, Star, DollarSign } from 'lucide-react';

const OUTCOMES = [
  { id: 'SUCCESS', label: 'SUCCESS', color: '#4A8C5C' },
  { id: 'PARTIAL', label: 'PARTIAL', color: '#C8A84B' },
  { id: 'FAILURE', label: 'FAILURE', color: '#C0392B' },
  { id: 'ABORTED', label: 'ABORTED', color: '#5A5850' },
];

const LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

export default function DebriefMetricsForm({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Outcome */}
      <div>
        <span style={LABEL}>MISSION OUTCOME</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {OUTCOMES.map(o => (
            <button key={o.id} onClick={() => set('outcome', o.id)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 2, cursor: 'pointer',
              background: form.outcome === o.id ? `${o.color}18` : '#141410',
              border: `0.5px solid ${form.outcome === o.id ? o.color : 'rgba(200,170,100,0.08)'}`,
              color: form.outcome === o.id ? o.color : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textAlign: 'center', transition: 'all 120ms',
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <span style={LABEL}>MISSION RATING</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => set('mission_rating', n)} style={{
              padding: '6px 10px', borderRadius: 2, cursor: 'pointer',
              background: form.mission_rating >= n ? 'rgba(200,168,75,0.12)' : '#141410',
              border: `0.5px solid ${form.mission_rating >= n ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
              color: form.mission_rating >= n ? '#C8A84B' : '#5A5850',
              display: 'flex', alignItems: 'center',
            }}>
              <Star size={12} fill={form.mission_rating >= n ? '#C8A84B' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <span style={LABEL}><Target size={8} style={{ display: 'inline', verticalAlign: 'middle' }} /> OBJECTIVES MET</span>
          <input type="number" min={0} value={form.objectives_met} onChange={e => set('objectives_met', parseInt(e.target.value) || 0)}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={LABEL}>OBJECTIVES TOTAL</span>
          <input type="number" min={0} value={form.objectives_total} onChange={e => set('objectives_total', parseInt(e.target.value) || 0)}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Financials */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <span style={LABEL}><DollarSign size={8} style={{ display: 'inline', verticalAlign: 'middle' }} /> REVENUE (aUEC)</span>
          <input type="number" min={0} value={form.total_revenue_aUEC} onChange={e => set('total_revenue_aUEC', parseInt(e.target.value) || 0)}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={LABEL}>EXPENSES (aUEC)</span>
          <input type="number" min={0} value={form.total_expenses_aUEC} onChange={e => set('total_expenses_aUEC', parseInt(e.target.value) || 0)}
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={LABEL}>NET PROFIT</span>
          <div style={{
            padding: '10px 14px', background: '#141410', borderRadius: 2,
            border: '0.5px solid rgba(200,170,100,0.08)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
            color: (form.total_revenue_aUEC - form.total_expenses_aUEC) >= 0 ? '#4A8C5C' : '#C0392B',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {(form.total_revenue_aUEC - form.total_expenses_aUEC).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}