/**
 * OcrResultPanel — Displays AI extraction results with financial impact,
 * inventory changes, wallet updates, and review/confirm capability.
 */
import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, RotateCcw, TrendingUp, TrendingDown, Wallet, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';

const TYPE_META = {
  INVENTORY: { label: 'INVENTORY', color: '#7AAECC', dest: 'Materials Ledger', icon: '📦' },
  MINING_SCAN: { label: 'MINING SCAN', color: '#4A8C5C', dest: 'Scout Intel', icon: '⛏' },
  REFINERY_ORDER: { label: 'REFINERY ORDER', color: '#C8A84B', dest: 'Refinery Tracker', icon: '🔥' },
  TRANSACTION: { label: 'TRANSACTION', color: '#D89B50', dest: 'Coffer + Inventory + Wallet', icon: '💰' },
  WALLET: { label: 'WALLET SYNC', color: '#2edb7a', dest: 'Wallet Balance', icon: '💳' },
  CRAFT_QUEUE: { label: 'CRAFT QUEUE', color: '#9B59B6', dest: 'Craft Queue', icon: '🔧' },
  SHIP_STATUS: { label: 'SHIP STATUS', color: '#C0392B', dest: 'Fleet Hub', icon: '🚀' },
  CARGO_MANIFEST: { label: 'CARGO MANIFEST', color: '#7AAECC', dest: 'Materials Ledger', icon: '📦' },
};

