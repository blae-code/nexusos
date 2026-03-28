/**
 * CargoOcrScanner — upload trade terminal screenshots, extract cargo data via LLM vision.
 * Tuned specifically for Star Citizen buy/sell terminal screens.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Camera, Loader2, X, ScanLine, Plus } from 'lucide-react';

const TRADE_PROMPT = `You are analyzing a Star Citizen in-game trade terminal screenshot. This is a buy/sell commodity terminal screen.
Extract EVERY commodity row visible in the terminal. Look carefully at:
- Commodity names (left column)
- Buy price per SCU (the price to purchase, sometimes labeled "BUY")
- Sell price per SCU (the price to sell, sometimes labeled "SELL")
- Available SCU/inventory if shown
- The station or terminal name if visible in the header/title

Also determine the transaction context:
- If this is a "BUY" screen, the prices shown are purchase prices
- If this is a "SELL" screen, the prices shown are sale prices
- If both buy and sell columns are shown, extract both

Return a JSON object with:
- "station_name": the terminal/station name if visible (string or null)
- "screen_type": "BUY", "SELL", or "BOTH" based on what's shown
- "commodities": array of objects, each with:
  - "commodity_name" (string): the commodity name exactly as shown
  - "buy_price_scu" (number or null): buy price per SCU
  - "sell_price_scu" (number or null): sell price per SCU  
  - "available_scu" (number or null): available inventory in SCU if shown
  - "demand_scu" (number or null): demand in SCU if shown

Be extremely thorough — extract every single commodity row visible. Read prices carefully, including decimal points.`;

const TRADE_SCHEMA = {
  type: 'object',
  properties: {
    station_name: { type: 'string' },
    screen_type: { type: 'string' },
    commodities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          commodity_name: { type: 'string' },
          buy_price_scu: { type: 'number' },
          sell_price_scu: { type: 'number' },
          available_scu: { type: 'number' },
          demand_scu: { type: 'number' },
        },
      },
    },
  },
};

export default function CargoOcrScanner({ onResults, onCancel }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleScan = async () => {
    if (files.length === 0) return;
    setScanning(true);

    const allCommodities = [];
    let detectedStation = null;

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: TRADE_PROMPT,
          file_urls: [file_url],
          response_json_schema: TRADE_SCHEMA,
        });

        if (result?.station_name && !detectedStation) {
          detectedStation = result.station_name;
        }

        const items = result?.commodities || [];
        items.forEach(item => {
          allCommodities.push({
            ...item,
            station_name: result?.station_name || detectedStation || null,
            screen_type: result?.screen_type || 'BOTH',
            _source_file: file.name,
          });
        });
      } catch (err) {
        showToast(`Failed to scan ${file.name}: ${err?.message || 'unknown'}`, 'error');
      }
    }

    if (allCommodities.length === 0) {
      showToast('No commodities detected in screenshots', 'warning');
    } else {
      showToast(`Extracted ${allCommodities.length} commodity rows from ${files.length} screenshot${files.length > 1 ? 's' : ''}`, 'success');
      onResults(allCommodities, detectedStation);
    }
    setScanning(false);
  };

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #C8A84B',
      border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
      padding: 16, animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ScanLine size={13} style={{ color: '#C8A84B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 13, color: '#E8E4DC', letterSpacing: '0.08em',
          }}>TRADE TERMINAL OCR</span>
        </div>
        {onCancel && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2 }}>
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{
        fontSize: 10, color: '#9A9488', marginBottom: 12, lineHeight: 1.5,
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        Upload screenshots of trade terminal buy/sell screens. The scanner will extract commodity names, prices, and volumes automatically.
        You can upload multiple screenshots to capture both buy and sell sides.
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {previews.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 120, height: 80 }}>
              <img src={url} alt={`Screenshot ${i + 1}`} style={{
                width: '100%', height: '100%', objectFit: 'cover',
                borderRadius: 2, border: '0.5px solid rgba(200,170,100,0.15)', background: '#141410',
              }} />
              <button onClick={() => removeFile(i)} style={{
                position: 'absolute', top: 2, right: 2,
                background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 2,
                color: '#E8E4DC', cursor: 'pointer', padding: '1px 4px', lineHeight: 1,
              }}><X size={8} /></button>
              <div style={{
                position: 'absolute', bottom: 2, left: 2, right: 2,
                fontSize: 7, color: '#E8E4DC', background: 'rgba(0,0,0,0.7)',
                padding: '1px 3px', borderRadius: 1, textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{files[i]?.name}</div>
            </div>
          ))}
          {/* Add more button */}
          <label style={{
            width: 120, height: 80, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            background: '#141410', border: '1px dashed rgba(200,168,75,0.25)',
            borderRadius: 2, cursor: 'pointer',
          }}>
            <Plus size={14} style={{ color: '#C8A84B', opacity: 0.5 }} />
            <span style={{ fontSize: 8, color: '#5A5850' }}>ADD MORE</span>
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* Upload area (when empty) */}
      {previews.length === 0 && (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '32px 16px',
          background: '#141410', border: '1px dashed rgba(200,168,75,0.3)',
          borderRadius: 2, cursor: 'pointer', transition: 'border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,168,75,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,168,75,0.3)'; }}>
          <Camera size={22} style={{ color: '#C8A84B', opacity: 0.5 }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488' }}>
            Drop trade terminal screenshots here
          </span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>PNG, JPG, WEBP · Multiple files supported</span>
          <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
        </label>
      )}

      {/* Scan button */}
      {files.length > 0 && (
        <button onClick={handleScan} disabled={scanning} style={{
          width: '100%', padding: '10px 16px', borderRadius: 2, marginTop: 8,
          background: scanning ? '#5A5850' : '#C8A84B',
          border: 'none', color: scanning ? '#9A9488' : '#0A0908',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: scanning ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {scanning ? (
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> SCANNING {files.length} SCREENSHOT{files.length > 1 ? 'S' : ''}...</>
          ) : (
            <><ScanLine size={13} /> SCAN {files.length} SCREENSHOT{files.length > 1 ? 'S' : ''}</>
          )}
        </button>
      )}
    </div>
  );
}