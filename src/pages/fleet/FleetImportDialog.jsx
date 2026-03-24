/**
 * FleetImportDialog — Import ships from HangarXPLOR, FleetYards, or StarCitizen Hangar Helper JSON exports.
 * Normalizes all three formats into OrgShip records.
 */
import React, { useCallback, useRef, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Upload, FileJson, Check, AlertTriangle, X, Ship, Download } from 'lucide-react';
import { showToast } from '@/components/NexusToast';

/* ═══ Ship class inference ═══ */
const CLASS_KEYWORDS = {
  FIGHTER: ['fighter', 'interceptor', 'stealth', 'gladius', 'arrow', 'sabre', 'hornet', 'buccaneer', 'talon', 'khartu', 'glaive', 'scythe', 'blade', 'mustang'],
  HEAVY_FIGHTER: ['heavy fighter', 'vanguard', 'hurricane', 'ares', 'redeemer', 'retaliator', 'eclipse', 'bomber', 'harbinger', 'sentinel', 'inferno', 'ion'],
  MINER: ['miner', 'mining', 'prospector', 'mole', 'orion'],
  HAULER: ['hauler', 'cargo', 'hull', 'freelancer', 'caterpillar', 'hercules', 'starfarer', 'merchantman', 'raft', 'spirit', 'max', 'c2', 'c1', 'constellation'],
  SALVAGER: ['salvag', 'vulture', 'reclaimer', 'drake vulture'],
  MEDICAL: ['medical', 'medic', 'apollo', 'cutlass red', 'endeavor hope'],
  EXPLORER: ['explor', 'pathfinder', 'carrack', '600i', '315p', 'dur', 'aquila', 'terrapin', 'mercury'],
  GROUND_VEHICLE: ['vehicle', 'rover', 'cyclone', 'ursa', 'ptv', 'nova', 'spartan', 'ballista', 'centurion', 'mule', 'tumbril', 'greycat', 'storm'],
};

function inferShipClass(name, manufacturer) {
  const haystack = `${name} ${manufacturer}`.toLowerCase();
  for (const [cls, keywords] of Object.entries(CLASS_KEYWORDS)) {
    if (keywords.some(kw => haystack.includes(kw))) return cls;
  }
  return 'OTHER';
}

/* ═══ Manufacturer code → full name ═══ */
const MFG_CODE_MAP = {
  AEGS: 'Aegis Dynamics', ANVL: 'Anvil Aerospace', ARGO: 'Argo Astronautics',
  BANU: 'Banu', CNOU: 'Consolidated Outland', CRUS: 'Crusader Industries',
  DRAK: 'Drake Interplanetary', ESPR: 'Esperia', GRIN: 'Greycat Industrial',
  KRIG: 'Kruger Intergalactic', MISC: 'MISC', ORIG: 'Origin Jumpworks',
  RSI: 'Roberts Space Industries', TMBL: 'Tumbril Land Systems', VNCL: 'Vanduul',
  XIAN: "Xi'an", XNAA: 'Aopoa', GAMA: 'Gatac',
};

