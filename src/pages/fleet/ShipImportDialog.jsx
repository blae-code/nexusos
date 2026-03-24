/**
 * ShipImportDialog — Import ships from HangarXPLOR, FleetYards, or StarCitizen Hangar Helper JSON exports.
 *
 * Supported formats:
 *   - HangarXPLOR: [{ name, ship_code, manufacturer_name, manufacturer_code, entity_type, pledge_name, pledge_cost, lti, warbond }]
 *   - FleetYards:  [{ name, slug, manufacturer: { name, code }, ... }] or [{ name, shipCode, manufacturerCode }]
 *   - SC Hangar Helper: [{ name, manufacturer, type, ... }] (generic JSON arrays with ship data)
 *   - Plain list: [{ name, model, manufacturer, class }] (NexusOS native format)
 */
import React, { useCallback, useState, useRef } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Upload, X, FileJson, AlertTriangle, Check, Ship } from 'lucide-react';
import { showToast } from '@/components/NexusToast';

/* ─── Class inference from ship name/model ─── */
const CLASS_KEYWORDS = {
  MINER:          ['prospector', 'mole', 'orion', 'roc', 'mining'],
  HAULER:         ['hull', 'caterpillar', 'hercules', 'starfarer', 'freelancer max', 'raft', 'liberator', 'cargo', 'hauler', 'c2', 'merchantman'],
  SALVAGER:       ['reclaimer', 'vulture', 'salvage'],
  MEDICAL:        ['apollo', 'cutlass red', 'endeavor hope', 'medical'],
  EXPLORER:       ['carrack', '600i', '315p', 'terrapin', 'freelancer dur', 'explorer', 'pathfinder', 'expedition'],
  HEAVY_FIGHTER:  ['vanguard', 'retaliator', 'redeemer', 'hurricane', 'scorpius', 'ares', 'eclipse', 'bomber', 'heavy fighter', 'gunship'],
  FIGHTER:        ['gladius', 'arrow', 'sabre', 'hornet', 'buccaneer', 'talon', 'blade', 'glaive', 'scythe', 'defender', 'lightning', 'mustang', 'aurora', 'titan', 'fighter'],
  GROUND_VEHICLE: ['ursa', 'cyclone', 'nova', 'ballista', 'spartan', 'ptv', 'ranger', 'tumbril', 'greycat', 'ground', 'vehicle', 'buggy', 'centurion'],
};

function inferClass(name) {
  const lower = (name || '').toLowerCase();
  for (const [cls, keywords] of Object.entries(CLASS_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cls;
  }
  return 'OTHER';
}

/* ─── Manufacturer code → full name ─── */
const MFR_MAP = {
  AEGI: 'Aegis Dynamics', ANVL: 'Anvil Aerospace', AOPO: 'Aopoa', XNAA: 'Aopoa',
  ARGO: 'Argo Astronautics', BANU: 'Banu', CNOU: 'Consolidated Outland',
  CRUS: 'Crusader Industries', DRAK: 'Drake Interplanetary', ESPR: 'Esperia',
  GRIN: 'Greycat Industrial', KRIG: 'Kruger Intergalactic', KRIN: 'Kruger Intergalactic',
  MISC: 'MISC', ORIG: 'Origin Jumpworks', RSI: 'Roberts Space Industries',
  TUMB: 'Tumbril Land Systems', VNCL: 'Vanduul', XIAN: "Xi'an",
  GATC: 'Gatac Manufacture',
};

function resolveManufacturer(raw) {
  if (!raw) return '';
  const upper = raw.toUpperCase().trim();
  if (MFR_MAP[upper]) return MFR_MAP[upper];
  return raw.trim();
}

/* ─── Parse a single ship entry from any supported format ─── */
function parseShipEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  // Skip non-ship entries (HangarXPLOR can include upgrades, flair, etc.)
  const entityType = entry.entity_type || entry.entityType || 'ship';
  if (entityType !== 'ship') return null;

  // Determine the display name / model
  const model = entry.name || entry.ship_name || entry.model || entry.slug || '';
  if (!model.trim()) return null;

  // Manufacturer — try different source formats
  let manufacturer = '';
  if (entry.manufacturer_name) {
    manufacturer = entry.manufacturer_name;
  } else if (entry.manufacturer && typeof entry.manufacturer === 'object') {
    manufacturer = entry.manufacturer.name || '';
  } else if (entry.manufacturer_code || entry.manufacturerCode) {
    manufacturer = resolveManufacturer(entry.manufacturer_code || entry.manufacturerCode);
  } else if (entry.manufacturer && typeof entry.manufacturer === 'string') {
    manufacturer = entry.manufacturer;
  }

  // Ship name — use the custom name if present, otherwise generate from model
  const shipName = entry.ship_name || entry.nickname || entry.customName || model;

  // Pledge metadata
  const pledgeName = entry.pledge_name || entry.pledgeName || '';
  const pledgeCost = entry.pledge_cost || entry.pledgeCost || '';
  const lti = entry.lti === true;
  const warbond = entry.warbond === true;
  const shipCode = entry.ship_code || entry.shipCode || entry.localName || '';

  // Build notes from pledge info
  const noteParts = [];
  if (pledgeName) noteParts.push(`Pledge: ${pledgeName}`);
  if (pledgeCost) noteParts.push(`Cost: ${pledgeCost}`);
  if (lti) noteParts.push('LTI');
  if (warbond) noteParts.push('Warbond');
  if (shipCode) noteParts.push(`Code: ${shipCode}`);

  return {
    name: shipName.trim(),
    model: model.trim(),
    manufacturer: manufacturer.trim(),
    class: inferClass(model),
    status: 'AVAILABLE',
    cargo_scu: entry.cargo_scu || entry.cargo || 0,
    crew_size: entry.crew_size || entry.crew || entry.min_crew || 1,
    notes: noteParts.length > 0 ? noteParts.join(' · ') : null,
  };
}

