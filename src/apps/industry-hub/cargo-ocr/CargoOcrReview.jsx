/**
 * CargoOcrReview — review OCR-extracted trade terminal data before saving to CargoLog.
 * Shows commodity rows with editable prices, quantities, and station info.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { showToast } from '@/components/NexusToast';
import { Check, X, Save, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

function CommodityRow({ item, index, onToggle, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const hasBuy = item.buy_price_scu != null && item.buy_price_scu > 0;
  const hasSell = item.sell_price_scu != null && item.sell_price_scu > 0;
  const margin = hasBuy && hasSell
    ? ((item.sell_price_scu - item.buy_price_scu) / item.buy_price_scu * 100)
    : null;

  return (
    <div style={{
      padding: '8px 12px',
      background: item._excluded ? '#0A0908' : '#0F0F0D',
      opacity: item._excluded ? 0.35 : 1,
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'opacity 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Toggle */}
        <button onClick={() => onToggle(index)} style={{
          width: 16, height: 16, borderRadius: 2, flexShrink: 0,
          background: item._excluded ? '#1A1A16' : 'rgba(200,168,75,0.15)',
          border: `0.5px solid ${item._excluded ? '#5A5850' : '#C8A84B'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!item._excluded && <Check size={10} style={{ color: '#C8A84B' }} />}
        </button>

        {/* Commodity name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
            color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.commodity_name}</div>
          {item.station_name && (
            <div style={{ fontSize: 8, color: '#5A5850' }}>{item.station_name}</div>
          )}
        </div>

        {/* Buy price */}
        {hasBuy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 70 }}>
            <TrendingDown size={9} style={{ color: '#3498DB' }} />
            <span style={{ fontSize: 10, color: '#3498DB', fontFamily: 'monospace' }}>
              {item.buy_price_scu.toLocaleString()}
            </span>
          </div>
        )}

        {/* Sell price */}
        {hasSell && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 70 }}>
            <TrendingUp size={9} style={{ color: '#4A8C5C' }} />
            <span style={{ fontSize: 10, color: '#4A8C5C', fontFamily: 'monospace' }}>
              {item.sell_price_scu.toLocaleString()}
            </span>
          </div>
        )}

        {/* Available SCU */}
        {item.available_scu > 0 && (
          <span style={{ fontSize: 9, color: '#9A9488', fontFamily: 'monospace', minWidth: 50, textAlign: 'right' }}>
            {item.available_scu} SCU
          </span>
        )}

        {/* Margin */}
        {margin != null && (
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 2,
            color: margin > 0 ? '#4A8C5C' : '#C0392B',
            background: margin > 0 ? 'rgba(74,140,92,0.12)' : 'rgba(192,57,43,0.12)',
          }}>{margin > 0 ? '+' : ''}{margin.toFixed(1)}%</span>
        )}

        {/* Edit toggle */}
        <button onClick={() => setEditing(!editing)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: editing ? '#C8A84B' : '#5A5850', padding: 2,
        }}><Edit3 size={10} /></button>

        {/* Remove */}
        <button onClick={() => onRemove(index)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
        }}><Trash2 size={10} /></button>
      </div>

      {/* Inline edit row */}
      {editing && !item._excluded && (
        <div style={{
          display: 'flex', gap: 6, marginTop: 6, paddingLeft: 24,
          animation: 'nexus-fade-in 120ms ease-out both',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#5A5850', marginBottom: 2 }}>BUY $/SCU</div>
            <input type="number" step="0.01" value={item.buy_price_scu || ''}
              onChange={e => onUpdate(index, 'buy_price_scu', parseFloat(e.target.value) || null)}
              style={{ width: '100%', padding: '4px 6px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 10, fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#5A5850', marginBottom: 2 }}>SELL $/SCU</div>
            <input type="number" step="0.01" value={item.sell_price_scu || ''}
              onChange={e => onUpdate(index, 'sell_price_scu', parseFloat(e.target.value) || null)}
              style={{ width: '100%', padding: '4px 6px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 10, fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#5A5850', marginBottom: 2 }}>QTY (SCU)</div>
            <input type="number" step="1" value={item.available_scu || ''}
              onChange={e => onUpdate(index, 'available_scu', parseFloat(e.target.value) || null)}
              style={{ width: '100%', padding: '4px 6px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 10, fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: 1.5 }}>
            <div style={{ fontSize: 8, color: '#5A5850', marginBottom: 2 }}>STATION</div>
            <input value={item.station_name || ''}
              onChange={e => onUpdate(index, 'station_name', e.target.value || null)}
              style={{ width: '100%', padding: '4px 6px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC', fontSize: 10 }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CargoOcrReview({ commodities, detectedStation, onSaved, onCancel }) {
  const { user } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const [items, setItems] = useState(
    commodities.map(c => ({ ...c, _excluded: false }))
  );
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState('cargo'); // 'cargo' or 'prices'

  const toggleItem = (i) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, _excluded: !item._excluded } : item));
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateField = (i, field, value) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const included = items.filter(i => !i._excluded);
  const withBuy = included.filter(i => i.buy_price_scu > 0);
  const withSell = included.filter(i => i.sell_price_scu > 0);

  const handleSaveCargoLogs = async () => {
    if (included.length === 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    const logs = [];

    for (const item of included) {
      const hasBuy = item.buy_price_scu > 0;
      const hasSell = item.sell_price_scu > 0;
      const qty = item.available_scu || 1;
      const totalCost = hasBuy ? Math.round(qty * item.buy_price_scu) : 0;
      const totalRevenue = hasSell ? Math.round(qty * item.sell_price_scu) : 0;
      const profitLoss = totalRevenue - totalCost;
      const marginPct = hasBuy && hasSell ? ((item.sell_price_scu - item.buy_price_scu) / item.buy_price_scu) * 100 : 0;

      logs.push({
        commodity: item.commodity_name,
        transaction_type: hasSell ? 'OFFLOAD' : 'LOAD',
        quantity_scu: qty,
        purchase_price_scu: item.buy_price_scu || 0,
        sale_price_scu: item.sell_price_scu || 0,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        profit_loss: profitLoss,
        margin_pct: Math.round(marginPct * 10) / 10,
        origin_station: hasBuy ? (item.station_name || detectedStation || null) : null,
        destination_station: hasSell ? (item.station_name || detectedStation || null) : null,
        logged_by: user?.id || '',
        logged_by_callsign: callsign,
        notes: `OCR scan · ${item.station_name || detectedStation || 'Unknown terminal'}`,
        logged_at: now,
      });
    }

    try {
      await base44.entities.CargoLog.bulkCreate(logs);
      showToast(`${logs.length} cargo log${logs.length > 1 ? 's' : ''} saved`, 'success');
      onSaved();
    } catch (err) {
      showToast(err?.message || 'Failed to save cargo logs', 'error');
    }
    setSaving(false);
  };

  const handleSavePriceSnapshot = async () => {
    if (included.length === 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    const snapshots = [];

    for (const item of included) {
      snapshots.push({
        commodity_name: item.commodity_name,
        curr_buy_avg: item.buy_price_scu || 0,
        curr_sell_avg: item.sell_price_scu || 0,
        best_buy_station: item.buy_price_scu > 0 ? (item.station_name || detectedStation || null) : null,
        best_buy_price: item.buy_price_scu || 0,
        best_sell_station: item.sell_price_scu > 0 ? (item.station_name || detectedStation || null) : null,
        best_sell_price: item.sell_price_scu || 0,
        margin_pct: item.buy_price_scu > 0 && item.sell_price_scu > 0
          ? Math.round(((item.sell_price_scu - item.buy_price_scu) / item.buy_price_scu) * 1000) / 10
          : 0,
        snapped_at: now,
      });
    }

    try {
      await base44.entities.PriceSnapshot.bulkCreate(snapshots);
      showToast(`${snapshots.length} price snapshot${snapshots.length > 1 ? 's' : ''} saved`, 'success');
      onSaved();
    } catch (err) {
      showToast(err?.message || 'Failed to save price snapshots', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #C8A84B',
      border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
      overflow: 'hidden', animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={12} style={{ color: '#C8A84B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 12, color: '#E8E4DC', letterSpacing: '0.06em',
          }}>REVIEW EXTRACTED PRICES</span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>
            {included.length} of {items.length} selected
          </span>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2 }}>
          <X size={12} />
        </button>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 14px',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        background: '#0A0908',
      }}>
        {detectedStation && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 2,
            color: '#C8A84B', background: 'rgba(200,168,75,0.10)',
            border: '0.5px solid rgba(200,168,75,0.2)',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          }}>{detectedStation}</span>
        )}
        <span style={{ fontSize: 9, color: '#3498DB', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {withBuy.length} BUY
        </span>
        <span style={{ fontSize: 9, color: '#4A8C5C', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {withSell.length} SELL
        </span>
        <span style={{ fontSize: 9, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {included.length} TOTAL
        </span>
      </div>

      {/* Commodity list */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {items.map((item, i) => (
          <CommodityRow key={i} item={item} index={i}
            onToggle={toggleItem} onRemove={removeItem} onUpdate={updateField} />
        ))}
      </div>

      {/* Save mode toggle + actions */}
      <div style={{
        padding: '10px 14px', borderTop: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'cargo', label: 'SAVE AS CARGO LOGS', desc: 'Add to trade history' },
            { id: 'prices', label: 'SAVE AS PRICE SNAPSHOT', desc: 'Update market prices' },
          ].map(m => (
            <button key={m.id} onClick={() => setSaveMode(m.id)} style={{
              flex: 1, padding: '6px 8px', borderRadius: 2, cursor: 'pointer',
              background: saveMode === m.id ? 'rgba(200,168,75,0.10)' : '#141410',
              border: `0.5px solid ${saveMode === m.id ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
              color: saveMode === m.id ? '#C8A84B' : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              textAlign: 'center', letterSpacing: '0.06em',
            }}>
              {m.label}
              <div style={{ fontSize: 7, fontWeight: 400, marginTop: 1, opacity: 0.7 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onCancel} style={{
            padding: '6px 14px', background: 'none',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
          }}>CANCEL</button>
          <button
            onClick={saveMode === 'cargo' ? handleSaveCargoLogs : handleSavePriceSnapshot}
            disabled={included.length === 0 || saving}
            style={{
              padding: '8px 18px', borderRadius: 2,
              background: included.length === 0 || saving ? '#5A5850' : '#C8A84B',
              border: 'none', color: included.length === 0 || saving ? '#9A9488' : '#0A0908',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', cursor: included.length === 0 || saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Save size={11} /> {saving ? 'SAVING...' : `SAVE ${included.length} ${saveMode === 'cargo' ? 'LOGS' : 'PRICES'}`}
          </button>
        </div>
      </div>
    </div>
  );
}