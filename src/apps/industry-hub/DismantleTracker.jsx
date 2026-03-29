/**
 * Dismantling Yield Tracker
 * Track what you dismantle, what you get back, feed into material inventory.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Trash2, Plus, Recycle } from 'lucide-react';

function DismantleForm({ callsign, onSaved }) {
  const [form, setForm] = useState({
    item_name: '', item_category: 'WEAPON', location: '',
    materials: [{ material_name: '', quantity_scu: '', quality_score: '' }],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateMat = (i, field, val) => {
    const next = [...form.materials];
    next[i] = { ...next[i], [field]: val };
    setForm(f => ({ ...f, materials: next }));
  };
  const addMat = () => setForm(f => ({ ...f, materials: [...f.materials, { material_name: '', quantity_scu: '', quality_score: '' }] }));
  const removeMat = (i) => setForm(f => ({ ...f, materials: f.materials.filter((_, j) => j !== i) }));

  const handleSave = async () => {
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      const mats = form.materials.filter(m => m.material_name.trim()).map(m => ({
        material_name: m.material_name.trim(),
        quantity_scu: parseFloat(m.quantity_scu) || 0,
        quality_score: parseInt(m.quality_score) || 0,
      }));
      const totalScu = mats.reduce((s, m) => s + m.quantity_scu, 0);

      await base44.entities.DismantleLog.create({
        item_name: form.item_name.trim(),
        item_category: form.item_category,
        materials_yielded: mats,
        total_scu_recovered: totalScu,
        dismantled_by: callsign,
        dismantled_at: new Date().toISOString(),
        location: form.location.trim() || null,
      });

      // Auto-add recovered materials to inventory
      for (const m of mats) {
        if (m.quantity_scu > 0) {
          await base44.entities.Material.create({
            material_name: m.material_name,
            material_type: 'DISMANTLED_SCRAP',
            quantity_scu: m.quantity_scu,
            quality_score: m.quality_score,
            logged_by_callsign: callsign,
            source_type: 'MANUAL',
            logged_at: new Date().toISOString(),
            notes: `Dismantled from: ${form.item_name}`,
          });
        }
      }

      onSaved?.();
      setForm({ item_name: '', item_category: 'WEAPON', location: '', materials: [{ material_name: '', quantity_scu: '', quality_score: '' }] });
    } finally { setSaving(false); }
  };

  return (
    <div className="nexus-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="nexus-section-header">LOG DISMANTLE</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div><span className="nexus-label">ITEM NAME</span><input className="nexus-input" value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="P4-AR Rifle" /></div>
        <div><span className="nexus-label">CATEGORY</span>
          <select className="nexus-input" value={form.item_category} onChange={e => set('item_category', e.target.value)}>
            {['WEAPON','ARMOR','GEAR','COMPONENT','CONSUMABLE','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><span className="nexus-label">LOCATION</span><input className="nexus-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Area18 Fabricator" /></div>
      </div>

      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginTop: 6 }}>MATERIALS RECOVERED</div>
      {form.materials.map((m, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 32px', gap: 6, alignItems: 'end' }}>
          <div><span className="nexus-label">MATERIAL</span><input className="nexus-input" value={m.material_name} onChange={e => updateMat(i, 'material_name', e.target.value)} placeholder="Iron" /></div>
          <div><span className="nexus-label">SCU</span><input className="nexus-input" type="number" step="0.01" value={m.quantity_scu} onChange={e => updateMat(i, 'quantity_scu', e.target.value)} placeholder="0.03" /></div>
          <div><span className="nexus-label">QUALITY</span><input className="nexus-input" type="number" value={m.quality_score} onChange={e => updateMat(i, 'quality_score', e.target.value)} placeholder="500" /></div>
          <button onClick={() => removeMat(i)} className="nexus-btn nexus-btn-danger" style={{ padding: '4px', height: 40 }} disabled={form.materials.length <= 1}><Trash2 size={10} /></button>
        </div>
      ))}
      <button onClick={addMat} className="nexus-btn" style={{ fontSize: 9, padding: '4px 10px', alignSelf: 'flex-start' }}><Plus size={9} /> ADD MATERIAL</button>
      <button onClick={handleSave} disabled={saving || !form.item_name.trim()} className="nexus-btn nexus-btn-go" style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 600 }}>
        {saving ? 'LOGGING…' : '✓ LOG DISMANTLE'}
      </button>
    </div>
  );
}

export default function DismantleTracker({ callsign }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.DismantleLog.list('-dismantled_at', 100);
      setLogs(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRecovered = logs.reduce((s, l) => s + (l.total_scu_recovered || 0), 0);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Recycle size={16} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>DISMANTLE TRACKER</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>TRACK DISMANTLED ITEMS & RECOVERED MATERIALS</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="nexus-pill nexus-pill-neu">{logs.length} LOGGED</span>
          <span className="nexus-pill nexus-pill-info">{totalRecovered.toFixed(2)} SCU RECOVERED</span>
          <button onClick={() => setShowForm(!showForm)} className="nexus-btn nexus-btn-go" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} /> LOG DISMANTLE
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {showForm && <DismantleForm callsign={callsign} onSaved={() => { load(); setShowForm(false); }} />}
        {logs.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Recycle size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div>No dismantles logged yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(log => (
              <div key={log.id} className="nexus-card" style={{ padding: '10px 14px', borderLeft: '3px solid var(--acc)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{log.item_name}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
                      {log.item_category} · {log.dismantled_by} · {log.dismantled_at ? new Date(log.dismantled_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--live)', fontSize: 14, fontWeight: 700 }}>{(log.total_scu_recovered || 0).toFixed(2)}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 8 }}>SCU RECOVERED</div>
                  </div>
                </div>
                {Array.isArray(log.materials_yielded) && log.materials_yielded.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {log.materials_yielded.map((m, i) => (
                      <span key={i} className="nexus-tag">{m.material_name} {m.quantity_scu}SCU Q{m.quality_score || '?'}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}