/**
 * DebtPaymentUpload — Screenshot-based debt payment proof.
 * Upload a screenshot of a successful aUEC transfer to auto-verify payment.
 */
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Camera, CheckCircle, AlertTriangle, X, Clipboard } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';

function fmtAuec(n) { return Math.round(n || 0).toLocaleString(); }

export default function DebtPaymentUpload({ debt, callsign, onComplete, onCancel }) {
  const remaining = (debt.amount_aUEC || 0) - (debt.amount_paid || 0);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | result | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Paste handler
  useEffect(() => {
    const handlePaste = (e) => {
      if (phase !== 'idle') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          processFile(item.getAsFile());
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [phase]);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      setPhase('error');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setPhase('uploading');
    setError('');

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhase('processing');

    const response = await base44.functions.invoke('ocrDebtPayment', {
      file_url,
      debt_id: debt.id,
      debtor_callsign: debt.debtor_callsign,
      creditor_callsign: debt.creditor_callsign,
      expected_amount: remaining,
      callsign,
    });

    const data = response.data;
    if (!data || data.error) {
      setError(data?.error || 'Could not verify payment from screenshot.');
      setPhase('error');
      return;
    }

    setResult(data);
    setPhase('result');

    if (data.verified && data.applied) {
      showToast(`Payment of ${fmtAuec(data.amount_verified)} aUEC verified & applied`, 'success');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.80)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'nexus-fade-in 150ms ease-out both',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: '92vw',
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.20)',
        borderLeft: '2px solid #7AAECC',
        borderRadius: 3, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '85vh', overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={14} style={{ color: '#7AAECC' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#EAE6DE', letterSpacing: '0.06em' }}>
              PAY VIA SCREENSHOT
            </span>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Debt context */}
        <div style={{
          padding: '10px 12px', borderRadius: 2,
          background: 'rgba(200,170,100,0.04)', border: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE' }}>
            {debt.description || debt.debt_type?.replace(/_/g, ' ')}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
            Owed to {debt.creditor_callsign || 'ORG'} · <span style={{ color: '#C0392B', fontWeight: 600 }}>{fmtAuec(remaining)} aUEC remaining</span>
          </div>
        </div>

        {/* Drop zone — idle state */}
        {phase === 'idle' && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `1px dashed ${dragging ? '#7AAECC' : 'rgba(200,170,100,0.12)'}`,
                borderRadius: 3, padding: '28px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer',
                background: dragging ? 'rgba(122,174,204,0.04)' : '#0C0B09',
                transition: 'all 200ms',
              }}
            >
              <Upload size={20} style={{ color: dragging ? '#7AAECC' : '#4A4640' }} />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#EAE6DE', letterSpacing: '0.04em' }}>
                Upload payment confirmation screenshot
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#3A3830' }}>
                mo.Trader transfer receipt, wallet transaction log, or trade terminal receipt
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '4px 8px', borderRadius: 2, background: 'rgba(200,170,100,0.04)', border: '0.5px solid rgba(200,170,100,0.06)' }}>
                <Clipboard size={9} style={{ color: '#4A4640' }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#4A4640' }}>
                  or press <span style={{ color: '#7AAECC', fontWeight: 600 }}>Ctrl+V</span> to paste
                </span>
              </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
          </>
        )}

        {/* Processing states */}
        {(phase === 'uploading' || phase === 'processing') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '12px 0' }}>
            {previewUrl && (
              <div style={{ position: 'relative', width: '100%' }}>
                <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 3, opacity: 0.5 }} />
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, #7AAECC, transparent)',
                  top: 0, animation: 'ocrScanLine 2s ease-in-out infinite',
                }} />
                <style>{`@keyframes ocrScanLine { 0%, 100% { top: 0; opacity: 0.4; } 50% { top: calc(100% - 2px); opacity: 0.8; } }`}</style>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="nexus-loading-dots" style={{ color: '#7AAECC' }}><span /><span /><span /></div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE' }}>
                {phase === 'uploading' ? 'Uploading…' : 'AI verifying payment…'}
              </span>
            </div>
          </div>
        )}

        {/* Result state */}
        {phase === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {previewUrl && (
              <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 3, opacity: 0.35 }} />
            )}

            {result.verified ? (
              <div style={{
                padding: '14px 16px', borderRadius: 3,
                background: 'rgba(46,219,122,0.06)', border: '0.5px solid rgba(46,219,122,0.20)',
                borderLeft: '3px solid #2edb7a',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <CheckCircle size={16} style={{ color: '#2edb7a' }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#EAE6DE', fontWeight: 700 }}>
                    PAYMENT VERIFIED
                  </span>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#2edb7a', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtAuec(result.amount_verified)} aUEC
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 4 }}>
                  {result.applied ? 'Debt record updated · Coffer ledger logged' : 'Pending admin review'}
                </div>
                {result.new_remaining != null && (
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: result.new_remaining <= 0 ? '#2edb7a' : '#C8A84B', marginTop: 4 }}>
                    {result.new_remaining <= 0 ? '✓ DEBT FULLY SETTLED' : `${fmtAuec(result.new_remaining)} aUEC still remaining`}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '14px 16px', borderRadius: 3,
                background: 'rgba(200,168,75,0.04)', border: '0.5px solid rgba(200,168,75,0.15)',
                borderLeft: '3px solid #C8A84B',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AlertTriangle size={16} style={{ color: '#C8A84B' }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#EAE6DE', fontWeight: 700 }}>
                    COULD NOT VERIFY
                  </span>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>
                  {result.reason || 'AI could not confirm a matching payment in this screenshot. Try a clearer screenshot or record payment manually.'}
                </div>
              </div>
            )}

            {result.extracted_data && (
              <div style={{ padding: '8px 10px', borderRadius: 2, background: '#0C0B09', border: '0.5px solid rgba(200,170,100,0.06)' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#3A3830', letterSpacing: '0.10em', marginBottom: 4 }}>EXTRACTED DATA</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {Object.entries(result.extracted_data).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#4A4640', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</span>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#EAE6DE' }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onCancel} className="nexus-btn" style={{ flex: 1, padding: '8px 0', fontSize: 10, justifyContent: 'center' }}>
                CLOSE
              </button>
              {result.verified && result.applied && (
                <button onClick={() => onComplete?.()} className="nexus-btn nexus-btn-go" style={{ flex: 1, padding: '8px 0', fontSize: 10, justifyContent: 'center' }}>
                  DONE ✓
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '12px 0' }}>
            <AlertTriangle size={20} style={{ color: '#C0392B', opacity: 0.6 }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C0392B', textAlign: 'center' }}>{error}</div>
            <button onClick={() => { setPhase('idle'); setError(''); setPreviewUrl(null); }} className="nexus-btn" style={{ padding: '6px 16px', fontSize: 10 }}>
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}