/* ═══ Normalizer — handles HangarXPLOR, FleetYards, and Hangar Helper formats ═══ */
function normalizeShipRecord(raw, ownerCallsign) {
  // HangarXPLOR format
  if (raw.ship_code || raw.pledge_id) {
    return {
      name: raw.ship_name || raw.name || raw.ship_code || 'Unknown Ship',
      model: raw.name || raw.ship_code?.replace(/_/g, ' ') || 'Unknown',
      manufacturer: raw.manufacturer_name || MFG_CODE_MAP[raw.manufacturer_code] || raw.manufacturer_code || '',
      class: inferShipClass(raw.name || '', raw.manufacturer_name || ''),
      status: 'AVAILABLE',
      assigned_to_callsign: ownerCallsign || '',
      notes: [
        raw.pledge_name ? `Pledge: ${raw.pledge_name}` : '',
        raw.pledge_cost ? `Cost: ${raw.pledge_cost}` : '',
        raw.lti ? 'LTI' : '',
        raw.warbond ? 'Warbond' : '',
      ].filter(Boolean).join(' · '),
      _source: 'hangarxplor',
      _entity_type: raw.entity_type,
    };
  }

  // FleetYards format (slug-based)
  if (raw.slug || raw.shipSlug || raw.model_slug) {
    const slug = raw.slug || raw.shipSlug || raw.model_slug || '';
    return {
      name: raw.name || raw.shipName || slug.replace(/-/g, ' '),
      model: raw.model || raw.shipName || raw.name || slug.replace(/-/g, ' '),
      manufacturer: raw.manufacturer?.name || raw.manufacturerName || raw.manufacturer || '',
      class: inferShipClass(raw.name || raw.model || slug, raw.manufacturer?.name || raw.manufacturerName || ''),
      status: 'AVAILABLE',
      assigned_to_callsign: ownerCallsign || '',
      cargo_scu: raw.cargo || raw.scm_cargo || raw.cargoCapacity || undefined,
      crew_size: raw.maxCrew || raw.max_crew || raw.crew?.max || undefined,
      fleetyards_id: raw.id?.toString() || '',
      notes: raw.serial || raw.pledgeName || '',
      _source: 'fleetyards',
    };
  }

  // Hangar Helper / generic format
  if (raw.shipName || raw.ship_name || raw.Ship || raw.Name) {
    const shipName = raw.shipName || raw.ship_name || raw.Ship || raw.Name || 'Unknown';
    return {
      name: shipName,
      model: shipName,
      manufacturer: raw.manufacturer || raw.Manufacturer || '',
      class: inferShipClass(shipName, raw.manufacturer || ''),
      status: 'AVAILABLE',
      assigned_to_callsign: ownerCallsign || '',
      notes: [
        raw.pledgeName || raw.pledge_name || raw.Pledge || '',
        raw.cost || raw.pledge_cost || raw.Cost || '',
        raw.lti || raw.LTI ? 'LTI' : '',
      ].filter(Boolean).join(' · '),
      _source: 'generic',
    };
  }

  return null;
}

function parseImportData(rawText) {
  const data = JSON.parse(rawText);

  // Array of ships (most common)
  if (Array.isArray(data)) {
    return data;
  }

  // FleetYards wraps in { ships: [...] } or { data: [...] } sometimes
  if (data.ships && Array.isArray(data.ships)) return data.ships;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.hangar && Array.isArray(data.hangar)) return data.hangar;

  // Single ship object
  if (data.name || data.ship_code || data.slug) return [data];

  throw new Error('Unrecognized JSON format — expected an array of ships or a known wrapper object.');
}

/* ═══ Preview row ═══ */
function PreviewRow({ ship, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 120px 100px 80px',
        gap: 8, padding: '8px 10px', alignItems: 'center',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        cursor: 'pointer', opacity: selected ? 1 : 0.4,
        transition: 'opacity 120ms, background 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        border: `0.5px solid ${selected ? 'var(--live)' : 'var(--b2)'}`,
        background: selected ? 'rgba(46,219,122,0.15)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <Check size={9} style={{ color: 'var(--live)' }} />}
      </div>
      <div>
        <div style={{ color: '#E8E4DC', fontSize: 12, fontWeight: 600 }}>{ship.model}</div>
        {ship.name !== ship.model && <div style={{ color: '#5A5850', fontSize: 9 }}>{ship.name}</div>}
      </div>
      <div style={{ color: '#9A9488', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ship.manufacturer || '—'}</div>
      <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'rgba(200,170,100,0.08)', border: '0.5px solid rgba(200,170,100,0.15)', color: '#9A9488', justifySelf: 'start' }}>
        {ship.class.replace(/_/g, ' ')}
      </div>
      <div style={{ color: '#5A5850', fontSize: 9, fontStyle: 'italic' }}>{ship._source}</div>
    </div>
  );
}

