/**
 * SignatureCalculator — Mining & Salvage signature analysis tool.
 * Accepts RS signature, mineral composition, mass, instability/resistance.
 * Outputs value breakdown, refinery yields, and rock classification.
 *
 * Supports OCR pre-fill via `ocrData` prop from ScanOcrUploader.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Trash2 } from 'lucide-react';
import ScanOcrUploader from './ScanOcrUploader';
import MiningResults from './MiningResults';
import SalvageResults from './SalvageResults';
import {
  ORES, ORE_MAP, SALVAGE_MATERIALS, REFINERY_METHODS,
  getBracket, estimateScu,
} from './signatureData';

const EMPTY_MINERAL = { name: '', pct: '' };

function ModeToggle({ mode, setMode }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 'var(--r-md)', padding: 2 }}>
      {['mining', 'salvage'].map(m => (
        <button key={m} onClick={() => setMode(m)} style={{
          flex: 1, padding: '6px 14px', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
          background: mode === m ? 'var(--bg4)' : 'transparent',
          border: mode === m ? '0.5px solid var(--b2)' : '0.5px solid transparent',
          borderRadius: 'var(--r-sm)', color: mode === m ? 'var(--t0)' : 'var(--t3)',
          fontFamily: "'Barlow Condensed', sans-serif", transition: 'all 150ms',
        }}>{m}</button>
      ))}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

export default function SignatureCalculator() {
  const [mode, setMode] = useState('mining');
  const [signature, setSignature] = useState('');
  const [mass, setMass] = useState('');
  const [instability, setInstability] = useState('');
  const [resistance, setResistance] = useState('');
  const [minerals, setMinerals] = useState([{ ...EMPTY_MINERAL }, { ...EMPTY_MINERAL }]);

  // ── OCR pre-fill handler ───────────────────────────────────────────────────
  const handleOcrData = (data) => {
    if (!data) return;
    if (data.mode) setMode(data.mode);
    if (data.signature) setSignature(String(data.signature));
    if (data.mass) setMass(String(data.mass));
    if (data.instability != null) setInstability(String(data.instability));
    if (data.resistance != null) setResistance(String(data.resistance));
    if (data.minerals && data.minerals.length > 0) {
      const mapped = data.minerals
        .filter(m => m.name && m.pct > 0)
        .map(m => ({
          name: matchOreName(m.name),
          pct: String(m.pct),
        }));
      if (mapped.length > 0) {
        // Pad to at least 2 rows
        while (mapped.length < 2) mapped.push({ ...EMPTY_MINERAL });
        setMinerals(mapped);
      }
    }
  };

  // ── Mineral row management ─────────────────────────────────────────────────
  const addMineral = () => setMinerals(prev => [...prev, { ...EMPTY_MINERAL }]);
  const removeMineral = (i) => setMinerals(prev => prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i));
  const updateMineral = (i, field, val) => {
    setMinerals(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  };

  // ── Calculation ────────────────────────────────────────────────────────────
  const sig = Number(signature) || 0;
  const bracket = sig > 0 ? getBracket(sig, mode) : null;
  const estScu = bracket ? estimateScu(sig, bracket) : 0;

  const miningResult = useMemo(() => {
    if (mode !== 'mining' || sig <= 0) return null;
    const parsedMinerals = minerals
      .filter(m => m.name && Number(m.pct) > 0)
      .map(m => {
        const ore = ORE_MAP[m.name];
        const pct = Number(m.pct) / 100;
        const scu = estScu * pct;
        return {
          name: m.name,
          pct: Number(m.pct),
          scu,
          value: ore ? scu * ore.pricePerScu : 0,
          tier: ore?.tier || '?',
          pricePerScu: ore?.pricePerScu || 0,
        };
      });

    const totalValue = parsedMinerals.reduce((s, m) => s + m.value, 0);
    const refineryYields = REFINERY_METHODS.map(method => ({
      method: method.name,
      yieldPct: method.yieldPct,
      value: totalValue * method.yieldPct,
    }));

    const weightedInstability = parsedMinerals.reduce((s, m) => {
      const ore = ORE_MAP[m.name];
      return s + (ore ? ore.instability * (m.pct / 100) : 0);
    }, 0);
    const weightedResistance = parsedMinerals.reduce((s, m) => {
      const ore = ORE_MAP[m.name];
      return s + (ore ? ore.resistance * (m.pct / 100) : 0);
    }, 0);

    return {
      bracket,
      estScu,
      minerals: parsedMinerals,
      totalValue,
      refineryYields,
      weightedInstability,
      weightedResistance,
      inputInstability: Number(instability) || null,
      inputResistance: Number(resistance) || null,
      mass: Number(mass) || null,
    };
  }, [mode, sig, minerals, estScu, bracket, instability, resistance, mass]);

  const salvageResult = useMemo(() => {
    if (mode !== 'salvage' || sig <= 0) return null;
    return { bracket, estScu, sig };
  }, [mode, sig, bracket, estScu]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', maxWidth: 800, margin: '0 auto', animation: 'pageEntrance 200ms ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Crosshair size={14} style={{ color: 'var(--warn)' }} />
        <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--warn)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          SIGNATURE CALCULATOR
        </span>
      </div>

      {/* Mode toggle */}
      <ModeToggle mode={mode} setMode={setMode} />

      {/* OCR Scanner */}
      <ScanOcrUploader mode={mode} onDataExtracted={handleOcrData} />

      {/* Input form */}
      <div style={{ display: 'grid', gridTemplateColumns: mode === 'mining' ? '1fr 1fr' : '1fr', gap: 12 }}>
        <FieldRow label="RS Signature">
          <input className="nexus-input" type="number" placeholder="e.g. 5400" value={signature} onChange={e => setSignature(e.target.value)} style={{ height: 36 }} />
        </FieldRow>
        {mode === 'mining' && (
          <FieldRow label="Mass (kg)">
            <input className="nexus-input" type="number" placeholder="Optional" value={mass} onChange={e => setMass(e.target.value)} style={{ height: 36 }} />
          </FieldRow>
        )}
      </div>

      {mode === 'mining' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldRow label="Instability %">
              <input className="nexus-input" type="number" min="0" max="100" placeholder="e.g. 45" value={instability} onChange={e => setInstability(e.target.value)} style={{ height: 36 }} />
            </FieldRow>
            <FieldRow label="Resistance %">
              <input className="nexus-input" type="number" min="0" max="100" placeholder="e.g. 30" value={resistance} onChange={e => setResistance(e.target.value)} style={{ height: 36 }} />
            </FieldRow>
          </div>

          {/* Mineral composition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>MINERAL COMPOSITION</span>
              <button onClick={addMineral} className="nexus-btn" style={{ padding: '3px 8px', fontSize: 9 }}>+ ADD</button>
            </div>
            {minerals.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={m.name}
                  onChange={e => updateMineral(i, 'name', e.target.value)}
                  style={{ flex: 2, height: 34, fontSize: 11 }}
                >
                  <option value="">Select mineral…</option>
                  {ORES.map(o => (
                    <option key={o.name} value={o.name}>{o.name} ({o.tier})</option>
                  ))}
                </select>
                <input
                  className="nexus-input"
                  type="number" min="0" max="100" step="0.1"
                  placeholder="%"
                  value={m.pct}
                  onChange={e => updateMineral(i, 'pct', e.target.value)}
                  style={{ flex: 1, height: 34 }}
                />
                <button
                  onClick={() => removeMineral(i)}
                  disabled={minerals.length <= 2}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: minerals.length <= 2 ? 'var(--t3)' : 'var(--danger)', padding: 4 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {miningResult && <MiningResults result={miningResult} />}
      {salvageResult && <SalvageResults result={salvageResult} />}
    </div>
  );
}

// ── Fuzzy ore name matching for OCR ──────────────────────────────────────────
function matchOreName(raw) {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  // Exact match first
  const exact = ORES.find(o => o.name.toLowerCase() === lower);
  if (exact) return exact.name;
  // Partial/fuzzy
  const partial = ORES.find(o => o.name.toLowerCase().includes(lower) || lower.includes(o.name.toLowerCase()));
  if (partial) return partial.name;
  // Levenshtein-ish: starts with same 3+ chars
  const prefix = ORES.find(o => lower.length >= 3 && o.name.toLowerCase().startsWith(lower.slice(0, 3)));
  if (prefix) return prefix.name;
  return raw; // Return raw if no match — user can correct
}