import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Radio, MapPin, Clock } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { T } from '@/lib/tokenMap';
import {
  createRescueCall,
  getActiveRescueCount,
  loadRescueCalls,
  refreshRescueCalls,
  subscribeToRescueCalls,
  updateRescueCall,
} from '@/lib/rescue-board-store';

export default function RescueBoard() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const [calls, setCalls] = useState(() => loadRescueCalls());
  const [form, setForm] = useState({ location: '', system: 'STANTON', situation: '', callsign: '' });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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

  const broadcastRescueAlert = async (payload) => {
    try {
      await base44.functions.invoke('heraldBot', { action: 'rescueAlert', payload });
    } catch (error) {
      console.warn('[RescueBoard] rescue alert broadcast failed:', error?.message || error);
    }
  };

  const submit = async () => {
    if (!form.location || !form.situation) return;
    setSubmitting(true);
    const nextCall = {
      id: `rescue_${Date.now()}`,
      ...form,
      callsign: form.callsign || callsign || 'UNKNOWN',
      ts: new Date().toISOString(),
      status: 'OPEN',
    };
    const nextCalls = await createRescueCall(nextCall);
    setCalls(nextCalls);
    setForm({ location: '', system: 'STANTON', situation: '', callsign: '' });
    setShowForm(false);
    setSubmitting(false);
    await broadcastRescueAlert(nextCall);
  };

  const respond = async (id) => {
    setUpdatingId(id);
    const responder = callsign || 'UNKNOWN';
    const nextCalls = await updateRescueCall(id, { status: 'RESPONDING', responder });
    setCalls(nextCalls);
    setUpdatingId(null);
    const activeCall = nextCalls.find((call) => String(call.id) === String(id));
    await broadcastRescueAlert({
      ...activeCall,
      status: 'RESPONDING',
      responder,
    });
  };

  const resolve = async (id) => {
    setUpdatingId(id);
    const nextCalls = await updateRescueCall(id, { status: 'RESOLVED' });
    setCalls(nextCalls);
    setUpdatingId(null);
    const resolvedCall = nextCalls.find((call) => String(call.id) === String(id));
    await broadcastRescueAlert({
      ...resolvedCall,
      status: 'RESOLVED',
    });
  };

  const STATUS_COLORS = { OPEN: 'var(--danger)', RESPONDING: 'var(--warn)', RESOLVED: 'var(--live)' };
  const openCount = getActiveRescueCount(calls);

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>RESCUE BOARD</span>
          {openCount > 0 && (
            <span className="nexus-tag" style={{ color: 'var(--danger)', borderColor: 'rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.08)' }}>
              {openCount} ACTIVE
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
              <button onClick={() => setShowForm(false)} className="nexus-btn" style={{ padding: '6px 14px' }} disabled={submitting}>CANCEL</button>
              <button onClick={submit} className="nexus-btn danger" style={{ padding: '6px 14px' }} disabled={submitting}>
                {submitting ? 'BROADCASTING...' : 'BROADCAST →'}
              </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 12 }}>
            <NexusToken src={T('hospital-grey')} size={40} opacity={0.25} alt="No active calls" />
            <span style={{ color: 'var(--t2)', fontSize: 13 }}>No active distress calls</span>
            <span style={{ color: 'var(--t3)', fontSize: 11 }}>Verse is quiet — use SEND DISTRESS if you need assistance</span>
          </div>
        )}
      </div>
    </div>
  );
}
