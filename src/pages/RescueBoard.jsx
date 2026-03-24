import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Radio, MapPin, Clock } from 'lucide-react';
import {
  createRescueCall,
  getActiveRescueCount,
  loadRescueCalls,
  refreshRescueCalls,
  subscribeToRescueCalls,
  updateRescueCall,
} from '@/core/data/rescue-board-store';

export default function RescueBoard() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const [calls, setCalls] = useState(() => loadRescueCalls());
  const sessionCallsign = callsign || 'UNKNOWN';
  const [form, setForm] = useState({ location: '', system: 'STANTON', situation: '', callsign: sessionCallsign });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm((current) => ({ ...current, callsign: sessionCallsign }));
  }, [sessionCallsign]);

  useEffect(() => {
    let active = true;
    refreshRescueCalls().then((nextCalls) => {
      if (active) {
        setCalls(nextCalls);
      }
    });

    const unsubscribe = subscribeToRescueCalls(setCalls);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const submit = async () => {
    if (!form.location || !form.situation) return;
    setSubmitting(true);
    const nextCall = {
      id: `rescue_${Date.now()}`,
      ...form,
      callsign: sessionCallsign,
      ts: new Date().toISOString(),
      status: 'OPEN',
    };
    const nextCalls = await createRescueCall(nextCall);
    setCalls(nextCalls);
    setForm({ location: '', system: 'STANTON', situation: '', callsign: sessionCallsign });
    setShowForm(false);
    setSubmitting(false);
  };

  const respond = async (id) => {
    setUpdatingId(id);
    const responder = callsign || 'UNKNOWN';
    const nextCalls = await updateRescueCall(id, { status: 'RESPONDING', responder });
    setCalls(nextCalls);
    setUpdatingId(null);
  };

  const resolve = async (id) => {
    setUpdatingId(id);
    const nextCalls = await updateRescueCall(id, { status: 'RESOLVED' });
    setCalls(nextCalls);
    setUpdatingId(null);
  };

  const STATUS_COLORS = { OPEN: '#C0392B', RESPONDING: '#C8A84B', RESOLVED: '#4A8C5C' };
  const BORDER_COLORS = { OPEN: '#C0392B', RESPONDING: '#C8A84B', RESOLVED: '#5A5850' };
  const openCount = getActiveRescueCount(calls);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 16, gap: 16, animation: 'opsPageEntrance 200ms ease-out' }}>
      <style>{`@keyframes opsPageEntrance { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: '#C0392B' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RESCUE BOARD</span>
          {openCount > 0 && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, color: '#C0392B', background: 'rgba(192,57,43,0.18)', border: '0.5px solid #C0392B', borderRadius: 2, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{openCount} ACTIVE</span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#C0392B', border: 'none', borderRadius: 2, cursor: 'pointer', color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, padding: '8px 14px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 150ms' }} onMouseEnter={e => { e.currentTarget.style.background = '#9B2D20'; }} onMouseLeave={e => { e.currentTarget.style.background = '#C0392B'; }}>
          <Radio size={11}/> SEND DISTRESS
        </button>
      </div>

      {showForm && (
        <div className="nexus-card" style={{ padding: 16, borderColor: 'rgba(var(--danger-rgb), 0.3)' }}>
          <div style={{ color: 'var(--danger)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 12 }}>DISTRESS CALL</div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CALLSIGN</label>
                <input className="nexus-input" value={form.callsign} readOnly />
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
              <button onClick={() => setShowForm(false)} className="nexus-btn" style={{ padding: '6px 14px' }} disabled={submitting}>CANCEL</button>
              <button onClick={submit} className="nexus-btn danger" style={{ padding: '6px 14px' }} disabled={submitting}>
                {submitting ? 'BROADCASTING...' : 'BROADCAST →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {calls.map(call => (
          <div
            key={call.id}
            style={{
              background: call.status === 'OPEN' ? 'rgba(192,57,43,0.06)' : '#0F0F0D',
              borderLeft: `2px solid ${BORDER_COLORS[call.status] || '#5A5850'}`,
              borderTop: '0.5px solid rgba(200,170,100,0.10)',
              borderRight: '0.5px solid rgba(200,170,100,0.10)',
              borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, padding: '12px 14px',
            }}
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
                  {Math.floor((Date.now() - new Date(call.ts).getTime()) / 60000)}m ago
                </div>
                {call.status === 'OPEN' && (
                  <button onClick={() => respond(call.id)} className="nexus-btn live-btn" style={{ padding: '4px 10px', fontSize: 10 }} disabled={updatingId === call.id}>
                    {updatingId === call.id ? 'UPDATING...' : 'RESPOND'}
                  </button>
                )}
                {call.status === 'RESPONDING' && (
                  <button onClick={() => resolve(call.id)} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }} disabled={updatingId === call.id}>
                    {updatingId === call.id ? 'UPDATING...' : 'RESOLVED'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {calls.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12 }}>
            <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em', textAlign: 'center' }}>
              NO ACTIVE RESCUE REQUESTS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
