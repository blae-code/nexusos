/**
 * OcrScanner — upload a screenshot, extract structured inventory/ship/trade data via LLM vision.
 * Modes: 'inventory' (materials + items), 'ship' (ship status), 'trade' (terminal prices).
 * onResults(items) is called with an array of extracted items.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Camera, Loader2, X, ScanLine, Ship, Package, DollarSign } from 'lucide-react';

const MODES = [
  { id: 'inventory', label: 'INVENTORY', icon: Package, desc: 'Materials, items, quantities' },
  { id: 'ship', label: 'SHIP STATUS', icon: Ship, desc: 'Ship/vehicle details' },
  { id: 'trade', label: 'TRADE TERMINAL', icon: DollarSign, desc: 'Buy & sell prices' },
];

const PROMPTS = {
  inventory: `You are analyzing a Star Citizen in-game inventory screenshot. Extract every item visible.
Return a JSON object with key "items" containing an array. Each item object must have:
- item_name (string): the item name
- category (string): one of MATERIAL, FPS_WEAPON, FPS_ARMOR, SHIP_COMPONENT, CONSUMABLE, CURRENCY, OTHER
- quantity (number): quantity shown, default 1
- quality_score (number or null): quality if shown (1-1000 scale)
- condition (string or null): PRISTINE, GOOD, or DAMAGED if visible
- location (string or null): storage location if visible
Be thorough — include every visible item. If uncertain about a value, use your best guess.`,

  ship: `You are analyzing a Star Citizen ship or vehicle status screenshot. Extract ship details.
Return a JSON object with key "items" containing an array. Each item object must have:
- item_name (string): the ship/vehicle name and model
- category (string): always "SHIP_COMPONENT" for components, or "OTHER" for the ship itself
- quantity (number): always 1
- condition (string or null): PRISTINE, GOOD, or DAMAGED based on visible health/status
- location (string or null): docked location if visible
- notes (string or null): any status info like fuel level, damage, loadout details
Extract the ship itself plus any visible components or loadout items.`,

  trade: `You are analyzing a Star Citizen trade terminal screenshot showing commodity buy/sell prices.
Return a JSON object with key "items" containing an array. Each item object must have:
- item_name (string): commodity name
- category (string): always "MATERIAL"
- quantity (number): available SCU if shown, otherwise 0
- buy_price (number or null): buy price per SCU if visible
- sell_price (number or null): sell price per SCU if visible
- location (string or null): terminal/station name if visible
Extract every commodity row visible in the terminal.`,
};

const SCHEMAS = {
  inventory: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name: { type: 'string' },
            category: { type: 'string' },
            quantity: { type: 'number' },
            quality_score: { type: 'number' },
            condition: { type: 'string' },
            location: { type: 'string' },
          },
        },
      },
    },
  },
  ship: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name: { type: 'string' },
            category: { type: 'string' },
            quantity: { type: 'number' },
            condition: { type: 'string' },
            location: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
  },
  trade: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_name: { type: 'string' },
            category: { type: 'string' },
            quantity: { type: 'number' },
            buy_price: { type: 'number' },
            sell_price: { type: 'number' },
            location: { type: 'string' },
          },
        },
      },
    },
  },
};

export default function OcrScanner({ onResults, onCancel, compact = false }) {
  const [mode, setMode] = useState('inventory');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Run LLM vision extraction
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: PROMPTS[mode],
        file_urls: [file_url],
        response_json_schema: SCHEMAS[mode],
      });

      const items = result?.items || [];
      if (items.length === 0) {
        showToast('No items detected in screenshot', 'warning');
      } else {
        showToast(`Extracted ${items.length} item${items.length > 1 ? 's' : ''} from screenshot`, 'success');
        onResults(items, mode);
      }
    } catch (err) {
      showToast(err?.message || 'OCR scan failed', 'error');
    }
    setScanning(false);
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #8E44AD',
      border: '0.5px solid rgba(200,170,100,0.12)',
      borderRadius: 2, padding: compact ? 12 : 16,
      animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ScanLine size={13} style={{ color: '#8E44AD' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: compact ? 11 : 13, color: '#E8E4DC', letterSpacing: '0.08em',
          }}>SCREENSHOT OCR</span>
        </div>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
          }}><X size={12} /></button>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {MODES.map(m => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              flex: 1, padding: '6px 8px', borderRadius: 2, cursor: 'pointer',
              background: mode === m.id ? 'rgba(142,68,173,0.12)' : '#141410',
              border: `0.5px solid ${mode === m.id ? 'rgba(142,68,173,0.4)' : 'rgba(200,170,100,0.08)'}`,
              color: mode === m.id ? '#8E44AD' : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              letterSpacing: '0.06em', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <Icon size={12} />
              {m.label}
              <span style={{ fontSize: 7, fontWeight: 400, opacity: 0.7 }}>{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      {!previewUrl ? (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: compact ? '20px 12px' : '32px 16px',
          background: '#141410', border: '1px dashed rgba(142,68,173,0.3)',
          borderRadius: 2, cursor: 'pointer', transition: 'border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,68,173,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,68,173,0.3)'; }}>
          <Camera size={20} style={{ color: '#8E44AD', opacity: 0.6 }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
            color: '#9A9488', letterSpacing: '0.06em',
          }}>Click or drop a screenshot here</span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>PNG, JPG, WEBP supported</span>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange}
            style={{ display: 'none' }} />
        </label>
      ) : (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <img src={previewUrl} alt="Screenshot" style={{
            width: '100%', maxHeight: compact ? 160 : 240, objectFit: 'contain',
            borderRadius: 2, border: '0.5px solid rgba(200,170,100,0.10)',
            background: '#141410',
          }} />
          <button onClick={clear} style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 2,
            color: '#E8E4DC', cursor: 'pointer', padding: '3px 6px',
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          }}>
            <X size={10} /> CLEAR
          </button>
        </div>
      )}

      {/* Scan button */}
      {previewUrl && (
        <button onClick={handleScan} disabled={scanning} style={{
          width: '100%', padding: '10px 16px', borderRadius: 2,
          background: scanning ? '#5A5850' : '#8E44AD',
          border: 'none', color: '#E8E4DC',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: scanning ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {scanning ? (
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> SCANNING...</>
          ) : (
            <><ScanLine size={13} /> SCAN SCREENSHOT</>
          )}
        </button>
      )}
    </div>
  );
}