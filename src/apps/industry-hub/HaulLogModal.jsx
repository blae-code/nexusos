/**
 * HaulLogModal — fast multi-line haul entry for mining and salvage runs.
 * Creates Material records for stockpile tracking.
 * Optionally logs CargoLog sale records when destination + price are provided.
 *
 * Trigger from the persistent LOG HAUL button in IndustryHub header,
 * the Overview quick actions card, or the Materials tab toolbar.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { useSession } from '@/core/data/SessionContext';
import { showToast } from '@/components/NexusToast';
import { qualityScoreFromPercent } from '@/core/data/quality';
import { ORES, SALVAGE_MATERIALS } from '@/apps/scout-intel/signature/signatureData';
import { useSCReferenceOptions } from '@/core/data/useSCReferenceOptions';
import SmartSelect from '@/components/sc/SmartSelect';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Pickaxe } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const MINING_ORES = ORES.filter(o => o.tier !== 'F'); // exclude Inert Material
const CUSTOM_OPTION = '__custom__';

const EMPTY_MINING = { name: '', custom: '', scu: '', quality: 75 };
const EMPTY_SALVAGE = { name: '', custom: '', scu: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualityColor(q) {
  if (q >= 80) return 'var(--live)';
  if (q >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

function qualityLabel(q) {
  if (q >= 80) return 'T2';
  if (q >= 60) return 'STD';
  return 'LOW';
}

const inp = {
  background: 'var(--bg3)',
  border: '0.5px solid var(--b2)',
  borderRadius: 3,
  color: 'var(--t0)',
  fontFamily: 'inherit',
  fontSize: 11,
  padding: '5px 8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const lbl = {
  fontSize: 9,
  color: 'var(--t2)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 4,
};

// ─── Mining line row ──────────────────────────────────────────────────────────

function MiningRow({ line, index, onUpdate, onRemove, canRemove }) {
  const qColor = qualityColor(line.quality);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 80px 1fr 28px',
      gap: 6,
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '0.5px solid var(--b0)',
    }}>
      {/* Ore name */}
      <div>
        {line.name !== CUSTOM_OPTION ? (
          <select
            value={line.name}
            onChange={e => onUpdate(index, 'name', e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            <option value="">Select ore…</option>
            {MINING_ORES.map(o => (
              <option key={o.name} value={o.name}>{o.name} ({o.tier})</option>
            ))}
            <option value={CUSTOM_OPTION}>Other…</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              style={{ ...inp, flex: 1 }}
              value={line.custom}
              onChange={e => onUpdate(index, 'custom', e.target.value)}
              placeholder="Material name"
              autoFocus
            />
            <button
              onClick={() => onUpdate(index, 'name', '')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, flexShrink: 0 }}
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {/* SCU */}
      <input
        style={{ ...inp, textAlign: 'right' }}
        type="number"
        min="0"
        step="0.1"
        placeholder="SCU"
        value={line.scu}
        onChange={e => onUpdate(index, 'scu', e.target.value)}
      />

      {/* Quality */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={line.quality}
          onChange={e => onUpdate(index, 'quality', parseInt(e.target.value))}
          style={{ flex: 1, accentColor: qColor, cursor: 'pointer' }}
        />
        <span style={{
          fontSize: 10,
          color: qColor,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 36,
          textAlign: 'right',
        }}>
          {line.quality}%
        </span>
        <span style={{
          fontSize: 8,
          color: qColor,
          letterSpacing: '0.08em',
          minWidth: 24,
        }}>
          {qualityLabel(line.quality)}
        </span>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        style={{
          background: 'none', border: 'none', cursor: canRemove ? 'pointer' : 'default',
          color: canRemove ? 'var(--danger)' : 'var(--b2)', padding: 4, display: 'flex',
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Salvage line row ─────────────────────────────────────────────────────────

function SalvageRow({ line, index, onUpdate, onRemove, canRemove }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 80px 28px',
      gap: 6,
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '0.5px solid var(--b0)',
    }}>
      {/* Material name */}
      <div>
        {line.name !== CUSTOM_OPTION ? (
          <select
            value={line.name}
            onChange={e => onUpdate(index, 'name', e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            <option value="">Select material…</option>
            {SALVAGE_MATERIALS.map(m => (
              <option key={m.name} value={m.name}>{m.name} — {m.description}</option>
            ))}
            <option value={CUSTOM_OPTION}>Other…</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              style={{ ...inp, flex: 1 }}
              value={line.custom}
              onChange={e => onUpdate(index, 'custom', e.target.value)}
              placeholder="Material name"
              autoFocus
            />
            <button
              onClick={() => onUpdate(index, 'name', '')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, flexShrink: 0 }}
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {/* SCU */}
      <input
        style={{ ...inp, textAlign: 'right' }}
        type="number"
        min="0"
        step="0.1"
        placeholder="SCU"
        value={line.scu}
        onChange={e => onUpdate(index, 'scu', e.target.value)}
      />

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        style={{
          background: 'none', border: 'none', cursor: canRemove ? 'pointer' : 'default',
          color: canRemove ? 'var(--danger)' : 'var(--b2)', padding: 4, display: 'flex',
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Sale section ─────────────────────────────────────────────────────────────

function SaleSection({ lines, destination, setDestination, salePrices, setSalePrices }) {
  const validLines = lines.filter(l => l.name && parseFloat(l.scu) > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={lbl}>DESTINATION TERMINAL</label>
        <input
          style={inp}
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="e.g. ARC-L1, TDD Lorville, Brio's Breaker Yard"
        />
      </div>

      {validLines.length > 0 && (
        <div>
          <label style={{ ...lbl, marginBottom: 6 }}>SALE PRICE PER SCU (aUEC)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {validLines.map((l, i) => {
              const realName = l.name === CUSTOM_OPTION ? l.custom : l.name;
              const scu = parseFloat(l.scu) || 0;
              const price = parseFloat(salePrices[i]) || 0;
              const revenue = scu * price;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {realName || '—'} <span style={{ color: 'var(--t3)' }}>({scu} SCU)</span>
                  </span>
                  <input
                    style={{ ...inp, textAlign: 'right' }}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={salePrices[i] || ''}
                    onChange={e => setSalePrices(prev => ({ ...prev, [i]: e.target.value }))}
                  />
                  <span style={{ fontSize: 10, color: revenue > 0 ? 'var(--live)' : 'var(--t3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {revenue > 0 ? `${revenue.toLocaleString()} aUEC` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function HaulLogModal({ onClose, onRefresh, callsign: propCallsign }) {
  const { user } = useSession();
  const callsign = user?.callsign || propCallsign || 'UNKNOWN';

  const [mode, setMode] = useState('mining');
  const [system, setSystem] = useState('STANTON');
  const [location, setLocation] = useState('');
  const [miningLines, setMiningLines] = useState([{ ...EMPTY_MINING }]);
  const [salvageLines, setSalvageLines] = useState([{ ...EMPTY_SALVAGE }]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [destination, setDestination] = useState('');
  const [salePrices, setSalePrices] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { options: systemOptions } = useSCReferenceOptions('systems', { currentValue: system });

  const lines = mode === 'mining' ? miningLines : salvageLines;
  const setLines = mode === 'mining' ? setMiningLines : setSalvageLines;
  const emptyLine = mode === 'mining' ? { ...EMPTY_MINING } : { ...EMPTY_SALVAGE };

  const addLine = () => setLines(prev => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const validLines = lines.filter(l => {
    const name = l.name === CUSTOM_OPTION ? l.custom?.trim() : l.name;
    return name && parseFloat(l.scu) > 0;
  });
  const totalScu = validLines.reduce((s, l) => s + (parseFloat(l.scu) || 0), 0);
  const canSubmit = validLines.length > 0 && !submitting;
  const hiddenDetailsCount = Math.max(0, lines.length - 1);
  const hasHiddenDetails = hiddenDetailsCount > 0 || location.trim() || showSale || destination.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const locationNote = location.trim()
        ? `${system} — ${location.trim()}`
        : system;

      // Build material records
      const materials = validLines.map(l => {
        const name = l.name === CUSTOM_OPTION ? l.custom.trim() : l.name;
        const qualityPct = mode === 'mining' ? (l.quality ?? 75) : 0;
        return {
          material_name: name,
          material_type: mode === 'salvage' ? 'SALVAGE' : 'RAW',
          quantity_scu: parseFloat(l.scu),
          quality_score: mode === 'mining' ? qualityScoreFromPercent(qualityPct) : 0,
          quality_pct: qualityPct,
          t2_eligible: mode === 'mining' ? qualityPct >= 80 : false,
          source_type: 'MANUAL',
          notes: locationNote,
        };
      });

      await nexusWriteApi.createMaterial({ materials });

      // Optional sale logging
      if (showSale && destination.trim()) {
        const saleWrites = validLines
          .map((l, i) => {
            const name = l.name === CUSTOM_OPTION ? l.custom.trim() : l.name;
            const pricePerScu = parseFloat(salePrices[i]) || 0;
            if (!pricePerScu) return null;
            const scu = parseFloat(l.scu);
            const totalRevenue = Math.round(scu * pricePerScu);
            return base44.entities.CargoLog.create({
              commodity: name,
              transaction_type: 'OFFLOAD',
              quantity_scu: scu,
              sale_price_scu: pricePerScu,
              total_revenue: totalRevenue,
              profit_loss: totalRevenue,
              origin_station: locationNote,
              destination_station: destination.trim(),
              logged_by_callsign: callsign,
              logged_at: now,
              notes: `${mode === 'salvage' ? 'Salvage' : 'Mining'} haul`,
            });
          })
          .filter(Boolean);
        await Promise.all(saleWrites);
      }

      const saleSuffix = showSale && destination.trim() ? ' + sale logged' : '';
      showToast(
        `${validLines.length} material${validLines.length > 1 ? 's' : ''} logged — ${totalScu.toFixed(1)} SCU total${saleSuffix}`,
        'success',
      );
      onRefresh?.();
      onClose();
    } catch {
      showToast('Failed to log haul — check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Backdrop click closes
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="nexus-fade-in"
        style={{
          width: '100%', maxWidth: 680, maxHeight: '92vh',
          background: 'var(--bg1)',
          borderLeft: '2px solid #C0392B',
          borderTop: '0.5px solid rgba(200,170,100,0.12)',
          borderRight: '0.5px solid rgba(200,170,100,0.12)',
          borderBottom: '0.5px solid rgba(200,170,100,0.12)',
          borderRadius: 3,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg2)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pickaxe size={13} style={{ color: 'var(--warn)' }} />
            <span style={{
              fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif",
              fontSize: 10, color: 'var(--warn)', letterSpacing: '0.24em', textTransform: 'uppercase',
            }}>
              LOG HAUL
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 3, padding: 2 }}>
            {['mining', 'salvage'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  background: mode === m ? 'var(--bg4)' : 'transparent',
                  border: mode === m ? '0.5px solid var(--b2)' : '0.5px solid transparent',
                  borderRadius: 2,
                  color: mode === m ? 'var(--t0)' : 'var(--t3)',
                  transition: 'all 120ms',
                }}
              >
                {m === 'mining' ? '⛏ MINING' : '🔧 SALVAGE'}
              </button>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            border: '0.5px solid var(--b1)',
            borderRadius: 3,
            background: 'var(--bg2)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--t1)', fontSize: 10, letterSpacing: '0.08em' }}>
                {showAdvanced
                  ? 'Advanced haul form unlocked'
                  : 'Quick entry keeps this to one line and uses STANTON until expanded'}
              </div>
              {(showAdvanced || hasHiddenDetails) && (
                <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
                  {showAdvanced
                    ? 'Location, multi-line entry, and optional sale logging are open below.'
                    : [
                        hiddenDetailsCount > 0 ? `${hiddenDetailsCount} extra line${hiddenDetailsCount > 1 ? 's' : ''} hidden` : null,
                        location.trim() ? 'location saved' : null,
                        showSale ? 'sale logging enabled' : null,
                      ].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="nexus-btn"
              style={{ padding: '5px 10px', fontSize: 9, whiteSpace: 'nowrap' }}
            >
              {showAdvanced ? 'HIDE DETAILS' : 'EXPAND DETAILS'}
            </button>
          </div>

          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: mode === 'mining' ? '2fr 80px 1fr 28px' : '2fr 80px 28px',
              gap: 6,
              padding: '0 0 4px',
              borderBottom: '0.5px solid var(--b1)',
            }}>
              <span style={{ ...lbl, marginBottom: 0 }}>MATERIAL</span>
              <span style={{ ...lbl, marginBottom: 0, textAlign: 'right' }}>SCU</span>
              {mode === 'mining' && (
                <span style={{ ...lbl, marginBottom: 0 }}>QUALITY</span>
              )}
              <span />
            </div>

            {!showAdvanced && mode === 'mining' && miningLines[0] && (
              <MiningRow
                line={miningLines[0]}
                index={0}
                onUpdate={updateLine}
                onRemove={removeLine}
                canRemove={false}
              />
            )}
            {!showAdvanced && mode === 'salvage' && salvageLines[0] && (
              <SalvageRow
                line={salvageLines[0]}
                index={0}
                onUpdate={updateLine}
                onRemove={removeLine}
                canRemove={false}
              />
            )}

            {showAdvanced && (mode === 'mining'
              ? miningLines.map((line, i) => (
                <MiningRow
                  key={i}
                  line={line}
                  index={i}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  canRemove={miningLines.length > 1}
                />
              ))
              : salvageLines.map((line, i) => (
                <SalvageRow
                  key={i}
                  line={line}
                  index={i}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  canRemove={salvageLines.length > 1}
                />
              ))
            )}

            {showAdvanced ? (
              <button
                onClick={addLine}
                className="nexus-btn"
                style={{ marginTop: 8, padding: '5px 12px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={10} />
                ADD LINE
              </button>
            ) : (
              <div style={{ marginTop: 8, color: 'var(--t3)', fontSize: 9 }}>
                Expand details for multi-line haul entries, route notes, and sale logging.
              </div>
            )}
          </div>

          {showAdvanced && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>SYSTEM</label>
                  <SmartSelect
                    value={system}
                    onChange={setSystem}
                    options={systemOptions}
                    theme="tactical"
                    storageKey="nexus-haul:system"
                  />
                </div>
                <div>
                  <label style={lbl}>{mode === 'mining' ? 'ROCK / BELT / MOON' : 'WRECK / LOCATION'}</label>
                  <input
                    style={inp}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder={mode === 'mining'
                      ? 'e.g. Yela Belt Alpha, Cellin surface...'
                      : 'e.g. Derelict Reclaimer, Magnus II orbit...'}
                  />
                </div>
              </div>

              <div style={{ border: '0.5px solid var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
                <button
                  onClick={() => setShowSale(v => !v)}
                  style={{
                    width: '100%', background: showSale ? 'var(--bg2)' : 'var(--bg1)',
                    border: 'none', borderBottom: showSale ? '0.5px solid var(--b1)' : 'none',
                    color: 'var(--t1)', fontFamily: 'inherit', fontSize: 10,
                    padding: '9px 12px', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {showSale ? <ChevronDown size={11} style={{ color: 'var(--t2)' }} /> : <ChevronRight size={11} style={{ color: 'var(--t2)' }} />}
                  <span style={{ letterSpacing: '0.08em' }}>Also log sale to Coffer</span>
                  <span style={{ fontSize: 9, color: 'var(--t3)', marginLeft: 4 }}>optional — records revenue in Market Analytics</span>
                </button>
                {showSale && (
                  <div style={{ padding: '12px 12px' }}>
                    <SaleSection
                      lines={lines}
                      destination={destination}
                      setDestination={setDestination}
                      salePrices={salePrices}
                      setSalePrices={setSalePrices}
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '12px 18px',
          borderTop: '0.5px solid var(--b1)',
          background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Summary */}
          <div style={{ flex: 1 }}>
            {validLines.length > 0 ? (
              <span style={{ fontSize: 10, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: 'var(--t0)', fontWeight: 600 }}>{validLines.length}</span> line{validLines.length !== 1 ? 's' : ''} ·{' '}
                <span style={{ color: 'var(--acc2)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>
                  {totalScu.toFixed(1)}
                </span>{' '}
                <span style={{ color: 'var(--t3)' }}>SCU total</span>
              </span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--t3)' }}>Add at least one line to continue</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="nexus-btn"
            style={{ padding: '8px 16px', fontSize: 10 }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="nexus-btn primary"
            style={{
              padding: '8px 20px', fontSize: 10,
              opacity: !canSubmit ? 0.4 : 1,
              cursor: !canSubmit ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'LOGGING...' : `LOG HAUL →`}
          </button>
        </div>
      </div>
    </div>
  );
}
