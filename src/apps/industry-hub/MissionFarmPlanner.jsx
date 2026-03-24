/**
 * Mission Farming Planner
 * Given wanted blueprints, generates prioritized mission list ranked by drop chance & overlap.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Target, Search, Star, MapPin, Clock, Coins, Plus, Trash2 } from 'lucide-react';

function MissionCard({ mission, wantedBlueprints, onRemove }) {
  const overlapping = wantedBlueprints.filter(bp =>
    bp.toLowerCase() === (mission.blueprint_name || '').toLowerCase()
  );

  return (
    <div className="nexus-card" style={{ padding: 0, borderLeft: '3px solid var(--acc)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{mission.mission_name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {mission.mission_giver && (
                <span className="nexus-tag" style={{ fontSize: 8 }}>{mission.mission_giver}</span>
              )}
              {mission.mission_type && (
                <span className="nexus-pill nexus-pill-neu" style={{ fontSize: 8 }}>{mission.mission_type}</span>
              )}
              {mission.system && (
                <span style={{ color: 'var(--t3)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={8} /> {mission.system}
                </span>
              )}
              {mission.estimated_time_min > 0 && (
                <span style={{ color: 'var(--t3)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={8} /> ~{mission.estimated_time_min}m
                </span>
              )}
              {mission.reward_auec > 0 && (
                <span style={{ color: 'var(--warn)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Coins size={8} /> {mission.reward_auec.toLocaleString()} aUEC
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: 'var(--live)', fontSize: 16, fontWeight: 700 }}>{mission.drop_chance_pct || '?'}%</div>
            <div style={{ color: 'var(--t3)', fontSize: 8 }}>DROP CHANCE</div>
          </div>
        </div>

        {/* Blueprint drop */}
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={10} style={{ color: 'var(--acc)' }} />
          <span style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 500 }}>{mission.blueprint_name}</span>
          <span className="nexus-pill nexus-pill-neu" style={{ fontSize: 8, marginLeft: 'auto' }}>{mission.blueprint_category || '—'}</span>
        </div>

        {mission.notes && (
          <div style={{ marginTop: 6, color: 'var(--t3)', fontSize: 9 }}>{mission.notes}</div>
        )}
      </div>
    </div>
  );
}

function AddMissionDropForm({ onSaved }) {
  const [form, setForm] = useState({
    mission_name: '', mission_giver: '', mission_type: 'COMBAT',
    blueprint_name: '', blueprint_category: 'WEAPON',
    drop_chance_pct: 100, system: 'STANTON', estimated_time_min: '',
    reward_auec: '', notes: '', patch_version: '4.7',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.mission_name.trim() || !form.blueprint_name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.MissionDrop.create({
        ...form,
        estimated_time_min: parseInt(form.estimated_time_min) || null,
        reward_auec: parseInt(form.reward_auec) || null,
      });
      onSaved?.();
      setForm({ mission_name: '', mission_giver: '', mission_type: 'COMBAT', blueprint_name: '', blueprint_category: 'WEAPON', drop_chance_pct: 100, system: 'STANTON', estimated_time_min: '', reward_auec: '', notes: '', patch_version: '4.7' });
    } finally { setSaving(false); }
  };

  return (
    <div className="nexus-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="nexus-section-header">ADD MISSION DROP</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><span className="nexus-label">MISSION NAME</span><input className="nexus-input" value={form.mission_name} onChange={e => set('mission_name', e.target.value)} placeholder="CitizensForProsperity: Clear Outlaw…" /></div>
        <div><span className="nexus-label">BLUEPRINT DROPPED</span><input className="nexus-input" value={form.blueprint_name} onChange={e => set('blueprint_name', e.target.value)} placeholder="FS-9 Magazine" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div><span className="nexus-label">GIVER</span><input className="nexus-input" value={form.mission_giver} onChange={e => set('mission_giver', e.target.value)} placeholder="Vaughn" /></div>
        <div><span className="nexus-label">DROP %</span><input className="nexus-input" type="number" min="0" max="100" value={form.drop_chance_pct} onChange={e => set('drop_chance_pct', parseFloat(e.target.value) || 0)} /></div>
        <div><span className="nexus-label">SYSTEM</span>
          <select className="nexus-input" value={form.system} onChange={e => set('system', e.target.value)}>
            <option value="STANTON">STANTON</option><option value="PYRO">PYRO</option><option value="NYX">NYX</option>
          </select>
        </div>
        <div><span className="nexus-label">CATEGORY</span>
          <select className="nexus-input" value={form.blueprint_category} onChange={e => set('blueprint_category', e.target.value)}>
            {['WEAPON','ARMOR','GEAR','COMPONENT','CONSUMABLE','FOCUSING_LENS','SHIP_COMPONENT','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !form.mission_name.trim() || !form.blueprint_name.trim()} className="nexus-btn nexus-btn-go" style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 600 }}>
        {saving ? 'SAVING…' : '✓ ADD MISSION DROP'}
      </button>
    </div>
  );
}

export default function MissionFarmPlanner({ blueprints = [] }) {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.MissionDrop.list('-drop_chance_pct', 200);
      setDrops(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const wantedBps = blueprints.filter(b => b.is_priority || !b.owned_by_callsign).map(b => b.item_name);

  // Rank missions by overlap with wanted blueprints & drop chance
  const ranked = useMemo(() => {
    return [...drops]
      .map(d => {
        const isWanted = wantedBps.some(w => w?.toLowerCase() === d.blueprint_name?.toLowerCase());
        const score = (d.drop_chance_pct || 0) * (isWanted ? 2 : 1);
        return { ...d, isWanted, score };
      })
      .filter(d => {
        if (search.trim()) {
          const q = search.toLowerCase();
          return `${d.mission_name} ${d.blueprint_name} ${d.mission_giver || ''}`.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [drops, wantedBps, search]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Target size={16} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>MISSION FARM PLANNER</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>PRIORITIZED MISSIONS FOR BLUEPRINT ACQUISITION</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="nexus-pill nexus-pill-warn">{wantedBps.length} WANTED</span>
          <span className="nexus-pill nexus-pill-neu">{drops.length} MISSIONS MAPPED</span>
          <button onClick={() => setShowForm(!showForm)} className="nexus-btn nexus-btn-go" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} /> ADD DROP
          </button>
        </div>
        <div style={{ position: 'relative', maxWidth: 300 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
          <input className="nexus-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search missions or blueprints…" style={{ paddingLeft: 28, height: 32, fontSize: 10 }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {showForm && <AddMissionDropForm onSaved={() => { load(); setShowForm(false); }} />}
        {ranked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Target size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div style={{ fontSize: 12 }}>No mission drops mapped yet. Add mission drop data to start planning.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ranked.map(m => <MissionCard key={m.id} mission={m} wantedBlueprints={wantedBps} />)}
          </div>
        )}
      </div>
    </div>
  );
}