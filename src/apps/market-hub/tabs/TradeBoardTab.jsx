import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Plus, X } from 'lucide-react';

const STATUS_COLORS = { OPEN: '#5A5850', NEGOTIATING: '#C8A84B', COMPLETED: '#4A8C5C', CANCELLED: '#5A5850', EXPIRED: '#5A5850' };
const CATEGORIES = ['FPS_WEAPON', 'FPS_ARMOR', 'SHIP_COMPONENT', 'MATERIAL', 'COMMODITY', 'BLUEPRINT', 'CURRENCY', 'OTHER'];
const CONDITIONS = ['PRISTINE', 'GOOD', 'DAMAGED', 'ANY'];

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: '#141410',
  border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: '0.06em',
};
const lbl = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };

function OrderRow({ order, onFulfill }) {
  const { user } = useSession();
  const isOwn = (order.posted_by_callsign || '').toUpperCase() === (user?.callsign || '').toUpperCase();
  const sc = STATUS_COLORS[order.status] || '#5A5850';
  return (
    <div style={{
      padding: '10px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#E8E4DC', letterSpacing: '0.04em' }}>{order.item_name}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 10, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif" }}>
          <span style={{ color: '#C8A84B' }}>{order.posted_by_callsign}</span>
          {order.quantity > 1 && <span>x{order.quantity}</span>}
          {order.quality_score > 0 && <span>Q{order.quality_score}</span>}
          {order.system_location && <span>{order.system_location}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: order.order_type === 'WTS' ? '#4A8C5C' : '#C8A84B' }}>
          {order.price_aUEC ? `${order.price_aUEC.toLocaleString()}` : '—'}
        </div>
        {order.price_negotiable && <div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>negotiable</div>}
      </div>
      <span style={{
        padding: '2px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600,
        fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
        background: sc + '18', color: sc,
        textDecoration: order.status === 'EXPIRED' ? 'line-through' : 'none',
      }}>{order.status}</span>
      {order.status === 'OPEN' && !isOwn && (
        <button onClick={() => onFulfill(order)} style={{
          padding: '4px 10px', background: '#C0392B', border: 'none', borderRadius: 2,
          color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer',
        }}>FULFILL</button>
      )}
    </div>
  );
}

export default function TradeBoardTab() {
  const { user } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    order_type: 'WTS', item_name: '', item_category: 'COMMODITY',
    price_aUEC: '', price_negotiable: false, quantity: '1',
    quality_score: '', condition: 'GOOD', system_location: '',
    description: '', post_to_uex: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const o = await base44.entities.OrgTradeOrder.list('-created_date', 200);
    setOrders(o || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    const now = new Date().toISOString();
    await base44.entities.OrgTradeOrder.create({
      ...form,
      price_aUEC: parseInt(form.price_aUEC) || 0,
      quantity: parseInt(form.quantity) || 1,
      quality_score: parseInt(form.quality_score) || 0,
      posted_by_callsign: user?.callsign || '',
      status: 'OPEN', posted_at: now,
    });
    setShowForm(false);
    setForm({ order_type: 'WTS', item_name: '', item_category: 'COMMODITY', price_aUEC: '', price_negotiable: false, quantity: '1', quality_score: '', condition: 'GOOD', system_location: '', description: '', post_to_uex: false });
    load();
  };

  const handleFulfill = async (order) => {
    await base44.entities.OrgTradeOrder.update(order.id, {
      status: 'COMPLETED', fulfilled_by_callsign: user?.callsign || '', fulfilled_at: new Date().toISOString(),
    });
    load();
  };

  const wts = orders.filter(o => o.order_type === 'WTS');
  const wtb = orders.filter(o => o.order_type === 'WTB');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>INTERNAL ORG TRADE BOARD</div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '7px 16px', background: '#C0392B', border: 'none', borderRadius: 2,
          color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}><Plus size={12} /> POST ORDER</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* WTS Panel */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C8A84B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2 }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: '#C8A84B', letterSpacing: '0.12em' }}>SELLING</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>{wts.length}</span>
          </div>
          {wts.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#5A5850', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>NO WTS ORDERS</div>
          ) : wts.map(o => <OrderRow key={o.id} order={o} onFulfill={handleFulfill} />)}
        </div>

        {/* WTB Panel */}
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2 }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: '#C0392B', letterSpacing: '0.12em' }}>SEEKING</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>{wtb.length}</span>
          </div>
          {wtb.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#5A5850', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>NO WTB ORDERS</div>
          ) : wtb.map(o => <OrderRow key={o.id} order={o} onFulfill={handleFulfill} />)}
        </div>
      </div>

      {/* Post Order Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#0A0908', border: '0.5px solid rgba(200,170,100,0.15)', borderLeft: '2px solid #C0392B', borderRadius: 2, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em' }}>POST NEW ORDER</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                {['WTS', 'WTB'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, order_type: t }))} style={{
                    flex: 1, padding: '8px', background: form.order_type === t ? (t === 'WTS' ? 'rgba(200,168,75,0.12)' : 'rgba(192,57,43,0.12)') : '#141410',
                    border: `0.5px solid ${form.order_type === t ? (t === 'WTS' ? '#C8A84B' : '#C0392B') : 'rgba(200,170,100,0.12)'}`,
                    borderRadius: 2, color: form.order_type === t ? '#E8E4DC' : '#5A5850', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.12em',
                  }}>{t === 'WTS' ? 'SELLING' : 'BUYING'}</button>
                ))}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Item Name *</label>
                <input style={inp} value={form.item_name} required placeholder="e.g. GP-33 MOD, Quantanium" onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select style={inp} value={form.item_category} onChange={e => setForm(f => ({ ...f, item_category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Price (aUEC)</label>
                <input style={inp} type="number" min="0" value={form.price_aUEC} onChange={e => setForm(f => ({ ...f, price_aUEC: e.target.value }))} placeholder="0 = negotiable" />
              </div>
              <div>
                <label style={lbl}>Quantity</label>
                <input style={inp} type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Condition</label>
                <select style={inp} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>System</label>
                <select style={inp} value={form.system_location} onChange={e => setForm(f => ({ ...f, system_location: e.target.value }))}>
                  <option value="">—</option>
                  <option value="STANTON">Stanton</option>
                  <option value="PYRO">Pyro</option>
                  <option value="NYX">Nyx</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Quality Score</label>
                <input style={inp} type="number" min="0" max="1000" value={form.quality_score} onChange={e => setForm(f => ({ ...f, quality_score: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16 }}>
                <input type="checkbox" checked={form.price_negotiable} onChange={e => setForm(f => ({ ...f, price_negotiable: e.target.checked }))} style={{ accentColor: '#C0392B' }} />
                <label style={{ ...lbl, margin: 0 }}>NEGOTIABLE</label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Notes</label>
                <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: '9px 20px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                  borderRadius: 2, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer',
                }}>CANCEL</button>
                <button type="submit" style={{
                  padding: '9px 24px', background: '#C0392B', border: 'none', borderRadius: 2,
                  color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer',
                }}>POST ORDER</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}