import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

export default function ArmoryCheckoutForm({ items, callsign, discordId, onCheckoutComplete }) {
  const [form, setForm] = useState({
    item_id: '',
    quantity: 1,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedItem = form.item_id ? items.find(i => i.id === form.item_id) : null;
  const availableQuantity = selectedItem ? selectedItem.quantity : 0;
  const canCheckout = selectedItem && form.quantity > 0 && form.quantity <= availableQuantity;

  const handleCheckout = async () => {
    if (!canCheckout) {
      setError('Invalid quantity');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create checkout record
      await base44.entities.ArmoryCheckout.create({
        item_id: form.item_id,
        item_name: selectedItem.item_name,
        checked_out_by: discordId,
        checked_out_by_callsign: callsign,
        quantity: form.quantity,
        checked_out_at: new Date().toISOString(),
        status: 'CHECKED_OUT',
        notes: form.notes,
      });

      // Update item stock
      await base44.entities.ArmoryItem.update(form.item_id, {
        quantity: Math.max(0, selectedItem.quantity - form.quantity),
      });

      // Reset form
      setForm({ item_id: '', quantity: 1, notes: '' });
      onCheckoutComplete?.();
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nexus-card" style={{ padding: 16 }}>
      <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 12 }}>
        QUICK CHECKOUT
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Item Selection */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
            ITEM
          </label>
          <select
            value={form.item_id}
            onChange={e => setForm(f => ({ ...f, item_id: e.target.value, quantity: 1 }))}
            className="nexus-input"
            style={{ width: '100%' }}
          >
            <option value="">Select item...</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.item_name} ({item.quantity} available)
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        {selectedItem && (
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              QUANTITY (max {availableQuantity})
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
              min="1"
              max={availableQuantity}
              className="nexus-input"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Notes */}
        {selectedItem && (
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              NOTES (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="nexus-input"
              style={{ width: '100%', minHeight: 60, resize: 'none' }}
              placeholder="Op name, condition, reason..."
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(224,72,72,0.1)',
              border: '0.5px solid var(--danger)',
              borderRadius: 4,
              color: 'var(--danger)',
              fontSize: 9,
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading || !canCheckout}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: canCheckout && !loading ? 'rgba(39,201,106,0.12)' : 'var(--bg3)',
            border: `0.5px solid ${canCheckout && !loading ? 'var(--live)' : 'var(--b2)'}`,
            borderRadius: 4,
            color: canCheckout && !loading ? 'var(--live)' : 'var(--t2)',
            fontSize: 10,
            letterSpacing: '0.08em',
            cursor: canCheckout && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            fontWeight: 500,
            opacity: canCheckout ? 1 : 0.5,
            transition: 'all 0.12s',
          }}
        >
          {loading ? 'CHECKING OUT...' : '✓ CHECKOUT ITEM'}
        </button>
      </div>
    </div>
  );
}