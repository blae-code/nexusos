import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export default function ItemSearchBar({ value, onChange, placeholder, suggestions }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  const filtered = (suggestions || []).filter(s =>
    value && s.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 12);

  const showDrop = focused && value && filtered.length > 0;

  useEffect(() => {
    if (!showDrop) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [showDrop]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5A5850', zIndex: 2 }} />
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className="nexus-input"
        style={{ paddingLeft: 32, height: 38, fontSize: 12, width: '100%', textTransform: 'uppercase' }}
      />
      {showDrop && open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.15)',
          borderRadius: 2, overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {filtered.map(s => (
            <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 14px', border: 'none',
              background: 'transparent', color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}