import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import OcrPreview from './OcrPreview';

export default function OcrUpload({ callsign, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(selected);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selected);
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Upload the file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      // Call ocrExtract
      const ocrRes = await base44.functions.invoke('ocrExtract', {
        image_url: fileUrl,
      });

      if (!ocrRes.data || ocrRes.data.status === 'error') {
        setError(ocrRes.data?.details || 'OCR extraction failed');
        setLoading(false);
        return;
      }

      // Pass extracted data to preview component
      setFile(null);
      setPreview(null);
      return ocrRes.data;
    } catch (err) {
      setError(err.message || 'Failed to process image');
      setLoading(false);
    }
  };

  const [extractedData, setExtractedData] = useState(null);

  const processFile = async () => {
    const data = await handleUploadAndProcess();
    if (data) {
      setExtractedData(data);
    }
  };

  if (extractedData) {
    return (
      <OcrPreview
        data={extractedData}
        callsign={callsign}
        onConfirm={() => {
          setExtractedData(null);
          onSuccess?.();
        }}
        onCancel={() => setExtractedData(null)}
      />
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>
        SCREENSHOT OCR EXTRACTION
      </div>

      {/* File input */}
      <div>
        <label
          htmlFor="ocr-file"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px',
            background: 'var(--bg1)',
            border: `0.5px dashed var(--b2)`,
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--b3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--b2)';
          }}
        >
          <Upload size={16} style={{ color: 'var(--t2)' }} />
          <span style={{ color: 'var(--t1)', fontSize: 11 }}>
            {file ? file.name : 'Click to upload or drag image'}
          </span>
        </label>
        <input
          id="ocr-file"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Preview */}
      {preview && (
        <div
          style={{
            width: '100%',
            maxHeight: 180,
            borderRadius: 6,
            overflow: 'hidden',
            border: '0.5px solid var(--b2)',
          }}
        >
          <img
            src={preview}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(224,72,72,0.08)',
            border: '0.5px solid rgba(224,72,72,0.3)',
            borderRadius: 6,
            color: 'var(--danger)',
            fontSize: 10,
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      {preview && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
            }}
            className="nexus-btn"
            style={{ flex: 1, padding: '6px 0', fontSize: 10 }}
          >
            CANCEL
          </button>
          <button
            onClick={processFile}
            disabled={loading}
            className="nexus-btn live-btn"
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 10,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'PROCESSING...' : 'EXTRACT'}
          </button>
        </div>
      )}
    </div>
  );
}