/**
 * Blueprint Wishlist / Priority Board
 * Members flag blueprints they want; leadership sees aggregated demand.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Heart, Plus, Check, TrendingUp, X } from 'lucide-react';

const PRIORITY_COLORS = {
  CRITICAL: 'var(--danger)', HIGH: 'var(--warn)', NORMAL: 'var(--t1)', LOW: 'var(--t3)',
};

export default function BlueprintWishlistPanel({ blueprints = [], callsign, rank }) {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ blueprint_name: '', priority: 'NORMAL', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.BlueprintWishlist.list('-created_date', 200);
      setWishes(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate demand
  const demand = useMemo(() => {
    const map = {};
    wishes.filter(w => !w.fulfilled).forEach(w => {
      const key = (w.blueprint_name || '').toLowerCase();
      if (!map[key]) map[key] = { name: w.blueprint_name, count: 0, requesters: [], highestPriority: 'LOW' };
      map[key].count++;
      map[key].requesters.push(w.requested_by_callsign);
      const order = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      if ((order[w.priority] || 0) > (order[map[key].highestPriority] || 0)) {
        map[key].highestPriority = w.priority;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [wishes]);

  const handleAdd = async () => {
    if (!form.blueprint_name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.BlueprintWishlist.create({
        blueprint_name: form.blueprint_name.trim(),
        requested_by_callsign: callsign,
        priority: form.priority,
        reason: form.reason.trim() || null,
      });
      setForm({ blueprint_name: '', priority: 'NORMAL', reason: '' });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const handleFulfill = async (name) => {
    const matching = wishes.filter(w => !w.fulfilled && w.blueprint_name?.toLowerCase() === name.toLowerCase());
    for (const w of matching) {
      await base44.entities.BlueprintWishlist.update(w.id, { fulfilled: true, fulfilled_at: new Date().toISOString() });
    }
    load();
  };

  const bpNames = blueprints.map(b => b.item_name).filter(Boolean).sort();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={16} style={{ color: 'var(--danger)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>BLUEPRINT WISHLIST</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>MEMBER REQUESTS · LEADERSHIP SEES AGGREGATED DEMAND</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="nexus-pill nexus-pill-warn">{demand.length} UNIQUE WANTED</span>
          <button onClick={() => setShowForm(!showForm)} className="nexus-btn nexus-btn-go" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} /> REQUEST
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {showForm && (
          <div className="nexus-card" style={{ padding: '14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="nexus-section-header">REQUEST A BLUEPRINT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
              <div>
                <span className="nexus-label">BLUEPRINT</span>
                <input className="nexus-input" list="bp-wishlist-names" value={form.blueprint_name} onChange={e => setForm(f => ({ ...f, blueprint_name: e.target.value }))} placeholder="Start typing…" />
                <datalist id="bp-wishlist-names">{bpNames.map(n => <option key={n} value={n} />)}</datalist>
              </div>
              <div>
                <span className="nexus-label">PRIORITY</span>
                <select className="nexus-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {['LOW','NORMAL','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div><span className="nexus-label">REASON (OPTIONAL)</span><input className="nexus-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why do you need this?" /></div>
            <button onClick={handleAdd} disabled={saving || !form.blueprint_name.trim()} className="nexus-btn nexus-btn-go" style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 600 }}>
              {saving ? 'SAVING…' : '✓ SUBMIT REQUEST'}
            </button>
          </div>
        )}

        {demand.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Heart size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div>No active wishlist requests.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {demand.map(d => {
              const pColor = PRIORITY_COLORS[d.highestPriority] || 'var(--t2)';
              const isPioneer = ['PIONEER', 'FOUNDER'].includes(rank);
              return (
                <div key={d.name} className="nexus-card" style={{ padding: '10px 14px', borderLeft: `3px solid ${pColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={12} style={{ color: pColor }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
                        Requested by: {d.requesters.join(', ')}
                      </div>
                    </div>
                    <span className="nexus-pill" style={{ color: pColor, borderColor: `${pColor}40`, background: `${pColor}12`, fontSize: 8 }}>{d.highestPriority}</span>
                    <div style={{ textAlign: 'center', padding: '4px 10px', background: 'var(--bg2)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ color: 'var(--acc)', fontSize: 16, fontWeight: 700 }}>{d.count}</div>
                      <div style={{ color: 'var(--t3)', fontSize: 7 }}>REQUESTS</div>
                    </div>
                    {isPioneer && (
                      <button onClick={() => handleFulfill(d.name)} className="nexus-btn nexus-btn-go nexus-tooltip" data-tooltip="Mark as acquired by org" style={{ padding: '4px 8px', fontSize: 9 }}>
                        <Check size={10} /> FULFILL
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}