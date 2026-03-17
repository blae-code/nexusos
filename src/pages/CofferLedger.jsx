import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus, TrendingUp, TrendingDown, Coins, BookOpen } from 'lucide-react';
import EmptyState from '@/core/design/EmptyState';

const ENTRY_PILL = {
  SALE:       { color: 'var(--live)',   bg: 'rgba(var(--live-rgb), 0.1)' },
  CRAFT_SALE: { color: 'var(--live)',   bg: 'rgba(var(--live-rgb), 0.1)' },
  OP_SPLIT:   { color: 'var(--acc)',    bg: 'rgba(var(--acc-rgb), 0.1)' },
  EXPENSE:    { color: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.1)' },
  DEPOSIT:    { color: 'var(--warn)',   bg: 'rgba(var(--warn-rgb), 0.1)' },
};

function LogEntryForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    entry_type: 'SALE', amount_aUEC: '', commodity: '',
    quantity_scu: '', station: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = () => {
    if (!form.amount_aUEC) return;
    onSubmit({ ...form, amount_aUEC: parseInt(form.amount_aUEC), quantity_scu: parseFloat(form.quantity_scu) || 0 });
  };
  return (
    <div className="nexus-card" style={{ padding: 16 }}>
      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>LOG ENTRY</div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TYPE</label>
            <select className="nexus-input" value={form.entry_type} onChange={e => set('entry_type', e.target.value)} style={{ cursor: 'pointer' }}>
              {['SALE','CRAFT_SALE','OP_SPLIT','EXPENSE','DEPOSIT'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>AMOUNT (aUEC)</label>
            <input className="nexus-input" type="number" value={form.amount_aUEC} onChange={e => set('amount_aUEC', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="flex gap-2">
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>COMMODITY</label>
            <input className="nexus-input" value={form.commodity} onChange={e => set('commodity', e.target.value)} placeholder="TARANITE" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>STATION</label>
            <input className="nexus-input" value={form.station} onChange={e => set('station', e.target.value)} placeholder="TDD — New Babbage" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="nexus-btn" style={{ padding: '6px 14px' }}>CANCEL</button>
          <button onClick={handleSubmit} className="nexus-btn primary" style={{ padding: '6px 14px' }}>LOG</button>
        </div>
      </div>
    </div>
  );
}

export default function CofferLedger() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const discordId = outletContext.discordId;
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const data = await base44.entities.CofferLog.list('-logged_at', 100);
    setEntries(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubscribe = base44.entities.CofferLog.subscribe(() => { load(); });
    return () => unsubscribe();
  }, [load]);

  const totalIn = entries.filter(e => ['SALE','CRAFT_SALE','OP_SPLIT','DEPOSIT'].includes(e.entry_type)).reduce((s, e) => s + (e.amount_aUEC || 0), 0);
  const totalOut = entries.filter(e => e.entry_type === 'EXPENSE').reduce((s, e) => s + (e.amount_aUEC || 0), 0);
  const net = totalIn - totalOut;

  const handleLog = async (form) => {
    await base44.entities.CofferLog.create({
      ...form,
      logged_by: discordId || '',
      logged_by_callsign: callsign || 'UNKNOWN',
      logged_at: new Date().toISOString(),
      source_type: 'MANUAL',
    });
    setShowForm(false);
  };

  return (
    <div className="nexus-page-enter flex flex-col h-full overflow-auto p-4 gap-4">
      {/* Stats */}
      <div className="flex gap-3">
        {[
          { label: 'TOTAL IN', value: totalIn, icon: TrendingUp, color: 'var(--live)' },
          { label: 'TOTAL OUT', value: totalOut, icon: TrendingDown, color: 'var(--danger)' },
          { label: 'NET BALANCE', value: net, icon: Coins, color: net >= 0 ? 'var(--live)' : 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="nexus-card" style={{ flex: 1 }}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
            <div className="flex items-center justify-between">
              <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{Math.abs(s.value).toLocaleString()}</div>
              <s.icon size={16} style={{ color: s.color, opacity: 0.6 }} />
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>aUEC</div>
          </div>
        ))}
      </div>

      {/* Log button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="nexus-btn primary" style={{ padding: '6px 14px', fontSize: 11 }}>
          <Plus size={12}/> LOG ENTRY
        </button>
      </div>

      {showForm && <LogEntryForm onSubmit={handleLog} onCancel={() => setShowForm(false)} />}

      {/* Table */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['TYPE','AMOUNT','COMMODITY','STATION','LOGGED BY','DATE','SOURCE'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderBottom: '0.5px solid var(--b0)' }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 14px' }}>
                  {(() => { const p = ENTRY_PILL[e.entry_type] || { color: 'var(--t1)', bg: 'transparent' }; return (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, color: p.color, background: p.bg, letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.entry_type}</span>
                  ); })()}
                </td>
                <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: e.entry_type === 'EXPENSE' ? 'var(--danger)' : 'var(--t0)' }}>
                  {e.entry_type === 'EXPENSE' ? '-' : '+'}{(e.amount_aUEC || 0).toLocaleString()}
                </td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{e.commodity || '—'}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{e.station || '—'}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{e.logged_by_callsign || '—'}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t2)', fontSize: 11 }}>{e.logged_at ? new Date(e.logged_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '8px 14px' }}>
                  <span className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b1)', background: 'transparent', fontSize: 9 }}>{e.source_type || 'MANUAL'}</span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState
                    icon={BookOpen}
                    title="No transactions yet"
                    detail="Coffer entries will appear here after ops are settled."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}