import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Plus, Trash2 } from 'lucide-react';
import moment from 'moment';

const ALERT_TYPES = ['SELL_ABOVE', 'SELL_BELOW', 'BUY_ABOVE', 'BUY_BELOW', 'MARGIN_ABOVE'];
const ALERT_COLORS = { SELL_ABOVE: '#4A8C5C', SELL_BELOW: '#C0392B', BUY_ABOVE: '#C0392B', BUY_BELOW: '#C8A84B', MARGIN_ABOVE: '#4A8C5C' };

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: '#141410',
  border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: '0.06em',
};

export default function PriceWatchTab() {
  const { user } = useSession();
  const [alerts, setAlerts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ commodity_name: '', alert_type: 'SELL_ABOVE', threshold_aUEC: '', notify_all: false, notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [a, c] = await Promise.all([
      base44.entities.PriceAlert.list('-created_date', 200),
      base44.entities.GameCacheCommodity.list('name', 500),
    ]);
    setAlerts(a || []);
    setCommodities(c || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.commodity_name || !form.threshold_aUEC) return;
    await base44.entities.PriceAlert.create({
      ...form,
      threshold_aUEC: parseFloat(form.threshold_aUEC) || 0,
      is_active: true, trigger_count: 0,
      created_by_callsign: user?.callsign || '',
    });
    setForm({ commodity_name: '', alert_type: 'SELL_ABOVE', threshold_aUEC: '', notify_all: false, notes: '' });
    load();
  };

  const handleToggle = async (alert) => {
    await base44.entities.PriceAlert.update(alert.id, { is_active: !alert.is_active });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.PriceAlert.delete(id);
    load();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 16 }}>PRICE WATCH — ALERT CONFIGURATION</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* Alerts table */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 1fr 0.5fr 60px',
            padding: '8px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <span>COMMODITY</span><span>TYPE</span><span>THRESHOLD</span><span>STATUS</span><span>LAST TRIGGERED</span><span>HITS</span><span />
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#5A5850', fontSize: 10 }}>NO ALERTS CONFIGURED</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 1fr 0.5fr 60px',
              padding: '10px 14px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.06)',
            }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#E8E4DC' }}>{a.commodity_name}</span>
              <span style={{
                display: 'inline-block', padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600,
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
                background: (ALERT_COLORS[a.alert_type] || '#5A5850') + '18',
                color: ALERT_COLORS[a.alert_type] || '#5A5850',
              }}>{a.alert_type}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#E8E4DC' }}>
                {a.alert_type === 'MARGIN_ABOVE' ? `${a.threshold_aUEC}%` : `${(a.threshold_aUEC || 0).toLocaleString()} aUEC`}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => handleToggle(a)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.is_active ? '#4A8C5C' : '#5A5850', animation: a.is_active ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
                <span style={{ fontSize: 10, color: a.is_active ? '#4A8C5C' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>{a.is_active ? 'ACTIVE' : 'OFF'}</span>
              </span>
              <span style={{ fontSize: 10, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>{a.last_triggered_at ? moment(a.last_triggered_at).fromNow() : '—'}</span>
              <span style={{ fontSize: 10, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif" }}>{a.trigger_count || 0}</span>
              <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        {/* Create form */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 16, alignSelf: 'start' }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 14, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>CREATE ALERT</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Commodity</label>
              <select style={inp} value={form.commodity_name} onChange={e => setForm(f => ({ ...f, commodity_name: e.target.value }))} required>
                <option value="">Select...</option>
                {commodities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Alert Type</label>
              <select style={inp} value={form.alert_type} onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}>
                {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                {form.alert_type === 'MARGIN_ABOVE' ? 'Threshold (%)' : 'Threshold (aUEC)'}
              </label>
              <input style={inp} type="number" step="any" value={form.threshold_aUEC} onChange={e => setForm(f => ({ ...f, threshold_aUEC: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={form.notify_all} onChange={e => setForm(f => ({ ...f, notify_all: e.target.checked }))} style={{ accentColor: '#C0392B' }} />
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.08em' }}>Notify all members</label>
            </div>
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea style={{ ...inp, minHeight: 40, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" style={{
              padding: '10px', background: '#C0392B', border: 'none', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer',
            }}>CREATE ALERT</button>
          </form>
        </div>
      </div>
    </div>
  );
}