/* ═══ Main dialog ═══ */
export default function FleetImportDialog({ onClose, onImported, ownerCallsign }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [parsed, setParsed] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file) => {
    setError('');
    try {
      const text = await file.text();
      const rawShips = parseImportData(text);
      const normalized = rawShips
        .map(r => normalizeShipRecord(r, ownerCallsign))
        .filter(Boolean)
        // Filter out non-ship items (flair, subscriptions, etc.)
        .filter(s => {
          const raw = rawShips.find(r => (r.name || r.ship_code) === (s.model || s.name));
          if (raw?.entity_type && raw.entity_type !== 'ship') return false;
          return true;
        });

      if (normalized.length === 0) {
        setError('No valid ship records found in the file. Make sure it\'s a JSON export from HangarXPLOR, FleetYards, or StarCitizen Hangar Helper.');
        return;
      }

      setParsed(normalized);
      setSelected(new Set(normalized.map((_, i) => i)));
      setStep('preview');
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, [ownerCallsign]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e) => {
    const file = e.target?.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const toggleShip = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === parsed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsed.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const toImport = parsed.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setStep('importing');
    let success = 0;
    let failed = 0;

    const VALID_CLASSES = ['FIGHTER', 'HEAVY_FIGHTER', 'MINER', 'HAULER', 'SALVAGER', 'MEDICAL', 'EXPLORER', 'GROUND_VEHICLE', 'OTHER'];

    const records = toImport.map(s => {
      const record = {
        name: String(s.name || s.model || 'Unknown Ship').slice(0, 200),
        model: String(s.model || s.name || 'Unknown').slice(0, 200),
        class: VALID_CLASSES.includes(s.class) ? s.class : 'OTHER',
      };
      if (s.manufacturer) record.manufacturer = String(s.manufacturer).slice(0, 200);
      if (s.cargo_scu && parseInt(s.cargo_scu) > 0) record.cargo_scu = parseInt(s.cargo_scu);
      if (s.crew_size && parseInt(s.crew_size) > 0) record.crew_size = parseInt(s.crew_size);
      if (s.fleetyards_id) record.fleetyards_id = String(s.fleetyards_id);
      if (s.notes) record.notes = String(s.notes).slice(0, 500);
      return record;
    });

    console.log('[FleetImport] Importing', records.length, 'records. Sample:', JSON.stringify(records[0]));

    // Import one at a time to avoid bulk issues
    for (let i = 0; i < records.length; i++) {
      try {
        await base44.entities.OrgShip.create(records[i]);
        success++;
      } catch (err) {
        console.error('[FleetImport] Failed record', i, records[i], err?.message || err, err?.response?.data || '');
        failed++;
      }
    }

    setImportResult({ success, failed, total: toImport.length });
    setStep('done');
    showToast(`Imported ${success} ship${success !== 1 ? 's' : ''} to fleet roster`, success > 0 ? 'success' : 'error');
  };

  const sourceCount = parsed.reduce((acc, s) => {
    acc[s._source] = (acc[s._source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '80vh',
          background: '#0F0F0D',
          borderLeft: '2px solid #C0392B',
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={14} style={{ color: '#C8A84B' }} />
            <span style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 11, color: '#C8A84B', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>FLEET IMPORT</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 4,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ color: '#9A9488', fontSize: 11, lineHeight: 1.7 }}>
                Import your personal fleet from any of these sources:
              </div>

              {/* Source cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {[
                  { name: 'HangarXPLOR', desc: 'Chrome/Firefox extension — export JSON from your RSI hangar page', color: '#C0392B' },
                  { name: 'FleetYards', desc: 'Export your hangar as JSON from fleetyards.net', color: '#C8A84B' },
                  { name: 'Hangar Helper', desc: 'Chrome extension — export ships from RSI account to JSON', color: '#7AAECC' },
                ].map(s => (
                  <div key={s.name} style={{
                    padding: '10px 12px', background: '#141410',
                    border: `0.5px solid ${s.color}33`, borderRadius: 2,
                  }}>
                    <div style={{ color: s.color, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ color: '#5A5850', fontSize: 9, lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragOver ? '#C8A84B' : 'rgba(200,170,100,0.20)'}`,
                  borderRadius: 4,
                  padding: '40px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(200,168,75,0.06)' : 'transparent',
                  transition: 'all 150ms',
                }}
              >
                <FileJson size={28} style={{ color: dragOver ? '#C8A84B' : '#5A5850' }} />
                <div style={{ color: '#9A9488', fontSize: 12, textAlign: 'center' }}>
                  Drop your <strong style={{ color: '#E8E4DC' }}>JSON file</strong> here
                </div>
                <div style={{ color: '#5A5850', fontSize: 10 }}>or click to browse</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  background: 'rgba(192,57,43,0.08)',
                  border: '0.5px solid rgba(192,57,43,0.25)',
                  borderRadius: 2,
                }}>
                  <AlertTriangle size={12} style={{ color: '#C0392B', flexShrink: 0 }} />
                  <span style={{ color: '#C0392B', fontSize: 11 }}>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '6px 10px', background: 'rgba(46,219,122,0.08)',
                  border: '0.5px solid rgba(46,219,122,0.25)', borderRadius: 2,
                  color: 'var(--live)', fontSize: 11, fontWeight: 600,
                }}>
                  {parsed.length} ships detected
                </div>
                {Object.entries(sourceCount).map(([src, cnt]) => (
                  <div key={src} style={{
                    padding: '4px 8px', background: 'rgba(200,170,100,0.06)',
                    border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2,
                    color: '#9A9488', fontSize: 9,
                  }}>
                    {src}: {cnt}
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={toggleAll} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 9 }}>
                  {selected.size === parsed.length ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
              </div>

              {/* Column header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 120px 100px 80px',
                gap: 8, padding: '6px 10px',
                borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              }}>
                {['', 'MODEL', 'MANUFACTURER', 'CLASS', 'SOURCE'].map(h => (
                  <span key={h} style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {/* Ship rows */}
              <div style={{ maxHeight: 340, overflow: 'auto' }}>
                {parsed.map((ship, i) => (
                  <PreviewRow key={i} ship={ship} selected={selected.has(i)} onToggle={() => toggleShip(i)} />
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={() => { setStep('upload'); setParsed([]); setError(''); }} className="nexus-btn" style={{ padding: '8px 16px', fontSize: 10 }}>
                  ← BACK
                </button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0}
                  className="nexus-btn primary"
                  style={{ padding: '8px 20px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Upload size={11} />
                  IMPORT {selected.size} SHIP{selected.size !== 1 ? 'S' : ''}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 20px' }}>
              <div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div>
              <span style={{ color: '#9A9488', fontSize: 11, letterSpacing: '0.1em' }}>IMPORTING {selected.size} SHIPS…</span>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 20px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(46,219,122,0.12)',
                border: '1px solid rgba(46,219,122,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ship size={22} style={{ color: 'var(--live)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#E8E4DC', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  Import Complete
                </div>
                <div style={{ color: 'var(--live)', fontSize: 13, fontWeight: 600 }}>
                  {importResult.success} ship{importResult.success !== 1 ? 's' : ''} added to the fleet roster
                </div>
                {importResult.failed > 0 && (
                  <div style={{ color: '#C0392B', fontSize: 11, marginTop: 6 }}>
                    {importResult.failed} failed to import
                  </div>
                )}
              </div>
              <button
                onClick={() => { onImported?.(); onClose(); }}
                className="nexus-btn primary"
                style={{ padding: '10px 24px', fontSize: 11 }}
              >
                DONE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}