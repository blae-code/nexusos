import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Radio, MapPin, Clock } from 'lucide-react';

const STORAGE_KEY = 'nexus_rescue_calls';

export default function RescueBoard() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const [calls, setCalls] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState({ location: '', system: 'STANTON', situation: '', callsign: '' });
  const [showForm, setShowForm] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        setCalls(JSON.parse(event.newValue || '[]'));
      } catch {
        setCalls([]);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const submit = () => {
    if (!form.location || !form.situation) return;
    setCalls(c => [{
      id: Date.now(),
      ...form,
      callsign: form.callsign || callsign || 'UNKNOWN',
      ts: new Date().toISOString(),
      status: 'OPEN',
    }, ...c]);
    setForm({ location: '', system: 'STANTON', situation: '', callsign: '' });
    setShowForm(false);
  };

  const respond = (id) => setCalls(c => c.map(call => call.id === id ? { ...call, status: 'RESPONDING', responder: callsign || 'UNKNOWN' } : call));
  const resolve = (id) => setCalls(c => c.map(call => call.id === id ? { ...call, status: 'RESOLVED' } : call));

  const STATUS_COLORS = { OPEN: 'var(--danger)', RESPONDING: 'var(--warn)', RESOLVED: 'var(--live)' };

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>RESCUE BOARD</span>
          {calls.filter(c => c.status === 'OPEN').length > 0 && (
            <span className="nexus-tag" style={{ color: 'var(--danger)', borderColor: 'rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.08)' }}>
              {calls.filter(c => c.status === 'OPEN').length} OPEN
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="nexus-btn danger" style={{ padding: '6px 14px', fontSize: 11 }}>
          <Radio size={11}/> SEND DISTRESS
        </button>
      </div>

      {showForm && (
        <div className="nexus-card" style={{ padding: 16, borderColor: 'rgba(224,72,72,0.3)' }}>
          <div style={{ color: 'var(--danger)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 12 }}>DISTRESS CALL</div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CALLSIGN</label>
                <input className="nexus-input" value={form.callsign} onChange={e => set('callsign', e.target.value)} placeholder={callsign || 'YOUR CALLSIGN'} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SYSTEM</label>
                <select className="nexus-input" value={form.system} onChange={e => set('system', e.target.value)} style={{ cursor: 'pointer' }}>
                  {['STANTON','PYRO','NYX'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LOCATION</label>
              <input className="nexus-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Keeger Belt · Sector 9 / Station / Grid" />
            </div>
            <div>
              <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SITUATION</label>
              <input className="nexus-input" value={form.situation} onChange={e => set('situation', e.target.value)} placeholder="Ship destroyed, stranded. Need evac / fuel / escort..." />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="nexus-btn" style={{ padding: '6px 14px' }}>CANCEL</button>
              <button onClick={submit} className="nexus-btn danger" style={{ padding: '6px 14px' }}>BROADCAST →</button>
            </div>
          </div>
        </div>
      )}

      {/* Calls */}
      <div className="flex flex-col gap-3">
        {calls.map(call => (
          <div
            key={call.id}
            className="nexus-card"
            style={{ padding: '12px 14px', borderColor: call.status === 'OPEN' ? 'rgba(224,72,72,0.3)' : call.status === 'RESPONDING' ? 'rgba(232,160,32,0.3)' : 'var(--b1)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{call.callsign}</span>
                  <span className="nexus-tag" style={{ color: STATUS_COLORS[call.status], borderColor: 'transparent', background: 'transparent' }}>{call.status}</span>
                </div>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--t2)', fontSize: 11 }}>
                  <MapPin size={10}/> {call.system} · {call.location}
                </div>
                <div style={{ color: 'var(--t1)', fontSize: 12 }}>{call.situation}</div>
                {call.responder && <div style={{ color: 'var(--warn)', fontSize: 11, marginTop: 4 }}>→ Responding: {call.responder}</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1" style={{ color: 'var(--t2)', fontSize: 10 }}>
                  <Clock size={10}/>
                  {Math.floor((Date.now() - new Date(call.ts)) / 60000)}m ago
                </div>
                {call.status === 'OPEN' && (
                  <button onClick={() => respond(call.id)} className="nexus-btn live-btn" style={{ padding: '4px 10px', fontSize: 10 }}>RESPOND</button>
                )}
                {call.status === 'RESPONDING' && (
                  <button onClick={() => resolve(call.id)} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }}>RESOLVED</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {calls.length === 0 && (
          <div className="flex flex-col items-center" style={{ padding: 60, color: 'var(--t2)', fontSize: 13 }}>
            <AlertTriangle size={28} style={{ marginBottom: 12, opacity: 0.2 }} />
            <span>No active distress calls — verse is quiet</span>
          </div>
        )}
      </div>
    </div>
  );
}