/* ─── Parse an entire imported file ─── */
function parseImportData(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: 'Invalid JSON — could not parse the file.', ships: [] };
  }

  // Handle both array and object-wrapped formats
  let entries = [];
  if (Array.isArray(data)) {
    entries = data;
  } else if (data && typeof data === 'object') {
    // FleetYards sometimes wraps in { ships: [...] } or { data: [...] }
    const candidates = ['ships', 'data', 'vehicles', 'hangar', 'items', 'fleet'];
    for (const key of candidates) {
      if (Array.isArray(data[key])) {
        entries = data[key];
        break;
      }
    }
    if (entries.length === 0) {
      // Try treating the object values as array
      const vals = Object.values(data);
      if (vals.length > 0 && vals.every(v => v && typeof v === 'object')) {
        entries = vals;
      }
    }
  }

  if (entries.length === 0) {
    return { error: 'No ship data found in this file. Expected a JSON array of ships.', ships: [] };
  }

  const ships = entries.map(parseShipEntry).filter(Boolean);
  const skipped = entries.length - ships.length;

  return {
    error: null,
    ships,
    skipped,
    total: entries.length,
  };
}

/* ─── Ship preview row ─── */
function PreviewRow({ ship, index, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(index)}
      style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 120px 90px 70px',
        gap: 8, padding: '8px 10px', alignItems: 'center',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        background: selected ? 'rgba(74,140,92,0.06)' : 'transparent',
        cursor: 'pointer', transition: 'background 100ms',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 3,
        border: `0.5px solid ${selected ? 'var(--live)' : 'var(--b2)'}`,
        background: selected ? 'var(--live)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <Check size={10} style={{ color: 'var(--bg0)' }} />}
      </div>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{ship.model}</div>
        {ship.name !== ship.model && (
          <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>{ship.name}</div>
        )}
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 10 }}>{ship.manufacturer || '—'}</div>
      <div style={{
        fontSize: 9, color: 'var(--t2)', background: 'var(--bg2)',
        border: '0.5px solid var(--b1)', borderRadius: 2,
        padding: '2px 6px', textAlign: 'center',
      }}>
        {ship.class.replace(/_/g, ' ')}
      </div>
      <div style={{ color: 'var(--live)', fontSize: 10, fontWeight: 500 }}>{ship.status}</div>
    </div>
  );
}

