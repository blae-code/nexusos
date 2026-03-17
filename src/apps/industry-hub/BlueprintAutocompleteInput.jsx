/**
 * Autocomplete input with dropdown — Blueprints.
 * No closed-over variables — props only.
 */
import React, { useState, useRef, useEffect } from 'react';

// ─── Autocomplete input ───────────────────────────────────────────────────────

export default function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, style: extraStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        style={extraStyle}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: 'var(--bg3)', border: '0.5px solid var(--b2)',
          borderRadius: '0 0 6px 6px', maxHeight: 180, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              style={{ padding: '7px 10px', color: 'var(--t0)', fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
