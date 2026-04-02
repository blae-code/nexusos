/**
 * ScanOcrUploader — Upload a Star Citizen mining/salvage scan screenshot.
 * Uses LLM vision to extract RS signature, mineral composition, mass,
 * instability, and resistance — then calls onDataExtracted to pre-fill
 * the SignatureCalculator form.
 */
import React, { useRef, useState } from 'react';
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';

const OCR_PROMPT = `You are analysing a Star Citizen gameplay screenshot showing a mining or salvage scan HUD.

Extract every data point visible on the scan overlay. The HUD typically shows:
- RS (Rock Signature) or signature number
- Mass in kg
- Instability percentage
- Resistance percentage
- Mineral composition: a list of mineral names with their percentages

Return a JSON object with EXACTLY this structure:
{
  "mode": "mining" or "salvage",
  "signature": number or null,
  "mass": number or null,
  "instability": number or null (0-100 scale),
  "resistance": number or null (0-100 scale),
  "minerals": [
    {"name": "MineralName", "pct": number}
  ]
}

Rules:
- For signature, extract the number next to "RS" or "Signature" or the large number displayed.
- For minerals, use the standard Star Citizen mineral names: Quantanium, Bexalite, Taranite, Borase, Laranite, Agricium, Hephaestanite, Titanium, Diamond, Gold, Copper, Beryl, Tungsten, Corundum, Quartz, Aluminium, Inert Material.
- If a value is not visible, set it to null.
- If this is clearly a salvage scan (shows hull/wreck data, RMC, etc.), set mode to "salvage".
- Percentages should be numbers without the % sign (e.g., 45.2 not "45.2%").
- Return ONLY the JSON object, no other text.`;

export default function ScanOcrUploader({ mode, onDataExtracted }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | parsing | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, etc.)', 'warning');
      return;
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image too large — max 10MB', 'warning');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    setStatus('uploading');
    setErrorMsg('');

    try {
      // 1. Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStatus('parsing');

      // 2. Send to LLM vision for OCR extraction
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: OCR_PROMPT,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['mining', 'salvage'] },
            signature: { type: ['number', 'null'] },
            mass: { type: ['number', 'null'] },
            instability: { type: ['number', 'null'] },
            resistance: { type: ['number', 'null'] },
            minerals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  pct: { type: 'number' },
                },
              },
            },
          },
        },
      });

      // result is already parsed from response_json_schema
      const data = typeof result === 'string' ? JSON.parse(result) : result;

      if (data && (data.signature || (data.minerals && data.minerals.length > 0))) {
        setStatus('done');
        onDataExtracted(data);
        showToast('Scan data extracted — fields pre-filled', 'success');
      } else {
        setStatus('error');
        setErrorMsg('Could not detect scan data in this image. Make sure the mining/salvage HUD is visible.');
        showToast('No scan data found in image', 'warning');
      }
    } catch (err) {
      console.error('[ScanOCR]', err);
      setStatus('error');
      setErrorMsg(err?.message || 'OCR extraction failed');
      showToast('OCR extraction failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const reset = () => {
    setPreview(null);
    setStatus('idle');
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Camera size={12} style={{ color: 'var(--info)' }} />
        <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          OCR SCAN IMPORT
        </span>
        {status === 'done' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--live)' }}>
            <CheckCircle2 size={10} /> EXTRACTED
          </span>
        )}
      </div>

      {/* Drop zone / Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: preview ? 0 : '16px 12px',
          background: 'var(--bg2)',
          border: `1px dashed ${status === 'error' ? 'var(--danger-b)' : status === 'done' ? 'var(--live-b)' : 'var(--b2)'}`,
          borderRadius: 'var(--r-lg)',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'border-color 200ms',
          overflow: 'hidden',
          minHeight: preview ? 120 : 72,
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Scan preview"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', opacity: uploading ? 0.5 : 1, transition: 'opacity 200ms' }}
            />
            {/* Close button */}
            {!uploading && (
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(10,10,10,0.8)', border: '0.5px solid var(--b2)',
                  borderRadius: '50%', width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--t1)',
                }}
              >
                <X size={11} />
              </button>
            )}
            {/* Status overlay */}
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,10,10,0.7)', gap: 8,
              }}>
                <div style={{ width: 20, height: 20, border: '2px solid var(--b3)', borderTopColor: 'var(--info)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 10, color: 'var(--info)', letterSpacing: '0.1em' }}>
                  {status === 'uploading' ? 'UPLOADING...' : 'ANALYZING SCAN...'}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <Upload size={16} style={{ color: 'var(--t3)' }} />
            <span style={{ fontSize: 10, color: 'var(--t2)', textAlign: 'center' }}>
              Drop a scan screenshot here or click to upload
            </span>
            <span style={{ fontSize: 8, color: 'var(--t3)' }}>
              PNG / JPG — mining or salvage HUD
            </span>
          </>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && errorMsg && (
        <div style={{
          padding: '6px 10px', borderRadius: 'var(--r-sm)',
          background: 'var(--danger-bg)', border: '0.5px solid var(--danger-b)',
          color: 'var(--danger)', fontSize: 9,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}