function fmtAuec(n) {
  if (n == null || isNaN(n)) return '0';
  const abs = Math.abs(Math.round(n));
  if (abs >= 1000000) return `${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K`;
  return abs.toLocaleString();
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#2edb7a' : pct >= 50 ? '#C8A84B' : '#C0392B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: '#1C1916', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease-out' }} />
      </div>
      <span style={{ color, fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function ExtractedItemCard({ item, index }) {
  const entries = Object.entries(item).filter(([k, v]) => !k.startsWith('_') && v != null);
  return (
    <div style={{
      background: '#0E0D0B', border: '0.5px solid rgba(200,170,100,0.08)',
      borderRadius: 3, padding: '10px 12px',
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#3A3830', letterSpacing: '0.12em', marginBottom: 6 }}>ITEM {index + 1}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ minWidth: 80 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#4A4640', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {key.replace(/_/g, ' ')}
            </span>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE', fontWeight: 500 }}>
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Side-effect cards ──────────────────────────────────────────────── */

function WalletUpdateCard({ effect }) {
  const isPositive = effect.delta > 0;
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 3,
      background: isPositive ? 'rgba(46,219,122,0.04)' : 'rgba(192,57,43,0.04)',
      border: `0.5px solid ${isPositive ? 'rgba(46,219,122,0.15)' : 'rgba(192,57,43,0.15)'}`,
      borderLeft: `3px solid ${isPositive ? '#2edb7a' : '#C0392B'}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Wallet size={18} style={{ color: isPositive ? '#2edb7a' : '#C0392B', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.10em', marginBottom: 3 }}>
          {effect.type === 'WALLET_SYNCED' ? 'WALLET SYNCED' : 'WALLET UPDATED'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#EAE6DE', fontVariantNumeric: 'tabular-nums' }}>
            {fmtAuec(effect.new_balance)} aUEC
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 2,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
            color: isPositive ? '#2edb7a' : '#C0392B',
          }}>
            <DeltaIcon size={12} />
            {isPositive ? '+' : ''}{fmtAuec(effect.delta)}
          </span>
        </div>
        {effect.previous != null && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#3A3830', marginTop: 2 }}>
            Previous: {fmtAuec(effect.previous)} aUEC
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryChangeCard({ effect }) {
  const changes = effect.changes || [];
  if (changes.length === 0) return null;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 3,
      background: 'rgba(122,174,204,0.04)',
      border: '0.5px solid rgba(122,174,204,0.12)',
      borderLeft: '3px solid #7AAECC',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Package size={13} style={{ color: '#7AAECC' }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#7AAECC', letterSpacing: '0.10em', fontWeight: 600 }}>
          INVENTORY ADJUSTED
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {changes.map((c, i) => {
          const isSold = c.action === 'SOLD';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', borderRadius: 2,
              background: isSold ? 'rgba(192,57,43,0.04)' : 'rgba(46,219,122,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isSold ? <TrendingDown size={10} style={{ color: '#C0392B' }} /> : <TrendingUp size={10} style={{ color: '#2edb7a' }} />}
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE' }}>
                  {c.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: isSold ? '#C0392B' : '#2edb7a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {isSold ? '-' : '+'}{c.quantity} SCU
                </span>
                {c.aUEC > 0 && (
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850' }}>
                    {fmtAuec(c.aUEC)} aUEC
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryUpdatedCard({ effect }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 3,
      background: 'rgba(122,174,204,0.04)',
      border: '0.5px solid rgba(122,174,204,0.12)',
      borderLeft: '3px solid #7AAECC',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Package size={14} style={{ color: '#7AAECC' }} />
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE' }}>
        <strong>{effect.count}</strong> material record{effect.count !== 1 ? 's' : ''} logged to stockpile
      </span>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

export default function OcrResultPanel({ result, previewUrl, callsign, onReset, onAnother }) {
  const meta = TYPE_META[result.screenshot_type] || { label: 'UNKNOWN', color: '#5A5850', dest: '—', icon: '❓' };
  const items = result.pending_confirmation
    ? (Array.isArray(result.pending_confirmation) ? result.pending_confirmation : [result.pending_confirmation])
    : [];
  const autoCreated = result.records_created || result.created_records?.length || 0;
  const needsConfirm = ['MINING_SCAN', 'CRAFT_QUEUE', 'SHIP_STATUS'].includes(result.screenshot_type);
  const sideEffects = result.side_effects || [];

  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const walletEffect = sideEffects.find(e => e.type === 'WALLET_UPDATED' || e.type === 'WALLET_SYNCED');
  const inventoryAdjustEffect = sideEffects.find(e => e.type === 'INVENTORY_ADJUSTED');
  const inventoryUpdatedEffect = sideEffects.find(e => e.type === 'INVENTORY_UPDATED');

  const handleConfirmMiningScan = async () => {
    if (result.screenshot_type !== 'MINING_SCAN' || !items[0]) return;
    setConfirming(true);
    const d = items[0];
    await base44.entities.ScoutDeposit.create({
      material_name: d.material_name || 'Unknown',
      system_name: d.system_name || '',
      location_detail: d.location_detail || '',
      quality_score: d.quality_pct ? Math.round(d.quality_pct * 10) : 0,
      volume_estimate: d.volume_estimate || 'MEDIUM',
      risk_level: d.risk_level || 'MEDIUM',
      reported_by: callsign,
      reported_by_callsign: callsign,
      reported_at: new Date().toISOString(),
    });
    setConfirmed(true);
    setConfirming(false);
    showToast('Scout deposit logged', 'success');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      animation: 'nexus-fade-in 200ms ease-out both',
    }}>
      {/* Preview + type badge */}
      <div style={{ position: 'relative' }}>
        {previewUrl && (
          <img src={previewUrl} alt="preview" style={{
            width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 3, opacity: 0.35,
          }} />
        )}
        <div style={{
          position: previewUrl ? 'absolute' : 'relative',
          bottom: previewUrl ? 12 : 0, left: previewUrl ? 12 : 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            padding: '6px 12px', borderRadius: 2,
            background: `${meta.color}15`, border: `0.5px solid ${meta.color}44`,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 11, color: meta.color, letterSpacing: '0.10em',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{meta.icon}</span> {meta.label}
          </div>
          {result.confidence != null && (
            <div style={{ width: 100 }}>
              <ConfidenceBar value={result.confidence} />
            </div>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 3,
        background: needsConfirm && !confirmed ? 'rgba(200,168,75,0.04)' : 'rgba(46,219,122,0.04)',
        border: `0.5px solid ${needsConfirm && !confirmed ? 'rgba(200,168,75,0.15)' : 'rgba(46,219,122,0.15)'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {needsConfirm && !confirmed ? (
          <AlertTriangle size={16} style={{ color: '#C8A84B', flexShrink: 0 }} />
        ) : (
          <CheckCircle size={16} style={{ color: '#2edb7a', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#EAE6DE', fontWeight: 600 }}>
            {confirmed ? 'DATA CONFIRMED & LOGGED' :
             needsConfirm ? 'REVIEW EXTRACTED DATA' :
             `${autoCreated} RECORD${autoCreated !== 1 ? 'S' : ''} AUTO-LOGGED`}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
            {confirmed ? `Routed to ${meta.dest}` :
             needsConfirm ? `Confirm before routing to ${meta.dest}` :
             `Routed to ${meta.dest}`}
          </div>
        </div>
      </div>

      {/* Side-effect cards — wallet + inventory impact */}
      {walletEffect && <WalletUpdateCard effect={walletEffect} />}
      {inventoryAdjustEffect && <InventoryChangeCard effect={inventoryAdjustEffect} />}
      {inventoryUpdatedEffect && <InventoryUpdatedCard effect={inventoryUpdatedEffect} />}

      {/* Extracted items */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#3A3830', letterSpacing: '0.14em' }}>EXTRACTED DATA</div>
          {items.map((item, i) => <ExtractedItemCard key={i} item={item} index={i} />)}
        </div>
      )}

      {/* AI notes */}
      {result.notes && (
        <div style={{
          padding: '8px 12px', borderRadius: 3,
          background: '#0E0D0B', border: '0.5px solid rgba(200,170,100,0.06)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', lineHeight: 1.5,
        }}>
          <span style={{ color: '#4A4640', fontSize: 8, letterSpacing: '0.10em' }}>AI NOTES: </span>
          {result.notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onAnother} className="nexus-btn" style={{ padding: '8px 16px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <RotateCcw size={10} /> UPLOAD ANOTHER
        </button>
        {needsConfirm && !confirmed && result.screenshot_type === 'MINING_SCAN' && (
          <button onClick={handleConfirmMiningScan} disabled={confirming}
            className="nexus-btn nexus-btn-go"
            style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ArrowRight size={12} /> {confirming ? 'LOGGING…' : 'CONFIRM & LOG DEPOSIT'}
          </button>
        )}
        {needsConfirm && !confirmed && result.screenshot_type !== 'MINING_SCAN' && (
          <button onClick={() => { setConfirmed(true); showToast('Data acknowledged', 'info'); }}
            className="nexus-btn nexus-btn-go"
            style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 600, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={12} /> ACKNOWLEDGE
          </button>
        )}
      </div>
    </div>
  );
}