/* ─── Main dialog ─── */
export default function ShipImportDialog({ onClose, onImported, callsign }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    const result = parseImportData(text);
    setParsed(result);
    if (result.ships.length > 0) {
      setSelected(result.ships.map((_, i) => i)); // select all by default
      setStep('preview');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleShip = (index) => {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleAll = () => {
    if (!parsed) return;
    if (selected.length === parsed.ships.length) {
      setSelected([]);
    } else {
      setSelected(parsed.ships.map((_, i) => i));
    }
  };

  const handleImport = async () => {
    if (!parsed || selected.length === 0) return;
    setStep('importing');

    const shipsToImport = selected.map(i => parsed.ships[i]);
    let created = 0;
    let failed = 0;

    // Import in batches of 10
    for (let i = 0; i < shipsToImport.length; i += 10) {
      const batch = shipsToImport.slice(i, i + 10);
      const records = batch.map(ship => ({
        ...ship,
        notes: [ship.notes, `Imported by ${callsign || 'UNKNOWN'}`].filter(Boolean).join(' · '),
      }));

      try {
        await base44.entities.OrgShip.bulkCreate(records);
        created += records.length;
      } catch {
        // Fallback to individual creates
        for (const record of records) {
          try {
            await base44.entities.OrgShip.create(record);
            created++;
          } catch {
            failed++;
          }
        }
      }
    }

    setImportResult({ created, failed });
    setStep('done');
    showToast(`Imported ${created} ships${failed > 0 ? `, ${failed} failed` : ''}`, created > 0 ? 'success' : 'error');
    if (created > 0) onImported?.();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.88)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div className="nexus-card" style={{ padding: 0, width: 'min(720px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--acc)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              IMPORT SHIPS
            </div>
            <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
              HangarXPLOR · FleetYards · SC Hangar Helper · JSON
            </div>
          </div>
          <button onClick={onClose} className="nexus-btn" style={{ padding: 6 }}><X size={14} /></button>
        </div>

        {/* ─── Upload step ─── */}
        {step === 'upload' && (
          <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--live)' : 'var(--b2)'}`,
                borderRadius: 4,
                padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                cursor: 'pointer', transition: 'border-color 150ms',
                background: dragOver ? 'rgba(74,140,92,0.04)' : 'transparent',
              }}
            >
              <Upload size={28} style={{ color: dragOver ? 'var(--live)' : 'var(--t3)' }} />
              <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                Drop a JSON file here or click to browse
              </div>
              <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                Supports exports from HangarXPLOR, FleetYards.net, StarCitizen Hangar Helper, or any JSON array containing ship data.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {/* Error display */}
            {parsed?.error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', background: 'var(--danger-bg)',
                border: '0.5px solid var(--danger-b)', borderRadius: 3,
              }}>
                <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ color: 'var(--danger)', fontSize: 11 }}>{parsed.error}</span>
              </div>
            )}

            {/* Help section */}
            <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '14px 16px' }}>
              <div style={{ color: 'var(--acc)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>HOW TO EXPORT YOUR SHIPS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    source: 'HangarXPLOR',
                    steps: 'Install the browser extension → Go to your RSI Account → Pledges → Click the HangarXPLOR "Download JSON" button.',
                    url: 'https://hangarxplor.space',
                  },
                  {
                    source: 'FleetYards.net',
                    steps: 'Log in → My Hangar → Use the Export button to download your hangar as JSON.',
                    url: 'https://fleetyards.net',
                  },
                  {
                    source: 'SC Hangar Helper',
                    steps: 'Install from Chrome Web Store → Go to your RSI Hangar → Export as JSON.',
                    url: 'https://chromewebstore.google.com/detail/starcitizen-hangar-helper/mbooppchelgjchpknbcjengmghlccegg',
                  },
                ].map((item) => (
                  <div key={item.source} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <FileJson size={12} style={{ color: 'var(--t3)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{item.source}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{item.steps}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Preview step ─── */}
        {step === 'preview' && parsed && (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Ship size={14} style={{ color: 'var(--acc)' }} />
              <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
                {parsed.ships.length} ships found
              </span>
              {parsed.skipped > 0 && (
                <span style={{ color: 'var(--t3)', fontSize: 10 }}>
                  ({parsed.skipped} non-ship entries skipped)
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={toggleAll} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 9 }}>
                {selected.length === parsed.ships.length ? 'DESELECT ALL' : 'SELECT ALL'}
              </button>
              <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 600 }}>
                {selected.length} selected
              </span>
            </div>

            {/* Ship list header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 120px 90px 70px',
              gap: 8, padding: '6px 10px',
              background: '#141410', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              flexShrink: 0,
            }}>
              {['', 'MODEL', 'MANUFACTURER', 'CLASS', 'STATUS'].map(h => (
                <span key={h} style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {/* Scrollable ship list */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {parsed.ships.map((ship, i) => (
                <PreviewRow key={i} ship={ship} index={i} selected={selected.includes(i)} onToggle={toggleShip} />
              ))}
            </div>

            {/* Actions */}
            <div style={{ padding: '14px 18px', borderTop: '0.5px solid var(--b1)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => { setStep('upload'); setParsed(null); setSelected([]); }} className="nexus-btn" style={{ padding: '8px 16px', fontSize: 10 }}>
                ← BACK
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleImport}
                disabled={selected.length === 0}
                className="nexus-btn nexus-btn-go"
                style={{ padding: '10px 24px', fontSize: 11, fontWeight: 600 }}
              >
                IMPORT {selected.length} SHIP{selected.length !== 1 ? 'S' : ''}
              </button>
            </div>
          </>
        )}

        {/* ─── Importing step ─── */}
        {step === 'importing' && (
          <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="nexus-loading-dots" style={{ color: 'var(--acc)' }}><span /><span /><span /></div>
            <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>Importing {selected.length} ships…</div>
            <div style={{ color: 'var(--t3)', fontSize: 10 }}>This may take a moment for large hangars.</div>
          </div>
        )}

        {/* ─── Done step ─── */}
        {step === 'done' && importResult && (
          <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: importResult.created > 0 ? 'rgba(74,140,92,0.15)' : 'rgba(192,57,43,0.15)',
              border: `1px solid ${importResult.created > 0 ? 'var(--live)' : 'var(--danger)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {importResult.created > 0
                ? <Check size={22} style={{ color: 'var(--live)' }} />
                : <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />}
            </div>
            <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700 }}>
              {importResult.created > 0 ? 'Import Complete' : 'Import Failed'}
            </div>
            <div style={{ display: 'flex', gap: 16, color: 'var(--t2)', fontSize: 12 }}>
              <span><strong style={{ color: 'var(--live)' }}>{importResult.created}</strong> imported</span>
              {importResult.failed > 0 && (
                <span><strong style={{ color: 'var(--danger)' }}>{importResult.failed}</strong> failed</span>
              )}
            </div>
            <button onClick={onClose} className="nexus-btn nexus-btn-go" style={{ padding: '10px 28px', fontSize: 11, marginTop: 8 }}>
              DONE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}