/**
 * Add Blueprint dialog — Pioneer+ only.
 * No closed-over variables — props only.
 */
import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X } from 'lucide-react';
import { Overlay, DialogCard, DialogHeader } from './BlueprintDialogPrimitives';
import AutocompleteInput from './BlueprintAutocompleteInput';

// ─── Shared style objects ─────────────────────────────────────────────────────

const LABEL = { color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 };

// ─── Add Blueprint dialog (Pioneer+ only) ─────────────────────────────────────

export default function AddBlueprintDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    item_name: '', wiki_item_id: '', category: 'WEAPON',
    tier: 'T1', owned_by_callsign: '', owned_by: null,
  });
  const [recipe, setRecipe]           = useState([{ material_name: '', min_quality: 80, quantity_scu: '' }]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [callsignSuggestions, setCallsignSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Debounce ref for autocomplete
  const debounceRef = useRef(null);

  // Wiki item autocomplete — queries game_cache_items (not external API)
  const loadItemSuggestions = useCallback(async (query) => {
    if (query.length < 3) { setItemSuggestions([]); return; }
    try {
      const results = await base44.entities.game_cache_items.list('-item_name', 100);
      setItemSuggestions(
        (results || [])
          .filter(r => (r.item_name || r.name || '').toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)
          .map(r => ({ label: r.item_name || r.name, id: r.id, item_name: r.item_name || r.name }))
      );
    } catch { setItemSuggestions([]); }
  }, []);

  // Callsign autocomplete — queries NexusUser
  const loadCallsignSuggestions = useCallback(async (query) => {
    if (query.length < 2) { setCallsignSuggestions([]); return; }
    try {
      const results = await base44.entities.NexusUser.list('-joined_at', 100);
      setCallsignSuggestions(
        (results || [])
          .filter(u => (u.callsign || '').toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
          .map(u => ({ label: u.callsign, id: u.discord_id, callsign: u.callsign }))
      );
    } catch { setCallsignSuggestions([]); }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addIngredient = () =>
    setRecipe(r => [...r, { material_name: '', min_quality: 80, quantity_scu: '' }]);

  const removeIngredient = (i) =>
    setRecipe(r => r.filter((_, idx) => idx !== i));

  const updateIngredient = (i, field, value) =>
    setRecipe(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const handleSubmit = async () => {
    if (!form.item_name.trim()) { setError('ITEM NAME REQUIRED'); return; }
    setLoading(true); setError('');
    try {
      const cleanRecipe = recipe
        .filter(r => r.material_name.trim())
        .map(r => ({
          material_name: r.material_name.trim(),
          min_quality:   Number(r.min_quality) || 0,
          quantity_scu:  Number(r.quantity_scu) || 0,
        }));

      await base44.entities.Blueprint.create({
        item_name:          form.item_name.trim(),
        wiki_item_id:       form.wiki_item_id || null,
        category:           form.category,
        tier:               form.tier,
        owned_by_callsign:  form.owned_by_callsign || null,
        owned_by:           form.owned_by || null,
        is_priority:        false,
        recipe_materials:   cleanRecipe,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e?.message || 'CREATE FAILED');
    }
    setLoading(false);
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' };

  return (
    <Overlay onDismiss={onClose}>
      <DialogCard width={500}>
        <DialogHeader title="ADD BLUEPRINT" onClose={onClose} />

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '0.5px solid var(--danger-b)', borderRadius: 5, padding: '7px 10px', color: 'var(--danger)', fontSize: 11, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Item name with wiki autocomplete */}
          <div>
            <label style={LABEL}>ITEM NAME</label>
            <AutocompleteInput
              value={form.item_name}
              placeholder="Search wiki items..."
              suggestions={itemSuggestions}
              onChange={v => {
                set('item_name', v);
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => loadItemSuggestions(v), 250);
              }}
              onSelect={s => { set('item_name', s.item_name); set('wiki_item_id', s.id); setItemSuggestions([]); }}
              style={inputStyle}
            />
          </div>

          {/* Category + tier row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>CATEGORY</label>
              <select
                className="nexus-input"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                style={{ cursor: 'pointer', width: '100%' }}
              >
                {['WEAPON', 'ARMOR', 'GEAR', 'COMPONENT', 'CONSUMABLE'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={LABEL}>TIER</label>
              <select
                className="nexus-input"
                value={form.tier}
                onChange={e => set('tier', e.target.value)}
                style={{ cursor: 'pointer', width: '100%' }}
              >
                <option value="T1">T1</option>
                <option value="T2">T2</option>
              </select>
            </div>
          </div>

          {/* Holder callsign with autocomplete */}
          <div>
            <label style={LABEL}>HOLDER CALLSIGN <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(optional)</span></label>
            <AutocompleteInput
              value={form.owned_by_callsign}
              placeholder="Who holds this blueprint?"
              suggestions={callsignSuggestions}
              onChange={v => {
                set('owned_by_callsign', v);
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => loadCallsignSuggestions(v), 250);
              }}
              onSelect={s => { set('owned_by_callsign', s.callsign); set('owned_by', s.id); setCallsignSuggestions([]); }}
              style={inputStyle}
            />
          </div>

          {/* Recipe materials — dynamic rows */}
          <div>
            <label style={LABEL}>RECIPE MATERIALS</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Column headers */}
              <div style={{ display: 'flex', gap: 6, padding: '0 0 2px' }}>
                <span style={{ flex: 2, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>MATERIAL</span>
                <span style={{ width: 80, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>MIN QUAL%</span>
                <span style={{ width: 80, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>QTY SCU</span>
                <span style={{ width: 24 }} />
              </div>
              {recipe.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className="nexus-input"
                    style={{ flex: 2 }}
                    placeholder="Laranite"
                    value={row.material_name}
                    onChange={e => updateIngredient(i, 'material_name', e.target.value)}
                  />
                  <input
                    className="nexus-input"
                    style={{ width: 80 }}
                    type="number" min="0" max="100" step="1"
                    value={row.min_quality}
                    onChange={e => updateIngredient(i, 'min_quality', e.target.value)}
                  />
                  <input
                    className="nexus-input"
                    style={{ width: 80 }}
                    type="number" min="0" step="0.1"
                    placeholder="SCU"
                    value={row.quantity_scu}
                    onChange={e => updateIngredient(i, 'quantity_scu', e.target.value)}
                  />
                  <button
                    onClick={() => removeIngredient(i)}
                    disabled={recipe.length === 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, width: 24 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addIngredient}
              className="nexus-btn"
              style={{ padding: '3px 9px', fontSize: 9, marginTop: 8 }}
            >
              <Plus size={10} /> ADD INGREDIENT
            </button>
          </div>
        </div>

        {/* Submit row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '9px 0', fontSize: 11 }}>
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="nexus-btn nexus-btn-solid"
            style={{ flex: 2, justifyContent: 'center', padding: '9px 0', fontSize: 11, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'SAVING...' : 'ADD BLUEPRINT →'}
          </button>
        </div>
      </DialogCard>
    </Overlay>
  );
}
